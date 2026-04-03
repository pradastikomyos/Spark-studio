import { serve } from '../_shared/deps.ts'
import { getMidtransEnv, getSupabaseEnv } from '../_shared/env.ts'
import { getCorsHeaders, handleCors, json } from '../_shared/http.ts'
import { getMidtransBasicAuthHeader, getStatusBaseUrl } from '../_shared/midtrans.ts'
import {
  isFinalOrPaidMidtransStatus,
  processProductOrderTransition,
  processTicketOrderTransition,
} from '../_shared/payment-processors.ts'
import {
  ensureProductPaidSideEffects,
  issueTicketsIfNeeded,
  logWebhookEvent,
  releaseProductReservedStockIfNeeded,
  releaseTicketCapacityIfNeeded,
  type TicketOrderItem,
} from '../_shared/payment-effects.ts'
import { createServiceClient } from '../_shared/supabase.ts'
import { mapMidtransStatus } from '../_shared/tickets.ts'

type TicketOrderRow = {
  id: number
  user_id: string | null
  order_number: string
  status?: string | null
  tickets_issued_at?: string | null
  capacity_released_at?: string | null
}

type ProductOrderRow = {
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
}

type MidtransStatusResult =
  | { ok: true; mappedStatus: string; statusData: unknown }
  | { ok: false; error: string; statusData: unknown }

function isMidtransFailure(result: MidtransStatusResult): result is Extract<MidtransStatusResult, { ok: false }> {
  return result.ok === false
}

async function fetchMidtransStatus(params: {
  baseUrl: string
  authString: string
  orderNumber: string
}): Promise<MidtransStatusResult> {
  const statusResponse = await fetch(`${params.baseUrl}/v2/${encodeURIComponent(params.orderNumber)}/status`, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: params.authString,
    },
  })

  const statusData = await statusResponse.json().catch(() => null)
  if (!statusResponse.ok) {
    return {
      ok: false,
      error: `Failed to fetch Midtrans status (${statusResponse.status})`,
      statusData,
    }
  }

  return {
    ok: true,
    mappedStatus: mapMidtransStatus(
      (statusData as { transaction_status?: unknown })?.transaction_status,
      (statusData as { fraud_status?: unknown })?.fraud_status
    ),
    statusData,
  }
}

async function reconcileStaleTicketOrder(params: {
  supabase: ReturnType<typeof createServiceClient>
  order: TicketOrderRow
  baseUrl: string
  authString: string
  nowIso: string
}) {
  const { supabase, order, baseUrl, authString, nowIso } = params

  try {
    const midtransResult = await fetchMidtransStatus({
      baseUrl,
      authString,
      orderNumber: order.order_number,
    })

    if (isMidtransFailure(midtransResult)) {
      await logWebhookEvent(supabase, {
        orderNumber: order.order_number,
        eventType: 'reconcile_ticket_status_fetch_failed',
        payload: { error: midtransResult.error, response: midtransResult.statusData },
        success: false,
        errorMessage: midtransResult.error,
        processedAt: nowIso,
      })
      return { checked: 1, finalized: 0 }
    }

    const nextStatus = midtransResult.mappedStatus
    if (!isFinalOrPaidMidtransStatus(nextStatus)) {
      await logWebhookEvent(supabase, {
        orderNumber: order.order_number,
        eventType: 'reconcile_ticket_still_pending',
        payload: { status: nextStatus },
        success: true,
        processedAt: nowIso,
      })
      return { checked: 1, finalized: 0 }
    }

    const result = await processTicketOrderTransition({
      supabase,
      order,
      nextStatus,
      paymentData: midtransResult.statusData,
      nowIso,
    })

    if (result.updateError || !result.order) {
      await logWebhookEvent(supabase, {
        orderNumber: order.order_number,
        eventType: 'reconcile_ticket_update_failed',
        payload: { error: result.updateError ?? 'Unknown error', status: nextStatus },
        success: false,
        errorMessage: result.updateError ?? 'Unknown error',
        processedAt: nowIso,
      })
      return { checked: 1, finalized: 0 }
    }

    await logWebhookEvent(supabase, {
      orderNumber: order.order_number,
      eventType: 'reconcile_ticket_pending_finalized',
      payload: { status: nextStatus, applied: result.applied, skipped_reason: result.skippedReason },
      success: !result.effectError,
      errorMessage: result.effectError,
      processedAt: nowIso,
    })

    return { checked: 1, finalized: 1 }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    await logWebhookEvent(supabase, {
      orderNumber: order.order_number,
      eventType: 'reconcile_ticket_failed',
      payload: { error: message },
      success: false,
      errorMessage: message,
      processedAt: nowIso,
    })
    return { checked: 1, finalized: 0 }
  }
}

