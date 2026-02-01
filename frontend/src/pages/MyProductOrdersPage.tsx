import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
  const { user } = useAuth();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'active' | 'history'>('active');
  const { data: orders = [], error, isLoading: loading, isFetching } = useMyOrders(user?.id);
  const [expandedOrder, setExpandedOrder] = useState<number | null>(null);
  useEffect(() => {
    if (error) {
      showToast('error', error instanceof Error ? error.message : 'Failed to load orders');
    }
  }, [error, showToast]);

  // Filter orders based on active tab
  const activeOrders = orders.filter(
    (order) =>
      order.payment_status === 'paid' &&
      order.pickup_status !== 'completed' &&
      order.pickup_status !== 'expired' &&
      order.pickup_status !== 'cancelled'
  );

  const historyOrders = orders.filter(
    (order) =>
      order.payment_status !== 'paid' ||
      order.pickup_status === 'completed' ||
      order.pickup_status === 'expired' ||
      order.pickup_status === 'cancelled'
  );

  const displayOrders = activeTab === 'active' ? activeOrders : historyOrders;

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
          Pending Payment
        </span>
      );
    }

    if (order.pickup_status === 'completed') {
      return (
        <span className="inline-block px-3 py-1 text-xs font-bold rounded-full bg-green-100 text-green-700">
          Picked Up
        </span>
      );
    }

    if (order.pickup_status === 'expired') {
      return (
        <span className="inline-block px-3 py-1 text-xs font-bold rounded-full bg-gray-100 text-gray-700">
          Expired
        </span>
      );
    }

    if (order.pickup_status === 'cancelled') {
      return (
        <span className="inline-block px-3 py-1 text-xs font-bold rounded-full bg-red-100 text-red-700">
          Cancelled
        </span>
      );
    }

    return (
      <span className="inline-block px-3 py-1 text-xs font-bold rounded-full bg-blue-100 text-blue-700">
        Ready for Pickup
      </span>
    );
  };

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
              Home
            </button>
            <span className="text-gray-400 text-sm">/</span>
            <button className="text-main-600 text-sm font-medium hover:text-main-700">
              Dashboard
            </button>
            <span className="text-gray-400 text-sm">/</span>
            <span className="text-gray-900 text-sm font-medium">My Orders</span>
          </div>

          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-serif font-bold text-gray-900 tracking-tight mb-2">
                My Orders
              </h1>
              <p className="text-gray-600 font-medium">
                Track your product orders and pickup codes
              </p>
            </div>

            {/* Tab Switcher */}
            <div className="flex items-center gap-3">
              {isFetching && !loading && (
                <div className="flex items-center gap-1.5 text-xs text-main-600">
                  <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>
                  Memperbarui
                </div>
              )}
              <div className="flex gap-1 bg-white p-1 rounded-lg border border-gray-200 shadow-sm">
                <button
                  onClick={() => setActiveTab('active')}
                  className={`px-5 py-2 text-sm font-bold rounded-md transition-colors ${
                    activeTab === 'active'
                      ? 'bg-main-600 text-white shadow-sm'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  Active
                </button>
                <button
                  onClick={() => setActiveTab('history')}
                  className={`px-5 py-2 text-sm font-bold rounded-md transition-colors ${
                    activeTab === 'history'
                      ? 'bg-main-600 text-white shadow-sm'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  History
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

                  {/* QR Code Section - Only show for paid orders */}
                  {order.payment_status === 'paid' && order.pickup_code && order.pickup_status === 'pending_pickup' && (
                    <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="flex flex-col md:flex-row items-center gap-6">
                        <div className="bg-white p-4 rounded-lg shadow-sm">
                          <QRCode value={order.pickup_code} size={120} />
                        </div>
                        <div className="flex-1 text-center md:text-left">
                          <p className="text-xs uppercase tracking-widest text-gray-500 mb-1">
                            Pickup Code
                          </p>
                          <p className="font-display text-2xl text-main-600 mb-2">{order.pickup_code}</p>
                          <p className="text-sm text-gray-600">
                            Show this QR code to admin when picking up your items
                          </p>
                          {order.pickup_expires_at && (
                            <p className="text-xs text-gray-500 mt-2">
                              Expires: {formatDate(order.pickup_expires_at)}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="mt-4 flex gap-3">
                    <button
                      onClick={() => toggleExpand(order.id)}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-bold text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <span className="material-symbols-outlined text-lg">
                        {expandedOrder === order.id ? 'expand_less' : 'expand_more'}
                      </span>
                      {expandedOrder === order.id ? 'Hide' : 'View'} Items
                    </button>
                    {order.payment_status === 'paid' && order.pickup_code && (
                      <button
                        onClick={() => navigate(`/order/product/success/${order.order_number}`)}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-bold text-white bg-main-600 rounded-lg hover:bg-main-700 transition-colors shadow-sm"
                      >
                        <span className="material-symbols-outlined text-lg">qr_code_scanner</span>
                        View Full Details
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
                {activeTab === 'active' ? 'shopping_bag' : 'history'}
              </span>
              <p className="text-gray-500 text-lg mb-2">
                {activeTab === 'active' ? 'No active orders' : 'No order history yet'}
              </p>
              <p className="text-gray-400 text-sm mb-6">
                {activeTab === 'active'
                  ? 'Your paid orders ready for pickup will appear here'
                  : 'Your completed and past orders will appear here'}
              </p>
              <button
                onClick={() => navigate('/shop')}
                className="inline-flex items-center gap-2 px-6 py-3 bg-main-600 text-white text-sm font-bold rounded-lg hover:bg-main-700 transition-colors shadow-sm"
              >
                <span className="material-symbols-outlined">shopping_cart</span>
                Browse Shop
              </button>
            </div>
          )}
        </div>
        </main>
      </div>
    </PageTransition>
  );
}
