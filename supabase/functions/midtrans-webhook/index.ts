import { serve } from '../_shared/deps.ts'
import { getCorsHeaders, handleCors } from '../_shared/http.ts'
import { getMidtransEnv, getSupabaseEnv } from '../_shared/env.ts'
import { createServiceClient } from '../_shared/supabase.ts'
import { generateSignature } from '../_shared/midtrans.ts'
import { mapMidtransStatus } from '../_shared/tickets.ts'
import {
  ensureProductPaidSideEffects,
  issueTicketsIfNeeded,
  logWebhookEvent,
  releaseProductReservedStockIfNeeded,
  releaseTicketCapacityIfNeeded,
  toNumber,
} from '../_shared/payment-effects.ts'

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
        return new Response(JSON.stringify({ error: 'Failed to update print order', details: updateError.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
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
      .select('id, user_id, status, payment_status, pickup_code, pickup_status, pickup_expires_at, total, stock_released_at, voucher_id, voucher_code, discount_amount')
      .eq('order_number', orderId)
      .single()

    if (productOrder) {
      const currentPaymentStatus = String((productOrder as { payment_status?: string }).payment_status || '').toLowerCase()
      const currentStatus = String((productOrder as { status?: string }).status || '').toLowerCase()
      const currentPickupStatus = String((productOrder as { pickup_status?: string | null }).pickup_status || '').toLowerCase()
      const voucherId = (productOrder as { voucher_id?: string | null }).voucher_id ?? null
      const voucherCode = (productOrder as { voucher_code?: string | null }).voucher_code ?? null
      const voucherUserId = (productOrder as { user_id?: string | null }).user_id ?? null
      const voucherDiscountAmount = toNumber((productOrder as { discount_amount?: unknown }).discount_amount, 0)

      const paymentStatus =
        newStatus === 'paid'
          ? 'paid'
          : newStatus === 'refunded'
            ? 'refunded'
            : newStatus === 'failed' || newStatus === 'expired'
              ? 'failed'
              : 'unpaid'

      const status =
        newStatus === 'paid'
          ? 'processing'
          : newStatus === 'expired'
            ? 'expired'
            : newStatus === 'failed'
              ? 'cancelled'
              : currentStatus || 'awaiting_payment'

      if (newStatus === 'paid' && (currentPaymentStatus !== 'paid' || !productOrder.pickup_code)) {
        await ensureProductPaidSideEffects({
          supabase,
          order: productOrder as unknown as {
            id: number
            order_number: string
            status?: string | null
            payment_status?: string | null
            total?: unknown
            pickup_code?: string | null
            pickup_status?: string | null
            pickup_expires_at?: string | null
            stock_released_at?: string | null
          },
          nowIso,
          grossAmount,
          defaultStatus: status,
          shouldSetPaidAt: true,
        })
      } else {
        const updateFields: Record<string, unknown> = {
          status,
          payment_status: paymentStatus,
          updated_at: nowIso,
        }
        if (newStatus === 'expired') updateFields.expired_at = nowIso

        await supabase
          .from('order_products')
          .update(updateFields)
          .eq('id', (productOrder as { id: number }).id)
      }

      if (newStatus === 'paid' && voucherId && voucherUserId) {
        const { error: voucherUsageError } = await supabase
          .from('voucher_usage')
          .upsert(
            {
              voucher_id: voucherId,
              user_id: voucherUserId,
              order_product_id: (productOrder as { id: number }).id,
              discount_amount: voucherDiscountAmount,
              used_at: nowIso,
            },
            { onConflict: 'order_product_id' }
          )

        if (voucherUsageError) {
          await logWebhookEvent(supabase, {
            orderNumber: orderId,
            eventType: 'voucher_usage_create_failed',
            payload: { voucher_id: voucherId, voucher_code: voucherCode, error: voucherUsageError.message },
            success: false,
            errorMessage: voucherUsageError.message,
            processedAt: nowIso,
          })
        }
      }

      const shouldReleaseVoucherQuota =
        (newStatus === 'expired' || newStatus === 'failed') && currentPaymentStatus !== 'paid'

      if (shouldReleaseVoucherQuota && voucherId) {
        const { data: released, error: releaseError } = await supabase.rpc('release_voucher_quota', {
          p_voucher_id: voucherId,
        })
        await logWebhookEvent(supabase, {
          orderNumber: orderId,
          eventType: 'voucher_quota_released',
          payload: {
            voucher_id: voucherId,
            voucher_code: voucherCode,
            result: released,
            status: newStatus,
            error: releaseError?.message,
          },
          success: !releaseError,
          errorMessage: releaseError?.message ?? null,
          processedAt: nowIso,
        })
      }

      const shouldReleaseReserve =
        (newStatus === 'expired' || newStatus === 'failed' || newStatus === 'refunded') &&
        currentPaymentStatus !== 'paid' &&
        currentStatus !== 'cancelled' &&
        currentStatus !== 'expired' &&
        currentPickupStatus !== 'completed'

      if (shouldReleaseReserve) {
        try {
          await releaseProductReservedStockIfNeeded({
            supabase,
            order: productOrder as unknown as {
              id: number
              order_number: string
              status?: string | null
              payment_status?: string | null
              total?: unknown
              pickup_code?: string | null
              pickup_status?: string | null
              pickup_expires_at?: string | null
              stock_released_at?: string | null
            },
            nowIso,
          })
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to release reserved stock'
          await logWebhookEvent(supabase, {
            orderNumber: orderId,
            eventType: 'stock_release_failed',
            payload: { error: message },
            success: false,
            errorMessage: message,
            processedAt: nowIso,
          })
          await supabase
            .from('order_products')
            .update({ status: 'requires_review', pickup_status: 'pending_review', updated_at: nowIso })
            .eq('id', (productOrder as { id: number }).id)
        }
      }

      await logWebhookEvent(supabase, {
        orderNumber: orderId,
        eventType: 'product_order_processed',
        payload: notification,
        success: true,
        processedAt: nowIso,
      })

      await logWebhookEvent(supabase, {
        orderNumber: orderId,
        eventType: idempotencyEventType,
        payload: notification,
        success: true,
        processedAt: nowIso,
      })

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

    const previousOrderStatus = String((order as { status?: unknown }).status || '').toLowerCase()

    const { error: updateError } = await supabase
      .from('orders')
      .update({
        status: newStatus,
        payment_data: notification,
        updated_at: nowIso,
      })
      .eq('id', order.id)

    if (updateError) {
      console.error('Failed to update order:', updateError)
    }

    const shouldReleaseCapacity =
      (newStatus === 'expired' || newStatus === 'failed' || newStatus === 'refunded') && previousOrderStatus !== 'paid'
    if (shouldReleaseCapacity) {
      const orderItemsRows = (order as { order_items?: unknown }).order_items
      if (Array.isArray(orderItemsRows)) {
        await releaseTicketCapacityIfNeeded({
          supabase,
          order: order as unknown as {
            id: number
            order_number: string
            user_id: string | null
            status?: string | null
            tickets_issued_at?: string | null
            capacity_released_at?: string | null
          },
          orderItems: orderItemsRows as Array<{ id: number; ticket_id: number; selected_date: string; selected_time_slots: unknown; quantity: number }>,
          nowIso,
        })
      }
    }

    if (newStatus === 'paid') {
      const { data: orderItems, error: itemsError } = await supabase.from('order_items').select('*').eq('order_id', order.id)

      if (!itemsError && Array.isArray(orderItems)) {
        try {
          await issueTicketsIfNeeded({
            supabase,
            order: order as unknown as {
              id: number
              order_number: string
              user_id: string | null
              status?: string | null
              tickets_issued_at?: string | null
              capacity_released_at?: string | null
            },
            orderItems: orderItems as Array<{ id: number; ticket_id: number; selected_date: string; selected_time_slots: unknown; quantity: number }>,
            nowIso,
          })
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to issue tickets'
          await logWebhookEvent(supabase, {
            orderNumber: orderId,
            eventType: 'ticket_issue_failed',
            payload: { error: message },
            success: false,
            errorMessage: message,
            processedAt: nowIso,
          })
          await supabase
            .from('orders')
            .update({ status: 'requires_review', updated_at: nowIso })
            .eq('id', order.id)
        }
      }
    }

    await logWebhookEvent(supabase, {
      orderNumber: orderId,
      eventType: 'ticket_order_processed',
      payload: notification,
      success: !updateError,
      errorMessage: updateError?.message ?? null,
      processedAt: nowIso,
    })

    await logWebhookEvent(supabase, {
      orderNumber: orderId,
      eventType: idempotencyEventType,
      payload: notification,
      success: !updateError,
      errorMessage: updateError?.message ?? null,
      processedAt: nowIso,
    })

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
