import type { Json } from './database.types.ts'
import type { ServiceClient } from './supabase.ts'
import { normalizeAvailabilityTimeSlot, normalizeSelectedTimeSlots } from './tickets.ts'

type OrdersRow = {
  id: number
  order_number: string
  user_id: string | null
  status?: string | null
  tickets_issued_at?: string | null
  capacity_released_at?: string | null
  updated_at?: string | null
}

type OrderItemsRow = {
  id: number
  order_id: number
  ticket_id: number
  selected_date: string
  selected_time_slots: Json | null
  quantity: number
}

type OrderProductsRow = {
  id: number
  order_number: string
  status?: string | null
  payment_status?: string | null
  total?: unknown
  pickup_code?: string | null
  pickup_status?: string | null
  pickup_expires_at?: string | null
  stock_released_at?: string | null
  paid_at?: string | null
  updated_at?: string | null
}

type OrderProductItemsRow = {
  id?: number
  order_product_id: number
  product_variant_id: number
  quantity: number
}

export type TicketOrder = OrdersRow
export type TicketOrderItem = Pick<OrderItemsRow, 'id' | 'ticket_id' | 'selected_date' | 'selected_time_slots' | 'quantity'> & {
  order_id?: number
}
export type ProductOrder = OrderProductsRow
export type ProductOrderItem = OrderProductItemsRow

export type PaymentEffectScope = 'ticket_order' | 'product_order'

async function claimPaymentEffectRun(params: {
  supabase: ServiceClient
  scope: PaymentEffectScope
  orderRef: string
  effectType: string
  effectKey?: string
}) {
  const { data, error } = await params.supabase.rpc('claim_payment_effect_run', {
    p_effect_scope: params.scope,
    p_order_ref: params.orderRef,
    p_effect_type: params.effectType,
    p_effect_key: params.effectKey ?? '',
    p_stale_after_seconds: 300,
  })

  if (error) {
    throw new Error(`Failed to claim payment effect run: ${error.message}`)
  }

  const row = Array.isArray(data) ? data[0] : null
  return {
    claimed: Boolean((row as { claimed?: boolean } | null)?.claimed),
    status: String((row as { status?: string } | null)?.status ?? ''),
  }
}

async function completePaymentEffectRun(params: {
  supabase: ServiceClient
  scope: PaymentEffectScope
  orderRef: string
  effectType: string
  effectKey?: string
  metadata?: Json | null
}) {
  const { error } = await params.supabase.rpc('complete_payment_effect_run', {
    p_effect_scope: params.scope,
    p_order_ref: params.orderRef,
    p_effect_type: params.effectType,
    p_effect_key: params.effectKey ?? '',
    p_metadata: params.metadata ?? null,
  })

  if (error) {
    throw new Error(`Failed to complete payment effect run: ${error.message}`)
  }
}

async function failPaymentEffectRun(params: {
  supabase: ServiceClient
  scope: PaymentEffectScope
  orderRef: string
  effectType: string
  effectKey?: string
  errorMessage: string
  metadata?: Json | null
}) {
  const { error } = await params.supabase.rpc('fail_payment_effect_run', {
    p_effect_scope: params.scope,
    p_order_ref: params.orderRef,
    p_effect_type: params.effectType,
    p_effect_key: params.effectKey ?? '',
    p_error: params.errorMessage,
    p_metadata: params.metadata ?? null,
  })

  if (error) {
    console.error('[payment-effects] Failed to mark effect run failed:', error)
  }
}

async function withPaymentEffectRun<TResult>(params: {
  supabase: ServiceClient
  scope: PaymentEffectScope
  orderRef: string
  effectType: string
  effectKey?: string
  skipResult: TResult
  metadataOnComplete?: Json | null
  run: () => Promise<TResult>
}): Promise<TResult> {
  const claim = await claimPaymentEffectRun({
    supabase: params.supabase,
    scope: params.scope,
    orderRef: params.orderRef,
    effectType: params.effectType,
    effectKey: params.effectKey,
  })

  if (!claim.claimed) {
    return params.skipResult
  }

  try {
    const result = await params.run()
    await completePaymentEffectRun({
      supabase: params.supabase,
      scope: params.scope,
      orderRef: params.orderRef,
      effectType: params.effectType,
      effectKey: params.effectKey,
      metadata: params.metadataOnComplete ?? null,
    })
    return result
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown payment effect failure'
    await failPaymentEffectRun({
      supabase: params.supabase,
      scope: params.scope,
      orderRef: params.orderRef,
      effectType: params.effectType,
      effectKey: params.effectKey,
      errorMessage: message,
    })
    throw error
  }
}

