import { serve } from '../_shared/deps.ts'
import { getMidtransBasicAuthHeader, getSnapUrl } from '../_shared/midtrans.ts'
import { corsHeaders, handleCors } from '../_shared/http.ts'
import { getMidtransEnv, getPublicAppUrl, getSupabaseEnv } from '../_shared/env.ts'
import { createServiceClient, getUserFromAuthHeader } from '../_shared/supabase.ts'

type ProductItem = {
  productVariantId: number
  name: string
  price: number
  quantity: number
}

type CreateTokenRequest = {
  items: ProductItem[]
  customerName: string
  customerEmail: string
  customerPhone?: string
}

function toNumber(value: unknown, fallback: number) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : fallback
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : fallback
  }
  return fallback
}

serve(async (req) => {
  const corsResponse = handleCors(req)
  if (corsResponse) return corsResponse

  const { url: supabaseUrl, anonKey: supabaseAnonKey, serviceRoleKey: supabaseServiceKey } = getSupabaseEnv()
  const { serverKey: midtransServerKey, isProduction: midtransIsProduction } = getMidtransEnv()

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // CRITICAL FIX: Use ANON KEY with Authorization header in client config
    // According to Supabase docs: Pass Authorization header to client, then call getUser() without params
    // This ensures proper JWT validation with RLS context
    const { user, error: authError } = await getUserFromAuthHeader({
      url: supabaseUrl,
      anonKey: supabaseAnonKey,
      authHeader,
    })

    if (authError || !user?.id) {
      console.error('Auth error:', authError)
      const isExpired = authError?.message?.toLowerCase().includes('expired')
      return new Response(
        JSON.stringify({
          error: isExpired ? 'Session Expired' : 'Unauthorized',
          code: isExpired ? 'SESSION_EXPIRED' : 'INVALID_TOKEN',
          message: authError?.message || 'Invalid or expired session'
        }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Create separate client with SERVICE ROLE KEY for database operations
    const supabase = createServiceClient(supabaseUrl, supabaseServiceKey)

    const payload = (await req.json()) as CreateTokenRequest
    if (!payload.items || payload.items.length === 0) {
      return new Response(JSON.stringify({ error: 'No items provided' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!payload.customerName?.trim()) {
      return new Response(JSON.stringify({ error: 'Missing customer name' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!payload.customerEmail?.trim()) {
      return new Response(JSON.stringify({ error: 'Missing customer email' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const userId = user.id

    const normalizedItems: ProductItem[] = payload.items.map((i) => ({
      productVariantId: toNumber(i.productVariantId, 0),
      name: String(i.name || '').slice(0, 50),
      price: toNumber(i.price, 0),
      quantity: Math.max(1, Math.floor(toNumber(i.quantity, 1))),
    }))

    if (normalizedItems.some((i) => !i.productVariantId || !i.name || i.price < 0)) {
      return new Response(JSON.stringify({ error: 'Invalid items' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const aggregatedItemsByVariant = new Map<number, { productVariantId: number; name: string; quantity: number }>()
    for (const item of normalizedItems) {
      const existing = aggregatedItemsByVariant.get(item.productVariantId)
      if (existing) {
        existing.quantity += item.quantity
      } else {
        aggregatedItemsByVariant.set(item.productVariantId, {
          productVariantId: item.productVariantId,
          name: item.name,
          quantity: item.quantity,
        })
      }
    }

    const aggregatedItems = Array.from(aggregatedItemsByVariant.values())
    const variantIds = aggregatedItems.map((item) => item.productVariantId)

    const { data: variantRows, error: variantsError } = await supabase
      .from('product_variants')
      .select('id, price, stock, reserved_stock, is_active')
      .in('id', variantIds)

    if (variantsError || !Array.isArray(variantRows)) {
      return new Response(JSON.stringify({ error: 'Failed to load product variants' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const variantMap = new Map<number, { id: number; price: unknown; stock: unknown; reserved_stock: unknown; is_active: unknown }>()
    for (const row of variantRows as Array<{ id: number; price: unknown; stock: unknown; reserved_stock: unknown; is_active: unknown }>) {
      variantMap.set(Number(row.id), row)
    }

    const resolvedItems: Array<{ productVariantId: number; name: string; quantity: number; unitPrice: number }> = []
    for (const item of aggregatedItems) {
      const variant = variantMap.get(item.productVariantId)
      if (!variant) {
        return new Response(JSON.stringify({ error: `Variant not found: ${item.productVariantId}` }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      const unitPrice = toNumber((variant as { price: unknown }).price, 0)
      if (unitPrice <= 0) {
        return new Response(JSON.stringify({ error: `Invalid price for variant: ${item.productVariantId}` }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      resolvedItems.push({ ...item, unitPrice })
    }

    const totalAmount = resolvedItems.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0)
    const orderNumber = `PRD-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`

    const now = new Date()

    // Dynamic payment expiry based on stock scarcity
    // Industry standard: Scarce inventory requires faster payment
    let minStockLevel = Infinity
    for (const item of resolvedItems) {
      const row = variantMap.get(item.productVariantId)
      if (!row) continue
      const stock = toNumber((row as { stock: unknown }).stock, 0)
      const reserved = toNumber((row as { reserved_stock: unknown }).reserved_stock, 0)
      const available = stock - reserved
      minStockLevel = Math.min(minStockLevel, available)
    }

    // Formula: Low stock = shorter payment window to prevent inventory deadlock
    // Stock < 5: 15 minutes (high urgency)
    // Stock 5-20: 30 minutes (medium urgency)
    // Stock > 20: 60 minutes (low urgency)
    let paymentExpiryMinutes = 60 // Default 1 hour
    if (minStockLevel < 5) {
      paymentExpiryMinutes = 15
    } else if (minStockLevel < 20) {
      paymentExpiryMinutes = 30
    }

    console.log(`Payment expiry set to ${paymentExpiryMinutes} minutes (min stock level: ${minStockLevel})`)

    const paymentExpiredAt = new Date(now.getTime() + paymentExpiryMinutes * 60 * 1000)

    const reservedAdjustments: { variantId: number; quantity: number }[] = []

    for (const item of resolvedItems) {
      const row = variantMap.get(item.productVariantId)
      if (!row) {
        return new Response(JSON.stringify({ error: 'Variant not found' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const isActive = (row as { is_active: unknown }).is_active
      if (isActive === false) {
        return new Response(JSON.stringify({ error: `Variant inactive: ${item.productVariantId}` }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const stock = toNumber((row as { stock: unknown }).stock, 0)
      const reserved = toNumber((row as { reserved_stock: unknown }).reserved_stock, 0)
      const available = stock - reserved
      if (available < item.quantity) {
        return new Response(JSON.stringify({ error: `Out of stock for ${item.name}` }), {
          status: 409,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const { data: updated, error: reserveError } = await supabase
        .from('product_variants')
        .update({ reserved_stock: reserved + item.quantity, updated_at: new Date().toISOString() })
        .eq('id', item.productVariantId)
        .select('id')

      if (reserveError || !updated || updated.length === 0) {
        return new Response(JSON.stringify({ error: 'Failed to reserve stock', details: reserveError?.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      reservedAdjustments.push({ variantId: item.productVariantId, quantity: item.quantity })
    }

    const { data: order, error: orderError } = await supabase
      .from('order_products')
      .insert({
        order_number: orderNumber,
        user_id: userId,
        channel: 'online',
        status: 'awaiting_payment',
        payment_status: 'unpaid',
        subtotal: totalAmount,
        discount_amount: 0,
        shipping_cost: 0,
        shipping_discount: 0,
        total: totalAmount,
        payment_expired_at: paymentExpiredAt.toISOString(),
        created_at: now.toISOString(),
        updated_at: now.toISOString(),
      })
      .select('id')
      .single()

    if (orderError || !order) {
      for (const a of reservedAdjustments) {
        const { data: variantRow } = await supabase.from('product_variants').select('reserved_stock').eq('id', a.variantId).single()
        const currentReserved = (variantRow as unknown as { reserved_stock?: number } | null)?.reserved_stock ?? 0
        await supabase
          .from('product_variants')
          .update({ reserved_stock: Math.max(0, currentReserved - a.quantity), updated_at: new Date().toISOString() })
          .eq('id', a.variantId)
      }

      return new Response(JSON.stringify({ error: 'Failed to create order', details: orderError?.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const orderId = (order as unknown as { id: number }).id

    const orderItems = resolvedItems.map((item) => ({
      order_product_id: orderId,
      product_variant_id: item.productVariantId,
      quantity: item.quantity,
      price: item.unitPrice,
      discount_amount: 0,
      subtotal: item.unitPrice * item.quantity,
      stock_type: 'ready',
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    }))

    const { error: itemsError } = await supabase.from('order_product_items').insert(orderItems)
    if (itemsError) {
      await supabase.from('order_products').delete().eq('id', orderId)
      for (const a of reservedAdjustments) {
        const { data: variantRow } = await supabase.from('product_variants').select('reserved_stock').eq('id', a.variantId).single()
        const currentReserved = (variantRow as unknown as { reserved_stock?: number } | null)?.reserved_stock ?? 0
        await supabase
          .from('product_variants')
          .update({ reserved_stock: Math.max(0, currentReserved - a.quantity), updated_at: new Date().toISOString() })
          .eq('id', a.variantId)
      }

      return new Response(JSON.stringify({ error: 'Failed to create order items', details: itemsError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const midtransUrl = getSnapUrl(midtransIsProduction)
    const authString = getMidtransBasicAuthHeader(midtransServerKey)

    const itemDetails = resolvedItems.map((item) => ({
      id: `variant-${item.productVariantId}`,
      price: item.unitPrice,
      quantity: item.quantity,
      name: item.name,
    }))

    const appUrl = getPublicAppUrl() ?? req.headers.get('origin') ?? ''
    if (!appUrl) {
      return new Response(JSON.stringify({ error: 'Missing app url' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const midtransPayload = {
      transaction_details: {
        order_id: orderNumber,
        gross_amount: totalAmount,
      },
      item_details: itemDetails,
      customer_details: {
        first_name: payload.customerName.trim(),
        email: payload.customerEmail,
        phone: payload.customerPhone || '',
      },
      custom_expiry: {
        expiry_duration: paymentExpiryMinutes,
        unit: 'minute',
      },
      callbacks: {
        finish: `${appUrl}/order/product/success/${orderNumber}`,
      },
    }

    const midtransResponse = await fetch(midtransUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authString,
      },
      body: JSON.stringify(midtransPayload),
    })

    const midtransData = await midtransResponse.json()
    if (!midtransResponse.ok) {
      await supabase.from('order_product_items').delete().eq('order_product_id', orderId)
      await supabase.from('order_products').delete().eq('id', orderId)
      for (const a of reservedAdjustments) {
        const { data: variantRow } = await supabase.from('product_variants').select('reserved_stock').eq('id', a.variantId).single()
        const currentReserved = (variantRow as unknown as { reserved_stock?: number } | null)?.reserved_stock ?? 0
        await supabase
          .from('product_variants')
          .update({ reserved_stock: Math.max(0, currentReserved - a.quantity), updated_at: new Date().toISOString() })
          .eq('id', a.variantId)
      }

      return new Response(JSON.stringify({ error: 'Failed to create payment token', details: midtransData }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    await supabase
      .from('order_products')
      .update({
        payment_url: (midtransData as { redirect_url?: string }).redirect_url ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId)

    return new Response(
      JSON.stringify({
        token: (midtransData as { token?: string }).token,
        redirect_url: (midtransData as { redirect_url?: string }).redirect_url,
        order_number: orderNumber,
        order_id: orderId,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch {
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
