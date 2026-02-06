import { normalizeAvailabilityTimeSlot, normalizeSelectedTimeSlots } from './tickets.ts'

type SupabaseQueryResult = {
  data?: unknown
  error?: { message?: string }
}

type SupabaseQuery = PromiseLike<SupabaseQueryResult> & {
  select: (columns?: string, options?: Record<string, unknown>) => SupabaseQuery
  eq: (column: string, value: unknown) => SupabaseQuery
  order: (column: string, options?: Record<string, unknown>) => SupabaseQuery
  in: (column: string, values: unknown[]) => SupabaseQuery
  update: (values: Record<string, unknown>) => SupabaseQuery
  insert: (values: unknown) => SupabaseQuery
  delete: () => SupabaseQuery
  single: () => SupabaseQuery
}

type SupabaseClient = {
  from: (table: string) => SupabaseQuery
  rpc: (fn: string, params: Record<string, unknown>) => SupabaseQuery
}

type TicketOrder = {
  id: number
  order_number: string
  user_id: string | null
  status?: string | null
  tickets_issued_at?: string | null
  capacity_released_at?: string | null
}

type TicketOrderItem = {
  id: number
  ticket_id: number
  selected_date: string
  selected_time_slots: unknown
  quantity: number
}

type ProductOrder = {
  id: number
  order_number: string
  status?: string | null
  payment_status?: string | null
  total?: unknown
  pickup_code?: string | null
  pickup_status?: string | null
  pickup_expires_at?: string | null
  stock_released_at?: string | null
}

type ProductOrderItem = {
  product_variant_id: number
  quantity: number
}

function toNumber(value: unknown, fallback: number) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : fallback
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : fallback
  }
  return fallback
}

export function generateTicketCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let result = 'TKT-'
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result + '-' + Date.now().toString(36).toUpperCase()
}

