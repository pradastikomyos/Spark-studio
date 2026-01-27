import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

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
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const midtransServerKey = Deno.env.get('MIDTRANS_SERVER_KEY')!
  const midtransIsProduction = Deno.env.get('MIDTRANS_IS_PRODUCTION') === 'true'

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const token = authHeader.replace('Bearer ', '')
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token)

    if (authError || !user?.id) {
      return new Response(JSON.stringify({ error: 'Invalid token', details: authError?.message }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

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

    const totalAmount = normalizedItems.reduce((sum, item) => sum + item.price * item.quantity, 0)
    const orderNumber = `PRD-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`

    const now = new Date()
    
    // Dynamic payment expiry based on stock scarcity
    // Industry standard: Scarce inventory requires faster payment
    let minStockLevel = Infinity
    for (const item of normalizedItems) {
      const { data: variantRow } = await supabase
        .from('product_variants')
        .select('stock, reserved_stock')
        .eq('id', item.productVariantId)
        .single()
      
      if (variantRow) {
        const available = (variantRow.stock ?? 0) - (variantRow.reserved_stock ?? 0)
        minStockLevel = Math.min(minStockLevel, available)
      }
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

    for (const item of normalizedItems) {
      const { data: variantRow, error: variantReadError } = await supabase
        .from('product_variants')
        .select('id, stock, reserved_stock')
        .eq('id', item.productVariantId)
        .single()

      if (variantReadError || !variantRow) {
        return new Response(JSON.stringify({ error: 'Variant not found', details: variantReadError?.message }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const available = (variantRow.stock ?? 0) - (variantRow.reserved_stock ?? 0)
      if (available < item.quantity) {
        return new Response(JSON.stringify({ error: `Out of stock for ${item.name}` }), {
          status: 409,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const { data: updated, error: reserveError } = await supabase
        .from('product_variants')
        .update({ reserved_stock: (variantRow.reserved_stock ?? 0) + item.quantity, updated_at: new Date().toISOString() })
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

    const orderItems = normalizedItems.map((item) => ({
      order_product_id: orderId,
      product_variant_id: item.productVariantId,
      quantity: item.quantity,
      price: item.price,
      discount_amount: 0,
      subtotal: item.price * item.quantity,
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

    const midtransUrl = midtransIsProduction ? 'https://app.midtrans.com/snap/v1/transactions' : 'https://app.sandbox.midtrans.com/snap/v1/transactions'
    const authString = btoa(`${midtransServerKey}:`)

    const itemDetails = normalizedItems.map((item) => ({
      id: `variant-${item.productVariantId}`,
      price: item.price,
      quantity: item.quantity,
      name: item.name,
    }))

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
        finish: `${req.headers.get('origin')}/order/product/success/${orderNumber}`,
      },
    }

    const midtransResponse = await fetch(midtransUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${authString}`,
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
