import { serve } from '../_shared/deps.ts'
import { corsHeaders, handleCors, json } from '../_shared/http.ts'
import { getSupabaseEnv } from '../_shared/env.ts'
import { createServiceClient } from '../_shared/supabase.ts'
import {
  ensureProductPaidSideEffects,
  issueTicketsIfNeeded,
  logWebhookEvent,
  releaseProductReservedStockIfNeeded,
  releaseTicketCapacityIfNeeded,
} from '../_shared/payment-effects.ts'

serve(async (req) => {
  const corsResponse = handleCors(req)
  if (corsResponse) return corsResponse

  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, { status: 405 })
  }

  try {
    const { url: supabaseUrl, serviceRoleKey: supabaseServiceKey } = getSupabaseEnv()
    const supabase = createServiceClient(supabaseUrl, supabaseServiceKey)
    const nowIso = new Date().toISOString()

    const { data: paidTicketOrders } = await supabase
      .from('orders')
      .select('id, user_id, order_number, status, tickets_issued_at, capacity_released_at')
      .eq('status', 'paid')

    let ticketFixCount = 0
    if (Array.isArray(paidTicketOrders)) {
      for (const order of paidTicketOrders) {
        if (order.tickets_issued_at) continue
        const { data: orderItems } = await supabase
          .from('order_items')
          .select('id, ticket_id, selected_date, selected_time_slots, quantity')
          .eq('order_id', order.id)

        if (Array.isArray(orderItems) && orderItems.length > 0) {
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
          ticketFixCount += 1
        }
      }
    }

    const { data: failedTicketOrders } = await supabase
      .from('orders')
      .select('id, user_id, order_number, status, tickets_issued_at, capacity_released_at')
      .in('status', ['expired', 'failed', 'refunded'])

    let ticketReleaseCount = 0
    if (Array.isArray(failedTicketOrders)) {
      for (const order of failedTicketOrders) {
        if (order.capacity_released_at) continue
        const { data: orderItems } = await supabase
          .from('order_items')
          .select('id, ticket_id, selected_date, selected_time_slots, quantity')
          .eq('order_id', order.id)

        if (Array.isArray(orderItems) && orderItems.length > 0) {
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
            orderItems: orderItems as Array<{ id: number; ticket_id: number; selected_date: string; selected_time_slots: unknown; quantity: number }>,
            nowIso,
          })
          ticketReleaseCount += 1
        }
      }
    }

    const { data: paidProductOrders } = await supabase
      .from('order_products')
      .select('id, order_number, status, payment_status, pickup_code, pickup_status, pickup_expires_at, total, stock_released_at')
      .eq('payment_status', 'paid')

    let productFixCount = 0
    if (Array.isArray(paidProductOrders)) {
      for (const order of paidProductOrders) {
        if (order.pickup_code) continue
        await ensureProductPaidSideEffects({
          supabase,
          order: order as unknown as {
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
          defaultStatus: String(order.status || 'processing'),
          shouldSetPaidAt: false,
        })
        productFixCount += 1
      }
    }

    const { data: failedProductOrders } = await supabase
      .from('order_products')
      .select('id, order_number, status, payment_status, pickup_code, pickup_status, pickup_expires_at, total, stock_released_at')
      .in('payment_status', ['failed', 'refunded'])
      .or('status.eq.expired')

    let productReleaseCount = 0
    if (Array.isArray(failedProductOrders)) {
      for (const order of failedProductOrders) {
        if (order.stock_released_at) continue
        await releaseProductReservedStockIfNeeded({
          supabase,
          order: order as unknown as {
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
        productReleaseCount += 1
      }
    }

    await logWebhookEvent(supabase, {
      orderNumber: 'reconcile',
      eventType: 'reconcile_summary',
      payload: {
        ticket_fix_count: ticketFixCount,
        ticket_release_count: ticketReleaseCount,
        product_fix_count: productFixCount,
        product_release_count: productReleaseCount,
      },
      success: true,
      processedAt: nowIso,
    })

    return json(
      {
        status: 'ok',
        ticket_fix_count: ticketFixCount,
        ticket_release_count: ticketReleaseCount,
        product_fix_count: productFixCount,
        product_release_count: productReleaseCount,
      },
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
