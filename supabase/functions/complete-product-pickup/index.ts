import { serve } from '../_shared/deps.ts'
import { handleCors, json, jsonError } from '../_shared/http.ts'
import { requireAdminContext } from '../_shared/admin.ts'
import { ensureProductPaidSideEffects } from '../_shared/payment-effects.ts'

type RequestBody = {
  pickupCode: string
}

serve(async (req) => {
  const corsResponse = handleCors(req)
  if (corsResponse) return corsResponse

  try {
    const adminResult = await requireAdminContext(req)
    if (adminResult.response) return adminResult.response

    const admin = adminResult.context
    if (!admin) return json(req, { error: 'Unauthorized' }, { status: 401 })

    const body = (await req.json()) as RequestBody
    const pickupCode = String(body.pickupCode || '').trim()
    if (!pickupCode) {
      return jsonError(req, 400, 'Missing pickup code')
    }

    const pickedUpBy = admin.user.id

    const { data: order, error: orderError } = await admin.supabaseService
      .from('order_products')
      .select('id, order_number, channel, status, payment_status, total, pickup_code, pickup_status, pickup_expires_at')
      .eq('pickup_code', pickupCode)
      .single()

    if (orderError || !order) {
      return jsonError(req, 404, 'Order not found')
    }

    const paymentStatus = String((order as { payment_status?: string }).payment_status || '').toLowerCase()
    const channel = String((order as { channel?: string }).channel || '').toLowerCase()
    if (paymentStatus !== 'paid') {
      if (channel !== 'cashier') {
        return jsonError(req, 409, 'Order not paid')
      }

      const nowIso = new Date().toISOString()
      await ensureProductPaidSideEffects({
        supabase: admin.supabaseService,
        order: order as unknown as {
          id: number
          order_number: string
          status?: string | null
          payment_status?: string | null
          total?: unknown
          pickup_code?: string | null
          pickup_status?: string | null
          pickup_expires_at?: string | null
        },
        nowIso,
        grossAmount: (order as { total?: unknown }).total,
        defaultStatus: String((order as { status?: unknown }).status || 'processing'),
        shouldSetPaidAt: true,
      })
    }

    if (String((order as { pickup_status?: string }).pickup_status || '').toLowerCase() === 'completed') {
      return jsonError(req, 409, 'Order already completed')
    }

    const expiresAt = (order as { pickup_expires_at?: string | null }).pickup_expires_at
    if (expiresAt && Date.now() > new Date(expiresAt).getTime()) {
      await admin.supabaseService
        .from('order_products')
        .update({ pickup_status: 'expired', updated_at: new Date().toISOString() })
        .eq('id', (order as { id: number }).id)
      return jsonError(req, 409, 'Pickup code expired')
    }

    const orderId = (order as { id: number }).id
    const { data: items, error: itemsError } = await admin.supabaseService
      .from('order_product_items')
      .select('product_variant_id, quantity')
      .eq('order_product_id', orderId)

    if (itemsError || !Array.isArray(items)) {
      return jsonError(req, 500, 'Failed to load order items')
    }

    for (const row of items) {
      const variantId = Number((row as { product_variant_id: number | string }).product_variant_id)
      const qty = Math.max(1, Math.floor(Number((row as { quantity: number | string }).quantity)))

      const { data: variant, error: variantError } = await admin.supabaseService
        .from('product_variants')
        .select('id, stock, reserved_stock')
        .eq('id', variantId)
        .single()

      if (variantError || !variant) {
        return jsonError(req, 409, 'Variant not found')
      }

      const stock = (variant as { stock?: number }).stock ?? 0
      const reserved = (variant as { reserved_stock?: number }).reserved_stock ?? 0
      if (reserved < qty || stock < qty) {
        return jsonError(req, 409, 'Insufficient stock')
      }

      const { error: updateVariantError } = await admin.supabaseService
        .from('product_variants')
        .update({
          stock: stock - qty,
          reserved_stock: reserved - qty,
          updated_at: new Date().toISOString(),
        })
        .eq('id', variantId)

      if (updateVariantError) {
        return jsonError(req, 500, 'Failed to update stock')
      }
    }

    const { error: updateOrderError } = await admin.supabaseService
      .from('order_products')
      .update({
        pickup_status: 'completed',
        picked_up_at: new Date().toISOString(),
        picked_up_by: pickedUpBy,
        status: 'completed',
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId)

    if (updateOrderError) {
      return jsonError(req, 500, 'Failed to update order')
    }

    return json(req, { status: 'ok' })
  } catch {
    return jsonError(req, 500, 'Internal server error')
  }
})
