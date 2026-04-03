import { supabase } from '../../lib/supabase';
import { withTimeout } from '../../utils/queryHelpers';
import type { OrderState } from './bookingSuccessTypes';

type SessionLike = { access_token?: string | null; expires_at?: number | null } | null;
const ACCESS_TOKEN_BUFFER_MS = 60 * 1000;

function hasFreshAccessToken(session: SessionLike) {
  if (!session?.access_token) {
    return false;
  }

  if (!session.expires_at) {
    return true;
  }

  return session.expires_at * 1000 - Date.now() > ACCESS_TOKEN_BUFFER_MS;
}

async function readCurrentAccessToken() {
  const {
    data: { session: currentSession },
  } = await withTimeout(supabase.auth.getSession(), 8000, 'Session fetch timeout');

  return currentSession?.access_token ?? null;
}

export async function getBookingSuccessAccessToken(params: {
  session: SessionLike;
  validateSession: () => Promise<boolean>;
}) {
  const currentSession = params.session;

  if (hasFreshAccessToken(currentSession)) {
    return currentSession?.access_token ?? null;
  }

  const isValid = await params.validateSession();
  if (!isValid) {
    return null;
  }

  return readCurrentAccessToken();
}

export async function syncBookingSuccessStatus(params: {
  orderNumber: string;
  getValidAccessToken: () => Promise<string | null>;
  retryCount?: number;
}): Promise<{ order: OrderState | null }> {
  const { orderNumber, getValidAccessToken, retryCount = 0 } = params;
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
    if (errorStatus === 401 && retryCount < 1) {
      const { data: refreshed, error: refreshError } = await withTimeout(
        supabase.auth.refreshSession(),
        10000,
        'Session refresh timeout'
      );
      if (!refreshError && refreshed.session?.access_token) {
        return syncBookingSuccessStatus({
          orderNumber,
          getValidAccessToken: async () => refreshed.session?.access_token ?? null,
          retryCount: retryCount + 1,
        });
      }

      await new Promise((resolve) => setTimeout(resolve, 1000));
      return syncBookingSuccessStatus({
        orderNumber,
        getValidAccessToken,
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
