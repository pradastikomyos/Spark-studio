import { serve } from '../_shared/deps.ts'
import { corsHeaders, handleCors } from '../_shared/http.ts'
import { getMidtransEnv, getSupabaseEnv } from '../_shared/env.ts'
import { createServiceClient, getUserFromAuthHeader } from '../_shared/supabase.ts'
import { getMidtransBasicAuthHeader, getStatusBaseUrl } from '../_shared/midtrans.ts'
import { mapMidtransStatus } from '../_shared/tickets.ts'
import { issueTicketsIfNeeded, releaseTicketCapacityIfNeeded } from '../_shared/payment-effects.ts'

serve(async (req) => {
  const corsResponse = handleCors(req)
  if (corsResponse) return corsResponse

  try {
    const { url: supabaseUrl, anonKey: supabaseAnonKey, serviceRoleKey: supabaseServiceKey } = getSupabaseEnv()
    const { serverKey: midtransServerKey, isProduction: midtransIsProduction } = getMidtransEnv()

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { user, error: authError } = await getUserFromAuthHeader({
      url: supabaseUrl,
      anonKey: supabaseAnonKey,
      authHeader,
    })

    if (authError || !user?.id) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Use service role key for database operations
    const supabase = createServiceClient(supabaseUrl, supabaseServiceKey)

    const body = await req.json().catch(() => ({}))
    const orderNumber = String(body?.order_number || '')
    if (!orderNumber) {
      return new Response(JSON.stringify({ error: 'Missing order_number' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, user_id, order_number, status, expires_at, tickets_issued_at, capacity_released_at')
      .eq('order_number', orderNumber)
      .single()

    if (orderError || !order) {
      return new Response(JSON.stringify({ error: 'Order not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (order.user_id !== user.id) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
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
      return new Response(JSON.stringify({ error: 'Failed to fetch Midtrans status', details: statusData }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
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
      return new Response(JSON.stringify({ error: 'Failed to update order' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
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

    return new Response(JSON.stringify({ status: 'ok', order: updatedOrder }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch {
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