export function toNumber(value: unknown, fallback: number) {
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
  supabase: ServiceClient,
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
      payload: (params.payload ?? null) as Json | null,
      processed_at: params.processedAt,
      success: params.success,
      error_message: params.errorMessage ?? null,
    })
  } catch (err) {
    console.error('[logWebhookEvent] Failed to log:', err)
    return
  }
}

export async function issueTicketsIfNeeded(params: {
  supabase: ServiceClient
  order: TicketOrder
  orderItems?: TicketOrderItem[]
  nowIso: string
}) {
  const { supabase, order, nowIso } = params
  if (order.tickets_issued_at) return { issued: 0, skipped: true }

  return withPaymentEffectRun({
    supabase,
    scope: 'ticket_order',
    orderRef: order.order_number,
    effectType: 'issue_tickets',
    skipResult: { issued: 0, skipped: true },
    metadataOnComplete: { order_id: order.id, processed_at: nowIso },
    run: async () => {
      const orderItemsResult =
        params.orderItems == null
          ? await supabase
              .from('order_items')
              .select('id, ticket_id, selected_date, selected_time_slots, quantity')
              .eq('order_id', order.id)
          : null

      const orderItems = params.orderItems ?? orderItemsResult?.data

      if (orderItemsResult?.error) {
        throw new Error(`Failed to load ticket order items: ${orderItemsResult.error.message}`)
      }

      if (!Array.isArray(orderItems) || orderItems.length === 0) {
        return { issued: 0, skipped: true }
      }

      const now = new Date()
      const itemIds = orderItems.map((row) => Number(row.id)).filter((id) => id > 0)
      const { data: existingTicketRows, error: existingTicketsError } = itemIds.length
        ? await supabase.from('purchased_tickets').select('order_item_id').in('order_item_id', itemIds)
        : { data: [] as unknown[], error: null }

      if (existingTicketsError) {
        throw new Error(`Failed to inspect existing purchased tickets: ${existingTicketsError.message}`)
      }

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
          throw new Error(`Failed to insert purchased tickets: ${insertError.message}`)
        }
      }

      for (const update of capacityUpdates.values()) {
        const { data: finalized, error: finalizeError } = await supabase.rpc('finalize_ticket_capacity', {
          p_ticket_id: update.ticketId,
          p_date: update.selectedDate,
          p_time_slot: update.timeSlot,
          p_quantity: update.qty,
        })

        if (finalizeError || finalized !== true) {
          throw new Error(
            finalizeError?.message ??
              `Failed to finalize ticket capacity for ${update.ticketId} on ${update.selectedDate}`
          )
        }
      }

      if (!order.tickets_issued_at && (totalNeeded > 0 || ticketsToInsert.length === 0)) {
        const { error: markIssuedError } = await supabase
          .from('orders')
          .update({ tickets_issued_at: nowIso, updated_at: nowIso })
          .eq('id', order.id)

        if (markIssuedError) {
          throw new Error(`Failed to mark tickets as issued: ${markIssuedError.message}`)
        }
      }

      return { issued: totalNeeded, skipped: false }
    },
  })
}

