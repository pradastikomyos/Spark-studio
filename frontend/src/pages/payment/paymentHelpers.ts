import { createWIBDate } from '../../utils/timezone';
import type { PaymentBookingDetails, PaymentLocationState, PaymentSuccessNavigationState } from './paymentTypes';

export function getPaymentBookingDetails(state: PaymentLocationState | null | undefined): PaymentBookingDetails {
  const ticketId = state?.ticketId || 0;
  const ticketName = state?.ticketName || 'Photo Session';
  const ticketType = state?.ticketType || 'entrance';
  const price = state?.price || 0;
  const bookingDate = state?.date || '';
  const timeSlot = state?.time || '';
  const quantity = state?.quantity || 1;

  return {
    ticketId,
    ticketName,
    ticketType,
    price,
    bookingDate,
    timeSlot,
    quantity,
    total: price * quantity,
  };
}

export function hasRequiredPaymentDetails(details: PaymentBookingDetails) {
  return Boolean(details.ticketId && details.price && details.bookingDate && details.timeSlot);
}

export function formatPaymentDate(dateString: string) {
  if (!dateString) return '-';
  const date = createWIBDate(dateString);
  return date.toLocaleDateString('en-US', {
    timeZone: 'Asia/Jakarta',
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function buildBookingSuccessState(params: {
  orderNumber: string;
  orderId: string | number;
  ticketName: string;
  total: number;
  date: string;
  time: string;
  customerName: string;
  paymentResult?: Record<string, unknown>;
}): PaymentSuccessNavigationState {
  return {
    orderNumber: params.orderNumber,
    orderId: params.orderId,
    ticketName: params.ticketName,
    total: params.total,
    date: params.date,
    time: params.time,
    customerName: params.customerName,
    paymentResult: params.paymentResult,
    isPending: true,
  };
}
