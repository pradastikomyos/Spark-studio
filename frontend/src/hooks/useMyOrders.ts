import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { supabaseAuthPaginatedFetcher, createQuerySignal } from '../lib/fetchers';
import { useEffect } from 'react';
import { queryKeys } from '../lib/queryKeys';
import type { ProductOrderItem, ProductOrderListItem } from '../pages/product-orders/types';

export type OrderItem = ProductOrderItem;
export type ProductOrder = ProductOrderListItem;

type OrderRow = {
  id: number;
  order_number: string;
  channel: string;
  payment_status: string;
  status: string;
  pickup_code: string | null;
  pickup_status: string | null;
  pickup_expires_at: string | null;
  paid_at: string | null;
  voucher_code: string | null;
  discount_amount: number | null;
  total: number;
  created_at: string;
};

type OrderItemRow = {
  id: number;
  order_product_id: number;
  quantity: number;
  price: number;
  subtotal: number;
  product_variants?: {
    name?: string | null;
    product_id?: number | null;
    products?: {
      name?: string | null;
      image_url?: string | null;
      product_images?: { image_url?: string | null; is_primary?: boolean }[] | null;
    } | null;
  } | null;
};

export function useMyOrders(userId: string | null | undefined) {
  const queryClient = useQueryClient();
  const enabled = typeof userId === 'string' && userId.length > 0;

  const query = useQuery({
    queryKey: enabled ? queryKeys.myOrders(userId) : ['my-orders', 'invalid'],
    enabled,
    queryFn: async ({ signal }) => {
      const { signal: timeoutSignal, cleanup, didTimeout } = createQuerySignal(signal);
      try {
        const orders = await supabaseAuthPaginatedFetcher<OrderRow>(
          (from, to, sig) =>
            supabase
              .from('order_products')
              .select(
                `
                id,
                order_number,
                channel,
                payment_status,
                status,
                pickup_code,
                pickup_status,
                pickup_expires_at,
                paid_at,
                voucher_code,
                discount_amount,
                total,
                created_at
              `
              )
              .abortSignal(sig ?? timeoutSignal)
              .eq('user_id', userId)
              .order('created_at', { ascending: false })
              .range(from, to),
          timeoutSignal,
          500
        );

        if (orders.length === 0) {
          return [] as ProductOrder[];
        }

        const orderIds = orders.map((order) => order.id);
        const { data: itemsData, error: itemsError } = await supabase
          .from('order_product_items')
          .select(
            `
              id,
              order_product_id,
              quantity,
              price,
              subtotal,
              product_variants (
                name,
                product_id,
                products (
                  name,
                  image_url,
                  product_images (
                    image_url,
                    is_primary
                  )
                )
              )
            `
          )
          .abortSignal(timeoutSignal)
          .in('order_product_id', orderIds);

        if (itemsError) {
          throw itemsError;
        }

        const itemsByOrderId = new Map<number, ProductOrderItem[]>();
        const itemCountByOrderId = new Map<number, number>();

        for (const item of (itemsData as OrderItemRow[] | null) || []) {
          const product = item.product_variants?.products;
          const productImages = product?.product_images && Array.isArray(product.product_images) ? product.product_images : [];
          const primaryImage = productImages.find((img) => img.is_primary && img.image_url);
          const fallbackImage = productImages.find((img) => img.image_url);
          const imageUrl = primaryImage?.image_url || fallbackImage?.image_url || product?.image_url || undefined;

          const mappedItem: ProductOrderItem = {
            id: item.id,
            quantity: item.quantity,
            price: item.price,
            subtotal: item.subtotal,
            productName: product?.name || 'Product',
            variantName: item.product_variants?.name || 'Variant',
            imageUrl,
          };

          const existingItems = itemsByOrderId.get(item.order_product_id) ?? [];
          existingItems.push(mappedItem);
          itemsByOrderId.set(item.order_product_id, existingItems);
          itemCountByOrderId.set(item.order_product_id, (itemCountByOrderId.get(item.order_product_id) ?? 0) + item.quantity);
        }

        return orders.map((order) => ({
          ...order,
          itemCount: itemCountByOrderId.get(order.id) ?? 0,
          items: itemsByOrderId.get(order.id) ?? [],
        })) as ProductOrder[];
      } catch (error) {
        if (didTimeout()) {
          throw new Error('Request timeout');
        }
        throw error;
      } finally {
        cleanup();
      }
    },
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    staleTime: 0,
  });

  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel('my_orders_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'order_products', filter: `user_id=eq.${userId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: queryKeys.myOrders(userId) });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient, userId]);

  return query;
}
