import { formatCurrency } from '../../utils/formatters';

type CheckoutPaymentSectionProps = {
  loading: boolean;
  canCheckout: boolean;
  finalTotal: number;
  cashierCheckoutEnabled: boolean;
  cashierDisabled: boolean;
  onPay: () => void;
  onCashierCheckout: () => void;
};

export function CheckoutPaymentSection({
  loading,
  canCheckout,
  finalTotal,
  cashierCheckoutEnabled,
  cashierDisabled,
  onPay,
  onCashierCheckout,
}: CheckoutPaymentSectionProps) {
  return (
    <>
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
        disabled={loading || !canCheckout}
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
            Pay {formatCurrency(finalTotal)} Now
          </>
        )}
      </button>

      {cashierCheckoutEnabled && (
        <button
          onClick={onCashierCheckout}
          disabled={loading || cashierDisabled}
          className="w-full mt-3 bg-white hover:bg-rose-50 disabled:bg-gray-100 disabled:cursor-not-allowed text-primary font-bold py-4 rounded-xl border border-rose-100 transition-all flex flex-col items-center justify-center"
        >
          <span>Bayar di Kasir</span>
          <span className="text-xs font-semibold text-rose-700 mt-1">Checkout at cashier</span>
        </button>
      )}
    </>
  );
}
