import type { TFunction } from 'i18next';
import { formatCurrency } from '../../utils/formatters';
import { formatDateTimeWIB } from '../../utils/timezone';
import { ProductOrderQrCard } from '../product-orders/ProductOrderQrCard';
import { ProductOrderStatusBadge } from '../product-orders/ProductOrderStatusBadge';
import type { ProductOrderListItem } from '../product-orders/types';
import { MyOrderExpandedDetail } from './MyOrderExpandedDetail';

type MyOrderCardProps = {
  order: ProductOrderListItem;
  isExpanded: boolean;
  isSyncing: boolean;
  onToggleExpand: () => void;
  onPayNow: () => void;
  onCancel: () => void;
  onSyncStatus: () => void;
  onViewDetails: () => void;
  statusBadge: { label: string; tone: 'yellow' | 'amber' | 'green' | 'gray' | 'red' | 'blue' };
  pickupInstruction: string;
  showPickupExpiry: boolean;
  showPickupQr: boolean;
  t: TFunction;
};

export function MyOrderCard({
  order,
  isExpanded,
  isSyncing,
  onToggleExpand,
  onPayNow,
  onCancel,
  onSyncStatus,
  onViewDetails,
  statusBadge,
  pickupInstruction,
  showPickupExpiry,
  showPickupQr,
  t,
}: MyOrderCardProps) {
  const isCashier = String(order.channel || '').toLowerCase() === 'cashier';
  const isPaid = String(order.payment_status || '').toLowerCase() === 'paid';

  return (
    <div className="group bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-main-300 transition-all overflow-hidden">
      <div className="p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <div className="flex-1">
            <div className="flex items-center flex-wrap gap-3 mb-2">
              <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-main-600">Order</span>
              <span className="w-1 h-1 rounded-full bg-gray-300"></span>
              <span className="text-xs font-medium text-gray-500 font-mono tracking-wide">#{order.order_number}</span>
              <span className="w-1 h-1 rounded-full bg-gray-300"></span>
              <ProductOrderStatusBadge label={statusBadge.label} tone={statusBadge.tone} />
              {order.voucher_code && (
                <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-700">
                  {t('myOrders.voucher.badge', { code: order.voucher_code })}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <span className="material-symbols-outlined text-base">schedule</span>
              <span>{order.created_at ? formatDateTimeWIB(order.created_at) : '-'}</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-xs text-gray-500 uppercase tracking-wider">Total</p>
              <p className="text-xl font-serif font-bold text-gray-900">{formatCurrency(order.total)}</p>
              <p className="text-xs text-gray-500">{order.itemCount} items</p>
            </div>
          </div>
        </div>

        {showPickupQr && order.pickup_code && (
          <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <ProductOrderQrCard
              pickupCode={order.pickup_code}
              pickupExpiresAt={showPickupExpiry ? order.pickup_expires_at : null}
              channel={order.channel}
              size={120}
              className="md:items-center"
            />
            <div className="text-center md:text-left mt-3 text-sm text-gray-600">
              {isCashier
                ? t(
                    'myOrders.pickup.instructions.cashier',
                    'Show this QR to the cashier to complete payment. Reservation expires if unpaid.'
                  )
                : pickupInstruction}
              {isCashier && (
                <p className="text-xs text-gray-500 mt-2">
                  {t('myOrders.pickup.cashierNote', 'Payment is completed after the cashier scans the QR.')}
                </p>
              )}
            </div>
          </div>
        )}

        <div className="mt-4 flex flex-wrap gap-3">
          <button
            onClick={onToggleExpand}
            className="flex-1 min-w-[160px] flex items-center justify-center gap-2 px-4 py-2 text-sm font-bold text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <span className="material-symbols-outlined text-lg">{isExpanded ? 'expand_less' : 'expand_more'}</span>
            {isExpanded ? t('myOrders.actions.hideItems') : t('myOrders.actions.viewItems')}
          </button>

          {!isPaid && !isCashier && (
            <>
              <button
                onClick={onPayNow}
                className="flex-1 min-w-[160px] flex items-center justify-center gap-2 px-4 py-2 text-sm font-bold text-white bg-main-600 rounded-lg hover:bg-main-700 transition-colors shadow-sm"
              >
                <span className="material-symbols-outlined text-lg">arrow_forward</span>
                {t('myOrders.actions.payNow', 'Pay Now')}
              </button>
              <button
                onClick={onCancel}
                disabled={isSyncing}
                className="flex-1 min-w-[160px] flex items-center justify-center gap-2 px-4 py-2 text-sm font-bold text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <span className="material-symbols-outlined text-lg">{isSyncing ? 'progress_activity' : 'cancel'}</span>
                {t('myOrders.actions.cancelOrder', 'Cancel')}
              </button>
              <button
                onClick={onSyncStatus}
                disabled={isSyncing}
                className="flex-1 min-w-[160px] flex items-center justify-center gap-2 px-4 py-2 text-sm font-bold text-main-600 border border-main-200 rounded-lg hover:bg-main-50 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <span className="material-symbols-outlined text-lg">{isSyncing ? 'progress_activity' : 'refresh'}</span>
                {isSyncing ? t('myOrders.actions.refreshing') : t('myOrders.actions.refreshStatus')}
              </button>
            </>
          )}

          {showPickupQr && (
            <button
              onClick={onViewDetails}
              className="flex-1 min-w-[160px] flex items-center justify-center gap-2 px-4 py-2 text-sm font-bold text-white bg-main-600 rounded-lg hover:bg-main-700 transition-colors shadow-sm"
            >
              <span className="material-symbols-outlined text-lg">qr_code_scanner</span>
              {t('myOrders.actions.viewDetails')}
            </button>
          )}
        </div>
      </div>

      {isExpanded && <MyOrderExpandedDetail order={order} t={t} />}
    </div>
  );
}
