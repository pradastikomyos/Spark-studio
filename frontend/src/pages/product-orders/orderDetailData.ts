import { supabase } from '../../lib/supabase';
import { createQuerySignal } from '../../lib/fetchers';
import { withTimeout } from '../../utils/queryHelpers';
import type { ProductOrderDetail, ProductOrderItem } from './types';

type ProductOrderItemRow = {
  id: number | string;
  quantity: number | string;
  price: number | string;
  subtotal: number | string;
  product_variants?: {
    name?: string;
    products?: {
      name?: string;
      image_url?: string | null;
      product_images?: { image_url?: string | null; is_primary?: boolean }[] | null;
    } | null;
  } | null;
};

export function mapProductOrderItemRows(rows: ProductOrderItemRow[] | null | undefined): ProductOrderItem[] {
  return (rows || []).map((row) => {
    const variant = row.product_variants;
    const product = variant?.products;

    let imageUrl = product?.image_url ?? undefined;
    if (!imageUrl && product?.product_images && Array.isArray(product.product_images)) {
      const primaryImage = product.product_images.find((image) => image.is_primary);
      imageUrl = primaryImage?.image_url ?? product.product_images[0]?.image_url ?? undefined;
    }

    return {
      id: Number(row.id),
      quantity: Number(row.quantity),
      price: Number(row.price),
      subtotal: Number(row.subtotal),
      productName: String(product?.name ?? 'Product'),
      variantName: String(variant?.name ?? 'Variant'),
      imageUrl,
    };
  });
}

export async function fetchProductOrderDetail(orderNumber: string) {
  const primarySelect =
    'id, order_number, channel, payment_status, status, pickup_code, pickup_status, pickup_expires_at, paid_at, total, created_at, payment_url, payment_data, voucher_code, discount_amount';
  const fallbackSelect =
    'id, order_number, channel, payment_status, status, pickup_code, pickup_status, pickup_expires_at, paid_at, total, created_at, payment_url, voucher_code, discount_amount';

  const { signal: timeoutSignal, cleanup, didTimeout } = createQuerySignal(undefined, 10000);

  try {
    let result = await withTimeout(
      supabase
        .from('order_products')
        .select(primarySelect)
        .eq('order_number', orderNumber)
        .abortSignal(timeoutSignal)
        .single(),
      10000,
      'Request timeout'
    );

    const errorCode = (result.error as { code?: string } | null)?.code;
    if (result.error && (errorCode === '42703' || errorCode === 'PGRST204')) {
      result = await withTimeout(
        supabase
          .from('order_products')
          .select(fallbackSelect)
          .eq('order_number', orderNumber)
          .abortSignal(timeoutSignal)
          .single(),
        10000,
        'Request timeout'
      );
    }

    if (result.error || !result.data) {
      throw result.error ?? new Error('Order not found');
    }

    const order = result.data as unknown as ProductOrderDetail;
    const orderId = Number((result.data as { id: number | string }).id);

    const { data: itemRows, error: itemsError } = await withTimeout(
      supabase
        .from('order_product_items')
        .select(
          'id, quantity, price, subtotal, product_variants(name, product_id, products(name, image_url, product_images(image_url, is_primary)))'
        )
        .eq('order_product_id', orderId)
        .abortSignal(timeoutSignal),
      10000,
      'Request timeout'
    );

    if (itemsError) {
      throw itemsError;
    }

    return {
      order,
      items: mapProductOrderItemRows(itemRows as ProductOrderItemRow[] | null | undefined),
    };
  } catch (error) {
    if (didTimeout()) {
      throw new Error('Request timeout');
    }

    throw error;
  } finally {
    cleanup();
  }
}
