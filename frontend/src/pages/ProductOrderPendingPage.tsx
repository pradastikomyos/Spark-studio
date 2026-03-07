import { useEffect } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import OrderSuccessSkeleton from '../components/skeletons/OrderSuccessSkeleton';
import { ProductOrderItemsList } from './product-orders/ProductOrderItemsList';
import { PendingOrderHero } from './product-order-pending/PendingOrderHero';
import { PendingOrderSummary } from './product-order-pending/PendingOrderSummary';
import { PendingPaymentPanel } from './product-order-pending/PendingPaymentPanel';
import { useProductOrderPendingController } from './product-order-pending/useProductOrderPendingController';

export default function ProductOrderPendingPage() {
  const params = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const orderNumber = params.orderNumber || '';
  const { session } = useAuth();

  useEffect(() => {
    if (!orderNumber) {
      navigate('/shop', { replace: true, state: { from: location.pathname } });
    }
  }, [location.pathname, navigate, orderNumber]);

  const {
    loading,
    error,
    refreshing,
    order,
    items,
    paymentInfo,
    instructionSteps,
    countdown,
    statusView,
    handleSyncStatus,
    copyToClipboard,
  } = useProductOrderPendingController({
    orderNumber,
    locationState: location.state,
    sessionToken: session?.access_token,
  });

  if (!orderNumber) {
    return null;
  }

  return (
    <div className="bg-background-light">
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-20">
        <div className="text-center mb-10">
          <h1 className="text-5xl font-display text-gray-900 mb-2">
            {statusView.kind === 'pending' ? 'Order Pending Payment' : 'Order Status'}
          </h1>
          <p className={`${statusView.accentText} text-[11px] font-bold tracking-[0.2em] uppercase`}>Order ID: {orderNumber}</p>
        </div>

        {error && (
          <div className="mb-8 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {loading ? (
          <OrderSuccessSkeleton />
        ) : order ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <PendingOrderHero statusView={statusView} countdown={countdown} />

              <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
                {statusView.allowInstructions ? (
                  <PendingPaymentPanel
                    paymentInfo={paymentInfo}
                    instructionSteps={instructionSteps}
                    onCopyCode={copyToClipboard}
                  />
                ) : (
                  <div className="mt-12 border-t border-gray-50 pt-8">
                    <h3 className="text-sm font-bold uppercase tracking-wider mb-6 text-gray-400">Next Steps</h3>
                    <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700">
                      <p>{statusView.description}</p>
                      <div className="mt-4 flex flex-col sm:flex-row gap-3">
                        <Link
                          to="/my-orders"
                          className="w-full sm:w-auto bg-primary hover:bg-primary-dark text-white font-bold py-3 px-6 rounded-xl transition-colors flex items-center justify-center gap-2"
                        >
                          <span className="material-symbols-outlined text-base">receipt_long</span>
                          <span className="text-xs tracking-widest uppercase">View My Orders</span>
                        </Link>
                        <Link
                          to="/shop"
                          className="w-full sm:w-auto bg-white border border-gray-200 hover:border-primary/30 text-gray-700 font-bold py-3 px-6 rounded-xl transition-colors flex items-center justify-center gap-2"
                        >
                          <span className="material-symbols-outlined text-base">storefront</span>
                          <span className="text-xs tracking-widest uppercase">Back to Shop</span>
                        </Link>
                      </div>
                    </div>
                  </div>
                )}
              </section>

              <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
                <h2 className="text-xl font-display mb-6 border-b border-gray-50 pb-4">Order Items</h2>
                <ProductOrderItemsList items={items} />
              </section>
            </div>

            <aside className="space-y-6">
              <PendingOrderSummary
                order={order}
                allowPayNow={statusView.allowPayNow}
                refreshing={refreshing}
                onSyncStatus={() => void handleSyncStatus()}
              />

              <div className="bg-blue-50 rounded-2xl p-6 border border-blue-100 flex items-start gap-4">
                <span className="material-symbols-outlined text-blue-600">help_outline</span>
                <div>
                  <p className="text-xs font-bold text-blue-900 uppercase tracking-wider mb-1">Need Help?</p>
                  <p className="text-xs text-blue-700 leading-relaxed">
                    If you encounter issues with your payment, please contact our support team.
                  </p>
                </div>
              </div>
            </aside>
          </div>
        ) : (
          <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-6 text-sm text-red-700">
            Failed to load order.
          </div>
        )}
      </main>
    </div>
  );
}
