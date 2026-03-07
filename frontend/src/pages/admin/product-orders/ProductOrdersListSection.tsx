import { formatCurrency } from '../../../utils/formatters';
import type { OrderSummaryRow } from '../../../hooks/useProductOrders';
import {
  getEmptyStateCopy,
  getOrderTimingLabel,
  getPickupStatusClass,
  getPickupStatusLabel,
} from './productOrdersHelpers';
import type { ProductOrdersTab } from './productOrdersTypes';

type ProductOrdersListSectionProps = {
  activeTab: ProductOrdersTab;
  pendingCount: number;
  todayCount: number;
  completedCount: number;
  isLoading: boolean;
  isFetching: boolean;
  ordersError: string | null;
  displayOrders: OrderSummaryRow[];
  onChangeTab: (tab: ProductOrdersTab) => void;
  onRefresh: () => void;
  onSelectOrder: (pickupCode: string | null) => void;
};

export function ProductOrdersListSection({
  activeTab,
  pendingCount,
  todayCount,
  completedCount,
  isLoading,
  isFetching,
  ordersError,
  displayOrders,
  onChangeTab,
  onRefresh,
  onSelectOrder,
}: ProductOrdersListSectionProps) {
  const emptyState = getEmptyStateCopy(activeTab);
  const loadingRows = ['loading-row-1', 'loading-row-2', 'loading-row-3', 'loading-row-4', 'loading-row-5', 'loading-row-6'];

  return (
    <section className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      <div className="p-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-4">
          <h3 className="text-xl font-bold text-neutral-900">Daftar Pesanan</h3>
          <div className="flex items-center gap-3">
            <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
              <button
                onClick={() => onChangeTab('pending')}
                className={`px-3 py-1.5 text-xs font-bold rounded transition-colors ${
                  activeTab === 'pending' ? 'bg-primary text-gray-900' : 'text-gray-600 hover:bg-white'
                }`}
              >
                Pending ({pendingCount})
              </button>
              <button
                onClick={() => onChangeTab('today')}
                className={`px-3 py-1.5 text-xs font-bold rounded transition-colors ${
                  activeTab === 'today' ? 'bg-primary text-gray-900' : 'text-gray-600 hover:bg-white'
                }`}
              >
                Hari Ini ({todayCount})
              </button>
              <button
                onClick={() => onChangeTab('completed')}
                className={`px-3 py-1.5 text-xs font-bold rounded transition-colors ${
                  activeTab === 'completed' ? 'bg-primary text-gray-900' : 'text-gray-600 hover:bg-white'
                }`}
              >
                Selesai ({completedCount})
              </button>
            </div>
            <button
              onClick={onRefresh}
              className="text-sm font-bold text-primary hover:underline"
              disabled={isFetching}
            >
              Refresh
            </button>
          </div>
        </div>
        {ordersError && <div className="mb-4 text-sm text-red-600">{ordersError}</div>}

        {isLoading ? (
          <div className="space-y-2">
            {loadingRows.map((rowKey) => (
              <div
                key={rowKey}
                className="h-[64px] rounded-lg border border-gray-100 bg-gray-50/60 animate-pulse"
              />
            ))}
          </div>
        ) : displayOrders.length === 0 ? (
          <div className="py-10 text-center">
            <span className="material-symbols-outlined text-4xl text-gray-700 mb-2">{emptyState.icon}</span>
            <p className="text-sm text-gray-500">{emptyState.message}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {displayOrders.map((order) => {
              const timing = getOrderTimingLabel(order);

              return (
                <button
                  key={order.id}
                  onClick={() => onSelectOrder(order.pickup_code)}
                  className="w-full flex flex-col gap-2 rounded-lg border border-gray-100 bg-gray-50/60 px-4 py-3 text-left hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-neutral-900 truncate">{order.pickup_code ?? '-'}</p>
                      <p className="text-xs text-gray-500 truncate">
                        {order.profiles?.name ?? order.profiles?.email ?? 'Customer'}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-bold text-gray-500">
                        {formatCurrency(Number(order.total ?? 0))}
                      </span>
                      <span
                        className={`text-xs font-bold uppercase tracking-wide px-2 py-1 rounded ${getPickupStatusClass(order.pickup_status)}`}
                      >
                        {getPickupStatusLabel(order.pickup_status)}
                      </span>
                    </div>
                  </div>

                  {timing && (
                    <div className="flex justify-end mt-1 mb-1">
                      <span className="text-[10px] text-gray-500 italic">
                        {timing.prefix} {timing.value}
                      </span>
                    </div>
                  )}

                  {order.order_product_items && order.order_product_items.length > 0 && (
                    <div className="pl-2 border-l-2 border-gray-200 space-y-1">
                      {order.order_product_items.map((item) => {
                        const productName = item.product_variants?.products?.name ?? 'Product';
                        const variantName = item.product_variants?.name ?? 'Variant';
                        const category = item.product_variants?.products?.categories?.name ?? '';

                        return (
                          <div key={item.id} className="flex items-center justify-between gap-2 text-xs">
                            <div className="min-w-0 flex-1">
                              <span className="text-gray-700 font-medium">{productName}</span>
                              {category && <span className="text-gray-400 ml-1">({category})</span>}
                              <span className="text-gray-500 mx-1">•</span>
                              <span className="text-gray-500">{variantName}</span>
                            </div>
                            <div className="flex items-center gap-2 text-gray-600">
                              <span>
                                {item.quantity}× {formatCurrency(Number(item.price))}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
