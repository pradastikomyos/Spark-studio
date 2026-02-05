import { serve } from '../_shared/deps.ts'
import { corsHeaders, handleCors } from '../_shared/http.ts'
import { getMidtransEnv, getSupabaseEnv } from '../_shared/env.ts'
import { createServiceClient, getUserFromAuthHeader } from '../_shared/supabase.ts'
import { getMidtransBasicAuthHeader, getStatusBaseUrl } from '../_shared/midtrans.ts'
import { mapMidtransStatus } from '../_shared/tickets.ts'
import { ensureProductPaidSideEffects, releaseProductReservedStockIfNeeded } from '../_shared/payment-effects.ts'

/**
 * sync-midtrans-product-status
 * 
 * Active sync for product orders (BOPIS - Buy Online Pick Up In Store).
 * This function directly queries Midtrans API to get real-time payment status,
 * instead of waiting passively for webhook.
 * 
 * Similar to sync-midtrans-status but for order_products table.
 * Critical: Generates pickup_code when status changes to paid.
 */

serve(async (req) => {
    const corsResponse = handleCors(req)
    if (corsResponse) return corsResponse

    try {
        const { url: supabaseUrl, anonKey: supabaseAnonKey, serviceRoleKey: supabaseServiceKey } = getSupabaseEnv()
        const { serverKey: midtransServerKey, isProduction: midtransIsProduction } = getMidtransEnv()

        // 1. Auth Check (User must be logged in)
        const authHeader = req.headers.get('Authorization')
        if (!authHeader) {
            return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
                status: 401,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            })
        }

        const { user, error: authError } = await getUserFromAuthHeader({
            url: supabaseUrl,
            anonKey: supabaseAnonKey,
            authHeader,
        })

        if (authError || !user?.id) {
            return new Response(JSON.stringify({ error: 'Invalid token' }), {
                status: 401,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            })
        }

        // Use service role key for database operations
        const supabase = createServiceClient(supabaseUrl, supabaseServiceKey)

        const body = await req.json().catch(() => ({}))
        const orderNumber = String(body?.order_number || '')
        if (!orderNumber) {
            return new Response(JSON.stringify({ error: 'Missing order_number' }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            })
        }

        // 2. Fetch order from order_products table
        const { data: order, error: orderError } = await supabase
            .from('order_products')
            .select('id, user_id, order_number, status, payment_status, pickup_code, pickup_status, pickup_expires_at, total, stock_released_at')
            .eq('order_number', orderNumber)
            .single()

        if (orderError || !order) {
            return new Response(JSON.stringify({ error: 'Order not found' }), {
                status: 404,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            })
        }

        // Security: Only order owner can sync
        if (order.user_id !== user.id) {
            return new Response(JSON.stringify({ error: 'Forbidden' }), {
                status: 403,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            })
        }

        const previousPaymentStatus = String(order.payment_status || '').toLowerCase()

        // 3. Active Sync: Query Midtrans API directly
        const baseUrl = getStatusBaseUrl(midtransIsProduction)
        const authString = getMidtransBasicAuthHeader(midtransServerKey)
        const statusResponse = await fetch(`${baseUrl}/v2/${encodeURIComponent(orderNumber)}/status`, {
            method: 'GET',
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
                Authorization: authString,
            },
        })

        const statusData = await statusResponse.json().catch(() => null)
        if (!statusResponse.ok) {
            return new Response(JSON.stringify({ error: 'Failed to fetch Midtrans status', details: statusData }), {
                status: 502,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            })
        }

        // 4. Map Midtrans status to our internal status
        const midtransStatus = mapMidtransStatus(statusData?.transaction_status, statusData?.fraud_status)
        const nowIso = new Date().toISOString()

        // 5. Prepare update fields
        const paymentStatus =
            midtransStatus === 'paid'
                ? 'paid'
                : midtransStatus === 'refunded'
                    ? 'refunded'
                    : midtransStatus === 'failed' || midtransStatus === 'expired'
                        ? 'failed'
                        : 'unpaid'

        const orderStatus =
            midtransStatus === 'paid'
                ? 'processing'
                : midtransStatus === 'expired'
                    ? 'expired'
                    : midtransStatus === 'failed'
                        ? 'cancelled'
                        : order.status || 'awaiting_payment'

        const updateFields: Record<string, unknown> = {
            status: orderStatus,
            payment_status: paymentStatus,
            payment_data: statusData,
            updated_at: nowIso,
        }

        if (midtransStatus === 'expired') {
            updateFields.expired_at = nowIso
        }

        const { data: updatedOrder, error: updateError } = await supabase
            .from('order_products')
            .update(updateFields)
            .eq('id', order.id)
            .select('id, order_number, status, payment_status, pickup_code, pickup_status, pickup_expires_at, paid_at, total, stock_released_at')
            .single()

        if (updateError || !updatedOrder) {
            return new Response(JSON.stringify({ error: 'Failed to update order' }), {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            })
        }

        if (midtransStatus === 'paid' && (previousPaymentStatus !== 'paid' || !updatedOrder.pickup_code)) {
            await ensureProductPaidSideEffects({
                supabase,
                order: updatedOrder as unknown as {
                    id: number
                    order_number: string
                    status?: string | null
                    payment_status?: string | null
                    total?: unknown
                    pickup_code?: string | null
                    pickup_status?: string | null
                    pickup_expires_at?: string | null
                    stock_released_at?: string | null
                },
                nowIso,
                grossAmount: statusData?.gross_amount,
                defaultStatus: orderStatus,
                shouldSetPaidAt: true,
            })
        }

        if (midtransStatus === 'expired' || midtransStatus === 'failed' || midtransStatus === 'refunded') {
            await releaseProductReservedStockIfNeeded({
                supabase,
                order: updatedOrder as unknown as {
                    id: number
                    order_number: string
                    status?: string | null
                    payment_status?: string | null
                    total?: unknown
                    pickup_code?: string | null
                    pickup_status?: string | null
                    pickup_expires_at?: string | null
                    stock_released_at?: string | null
                },
                nowIso,
            })
        }

        return new Response(JSON.stringify({ status: 'ok', order: updatedOrder }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
    } catch {
        return new Response(JSON.stringify({ error: 'Internal server error' }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
    }
})
