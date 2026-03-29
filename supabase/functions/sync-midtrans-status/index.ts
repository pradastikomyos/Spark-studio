import { serve } from '../_shared/deps.ts'
import { handleCors, json, jsonError } from '../_shared/http.ts'
import { getMidtransEnv } from '../_shared/env.ts'
import { createServiceClient } from '../_shared/supabase.ts'
import { getMidtransBasicAuthHeader, getStatusBaseUrl } from '../_shared/midtrans.ts'
import { mapMidtransStatus } from '../_shared/tickets.ts'
import { issueTicketsIfNeeded, releaseTicketCapacityIfNeeded } from '../_shared/payment-effects.ts'
import { requireAuthenticatedRequest } from '../_shared/auth.ts'

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

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, user_id, order_number, status, expires_at, tickets_issued_at, capacity_released_at')
      .eq('order_number', orderNumber)
      .single()

    if (orderError || !order) {
      return jsonError(req, 404, 'Order not found')
    }

    if (order.user_id !== auth.user.id) {
      return jsonError(req, 403, 'Forbidden')
    }

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

    const newStatus = mapMidtransStatus(statusData?.transaction_status, statusData?.fraud_status)
    const nowIso = new Date().toISOString()

    const { data: updatedOrder, error: updateError } = await supabase
      .from('orders')
      .update({
        status: newStatus,
        payment_data: statusData,
        updated_at: nowIso,
      })
      .eq('id', order.id)
      .select('id, user_id, order_number, status, expires_at, updated_at, tickets_issued_at, capacity_released_at')
      .single()

    if (updateError || !updatedOrder) {
      return jsonError(req, 500, 'Failed to update order')
    }

    if (newStatus === 'paid') {
      const { data: orderItems } = await supabase
        .from('order_items')
        .select('id, ticket_id, selected_date, selected_time_slots, quantity')
        .eq('order_id', order.id)

      if (Array.isArray(orderItems)) {
        await issueTicketsIfNeeded({
          supabase,
          order: updatedOrder as unknown as {
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
      }
    }

    if (newStatus === 'expired' || newStatus === 'failed' || newStatus === 'refunded') {
      const { data: orderItems } = await supabase
        .from('order_items')
        .select('id, ticket_id, selected_date, selected_time_slots, quantity')
        .eq('order_id', order.id)

      if (Array.isArray(orderItems)) {
        await releaseTicketCapacityIfNeeded({
          supabase,
          order: updatedOrder as unknown as {
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
      }
    }

    return json(req, { status: 'ok', order: updatedOrder })
  } catch {
    return jsonError(req, 500, 'Internal server error')
  }
})
