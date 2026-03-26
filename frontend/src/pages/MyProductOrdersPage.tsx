import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import OrderCardSkeleton from '../components/skeletons/OrderCardSkeleton';
import { PageTransition } from '../components/PageTransition';
import { useToast } from '../components/Toast';
import { MyOrdersEmptyState } from './my-product-orders/MyOrdersEmptyState';
import { MyOrdersList } from './my-product-orders/MyOrdersList';
import { MyOrdersTabs } from './my-product-orders/MyOrdersTabs';
import { useMyProductOrdersView } from './my-product-orders/useMyProductOrdersView';

export default function MyProductOrdersPage() {
  const navigate = useNavigate();
  const { user, session } = useAuth();
  const { showToast } = useToast();
  const { t } = useTranslation();
  const {
    loading,
    isFetching,
    activeTab,
    expandedOrder,
    syncingOrderId,
    pendingOrders,
    activeOrders,
    historyOrders,
    displayOrders,
    setActiveTab,
    toggleExpand,
    handleSyncStatus,
    handleCancelOrder,
    getStatusBadge,
    getPickupInstruction,
    shouldShowPickupExpiry,
    isPickupReady,
  } = useMyProductOrdersView({
    userId: user?.id,
    sessionToken: session?.access_token,
    showToast,
    t,
  });

  if (loading) {
    return (
      <PageTransition>
        <div className="min-h-screen bg-white flex items-center justify-center">
          <div className="w-full max-w-[1000px] px-4 md:px-10 mt-24">
            <div className="space-y-4">
              <OrderCardSkeleton />
              <OrderCardSkeleton />
              <OrderCardSkeleton />
            </div>
          </div>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="min-h-screen bg-white flex flex-col">
        <main className="flex-grow w-full max-w-[1000px] mx-auto py-8 px-4 md:px-10 mt-24">
        {/* Breadcrumb */}
        <div className="mb-8">
          <div className="w-full flex gap-2 pb-4">
            <button onClick={() => navigate('/')} className="text-main-600 text-sm font-medium hover:text-main-700">
              {t('myOrders.breadcrumb.home')}
            </button>
            <span className="text-gray-400 text-sm">/</span>
            <button className="text-main-600 text-sm font-medium hover:text-main-700">
              {t('myOrders.breadcrumb.dashboard')}
            </button>
            <span className="text-gray-400 text-sm">/</span>
            <span className="text-gray-900 text-sm font-medium">{t('myOrders.breadcrumb.myOrders')}</span>
          </div>

          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-serif font-bold text-gray-900 tracking-tight mb-2">
                {t('myOrders.title')}
              </h1>
              <p className="text-gray-600 font-medium">
                {t('myOrders.subtitle')}
              </p>
            </div>

            <MyOrdersTabs
              activeTab={activeTab}
              pendingCount={pendingOrders.length}
              activeCount={activeOrders.length}
              historyCount={historyOrders.length}
              isFetching={isFetching && !loading}
              onChange={setActiveTab}
              t={t}
            />
          </div>
        </div>

        {/* Orders List */}
        <div className="space-y-4">
          {displayOrders.length > 0 ? (
            <MyOrdersList
              orders={displayOrders}
              expandedOrder={expandedOrder}
              syncingOrderId={syncingOrderId}
              getStatusBadge={getStatusBadge}
              getPickupInstruction={getPickupInstruction}
              shouldShowPickupExpiry={shouldShowPickupExpiry}
              isPickupReady={isPickupReady}
              onToggleExpand={toggleExpand}
              onSyncStatus={handleSyncStatus}
              onCancelOrder={handleCancelOrder}
              t={t}
            />
          ) : (
            <MyOrdersEmptyState activeTab={activeTab} onBrowseShop={() => navigate('/shop')} t={t} />
          )}
        </div>
        </main>
      </div>
    </PageTransition>
  );
}
