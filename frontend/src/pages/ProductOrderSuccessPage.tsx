import { useParams, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { formatDateTimeWIB } from '../utils/timezone';
import OrderSuccessSkeleton from '../components/skeletons/OrderSuccessSkeleton';
import { ProductOrderItemsList } from './product-orders/ProductOrderItemsList';
import { ProductOrderQrCard } from './product-orders/ProductOrderQrCard';
import { ProductOrderSuccessHero } from './product-order-success/ProductOrderSuccessHero';
import { SuccessActions } from './product-order-success/SuccessActions';
import { SuccessOrderSummary } from './product-order-success/SuccessOrderSummary';
import { useProductOrderSuccessController } from './product-order-success/useProductOrderSuccessController';

export default function ProductOrderSuccessPage() {
  const params = useParams();
  const location = useLocation();
  const orderNumber = params.orderNumber || '';
  const { initialized, session } = useAuth();
  const {
    order,
    items,
    loading,
    error,
    refreshing,
    loadingTimedOut,
    autoSyncInProgress,
    pickupCode,
    totalItems,
    paymentMethodLabel,
    handleSyncStatus,
    handleRetryLoad,
  } = useProductOrderSuccessController({
    orderNumber,
    initialized,
    locationState: location.state,
    sessionToken: session?.access_token,
  });

  if (!orderNumber) {
    return (
      <div className="min-h-screen bg-background-light flex items-center justify-center px-6">
        <div className="max-w-lg w-full rounded-xl border border-red-500/20 bg-red-500/10 p-6 text-red-700">
          Missing order number.
        </div>
      </div>
    );
  }

  return (
    <div className="bg-background-light relative overflow-hidden">
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        <ProductOrderSuccessHero channel={order?.channel} orderNumber={orderNumber} />

        {error && (
          <div className="mb-8 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {!loading && !order && (
          <div className="mb-8 rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-800">
            <div className="flex items-start gap-3">
              <span className="material-symbols-outlined text-base">info</span>
              <div>
                <p className="font-semibold">Order details are not available yet.</p>
                <p className="text-sm mt-1">
                  {loadingTimedOut
                    ? 'Loading timed out. Please retry to fetch the latest status.'
                    : 'Please retry in a moment to fetch the latest status.'}
                </p>
              </div>
            </div>
            <button
              onClick={handleRetryLoad}
              className="mt-4 w-full py-3 border border-amber-300 text-amber-900 rounded-full font-bold text-xs tracking-widest uppercase hover:bg-amber-100 transition-colors"
            >
              Retry Loading
            </button>
          </div>
        )}

        {loading ? (
          <OrderSuccessSkeleton />
        ) : order ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="md:col-span-2 space-y-6">
                <section className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
                  <h2 className="text-xl font-display mb-6 border-b border-gray-50 pb-4">Order Details</h2>
                  <div className="space-y-6">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Order ID</p>
                        <p className="font-medium">#{orderNumber}</p>
                      </div>
                      {order.created_at && (
                        <div className="text-right">
                          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Date</p>
                          <p className="font-medium">{formatDateTimeWIB(order.created_at)}</p>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                      <div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Payment Method</p>
                        <div className="flex items-center space-x-2">
                          <span className="material-symbols-outlined text-gray-400">account_balance_wallet</span>
                          <p className="font-medium">{paymentMethodLabel}</p>
                        </div>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Fulfillment</p>
                        <p className="font-medium">Pick up in store</p>
                      </div>
                    </div>

                    <div className="border-t border-gray-50 pt-6">
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Pickup QR</p>
                      {pickupCode ? (
                        <ProductOrderQrCard
                          pickupCode={pickupCode}
                          pickupExpiresAt={order.pickup_expires_at}
                          channel={order.channel}
                        />
                      ) : (
                        <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-4">
                          <p className="text-sm text-yellow-800 flex items-center gap-2">
                            <span className="material-symbols-outlined text-base">info</span>
                            Pickup details are still being prepared.
                          </p>
                          <button
                            onClick={() => handleSyncStatus(false)}
                            disabled={refreshing || autoSyncInProgress}
                            className="mt-4 w-full py-3 bg-primary text-white rounded-full font-bold text-xs tracking-widest uppercase hover:bg-primary-dark transition-colors disabled:opacity-60"
                          >
                            {refreshing || autoSyncInProgress ? 'Checking...' : 'Check Status'}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </section>

                <section className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
                  <h2 className="text-xl font-display mb-6 border-b border-gray-50 pb-4">Order Items</h2>
                  <ProductOrderItemsList items={items} />
                </section>
              </div>

              <aside className="md:col-span-1">
                <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 sticky top-24">
                  <h2 className="text-xl font-display mb-6">Order Summary</h2>
                  <SuccessOrderSummary total={order.total} totalItems={totalItems} />
                  <SuccessActions />
                </div>
              </aside>
            </div>

            {session?.user?.email && (
              <div className="mt-12 text-center">
                <p className="text-sm text-gray-400">
                  A confirmation email has been sent to{' '}
                  <span className="text-gray-700 font-medium">{session.user.email}</span>.
                </p>
              </div>
            )}
          </>
        ) : (
          <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-6 text-sm text-red-700">
            Failed to load order.
          </div>
        )}
      </main>
    </div>
  );
}
