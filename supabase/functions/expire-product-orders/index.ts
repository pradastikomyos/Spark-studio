/**
 * Expire Product Orders Edge Function
 *
 * Auto-expires app-owned product expiries:
 * - unpaid cashier QR reservations
 * - paid pickup QR codes that are no longer redeemable
 */

import { getSupabaseEnv } from '../_shared/env.ts'
import { handleCors, json, jsonError } from '../_shared/http.ts'
import { logWebhookEvent } from '../_shared/payment-effects.ts'
import { createServiceClient } from '../_shared/supabase.ts'

interface OrderItem {
  product_variant_id: number
  quantity: number
}

interface ExpirableOrder {
  id: number
  order_number: string
  payment_status?: string | null
  pickup_status?: string | null
  pickup_expires_at?: string | null
  voucher_id?: string | null
  channel?: string | null
  stock_released_at?: string | null
}

async function releaseStock(params: {
  supabase: ReturnType<typeof createServiceClient>
  order: ExpirableOrder
  nowIso: string
}) {
  const { supabase, order, nowIso } = params
  if (order.stock_released_at) return { ok: true }

  const { data: orderItems, error: itemsError } = await supabase
    .from('order_product_items')
    .select('product_variant_id, quantity')
    .eq('order_product_id', order.id)

  if (itemsError) {
    console.error(`[Expire Product Orders] Error fetching items for order ${order.order_number}:`, itemsError)
    await logWebhookEvent(supabase, {
      orderNumber: order.order_number,
      eventType: 'expire_product_items_fetch_failed',
      payload: { error: itemsError.message },
      success: false,
      errorMessage: itemsError.message,
      processedAt: nowIso,
    })
    return { ok: false }
  }

  if (Array.isArray(orderItems) && orderItems.length > 0) {
    for (const item of orderItems as OrderItem[]) {
      const { error: releaseError } = await supabase.rpc('release_product_stock', {
        p_variant_id: item.product_variant_id,
        p_quantity: item.quantity,
      })

      if (releaseError) {
        console.error(
          `[Expire Product Orders] Error releasing stock for variant ${item.product_variant_id}:`,
          releaseError
        )
        await logWebhookEvent(supabase, {
          orderNumber: order.order_number,
          eventType: 'expire_product_stock_release_failed',
          payload: { variant_id: item.product_variant_id, error: releaseError.message },
          success: false,
          errorMessage: releaseError.message,
          processedAt: nowIso,
        })
        return { ok: false }
      }
    }
  }

  return { ok: true }
}

