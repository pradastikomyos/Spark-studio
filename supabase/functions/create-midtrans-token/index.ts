import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

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

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const midtransServerKey = Deno.env.get('MIDTRANS_SERVER_KEY')!
    const midtransIsProduction = Deno.env.get('MIDTRANS_IS_PRODUCTION') === 'true'

    // Get the authorization header to verify user
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Create Supabase client with service role key for database operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Verify JWT token manually using service role client
    // This is the correct way when verify_jwt is disabled
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

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

    // supabase client already created above for auth verification

    // Parse request body
    const { items, customerName, customerEmail, customerPhone }: CreateTokenRequest = await req.json()

    if (!items || items.length === 0) {
      return new Response(JSON.stringify({ error: 'No items provided' }), {
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

    // Calculate total amount
    const totalAmount = items.reduce((sum, item) => sum + (item.price * item.quantity), 0)

    // Generate unique order number
    const orderNumber = `SPK-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`

    // Create order in database
    const expiresAt = new Date()
    expiresAt.setHours(expiresAt.getHours() + 24) // 24 hours expiry

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
      return new Response(JSON.stringify({ error: 'Failed to create order' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Create order items
    const orderItems = items.map(item => ({
      order_id: order.id,
      ticket_id: item.ticketId,
      selected_date: item.date,
      selected_time_slots: JSON.stringify([item.timeSlot]),
      quantity: item.quantity,
      unit_price: item.price,
      subtotal: item.price * item.quantity,
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
      return new Response(JSON.stringify({ error: 'Failed to create order items' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Create Midtrans Snap token
    const midtransUrl = midtransIsProduction
      ? 'https://app.midtrans.com/snap/v1/transactions'
      : 'https://app.sandbox.midtrans.com/snap/v1/transactions'

    const authString = btoa(`${midtransServerKey}:`)

    const itemDetails = items.map(item => ({
      id: `ticket-${item.ticketId}`,
      price: item.price,
      quantity: item.quantity,
      name: item.ticketName.substring(0, 50), // Max 50 chars
    }))

    const midtransPayload = {
      transaction_details: {
        order_id: orderNumber,
        gross_amount: totalAmount,
      },
      item_details: itemDetails,
      customer_details: {
        first_name: customerName,
        email: customerEmail,
        phone: customerPhone || '',
      },
      custom_expiry: {
        expiry_duration: paymentExpiryMinutes,
        unit: 'minute',
      },
      callbacks: {
        finish: `${req.headers.get('origin')}/booking-success?order_id=${orderNumber}`,
      },
    }

    const midtransResponse = await fetch(midtransUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${authString}`,
      },
      body: JSON.stringify(midtransPayload),
    })

    const midtransData = await midtransResponse.json()

    if (!midtransResponse.ok) {
      console.error('Midtrans error:', midtransData)
      // Rollback
      await supabase.from('order_items').delete().eq('order_id', order.id)
      await supabase.from('orders').delete().eq('id', order.id)
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