async function reconcileStaleProductOrder(params: {
  supabase: ReturnType<typeof createServiceClient>
  order: ProductOrderRow
  baseUrl: string
  authString: string
  nowIso: string
}) {
  const { supabase, order, baseUrl, authString, nowIso } = params

  try {
    const midtransResult = await fetchMidtransStatus({
      baseUrl,
      authString,
      orderNumber: order.order_number,
    })

    if (isMidtransFailure(midtransResult)) {
      await logWebhookEvent(supabase, {
        orderNumber: order.order_number,
        eventType: 'reconcile_product_status_fetch_failed',
        payload: { error: midtransResult.error, response: midtransResult.statusData },
        success: false,
        errorMessage: midtransResult.error,
        processedAt: nowIso,
      })
      return { checked: 1, finalized: 0 }
    }

    const nextStatus = midtransResult.mappedStatus
    if (!isFinalOrPaidMidtransStatus(nextStatus)) {
      await logWebhookEvent(supabase, {
        orderNumber: order.order_number,
        eventType: 'reconcile_product_still_pending',
        payload: { status: nextStatus },
        success: true,
        processedAt: nowIso,
      })
      return { checked: 1, finalized: 0 }
    }

    const result = await processProductOrderTransition({
      supabase,
      order,
      nextStatus,
      paymentData: midtransResult.statusData,
      grossAmount: (midtransResult.statusData as { gross_amount?: unknown })?.gross_amount,
      nowIso,
      shouldSetPaidAt: true,
    })

    if (result.updateError || !result.order) {
      await logWebhookEvent(supabase, {
        orderNumber: order.order_number,
        eventType: 'reconcile_product_update_failed',
        payload: { error: result.updateError ?? 'Unknown error', status: nextStatus },
        success: false,
        errorMessage: result.updateError ?? 'Unknown error',
        processedAt: nowIso,
      })
      return { checked: 1, finalized: 0 }
    }

    await logWebhookEvent(supabase, {
      orderNumber: order.order_number,
      eventType: 'reconcile_product_pending_finalized',
      payload: { status: nextStatus, applied: result.applied, skipped_reason: result.skippedReason },
      success: !result.effectError,
      errorMessage: result.effectError,
      processedAt: nowIso,
    })

    return { checked: 1, finalized: 1 }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    await logWebhookEvent(supabase, {
      orderNumber: order.order_number,
      eventType: 'reconcile_product_failed',
      payload: { error: message },
      success: false,
      errorMessage: message,
      processedAt: nowIso,
    })
    return { checked: 1, finalized: 0 }
  }
}

