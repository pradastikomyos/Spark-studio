import { serve } from '../_shared/deps.ts'
import { getCorsHeaders, handleCors, jsonErrorWithDetails } from '../_shared/http.ts'
import { getMidtransEnv, getSupabaseEnv } from '../_shared/env.ts'
import { createServiceClient } from '../_shared/supabase.ts'
import { generateSignature } from '../_shared/midtrans.ts'
import { mapMidtransStatus } from '../_shared/tickets.ts'
import {
  processProductOrderTransition,
  processTicketOrderTransition,
} from '../_shared/payment-processors.ts'
import { logWebhookEvent, type TicketOrderItem } from '../_shared/payment-effects.ts'

serve(async (req) => {
  const corsResponse = handleCors(req, { allowAllOrigins: true })
  if (corsResponse) return corsResponse
  const corsHeaders = getCorsHeaders(req, { allowAllOrigins: true })

  let supabase: ReturnType<typeof createServiceClient> | null = null
  let orderId = ''
  let notification: unknown = null

  try {
    const { url: supabaseUrl, serviceRoleKey: supabaseServiceKey } = getSupabaseEnv()
    const { serverKey: midtransServerKey } = getMidtransEnv()

    supabase = createServiceClient(supabaseUrl, supabaseServiceKey)

    notification = await req.json()
    const payload =
      typeof notification === 'object' && notification !== null
        ? (notification as Record<string, unknown>)
        : {}
    orderId = String(payload.order_id || '')
    const transactionStatus = String(payload.transaction_status || '')
    const transactionStatusKey = transactionStatus.toLowerCase() || 'unknown'
    const fraudStatus = payload.fraud_status ?? null
    const nowIso = new Date().toISOString()

    const signatureKey = String(payload.signature_key || '')
    const statusCode =
      typeof payload.status_code === 'number'
        ? String(payload.status_code)
        : String(payload.status_code || '')
    const grossAmount =
      typeof payload.gross_amount === 'number'
        ? payload.gross_amount.toFixed(2)
        : String(payload.gross_amount || '')

    // Verify signature
    const expectedSignature = await generateSignature(
      orderId,
      statusCode,
      grossAmount,
      midtransServerKey
    )

    if (!signatureKey || signatureKey !== expectedSignature) {
      await logWebhookEvent(supabase, {
        orderNumber: orderId,
        eventType: 'invalid_signature',
        payload: notification,
        success: false,
        errorMessage: 'Invalid signature',
        processedAt: nowIso,
      })
      return new Response(JSON.stringify({ error: 'Invalid signature' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const idempotencyEventType = `midtrans_status:${transactionStatusKey}`
    const { data: existingWebhook } = await supabase
      .from('webhook_logs')
      .select('id')
      .eq('order_number', orderId)
      .eq('event_type', idempotencyEventType)
      .eq('success', true)
      .limit(1)

    if (Array.isArray(existingWebhook) && existingWebhook.length > 0) {
      return new Response(JSON.stringify({ status: 'ok', idempotent: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // ================================================================
    // ROUTING: Handle PRINT- orders for spark-print project
    // Shared Midtrans account - forward to sparkstage55.print database
    // Project ID: lapyyqozbbcfsljxdhcg
    // ================================================================
    if (orderId.startsWith('PRINT-')) {
      const SPARK_PRINT_URL = 'https://lapyyqozbbcfsljxdhcg.supabase.co'
      const SPARK_PRINT_SERVICE_KEY = Deno.env.get('SPARK_PRINT_SERVICE_ROLE_KEY') || ''
      
      if (!SPARK_PRINT_SERVICE_KEY) {
        await logWebhookEvent(supabase, {
          orderNumber: orderId,
          eventType: 'spark_print_config_error',
          payload: notification,
          success: false,
          errorMessage: 'SPARK_PRINT_SERVICE_ROLE_KEY not configured',
          processedAt: nowIso,
        })
        return new Response(JSON.stringify({ error: 'Spark Print service key not configured' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      
      const sparkPrintSupabase = createServiceClient(SPARK_PRINT_URL, SPARK_PRINT_SERVICE_KEY)
      const printNewStatus = mapMidtransStatus(transactionStatus, fraudStatus)
      
      // Map to spark-print status format (UPPERCASE)
      const printStatus = printNewStatus === 'paid' ? 'PAID' : 
                          printNewStatus === 'expired' ? 'EXPIRED' : 
                          printNewStatus === 'failed' ? 'FAILED' : 
                          printNewStatus === 'refunded' ? 'REFUNDED' : 'UNPAID'
      
      const updateData: Record<string, unknown> = {
        status: printStatus,
        updated_at: nowIso,
      }
      
      if (printNewStatus === 'paid') {
        updateData.paid_at = nowIso
      }
      
      const { error: updateError } = await sparkPrintSupabase
        .from('print_orders')
        .update(updateData)
        .eq('midtrans_order_id', orderId)
      
      await logWebhookEvent(supabase, {
        orderNumber: orderId,
        eventType: 'spark_print_update',
        payload: { 
          request: payload, 
          updateData, 
          newStatus: printNewStatus,
          error: updateError?.message 
        },
        success: !updateError,
        errorMessage: updateError?.message ?? null,
        processedAt: nowIso,
      })
      
      if (updateError) {
        console.error(`[WEBHOOK] Failed to update print order ${orderId}:`, updateError)
        console.error(`[WEBHOOK] Failed to update print order ${orderId}:`, updateError)
        return jsonErrorWithDetails(
          req,
          500,
          {
            error: 'Failed to update print order',
            code: 'PRINT_ORDER_UPDATE_FAILED',
            details: updateError.message,
          },
          { allowAllOrigins: true }
        )
      }
      
      console.log(`[WEBHOOK] Successfully updated print order ${orderId} to ${printStatus}`)
      await logWebhookEvent(supabase, {
        orderNumber: orderId,
        eventType: idempotencyEventType,
        payload: notification,
        success: true,
        processedAt: nowIso,
      })

      return new Response(JSON.stringify({ status: 'ok', project: 'spark-print', order_status: printStatus }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    // ================================================================

    const newStatus = mapMidtransStatus(transactionStatus, fraudStatus)

    const { data: productOrder } = await supabase
      .from('order_products')
      .select('id, user_id, order_number, status, payment_status, pickup_code, pickup_status, pickup_expires_at, total, stock_released_at, voucher_id, voucher_code, discount_amount')
      .eq('order_number', orderId)
      .single()

    if (productOrder) {
      const result = await processProductOrderTransition({
        supabase,
        order: productOrder as {
          id: number
          user_id?: string | null
          order_number: string
          status?: string | null
          payment_status?: string | null
          pickup_code?: string | null
          pickup_status?: string | null
          pickup_expires_at?: string | null
          total?: unknown
          stock_released_at?: string | null
          voucher_id?: string | null
          voucher_code?: string | null
          discount_amount?: unknown
        },
        nextStatus: newStatus,
        paymentData: notification,
        grossAmount,
        nowIso,
        shouldSetPaidAt: true,
      })

      await logWebhookEvent(supabase, {
        orderNumber: orderId,
        eventType: 'product_order_processed',
        payload: {
          notification,
          next_status: newStatus,
          applied: result.applied,
          skipped_reason: result.skippedReason,
        },
        success: !result.updateError && !result.effectError,
        errorMessage: result.updateError ?? result.effectError,
        processedAt: nowIso,
      })

      await logWebhookEvent(supabase, {
        orderNumber: orderId,
        eventType: idempotencyEventType,
        payload: notification,
        success: !result.updateError && !result.effectError,
        errorMessage: result.updateError ?? result.effectError,
        processedAt: nowIso,
      })

      if (result.updateError || result.effectError) {
        return jsonErrorWithDetails(
          req,
          500,
          {
            error: 'Failed to process product payment webhook',
            code: 'PRODUCT_WEBHOOK_FAILED',
            details: result.updateError ?? result.effectError,
          },
          { allowAllOrigins: true }
        )
      }

      return new Response(JSON.stringify({ status: 'ok' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, user_id, order_number, status, tickets_issued_at, capacity_released_at, order_items(*)')
      .eq('order_number', orderId)
      .single()

    if (orderError || !order) {
      console.error('Order not found:', orderError)
      await logWebhookEvent(supabase, {
        orderNumber: orderId,
        eventType: 'order_not_found',
        payload: notification,
        success: false,
        errorMessage: orderError?.message ?? 'Order not found',
        processedAt: nowIso,
      })
      return new Response(JSON.stringify({ error: 'Order not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const orderItemsRows = (order as { order_items?: unknown }).order_items
    const result = await processTicketOrderTransition({
      supabase,
      order: order as {
        id: number
        order_number: string
        user_id: string | null
        status?: string | null
        tickets_issued_at?: string | null
        capacity_released_at?: string | null
      },
      nextStatus: newStatus,
      paymentData: notification,
      orderItems: Array.isArray(orderItemsRows) ? (orderItemsRows as TicketOrderItem[]) : undefined,
      nowIso,
    })

    await logWebhookEvent(supabase, {
      orderNumber: orderId,
      eventType: 'ticket_order_processed',
      payload: {
        notification,
        next_status: newStatus,
        applied: result.applied,
        skipped_reason: result.skippedReason,
      },
      success: !result.updateError && !result.effectError,
      errorMessage: result.updateError ?? result.effectError,
      processedAt: nowIso,
    })

    await logWebhookEvent(supabase, {
      orderNumber: orderId,
      eventType: idempotencyEventType,
      payload: notification,
      success: !result.updateError && !result.effectError,
      errorMessage: result.updateError ?? result.effectError,
      processedAt: nowIso,
    })

    if (result.updateError || result.effectError) {
      return jsonErrorWithDetails(
        req,
        500,
        {
          error: 'Failed to process ticket payment webhook',
          code: 'TICKET_WEBHOOK_FAILED',
          details: result.updateError ?? result.effectError,
        },
        { allowAllOrigins: true }
      )
    }

    return new Response(JSON.stringify({ status: 'ok' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Error processing notification:', error)
    if (supabase) {
      const message = error instanceof Error ? error.message : 'Internal server error'
      await logWebhookEvent(supabase, {
        orderNumber: orderId,
        eventType: 'exception',
        payload: notification,
        success: false,
        errorMessage: message,
        processedAt: new Date().toISOString(),
      })
    }
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
