import { createServiceClient } from './supabase.ts'
import {
  ensureProductPaidSideEffects,
  ensureVoucherUsageIfNeeded,
  issueTicketsIfNeeded,
  logWebhookEvent,
  releaseProductReservedStockIfNeeded,
  releaseTicketCapacityIfNeeded,
  releaseVoucherQuotaIfNeeded,
  type ProductOrder,
  type TicketOrder,
  type TicketOrderItem,
} from './payment-effects.ts'

type ServiceClient = ReturnType<typeof createServiceClient>

const TICKET_ORDER_SELECT = 'id, user_id, order_number, status, tickets_issued_at, capacity_released_at'
const PRODUCT_ORDER_SELECT =
  'id, user_id, order_number, status, payment_status, pickup_code, pickup_status, pickup_expires_at, paid_at, total, stock_released_at, voucher_id, voucher_code, discount_amount'

export type ProductOrderTransitionOrder = ProductOrder & {
  user_id?: string | null
  voucher_id?: string | null
  voucher_code?: string | null
  discount_amount?: unknown
}

export type TransitionResult<TOrder> = {
  order: TOrder | null
  updateError: string | null
  effectError: string | null
  applied: boolean
  skippedReason: string | null
}

export function isFinalOrPaidMidtransStatus(status: string) {
  return status === 'paid' || status === 'expired' || status === 'failed' || status === 'refunded'
}

function mapProductPaymentStatus(nextStatus: string) {
  if (nextStatus === 'paid') return 'paid'
  if (nextStatus === 'refunded') return 'refunded'
  if (nextStatus === 'failed' || nextStatus === 'expired') return 'failed'
  return 'unpaid'
}

function mapProductOrderStatus(nextStatus: string, currentStatus: string) {
  if (nextStatus === 'paid') return 'processing'
  if (nextStatus === 'expired') return 'expired'
  if (nextStatus === 'failed') return 'cancelled'
  return currentStatus || 'awaiting_payment'
}

function getTicketTransitionSkipReason(currentStatus: string, nextStatus: string) {
  if (!nextStatus) return 'missing_next_status'

  if (currentStatus === 'refunded' && nextStatus !== 'refunded') {
    return `blocked_${nextStatus}_after_refunded`
  }

  if (currentStatus === 'paid' && nextStatus !== 'paid' && nextStatus !== 'refunded') {
    return `blocked_${nextStatus}_after_paid`
  }

  if ((currentStatus === 'expired' || currentStatus === 'failed') && nextStatus === 'paid') {
    return `blocked_${nextStatus}_after_${currentStatus}`
  }

  if (
    nextStatus === 'pending' &&
    (currentStatus === 'paid' || currentStatus === 'expired' || currentStatus === 'failed' || currentStatus === 'refunded')
  ) {
    return `blocked_pending_after_${currentStatus}`
  }

  return null
}

function getProductTransitionSkipReason(currentPaymentStatus: string, currentStatus: string, nextStatus: string) {
  if (!nextStatus) return 'missing_next_status'

  if (currentStatus === 'completed' && nextStatus !== 'refunded') {
    return `blocked_${nextStatus}_after_completed`
  }

  if (currentPaymentStatus === 'refunded' && nextStatus !== 'refunded') {
    return `blocked_${nextStatus}_after_refunded`
  }

  if (currentPaymentStatus === 'paid' && (nextStatus === 'pending' || nextStatus === 'failed' || nextStatus === 'expired')) {
    return `blocked_${nextStatus}_after_paid`
  }

  if (currentPaymentStatus === 'failed' && (nextStatus === 'pending' || nextStatus === 'paid')) {
    return `blocked_${nextStatus}_after_failed`
  }

  if ((currentStatus === 'cancelled' || currentStatus === 'expired') && (nextStatus === 'pending' || nextStatus === 'paid')) {
    return `blocked_${nextStatus}_after_${currentStatus}`
  }

  return null
}

async function fetchTicketOrderById(params: { supabase: ServiceClient; orderId: number }) {
  const { data, error } = await params.supabase
    .from('orders')
    .select(TICKET_ORDER_SELECT)
    .eq('id', params.orderId)
    .single()

  if (error || !data) {
    return null
  }

  return data as TicketOrder
}

