import { serve } from '../_shared/deps.ts'
import { handleCors, json, jsonError } from '../_shared/http.ts'
import { getMidtransEnv } from '../_shared/env.ts'
import { createServiceClient } from '../_shared/supabase.ts'
import { getMidtransBasicAuthHeader, getStatusBaseUrl } from '../_shared/midtrans.ts'
import { mapMidtransStatus } from '../_shared/tickets.ts'
import { ensureProductPaidSideEffects, releaseProductReservedStockIfNeeded, toNumber } from '../_shared/payment-effects.ts'
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

    const previousPaymentStatus = String(order.payment_status || '').toLowerCase()

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
      return jsonError(req, 502, { error: 'Failed to fetch Midtrans status', details: statusData })
    }

        // 4. Map Midtrans status to our internal status
    const midtransStatus = mapMidtransStatus(statusData?.transaction_status, statusData?.fraud_status)
    const nowIso = new Date().toISOString()

        // 5. Prepare update fields
    const paymentStatus =
      midtransStatus === 'paid'
        ? 'paid'
        : midtransStatus === 'refunded'
          ? 'refunded'
          : midtransStatus === 'failed' || midtransStatus === 'expired'
            ? 'failed'
            : 'unpaid'

    const orderStatus =
      midtransStatus === 'paid'
        ? 'processing'
        : midtransStatus === 'expired'
          ? 'expired'
          : midtransStatus === 'failed'
            ? 'cancelled'
            : order.status || 'awaiting_payment'

    const updateFields: Record<string, unknown> = {
      status: orderStatus,
      payment_status: paymentStatus,
      payment_data: statusData,
      updated_at: nowIso,
    }

    if (midtransStatus === 'expired') {
      updateFields.expired_at = nowIso
    }

    const { data: updatedOrder, error: updateError } = await supabase
      .from('order_products')
      .update(updateFields)
      .eq('id', order.id)
      .select('id, order_number, status, payment_status, pickup_code, pickup_status, pickup_expires_at, paid_at, total, stock_released_at, voucher_id, voucher_code, discount_amount')
      .single()

    if (updateError || !updatedOrder) {
      return jsonError(req, 500, 'Failed to update order')
    }

    if (midtransStatus === 'paid' && (previousPaymentStatus !== 'paid' || !updatedOrder.pickup_code)) {
      await ensureProductPaidSideEffects({
        supabase,
        order: updatedOrder as unknown as {
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
        grossAmount: statusData?.gross_amount,
        defaultStatus: orderStatus,
        shouldSetPaidAt: true,
      })
    }

    const voucherId = (updatedOrder as { voucher_id?: string | null }).voucher_id ?? null
    const voucherUserId = order.user_id ?? null
    const voucherDiscountAmount = toNumber((updatedOrder as { discount_amount?: unknown }).discount_amount, 0)

    if (midtransStatus === 'paid' && voucherId && voucherUserId) {
      await supabase
        .from('voucher_usage')
        .upsert(
          {
            voucher_id: voucherId,
            user_id: voucherUserId,
            order_product_id: updatedOrder.id,
            discount_amount: voucherDiscountAmount,
            used_at: nowIso,
          },
          { onConflict: 'order_product_id' }
        )
    }

    const shouldReleaseVoucherQuota =
      (midtransStatus === 'expired' || midtransStatus === 'failed') && previousPaymentStatus !== 'paid'

    if (shouldReleaseVoucherQuota && voucherId) {
      await supabase.rpc('release_voucher_quota', { p_voucher_id: voucherId })
    }

    if (midtransStatus === 'expired' || midtransStatus === 'failed' || midtransStatus === 'refunded') {
      await releaseProductReservedStockIfNeeded({
        supabase,
        order: updatedOrder as unknown as {
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
    }

    return json(req, { status: 'ok', order: updatedOrder })
  } catch {
    return jsonError(req, 500, 'Internal server error')
  }
})
