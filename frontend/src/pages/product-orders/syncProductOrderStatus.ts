import { getValidatedAccessToken, readCurrentAccessToken } from '../../auth/sessionAccess';
import { withTimeout } from '../../utils/queryHelpers';

type SessionLike = { access_token?: string | null; expires_at?: number | null } | null;

type SyncProductOrderStatusOptions = {
  retryWithFreshToken?: () => Promise<string | null>;
};

class ProductOrderSyncError extends Error {
  status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = 'ProductOrderSyncError';
    this.status = status;
  }
}

export async function readCurrentProductOrderAccessToken() {
  return readCurrentAccessToken(8000, 'Session fetch timeout. Please try again.');
}

export async function getProductOrderAccessToken(params: {
  session: SessionLike;
  validateSession: () => Promise<boolean>;
}) {
  return getValidatedAccessToken({
    session: params.session,
    validateSession: params.validateSession,
    timeoutMs: 8000,
    timeoutMessage: 'Session fetch timeout. Please try again.',
  });
}

async function requestProductOrderSync(orderNumber: string, accessToken: string) {
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
    throw new ProductOrderSyncError(
      typeof data?.error === 'string' && data.error.length > 0 ? data.error : 'Failed to sync status',
      response.status
    );
  }

  return data;
}

export async function syncProductOrderStatus(
  orderNumber: string,
  accessToken: string,
  options: SyncProductOrderStatusOptions = {}
) {
  try {
    return await requestProductOrderSync(orderNumber, accessToken);
  } catch (error) {
    if (
      error instanceof ProductOrderSyncError &&
      error.status === 401 &&
      typeof options.retryWithFreshToken === 'function'
    ) {
      const freshToken = await options.retryWithFreshToken();
      if (freshToken) {
        return requestProductOrderSync(orderNumber, freshToken);
      }
    }

    throw error;
  }
}