serve(async (req) => {
  const corsResponse = handleCors(req)
  if (corsResponse) return corsResponse
  const corsHeaders = getCorsHeaders(req)

  if (req.method !== 'POST') {
    return json(req, { error: 'Method not allowed' }, { status: 405 })
  }

  try {
    const { url: supabaseUrl, serviceRoleKey: supabaseServiceKey } = getSupabaseEnv()
    const { serverKey: midtransServerKey, isProduction: midtransIsProduction } = getMidtransEnv()
    const supabase = createServiceClient(supabaseUrl, supabaseServiceKey)
    const baseUrl = getStatusBaseUrl(midtransIsProduction)
    const authString = getMidtransBasicAuthHeader(midtransServerKey)
    const nowIso = new Date().toISOString()

    let staleTicketCheckedCount = 0
    let staleTicketFinalizedCount = 0
    let staleProductCheckedCount = 0
    let staleProductFinalizedCount = 0

    const finalizedTicketOrderIds = new Set<number>()
    const finalizedProductOrderIds = new Set<number>()

    const { data: staleTicketOrders } = await supabase
      .from('orders')
      .select('id, user_id, order_number, status, tickets_issued_at, capacity_released_at')
      .eq('status', 'pending')
      .is('tickets_issued_at', null)
      .lt('expires_at', nowIso)

    if (Array.isArray(staleTicketOrders)) {
      for (const order of staleTicketOrders as TicketOrderRow[]) {
        const result = await reconcileStaleTicketOrder({
          supabase,
          order,
          baseUrl,
          authString,
          nowIso,
        })
        staleTicketCheckedCount += result.checked
        staleTicketFinalizedCount += result.finalized
        if (result.finalized > 0) finalizedTicketOrderIds.add(order.id)
      }
    }

    const { data: staleProductOrders } = await supabase
      .from('order_products')
      .select(
        'id, user_id, order_number, status, payment_status, pickup_code, pickup_status, pickup_expires_at, total, stock_released_at, voucher_id, voucher_code, discount_amount'
      )
      .neq('channel', 'cashier')
      .in('payment_status', ['unpaid', 'pending'])
      .not('status', 'in', '(cancelled,expired,completed)')
      .lt('payment_expired_at', nowIso)

    if (Array.isArray(staleProductOrders)) {
      for (const order of staleProductOrders as ProductOrderRow[]) {
        const result = await reconcileStaleProductOrder({
          supabase,
          order,
          baseUrl,
          authString,
          nowIso,
        })
        staleProductCheckedCount += result.checked
        staleProductFinalizedCount += result.finalized
        if (result.finalized > 0) finalizedProductOrderIds.add(order.id)
      }
    }

    const { data: paidTicketOrders } = await supabase
      .from('orders')
      .select('id, user_id, order_number, status, tickets_issued_at, capacity_released_at')
      .eq('status', 'paid')

    let ticketFixCount = 0
    if (Array.isArray(paidTicketOrders)) {
      for (const order of paidTicketOrders as TicketOrderRow[]) {
        if (finalizedTicketOrderIds.has(order.id) || order.tickets_issued_at) continue
        const { data: orderItems, error: orderItemsError } = await supabase
          .from('order_items')
          .select('id, ticket_id, selected_date, selected_time_slots, quantity')
          .eq('order_id', order.id)

        if (orderItemsError) {
          await logWebhookEvent(supabase, {
            orderNumber: order.order_number,
            eventType: 'reconcile_ticket_issue_repair_failed',
            payload: { error: orderItemsError.message, phase: 'load_items' },
            success: false,
            errorMessage: orderItemsError.message,
            processedAt: nowIso,
          })
          continue
        }

        if (Array.isArray(orderItems) && orderItems.length > 0) {
          try {
            await issueTicketsIfNeeded({
              supabase,
              order,
              orderItems: orderItems as TicketOrderItem[],
              nowIso,
            })
            ticketFixCount += 1
          } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error'
            await logWebhookEvent(supabase, {
              orderNumber: order.order_number,
              eventType: 'reconcile_ticket_issue_repair_failed',
              payload: { error: message },
              success: false,
              errorMessage: message,
              processedAt: nowIso,
            })
          }
        }
      }
    }

    const { data: failedTicketOrders } = await supabase
      .from('orders')
      .select('id, user_id, order_number, status, tickets_issued_at, capacity_released_at')
      .in('status', ['expired', 'failed', 'refunded'])

    let ticketReleaseCount = 0
    if (Array.isArray(failedTicketOrders)) {
      for (const order of failedTicketOrders as TicketOrderRow[]) {
        if (finalizedTicketOrderIds.has(order.id) || order.capacity_released_at) continue
        const { data: orderItems, error: orderItemsError } = await supabase
          .from('order_items')
          .select('id, ticket_id, selected_date, selected_time_slots, quantity')
          .eq('order_id', order.id)

        if (orderItemsError) {
          await logWebhookEvent(supabase, {
            orderNumber: order.order_number,
            eventType: 'reconcile_ticket_release_repair_failed',
            payload: { error: orderItemsError.message, phase: 'load_items' },
            success: false,
            errorMessage: orderItemsError.message,
            processedAt: nowIso,
          })
          continue
        }

        if (Array.isArray(orderItems) && orderItems.length > 0) {
          try {
            await releaseTicketCapacityIfNeeded({
              supabase,
              order,
              orderItems: orderItems as TicketOrderItem[],
              nowIso,
            })
            ticketReleaseCount += 1
          } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error'
            await logWebhookEvent(supabase, {
              orderNumber: order.order_number,
              eventType: 'reconcile_ticket_release_repair_failed',
              payload: { error: message },
              success: false,
              errorMessage: message,
              processedAt: nowIso,
            })
          }
        }
      }
    }

    const { data: paidProductOrders } = await supabase
      .from('order_products')
      .select('id, order_number, status, payment_status, pickup_code, pickup_status, pickup_expires_at, total, stock_released_at')
      .eq('payment_status', 'paid')

    let productFixCount = 0
    if (Array.isArray(paidProductOrders)) {
      for (const order of paidProductOrders as ProductOrderRow[]) {
        if (finalizedProductOrderIds.has(order.id) || order.pickup_code) continue
        try {
          await ensureProductPaidSideEffects({
            supabase,
            order,
            nowIso,
            defaultStatus: String(order.status || 'processing'),
            shouldSetPaidAt: false,
          })
          productFixCount += 1
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown error'
          await logWebhookEvent(supabase, {
            orderNumber: order.order_number,
            eventType: 'reconcile_product_paid_repair_failed',
            payload: { error: message },
            success: false,
            errorMessage: message,
            processedAt: nowIso,
          })
        }
      }
    }

    const { data: failedProductOrders } = await supabase
      .from('order_products')
      .select('id, order_number, status, payment_status, pickup_code, pickup_status, pickup_expires_at, total, stock_released_at')
      .in('payment_status', ['failed', 'refunded'])
      .or('status.eq.expired')

    let productReleaseCount = 0
    if (Array.isArray(failedProductOrders)) {
      for (const order of failedProductOrders as ProductOrderRow[]) {
        if (finalizedProductOrderIds.has(order.id) || order.stock_released_at) continue
        try {
          await releaseProductReservedStockIfNeeded({
            supabase,
            order,
            nowIso,
          })
          productReleaseCount += 1
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown error'
          await logWebhookEvent(supabase, {
            orderNumber: order.order_number,
            eventType: 'reconcile_product_release_repair_failed',
            payload: { error: message },
            success: false,
            errorMessage: message,
            processedAt: nowIso,
          })
        }
      }
    }

    await logWebhookEvent(supabase, {
      orderNumber: 'reconcile',
      eventType: 'reconcile_summary',
      payload: {
        stale_ticket_checked_count: staleTicketCheckedCount,
        stale_ticket_finalized_count: staleTicketFinalizedCount,
        stale_product_checked_count: staleProductCheckedCount,
        stale_product_finalized_count: staleProductFinalizedCount,
        ticket_fix_count: ticketFixCount,
        ticket_release_count: ticketReleaseCount,
        product_fix_count: productFixCount,
        product_release_count: productReleaseCount,
      },
      success: true,
      processedAt: nowIso,
    })

    return json(
      req,
      {
        status: 'ok',
        stale_ticket_checked_count: staleTicketCheckedCount,
        stale_ticket_finalized_count: staleTicketFinalizedCount,
        stale_product_checked_count: staleProductCheckedCount,
        stale_product_finalized_count: staleProductFinalizedCount,
        ticket_fix_count: ticketFixCount,
        ticket_release_count: ticketReleaseCount,
        product_fix_count: productFixCount,
        product_release_count: productReleaseCount,
      },
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return json(
      req,
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