Deno.serve(async (req) => {
  const corsResponse = handleCors(req)
  if (corsResponse) return corsResponse

  try {
    const { url: supabaseUrl, serviceRoleKey: supabaseServiceKey } = getSupabaseEnv()
    const supabase = createServiceClient(supabaseUrl, supabaseServiceKey)

    console.log('[Expire Product Orders] Starting 5-minute expiry sweep...')

    const nowIso = new Date().toISOString()

    const { data: expiredPickupOrders, error: pickupFetchError } = await supabase
      .from('order_products')
      .select('id, order_number, payment_status, pickup_status, pickup_expires_at, voucher_id, channel, stock_released_at')
      .eq('payment_status', 'paid')
      .in('pickup_status', ['pending', 'pending_pickup', 'pending_review'])
      .lt('pickup_expires_at', nowIso)

    if (pickupFetchError) {
      console.error('[Expire Product Orders] Error fetching paid pickup orders:', pickupFetchError)
      return jsonError(req, 500, {
        success: false,
        error: pickupFetchError.message,
        timestamp: nowIso,
      })
    }

    const { data: expiredCashierOrders, error: cashierFetchError } = await supabase
      .from('order_products')
      .select('id, order_number, payment_status, pickup_status, pickup_expires_at, voucher_id, channel, stock_released_at')
      .eq('channel', 'cashier')
      .in('payment_status', ['unpaid', 'pending'])
      .in('pickup_status', ['pending', 'pending_pickup'])
      .lt('pickup_expires_at', nowIso)

    if (cashierFetchError) {
      console.error('[Expire Product Orders] Error fetching cashier reservations:', cashierFetchError)
      return jsonError(req, 500, {
        success: false,
        error: cashierFetchError.message,
        timestamp: nowIso,
      })
    }

    const expiredOrders = [
      ...(expiredPickupOrders || []),
      ...((expiredCashierOrders || []).filter((order) =>
        !(expiredPickupOrders || []).some((paidOrder) => paidOrder.id === order.id)
      )),
    ] as ExpirableOrder[]

    if (expiredOrders.length === 0) {
      console.log('[Expire Product Orders] No expired orders found')
      return json(req, {
        success: true,
        expired_count: 0,
        message: 'No expired orders found',
        timestamp: nowIso,
      })
    }

    console.log(`[Expire Product Orders] Found ${expiredOrders.length} expired order(s)`)

    let expiredCount = 0
    const failedOrders: string[] = []

    for (const order of expiredOrders) {
      try {
        const stockResult = await releaseStock({
          supabase,
          order,
          nowIso,
        })

        if (!stockResult.ok) {
          failedOrders.push(order.order_number)
          continue
        }

        const isCashierPendingOrder =
          String(order.channel || '').toLowerCase() === 'cashier' &&
          ['unpaid', 'pending'].includes(String(order.payment_status || '').toLowerCase())

        if (isCashierPendingOrder && order.voucher_id) {
          const { error: voucherReleaseError } = await supabase.rpc('release_voucher_quota', {
            p_voucher_id: order.voucher_id,
          })

          if (voucherReleaseError) {
            console.error(`[Expire Product Orders] Error releasing voucher ${order.voucher_id}:`, voucherReleaseError)
            await logWebhookEvent(supabase, {
              orderNumber: order.order_number,
              eventType: 'expire_voucher_release_failed',
              payload: { voucher_id: order.voucher_id, error: voucherReleaseError.message },
              success: false,
              errorMessage: voucherReleaseError.message,
              processedAt: nowIso,
            })
            failedOrders.push(order.order_number)
            continue
          }
        }

        const { error: updateError } = await supabase
          .from('order_products')
          .update({
            pickup_status: 'expired',
            status: 'expired',
            expired_at: nowIso,
            stock_released_at: nowIso,
            updated_at: nowIso,
          })
          .eq('id', order.id)

        if (updateError) {
          console.error(`[Expire Product Orders] Error updating order ${order.order_number}:`, updateError)
          failedOrders.push(order.order_number)
          continue
        }

        expiredCount++
        console.log(`[Expire Product Orders] Expired order: ${order.order_number}`)
        await logWebhookEvent(supabase, {
          orderNumber: order.order_number,
          eventType: 'expire_product_order',
          payload: { order_id: order.id, payment_status: order.payment_status, pickup_status: order.pickup_status },
          success: true,
          processedAt: nowIso,
        })
      } catch (orderErr) {
        console.error(`[Expire Product Orders] Error processing order ${order.order_number}:`, orderErr)
        await logWebhookEvent(supabase, {
          orderNumber: order.order_number,
          eventType: 'expire_product_order_failed',
          payload: { error: orderErr instanceof Error ? orderErr.message : String(orderErr) },
          success: false,
          errorMessage: orderErr instanceof Error ? orderErr.message : 'Unknown error',
          processedAt: nowIso,
        })
        failedOrders.push(order.order_number)
      }
    }

    return json(req, {
      success: true,
      expired_count: expiredCount,
      failed_count: failedOrders.length,
      failed_orders: failedOrders,
      timestamp: nowIso,
      message: `Expired ${expiredCount} order(s)${failedOrders.length > 0 ? `, ${failedOrders.length} failed` : ''}`,
    })
  } catch (err) {
    console.error('[Expire Product Orders] Unexpected error:', err)
    return jsonError(req, 500, {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    })
  }
})
