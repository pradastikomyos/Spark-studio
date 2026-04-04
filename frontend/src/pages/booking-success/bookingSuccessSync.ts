import { supabase } from '../../lib/supabase';
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

  const { data, error: invokeError } = await withTimeout(
    supabase.functions.invoke('sync-midtrans-status', {
      body: { order_number: orderNumber },
      headers: { Authorization: `Bearer ${token}` },
    }),
    12000,
    'Request timeout'
  );

  if (invokeError) {
    const errorStatus = (invokeError as { context?: { status?: number } }).context?.status;
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

    const errorMsg =
      (invokeError as { context?: { error?: string } }).context?.error ||
      invokeError.message ||
      'Failed to sync status';
    throw new Error(errorMsg);
  }

  const responseData = data as { order?: OrderState } | null;
  return { order: responseData?.order ?? null };
}
