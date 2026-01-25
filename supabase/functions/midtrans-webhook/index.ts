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

async function logWebhook(
  supabase: ReturnType<typeof createClient>,
  params: {
    orderNumber: string
    eventType: string
    payload: unknown
    success: boolean
    errorMessage?: string | null
    processedAt: string
  }
) {
  try {
    await supabase.from('webhook_logs').insert({
      order_number: params.orderNumber || null,
      event_type: params.eventType,
      payload: params.payload ?? null,
      processed_at: params.processedAt,
      success: params.success,
      error_message: params.errorMessage ?? null,
    })
  } catch {
    return
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  let supabase: ReturnType<typeof createClient> | null = null
  let orderId = ''
  let notification: unknown = null

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const midtransServerKey = Deno.env.get('MIDTRANS_SERVER_KEY')!

    supabase = createClient(supabaseUrl, supabaseServiceKey)

    notification = await req.json()
    orderId = String((notification as { order_id?: string })?.order_id || '')
    const transactionStatus = String(notification?.transaction_status || '')
    const fraudStatus = notification?.fraud_status ?? null
    const nowIso = new Date().toISOString()

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
      await logWebhook(supabase, {
        orderNumber: orderId,
        eventType: 'invalid_signature',
        payload: notification,
        success: false,
        errorMessage: 'Invalid signature',
        processedAt: nowIso,
      })
      return new Response(JSON.stringify({ error: 'Invalid signature' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const newStatus = mapMidtransStatus(transactionStatus, fraudStatus)

    const { data: productOrder } = await supabase
      .from('order_products')
      .select('id, status, payment_status, pickup_code, pickup_status')
      .eq('order_number', orderId)
      .single()

    if (productOrder) {
      const currentPaymentStatus = String((productOrder as { payment_status?: string }).payment_status || '').toLowerCase()
      const currentStatus = String((productOrder as { status?: string }).status || '').toLowerCase()
      const currentPickupStatus = String((productOrder as { pickup_status?: string | null }).pickup_status || '').toLowerCase()

      const paymentStatus =
        newStatus === 'paid'
          ? 'paid'
          : newStatus === 'refunded'
            ? 'refunded'
            : newStatus === 'failed' || newStatus === 'expired'
              ? 'failed'
              : 'unpaid'

      const status =
        newStatus === 'paid'
          ? 'processing'
          : newStatus === 'expired'
            ? 'expired'
            : newStatus === 'failed'
              ? 'cancelled'
              : currentStatus || 'awaiting_payment'

      if (newStatus === 'paid' && currentPaymentStatus !== 'paid') {
        // Validate stock availability before creating order
        // Defense against admin stock adjustments during payment window
        const { data: orderItems } = await supabase
          .from('order_product_items')
          .select('product_variant_id, quantity')
          .eq('order_product_id', (productOrder as { id: number }).id)

        let stockValidationFailed = false
        const stockIssues: string[] = []

        if (Array.isArray(orderItems)) {
          for (const row of orderItems) {
            const variantId = Number((row as { product_variant_id: number | string }).product_variant_id)
            const qty = Math.max(1, Math.floor(Number((row as { quantity: number | string }).quantity)))

            const { data: variant } = await supabase
              .from('product_variants')
              .select('stock, reserved_stock')
              .eq('id', variantId)
              .single()

            if (variant) {
              const currentStock = (variant as { stock?: number }).stock ?? 0
              const currentReserved = (variant as { reserved_stock?: number }).reserved_stock ?? 0
              
              // Check if there's still enough reserved stock for this order
              if (currentReserved < qty) {
                stockValidationFailed = true
                stockIssues.push(`Variant ${variantId}: reserved=${currentReserved}, needed=${qty}`)
              }
              
              // Check if actual stock is sufficient
              if (currentStock < qty) {
                stockValidationFailed = true
                stockIssues.push(`Variant ${variantId}: stock=${currentStock}, needed=${qty}`)
              }
            }
          }
        }

        const { data: pickupCodeRow } = await supabase.rpc('generate_pickup_code')
        const pickupCode = String(pickupCodeRow || '')
        const pickupExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

        // If stock validation failed, flag order for manual review
        const finalStatus = stockValidationFailed ? 'requires_review' : status
        const finalPickupStatus = stockValidationFailed ? 'pending_review' : 'pending_pickup'

        await supabase
          .from('order_products')
          .update({
            status: finalStatus,
            payment_status: paymentStatus,
            paid_at: nowIso,
            pickup_code: pickupCode,
            pickup_status: finalPickupStatus,
            pickup_expires_at: pickupExpiresAt,
            updated_at: nowIso,
          })
          .eq('id', (productOrder as { id: number }).id)

        // Log stock validation issues for admin review
        if (stockValidationFailed) {
          console.warn(`[WEBHOOK] Stock validation failed for order ${orderId}: ${stockIssues.join(', ')}`)
          await logWebhook(supabase, {
            orderNumber: orderId,
            eventType: 'stock_validation_failed_requires_review',
            payload: {
              order_id: orderId,
              stock_issues: stockIssues,
              payment_completed_at: nowIso,
            },
            success: true,
            errorMessage: `Stock insufficient: ${stockIssues.join('; ')}`,
            processedAt: nowIso,
          })
        }
      } else {
        const updateFields: Record<string, unknown> = {
          status,
          payment_status: paymentStatus,
          updated_at: nowIso,
        }
        if (newStatus === 'expired') updateFields.expired_at = nowIso

        await supabase
          .from('order_products')
          .update(updateFields)
          .eq('id', (productOrder as { id: number }).id)
      }

      const shouldReleaseReserve =
        (newStatus === 'expired' || newStatus === 'failed' || newStatus === 'refunded') &&
        currentPaymentStatus !== 'paid' &&
        currentStatus !== 'cancelled' &&
        currentStatus !== 'expired' &&
        currentPickupStatus !== 'completed'

      if (shouldReleaseReserve) {
        const { data: orderItems } = await supabase
          .from('order_product_items')
          .select('product_variant_id, quantity')
          .eq('order_product_id', (productOrder as { id: number }).id)

        if (Array.isArray(orderItems)) {
          for (const row of orderItems) {
            const variantId = Number((row as { product_variant_id: number | string }).product_variant_id)
            const qty = Math.max(1, Math.floor(Number((row as { quantity: number | string }).quantity)))

            const { data: variant } = await supabase
              .from('product_variants')
              .select('reserved_stock')
              .eq('id', variantId)
              .single()

            const currentReserved = (variant as { reserved_stock?: number } | null)?.reserved_stock ?? 0
            await supabase
              .from('product_variants')
              .update({ reserved_stock: Math.max(0, currentReserved - qty), updated_at: nowIso })
              .eq('id', variantId)
          }
        }
      }

      await logWebhook(supabase, {
        orderNumber: orderId,
        eventType: 'product_order_processed',
        payload: notification,
        success: true,
        processedAt: nowIso,
      })

      return new Response(JSON.stringify({ status: 'ok' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*, order_items(*)')
      .eq('order_number', orderId)
      .single()

    if (orderError || !order) {
      console.error('Order not found:', orderError)
      await logWebhook(supabase, {
        orderNumber: orderId,
        eventType: 'order_not_found',
        payload: notification,
        success: false,
        errorMessage: orderError?.message ?? 'Order not found',
        processedAt: nowIso,
      })
      return new Response(JSON.stringify({ error: 'Order not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { error: updateError } = await supabase
      .from('orders')
      .update({
        status: newStatus,
        payment_data: notification,
        updated_at: nowIso,
      })
      .eq('id', order.id)

    if (updateError) {
      console.error('Failed to update order:', updateError)
    }

    if (newStatus === 'paid') {
      const { data: orderItems, error: itemsError } = await supabase.from('order_items').select('*').eq('order_id', order.id)

      if (!itemsError && Array.isArray(orderItems)) {
        // Timezone: WIB (UTC+7) for Bandung business operations
        const WIB_OFFSET_HOURS = 7
        const nowUTC = new Date()
        const nowWIB = new Date(nowUTC.getTime() + WIB_OFFSET_HOURS * 60 * 60 * 1000)
        
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
          let timeSlotForTicket = firstSlot && firstSlot !== 'all-day' && /^\d{2}:\d{2}/.test(firstSlot) ? firstSlot : null
          
          // Validate time slot is still valid (graceful degradation)
          let slotExpired = false
          if (timeSlotForTicket && item.selected_date) {
            const bookingDateTimeWIB = new Date(`${item.selected_date}T${timeSlotForTicket}:00+07:00`)
            if (bookingDateTimeWIB < nowWIB) {
              slotExpired = true
              console.warn(`[WEBHOOK] Time slot expired for order ${orderId}: ${item.selected_date} ${timeSlotForTicket}. Converting to all-day access.`)
              
              // Graceful degradation: Convert to all-day access
              // Business keeps revenue, customer can still use studio today
              timeSlotForTicket = null
              
              // Log for audit trail
              await logWebhook(supabase, {
                orderNumber: orderId,
                eventType: 'slot_expired_converted_to_allday',
                payload: {
                  original_slot: firstSlot,
                  selected_date: item.selected_date,
                  payment_completed_at: nowIso,
                },
                success: true,
                errorMessage: null,
                processedAt: nowIso,
              })
            }
          }

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
              created_at: nowIso,
              updated_at: nowIso,
            })
          }

          // Update sold capacity
          // If slot expired and converted to all-day, increment all-day capacity instead
          for (const slot of slots) {
            const slotToIncrement = slotExpired ? null : normalizeAvailabilityTimeSlot(String(slot))
            await incrementSoldCapacityOptimistic(supabase, {
              ticketId: item.ticket_id,
              date: item.selected_date,
              timeSlot: slotToIncrement,
              delta: needed,
            })
          }
        }
      }
    }

    await logWebhook(supabase, {
      orderNumber: orderId,
      eventType: 'ticket_order_processed',
      payload: notification,
      success: !updateError,
      errorMessage: updateError?.message ?? null,
      processedAt: nowIso,
    })

    return new Response(JSON.stringify({ status: 'ok' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Error processing notification:', error)
    if (supabase) {
      const message = error instanceof Error ? error.message : 'Internal server error'
      await logWebhook(supabase, {
        orderNumber: orderId,
        eventType: 'exception',
        payload: notification,
        success: false,
        errorMessage: message,
        processedAt: new Date().toISOString(),
      })
    }
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
