import { formatCurrency } from '../../utils/formatters';
import { formatPaymentDate } from './paymentHelpers';
import type { PaymentBookingDetails } from './paymentTypes';

type PaymentOrderSummaryProps = {
  bookingDetails: PaymentBookingDetails;
};

export function PaymentOrderSummary({ bookingDetails }: PaymentOrderSummaryProps) {
  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-xl border border-rose-100 shadow-sm">
        <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
          <span className="material-symbols-outlined text-primary">shopping_bag</span>
          Order Summary
        </h3>

        <div className="space-y-4">
          <div className="flex justify-between items-start border-b border-dashed border-rose-100 pb-4">
            <div>
              <p className="font-bold text-neutral-950">{bookingDetails.ticketName}</p>
              <p className="text-sm text-rose-700 capitalize">{bookingDetails.ticketType}</p>
            </div>
            <p className="font-semibold">{formatCurrency(bookingDetails.price)}</p>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <p className="text-rose-700">Quantity</p>
              <p className="text-neutral-950">{bookingDetails.quantity}</p>
            </div>
          </div>

          <div className="pt-4 border-t border-rose-100 mt-4">
            <div className="flex justify-between items-center mb-1">
              <p className="text-sm text-rose-700">Booking Date</p>
              <p className="text-sm font-medium">{formatPaymentDate(bookingDetails.bookingDate)}</p>
            </div>
            <div className="flex justify-between items-center">
              <p className="text-sm text-rose-700">Time Slot</p>
              <p className="text-sm font-medium">{bookingDetails.timeSlot}</p>
            </div>
          </div>

          <div className="pt-6 flex justify-between items-end">
            <p className="text-lg font-bold">Total Amount</p>
            <div className="text-right">
              <p className="text-2xl font-black text-primary tracking-tight">{formatCurrency(bookingDetails.total)}</p>
              <p className="text-[10px] text-rose-700 uppercase tracking-wider">Inclusive of all taxes</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4 p-4 bg-primary/5 rounded-lg border border-primary/10">
        <span className="material-symbols-outlined text-primary">verified_user</span>
        <p className="text-xs leading-relaxed text-rose-700">
          Your payment is secured by Midtrans with 256-bit SSL encryption.
        </p>
      </div>
    </div>
  );
}