export async function releaseTicketCapacityIfNeeded(params: {
  supabase: ServiceClient
  order: TicketOrder
  orderItems?: TicketOrderItem[]
  nowIso: string
}) {
  const { supabase, order, nowIso } = params
  if (order.capacity_released_at) return { released: false }

  return withPaymentEffectRun({
    supabase,
    scope: 'ticket_order',
    orderRef: order.order_number,
    effectType: 'release_ticket_capacity',
    skipResult: { released: false },
    metadataOnComplete: { order_id: order.id, processed_at: nowIso },
    run: async () => {
      const orderItemsResult =
        params.orderItems == null
          ? await supabase
              .from('order_items')
              .select('id, ticket_id, selected_date, selected_time_slots, quantity')
              .eq('order_id', order.id)
          : null

      const orderItems = params.orderItems ?? orderItemsResult?.data

      if (orderItemsResult?.error) {
        throw new Error(`Failed to load ticket order items for capacity release: ${orderItemsResult.error.message}`)
      }

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
        const { data: released, error: releaseError } = await supabase.rpc('release_ticket_capacity', {
          p_ticket_id: release.ticketId,
          p_date: release.selectedDate,
          p_time_slot: release.timeSlot,
          p_quantity: release.qty,
        })

        if (releaseError || released !== true) {
          throw new Error(
            releaseError?.message ??
              `Failed to release ticket capacity for ${release.ticketId} on ${release.selectedDate}`
          )
        }
      }

      const { error: markReleasedError } = await supabase
        .from('orders')
        .update({ capacity_released_at: nowIso, updated_at: nowIso })
        .eq('id', order.id)

      if (markReleasedError) {
        throw new Error(`Failed to mark ticket capacity as released: ${markReleasedError.message}`)
      }

      return { released: true }
    },
  })
}

export async function ensureVoucherUsageIfNeeded(params: {
  supabase: ServiceClient
  orderNumber: string
  voucherId: string | null
  voucherCode?: string | null
  userId: string | null
  orderProductId: number
  discountAmount: unknown
  nowIso: string
}) {
  const { supabase, orderNumber, voucherId, voucherCode, userId, orderProductId, discountAmount, nowIso } = params
  if (!voucherId || !userId) return { ensured: false }

  return withPaymentEffectRun({
    supabase,
    scope: 'product_order',
    orderRef: orderNumber,
    effectType: 'ensure_voucher_usage',
    effectKey: voucherId,
    skipResult: { ensured: false },
    metadataOnComplete: { order_product_id: orderProductId, processed_at: nowIso },
    run: async () => {
      const { error } = await supabase
        .from('voucher_usage')
        .upsert(
          {
            voucher_id: voucherId,
            user_id: userId,
            order_product_id: orderProductId,
            discount_amount: toNumber(discountAmount, 0),
            used_at: nowIso,
          },
          { onConflict: 'order_product_id' }
        )

      if (error) {
        await logWebhookEvent(supabase, {
          orderNumber,
          eventType: 'voucher_usage_create_failed',
          payload: { voucher_id: voucherId, voucher_code: voucherCode ?? null, error: error.message },
          success: false,
          errorMessage: error.message,
          processedAt: nowIso,
        })
        throw new Error(`Failed to record voucher usage: ${error.message}`)
      }

      return { ensured: true }
    },
  })
}

export async function releaseVoucherQuotaIfNeeded(params: {
  supabase: ServiceClient
  orderNumber: string
  voucherId: string | null
  voucherCode?: string | null
  nextStatus: string
  nowIso: string
}) {
  const { supabase, orderNumber, voucherId, voucherCode, nextStatus, nowIso } = params
  if (!voucherId) return { released: false, skipped: true }

  return withPaymentEffectRun({
    supabase,
    scope: 'product_order',
    orderRef: orderNumber,
    effectType: 'release_voucher_quota',
    effectKey: voucherId,
    skipResult: { released: false, skipped: true },
    metadataOnComplete: { voucher_id: voucherId, status: nextStatus, processed_at: nowIso },
    run: async () => {
      const { data: released, error: releaseError } = await supabase.rpc('release_voucher_quota', {
        p_voucher_id: voucherId,
      })

      await logWebhookEvent(supabase, {
        orderNumber,
        eventType: 'voucher_quota_released',
        payload: {
          voucher_id: voucherId,
          voucher_code: voucherCode ?? null,
          result: released,
          status: nextStatus,
          error: releaseError?.message,
        },
        success: !releaseError && released === true,
        errorMessage: releaseError?.message ?? (released === true ? null : 'Voucher quota release returned false'),
        processedAt: nowIso,
      })

      if (releaseError || released !== true) {
        throw new Error(releaseError?.message ?? 'Failed to release voucher quota')
      }

      return { released: true, skipped: false }
    },
  })
}

