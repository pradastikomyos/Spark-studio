import { createServiceClient } from './supabase.ts'
import {
  ensureProductPaidSideEffects,
  issueTicketsIfNeeded,
  logWebhookEvent,
  releaseProductReservedStockIfNeeded,
  releaseTicketCapacityIfNeeded,
  toNumber,
  type ProductOrder,
  type TicketOrder,
  type TicketOrderItem,
} from './payment-effects.ts'

type ServiceClient = ReturnType<typeof createServiceClient>

export type ProductOrderTransitionOrder = ProductOrder & {
  user_id?: string | null
  voucher_id?: string | null
  voucher_code?: string | null
  discount_amount?: unknown
}

type TransitionResult<TOrder> = {
  order: TOrder | null
  updateError: string | null
  effectError: string | null
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

export async function processTicketOrderTransition(params: {
  supabase: ServiceClient
  order: TicketOrder
  nextStatus: string
  paymentData?: unknown
  orderItems?: TicketOrderItem[]
  nowIso: string
}) : Promise<TransitionResult<TicketOrder>> {
  const { supabase, order, nextStatus, paymentData, nowIso } = params
  const previousOrderStatus = String(order.status || '').toLowerCase()
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

  const { data: updatedOrder, error: updateError } = await supabase
    .from('orders')
    .update(updateFields)
    .eq('id', order.id)
    .select('id, user_id, order_number, status, tickets_issued_at, capacity_released_at')
    .single()

  if (updateError || !updatedOrder) {
    return {
      order: null,
      updateError: updateError?.message ?? 'Failed to update ticket order',
      effectError: null,
    }
  }

  let orderItems = params.orderItems
  if (!orderItems && shouldLoadItems) {
    const { data } = await supabase
      .from('order_items')
      .select('id, ticket_id, selected_date, selected_time_slots, quantity')
      .eq('order_id', order.id)
    orderItems = Array.isArray(data) ? (data as TicketOrderItem[]) : []
  }

  try {
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

    if (nextStatus === 'paid') {
      await supabase.from('orders').update({ status: 'requires_review', updated_at: nowIso }).eq('id', order.id)
    }

    return {
      order: updatedOrder as TicketOrder,
      updateError: null,
      effectError: message,
    }
  }

  return {
    order: updatedOrder as TicketOrder,
    updateError: null,
    effectError: null,
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
}) : Promise<TransitionResult<ProductOrderTransitionOrder>> {
  const { supabase, order, nextStatus, paymentData, grossAmount, nowIso } = params
  const currentPaymentStatus = String(order.payment_status || '').toLowerCase()
  const currentStatus = String(order.status || '').toLowerCase()
  const currentPickupStatus = String(order.pickup_status || '').toLowerCase()
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

  const { data: updatedOrder, error: updateError } = await supabase
    .from('order_products')
    .update(updateFields)
    .eq('id', order.id)
    .select(
      'id, user_id, order_number, status, payment_status, pickup_code, pickup_status, pickup_expires_at, total, stock_released_at, voucher_id, voucher_code, discount_amount'
    )
    .single()

  if (updateError || !updatedOrder) {
    return {
      order: null,
      updateError: updateError?.message ?? 'Failed to update product order',
      effectError: null,
    }
  }

  try {
    if (nextStatus === 'paid' && (currentPaymentStatus !== 'paid' || !updatedOrder.pickup_code)) {
      await ensureProductPaidSideEffects({
        supabase,
        order: updatedOrder as ProductOrder,
        nowIso,
        grossAmount,
        defaultStatus: status,
        shouldSetPaidAt: params.shouldSetPaidAt ?? true,
      })
    }

    const voucherDiscountAmount = toNumber(updatedOrder.discount_amount, 0)
    if (nextStatus === 'paid' && voucherId && voucherUserId) {
      const { error: voucherUsageError } = await supabase
        .from('voucher_usage')
        .upsert(
          {
            voucher_id: voucherId,
            user_id: voucherUserId,
            order_product_id: updatedOrder.id,
            discount_amount: voucherDiscountAmount,
            used_at: nowIso,
          },
          { onConflict: 'order_product_id' }
        )

      if (voucherUsageError) {
        await logWebhookEvent(supabase, {
          orderNumber: order.order_number,
          eventType: 'voucher_usage_create_failed',
          payload: { voucher_id: voucherId, voucher_code: voucherCode, error: voucherUsageError.message },
          success: false,
          errorMessage: voucherUsageError.message,
          processedAt: nowIso,
        })
      }
    }

    const shouldReleaseVoucherQuota =
      (nextStatus === 'expired' || nextStatus === 'failed') && currentPaymentStatus !== 'paid'
    if (shouldReleaseVoucherQuota && voucherId) {
      const { data: released, error: releaseError } = await supabase.rpc('release_voucher_quota', {
        p_voucher_id: voucherId,
      })

      await logWebhookEvent(supabase, {
        orderNumber: order.order_number,
        eventType: 'voucher_quota_released',
        payload: {
          voucher_id: voucherId,
          voucher_code: voucherCode,
          result: released,
          status: nextStatus,
          error: releaseError?.message,
        },
        success: !releaseError,
        errorMessage: releaseError?.message ?? null,
        processedAt: nowIso,
      })
    }

    const shouldReleaseReserve =
      (nextStatus === 'expired' || nextStatus === 'failed' || nextStatus === 'refunded') &&
      currentPaymentStatus !== 'paid' &&
      currentStatus !== 'cancelled' &&
      currentStatus !== 'expired' &&
      currentPickupStatus !== 'completed'

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

    if (nextStatus === 'expired' || nextStatus === 'failed' || nextStatus === 'refunded' || nextStatus === 'paid') {
      await supabase
        .from('order_products')
        .update({ status: 'requires_review', pickup_status: 'pending_review', updated_at: nowIso })
        .eq('id', updatedOrder.id)
    }

    return {
      order: updatedOrder as ProductOrderTransitionOrder,
      updateError: null,
      effectError: message,
    }
  }

  return {
    order: updatedOrder as ProductOrderTransitionOrder,
    updateError: null,
    effectError: null,
  }
}
