import { serve } from '../_shared/deps.ts'
import { getMidtransBasicAuthHeader, getSnapUrl } from '../_shared/midtrans.ts'
import { handleCors, json, jsonError, jsonErrorWithDetails } from '../_shared/http.ts'
import { getMidtransEnv, getPublicAppUrl } from '../_shared/env.ts'
import { createServiceClient } from '../_shared/supabase.ts'
import { toNumber } from '../_shared/payment-effects.ts'
import { normalizeBookingTimeSlot, normalizeTicketTimeSlots } from '../_shared/tickets.ts'
import { requireAuthenticatedRequest } from '../_shared/auth.ts'

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

type ReservedTicketHold = {
  ticketId: number
  date: string
  timeSlot: string | null
  quantity: number
}

const DEFAULT_MAX_TICKETS_PER_BOOKING = 5
const DEFAULT_BOOKING_WINDOW_DAYS = 30

function extractDateOnly(value: unknown): string {
  return String(value ?? '').split('T')[0].split(' ')[0]
}

function formatWibDate(date: Date): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)

  const year = parts.find((part) => part.type === 'year')?.value ?? '1970'
  const month = parts.find((part) => part.type === 'month')?.value ?? '01'
  const day = parts.find((part) => part.type === 'day')?.value ?? '01'
  return `${year}-${month}-${day}`
}

function addDaysWib(dateString: string, days: number): string {
  const date = new Date(`${dateString}T00:00:00+07:00`)
  date.setUTCDate(date.getUTCDate() + days)
  return formatWibDate(date)
}

async function releaseReservedTicketHolds(params: {
  supabase: ReturnType<typeof createServiceClient>
  holds: ReservedTicketHold[]
}) {
  for (const hold of params.holds) {
    const { error } = await params.supabase.rpc('release_ticket_capacity', {
      p_ticket_id: hold.ticketId,
      p_date: hold.date,
      p_time_slot: hold.timeSlot,
      p_quantity: hold.quantity,
    })

    if (error) {
      console.error('[create-midtrans-token] Failed to release reserved hold:', error)
    }
  }
}

async function rollbackCreatedTicketOrder(params: {
  supabase: ReturnType<typeof createServiceClient>
  orderId: number
  holds: ReservedTicketHold[]
}) {
  await params.supabase.from('order_items').delete().eq('order_id', params.orderId)
  await params.supabase.from('orders').delete().eq('id', params.orderId)
  await releaseReservedTicketHolds({ supabase: params.supabase, holds: params.holds })
}

