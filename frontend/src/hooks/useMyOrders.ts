import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { supabaseAuthFetcher } from '../lib/fetchers';
import { useEffect } from 'react';
import { queryKeys } from '../lib/queryKeys';

export interface OrderItem {
  id: number;
  quantity: number;
  price: number;
  subtotal: number;
  productName: string;
  variantName: string;
  imageUrl?: string;
}

export interface ProductOrder {
  id: number;
  order_number: string;
  payment_status: string;
  status: string;
  pickup_code: string | null;
  pickup_status: string | null;
  pickup_expires_at: string | null;
  paid_at: string | null;
  total: number;
  created_at: string;
  itemCount: number;
  items: OrderItem[];
}

type OrderItemRow = {
  id: number;
  quantity: number;
  price: number;
  subtotal: number;
  product_variants?: {
    name?: string | null;
    products?: {
      name?: string | null;
      image_url?: string | null;
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
      const orders = await supabaseAuthFetcher(async () =>
        supabase
          .from('order_products')
          .select(
            `
            id,
            order_number,
            payment_status,
            status,
            pickup_code,
            pickup_status,
            pickup_expires_at,
            paid_at,
            total,
            created_at
          `
          )
          .abortSignal(signal)
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
      );

      const ordersWithItems = await Promise.all(
        (orders || []).map(async (order) => {
          const { data: itemsData } = await supabase
            .from('order_product_items')
            .select(
              `
              id,
              quantity,
              price,
              subtotal,
              product_variants (
                name,
                products (
                  name,
                  image_url
                )
              )
            `
            )
            .abortSignal(signal)
            .eq('order_product_id', order.id);

          const items: OrderItem[] = ((itemsData as OrderItemRow[] | null) || []).map((item) => ({
            id: item.id,
            quantity: item.quantity,
            price: item.price,
            subtotal: item.subtotal,
            productName: item.product_variants?.products?.name || 'Product',
            variantName: item.product_variants?.name || 'Variant',
            imageUrl: item.product_variants?.products?.image_url || undefined,
          }));

          const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
          return {
            ...order,
            itemCount,
            items,
          } as ProductOrder;
        })
      );

      return ordersWithItems as ProductOrder[];
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