export async function ensureProductPaidSideEffects(params: {
  supabase: ServiceClient
  order: ProductOrder
  nowIso: string
  grossAmount?: unknown
  defaultStatus?: string
  shouldSetPaidAt?: boolean
}) {
  const { supabase, order, nowIso } = params
  return withPaymentEffectRun({
    supabase,
    scope: 'product_order',
    orderRef: order.order_number,
    effectType: 'ensure_paid_side_effects',
    skipResult: { pickupCode: order.pickup_code || '', finalStatus: String(order.status || 'processing') },
    metadataOnComplete: { order_id: order.id, processed_at: nowIso },
    run: async () => {
      const { data: orderItems, error: orderItemsError } = await supabase
        .from('order_product_items')
        .select('product_variant_id, quantity')
        .eq('order_product_id', order.id)

      if (orderItemsError) {
        throw new Error(`Failed to load product order items: ${orderItemsError.message}`)
      }

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
        const { data: variantRows, error: variantRowsError } = variantIds.length
          ? await supabase.from('product_variants').select('id, stock, reserved_stock').in('id', variantIds)
          : { data: [] as unknown[], error: null }

        if (variantRowsError) {
          throw new Error(`Failed to load product variants for payment validation: ${variantRowsError.message}`)
        }

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
        const { data: pickupCodeRow, error: pickupCodeError } = await supabase.rpc('generate_pickup_code', {})
        if (pickupCodeError) {
          throw new Error(`Failed to generate pickup code: ${pickupCodeError.message}`)
        }
        pickupCode = String(pickupCodeRow || '')
        if (!pickupCode) {
          throw new Error('Failed to generate pickup code')
        }
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

      const { error: updateError } = await supabase.from('order_products').update(updateFields).eq('id', order.id)
      if (updateError) {
        throw new Error(`Failed to finalize paid product side effects: ${updateError.message}`)
      }

      return { pickupCode, finalStatus }
    },
  })
}

export async function releaseProductReservedStockIfNeeded(params: {
  supabase: ServiceClient
  order: ProductOrder
  nowIso: string
}) {
  const { supabase, order, nowIso } = params
  if (order.stock_released_at) return { released: false }

  return withPaymentEffectRun({
    supabase,
    scope: 'product_order',
    orderRef: order.order_number,
    effectType: 'release_reserved_stock',
    skipResult: { released: false },
    metadataOnComplete: { order_id: order.id, processed_at: nowIso },
    run: async () => {
      const { data: orderItems, error: orderItemsError } = await supabase
        .from('order_product_items')
        .select('product_variant_id, quantity')
        .eq('order_product_id', order.id)

      if (orderItemsError) {
        throw new Error(`Failed to load product order items for stock release: ${orderItemsError.message}`)
      }

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
      const { data: variantRows, error: variantRowsError } = variantIds.length
        ? await supabase.from('product_variants').select('id, reserved_stock').in('id', variantIds)
        : { data: [] as unknown[], error: null }

      if (variantRowsError) {
        throw new Error(`Failed to load product variants for stock release: ${variantRowsError.message}`)
      }

      const reservedByVariantId = new Map<number, number>()
      if (Array.isArray(variantRows)) {
        for (const row of variantRows) {
          const variantId = Number((row as { id?: unknown }).id ?? 0)
          if (!variantId) continue
          reservedByVariantId.set(
            variantId,
            Math.max(0, Math.floor(Number((row as { reserved_stock?: unknown }).reserved_stock ?? 0)))
          )
        }
      }

      for (const [variantId, qty] of qtyByVariantId.entries()) {
        const releasableQty = Math.min(qty, reservedByVariantId.get(variantId) ?? 0)
        if (releasableQty <= 0) continue

        const { data: released, error: releaseError } = await supabase.rpc('release_product_stock', {
          p_variant_id: variantId,
          p_quantity: releasableQty,
        })

        if (releaseError || released !== true) {
          throw new Error(releaseError?.message ?? `Failed to release stock for variant ${variantId}`)
        }
      }

      const { error: markReleasedError } = await supabase
        .from('order_products')
        .update({ stock_released_at: nowIso, updated_at: nowIso })
        .eq('id', order.id)

      if (markReleasedError) {
        throw new Error(`Failed to mark product stock as released: ${markReleasedError.message}`)
      }

      return { released: true }
    },
  })
}