serve(async (req) => {
  const corsResponse = handleCors(req)
  if (corsResponse) return corsResponse

  try {
    const authResult = await requireAuthenticatedRequest(req)
    if (authResult.response) return authResult.response

    const auth = authResult.context!
    const { serverKey: midtransServerKey, isProduction: midtransIsProduction } = getMidtransEnv()

    // Create separate client with SERVICE ROLE KEY for database operations
    const supabase = createServiceClient(auth.supabaseEnv.url, auth.supabaseEnv.serviceRoleKey)

    const payload = (await req.json()) as CreateTokenRequest
    const items = payload.items

    if (!items || items.length === 0) {
      return jsonError(req, 400, 'No items provided')
    }

    if (!payload.customerName?.trim() || !payload.customerEmail?.trim()) {
      return jsonError(req, 400, 'Missing customer info')
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
      const normalizedTimeSlot = normalizeBookingTimeSlot(item.timeSlot)

      // Skip validation for all-day tickets
      if (normalizedTimeSlot === 'all-day') continue

      // Parse booking date and time in WIB
      // item.date format: YYYY-MM-DD, item.timeSlot format: HH:MM
      const sessionStartTimeWIB = new Date(`${item.date}T${normalizedTimeSlot}:00+07:00`)
      const sessionEndTimeWIB = new Date(sessionStartTimeWIB.getTime() + SESSION_DURATION_MINUTES * 60 * 1000)

      // NEW: Check if session has ended (not if it's about to start)
      if (now > sessionEndTimeWIB) {
        console.error(`Session has ended: ${item.date} ${normalizedTimeSlot} WIB (ended at ${sessionEndTimeWIB.toISOString()})`)
        return jsonErrorWithDetails(req, 400, {
          error: 'Session has ended',
          code: 'SESSION_ENDED',
          details: `The selected session (${normalizedTimeSlot} on ${item.date}) has already ended. Please select a different time slot.`,
        })
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

    const userId = auth.user.id

    const normalizedItems = items.map((item) => ({
      ticketId: toNumber(item.ticketId, 0),
      date: String(item.date || ''),
      timeSlot: normalizeBookingTimeSlot(item.timeSlot),
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
      return jsonError(req, 400, 'Invalid items')
    }

    const ticketIds = Array.from(new Set(normalizedItems.map((i) => i.ticketId)))
    const { data: ticketRows, error: ticketsError } = await supabase
      .from('tickets')
      .select('id, name, price, is_active, available_from, available_until, time_slots')
      .in('id', ticketIds)

    if (ticketsError || !Array.isArray(ticketRows)) {
      return jsonError(req, 500, 'Failed to load tickets')
    }

    const { data: settingsRows, error: settingsError } = await supabase
      .from('ticket_booking_settings')
      .select('ticket_id, max_tickets_per_booking, booking_window_days')
      .in('ticket_id', ticketIds)

    if (settingsError || !Array.isArray(settingsRows)) {
      return jsonError(req, 500, 'Failed to load ticket booking settings')
    }

    const ticketMap = new Map<number, {
      id: number
      name: string
      price: unknown
      is_active: unknown
      available_from: unknown
      available_until: unknown
      time_slots: unknown
    }>()
    for (const row of ticketRows as Array<{
      id: number
      name: string
      price: unknown
      is_active: unknown
      available_from: unknown
      available_until: unknown
      time_slots: unknown
    }>) {
      ticketMap.set(Number(row.id), row)
    }

    const settingsMap = new Map<number, { max_tickets_per_booking: number; booking_window_days: number }>()
    for (const row of settingsRows as Array<{ ticket_id: number | string; max_tickets_per_booking: unknown; booking_window_days: unknown }>) {
      settingsMap.set(Number(row.ticket_id), {
        max_tickets_per_booking: Math.max(
          1,
          Math.floor(toNumber(row.max_tickets_per_booking, DEFAULT_MAX_TICKETS_PER_BOOKING))
        ),
        booking_window_days: Math.max(
          1,
          Math.floor(toNumber(row.booking_window_days, DEFAULT_BOOKING_WINDOW_DAYS))
        ),
      })
    }

    const todayWib = formatWibDate(now)
    const quantitiesByTicket = new Map<number, number>()

    const resolvedItems: Array<{ ticketId: number; ticketName: string; unitPrice: number; quantity: number; date: string; timeSlot: string }> = []
    for (const item of normalizedItems) {
      const ticket = ticketMap.get(item.ticketId)
      if (!ticket) {
        return jsonError(req, 400, `Ticket not found: ${item.ticketId}`)
      }
      if ((ticket as { is_active: unknown }).is_active === false) {
        return jsonError(req, 400, `Ticket inactive: ${item.ticketId}`)
      }
      const ticketSettings = settingsMap.get(item.ticketId) ?? {
        max_tickets_per_booking: DEFAULT_MAX_TICKETS_PER_BOOKING,
        booking_window_days: DEFAULT_BOOKING_WINDOW_DAYS,
      }
      const availableFrom = extractDateOnly((ticket as { available_from: unknown }).available_from)
      const availableUntil = extractDateOnly((ticket as { available_until: unknown }).available_until)
      const maxBookableDate = addDaysWib(todayWib, ticketSettings.booking_window_days)
      if (item.date < todayWib || item.date > maxBookableDate) {
        return jsonError(req, 400, `Date outside booking window: ${item.date}`)
      }
      if ((availableFrom && item.date < availableFrom) || (availableUntil && item.date > availableUntil)) {
        return jsonError(req, 400, `Date unavailable for ticket: ${item.date}`)
      }
      if (item.timeSlot !== 'all-day') {
        const allowedSlots = normalizeTicketTimeSlots((ticket as { time_slots: unknown }).time_slots)
        if (allowedSlots.length > 0 && !allowedSlots.some((slot) => slot.slice(0, 5) === item.timeSlot)) {
          return jsonError(req, 400, `Invalid time slot for ticket: ${item.timeSlot}`)
        }
      }
      const unitPrice = toNumber((ticket as { price: unknown }).price, 0)
      if (unitPrice <= 0) {
        return jsonError(req, 400, `Invalid ticket price: ${item.ticketId}`)
      }
      quantitiesByTicket.set(item.ticketId, (quantitiesByTicket.get(item.ticketId) ?? 0) + item.quantity)
      resolvedItems.push({
        ticketId: item.ticketId,
        ticketName: String((ticket as { name: unknown }).name || '').slice(0, 50),
        unitPrice,
        quantity: item.quantity,
        date: item.date,
        timeSlot: item.timeSlot,
      })
    }

    for (const [ticketId, totalQuantity] of quantitiesByTicket.entries()) {
      const ticketSettings = settingsMap.get(ticketId) ?? {
        max_tickets_per_booking: DEFAULT_MAX_TICKETS_PER_BOOKING,
        booking_window_days: DEFAULT_BOOKING_WINDOW_DAYS,
      }
      if (totalQuantity > ticketSettings.max_tickets_per_booking) {
        return jsonError(req, 400, `Maximum ${ticketSettings.max_tickets_per_booking} tickets per booking`)
      }
    }

    const appUrl = getPublicAppUrl() ?? req.headers.get('origin') ?? ''
    if (!appUrl) {
      return jsonError(req, 500, 'Missing app url')
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

    const reservedHolds: ReservedTicketHold[] = []
    for (const hold of holdsBySlot.values()) {
      const { data: reserved, error: reserveError } = await supabase.rpc('reserve_ticket_capacity', {
        p_ticket_id: hold.ticketId,
        p_date: hold.date,
        p_time_slot: hold.timeSlot,
        p_quantity: hold.quantity,
      })

      if (reserveError) {
        await releaseReservedTicketHolds({ supabase, holds: reservedHolds })

        console.error('Ticket capacity reservation error:', reserveError)
        return jsonErrorWithDetails(req, 500, {
          error: 'Failed to reserve ticket capacity',
          code: 'RESERVE_TICKET_CAPACITY_FAILED',
          details: reserveError.message,
        })
      }

      if (reserved !== true) {
        await releaseReservedTicketHolds({ supabase, holds: reservedHolds })

        return jsonError(req, 409, 'Slot sold out')
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
      await releaseReservedTicketHolds({ supabase, holds: reservedHolds })
      return jsonError(req, 500, 'Failed to create order')
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
      await rollbackCreatedTicketOrder({ supabase, orderId: order.id, holds: reservedHolds })
      return jsonError(req, 500, 'Failed to create order items')
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
      await rollbackCreatedTicketOrder({ supabase, orderId: order.id, holds: reservedHolds })
      return jsonErrorWithDetails(req, 500, {
        error: 'Failed to create payment token',
        code: 'MIDTRANS_TOKEN_FAILED',
        details: midtransData,
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

    return json(req, {
      token: midtransData.token,
      redirect_url: midtransData.redirect_url,
      order_number: orderNumber,
      order_id: order.id,
    })
  } catch (error) {
    console.error('Error:', error)
    return jsonError(req, 500, 'Internal server error')
  }
})
