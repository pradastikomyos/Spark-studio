/**
 * Expire Product Orders Edge Function
 * 
 * Auto-expires unpicked product orders past pickup_expires_at.
 * Updates order status and releases reserved stock.
 * 
 * Schedule: Daily at 00:10 WIB (17:10 UTC)
 */

import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface OrderItem {
    product_variant_id: number;
    quantity: number;
}

Deno.serve(async (req) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        console.log('[Expire Product Orders] Starting auto-expiry process...');

        const now = new Date().toISOString();

        // Find orders that are pending pickup and past expiry
        const { data: expiredOrders, error: fetchError } = await supabase
            .from('order_products')
            .select('id, order_number, pickup_status, pickup_expires_at')
            .eq('pickup_status', 'pending')
            .eq('payment_status', 'paid')
            .lt('pickup_expires_at', now);

        if (fetchError) {
            console.error('[Expire Product Orders] Error fetching orders:', fetchError);
            return new Response(
                JSON.stringify({
                    success: false,
                    error: fetchError.message,
                    timestamp: now
                }),
                {
                    status: 500,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                }
            );
        }

        if (!expiredOrders || expiredOrders.length === 0) {
            console.log('[Expire Product Orders] No expired orders found');
            return new Response(
                JSON.stringify({
                    success: true,
                    expired_count: 0,
                    message: 'No expired orders found',
                    timestamp: now
                }),
                {
                    status: 200,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                }
            );
        }

        console.log(`[Expire Product Orders] Found ${expiredOrders.length} expired order(s)`);

        let expiredCount = 0;
        const failedOrders: string[] = [];

        for (const order of expiredOrders) {
            try {
                // Get order items to release stock
                const { data: orderItems, error: itemsError } = await supabase
                    .from('order_product_items')
                    .select('product_variant_id, quantity')
                    .eq('order_id', order.id);

                if (itemsError) {
                    console.error(`[Expire Product Orders] Error fetching items for order ${order.order_number}:`, itemsError);
                    failedOrders.push(order.order_number);
                    continue;
                }

                // Release stock for each item
                if (orderItems && orderItems.length > 0) {
                    for (const item of orderItems as OrderItem[]) {
                        const { error: releaseError } = await supabase.rpc('release_product_stock', {
                            p_variant_id: item.product_variant_id,
                            p_quantity: item.quantity,
                        });

                        if (releaseError) {
                            console.error(`[Expire Product Orders] Error releasing stock for variant ${item.product_variant_id}:`, releaseError);
                        }
                    }
                }

                // Update order status to expired
                const { error: updateError } = await supabase
                    .from('order_products')
                    .update({
                        pickup_status: 'expired',
                        status: 'expired',
                        stock_released_at: now
                    })
                    .eq('id', order.id);

                if (updateError) {
                    console.error(`[Expire Product Orders] Error updating order ${order.order_number}:`, updateError);
                    failedOrders.push(order.order_number);
                    continue;
                }

                expiredCount++;
                console.log(`[Expire Product Orders] Expired order: ${order.order_number}`);

            } catch (orderErr) {
                console.error(`[Expire Product Orders] Error processing order ${order.order_number}:`, orderErr);
                failedOrders.push(order.order_number);
            }
        }

        return new Response(
            JSON.stringify({
                success: true,
                expired_count: expiredCount,
                failed_count: failedOrders.length,
                failed_orders: failedOrders,
                timestamp: now,
                message: `Expired ${expiredCount} order(s)${failedOrders.length > 0 ? `, ${failedOrders.length} failed` : ''}`
            }),
            {
                status: 200,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
        );

    } catch (err) {
        console.error('[Expire Product Orders] Unexpected error:', err);
        return new Response(
            JSON.stringify({
                success: false,
                error: err instanceof Error ? err.message : 'Unknown error',
                timestamp: new Date().toISOString()
            }),
            {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
        );
    }
});
