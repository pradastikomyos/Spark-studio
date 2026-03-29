import { supabase } from '../../lib/supabase';
import { ensureFreshToken } from '../../utils/auth';
import { withTimeout } from '../../utils/queryHelpers';
import type { MidtransTokenResponse, PaymentBookingDetails } from './paymentTypes';

type InvokeErrorWithContext = {
  message?: string;
  status?: number;
  context?: {
    status?: number;
    statusCode?: number;
    response?: Response;
    error?: unknown;
  };
};

const getInvokeResponse = (invokeError: unknown): Response | null => {
  const error = invokeError as InvokeErrorWithContext | null | undefined;
  const context = error?.context as unknown;

  if (context instanceof Response) {
    return context;
  }

  if (context && typeof context === 'object' && 'response' in context) {
    const response = (context as { response?: unknown }).response;
    return response instanceof Response ? response : null;
  }

  return null;
};

const getInvokeStatus = (invokeError: unknown) => {
  const error = invokeError as InvokeErrorWithContext | null | undefined;
  return error?.status ?? error?.context?.status ?? error?.context?.statusCode ?? error?.context?.response?.status;
};

const getInvokeErrorMessage = async (invokeError: unknown) => {
  const error = invokeError as InvokeErrorWithContext | null | undefined;
  const rawContext = error?.context?.error;

  if (typeof rawContext === 'string' && rawContext.trim()) {
    return rawContext;
  }

  if (rawContext && typeof rawContext === 'object') {
    const contextError = rawContext as { error?: string; message?: string };
    if (contextError.error?.trim()) return contextError.error;
    if (contextError.message?.trim()) return contextError.message;
  }

  const response = getInvokeResponse(invokeError);
  if (response) {
    try {
      const responseData = (await response.clone().json()) as { error?: string; message?: string; details?: string };
      if (responseData.details?.trim()) return responseData.details;
      if (responseData.error?.trim()) return responseData.error;
      if (responseData.message?.trim()) return responseData.message;
    } catch {
      try {
        const responseText = await response.clone().text();
        if (responseText.trim()) return responseText.trim();
      } catch {
        // Ignore response parsing failures and fall back to the generic error message.
      }
    }
  }

  return error?.message || null;
};

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
      supabase.functions.invoke('create-midtrans-token', {
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
      }),
      15000,
      'Request timeout. Please try again.'
    );

  let accessToken = params.token;
  let { data, error } = await invoke(accessToken);

  if (error && getInvokeStatus(error) === 401) {
    const { data: refreshData, error: refreshError } = await withTimeout(
      supabase.auth.refreshSession(),
      5000,
      'Session refresh timeout. Please try again.'
    );

    if (!refreshError) {
      const refreshedToken = await ensureFreshToken(refreshData.session ?? null);
      if (refreshedToken) {
        accessToken = refreshedToken;
        const retry = await invoke(accessToken);
        data = retry.data;
        error = retry.error ?? null;
      }
    }
  }

  if (error) {
    const invokeError = new Error((await getInvokeErrorMessage(error)) || 'Failed to create payment') as Error & {
      status?: number;
    };
    invokeError.status = getInvokeStatus(error);
    throw invokeError;
  }

  if (!data?.token || !data?.order_number) {
    throw new Error('Payment token response was incomplete');
  }

  return data as MidtransTokenResponse;
}
