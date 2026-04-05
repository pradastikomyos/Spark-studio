import { createSupabaseFunctionError } from '../../../lib/supabaseFunctionError';
import { supabase } from '../../../lib/supabase';
import { ensureFreshToken } from '../../../utils/auth';
import type { ProductOrderDetails } from './productOrdersTypes';

export async function loadProductOrderDetailsByPickupCode(pickupCode: string): Promise<ProductOrderDetails> {
  const normalizedPickupCode = pickupCode.trim().toUpperCase();
  const { data: orderRow, error: orderError } = await supabase
    .from('order_products')
    .select(
      'id, order_number, channel, total, pickup_code, pickup_status, paid_at, payment_status, status, pickup_expires_at, profiles(name, email)'
    )
    .eq('pickup_code', normalizedPickupCode)
    .single();

  if (orderError || !orderRow) {
    throw orderError ?? new Error('Order not found');
  }

  const paymentStatus = String((orderRow as { payment_status?: string }).payment_status || '').toLowerCase();
  if (paymentStatus !== 'paid') {
    const channel = String((orderRow as { channel?: string | null }).channel || '').toLowerCase();
    if (channel !== 'cashier') throw new Error('Order belum dibayar');
  }

  const pickupStatus = String((orderRow as { pickup_status?: string | null }).pickup_status || '').toLowerCase();
  if (pickupStatus === 'completed') throw new Error('Barang sudah diambil');
  if (pickupStatus === 'expired') throw new Error('Pickup code sudah expired');

  const expiresAt = (orderRow as { pickup_expires_at?: string | null }).pickup_expires_at ?? null;
  if (expiresAt && Date.now() > new Date(expiresAt).getTime()) {
    throw new Error('Pickup code sudah expired');
  }

  const orderId = Number((orderRow as { id: number | string }).id);
  const { data: itemRows, error: itemsError } = await supabase
    .from('order_product_items')
    .select('id, quantity, price, subtotal, product_variants(name, products(name))')
    .eq('order_product_id', orderId);

  if (itemsError) throw itemsError;

  const items = (itemRows || []).map((row) => {
    const variant = (row as { product_variants?: { name?: string; products?: { name?: string } | null } | null })
      .product_variants;
    return {
      id: Number((row as { id: number | string }).id),
      quantity: Number((row as { quantity: number | string }).quantity),
      price: Number((row as { price: number | string }).price),
      subtotal: Number((row as { subtotal: number | string }).subtotal),
      variantName: String(variant?.name ?? 'Variant'),
      productName: String(variant?.products?.name ?? 'Product'),
    };
  });

  const profileRow = (orderRow as { profiles?: { name?: string; email?: string } | { name?: string; email?: string }[] | null })
    .profiles;
  const profile = Array.isArray(profileRow) ? (profileRow[0] ?? null) : profileRow;
  const normalizedOrder: ProductOrderDetails['order'] = {
    id: Number((orderRow as { id: number | string }).id),
    order_number: String((orderRow as { order_number?: string }).order_number ?? ''),
    total: Number((orderRow as { total?: number | string }).total ?? 0),
    pickup_code: ((orderRow as { pickup_code?: string | null }).pickup_code ?? null),
    pickup_status: ((orderRow as { pickup_status?: string | null }).pickup_status ?? null),
    paid_at: ((orderRow as { paid_at?: string | null }).paid_at ?? null),
    updated_at: null,
    created_at: null,
    profiles: profile ? { name: profile.name, email: profile.email } : null,
    channel: ((orderRow as { channel?: string | null }).channel ?? null),
    payment_status: String((orderRow as { payment_status?: string }).payment_status ?? ''),
    status: String((orderRow as { status?: string }).status ?? ''),
    pickup_expires_at: ((orderRow as { pickup_expires_at?: string | null }).pickup_expires_at ?? null),
  };

  return {
    order: normalizedOrder,
    items,
  };
}

export async function completeProductPickup(params: {
  pickupCode: string;
  session: Parameters<typeof ensureFreshToken>[0];
}) {
  const token = await ensureFreshToken(params.session);
  if (!token) {
    throw new Error('Sesi login tidak valid. Silakan login ulang.');
  }
  const { error: invokeError, response } = await supabase.functions.invoke('complete-product-pickup', {
    body: { pickupCode: params.pickupCode.trim().toUpperCase() },
    headers: { Authorization: `Bearer ${token}` },
  });

  if (invokeError) {
    const parsedError = await createSupabaseFunctionError({
      error: invokeError,
      response,
      fallbackMessage: 'Gagal memverifikasi barang',
    });
    const status = parsedError.status;
    if (status === 401) {
      throw new Error('Sesi login kadaluarsa. Silakan login ulang.');
    }
    throw parsedError;
  }
}
