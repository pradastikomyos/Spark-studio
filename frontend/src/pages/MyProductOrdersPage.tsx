import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import QRCode from 'react-qr-code';
import { formatCurrency } from '../utils/formatters';
import { useAuth } from '../contexts/AuthContext';
import { useMyOrders } from '../hooks/useMyOrders';
import OrderCardSkeleton from '../components/skeletons/OrderCardSkeleton';
import { PageTransition } from '../components/PageTransition';
import { useToast } from '../components/Toast';

interface ProductOrder {
  id: number;
  order_number: string;
  payment_status: string;
  status: string;
  pickup_code: string | null;
  pickup_status: string | null;
  pickup_expires_at: string | null;
  paid_at: string | null;
  total: number;
  created_at: string;
  itemCount: number;
  items: OrderItem[];
}

interface OrderItem {
  id: number;
  quantity: number;
  price: number;
  subtotal: number;
  productName: string;
  variantName: string;
  imageUrl?: string;
}

export default function MyProductOrdersPage() {
  const navigate = useNavigate();
  const { user, session } = useAuth();
  const { showToast } = useToast();
  const { t } = useTranslation();
  // 3 TAB SYSTEM: pending → aktif → riwayat (urgency-first UX)
  const [activeTab, setActiveTab] = useState<'pending' | 'active' | 'history'>('pending');
  const { data: orders = [], error, isLoading: loading, isFetching } = useMyOrders(user?.id);
  const [expandedOrder, setExpandedOrder] = useState<number | null>(null);
  const [syncingOrderId, setSyncingOrderId] = useState<number | null>(null);
  
  useEffect(() => {
    if (error) {
      showToast('error', error instanceof Error ? error.message : 'Failed to load orders');
    }
  }, [error, showToast]);

  // ============================================
  // TAB 1: PENDING - Orders awaiting payment
  // ============================================
  const pendingOrders = orders.filter((order) => {
    const paymentStatus = order.payment_status?.toLowerCase() ?? '';
    const status = (order.status ?? '').toLowerCase();
    
    // Only unpaid orders that haven't expired/cancelled
    if (status === 'cancelled' || status === 'expired') {
      return false;
    }
    
    // Pending payment = unpaid
    return paymentStatus === 'unpaid' || paymentStatus === 'pending';
  });

  // ============================================
  // TAB 2: AKTIF - Paid orders ready for pickup
  // ============================================
  const activeOrders = orders.filter((order) => {
    const paymentStatus = order.payment_status?.toLowerCase() ?? '';
    const pickupStatus = (order.pickup_status ?? '').toLowerCase();
    const status = (order.status ?? '').toLowerCase();

    // Must be paid
    if (paymentStatus !== 'paid') {
      return false;
    }

    // Completed/expired/cancelled pickup = history
    if (pickupStatus === 'completed' || pickupStatus === 'expired' || pickupStatus === 'cancelled') {
      return false;
    }

    // Order cancelled/expired = history
    if (status === 'cancelled' || status === 'expired' || status === 'completed') {
      return false;
    }

    // Paid and waiting for pickup
    return true;
  });

  // ============================================
  // TAB 3: RIWAYAT - Completed, cancelled, expired, failed
  // ============================================
  const historyOrders = orders.filter((order) => {
    const paymentStatus = order.payment_status?.toLowerCase() ?? '';
    const pickupStatus = (order.pickup_status ?? '').toLowerCase();
    const status = (order.status ?? '').toLowerCase();

    // Completed pickup = history
    if (pickupStatus === 'completed') {
      return true;
    }

    // Expired/cancelled pickup = history
    if (pickupStatus === 'expired' || pickupStatus === 'cancelled') {
      return true;
    }

    // Order cancelled/expired/completed = history
    if (status === 'cancelled' || status === 'expired' || status === 'completed') {
      return true;
    }

    // Failed/refunded payment = history
    if (paymentStatus === 'failed' || paymentStatus === 'refunded') {
      return true;
    }

    return false;
  });

  // Auto-switch to tab with orders on first load
  useEffect(() => {
    if (!loading && orders.length > 0) {
      // Priority: pending (needs action) → active (ready for pickup) → history
      if (pendingOrders.length > 0) {
        setActiveTab('pending');
      } else if (activeOrders.length > 0) {
        setActiveTab('active');
      } else if (historyOrders.length > 0) {
        setActiveTab('history');
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]); // Only run on initial load

  const displayOrders = 
    activeTab === 'pending' ? pendingOrders :
    activeTab === 'active' ? activeOrders : 
    historyOrders;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadge = (order: ProductOrder) => {
    if (order.payment_status !== 'paid') {
      return (
        <span className="inline-block px-3 py-1 text-xs font-bold rounded-full bg-yellow-100 text-yellow-700">
          {t('myOrders.status.pendingPayment')}
        </span>
      );
    }

    if (order.pickup_status === 'pending_review') {
      return (
        <span className="inline-block px-3 py-1 text-xs font-bold rounded-full bg-amber-100 text-amber-700">
          {t('myOrders.status.pendingReview')}
        </span>
      );
    }

    if (order.pickup_status === 'completed') {
      return (
        <span className="inline-block px-3 py-1 text-xs font-bold rounded-full bg-green-100 text-green-700">
          {t('myOrders.status.pickedUp')}
        </span>
      );
    }

    if (order.pickup_status === 'expired') {
      return (
        <span className="inline-block px-3 py-1 text-xs font-bold rounded-full bg-gray-100 text-gray-700">
          {t('myOrders.status.expired')}
        </span>
      );
    }

    if (order.pickup_status === 'cancelled') {
      return (
        <span className="inline-block px-3 py-1 text-xs font-bold rounded-full bg-red-100 text-red-700">
          {t('myOrders.status.cancelled')}
        </span>
      );
    }

    return (
      <span className="inline-block px-3 py-1 text-xs font-bold rounded-full bg-blue-100 text-blue-700">
        {t('myOrders.status.readyForPickup')}
      </span>
    );
  };

  const getPickupInstruction = (order: ProductOrder) => {
    const status = String(order.pickup_status || '').toLowerCase();
    if (status === 'completed') return t('myOrders.pickup.instructions.pickedUp');
    if (status === 'expired') return t('myOrders.pickup.instructions.expired');
    if (status === 'cancelled') return t('myOrders.pickup.instructions.cancelled');
    if (status === 'pending_review') return t('myOrders.pickup.instructions.pendingReview');
    return t('myOrders.pickup.instructions.ready');
  };

  const shouldShowPickupExpiry = (order: ProductOrder) => {
    const status = String(order.pickup_status || '').toLowerCase();
    return Boolean(
      order.pickup_expires_at && (status === 'pending_pickup' || status === 'pending_review')
    );
  };

  const handleSyncStatus = useCallback(
    async (order: ProductOrder) => {
      if (!session?.access_token) {
        showToast('error', t('myOrders.errors.notAuthenticated'));
        return;
      }

      setSyncingOrderId(order.id);
      try {
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sync-midtrans-product-status`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({ order_number: order.order_number }),
          }
        );

        const data = await response.json().catch(() => null);

        if (!response.ok) {
          const message =
            typeof data?.error === 'string' && data.error.length > 0
              ? data.error
              : t('myOrders.errors.syncFailed');
          showToast('error', message);
          return;
        }

        showToast('success', t('myOrders.toast.syncSuccess'));
      } catch (e) {
        const fallbackMessage =
          e instanceof Error && e.message ? e.message : t('myOrders.errors.syncFailed');
        showToast('error', fallbackMessage);
      } finally {
        setSyncingOrderId(null);
      }
    },
    [session?.access_token, showToast, t]
  );

  const handleCancelOrder = useCallback(
    async (order: ProductOrder) => {
      if (!session?.access_token) {
        showToast('error', t('myOrders.errors.notAuthenticated'));
        return;
      }

      const orderStatus = String(order.status || '').toLowerCase();
      const paymentStatus = String(order.payment_status || '').toLowerCase();
      if (paymentStatus === 'paid') {
        showToast('info', t('myOrders.toast.alreadyPaid', 'This order is already paid.'));
        return;
      }
      if (orderStatus === 'cancelled' || orderStatus === 'expired') {
        showToast('info', t('myOrders.toast.alreadyFinal', 'This order can no longer be cancelled.'));
        return;
      }

      setSyncingOrderId(order.id);
      try {
        const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/cancel-product-order`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ order_number: order.order_number }),
        });

        const data = await response.json().catch(() => null);
        if (!response.ok) {
          const message = typeof data?.error === 'string' && data.error.length > 0 ? data.error : 'Failed to cancel order';
          showToast('error', message);
          return;
        }

        showToast('success', t('myOrders.toast.cancelSuccess', 'Order cancelled.'));
      } catch (e) {
        showToast('error', e instanceof Error ? e.message : 'Failed to cancel order');
      } finally {
        setSyncingOrderId(null);
      }
    },
    [session?.access_token, showToast, t]
  );

  const toggleExpand = (orderId: number) => {
    setExpandedOrder(expandedOrder === orderId ? null : orderId);
  };

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

            {/* Tab Switcher - Mobile First: 3 Tabs with Badges */}
            <div className="flex items-center gap-3">
              {isFetching && !loading && (
                <div className="flex items-center gap-1.5 text-xs text-main-600">
                  <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>
                  {t('myOrders.updating')}
                </div>
              )}
              {/* 3 Tab System: Pending → Aktif → Riwayat */}
              <div className="flex gap-1 bg-white p-1 rounded-lg border border-gray-200 shadow-sm overflow-x-auto">
                {/* PENDING TAB - Needs Action */}
                <button
                  onClick={() => setActiveTab('pending')}
                  className={`relative flex items-center gap-1.5 px-3 md:px-4 py-2 text-xs md:text-sm font-bold rounded-md transition-colors whitespace-nowrap ${
                    activeTab === 'pending'
                      ? 'bg-yellow-500 text-white shadow-sm'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <span className="material-symbols-outlined text-sm md:text-base">schedule</span>
                  <span className="hidden sm:inline">{t('myOrders.tabs.pending', 'Pending')}</span>
                  {pendingOrders.length > 0 && (
                    <span className={`ml-1 min-w-[18px] h-[18px] flex items-center justify-center text-[10px] font-bold rounded-full ${
                      activeTab === 'pending' 
                        ? 'bg-white text-yellow-600' 
                        : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {pendingOrders.length}
                    </span>
                  )}
                </button>

                {/* AKTIF TAB - Ready for Pickup */}
                <button
                  onClick={() => setActiveTab('active')}
                  className={`relative flex items-center gap-1.5 px-3 md:px-4 py-2 text-xs md:text-sm font-bold rounded-md transition-colors whitespace-nowrap ${
                    activeTab === 'active'
                      ? 'bg-main-600 text-white shadow-sm'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <span className="material-symbols-outlined text-sm md:text-base">qr_code_2</span>
                  <span className="hidden sm:inline">{t('myOrders.tabs.active')}</span>
                  {activeOrders.length > 0 && (
                    <span className={`ml-1 min-w-[18px] h-[18px] flex items-center justify-center text-[10px] font-bold rounded-full ${
                      activeTab === 'active' 
                        ? 'bg-white text-main-600' 
                        : 'bg-main-100 text-main-700'
                    }`}>
                      {activeOrders.length}
                    </span>
                  )}
                </button>

                {/* RIWAYAT TAB - History */}
                <button
                  onClick={() => setActiveTab('history')}
                  className={`relative flex items-center gap-1.5 px-3 md:px-4 py-2 text-xs md:text-sm font-bold rounded-md transition-colors whitespace-nowrap ${
                    activeTab === 'history'
                      ? 'bg-gray-600 text-white shadow-sm'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <span className="material-symbols-outlined text-sm md:text-base">history</span>
                  <span className="hidden sm:inline">{t('myOrders.tabs.history')}</span>
                  {historyOrders.length > 0 && (
                    <span className={`ml-1 min-w-[18px] h-[18px] flex items-center justify-center text-[10px] font-bold rounded-full ${
                      activeTab === 'history' 
                        ? 'bg-white text-gray-600' 
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      {historyOrders.length}
                    </span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Orders List */}
        <div className="space-y-4">
          {displayOrders.length > 0 ? (
            displayOrders.map((order) => (
              <div
                key={order.id}
                className="group bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-main-300 transition-all overflow-hidden"
              >
                {/* Order Header */}
                <div className="p-6">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                    <div className="flex-1">
                      <div className="flex items-center flex-wrap gap-3 mb-2">
                        <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-main-600">
                          Order
                        </span>
                        <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                        <span className="text-xs font-medium text-gray-500 font-mono tracking-wide">
                          #{order.order_number}
                        </span>
                        <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                        {getStatusBadge(order)}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <span className="material-symbols-outlined text-base">schedule</span>
                        <span>{formatDate(order.created_at)}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-xs text-gray-500 uppercase tracking-wider">Total</p>
                        <p className="text-xl font-serif font-bold text-gray-900">
                          {formatCurrency(order.total)}
                        </p>
                        <p className="text-xs text-gray-500">{order.itemCount} items</p>
                      </div>
                    </div>
                  </div>

                  {/* QR Code Section - Show for paid orders with pickup code */}
                  {order.payment_status === 'paid' && order.pickup_code && (
                    <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="flex flex-col md:flex-row items-center gap-6">
                        <div className="bg-white p-4 rounded-lg shadow-sm">
                          <QRCode value={order.pickup_code} size={120} />
                        </div>
                        <div className="flex-1 text-center md:text-left">
                          <p className="text-xs uppercase tracking-widest text-gray-500 mb-1">
                            {t('myOrders.pickup.label')}
                          </p>
                          <p className="font-display text-2xl text-main-600 mb-2">{order.pickup_code}</p>
                          <p className="text-sm text-gray-600">
                            {getPickupInstruction(order)}
                          </p>
                          {shouldShowPickupExpiry(order) && order.pickup_expires_at && (
                            <p className="text-xs text-gray-500 mt-2">
                              {t('myOrders.pickup.expires')}: {formatDate(order.pickup_expires_at)}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="mt-4 flex flex-wrap gap-3">
                    <button
                      onClick={() => toggleExpand(order.id)}
                      className="flex-1 min-w-[160px] flex items-center justify-center gap-2 px-4 py-2 text-sm font-bold text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <span className="material-symbols-outlined text-lg">
                        {expandedOrder === order.id ? 'expand_less' : 'expand_more'}
                      </span>
                      {expandedOrder === order.id ? t('myOrders.actions.hideItems') : t('myOrders.actions.viewItems')}
                    </button>
                    {order.payment_status !== 'paid' && (
                      <button
                        onClick={() => navigate(`/order/product/pending/${order.order_number}`)}
                        className="flex-1 min-w-[160px] flex items-center justify-center gap-2 px-4 py-2 text-sm font-bold text-white bg-main-600 rounded-lg hover:bg-main-700 transition-colors shadow-sm"
                      >
                        <span className="material-symbols-outlined text-lg">arrow_forward</span>
                        {t('myOrders.actions.payNow', 'Pay Now')}
                      </button>
                    )}
                    {order.payment_status !== 'paid' && (
                      <button
                        onClick={() => handleCancelOrder(order)}
                        disabled={syncingOrderId === order.id}
                        className="flex-1 min-w-[160px] flex items-center justify-center gap-2 px-4 py-2 text-sm font-bold text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        <span className="material-symbols-outlined text-lg">
                          {syncingOrderId === order.id ? 'progress_activity' : 'cancel'}
                        </span>
                        {t('myOrders.actions.cancelOrder', 'Cancel')}
                      </button>
                    )}
                    {order.payment_status !== 'paid' && (
                      <button
                        onClick={() => handleSyncStatus(order)}
                        disabled={syncingOrderId === order.id}
                        className="flex-1 min-w-[160px] flex items-center justify-center gap-2 px-4 py-2 text-sm font-bold text-main-600 border border-main-200 rounded-lg hover:bg-main-50 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        <span className="material-symbols-outlined text-lg">
                          {syncingOrderId === order.id ? 'progress_activity' : 'refresh'}
                        </span>
                        {syncingOrderId === order.id
                          ? t('myOrders.actions.refreshing')
                          : t('myOrders.actions.refreshStatus')}
                      </button>
                    )}
                    {order.payment_status === 'paid' && order.pickup_code && (
                      <button
                        onClick={() => navigate(`/order/product/success/${order.order_number}`)}
                        className="flex-1 min-w-[160px] flex items-center justify-center gap-2 px-4 py-2 text-sm font-bold text-white bg-main-600 rounded-lg hover:bg-main-700 transition-colors shadow-sm"
                      >
                        <span className="material-symbols-outlined text-lg">qr_code_scanner</span>
                        {t('myOrders.actions.viewDetails')}
                      </button>
                    )}
                  </div>
                </div>

                {/* Expanded Items Section */}
                {expandedOrder === order.id && (
                  <div className="border-t border-gray-200 bg-gray-50 p-6">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-gray-700 mb-4">
                      Order Items
                    </h3>
                    <div className="space-y-3">
                      {order.items.map((item) => (
                        <div key={item.id} className="flex items-center gap-4">
                          <div className="h-16 w-12 bg-white rounded overflow-hidden flex items-center justify-center shadow-sm">
                            {item.imageUrl ? (
                              <img
                                alt={item.productName}
                                src={item.imageUrl}
                                className="h-full w-full object-cover"
                                loading="lazy"
                              />
                            ) : (
                              <span className="material-symbols-outlined text-gray-400">inventory_2</span>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="truncate font-medium text-gray-900">{item.productName}</p>
                            <p className="truncate text-sm text-gray-500">
                              {item.variantName} · {item.quantity} × {formatCurrency(item.price)}
                            </p>
                          </div>
                          <span className="font-medium text-gray-900">{formatCurrency(item.subtotal)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="text-center py-16">
              <span className="material-symbols-outlined text-6xl text-gray-300 mb-4">
                {activeTab === 'pending' ? 'schedule' : activeTab === 'active' ? 'qr_code_2' : 'history'}
              </span>
              <p className="text-gray-500 text-lg mb-2">
                {activeTab === 'pending'
                  ? t('myOrders.empty.pending.title', 'No pending payments')
                  : activeTab === 'active'
                  ? t('myOrders.empty.active.title')
                  : t('myOrders.empty.history.title')}
              </p>
              <p className="text-gray-400 text-sm mb-6">
                {activeTab === 'pending'
                  ? t('myOrders.empty.pending.subtitle', 'All your orders are paid!')
                  : activeTab === 'active'
                  ? t('myOrders.empty.active.subtitle')
                  : t('myOrders.empty.history.subtitle')}
              </p>
              {/* Only show shop button for pending/active tabs */}
              {activeTab !== 'history' && (
                <button
                  onClick={() => navigate('/shop')}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-main-600 text-white text-sm font-bold rounded-lg hover:bg-main-700 transition-colors shadow-sm"
                >
                  <span className="material-symbols-outlined">shopping_cart</span>
                  {t('myOrders.actions.browseShop')}
                </button>
              )}
            </div>
          )}
        </div>
        </main>
      </div>
    </PageTransition>
  );
}
