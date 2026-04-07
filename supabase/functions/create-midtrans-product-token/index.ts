import { serve } from '../_shared/deps.ts'
import { getMidtransBasicAuthHeader, getSnapUrl } from '../_shared/midtrans.ts'
import { handleCors, json, jsonError, jsonErrorWithDetails } from '../_shared/http.ts'
import { getMidtransEnv, getPublicAppUrl } from '../_shared/env.ts'
import { createServiceClient } from '../_shared/supabase.ts'
import { toNumber } from '../_shared/payment-effects.ts'
import { requireAuthenticatedRequest } from '../_shared/auth.ts'

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
  voucherCode?: string  // NEW: Optional voucher code for discount
}

type ReservedProductAdjustment = {
  variantId: number
  quantity: number
}

async function releaseReservedProductResources(params: {
  supabase: ReturnType<typeof createServiceClient>
  voucherId: string | null
  reservedAdjustments: ReservedProductAdjustment[]
}) {
  if (params.voucherId) {
    const { error } = await params.supabase.rpc('release_voucher_quota', { p_voucher_id: params.voucherId })
    if (error) {
      console.error('[create-midtrans-product-token] Failed to release voucher quota:', error)
    }
  }

  for (const adjustment of params.reservedAdjustments) {
    const { error } = await params.supabase.rpc('release_product_stock', {
      p_variant_id: adjustment.variantId,
      p_quantity: adjustment.quantity,
    })

    if (error) {
      console.error('[create-midtrans-product-token] Failed to release reserved stock:', error)
    }
  }
}

async function rollbackCreatedProductOrder(params: {
  supabase: ReturnType<typeof createServiceClient>
  orderId: number
  voucherId: string | null
  reservedAdjustments: ReservedProductAdjustment[]
}) {
  await params.supabase.from('order_product_items').delete().eq('order_product_id', params.orderId)
  await params.supabase.from('order_products').delete().eq('id', params.orderId)
  await releaseReservedProductResources({
    supabase: params.supabase,
    voucherId: params.voucherId,
    reservedAdjustments: params.reservedAdjustments,
  })
}

