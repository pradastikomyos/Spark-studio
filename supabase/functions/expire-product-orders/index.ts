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

type ExpireProductOrderResult = {
  ok?: boolean
  code?: string
  message?: string
  result?: string
  reason?: string
  order_number?: string
  order_id?: number
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
        const trace = {
          action: 'expire_product_order',
          order_id: order.id,
          order_number: order.order_number,
          channel: order.channel ?? null,
          payment_status: order.payment_status ?? null,
        }
        console.log('[Expire Product Orders] start', trace)

        const { data: resultData, error: rpcError } = await supabase.rpc('expire_product_order_atomic', {
          p_order_id: order.id,
          p_now: nowIso,
        })

        if (rpcError) {
          console.error('[Expire Product Orders] rpc_error', {
            ...trace,
            error: rpcError.message,
          })
          await logWebhookEvent(supabase, {
            orderNumber: order.order_number,
            eventType: 'expire_product_order_failed',
            payload: { error: rpcError.message },
            success: false,
            errorMessage: rpcError.message,
            processedAt: nowIso,
          })
          failedOrders.push(order.order_number)
          continue
        }

        const result =
          resultData && typeof resultData === 'object'
            ? (resultData as ExpireProductOrderResult)
            : ({ ok: false } satisfies ExpireProductOrderResult)

        console.log('[Expire Product Orders] end', {
          ...trace,
          ok: Boolean(result.ok),
          result: result.result ?? null,
          reason: result.reason ?? null,
          code: result.code ?? null,
        })

        if (!result.ok) {
          await logWebhookEvent(supabase, {
            orderNumber: order.order_number,
            eventType: 'expire_product_order_failed',
            payload: { code: result.code ?? null, message: result.message ?? null },
            success: false,
            errorMessage: result.message ?? 'Expire RPC returned non-ok result',
            processedAt: nowIso,
          })
          failedOrders.push(order.order_number)
          continue
        }

        if (result.result === 'noop') {
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
