import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function normalizeSelectedTimeSlots(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String)
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)
      if (Array.isArray(parsed)) return parsed.map(String)
    } catch {
      return [value]
    }
  }
  return []
}

function normalizeAvailabilityTimeSlot(value: string): string | null {
  if (!value) return null
  if (value === 'all-day') return null
  return value
}

async function incrementSoldCapacityOptimistic(
  supabase: ReturnType<typeof createClient>,
  params: { ticketId: number; date: string; timeSlot: string | null; delta: number }
) {
  const { ticketId, date, timeSlot, delta } = params
  if (delta <= 0) return

  for (let attempt = 0; attempt < 3; attempt++) {
    const { data: row, error: readError } = await supabase
      .from('ticket_availabilities')
      .select('id, sold_capacity, version')
      .eq('ticket_id', ticketId)
      .eq('date', date)
      .eq('time_slot', timeSlot)
      .single()

    if (readError || !row) return

    const nextSold = (row.sold_capacity ?? 0) + delta
    const nextVersion = (row.version ?? 0) + 1

    const { data: updated, error: updateError } = await supabase
      .from('ticket_availabilities')
      .update({
        sold_capacity: nextSold,
        version: nextVersion,
        updated_at: new Date().toISOString(),
      })
      .eq('id', row.id)
      .eq('version', row.version)
      .select('id')

    if (!updateError && updated && updated.length > 0) return
  }
}

function mapMidtransStatus(transactionStatus: unknown, fraudStatus: unknown): string {
  const tx = String(transactionStatus || '').toLowerCase()
  const fraud = fraudStatus == null ? null : String(fraudStatus).toLowerCase()

  if (tx === 'capture') {
    if (fraud === 'accept' || fraud == null) return 'paid'
    return 'pending'
  }

  if (tx === 'settlement') return 'paid'
  if (tx === 'pending') return 'pending'
  if (tx === 'expire' || tx === 'expired') return 'expired'
  if (tx === 'refund' || tx === 'refunded' || tx === 'partial_refund') return 'refunded'
  if (tx === 'deny' || tx === 'cancel' || tx === 'failure') return 'failed'

  return 'pending'
}

// Generate unique ticket code
function generateTicketCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let result = 'TKT-'
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result + '-' + Date.now().toString(36).toUpperCase()
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

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Parse notification from Midtrans
    const notification = await req.json()
    const orderId = String(notification?.order_id || '')
    const transactionStatus = String(notification?.transaction_status || '')
    const fraudStatus = notification?.fraud_status ?? null

    const signatureKey = String(notification?.signature_key || '')
    const statusCode =
      typeof notification?.status_code === 'number'
        ? String(notification.status_code)
        : String(notification?.status_code || '')
    const grossAmount =
      typeof notification?.gross_amount === 'number'
        ? notification.gross_amount.toFixed(2)
        : String(notification?.gross_amount || '')

    // Verify signature
    const expectedSignature = await generateSignature(
      orderId,
      statusCode,
      grossAmount,
      midtransServerKey
    )

    if (!signatureKey || signatureKey !== expectedSignature) {
      return new Response(JSON.stringify({ error: 'Invalid signature' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Get order from database
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*, order_items(*)')
      .eq('order_number', orderId)
      .single()

    if (orderError || !order) {
      console.error('Order not found:', orderError)
      return new Response(JSON.stringify({ error: 'Order not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Determine order status based on transaction status
    const newStatus = mapMidtransStatus(transactionStatus, fraudStatus)

    // Update order status
    const { error: updateError } = await supabase
      .from('orders')
      .update({
        status: newStatus,
        payment_data: notification,
        updated_at: new Date().toISOString(),
      })
      .eq('id', order.id)

    if (updateError) {
      console.error('Failed to update order:', updateError)
    }

    // If payment is successful, create purchased tickets
    if (newStatus === 'paid') {
      const { data: orderItems, error: itemsError } = await supabase
        .from('order_items')
        .select('*')
        .eq('order_id', order.id)

      if (!itemsError && Array.isArray(orderItems)) {
        for (const item of orderItems) {
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
            const ticketCode = generateTicketCode()
            await supabase.from('purchased_tickets').insert({
              ticket_code: ticketCode,
              order_item_id: item.id,
              user_id: order.user_id,
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
    }

    return new Response(JSON.stringify({ status: 'ok' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Error processing notification:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

async function generateSignature(
  orderId: string,
  statusCode: string,
  grossAmount: string,
  serverKey: string
): Promise<string> {
  const data = orderId + statusCode + grossAmount + serverKey
  const msgBuffer = new TextEncoder().encode(data)
  const hashBuffer = await crypto.subtle.digest('SHA-512', msgBuffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}
