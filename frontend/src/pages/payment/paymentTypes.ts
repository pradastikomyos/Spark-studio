import type { SnapResult } from '../../utils/midtransSnap';
import type { BookingState } from '../../utils/bookingStateManager';

export interface PaymentLocationState {
  ticketId?: number;
  ticketName?: string;
  ticketType?: string;
  price?: number;
  quantity?: number;
  date?: string;
  time?: string;
}

export interface PaymentBookingDetails {
  ticketId: number;
  ticketName: string;
  ticketType: string;
  price: number;
  bookingDate: string;
  timeSlot: string;
  quantity: number;
  total: number;
}

export interface MidtransTokenResponse {
  token: string;
  order_id: string | number;
  order_number: string;
}

export interface PaymentSuccessNavigationState {
  orderNumber: string;
  orderId: string | number;
  ticketName: string;
  total: number;
  date: string;
  time: string;
  customerName: string;
  paymentResult?: SnapResult;
  isPending: true;
}

export type PreservedBookingData = Omit<BookingState, 'timestamp'>;
