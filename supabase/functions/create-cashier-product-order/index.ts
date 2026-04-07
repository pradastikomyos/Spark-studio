import { serve } from '../_shared/deps.ts'
import { handleCors, json, jsonError, jsonErrorWithDetails } from '../_shared/http.ts'
import { createServiceClient } from '../_shared/supabase.ts'
import { toNumber } from '../_shared/payment-effects.ts'
import { requireAuthenticatedRequest } from '../_shared/auth.ts'

type ProductItem = {
  productVariantId: number
  name: string
  price: number
  quantity: number
}

type CreateCashierOrderRequest = {
  items: ProductItem[]
  customerName: string
  customerEmail: string
  customerPhone?: string
  voucherCode?: string  // NEW: Optional voucher code for discount
}

function generatePickupCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let result = 'PU-'
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

async function getUniquePickupCode(supabase: ReturnType<typeof createServiceClient>) {
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const code = generatePickupCode()
    const { data, error } = await supabase
      .from('order_products')
      .select('id')
      .eq('pickup_code', code)
      .limit(1)
    if (error) {
      return null
    }
    if (!data || data.length === 0) {
      return code
    }
  }
  return null
}

serve(async (req) => {
  const corsResponse = handleCors(req)
  if (corsResponse) return corsResponse

  try {
    const authResult = await requireAuthenticatedRequest(req)
    if (authResult.response) return authResult.response

    const auth = authResult.context!
    const userId = auth.user.id

    const supabase = createServiceClient(auth.supabaseEnv.url, auth.supabaseEnv.serviceRoleKey)

    const payload = (await req.json()) as CreateCashierOrderRequest
    if (!payload.items || payload.items.length === 0) {
      return jsonError(req, 400, 'No items provided')
    }

    if (!payload.customerName?.trim()) {
      return jsonError(req, 400, 'Missing customer name')
    }

    if (!payload.customerEmail?.trim()) {
      return jsonError(req, 400, 'Missing customer email')
    }

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
        console.error('[CashierOrder] Voucher validation error:', voucherError.message)
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

    let pickupCode = ''
    const { data: pickupCodeRow, error: pickupCodeError } = await supabase.rpc('generate_pickup_code', {})
    if (!pickupCodeError) {
      pickupCode = String(pickupCodeRow || '').trim()
    }
    if (!pickupCode) {
      const fallback = await getUniquePickupCode(supabase)
      if (!fallback) {
        return jsonError(req, 500, 'Failed to generate pickup code')
      }
      pickupCode = fallback
    }

    const cashierQrExpiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString()

    const reservedAdjustments: { variantId: number; quantity: number }[] = []
    for (const item of resolvedItems) {
      const row = variantMap.get(item.productVariantId)
      if (!row) {
        return jsonError(req, 400, 'Variant not found')
      }

      const isActive = (row as { is_active: unknown }).is_active
      if (isActive === false) {
        return jsonError(req, 400, `Variant inactive: ${item.productVariantId}`)
      }

      const { data: reservedOk, error: reserveError } = await supabase.rpc('reserve_product_stock', {
        p_variant_id: item.productVariantId,
        p_quantity: item.quantity,
      })

      if (reserveError || reservedOk !== true) {
        // Rollback voucher quota if it was reserved
        if (voucherId) {
          await supabase.rpc('release_voucher_quota', { p_voucher_id: voucherId })
        }

        // Rollback previously reserved items
        for (const previous of reservedAdjustments) {
          await supabase.rpc('release_product_stock', {
            p_variant_id: previous.variantId,
            p_quantity: previous.quantity,
          })
        }
        const status = reserveError ? 500 : 409
        if (reserveError) {
          console.error('[CashierOrder] Failed to reserve stock:', reserveError.message)
          return jsonErrorWithDetails(req, status, {
            error: `Out of stock for ${item.name}`,
            code: 'RESERVE_PRODUCT_STOCK_FAILED',
            details: reserveError.message,
          })
        }
        return jsonError(req, status, `Out of stock for ${item.name}`)
      }

      reservedAdjustments.push({ variantId: item.productVariantId, quantity: item.quantity })
    }

    const finalTotal = totalAmount - discountAmount

    const { data: order, error: orderError } = await supabase
      .from('order_products')
      .insert({
        order_number: orderNumber,
        user_id: userId,
        channel: 'cashier',
        status: 'awaiting_payment',
        payment_status: 'unpaid',
        subtotal: totalAmount,
        discount_amount: discountAmount,
        shipping_cost: 0,
        shipping_discount: 0,
        total: finalTotal,
        voucher_id: voucherId,
        voucher_code: voucherCode,
        payment_expired_at: cashierQrExpiresAt,
        pickup_code: pickupCode,
        pickup_status: 'pending_pickup',
        pickup_expires_at: cashierQrExpiresAt,
        created_at: now.toISOString(),
        updated_at: now.toISOString(),
      })
      .select('id')
      .single()

    if (orderError || !order) {
      // Rollback voucher quota if it was reserved
      if (voucherId) {
        await supabase.rpc('release_voucher_quota', { p_voucher_id: voucherId })
      }
      
      for (const a of reservedAdjustments) {
        await supabase.rpc('release_product_stock', {
          p_variant_id: a.variantId,
          p_quantity: a.quantity,
        })
      }

      console.error('[CashierOrder] Failed to create order:', orderError?.message)
      return jsonError(req, 500, { error: 'Failed to create order' })
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
      
      // Rollback voucher quota if it was reserved
      if (voucherId) {
        await supabase.rpc('release_voucher_quota', { p_voucher_id: voucherId })
      }
      
      for (const a of reservedAdjustments) {
        await supabase.rpc('release_product_stock', {
          p_variant_id: a.variantId,
          p_quantity: a.quantity,
        })
      }

      console.error('[CashierOrder] Failed to create order items:', itemsError.message)
      return jsonError(req, 500, { error: 'Failed to create order items' })
    }

    if (voucherId) {
      const { error: voucherUsageError } = await supabase
        .from('voucher_usage')
        .upsert(
          {
            voucher_id: voucherId,
            user_id: userId,
            order_product_id: orderId,
            discount_amount: discountAmount,
            used_at: now.toISOString(),
          },
          { onConflict: 'order_product_id' }
        )
      if (voucherUsageError) {
        console.error('[CashierOrder] Failed to create voucher usage:', voucherUsageError.message)
      }
    }

    return json(req, { order_number: orderNumber, discount_amount: discountAmount }, { status: 200 })
  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : String(e)
    console.error('[CashierOrder] Unhandled error:', errorMessage)
    return jsonErrorWithDetails(req, 500, {
      error: 'Internal server error',
      code: 'UNHANDLED_EXCEPTION',
      details: errorMessage,
    })
  }
})