export async function logWebhookEvent(
  supabase: SupabaseClient,
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

export async function issueTicketsIfNeeded(params: {
  supabase: SupabaseClient
  order: TicketOrder
  orderItems?: TicketOrderItem[]
  nowIso: string
}) {
  const { supabase, order, nowIso } = params
  if (order.tickets_issued_at) return { issued: 0, skipped: true }

  const orderItems =
    params.orderItems ??
    ((await supabase
      .from('order_items')
      .select('id, ticket_id, selected_date, selected_time_slots, quantity')
      .eq('order_id', order.id)) as { data?: TicketOrderItem[] }).data

  if (!Array.isArray(orderItems) || orderItems.length === 0) {
    return { issued: 0, skipped: true }
  }

  const now = new Date()
  const itemIds = orderItems.map((row) => Number(row.id)).filter((id) => id > 0)
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
  let totalNeeded = 0

  for (const item of orderItems) {
    const orderItemId = Number(item.id ?? 0)
    const quantity = Math.max(0, Math.floor(Number(item.quantity ?? 0)))
    const existing = existingByOrderItemId.get(orderItemId) ?? 0
    const needed = Math.max(0, quantity - existing)
    if (!orderItemId || needed <= 0) continue

    totalNeeded += needed

    const slots = normalizeSelectedTimeSlots(item.selected_time_slots)
    const firstSlot = slots[0]
    let timeSlotForTicket = firstSlot && firstSlot !== 'all-day' && /^\d{2}:\d{2}/.test(firstSlot) ? firstSlot : null

    let slotExpired = false
    const selectedDate = String(item.selected_date ?? '')
    if (timeSlotForTicket && selectedDate) {
      const sessionStartTimeWIB = new Date(`${selectedDate}T${timeSlotForTicket}:00+07:00`)
      const sessionEndTimeWIB = new Date(sessionStartTimeWIB.getTime() + 150 * 60 * 1000)
      if (now > sessionEndTimeWIB) {
        slotExpired = true
        timeSlotForTicket = null
        await logWebhookEvent(supabase, {
          orderNumber: order.order_number,
          eventType: 'session_ended_converted_to_allday',
          payload: {
            original_slot: firstSlot,
            selected_date: selectedDate,
            session_end_time: sessionEndTimeWIB.toISOString(),
            payment_completed_at: nowIso,
          },
          success: true,
          processedAt: nowIso,
        })
      }
    }

    for (let i = 0; i < needed; i++) {
      ticketsToInsert.push({
        ticket_code: generateTicketCode(),
        order_item_id: orderItemId,
        user_id: order.user_id,
        ticket_id: item.ticket_id,
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
    const ticketId = Number(item.ticket_id ?? 0)
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
      await logWebhookEvent(supabase, {
        orderNumber: order.order_number,
        eventType: 'ticket_issue_failed',
        payload: { error: insertError.message },
        success: false,
        errorMessage: insertError.message,
        processedAt: nowIso,
      })
      return { issued: 0, skipped: false }
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

  if (!order.tickets_issued_at && (totalNeeded > 0 || ticketsToInsert.length === 0)) {
    await supabase
      .from('orders')
      .update({ tickets_issued_at: nowIso, updated_at: nowIso })
      .eq('id', order.id)
  }

  return { issued: totalNeeded, skipped: false }
}

export async function releaseTicketCapacityIfNeeded(params: {
  supabase: SupabaseClient
  order: TicketOrder
  orderItems?: TicketOrderItem[]
  nowIso: string
}) {
  const { supabase, order, nowIso } = params
  if (order.capacity_released_at) return { released: false }

  const orderItems =
    params.orderItems ??
    ((await supabase
      .from('order_items')
      .select('id, ticket_id, selected_date, selected_time_slots, quantity')
      .eq('order_id', order.id)) as { data?: TicketOrderItem[] }).data

  if (!Array.isArray(orderItems) || orderItems.length === 0) {
    return { released: false }
  }

  const releases = new Map<string, { ticketId: number; selectedDate: string; timeSlot: string | null; qty: number }>()
  for (const row of orderItems) {
    const qty = Math.max(1, Math.floor(Number(row.quantity ?? 0)))
    const ticketId = Number(row.ticket_id ?? 0)
    const selectedDate = String(row.selected_date ?? '')
    if (!ticketId || !selectedDate || qty <= 0) continue

    const slots = normalizeSelectedTimeSlots(row.selected_time_slots)
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

  await supabase
    .from('orders')
    .update({ capacity_released_at: nowIso, updated_at: nowIso })
    .eq('id', order.id)

  return { released: true }
}

export async function ensureProductPaidSideEffects(params: {
  supabase: SupabaseClient
  order: ProductOrder
  nowIso: string
  grossAmount?: unknown
  defaultStatus?: string
  shouldSetPaidAt?: boolean
}) {
  const { supabase, order, nowIso } = params

  const { data: orderItems } = await supabase
    .from('order_product_items')
    .select('product_variant_id, quantity')
    .eq('order_product_id', order.id)

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

    for (const row of orderItems as ProductOrderItem[]) {
      const variantId = Number((row as { product_variant_id: number | string }).product_variant_id)
      const qty = Math.max(1, Math.floor(Number((row as { quantity: number | string }).quantity)))
      const variant = variantsById.get(variantId)
      if (!variant) continue
      const currentStock = variant.stock
      const currentReserved = variant.reserved_stock

      if (currentReserved < qty) {
        stockValidationFailed = true
        stockIssues.push(`Variant ${variantId}: reserved=${currentReserved}, needed=${qty}`)
      }

      if (currentStock < qty) {
        stockValidationFailed = true
        stockIssues.push(`Variant ${variantId}: stock=${currentStock}, needed=${qty}`)
      }
    }
  }

  const expectedTotal = toNumber(order.total, 0)
  const paidTotal = toNumber(params.grossAmount, 0)
  const amountMismatch =
    expectedTotal > 0 && paidTotal > 0 && Math.abs(expectedTotal - paidTotal) > 0.01

  if (stockValidationFailed) {
    await logWebhookEvent(supabase, {
      orderNumber: order.order_number,
      eventType: 'stock_validation_failed_requires_review',
      payload: {
        order_id: order.order_number,
        stock_issues: stockIssues,
        payment_completed_at: nowIso,
      },
      success: true,
      errorMessage: `Stock insufficient: ${stockIssues.join('; ')}`,
      processedAt: nowIso,
    })
  }

  if (amountMismatch) {
    await logWebhookEvent(supabase, {
      orderNumber: order.order_number,
      eventType: 'amount_mismatch_requires_review',
      payload: {
        expected_total: expectedTotal,
        gross_amount: paidTotal,
      },
      success: true,
      errorMessage: `Amount mismatch: expected ${expectedTotal}, got ${paidTotal}`,
      processedAt: nowIso,
    })
  }

  const baseStatus = params.defaultStatus || String(order.status || 'processing')
  const finalStatus = stockValidationFailed || amountMismatch ? 'requires_review' : baseStatus
  const finalPickupStatus = stockValidationFailed || amountMismatch ? 'pending_review' : 'pending_pickup'

  let pickupCode = order.pickup_code || ''
  if (!pickupCode) {
    const { data: pickupCodeRow } = await supabase.rpc('generate_pickup_code', {})
    pickupCode = String(pickupCodeRow || '')
  }

  const updateFields: Record<string, unknown> = {
    status: finalStatus,
    payment_status: 'paid',
    pickup_status: finalPickupStatus,
    updated_at: nowIso,
  }

  if (pickupCode) {
    updateFields.pickup_code = pickupCode
    if (!order.pickup_expires_at) {
      updateFields.pickup_expires_at = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    }
  }

  if (params.shouldSetPaidAt) {
    updateFields.paid_at = nowIso
  }

  await supabase.from('order_products').update(updateFields).eq('id', order.id)

  return { pickupCode, finalStatus }
}

export async function releaseProductReservedStockIfNeeded(params: {
  supabase: SupabaseClient
  order: ProductOrder
  nowIso: string
}) {
  const { supabase, order, nowIso } = params
  if (order.stock_released_at) return { released: false }

  const { data: orderItems } = await supabase
    .from('order_product_items')
    .select('product_variant_id, quantity')
    .eq('order_product_id', order.id)

  if (!Array.isArray(orderItems) || orderItems.length === 0) {
    return { released: false }
  }

  const qtyByVariantId = new Map<number, number>()
  for (const row of orderItems as ProductOrderItem[]) {
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

  await supabase
    .from('order_products')
    .update({ stock_released_at: nowIso, updated_at: nowIso })
    .eq('id', order.id)

  return { released: true }
}
