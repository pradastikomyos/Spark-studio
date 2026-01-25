import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import QRCode from 'react-qr-code';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

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

type OrderItemRow = {
  id: number;
  quantity: number;
  price: number;
  subtotal: number;
  product_variants?: {
    name?: string | null;
    products?: {
      name?: string | null;
      image_url?: string | null;
    } | null;
  } | null;
};

export default function MyProductOrdersPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'active' | 'history'>('active');
  const [orders, setOrders] = useState<ProductOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedOrder, setExpandedOrder] = useState<number | null>(null);
  const [userId, setUserId] = useState<number | null>(null);

  const fetchOrders = useCallback(
    async (showLoader = false) => {
      if (showLoader) setLoading(true);

      if (!user?.email) {
        setOrders([]);
        setUserId(null);
        setLoading(false);
        return;
      }

      try {
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('id')
          .eq('email', user.email)
          .single();

        if (userError || !userData) {
          console.error('Error fetching user:', userError);
          setOrders([]);
          setUserId(null);
          return;
        }

        setUserId(userData.id);

        const { data: ordersData, error: ordersError } = await supabase
          .from('order_products')
          .select(`
            id,
            order_number,
            payment_status,
            status,
            pickup_code,
            pickup_status,
            pickup_expires_at,
            paid_at,
            total,
            created_at
          `)
          .eq('user_id', userData.id)
          .order('created_at', { ascending: false });

        if (ordersError) {
          console.error('Error fetching orders:', ordersError);
          setOrders([]);
          return;
        }

        // Fetch items for each order
        const ordersWithItems = await Promise.all(
          (ordersData || []).map(async (order) => {
            const { data: itemsData } = await supabase
              .from('order_product_items')
              .select(`
                id,
                quantity,
                price,
                subtotal,
                product_variants (
                  name,
                  products (
                    name,
                    image_url
                  )
                )
              `)
              .eq('order_product_id', order.id);

            const items: OrderItem[] = ((itemsData as OrderItemRow[] | null) || []).map((item) => ({
              id: item.id,
              quantity: item.quantity,
              price: item.price,
              subtotal: item.subtotal,
              productName: item.product_variants?.products?.name || 'Product',
              variantName: item.product_variants?.name || 'Variant',
              imageUrl: item.product_variants?.products?.image_url || undefined,
            }));

            const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

            return {
              ...order,
              itemCount,
              items,
            };
          })
        );

        setOrders(ordersWithItems);
      } catch (error) {
        console.error('Error in fetchOrders:', error);
        setOrders([]);
      } finally {
        if (showLoader) setLoading(false);
      }
    },
    [user?.email]
  );

  useEffect(() => {
    fetchOrders(true);
  }, [fetchOrders]);

  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel('my_orders_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'order_products', filter: `user_id=eq.${userId}` },
        () => {
          fetchOrders(false);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, fetchOrders]);

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
        <span className="inline-block px-3 py-1 text-xs font-bold rounded-full bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
          Pending Payment
        </span>
      );
    }

    if (order.pickup_status === 'completed') {
      return (
        <span className="inline-block px-3 py-1 text-xs font-bold rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
          Picked Up
        </span>
      );
    }

    if (order.pickup_status === 'expired') {
      return (
        <span className="inline-block px-3 py-1 text-xs font-bold rounded-full bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400">
          Expired
        </span>
      );
    }

    if (order.pickup_status === 'cancelled') {
      return (
        <span className="inline-block px-3 py-1 text-xs font-bold rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
          Cancelled
        </span>
      );
    }

    return (
      <span className="inline-block px-3 py-1 text-xs font-bold rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
        Ready for Pickup
      </span>
    );
  };

  const toggleExpand = (orderId: number) => {
    setExpandedOrder(expandedOrder === orderId ? null : orderId);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background-light dark:bg-background-dark flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-500 dark:text-gray-400">Loading your orders...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark flex flex-col">
      <main className="flex-grow w-full max-w-[1000px] mx-auto py-8 px-4 md:px-10 mt-24">
        {/* Breadcrumb */}
        <div className="mb-8">
          <div className="w-full flex gap-2 pb-4">
            <button onClick={() => navigate('/')} className="text-[#9c4949] dark:text-primary/70 text-sm font-medium hover:text-primary">
              Home
            </button>
            <span className="text-[#9c4949] text-sm">/</span>
            <button className="text-[#9c4949] dark:text-primary/70 text-sm font-medium hover:text-primary">
              Dashboard
            </button>
            <span className="text-[#9c4949] text-sm">/</span>
            <span className="text-[#1c0d0d] dark:text-white text-sm font-medium">My Orders</span>
          </div>

          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-serif font-bold text-[#1c0d0d] dark:text-white tracking-tight mb-2">
                My Orders
              </h1>
              <p className="text-[#5c4a4a] dark:text-[#a89898] font-medium">
                Track your product orders and pickup codes
              </p>
            </div>

            {/* Tab Switcher */}
            <div className="flex gap-1 bg-white dark:bg-[#1c0d0d] p-1 rounded-lg border border-[#f4e7e7] dark:border-[#331a1a]">
              <button
                onClick={() => setActiveTab('active')}
                className={`px-4 py-1.5 text-sm font-bold rounded shadow-sm transition-colors ${
                  activeTab === 'active'
                    ? 'bg-primary text-white'
                    : 'text-[#9c4949] hover:bg-background-light dark:hover:bg-[#2a1616]'
                }`}
              >
                Active
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`px-4 py-1.5 text-sm font-bold rounded shadow-sm transition-colors ${
                  activeTab === 'history'
                    ? 'bg-primary text-white'
                    : 'text-[#9c4949] hover:bg-background-light dark:hover:bg-[#2a1616]'
                }`}
              >
                History
              </button>
            </div>
          </div>
        </div>

        {/* Orders List */}
        <div className="space-y-4">
          {displayOrders.length > 0 ? (
            displayOrders.map((order) => (
              <div
                key={order.id}
                className="group bg-white dark:bg-[#1c0d0d] rounded-xl border border-[#f4e7e7] dark:border-[#331a1a] shadow-sm hover:shadow-lg hover:border-primary/20 transition-all overflow-hidden"
              >
                {/* Order Header */}
                <div className="p-6">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                    <div className="flex-1">
                      <div className="flex items-center flex-wrap gap-3 mb-2">
                        <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-primary">
                          Order
                        </span>
                        <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                        <span className="text-xs font-medium text-gray-500 font-mono tracking-wide">
                          #{order.order_number}
                        </span>
                        <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                        {getStatusBadge(order)}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-[#5c4a4a] dark:text-[#a89898]">
                        <span className="material-symbols-outlined text-base">schedule</span>
                        <span>{formatDate(order.created_at)}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total</p>
                        <p className="text-xl font-serif font-bold text-[#1c0d0d] dark:text-white">
                          ${order.total.toFixed(2)}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{order.itemCount} items</p>
                      </div>
                    </div>
                  </div>

                  {/* QR Code Section - Only show for paid orders */}
                  {order.payment_status === 'paid' && order.pickup_code && order.pickup_status === 'pending_pickup' && (
                    <div className="mt-6 p-4 bg-background-light dark:bg-[#2a1616] rounded-lg border border-[#f4e7e7] dark:border-[#331a1a]">
                      <div className="flex flex-col md:flex-row items-center gap-6">
                        <div className="bg-white p-4 rounded-lg">
                          <QRCode value={order.pickup_code} size={120} />
                        </div>
                        <div className="flex-1 text-center md:text-left">
                          <p className="text-xs uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-1">
                            Pickup Code
                          </p>
                          <p className="font-display text-2xl text-primary mb-2">{order.pickup_code}</p>
                          <p className="text-sm text-gray-600 dark:text-gray-300">
                            Show this QR code to admin when picking up your items
                          </p>
                          {order.pickup_expires_at && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
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
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-bold text-[#9c4949] hover:text-primary border border-[#f4e7e7] dark:border-[#331a1a] rounded-lg hover:bg-background-light dark:hover:bg-[#2a1616] transition-colors"
                    >
                      <span className="material-symbols-outlined text-lg">
                        {expandedOrder === order.id ? 'expand_less' : 'expand_more'}
                      </span>
                      {expandedOrder === order.id ? 'Hide' : 'View'} Items
                    </button>
                    {order.payment_status === 'paid' && order.pickup_code && (
                      <button
                        onClick={() => navigate(`/order/product/success/${order.order_number}`)}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-bold text-white bg-primary rounded-lg hover:bg-red-700 transition-colors shadow-sm shadow-primary/20"
                      >
                        <span className="material-symbols-outlined text-lg">qr_code_scanner</span>
                        View Full Details
                      </button>
                    )}
                  </div>
                </div>

                {/* Expanded Items Section */}
                {expandedOrder === order.id && (
                  <div className="border-t border-[#f4e7e7] dark:border-[#331a1a] bg-background-light dark:bg-[#2a1616] p-6">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-4">
                      Order Items
                    </h3>
                    <div className="space-y-3">
                      {order.items.map((item) => (
                        <div key={item.id} className="flex items-center gap-4">
                          <div className="h-16 w-12 bg-white dark:bg-background-dark rounded overflow-hidden flex items-center justify-center">
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
                            <p className="truncate font-medium text-gray-900 dark:text-white">{item.productName}</p>
                            <p className="truncate text-sm text-gray-500 dark:text-gray-400">
                              {item.variantName} · {item.quantity} × ${item.price.toFixed(2)}
                            </p>
                          </div>
                          <span className="font-medium text-gray-900 dark:text-white">${item.subtotal.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="text-center py-16">
              <span className="material-symbols-outlined text-6xl text-gray-300 dark:text-gray-700 mb-4">
                {activeTab === 'active' ? 'shopping_bag' : 'history'}
              </span>
              <p className="text-gray-500 dark:text-gray-400 text-lg mb-2">
                {activeTab === 'active' ? 'No active orders' : 'No order history yet'}
              </p>
              <p className="text-gray-400 dark:text-gray-500 text-sm mb-6">
                {activeTab === 'active'
                  ? 'Your paid orders ready for pickup will appear here'
                  : 'Your completed and past orders will appear here'}
              </p>
              <button
                onClick={() => navigate('/shop')}
                className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white text-sm font-bold rounded-lg hover:bg-red-700 transition-colors"
              >
                <span className="material-symbols-outlined">shopping_cart</span>
                Browse Shop
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