serve(async (req) => {
  const corsResponse = handleCors(req)
  if (corsResponse) return corsResponse

  try {
    const authResult = await requireAuthenticatedRequest(req)
    if (authResult.response) return authResult.response

    const auth = authResult.context!
    const { serverKey: midtransServerKey, isProduction: midtransIsProduction } = getMidtransEnv()

    // Create separate client with SERVICE ROLE KEY for database operations
    const supabase = createServiceClient(auth.supabaseEnv.url, auth.supabaseEnv.serviceRoleKey)

    const payload = (await req.json()) as CreateTokenRequest
    if (!payload.items || payload.items.length === 0) {
      return jsonError(req, 400, 'No items provided')
    }

    if (!payload.customerName?.trim()) {
      return jsonError(req, 400, 'Missing customer name')
    }

    if (!payload.customerEmail?.trim()) {
      return jsonError(req, 400, 'Missing customer email')
    }

    const userId = auth.user.id

    const normalizedItems: ProductItem[] = payload.items.map((i) => ({
      productVariantId: toNumber(i.productVariantId, 0),
      name: String(i.name || '').slice(0, 50),
      price: toNumber(i.price, 0),
      quantity: Math.max(1, Math.floor(toNumber(i.quantity, 1))),
    }))

    if (normalizedItems.some((i) => !i.productVariantId || !i.name || i.price < 0)) {
      return jsonError(req, 400, 'Invalid items')
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
      return jsonError(req, 500, 'Failed to load product variants')
    }

    const variantMap = new Map<number, { id: number; price: unknown; stock: unknown; reserved_stock: unknown; is_active: unknown }>()
    for (const row of variantRows as Array<{ id: number; price: unknown; stock: unknown; reserved_stock: unknown; is_active: unknown }>) {
      variantMap.set(Number(row.id), row)
    }

    const resolvedItems: Array<{ productVariantId: number; name: string; quantity: number; unitPrice: number }> = []
    for (const item of aggregatedItems) {
      const variant = variantMap.get(item.productVariantId)
      if (!variant) {
        return jsonError(req, 400, `Variant not found: ${item.productVariantId}`)
      }
      const unitPrice = toNumber((variant as { price: unknown }).price, 0)
      if (unitPrice <= 0) {
        return jsonError(req, 400, `Invalid price for variant: ${item.productVariantId}`)
      }
      resolvedItems.push({ ...item, unitPrice })
    }

    const totalAmount = resolvedItems.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0)
    const orderNumber = `PRD-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`
    const appUrl = getPublicAppUrl() ?? req.headers.get('origin') ?? ''
    if (!appUrl) {
      return jsonError(req, 500, 'Missing app url')
    }

    const now = new Date()

    // VOUCHER VALIDATION: Extract category IDs and validate voucher if provided
    let voucherId: string | null = null
    let voucherCode: string | null = null
    let discountAmount = 0

    if (payload.voucherCode?.trim()) {
      // Extract category IDs from product variants
      const { data: variantCategories, error: categoryError } = await supabase
        .from('product_variants')
        .select('product_id')
        .in('id', variantIds)

      if (categoryError || !variantCategories) {
        return jsonError(req, 500, 'Failed to load product categories')
      }

      const productIds = variantCategories.map((v: { product_id: number }) => v.product_id)
      const { data: products, error: productsError } = await supabase
        .from('products')
        .select('category_id')
        .in('id', productIds)

      if (productsError || !products) {
        return jsonError(req, 500, 'Failed to load product categories')
      }

      const categoryIds = products.map((p: { category_id: number }) => p.category_id).filter((id: number) => id != null)

      // Call validate_and_reserve_voucher RPC
      const { data: voucherResult, error: voucherError } = await supabase.rpc('validate_and_reserve_voucher', {
        p_code: payload.voucherCode.trim(),
        p_user_id: userId,
        p_subtotal: totalAmount,
        p_category_ids: categoryIds,
      })

      if (voucherError) {
        console.error('[create-midtrans-product-token] Voucher validation error:', voucherError.message)
        return jsonErrorWithDetails(req, 500, {
          error: 'Failed to validate voucher',
          code: 'VOUCHER_VALIDATION_ERROR',
          details: voucherError.message,
        })
      }

      // RPC returns array with single row
      const result = Array.isArray(voucherResult) ? voucherResult[0] : voucherResult

      if (result?.error_message) {
        // Voucher validation failed - return specific error
        let errorCode = 'VOUCHER_INVALID'
        const errorMsg = result.error_message

        if (errorMsg.includes('tidak aktif')) errorCode = 'VOUCHER_INACTIVE'
        else if (errorMsg.includes('belum berlaku')) errorCode = 'VOUCHER_NOT_YET_VALID'
        else if (errorMsg.includes('kadaluarsa')) errorCode = 'VOUCHER_EXPIRED'
        else if (errorMsg.includes('Kuota')) errorCode = 'VOUCHER_QUOTA_EXCEEDED'
        else if (errorMsg.includes('Minimum')) errorCode = 'VOUCHER_MIN_PURCHASE'
        else if (errorMsg.includes('kategori')) errorCode = 'VOUCHER_CATEGORY_MISMATCH'

        return jsonError(req, 400, {
          error: errorMsg,
          code: errorCode,
        })
      }

      // Voucher validated successfully - store details
      voucherId = result.voucher_id
      voucherCode = payload.voucherCode.trim().toUpperCase()
      discountAmount = toNumber(result.discount_amount, 0)

      console.log(`Voucher applied: ${voucherCode}, discount: ${discountAmount}`)
    }

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

    const reservedAdjustments: ReservedProductAdjustment[] = []

    for (const item of resolvedItems) {
      const row = variantMap.get(item.productVariantId)
      if (!row) {
        return jsonError(req, 400, 'Variant not found')
      }

      const isActive = (row as { is_active: unknown }).is_active
      if (isActive === false) {
        return jsonError(req, 400, `Variant inactive: ${item.productVariantId}`)
      }

      // Atomic reservation using RPC - prevents race conditions
      const { data: reserved, error: reserveError } = await supabase.rpc('reserve_product_stock', {
        p_variant_id: item.productVariantId,
        p_quantity: item.quantity,
      })

      if (reserveError || reserved !== true) {
        await releaseReservedProductResources({
          supabase,
          voucherId,
          reservedAdjustments,
        })
        return jsonError(req, 409, `Out of stock for ${item.name}`)
      }

      reservedAdjustments.push({ variantId: item.productVariantId, quantity: item.quantity })
    }

    const finalTotal = totalAmount - discountAmount

    const { data: order, error: orderError } = await supabase
      .from('order_products')
      .insert({
        order_number: orderNumber,
        user_id: userId,
        channel: 'online',
        status: 'awaiting_payment',
        payment_status: 'unpaid',
        subtotal: totalAmount,
        discount_amount: discountAmount,
        shipping_cost: 0,
        shipping_discount: 0,
        total: finalTotal,
        voucher_id: voucherId,
        voucher_code: voucherCode,
        payment_expired_at: paymentExpiredAt.toISOString(),
        created_at: now.toISOString(),
        updated_at: now.toISOString(),
      })
      .select('id')
      .single()

    if (orderError || !order) {
      await releaseReservedProductResources({
        supabase,
        voucherId,
        reservedAdjustments,
      })

      console.error('[create-midtrans-product-token] Failed to create order:', orderError?.message)
      return jsonErrorWithDetails(req, 500, {
        error: 'Failed to create order',
        code: 'ORDER_CREATE_FAILED',
        details: orderError?.message,
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
      await rollbackCreatedProductOrder({
        supabase,
        orderId,
        voucherId,
        reservedAdjustments,
      })

      console.error('[create-midtrans-product-token] Failed to create order items:', itemsError.message)
      return jsonErrorWithDetails(req, 500, {
        error: 'Failed to create order items',
        code: 'ORDER_ITEMS_CREATE_FAILED',
        details: itemsError.message,
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

    const midtransPayload = {
      transaction_details: {
        order_id: orderNumber,
        gross_amount: finalTotal,  // Use discounted total
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
      await rollbackCreatedProductOrder({
        supabase,
        orderId,
        voucherId,
        reservedAdjustments,
      })

      console.error('[create-midtrans-product-token] Midtrans error:', midtransData)
      return jsonErrorWithDetails(req, 500, {
        error: 'Failed to create payment token',
        code: 'MIDTRANS_TOKEN_FAILED',
        details: midtransData,
      })
    }

    await supabase
      .from('order_products')
      .update({
        payment_url: (midtransData as { redirect_url?: string }).redirect_url ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId)

    return json(req, {
      token: (midtransData as { token?: string }).token,
      redirect_url: (midtransData as { redirect_url?: string }).redirect_url,
      order_number: orderNumber,
      order_id: orderId,
      discount_amount: discountAmount,  // Include discount for frontend display
    })
  } catch {
    return jsonError(req, 500, 'Internal server error')
  }
})
