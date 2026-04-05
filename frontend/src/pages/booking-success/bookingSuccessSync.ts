import { getSupabaseFunctionStatus } from '../../lib/supabaseFunctionError';
import { invokeSupabaseFunction } from '../../lib/supabaseFunctionInvoke';
import { getValidatedAccessToken } from '../../auth/sessionAccess';
import { withTimeout } from '../../utils/queryHelpers';
import type { OrderState } from './bookingSuccessTypes';

type SessionLike = { access_token?: string | null; expires_at?: number | null } | null;

export async function getBookingSuccessAccessToken(params: {
  session: SessionLike;
  validateSession: () => Promise<boolean>;
}) {
  return getValidatedAccessToken({
    session: params.session,
    validateSession: params.validateSession,
    timeoutMs: 8000,
    timeoutMessage: 'Session fetch timeout',
  });
}

export async function syncBookingSuccessStatus(params: {
  orderNumber: string;
  getValidAccessToken: () => Promise<string | null>;
  retryWithFreshToken?: () => Promise<string | null>;
  retryCount?: number;
}): Promise<{ order: OrderState | null }> {
  const { orderNumber, getValidAccessToken, retryWithFreshToken, retryCount = 0 } = params;
  const token = await withTimeout(getValidAccessToken(), 10000, 'Session validation timeout');
  if (!token) {
    throw new Error('Not authenticated');
  }

  try {
    const data = await withTimeout(
      invokeSupabaseFunction<{ order?: OrderState }>({
        functionName: 'sync-midtrans-status',
        body: { order_number: orderNumber },
        headers: { Authorization: `Bearer ${token}` },
        fallbackMessage: 'Failed to sync status',
      }),
      12000,
      'Request timeout'
    );

    return { order: (data as { order?: OrderState } | null)?.order ?? null };
  } catch (error) {
    const errorStatus = getSupabaseFunctionStatus(error);
    if (errorStatus === 401 && retryCount < 1 && typeof retryWithFreshToken === 'function') {
      const refreshedToken = await retryWithFreshToken();
      if (refreshedToken) {
        return syncBookingSuccessStatus({
          orderNumber,
          getValidAccessToken: async () => refreshedToken,
          retryWithFreshToken,
          retryCount: retryCount + 1,
        });
      }

      await new Promise((resolve) => setTimeout(resolve, 1000));
      return syncBookingSuccessStatus({
        orderNumber,
        getValidAccessToken,
        retryWithFreshToken,
        retryCount: retryCount + 1,
      });
    }

    throw error;
  }
}
