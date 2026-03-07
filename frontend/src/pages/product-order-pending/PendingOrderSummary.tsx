import { Link } from 'react-router-dom';
import { formatCurrency } from '../../utils/formatters';
import type { ProductOrderDetail } from '../product-orders/types';

type PendingOrderSummaryProps = {
  order: ProductOrderDetail;
  allowPayNow: boolean;
  refreshing: boolean;
  onSyncStatus: () => void;
};

export function PendingOrderSummary({
  order,
  allowPayNow,
  refreshing,
  onSyncStatus,
}: PendingOrderSummaryProps) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 flex flex-col h-full sticky top-24">
      <h2 className="text-2xl font-display text-gray-900 mb-8">Order Summary</h2>
      <div className="space-y-4 flex-grow text-sm">
        <div className="flex justify-between items-center">
          <span className="text-gray-500">Subtotal</span>
          <span className="font-medium">{formatCurrency(Number(order.total ?? 0))}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-500">Tax (Included)</span>
          <span className="font-medium">-</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-500">Shipping</span>
          <span className="font-medium">{formatCurrency(0)}</span>
        </div>
        <div className="border-t border-dashed border-gray-100 pt-6 mt-6 flex justify-between items-center">
          <span className="text-lg font-bold">Total</span>
          <span className="text-2xl font-bold text-primary">{formatCurrency(Number(order.total ?? 0))}</span>
        </div>
      </div>

      <div className="mt-10 space-y-4">
        {allowPayNow && order.payment_url ? (
          <a
            href={order.payment_url}
            target="_blank"
            rel="noreferrer"
            className="w-full bg-primary hover:bg-primary-dark text-white font-bold py-4 rounded-xl shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-2"
          >
            PAY NOW <span className="material-symbols-outlined transition-transform">arrow_forward</span>
          </a>
        ) : (
          <Link
            to="/my-orders"
            className="w-full bg-primary hover:bg-primary-dark text-white font-bold py-4 rounded-xl shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined">receipt_long</span>
            <span className="text-xs tracking-widest uppercase">View My Orders</span>
          </Link>
        )}

        <button
          onClick={onSyncStatus}
          disabled={refreshing}
          className="w-full border-2 border-gray-100 hover:border-primary/30 py-4 rounded-xl font-bold text-gray-600 transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
        >
          {refreshing ? 'CHECKING...' : 'CHECK STATUS'}
        </button>

        <Link
          to="/shop"
          className="w-full text-[10px] font-bold tracking-widest text-gray-400 hover:text-primary transition-colors flex items-center justify-center mt-4"
        >
          <span className="material-symbols-outlined text-sm mr-2">arrow_back</span>
          CONTINUE SHOPPING
        </Link>
      </div>
    </div>
  );
}
