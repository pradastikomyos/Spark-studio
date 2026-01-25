import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

type RequestBody = {
  pickupCode: string
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

  try {
    const authHeader = req.headers.get('Authorization') ?? req.headers.get('authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey)
    const supabaseService = createClient(supabaseUrl, supabaseServiceKey)
    const token = authHeader.replace(/Bearer\s*/i, '').trim()
    const {
      data: { user },
      error: authError,
    } = await supabaseAuth.auth.getUser(token)

    if (authError || !user?.id || !user.email) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: roleRows, error: roleError } = await supabaseService
      .from('user_role_assignments')
      .select('role_name')
      .eq('user_id', user.id)

    if (roleError) {
      return new Response(JSON.stringify({ error: 'Failed to verify role' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const isAdmin = Array.isArray(roleRows) && roleRows.some((r) => String((r as { role_name?: string }).role_name).toLowerCase() === 'admin')
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const body = (await req.json()) as RequestBody
    const pickupCode = String(body.pickupCode || '').trim()
    if (!pickupCode) {
      return new Response(JSON.stringify({ error: 'Missing pickup code' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: userRow, error: userRowError } = await supabaseService.from('users').select('id').eq('email', user.email).single()
    if (userRowError || !userRow) {
      return new Response(JSON.stringify({ error: 'User record not found' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const pickedUpBy = (userRow as { id: number }).id

    const { data: order, error: orderError } = await supabaseService
      .from('order_products')
      .select('id, payment_status, pickup_status, pickup_expires_at')
      .eq('pickup_code', pickupCode)
      .single()

    if (orderError || !order) {
      return new Response(JSON.stringify({ error: 'Order not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (String((order as { payment_status?: string }).payment_status).toLowerCase() !== 'paid') {
      return new Response(JSON.stringify({ error: 'Order not paid' }), {
        status: 409,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (String((order as { pickup_status?: string }).pickup_status || '').toLowerCase() === 'completed') {
      return new Response(JSON.stringify({ error: 'Order already completed' }), {
        status: 409,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const expiresAt = (order as { pickup_expires_at?: string | null }).pickup_expires_at
    if (expiresAt && Date.now() > new Date(expiresAt).getTime()) {
      await supabaseService
        .from('order_products')
        .update({ pickup_status: 'expired', updated_at: new Date().toISOString() })
        .eq('id', (order as { id: number }).id)
      return new Response(JSON.stringify({ error: 'Pickup code expired' }), {
        status: 409,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const orderId = (order as { id: number }).id
    const { data: items, error: itemsError } = await supabaseService
      .from('order_product_items')
      .select('product_variant_id, quantity')
      .eq('order_product_id', orderId)

    if (itemsError || !Array.isArray(items)) {
      return new Response(JSON.stringify({ error: 'Failed to load order items' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    for (const row of items) {
      const variantId = Number((row as { product_variant_id: number | string }).product_variant_id)
      const qty = Math.max(1, Math.floor(Number((row as { quantity: number | string }).quantity)))

      const { data: variant, error: variantError } = await supabaseService
        .from('product_variants')
        .select('id, stock, reserved_stock')
        .eq('id', variantId)
        .single()

      if (variantError || !variant) {
        return new Response(JSON.stringify({ error: 'Variant not found' }), {
          status: 409,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const stock = (variant as { stock?: number }).stock ?? 0
      const reserved = (variant as { reserved_stock?: number }).reserved_stock ?? 0
      if (reserved < qty || stock < qty) {
        return new Response(JSON.stringify({ error: 'Insufficient stock' }), {
          status: 409,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const { error: updateVariantError } = await supabaseService
        .from('product_variants')
        .update({
          stock: stock - qty,
          reserved_stock: reserved - qty,
          updated_at: new Date().toISOString(),
        })
        .eq('id', variantId)

      if (updateVariantError) {
        return new Response(JSON.stringify({ error: 'Failed to update stock' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
    }

    const { error: updateOrderError } = await supabaseService
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
      return new Response(JSON.stringify({ error: 'Failed to update order' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ status: 'ok' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch {
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
