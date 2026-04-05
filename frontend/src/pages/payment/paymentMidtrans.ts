import { supabase } from '../../lib/supabase';
import { getSupabaseFunctionStatus } from '../../lib/supabaseFunctionError';
import { invokeSupabaseFunction } from '../../lib/supabaseFunctionInvoke';
import { ensureFreshToken } from '../../utils/auth';
import { withTimeout } from '../../utils/queryHelpers';
import type { MidtransTokenResponse, PaymentBookingDetails } from './paymentTypes';

export async function validatePaymentSession() {
  const { data: userData, error: userError } = await withTimeout(
    supabase.auth.getUser(),
    5000,
    'Session timeout. Please try again.'
  );

  if (userError || !userData.user) {
    return { session: null, error: userError ?? new Error('Session validation failed') };
  }

  const { data: sessionData } = await withTimeout(
    supabase.auth.getSession(),
    5000,
    'Session timeout. Please try again.'
  );

  const session = sessionData.session;
  const accessToken = await ensureFreshToken(session ?? null);

  if (!session || !accessToken) {
    return { session: null, error: new Error('Session validation failed') };
  }

  return {
    session: {
      ...session,
      access_token: accessToken,
    },
    error: null,
  };
}

export async function createMidtransToken(params: {
  booking: PaymentBookingDetails;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  token: string;
}) {
  const invoke = (accessToken: string) =>
    withTimeout(
      invokeSupabaseFunction<MidtransTokenResponse>({
        functionName: 'create-midtrans-token',
        body: {
          items: [
            {
              ticketId: params.booking.ticketId,
              ticketName: params.booking.ticketName,
              price: params.booking.price,
              quantity: params.booking.quantity,
              date: params.booking.bookingDate,
              timeSlot: params.booking.timeSlot,
            },
          ],
          customerName: params.customerName,
          customerEmail: params.customerEmail,
          customerPhone: params.customerPhone || undefined,
        },
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        fallbackMessage: 'Failed to create payment',
      }),
      15000,
      'Request timeout. Please try again.'
    );

  let accessToken = params.token;
  let data: MidtransTokenResponse | null = null;

  try {
    data = await invoke(accessToken);
  } catch (error) {
    if (getSupabaseFunctionStatus(error) === 401) {
      const { data: refreshData, error: refreshError } = await withTimeout(
        supabase.auth.refreshSession(),
        5000,
        'Session refresh timeout. Please try again.'
      );

      if (!refreshError) {
        const refreshedToken = await ensureFreshToken(refreshData.session ?? null);
        if (refreshedToken) {
          accessToken = refreshedToken;
          data = await invoke(accessToken);
        } else {
          throw error;
        }
      } else {
        throw error;
      }
    } else {
      throw error;
    }
  }

  if (!data?.token || !data?.order_number) {
    throw new Error('Payment token response was incomplete');
  }

  return data as MidtransTokenResponse;
}
