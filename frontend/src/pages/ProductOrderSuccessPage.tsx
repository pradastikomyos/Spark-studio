import { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { Link, useParams, useLocation } from 'react-router-dom';
import QRCode from 'react-qr-code';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { formatCurrency } from '../utils/formatters';
import { useToast } from '../components/Toast';
import OrderSuccessSkeleton from '../components/skeletons/OrderSuccessSkeleton';

type ProductOrder = {
  id: number;
  order_number: string;
  payment_status: string;
  status: string;
  pickup_code: string | null;
  pickup_status: string | null;
  pickup_expires_at: string | null;
  paid_at: string | null;
  total: number;
  created_at: string | null;
};

type ProductOrderItem = {
  id: number;
  quantity: number;
  price: number;
  subtotal: number;
  productName: string;
  variantName: string;
  imageUrl?: string;
};

export default function ProductOrderSuccessPage() {
  const params = useParams();
  const location = useLocation();
  const orderNumber = params.orderNumber || '';
  const { showToast } = useToast();
  const hasShownSuccessToast = useRef(false);

  const [order, setOrder] = useState<ProductOrder | null>(null);
  const [items, setItems] = useState<ProductOrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  const pickupCode = order?.pickup_code ?? null;
  const { session } = useAuth();
  const [autoSyncInProgress, setAutoSyncInProgress] = useState(false);

  // Show success toast and confetti if coming from successful payment
  useEffect(() => {
    const state = location.state as { paymentSuccess?: boolean; isPending?: boolean } | null;
    
    if (!hasShownSuccessToast.current && state?.paymentSuccess) {
      hasShownSuccessToast.current = true;
      setShowConfetti(true);
      showToast('success', '\ud83c\udf89 Payment confirmed! Your order is ready for pickup.');
      
      // Hide confetti after animation
      const timer = setTimeout(() => setShowConfetti(false), 5000);
      return () => clearTimeout(timer);
    } else if (!hasShownSuccessToast.current && state?.isPending) {
      hasShownSuccessToast.current = true;
      showToast('info', 'Your payment is being processed. We\u2019ll update the status shortly.');
    }
  }, [location.state, showToast]);

  const fetchOrder = useCallback(async () => {
    if (!orderNumber) return;
    const { data, error: orderError } = await supabase
      .from('order_products')
      .select('id, order_number, payment_status, status, pickup_code, pickup_status, pickup_expires_at, paid_at, total, created_at')
      .eq('order_number', orderNumber)
      .single();

    if (orderError || !data) throw orderError ?? new Error('Order not found');
    setOrder(data as unknown as ProductOrder);

    const orderId = Number((data as unknown as { id: number | string }).id);
    const { data: itemRows, error: itemsError } = await supabase
      .from('order_product_items')
      .select('id, quantity, price, subtotal, product_variants(name, product_id, products(name, image_url, product_images(image_url, is_primary)))')
      .eq('order_product_id', orderId);

    if (itemsError) throw itemsError;
    const mapped: ProductOrderItem[] = (itemRows || []).map((row) => {
      const pv = (row as unknown as { 
        product_variants?: { 
          name?: string; 
          products?: { 
            name?: string; 
            image_url?: string | null;
            product_images?: { image_url?: string | null; is_primary?: boolean }[] | null;
          } | null 
        } | null 
      }).product_variants;
      
      // Try to get image: 1) products.image_url, 2) primary product_image, 3) first product_image
      let imageUrl: string | undefined = pv?.products?.image_url ?? undefined;
      
      if (!imageUrl && pv?.products?.product_images && Array.isArray(pv.products.product_images)) {
        const primaryImage = pv.products.product_images.find((img) => img.is_primary);
        imageUrl = primaryImage?.image_url ?? pv.products.product_images[0]?.image_url ?? undefined;
      }
      
      return {
        id: Number((row as unknown as { id: number | string }).id),
        quantity: Number((row as unknown as { quantity: number | string }).quantity),
        price: Number((row as unknown as { price: number | string }).price),
        subtotal: Number((row as unknown as { subtotal: number | string }).subtotal),
        productName: String(pv?.products?.name ?? 'Product'),
        variantName: String(pv?.name ?? 'Variant'),
        imageUrl,
      };
    });
    setItems(mapped);
  }, [orderNumber]);

  const handleSyncStatus = useCallback(async (isAutoSync = false) => {
    if (!orderNumber) return;

    // Prevent concurrent auto-sync calls
    if (isAutoSync && autoSyncInProgress) return;

    if (isAutoSync) {
      setAutoSyncInProgress(true);
    } else {
      setRefreshing(true);
    }

    setError(null);

    try {
      const token = session?.access_token;
      if (!token) {
        if (!isAutoSync) setError('Not authenticated');
        return;
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sync-midtrans-product-status`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ order_number: orderNumber }),
        }
      );

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        if (!isAutoSync) setError(data?.error || 'Failed to sync status');
        return;
      }

      if (data?.order) {
        // Only update if status changed or data is newer
        setOrder((prev) => {
          if (!prev) return data.order;
          // Simple merge or replacement
          return { ...prev, ...data.order };
        });

        // If status changed to paid, fetch details to get pickup code and items
        // We use the response status to check
        if (data.order.payment_status === 'paid') {
          // Re-fetch everything to ensure we have consistent state (items, etc.)
          await fetchOrder();
        }
      }
    } catch (e) {
      if (!isAutoSync) setError(e instanceof Error ? e.message : 'Failed to sync status');
    } finally {
      if (isAutoSync) {
        setAutoSyncInProgress(false);
      } else {
        setRefreshing(false);
      }
    }
  }, [orderNumber, session, autoSyncInProgress, fetchOrder]);



  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        setLoading(true);
        setError(null);
        await fetchOrder();
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : 'Failed to load order');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [orderNumber, fetchOrder]);

  useEffect(() => {
    if (!orderNumber) return;

    const channel = supabase
      .channel(`order_products:${orderNumber}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'order_products', filter: `order_number=eq.${orderNumber}` },
        async (payload) => {
          const next = (payload as unknown as { new?: ProductOrder }).new;
          if (!next) return;
          setOrder((prev) => ({ ...(prev || ({} as ProductOrder)), ...next }));
          if (next.payment_status === 'paid' || next.pickup_code) {
            await fetchOrder();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchOrder, orderNumber]);



  // Active Sync / Aggressive Polling
  useEffect(() => {
    if (!orderNumber) return;
    if (pickupCode || order?.payment_status === 'paid') return;

    const delaysMs = [0, 5000, 15000, 35000];
    let timeout: ReturnType<typeof setTimeout> | null = null;
    let cancelled = false;

    const runAttempt = (attempt: number) => {
      if (cancelled) return;
      if (attempt >= delaysMs.length) return;

      timeout = setTimeout(async () => {
        await handleSyncStatus(true);
        runAttempt(attempt + 1);
      }, delaysMs[attempt]);
    };

    runAttempt(0);

    return () => {
      cancelled = true;
      if (timeout) clearTimeout(timeout);
    };
  }, [orderNumber, pickupCode, order?.payment_status, handleSyncStatus]);

  const totalItems = useMemo(() => items.reduce((sum, i) => sum + i.quantity, 0), [items]);
  const formatPickupExpiry = (value: string) =>
    new Date(value).toLocaleString('en-US', {
      timeZone: 'Asia/Jakarta',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
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
    <div className="min-h-screen bg-background-light relative overflow-hidden">
      {/* Confetti Animation */}
      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none z-50" aria-hidden="true">
          <div className="absolute inset-0 flex justify-center">
            {[...Array(50)].map((_, i) => (
              <div
                key={i}
                className="absolute animate-confetti"
                style={{
                  left: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 2}s`,
                  animationDuration: `${3 + Math.random() * 2}s`,
                }}
              >
                <div
                  className="w-3 h-3 rounded-sm"
                  style={{
                    backgroundColor: ['#ff4b86', '#fbbf24', '#34d399', '#60a5fa', '#a78bfa', '#f472b6'][Math.floor(Math.random() * 6)],
                    transform: `rotate(${Math.random() * 360}deg)`,
                  }}
                />
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Success Banner - Show when payment confirmed */}
      {order?.payment_status === 'paid' && !loading && (
        <div className="bg-gradient-to-r from-green-500 to-emerald-500 text-white py-4 px-6 text-center animate-fade-in">
          <div className="flex items-center justify-center gap-3">
            <span className="material-symbols-outlined text-2xl">check_circle</span>
            <div>
              <p className="font-bold text-lg">Payment Successful!</p>
              <p className="text-sm text-white/90">Your order is confirmed and ready for pickup</p>
            </div>
          </div>
        </div>
      )}
      
      <main className="max-w-4xl mx-auto px-6 lg:px-12 py-16 w-full">
        <header className="mb-10 border-b border-gray-200 pb-6">
          <div className="flex items-center gap-4 mb-2">
            {order?.payment_status === 'paid' && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold uppercase tracking-wider bg-green-100 text-green-700 rounded-full">
                <span className="material-symbols-outlined text-sm">verified</span>
                Paid
              </span>
            )}
            {order?.payment_status !== 'paid' && order && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold uppercase tracking-wider bg-amber-100 text-amber-700 rounded-full">
                <span className="material-symbols-outlined text-sm animate-pulse">schedule</span>
                Pending
              </span>
            )}
          </div>
          <h1 className="font-display text-4xl md:text-5xl font-light">
            {order?.payment_status === 'paid' ? 'Order Confirmed' : 'Order Created'}
          </h1>
          <p className="mt-2 text-sm text-gray-500 uppercase tracking-widest">
            {order?.payment_status === 'paid' ? 'Pick up in store' : 'Waiting for payment confirmation'}
          </p>
        </header>

        {error && <div className="mb-6 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-700">{error}</div>}

        {loading || !order ? (
          <OrderSuccessSkeleton />
        ) : (
          <>
            <section className="rounded-xl border border-gray-200 bg-white/50 p-6">
              <div className="flex flex-col md:flex-row md:items-start gap-8">
                <div className="flex-1">
                  <h2 className="font-display text-2xl mb-2">Pickup QR</h2>
                  <p className="text-sm text-gray-500">
                    Show this QR code to admin when picking up your items.
                  </p>
                  <div className="mt-6">
                    {pickupCode ? (
                      <div className="inline-flex flex-col items-center gap-4 rounded-xl border border-gray-200 bg-white p-6">
                        <div className="bg-white p-4 rounded-lg">
                          <QRCode value={pickupCode} size={220} />
                        </div>
                        <div className="text-center">
                          <p className="text-xs uppercase tracking-widest text-gray-500 mb-1">Pickup Code</p>
                          <p className="font-display text-2xl text-primary">{pickupCode}</p>
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-xl border border-gray-200 bg-white p-6 animate-fade-in">
                        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                          <p className="text-sm text-yellow-700 flex items-center gap-2">
                            <span className="material-symbols-outlined text-base">info</span>
                            Payment verification is taking longer.
                          </p>
                        </div>
                        <p className="mt-2 text-xs text-gray-500 mb-4">
                          Your payment might be confirmed but delayed. Click below to check status manually.
                        </p>
                        <button
                          onClick={() => handleSyncStatus(false)}
                          disabled={refreshing || autoSyncInProgress}
                          className="w-full bg-[#ff4b86] text-white py-3 uppercase tracking-widest text-xs font-bold hover:bg-[#e63d75] transition-colors disabled:opacity-60 shadow-lg shadow-red-900/10"
                        >
                          {refreshing || autoSyncInProgress ? 'Checking...' : 'Check Status Manually'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="w-full md:w-80">
                  <div className="rounded-xl border border-gray-200 bg-white p-5">
                    <p className="text-xs uppercase tracking-widest text-gray-500">Order Number</p>
                    <p className="font-display text-xl mt-1">{orderNumber}</p>
                    <div className="mt-4 space-y-2 text-sm text-gray-700">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Status</span>
                        <span className="font-medium">{order?.payment_status ?? '-'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Items</span>
                        <span className="font-medium">{totalItems}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Total</span>
                        <span className="font-medium">{formatCurrency(Number(order?.total ?? 0))}</span>
                      </div>
                    </div>
                    {order?.pickup_expires_at && (
                      <p className="mt-4 text-xs text-gray-500">
                        Pickup expires: {formatPickupExpiry(order.pickup_expires_at)}
                      </p>
                    )}
                  </div>

                  <div className="mt-4 space-y-3">
                    <Link
                      to="/my-orders"
                      className="w-full flex items-center justify-center gap-2 bg-[#ff4b86] text-white py-3 uppercase tracking-widest text-xs font-bold hover:bg-[#e63d75] transition-colors"
                    >
                      <span className="material-symbols-outlined text-base">receipt_long</span>
                      View All My Orders
                    </Link>
                    <Link
                      to="/shop"
                      className="w-full text-center border border-gray-200 py-3 uppercase tracking-widest text-xs font-bold text-gray-700 hover:bg-gray-100:bg-white/5 transition-colors"
                    >
                      Back to Shop
                    </Link>
                  </div>
                </div>
              </div>
            </section>

            <section className="mt-10 rounded-xl border border-gray-200 bg-white/50 p-6">
              <h2 className="font-display text-2xl mb-6">Order Items</h2>
              <div className="space-y-4">
                {items.map((i) => (
                  <div key={i.id} className="flex items-center gap-4">
                    <div className="h-16 w-12 bg-gray-100 rounded overflow-hidden flex items-center justify-center">
                      {i.imageUrl ? (
                        <img alt={i.productName} src={i.imageUrl} className="h-full w-full object-cover" loading="lazy" />
                      ) : (
                        <span className="material-symbols-outlined text-gray-400">inventory_2</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="truncate font-medium text-gray-900">{i.productName}</p>
                      <p className="truncate text-sm text-gray-500">
                        {i.variantName} · {i.quantity} × {formatCurrency(i.price)}
                      </p>
                    </div>
                    <span className="font-medium text-gray-900">{formatCurrency(i.subtotal)}</span>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}
