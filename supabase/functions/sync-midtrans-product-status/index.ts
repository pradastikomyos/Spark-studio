import { serve } from '../_shared/deps.ts'
import { handleCors, json, jsonError, jsonErrorWithDetails } from '../_shared/http.ts'
import { getMidtransEnv } from '../_shared/env.ts'
import { createServiceClient } from '../_shared/supabase.ts'
import { getMidtransBasicAuthHeader, getStatusBaseUrl } from '../_shared/midtrans.ts'
import { mapMidtransStatus } from '../_shared/tickets.ts'
import { logWebhookEvent } from '../_shared/payment-effects.ts'
import { processProductOrderTransition } from '../_shared/payment-processors.ts'
import { requireAuthenticatedRequest } from '../_shared/auth.ts'

/**
 * sync-midtrans-product-status
 * 
 * Active sync for product orders (BOPIS - Buy Online Pick Up In Store).
 * This function directly queries Midtrans API to get real-time payment status,
 * instead of waiting passively for webhook.
 * 
 * Similar to sync-midtrans-status but for order_products table.
 * Critical: Generates pickup_code when status changes to paid.
 */

serve(async (req) => {
  const corsResponse = handleCors(req)
  if (corsResponse) return corsResponse

  try {
    const authResult = await requireAuthenticatedRequest(req)
    if (authResult.response) return authResult.response

    const auth = authResult.context!
    const { serverKey: midtransServerKey, isProduction: midtransIsProduction } = getMidtransEnv()

    // Use service role key for database operations
    const supabase = createServiceClient(auth.supabaseEnv.url, auth.supabaseEnv.serviceRoleKey)

    const body = await req.json().catch(() => ({}))
    const orderNumber = String(body?.order_number || '')
    if (!orderNumber) {
      return jsonError(req, 400, 'Missing order_number')
    }

    // 2. Fetch order from order_products table
    const { data: order, error: orderError } = await supabase
      .from('order_products')
      .select('id, user_id, order_number, status, payment_status, pickup_code, pickup_status, pickup_expires_at, total, stock_released_at, voucher_id, voucher_code, discount_amount')
      .eq('order_number', orderNumber)
      .single()

    if (orderError || !order) {
      return jsonError(req, 404, 'Order not found')
    }

    // Security: Only order owner can sync
    if (order.user_id !== auth.user.id) {
      return jsonError(req, 403, 'Forbidden')
    }

    // 3. Active Sync: Query Midtrans API directly
    const baseUrl = getStatusBaseUrl(midtransIsProduction)
    const authString = getMidtransBasicAuthHeader(midtransServerKey)
    const statusResponse = await fetch(`${baseUrl}/v2/${encodeURIComponent(orderNumber)}/status`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: authString,
      },
    })

    const statusData = await statusResponse.json().catch(() => null)
    if (!statusResponse.ok) {
      console.error('[sync-midtrans-product-status] Midtrans status error:', statusData)
      return jsonErrorWithDetails(req, 502, {
        error: 'Failed to fetch Midtrans status',
        code: 'MIDTRANS_STATUS_FETCH_FAILED',
        details: statusData,
      })
    }

    // 4. Map Midtrans status to our internal status
    const midtransStatus = mapMidtransStatus(statusData?.transaction_status, statusData?.fraud_status)
    const nowIso = new Date().toISOString()

    const result = await processProductOrderTransition({
      supabase,
      order: order as {
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
      nextStatus: midtransStatus,
      paymentData: statusData,
      grossAmount: statusData?.gross_amount,
      nowIso,
      shouldSetPaidAt: true,
    })

    await logWebhookEvent(supabase, {
      orderNumber,
      eventType: 'product_sync_processed',
      payload: {
        next_status: midtransStatus,
        applied: result.applied,
        skipped_reason: result.skippedReason,
      },
      success: !result.updateError && !result.effectError,
      errorMessage: result.updateError ?? result.effectError,
      processedAt: nowIso,
    })

    if (result.updateError || result.effectError) {
      console.error('[sync-midtrans-product-status] Failed to apply transition:', {
        updateError: result.updateError,
        effectError: result.effectError,
      })
      return jsonErrorWithDetails(req, 500, {
        error: 'Failed to sync product payment status',
        code: 'PRODUCT_STATUS_SYNC_FAILED',
        details: result.updateError ?? result.effectError,
      })
    }

    return json(req, { status: 'ok', order: result.order })
  } catch {
    return jsonError(req, 500, 'Internal server error')
  }
})
