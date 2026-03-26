import { withTimeout } from '../../utils/queryHelpers';

export async function syncProductOrderStatus(orderNumber: string, accessToken: string) {
  const response = await withTimeout(
    fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sync-midtrans-product-status`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ order_number: orderNumber }),
    }),
    15000,
    'Request timeout. Please try again.'
  );

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(
      typeof data?.error === 'string' && data.error.length > 0 ? data.error : 'Failed to sync status'
    );
  }

  return data;
}
