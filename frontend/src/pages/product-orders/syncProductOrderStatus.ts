import { getValidatedAccessToken, readCurrentAccessToken } from '../../auth/sessionAccess';
import { getSupabaseFunctionStatus } from '../../lib/supabaseFunctionError';
import { invokeSupabaseFunction } from '../../lib/supabaseFunctionInvoke';
import { withTimeout } from '../../utils/queryHelpers';

type SessionLike = { access_token?: string | null; expires_at?: number | null } | null;

type SyncProductOrderStatusOptions = {
  retryWithFreshToken?: () => Promise<string | null>;
};

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
  return withTimeout(
    invokeSupabaseFunction({
      functionName: 'sync-midtrans-product-status',
      body: { order_number: orderNumber },
      headers: { Authorization: `Bearer ${accessToken}` },
      fallbackMessage: 'Failed to sync status',
    }),
    15000,
    'Request timeout. Please try again.'
  );
}

export async function syncProductOrderStatus(
  orderNumber: string,
  accessToken: string,
  options: SyncProductOrderStatusOptions = {}
) {
  try {
    return await requestProductOrderSync(orderNumber, accessToken);
  } catch (error) {
    if (getSupabaseFunctionStatus(error) === 401 && typeof options.retryWithFreshToken === 'function') {
      const freshToken = await options.retryWithFreshToken();
      if (freshToken) {
        return requestProductOrderSync(orderNumber, freshToken);
      }
    }

    throw error;
  }
}
