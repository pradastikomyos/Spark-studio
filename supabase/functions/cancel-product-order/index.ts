import { serve } from '../_shared/deps.ts'
import { corsHeaders, handleCors, json } from '../_shared/http.ts'
import { getSupabaseEnv } from '../_shared/env.ts'
import { createServiceClient, getUserFromAuthHeader } from '../_shared/supabase.ts'

serve(async (req) => {
  const corsResponse = handleCors(req)
  if (corsResponse) return corsResponse

  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, { status: 405 })
  }

  try {
    const { url: supabaseUrl, anonKey: supabaseAnonKey, serviceRoleKey: supabaseServiceKey } = getSupabaseEnv()

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return json({ error: 'Missing authorization header' }, { status: 401 })

    const { user, error: authError } = await getUserFromAuthHeader({
      url: supabaseUrl,
      anonKey: supabaseAnonKey,
      authHeader,
    })
    if (authError || !user?.id) return json({ error: 'Invalid token' }, { status: 401 })

    const body = await req.json().catch(() => ({}))
    const orderNumber = String(body?.order_number || '').trim()
    if (!orderNumber) return json({ error: 'Missing order_number' }, { status: 400 })

    const supabase = createServiceClient(supabaseUrl, supabaseServiceKey)

    const { data: order, error: orderError } = await supabase
      .from('order_products')
      .select('id, user_id, order_number, status, payment_status')
      .eq('order_number', orderNumber)
      .single()

    if (orderError || !order) return json({ error: 'Order not found' }, { status: 404 })
    if (String(order.user_id) !== user.id) return json({ error: 'Forbidden' }, { status: 403 })

    const currentStatus = String((order as { status?: unknown }).status || '').toLowerCase()
    const currentPaymentStatus = String((order as { payment_status?: unknown }).payment_status || '').toLowerCase()

    if (currentPaymentStatus === 'paid') {
      return json({ status: 'ok', result: 'noop', reason: 'already_paid', order: { order_number: orderNumber } })
    }

    if (currentStatus === 'cancelled' || currentStatus === 'expired') {
      return json({ status: 'ok', result: 'noop', reason: 'already_final', order: { order_number: orderNumber } })
    }

    const nowIso = new Date().toISOString()
    const { data: updated, error: updateError } = await supabase
      .from('order_products')
      .update({ status: 'cancelled', updated_at: nowIso })
      .eq('id', (order as { id: number }).id)
      .not('status', 'in', '(cancelled,expired)')
      .select('id, order_number, status, payment_status, updated_at')
      .maybeSingle()

    if (updateError) {
      return new Response(JSON.stringify({ error: 'Failed to cancel order', details: updateError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!updated) {
      return json({ status: 'ok', result: 'noop', reason: 'already_final', order: { order_number: orderNumber } })
    }

    const { data: orderItems } = await supabase
      .from('order_product_items')
      .select('product_variant_id, quantity')
      .eq('order_product_id', (order as { id: number }).id)

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

    return json({ status: 'ok', result: 'cancelled', order: updated })
  } catch (e) {
    return new Response(JSON.stringify({ error: 'Internal server error', details: e instanceof Error ? e.message : String(e) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

