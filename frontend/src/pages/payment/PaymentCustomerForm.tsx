import { formatCurrency } from '../../utils/formatters';
import type { PaymentBookingDetails } from './paymentTypes';

type PaymentCustomerFormProps = {
  bookingDetails: PaymentBookingDetails;
  loading: boolean;
  snapLoaded: boolean;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  onChangeCustomerName: (value: string) => void;
  onChangeCustomerPhone: (value: string) => void;
  onPay: () => void;
};

export function PaymentCustomerForm({
  bookingDetails,
  loading,
  snapLoaded,
  customerName,
  customerPhone,
  customerEmail,
  onChangeCustomerName,
  onChangeCustomerPhone,
  onPay,
}: PaymentCustomerFormProps) {
  const nameInputId = 'payment-customer-name';
  const phoneInputId = 'payment-customer-phone';
  const emailInputId = 'payment-customer-email';

  return (
    <div className="bg-white p-6 rounded-xl border border-rose-100 shadow-sm">
      <h1 className="text-2xl font-bold mb-6">Complete Payment</h1>

      <div className="space-y-5 mb-8">
        <div className="space-y-1.5">
          <label htmlFor={nameInputId} className="text-sm font-semibold text-neutral-950">
            Your Name <span className="text-red-500">*</span>
          </label>
          <input
            id={nameInputId}
            type="text"
            value={customerName}
            onChange={(event) => onChangeCustomerName(event.target.value)}
            className="w-full rounded-lg border border-rose-100 focus:ring-primary focus:border-primary text-sm py-3 px-4"
            placeholder="Enter your full name"
            disabled={loading}
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor={phoneInputId} className="text-sm font-semibold text-neutral-950">Phone Number (Optional)</label>
          <input
            id={phoneInputId}
            type="tel"
            value={customerPhone}
            onChange={(event) => onChangeCustomerPhone(event.target.value)}
            className="w-full rounded-lg border border-rose-100 focus:ring-primary focus:border-primary text-sm py-3 px-4"
            placeholder="08xxxxxxxxxx"
            disabled={loading}
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor={emailInputId} className="text-sm font-semibold text-neutral-950">Email</label>
          <input
            id={emailInputId}
            type="email"
            value={customerEmail}
            className="w-full rounded-lg border border-rose-100 text-sm py-3 px-4 bg-gray-50"
            disabled
          />
          <p className="text-xs text-rose-700">Ticket will be sent to this email</p>
        </div>
      </div>

      <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-100">
        <div className="flex items-start gap-3">
          <span className="material-symbols-outlined text-blue-500">info</span>
          <div>
            <p className="text-sm font-medium text-blue-800">Secure Payment via Midtrans</p>
            <p className="text-xs text-blue-600 mt-1">
              You can pay using Credit Card, Bank Transfer, E-Wallet (GoPay, OVO, ShopeePay), QRIS, and more.
            </p>
          </div>
        </div>
      </div>

      <button
        onClick={onPay}
        disabled={loading || !bookingDetails.ticketId || !bookingDetails.price || !snapLoaded}
        className="w-full bg-[#ff4b86] hover:bg-[#e63d75] disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <span className="material-symbols-outlined animate-spin">progress_activity</span>
            Processing...
          </>
        ) : (
          <>
            <span className="material-symbols-outlined text-[20px]">lock</span>
            Pay {formatCurrency(bookingDetails.total)} Now
          </>
        )}
      </button>

      <div className="mt-6 pt-6 border-t border-rose-100">
        <p className="text-xs text-center text-rose-700 mb-3">Supported Payment Methods</p>
        <div className="flex justify-center items-center gap-4 flex-wrap opacity-60">
          <img
            alt="Visa"
            className="h-5"
            src="https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Visa_Inc._logo.svg/200px-Visa_Inc._logo.svg.png"
          />
          <img
            alt="Mastercard"
            className="h-5"
            src="https://upload.wikimedia.org/wikipedia/commons/thumb/2/2a/Mastercard-logo.svg/200px-Mastercard-logo.svg.png"
          />
          <div className="px-2 py-1 bg-cyan-500 rounded text-white text-[10px] font-bold">GoPay</div>
          <div className="px-2 py-1 bg-purple-700 rounded text-white text-[10px] font-bold">OVO</div>
          <div className="px-2 py-1 bg-orange-500 rounded text-white text-[10px] font-bold">ShopeePay</div>
          <div className="px-2 py-1 bg-gray-800 rounded text-white text-[10px] font-bold">QRIS</div>
        </div>
      </div>
    </div>
  );
}
