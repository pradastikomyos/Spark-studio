import { serve } from '../_shared/deps.ts'
import { corsHeaders, handleCors } from '../_shared/http.ts'
import { getMidtransEnv, getSupabaseEnv } from '../_shared/env.ts'
import { createServiceClient, getUserFromAuthHeader } from '../_shared/supabase.ts'
import { getMidtransBasicAuthHeader, getStatusBaseUrl } from '../_shared/midtrans.ts'
import {
  incrementSoldCapacityOptimistic,
  mapMidtransStatus,
  normalizeAvailabilityTimeSlot,
  normalizeSelectedTimeSlots,
} from '../_shared/tickets.ts'

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
      .select('*, order_items(*)')
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

    const { data: updatedOrder, error: updateError } = await supabase
      .from('orders')
      .update({
        status: newStatus,
        payment_data: statusData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', order.id)
      .select('*, order_items(*)')
      .single()

    if (updateError || !updatedOrder) {
      return new Response(JSON.stringify({ error: 'Failed to update order' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (newStatus === 'paid' && Array.isArray(updatedOrder.order_items)) {
      for (const item of updatedOrder.order_items) {
        const { count: existingCount } = await supabase
          .from('purchased_tickets')
          .select('id', { count: 'exact', head: true })
          .eq('order_item_id', item.id)

        const existing = existingCount ?? 0
        const needed = Math.max(0, (item.quantity ?? 0) - existing)
        if (needed <= 0) continue

        const slots = normalizeSelectedTimeSlots(item.selected_time_slots)
        const firstSlot = slots[0]
        const timeSlotForTicket =
          firstSlot && firstSlot !== 'all-day' && /^\d{2}:\d{2}/.test(firstSlot) ? firstSlot : null

        for (let i = 0; i < needed; i++) {
          const ticketCode = `TKT-${crypto.randomUUID().replace(/-/g, '').slice(0, 12).toUpperCase()}`
          await supabase.from('purchased_tickets').insert({
            ticket_code: ticketCode,
            order_item_id: item.id,
            user_id: updatedOrder.user_id,
            ticket_id: item.ticket_id,
            valid_date: item.selected_date,
            time_slot: timeSlotForTicket,
            status: 'active',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
        }

        for (const slot of slots) {
          await incrementSoldCapacityOptimistic(supabase, {
            ticketId: item.ticket_id,
            date: item.selected_date,
            timeSlot: normalizeAvailabilityTimeSlot(String(slot)),
            delta: needed,
          })
        }
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
