import { serve } from '../_shared/deps.ts'
import { handleCors, json, jsonError } from '../_shared/http.ts'
import { requireAdminContext } from '../_shared/admin.ts'

type RequestBody = {
  pickupCode: string
}

type CompletePickupResult = {
  ok?: boolean
  code?: string
  message?: string
  orderId?: number
  pickupCode?: string
  pickupStatus?: string
}

type OrderPickupRow = {
  id: number
  order_number: string
  channel?: string | null
  payment_status?: string | null
}

type AdminSupabaseService = NonNullable<Awaited<ReturnType<typeof requireAdminContext>>['context']>['supabaseService']

function mapPickupErrorStatus(code: string | undefined): number {
  if (!code) return 500
  if (code === 'order_not_found') return 404
  if (code === 'missing_pickup_code' || code === 'missing_picked_up_by') return 400
  if (
    code === 'order_not_paid' ||
    code === 'already_completed' ||
    code === 'pickup_expired' ||
    code === 'pickup_cancelled' ||
    code === 'variant_not_found' ||
    code === 'insufficient_stock' ||
    code === 'no_order_items' ||
    code === 'invalid_order_item'
  ) {
    return 409
  }
  return 500
}

async function loadOrderByPickupCode(
  supabaseService: AdminSupabaseService,
  pickupCode: string,
): Promise<OrderPickupRow | null> {
  const { data, error } = await supabaseService
    .from('order_products')
    .select('id, order_number, channel, payment_status')
    .eq('pickup_code', pickupCode)
    .maybeSingle()

  if (error) {
    console.error('[complete-product-pickup] Failed to load order:', error)
    throw error
  }

  return (data as OrderPickupRow | null) ?? null
}

serve(async (req: Request) => {
  const corsResponse = handleCors(req)
  if (corsResponse) return corsResponse

  try {
    const adminResult = await requireAdminContext(req)
    if (adminResult.response) return adminResult.response

    const admin = adminResult.context
    if (!admin) return json(req, { error: 'Unauthorized' }, { status: 401 })

    const body = (await req.json()) as RequestBody
    const pickupCode = String(body.pickupCode || '').trim().toUpperCase()
    if (!pickupCode) {
      return jsonError(req, 400, 'Missing pickup code')
    }

    const pickedUpBy = admin.user.id;
    const order = await loadOrderByPickupCode(admin.supabaseService, pickupCode);
    if (!order) {
      return jsonError(req, 404, 'Order not found')
    }

    const paymentStatus = String(order.payment_status || '').toLowerCase()
    const channel = String(order.channel || '').toLowerCase()
    if (paymentStatus !== 'paid' && channel !== 'cashier') {
      return jsonError(req, 409, 'Order not paid')
    }

    const rpcName = paymentStatus === 'paid'
      ? 'complete_product_pickup_atomic'
      : 'complete_cashier_product_pickup_atomic'

    const { data: completionResult, error: completionError } = await admin.supabaseService.rpc(
      rpcName,
      {
        p_pickup_code: pickupCode,
        p_picked_up_by: pickedUpBy,
      }
    )

    if (completionError) {
      console.error('[complete-product-pickup] RPC failed:', completionError)
      return jsonError(req, 500, 'Failed to complete pickup')
    }

    const result =
      completionResult && typeof completionResult === 'object' ? (completionResult as CompletePickupResult) : null
    if (!result) {
      return jsonError(req, 500, 'Invalid pickup completion result')
    }

    if (!result.ok) {
      return jsonError(req, mapPickupErrorStatus(result.code), result.message || 'Failed to complete pickup')
    }

    return json(req, {
      status: 'ok',
      orderId: result.orderId ?? null,
      pickupCode: result.pickupCode ?? pickupCode,
      pickupStatus: result.pickupStatus ?? 'completed',
    })
  } catch (error) {
    console.error('[complete-product-pickup] Unexpected error:', error)
    return jsonError(req, 500, 'Internal server error')
  }
})