async function fetchProductOrderById(params: { supabase: ServiceClient; orderId: number }) {
  const { data, error } = await params.supabase
    .from('order_products')
    .select(PRODUCT_ORDER_SELECT)
    .eq('id', params.orderId)
    .single()

  if (error || !data) {
    return null
  }

  return data as ProductOrderTransitionOrder
}

async function markTicketOrderRequiresReview(params: {
  supabase: ServiceClient
  orderId: number
  nowIso: string
}) {
  const { data } = await params.supabase
    .from('orders')
    .update({ status: 'requires_review', updated_at: params.nowIso })
    .eq('id', params.orderId)
    .select(TICKET_ORDER_SELECT)
    .single()

  return (data as TicketOrder | null) ?? null
}

async function markProductOrderRequiresReview(params: {
  supabase: ServiceClient
  orderId: number
  nowIso: string
}) {
  const { data } = await params.supabase
    .from('order_products')
    .update({ status: 'requires_review', pickup_status: 'pending_review', updated_at: params.nowIso })
    .eq('id', params.orderId)
    .select(PRODUCT_ORDER_SELECT)
    .single()

  return (data as ProductOrderTransitionOrder | null) ?? null
}

export async function processTicketOrderTransition(params: {
  supabase: ServiceClient
  order: TicketOrder
  nextStatus: string
  paymentData?: unknown
  orderItems?: TicketOrderItem[]
  nowIso: string
}): Promise<TransitionResult<TicketOrder>> {
  const { supabase, order, nextStatus, paymentData, nowIso } = params
  const previousOrderStatus = String(order.status || '').toLowerCase()
  const skippedReason = getTicketTransitionSkipReason(previousOrderStatus, nextStatus)
  if (skippedReason) {
    return {
      order,
      updateError: null,
      effectError: null,
      applied: false,
      skippedReason,
    }
  }

  const shouldReleaseCapacity =
    (nextStatus === 'expired' || nextStatus === 'failed' || nextStatus === 'refunded') &&
    previousOrderStatus !== 'paid'
  const shouldLoadItems = nextStatus === 'paid' || shouldReleaseCapacity

  const updateFields: Record<string, unknown> = {
    status: nextStatus,
    updated_at: nowIso,
  }
  if (typeof paymentData !== 'undefined') {
    updateFields.payment_data = paymentData
  }

  let updateQuery = supabase.from('orders').update(updateFields).eq('id', order.id)
  if (nextStatus === 'pending') {
    updateQuery = updateQuery.not('status', 'in', '(paid,expired,failed,refunded)')
  } else if (nextStatus === 'paid') {
    updateQuery = updateQuery.not('status', 'in', '(expired,failed,refunded)')
  } else if (nextStatus === 'expired' || nextStatus === 'failed') {
    updateQuery = updateQuery.not('status', 'in', '(paid,refunded)')
  } else if (nextStatus === 'refunded') {
    updateQuery = updateQuery.not('status', 'eq', 'refunded')
  }

  const { data: updatedOrder, error: updateError } = await updateQuery
    .select(TICKET_ORDER_SELECT)
    .maybeSingle()

  if (updateError) {
    return {
      order: null,
      updateError: updateError.message,
      effectError: null,
      applied: false,
      skippedReason: null,
    }
  }

  if (!updatedOrder) {
    const latestOrder = await fetchTicketOrderById({ supabase, orderId: order.id })
    return {
      order: latestOrder ?? order,
      updateError: null,
      effectError: null,
      applied: false,
      skippedReason: latestOrder
        ? getTicketTransitionSkipReason(String(latestOrder.status || '').toLowerCase(), nextStatus) ?? 'concurrent_state_change'
        : 'concurrent_state_change',
    }
  }

  try {
    let orderItems = params.orderItems
    if (!orderItems && shouldLoadItems) {
      const { data, error: orderItemsError } = await supabase
        .from('order_items')
        .select('id, ticket_id, selected_date, selected_time_slots, quantity')
        .eq('order_id', order.id)

      if (orderItemsError) {
        throw new Error(`Failed to load ticket order items: ${orderItemsError.message}`)
      }

      orderItems = Array.isArray(data) ? (data as TicketOrderItem[]) : []
    }

    if (nextStatus === 'paid' && Array.isArray(orderItems) && orderItems.length > 0) {
      await issueTicketsIfNeeded({
        supabase,
        order: updatedOrder as TicketOrder,
        orderItems,
        nowIso,
      })
    }

    if (shouldReleaseCapacity && Array.isArray(orderItems) && orderItems.length > 0) {
      await releaseTicketCapacityIfNeeded({
        supabase,
        order: updatedOrder as TicketOrder,
        orderItems,
        nowIso,
      })
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to process ticket side effects'
    const eventType = nextStatus === 'paid' ? 'ticket_issue_failed' : 'ticket_capacity_release_failed'
    await logWebhookEvent(supabase, {
      orderNumber: order.order_number,
      eventType,
      payload: { error: message, status: nextStatus },
      success: false,
      errorMessage: message,
      processedAt: nowIso,
    })

    const reviewOrder = nextStatus === 'paid'
      ? await markTicketOrderRequiresReview({ supabase, orderId: order.id, nowIso })
      : await fetchTicketOrderById({ supabase, orderId: order.id })

    return {
      order: reviewOrder ?? (updatedOrder as TicketOrder),
      updateError: null,
      effectError: message,
      applied: true,
      skippedReason: null,
    }
  }

  const finalOrder = shouldLoadItems ? await fetchTicketOrderById({ supabase, orderId: order.id }) : null

  return {
    order: finalOrder ?? (updatedOrder as TicketOrder),
    updateError: null,
    effectError: null,
    applied: true,
    skippedReason: null,
  }
}

export async function processProductOrderTransition(params: {
  supabase: ServiceClient
  order: ProductOrderTransitionOrder
  nextStatus: string
  paymentData?: unknown
  grossAmount?: unknown
  nowIso: string
  shouldSetPaidAt?: boolean
}): Promise<TransitionResult<ProductOrderTransitionOrder>> {
  const { supabase, order, nextStatus, paymentData, grossAmount, nowIso } = params
  const currentPaymentStatus = String(order.payment_status || '').toLowerCase()
  const currentStatus = String(order.status || '').toLowerCase()
  const currentPickupStatus = String(order.pickup_status || '').toLowerCase()
  const skippedReason = getProductTransitionSkipReason(currentPaymentStatus, currentStatus, nextStatus)
  if (skippedReason) {
    return {
      order,
      updateError: null,
      effectError: null,
      applied: false,
      skippedReason,
    }
  }

  const voucherId = order.voucher_id ?? null
  const voucherCode = order.voucher_code ?? null
  const voucherUserId = order.user_id ?? null
  const paymentStatus = mapProductPaymentStatus(nextStatus)
  const status = mapProductOrderStatus(nextStatus, currentStatus)

  const updateFields: Record<string, unknown> = {
    status,
    payment_status: paymentStatus,
    updated_at: nowIso,
  }

  if (typeof paymentData !== 'undefined') {
    updateFields.payment_data = paymentData
  }
  if (nextStatus === 'expired') {
    updateFields.expired_at = nowIso
  }

  let updateQuery = supabase.from('order_products').update(updateFields).eq('id', order.id)
  if (nextStatus === 'pending') {
    updateQuery = updateQuery
      .not('payment_status', 'in', '(paid,failed,refunded)')
      .not('status', 'in', '(cancelled,expired,completed)')
  } else if (nextStatus === 'paid') {
    updateQuery = updateQuery
      .not('payment_status', 'in', '(failed,refunded)')
      .not('status', 'in', '(cancelled,expired,completed)')
  } else if (nextStatus === 'expired' || nextStatus === 'failed') {
    updateQuery = updateQuery
      .not('payment_status', 'in', '(paid,refunded)')
      .not('status', 'eq', 'completed')
  } else if (nextStatus === 'refunded') {
    updateQuery = updateQuery.not('payment_status', 'eq', 'refunded')
  }

  const { data: updatedOrder, error: updateError } = await updateQuery
    .select(PRODUCT_ORDER_SELECT)
    .maybeSingle()

  if (updateError) {
    return {
      order: null,
      updateError: updateError.message,
      effectError: null,
      applied: false,
      skippedReason: null,
    }
  }

  if (!updatedOrder) {
    const latestOrder = await fetchProductOrderById({ supabase, orderId: order.id })
    return {
      order: latestOrder ?? order,
      updateError: null,
      effectError: null,
      applied: false,
      skippedReason: latestOrder
        ? getProductTransitionSkipReason(
            String(latestOrder.payment_status || '').toLowerCase(),
            String(latestOrder.status || '').toLowerCase(),
            nextStatus
          ) ?? 'concurrent_state_change'
        : 'concurrent_state_change',
    }
  }

  try {
    const updatedOrderStatus = String((updatedOrder as { status?: string | null }).status || '').toLowerCase()
    const updatedPickupStatus = String((updatedOrder as { pickup_status?: string | null }).pickup_status || '').toLowerCase()
    const updatedPaidAt = (updatedOrder as { paid_at?: string | null }).paid_at ?? null

    const shouldEnsurePaidArtifacts =
      nextStatus === 'paid' &&
      (
        currentPaymentStatus !== 'paid' ||
        !updatedOrder.pickup_code ||
        !updatedPaidAt ||
        updatedOrderStatus === 'requires_review' ||
        updatedPickupStatus === 'pending_review'
      )

    if (shouldEnsurePaidArtifacts) {
      await ensureProductPaidSideEffects({
        supabase,
        order: updatedOrder as ProductOrder,
        nowIso,
        grossAmount,
        defaultStatus: status,
        shouldSetPaidAt: params.shouldSetPaidAt ?? true,
      })
    }

    if (nextStatus === 'paid') {
      await ensureVoucherUsageIfNeeded({
        supabase,
        orderNumber: order.order_number,
        voucherId,
        voucherCode,
        userId: voucherUserId,
        orderProductId: updatedOrder.id,
        discountAmount: updatedOrder.discount_amount,
        nowIso,
      })
    }

    const shouldReleaseVoucherQuota =
      (nextStatus === 'expired' || nextStatus === 'failed') &&
      currentPaymentStatus !== 'paid' &&
      currentPaymentStatus !== 'refunded'

    if (shouldReleaseVoucherQuota) {
      await releaseVoucherQuotaIfNeeded({
        supabase,
        orderNumber: order.order_number,
        voucherId,
        voucherCode,
        nextStatus,
        nowIso,
      })
    }

    const shouldReleaseReserve =
      (nextStatus === 'expired' || nextStatus === 'failed' || nextStatus === 'refunded') &&
      currentPickupStatus !== 'completed' &&
      updatedPickupStatus !== 'completed'

    if (shouldReleaseReserve) {
      await releaseProductReservedStockIfNeeded({
        supabase,
        order: updatedOrder as ProductOrder,
        nowIso,
      })
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to process product side effects'
    await logWebhookEvent(supabase, {
      orderNumber: order.order_number,
      eventType: 'product_side_effect_failed',
      payload: { error: message, status: nextStatus },
      success: false,
      errorMessage: message,
      processedAt: nowIso,
    })

    const reviewOrder =
      nextStatus === 'expired' || nextStatus === 'failed' || nextStatus === 'refunded' || nextStatus === 'paid'
        ? await markProductOrderRequiresReview({ supabase, orderId: updatedOrder.id, nowIso })
        : await fetchProductOrderById({ supabase, orderId: updatedOrder.id })

    return {
      order: reviewOrder ?? (updatedOrder as ProductOrderTransitionOrder),
      updateError: null,
      effectError: message,
      applied: true,
      skippedReason: null,
    }
  }

  const finalOrder = await fetchProductOrderById({ supabase, orderId: updatedOrder.id })

  return {
    order: finalOrder ?? (updatedOrder as ProductOrderTransitionOrder),
    updateError: null,
    effectError: null,
    applied: true,
    skippedReason: null,
  }
}
