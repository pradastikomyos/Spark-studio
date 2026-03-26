import { formatCurrency } from '../../../utils/formatters';
import type { ProductOrderDetails } from './productOrdersTypes';

type ProductOrderDetailsModalProps = {
  details: ProductOrderDetails | null;
  submitting: boolean;
  actionError: string | null;
  onClose: () => void;
  onCompletePickup: () => void;
};

export function ProductOrderDetailsModal({
  details,
  submitting,
  actionError,
  onClose,
  onCompletePickup,
}: ProductOrderDetailsModalProps) {
  if (!details) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 animate-fade-in" onClick={onClose}></div>
      <div
        className="relative w-full max-w-2xl rounded-xl bg-white border border-gray-200 shadow-xl animate-fade-in-scale"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="p-6 border-b border-gray-200 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-widest text-gray-500">Pickup Code</p>
            <h3 className="text-2xl font-bold text-neutral-900 truncate">{details.order.pickup_code}</h3>
            <p className="mt-1 text-sm text-gray-500">
              {details.order.profiles?.name ?? details.order.profiles?.email ?? 'Customer'}
            </p>
          </div>
          <button className="text-gray-600 hover:text-gray-900" onClick={onClose} aria-label="Close">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="p-6">
          {actionError && <div className="mb-4 text-sm text-red-600">{actionError}</div>}
          <div className="space-y-3">
            {details.items.map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-neutral-900 truncate">{item.productName}</p>
                  <p className="text-xs text-gray-500 truncate">
                    {item.variantName} · {item.quantity} × {formatCurrency(item.price)}
                  </p>
                </div>
                <span className="text-sm font-bold text-neutral-900">{formatCurrency(item.subtotal)}</span>
              </div>
            ))}
          </div>

          <div className="mt-6 border-t border-gray-200 pt-4 flex items-center justify-between">
            <span className="text-xs uppercase tracking-widest text-gray-500">Total</span>
            <span className="text-xl font-bold text-primary">{formatCurrency(Number(details.order.total ?? 0))}</span>
          </div>

          <button
            onClick={onCompletePickup}
            disabled={submitting}
            className="mt-6 w-full rounded-lg bg-[#ff4b86] px-6 py-3 text-sm font-bold text-white hover:bg-[#ff6a9a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? 'Memproses...' : 'Verifikasi Barang'}
          </button>
        </div>
      </div>
    </div>
  );
}
