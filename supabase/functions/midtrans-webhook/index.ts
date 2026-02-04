import { serve } from '../_shared/deps.ts'
import { corsHeaders, handleCors } from '../_shared/http.ts'
import { getMidtransEnv, getSupabaseEnv } from '../_shared/env.ts'
import { createServiceClient } from '../_shared/supabase.ts'
import { generateSignature } from '../_shared/midtrans.ts'
import { mapMidtransStatus, normalizeAvailabilityTimeSlot, normalizeSelectedTimeSlots } from '../_shared/tickets.ts'

// Generate unique ticket code
function generateTicketCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let result = 'TKT-'
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result + '-' + Date.now().toString(36).toUpperCase()
}

function toNumber(value: unknown, fallback: number) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : fallback
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : fallback
  }
  return fallback
}

async function logWebhook(
  supabase: ReturnType<typeof createServiceClient>,
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
  const corsResponse = handleCors(req)
  if (corsResponse) return corsResponse

  let supabase: ReturnType<typeof createServiceClient> | null = null
  let orderId = ''
  let notification: unknown = null

  try {
    const { url: supabaseUrl, serviceRoleKey: supabaseServiceKey } = getSupabaseEnv()
    const { serverKey: midtransServerKey } = getMidtransEnv()

    supabase = createServiceClient(supabaseUrl, supabaseServiceKey)

    notification = await req.json()
    const payload =
      typeof notification === 'object' && notification !== null
        ? (notification as Record<string, unknown>)
        : {}
    orderId = String(payload.order_id || '')
    const transactionStatus = String(payload.transaction_status || '')
    const fraudStatus = payload.fraud_status ?? null
    const nowIso = new Date().toISOString()

    const signatureKey = String(payload.signature_key || '')
    const statusCode =
      typeof payload.status_code === 'number'
        ? String(payload.status_code)
        : String(payload.status_code || '')
    const grossAmount =
      typeof payload.gross_amount === 'number'
        ? payload.gross_amount.toFixed(2)
        : String(payload.gross_amount || '')

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
      .select('id, status, payment_status, pickup_code, pickup_status, total')
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

      const expectedTotal = toNumber((productOrder as { total?: unknown }).total, 0)
      const paidTotal = toNumber(grossAmount, 0)
      const amountMismatch = newStatus === 'paid' && expectedTotal > 0 && paidTotal > 0 && Math.abs(expectedTotal - paidTotal) > 0.01

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
          const variantIds = Array.from(
            new Set(
              orderItems
                .map((row) => Number((row as { product_variant_id: number | string }).product_variant_id))
                .filter((id) => id > 0)
            )
          )
          const { data: variantRows } = variantIds.length
            ? await supabase.from('product_variants').select('id, stock, reserved_stock').in('id', variantIds)
            : { data: [] as unknown[] }

          const variantsById = new Map<number, { stock: number; reserved_stock: number }>()
          if (Array.isArray(variantRows)) {
            for (const v of variantRows) {
              const id = Number((v as { id?: number | string }).id ?? 0)
              if (!id) continue
              variantsById.set(id, {
                stock: Number((v as { stock?: unknown }).stock ?? 0),
                reserved_stock: Number((v as { reserved_stock?: unknown }).reserved_stock ?? 0),
              })
            }
          }

          for (const row of orderItems) {
            const variantId = Number((row as { product_variant_id: number | string }).product_variant_id)
            const qty = Math.max(1, Math.floor(Number((row as { quantity: number | string }).quantity)))
            const variant = variantsById.get(variantId)
            if (!variant) continue
            const currentStock = variant.stock
            const currentReserved = variant.reserved_stock

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

        const { data: pickupCodeRow } = await supabase.rpc('generate_pickup_code')
        const pickupCode = String(pickupCodeRow || '')
        const pickupExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

        // If stock validation failed, flag order for manual review
        const finalStatus = stockValidationFailed || amountMismatch ? 'requires_review' : status
        const finalPickupStatus = stockValidationFailed || amountMismatch ? 'pending_review' : 'pending_pickup'

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

        if (amountMismatch) {
          await logWebhook(supabase, {
            orderNumber: orderId,
            eventType: 'amount_mismatch_requires_review',
            payload: {
              expected_total: expectedTotal,
              gross_amount: paidTotal,
              notification,
            },
            success: true,
            errorMessage: `Amount mismatch: expected ${expectedTotal}, got ${paidTotal}`,
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
          const qtyByVariantId = new Map<number, number>()
          for (const row of orderItems) {
            const variantId = Number((row as { product_variant_id: number | string }).product_variant_id)
            const qty = Math.max(1, Math.floor(Number((row as { quantity: number | string }).quantity)))
            if (!variantId || qty <= 0) continue
            qtyByVariantId.set(variantId, (qtyByVariantId.get(variantId) ?? 0) + qty)
          }

          const variantIds = Array.from(qtyByVariantId.keys())
          const { data: variantRows } = variantIds.length
            ? await supabase.from('product_variants').select('id, reserved_stock').in('id', variantIds)
            : { data: [] as unknown[] }

          const reservedById = new Map<number, number>()
          if (Array.isArray(variantRows)) {
            for (const v of variantRows) {
              const id = Number((v as { id?: number | string }).id ?? 0)
              if (!id) continue
              reservedById.set(id, Number((v as { reserved_stock?: unknown }).reserved_stock ?? 0))
            }
          }

          for (const [variantId, qty] of qtyByVariantId.entries()) {
            const currentReserved = reservedById.get(variantId) ?? 0
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

    const previousOrderStatus = String((order as { status?: unknown }).status || '').toLowerCase()

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

    const shouldReleaseCapacity =
      (newStatus === 'expired' || newStatus === 'failed' || newStatus === 'refunded') && previousOrderStatus !== 'paid'
    if (shouldReleaseCapacity) {
      const orderItemsRows = (order as { order_items?: unknown }).order_items
      if (Array.isArray(orderItemsRows)) {
        const releases = new Map<string, { ticketId: number; selectedDate: string; timeSlot: string | null; qty: number }>()
        for (const row of orderItemsRows) {
          const qty = Math.max(1, Math.floor(Number((row as { quantity?: unknown }).quantity ?? 0)))
          const ticketId = Number((row as { ticket_id?: unknown }).ticket_id ?? 0)
          const selectedDate = String((row as { selected_date?: unknown }).selected_date ?? '')
          if (!ticketId || !selectedDate || qty <= 0) continue

          const slots = normalizeSelectedTimeSlots((row as { selected_time_slots?: unknown }).selected_time_slots)
          const normalizedSlots = slots.length > 0 ? slots : ['all-day']
          for (const slot of normalizedSlots) {
            const timeSlot = normalizeAvailabilityTimeSlot(String(slot))
            const key = `${ticketId}|${selectedDate}|${timeSlot ?? ''}`
            const existing = releases.get(key)
            if (existing) {
              existing.qty += qty
            } else {
              releases.set(key, { ticketId, selectedDate, timeSlot, qty })
            }
          }
        }

        for (const release of releases.values()) {
          await supabase.rpc('release_ticket_capacity', {
            p_ticket_id: release.ticketId,
            p_date: release.selectedDate,
            p_time_slot: release.timeSlot,
            p_quantity: release.qty,
          })
        }
      }
    }

    if (newStatus === 'paid') {
      const { data: orderItems, error: itemsError } = await supabase.from('order_items').select('*').eq('order_id', order.id)

      if (!itemsError && Array.isArray(orderItems)) {
        const now = new Date()
        const itemIds = orderItems.map((row) => Number((row as { id?: number | string }).id ?? 0)).filter((id) => id > 0)
        const { data: existingTicketRows } = itemIds.length
          ? await supabase.from('purchased_tickets').select('order_item_id').in('order_item_id', itemIds)
          : { data: [] as unknown[] }

        const existingByOrderItemId = new Map<number, number>()
        if (Array.isArray(existingTicketRows)) {
          for (const row of existingTicketRows) {
            const id = Number((row as { order_item_id?: number | string }).order_item_id ?? 0)
            if (!id) continue
            existingByOrderItemId.set(id, (existingByOrderItemId.get(id) ?? 0) + 1)
          }
        }

        const ticketsToInsert: Array<Record<string, unknown>> = []
        const capacityUpdates = new Map<string, { ticketId: number; selectedDate: string; timeSlot: string | null; qty: number }>()

        for (const item of orderItems) {
          const orderItemId = Number((item as { id?: number | string }).id ?? 0)
          const quantity = Math.max(0, Math.floor(Number((item as { quantity?: unknown }).quantity ?? 0)))
          const existing = existingByOrderItemId.get(orderItemId) ?? 0
          const needed = Math.max(0, quantity - existing)
          if (!orderItemId || needed <= 0) continue

          const slots = normalizeSelectedTimeSlots((item as { selected_time_slots?: unknown }).selected_time_slots)
          const firstSlot = slots[0]
          let timeSlotForTicket = firstSlot && firstSlot !== 'all-day' && /^\d{2}:\d{2}/.test(firstSlot) ? firstSlot : null

          let slotExpired = false
          const selectedDate = String((item as { selected_date?: unknown }).selected_date ?? '')
          if (timeSlotForTicket && selectedDate) {
            const sessionStartTimeWIB = new Date(`${selectedDate}T${timeSlotForTicket}:00+07:00`)
            const sessionEndTimeWIB = new Date(sessionStartTimeWIB.getTime() + 150 * 60 * 1000)
            if (now > sessionEndTimeWIB) {
              slotExpired = true
              console.warn(`[WEBHOOK] Session ended for order ${orderId}: ${selectedDate} ${timeSlotForTicket}. Converting to all-day access.`)
              timeSlotForTicket = null
              await logWebhook(supabase, {
                orderNumber: orderId,
                eventType: 'session_ended_converted_to_allday',
                payload: {
                  original_slot: firstSlot,
                  selected_date: selectedDate,
                  session_end_time: sessionEndTimeWIB.toISOString(),
                  payment_completed_at: nowIso,
                },
                success: true,
                errorMessage: null,
                processedAt: nowIso,
              })
            }
          }

          for (let i = 0; i < needed; i++) {
            ticketsToInsert.push({
              ticket_code: generateTicketCode(),
              order_item_id: orderItemId,
              user_id: (order as { user_id?: unknown }).user_id,
              ticket_id: (item as { ticket_id?: unknown }).ticket_id,
              valid_date: selectedDate,
              time_slot: timeSlotForTicket,
              status: 'active',
              created_at: nowIso,
              updated_at: nowIso,
            })
          }

          const rawSlots = slots.length > 0 ? slots : ['all-day']
          const slotsForCapacity = slotExpired ? [null] : rawSlots.map((slot) => normalizeAvailabilityTimeSlot(String(slot)))
          const uniqueSlots = Array.from(new Set(slotsForCapacity.map((s) => (s == null ? '' : String(s)))))
          const ticketId = Number((item as { ticket_id?: unknown }).ticket_id ?? 0)
          if (!ticketId || !selectedDate) continue

          for (const slotKey of uniqueSlots) {
            const timeSlot = slotKey === '' ? null : slotKey
            const key = `${ticketId}|${selectedDate}|${timeSlot ?? ''}`
            const existingUpdate = capacityUpdates.get(key)
            if (existingUpdate) {
              existingUpdate.qty += needed
            } else {
              capacityUpdates.set(key, { ticketId, selectedDate, timeSlot, qty: needed })
            }
          }
        }

        if (ticketsToInsert.length > 0) {
          const { error: insertError } = await supabase.from('purchased_tickets').insert(ticketsToInsert)
          if (insertError) {
            console.error('[WEBHOOK] Failed bulk insert purchased_tickets:', insertError)
          }
        }

        for (const update of capacityUpdates.values()) {
          await supabase.rpc('finalize_ticket_capacity', {
            p_ticket_id: update.ticketId,
            p_date: update.selectedDate,
            p_time_slot: update.timeSlot,
            p_quantity: update.qty,
          })
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
