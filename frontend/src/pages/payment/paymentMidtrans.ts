import { supabase } from '../../lib/supabase';
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

  return { session: sessionData.session, error: null };
}

export async function createMidtransToken(params: {
  booking: PaymentBookingDetails;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  token: string;
}) {
  const response = await withTimeout(
    fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-midtrans-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${params.token}`,
      },
      body: JSON.stringify({
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
      }),
    }),
    15000,
    'Request timeout. Please try again.'
  );

  const data = (await response.json()) as MidtransTokenResponse & { error?: string };

  if (!response.ok) {
    const error = new Error(data.error || 'Failed to create payment') as Error & { status?: number };
    error.status = response.status;
    throw error;
  }

  return data;
}
