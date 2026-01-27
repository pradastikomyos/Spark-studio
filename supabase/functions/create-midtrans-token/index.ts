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
      return new Response(JSON.stringify({ error: 'Invalid token', details: authError?.message }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
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

    // Validate that time slots are not in the past (with 30-min buffer)
    // Industry standard: booking systems require buffer time for preparation
    // Timezone: WIB (UTC+7) for Bandung business operations
    const BOOKING_BUFFER_MINUTES = 30
    const WIB_OFFSET_HOURS = 7
    
    // Get current time in WIB
    const nowUTC = new Date()
    const nowWIB = new Date(nowUTC.getTime() + WIB_OFFSET_HOURS * 60 * 60 * 1000)
    
    // Calculate dynamic payment expiry based on earliest slot
    let minMinutesToSlot = Infinity
    
    for (const item of items) {
      // Skip validation for all-day tickets
      if (item.timeSlot === 'all-day') continue

      // Parse booking date and time in WIB
      // item.date format: YYYY-MM-DD, item.timeSlot format: HH:MM
      const bookingDateTimeWIB = new Date(`${item.date}T${item.timeSlot}:00+07:00`)
      
      // Add 30-minute buffer: slot must be at least 30 minutes in the future
      const bufferTimeWIB = new Date(nowWIB.getTime() + BOOKING_BUFFER_MINUTES * 60 * 1000)
      
      if (bookingDateTimeWIB < bufferTimeWIB) {
        const isPast = bookingDateTimeWIB < nowWIB
        console.error(`${isPast ? 'Past' : 'Too soon'} time slot detected: ${item.date} ${item.timeSlot} WIB (Current: ${nowWIB.toISOString()})`)
        return new Response(
          JSON.stringify({ 
            error: isPast 
              ? 'Cannot book a time slot that has already passed'
              : 'Time slot must be at least 30 minutes in the future',
            details: isPast
              ? `The selected time slot (${item.timeSlot} on ${item.date}) is no longer available.`
              : `Please select a time slot at least 30 minutes from now. Selected: ${item.timeSlot} on ${item.date}`
          }), 
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        )
      }
      
      // Track earliest slot for payment expiry calculation
      const minutesToSlot = Math.floor((bookingDateTimeWIB.getTime() - nowWIB.getTime()) / (60 * 1000))
      minMinutesToSlot = Math.min(minMinutesToSlot, minutesToSlot)
    }
    
    // Calculate dynamic payment expiry
    // Formula: Give user time to pay, but ensure payment completes before slot starts
    // Max 20 minutes, or (time_to_slot - 5min buffer), whichever is smaller
    const MAX_PAYMENT_MINUTES = 20
    const PAYMENT_BUFFER_MINUTES = 5
    let paymentExpiryMinutes = MAX_PAYMENT_MINUTES
    
    if (minMinutesToSlot !== Infinity) {
      // For time-specific slots, limit payment window
      paymentExpiryMinutes = Math.min(
        MAX_PAYMENT_MINUTES,
        Math.max(10, minMinutesToSlot - PAYMENT_BUFFER_MINUTES) // Minimum 10 minutes to pay
      )
    }
    
    console.log(`Payment expiry set to ${paymentExpiryMinutes} minutes (slot in ${minMinutesToSlot} minutes)`)

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
