import { serve } from '../_shared/deps.ts'
import { getMidtransBasicAuthHeader, getSnapUrl } from '../_shared/midtrans.ts'
import { corsHeaders, handleCors } from '../_shared/http.ts'
import { getMidtransEnv, getPublicAppUrl, getSupabaseEnv } from '../_shared/env.ts'
import { createServiceClient, getUserFromAuthHeader } from '../_shared/supabase.ts'

interface OrderItem {
  ticketId: number
  ticketName: string
  price: number
  quantity: number
  date: string
  timeSlot: string
}

interface CreateTokenRequest {
  items: OrderItem[]
  customerName: string
  customerEmail: string
  customerPhone?: string
}

function toNumber(value: unknown, fallback: number) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : fallback
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : fallback
  }
  return fallback
}

serve(async (req) => {
  const corsResponse = handleCors(req)
  if (corsResponse) return corsResponse

  try {
    const { url: supabaseUrl, anonKey: supabaseAnonKey, serviceRoleKey: supabaseServiceKey } = getSupabaseEnv()
    const { serverKey: midtransServerKey, isProduction: midtransIsProduction } = getMidtransEnv()

    // Get the authorization header to verify user
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // CRITICAL FIX: Use anon key for JWT verification with Authorization header in client config
    // According to Supabase docs: Pass Authorization header to client, then call getUser() without params
    // This ensures proper JWT validation with RLS context
    
    // Create client with ANON KEY and Authorization header for JWT verification
    const { user, error: authError } = await getUserFromAuthHeader({
      url: supabaseUrl,
      anonKey: supabaseAnonKey,
      authHeader,
    })

    if (authError || !user?.id) {
      console.error('Auth error:', authError)
      const isExpired = authError?.message?.toLowerCase().includes('expired')
      return new Response(
        JSON.stringify({
          error: isExpired ? 'Session Expired' : 'Unauthorized',
          code: isExpired ? 'SESSION_EXPIRED' : 'INVALID_TOKEN',
          message: authError?.message || 'Invalid or expired session'
        }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Create separate client with SERVICE ROLE KEY for database operations
    const supabase = createServiceClient(supabaseUrl, supabaseServiceKey)

    const payload = (await req.json()) as CreateTokenRequest
    const items = payload.items

    if (!items || items.length === 0) {
      return new Response(JSON.stringify({ error: 'No items provided' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!payload.customerName?.trim() || !payload.customerEmail?.trim()) {
      return new Response(JSON.stringify({ error: 'Missing customer info' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Validate that sessions haven't ended yet
    // NEW LOGIC (Jan 2026): Allow booking as long as session hasn't ended
    // - Session duration: 2.5 hours (150 minutes)
    // - Customers can book even after session starts
    // - Booking closes when session END time is reached
    // Timezone: WIB (UTC+7) for Bandung business operations
    const SESSION_DURATION_MINUTES = 150 // 2.5 hours
    const now = new Date()

    // Calculate dynamic payment expiry based on earliest slot END time
    let minMinutesToSessionEnd = Infinity

    for (const item of items) {
      // Skip validation for all-day tickets
      if (item.timeSlot === 'all-day') continue

      // Parse booking date and time in WIB
      // item.date format: YYYY-MM-DD, item.timeSlot format: HH:MM
      const sessionStartTimeWIB = new Date(`${item.date}T${item.timeSlot}:00+07:00`)
      const sessionEndTimeWIB = new Date(sessionStartTimeWIB.getTime() + SESSION_DURATION_MINUTES * 60 * 1000)

      // NEW: Check if session has ended (not if it's about to start)
      if (now > sessionEndTimeWIB) {
        console.error(`Session has ended: ${item.date} ${item.timeSlot} WIB (ended at ${sessionEndTimeWIB.toISOString()})`)
        return new Response(
          JSON.stringify({
            error: 'Session has ended',
            details: `The selected session (${item.timeSlot} on ${item.date}) has already ended. Please select a different time slot.`
          }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        )
      }

      // Track earliest session end time for payment expiry calculation
      const minutesToSessionEnd = Math.floor((sessionEndTimeWIB.getTime() - now.getTime()) / (60 * 1000))
      minMinutesToSessionEnd = Math.min(minMinutesToSessionEnd, minutesToSessionEnd)
    }

    // Calculate dynamic payment expiry
    // Formula: Give user time to pay, but ensure payment completes before session ends
    // Max 20 minutes, or (time_to_session_end - 5min buffer), whichever is smaller
    const MAX_PAYMENT_MINUTES = 20
    const PAYMENT_BUFFER_MINUTES = 5
    let paymentExpiryMinutes = MAX_PAYMENT_MINUTES

    if (minMinutesToSessionEnd !== Infinity) {
      // For time-specific slots, limit payment window to before session ends
      paymentExpiryMinutes = Math.min(
        MAX_PAYMENT_MINUTES,
        Math.max(10, minMinutesToSessionEnd - PAYMENT_BUFFER_MINUTES) // Minimum 10 minutes to pay
      )
    }

    console.log(`Payment expiry set to ${paymentExpiryMinutes} minutes (session ends in ${minMinutesToSessionEnd} minutes)`)

    const userId = user.id

    const normalizedItems = items.map((item) => ({
      ticketId: toNumber(item.ticketId, 0),
      date: String(item.date || ''),
      timeSlot: String(item.timeSlot || ''),
      quantity: Math.max(1, Math.floor(toNumber(item.quantity, 1))),
    }))

    if (
      normalizedItems.some(
        (i) =>
          !i.ticketId ||
          !/^\d{4}-\d{2}-\d{2}$/.test(i.date) ||
          !(i.timeSlot === 'all-day' || /^\d{2}:\d{2}$/.test(i.timeSlot)) ||
          i.quantity <= 0
      )
    ) {
      return new Response(JSON.stringify({ error: 'Invalid items' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const ticketIds = Array.from(new Set(normalizedItems.map((i) => i.ticketId)))
    const { data: ticketRows, error: ticketsError } = await supabase
      .from('tickets')
      .select('id, name, price, is_active')
      .in('id', ticketIds)

    if (ticketsError || !Array.isArray(ticketRows)) {
      return new Response(JSON.stringify({ error: 'Failed to load tickets' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const ticketMap = new Map<number, { id: number; name: string; price: unknown; is_active: unknown }>()
    for (const row of ticketRows as Array<{ id: number; name: string; price: unknown; is_active: unknown }>) {
      ticketMap.set(Number(row.id), row)
    }

    const resolvedItems: Array<{ ticketId: number; ticketName: string; unitPrice: number; quantity: number; date: string; timeSlot: string }> = []
    for (const item of normalizedItems) {
      const ticket = ticketMap.get(item.ticketId)
      if (!ticket) {
        return new Response(JSON.stringify({ error: `Ticket not found: ${item.ticketId}` }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      if ((ticket as { is_active: unknown }).is_active === false) {
        return new Response(JSON.stringify({ error: `Ticket inactive: ${item.ticketId}` }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      const unitPrice = toNumber((ticket as { price: unknown }).price, 0)
      if (unitPrice <= 0) {
        return new Response(JSON.stringify({ error: `Invalid ticket price: ${item.ticketId}` }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      resolvedItems.push({
        ticketId: item.ticketId,
        ticketName: String((ticket as { name: unknown }).name || '').slice(0, 50),
        unitPrice,
        quantity: item.quantity,
        date: item.date,
        timeSlot: item.timeSlot,
      })
    }

    const totalAmount = resolvedItems.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0)

    const holdsBySlot = new Map<string, { ticketId: number; date: string; timeSlot: string | null; quantity: number }>()
    for (const item of resolvedItems) {
      const timeSlot = item.timeSlot === 'all-day' ? null : item.timeSlot
      const key = `${item.ticketId}|${item.date}|${timeSlot ?? ''}`
      const existing = holdsBySlot.get(key)
      if (existing) {
        existing.quantity += item.quantity
      } else {
        holdsBySlot.set(key, { ticketId: item.ticketId, date: item.date, timeSlot, quantity: item.quantity })
      }
    }

    const reservedHolds: Array<{ ticketId: number; date: string; timeSlot: string | null; quantity: number }> = []
    for (const hold of holdsBySlot.values()) {
      const { data: reserved, error: reserveError } = await supabase.rpc('reserve_ticket_capacity', {
        p_ticket_id: hold.ticketId,
        p_date: hold.date,
        p_time_slot: hold.timeSlot,
        p_quantity: hold.quantity,
      })

      if (reserveError || reserved !== true) {
        for (const previous of reservedHolds) {
          await supabase.rpc('release_ticket_capacity', {
            p_ticket_id: previous.ticketId,
            p_date: previous.date,
            p_time_slot: previous.timeSlot,
            p_quantity: previous.quantity,
          })
        }

        return new Response(JSON.stringify({ error: 'Slot sold out' }), {
          status: 409,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      reservedHolds.push(hold)
    }

    // Generate unique order number
    const orderNumber = `SPK-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`

    // Create order in database
    const expiresAt = new Date(Date.now() + paymentExpiryMinutes * 60 * 1000)

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        order_number: orderNumber,
        user_id: userId,
        total_amount: totalAmount,
        status: 'pending',
        expires_at: expiresAt.toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (orderError || !order) {
      console.error('Order creation error:', orderError)
      for (const hold of reservedHolds) {
        await supabase.rpc('release_ticket_capacity', {
          p_ticket_id: hold.ticketId,
          p_date: hold.date,
          p_time_slot: hold.timeSlot,
          p_quantity: hold.quantity,
        })
      }
      return new Response(JSON.stringify({ error: 'Failed to create order' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Create order items
    const orderItems = resolvedItems.map(item => ({
      order_id: order.id,
      ticket_id: item.ticketId,
      selected_date: item.date,
      selected_time_slots: JSON.stringify([item.timeSlot]),
      quantity: item.quantity,
      unit_price: item.unitPrice,
      subtotal: item.unitPrice * item.quantity,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }))

    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(orderItems)

    if (itemsError) {
      console.error('Order items creation error:', itemsError)
      // Rollback order
      await supabase.from('orders').delete().eq('id', order.id)
      for (const hold of reservedHolds) {
        await supabase.rpc('release_ticket_capacity', {
          p_ticket_id: hold.ticketId,
          p_date: hold.date,
          p_time_slot: hold.timeSlot,
          p_quantity: hold.quantity,
        })
      }
      return new Response(JSON.stringify({ error: 'Failed to create order items' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Create Midtrans Snap token
    const midtransUrl = getSnapUrl(midtransIsProduction)
    const authString = getMidtransBasicAuthHeader(midtransServerKey)

    const itemDetails = resolvedItems.map(item => ({
      id: `ticket-${item.ticketId}`,
      price: item.unitPrice,
      quantity: item.quantity,
      name: item.ticketName.substring(0, 50),
    }))

    const appUrl = getPublicAppUrl() ?? req.headers.get('origin') ?? ''
    if (!appUrl) {
      return new Response(JSON.stringify({ error: 'Missing app url' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const midtransPayload = {
      transaction_details: {
        order_id: orderNumber,
        gross_amount: totalAmount,
      },
      item_details: itemDetails,
      customer_details: {
        first_name: payload.customerName,
        email: payload.customerEmail,
        phone: payload.customerPhone || '',
      },
      custom_expiry: {
        expiry_duration: paymentExpiryMinutes,
        unit: 'minute',
      },
      callbacks: {
        finish: `${appUrl}/booking-success?order_id=${orderNumber}`,
      },
    }

    const midtransResponse = await fetch(midtransUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authString,
      },
      body: JSON.stringify(midtransPayload),
    })

    const midtransData = await midtransResponse.json()

    if (!midtransResponse.ok) {
      console.error('Midtrans error:', midtransData)
      // Rollback
      await supabase.from('order_items').delete().eq('order_id', order.id)
      await supabase.from('orders').delete().eq('id', order.id)
      for (const hold of reservedHolds) {
        await supabase.rpc('release_ticket_capacity', {
          p_ticket_id: hold.ticketId,
          p_date: hold.date,
          p_time_slot: hold.timeSlot,
          p_quantity: hold.quantity,
        })
      }
      return new Response(JSON.stringify({ error: 'Failed to create payment token', details: midtransData }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Update order with payment data
    await supabase
      .from('orders')
      .update({
        payment_id: midtransData.token,
        payment_url: midtransData.redirect_url,
        updated_at: new Date().toISOString(),
      })
      .eq('id', order.id)

    return new Response(
      JSON.stringify({
        token: midtransData.token,
        redirect_url: midtransData.redirect_url,
        order_number: orderNumber,
        order_id: order.id,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    console.error('Error:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
