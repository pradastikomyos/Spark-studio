import { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { Link, useParams, useLocation, useNavigate } from 'react-router-dom';
import QRCode from 'react-qr-code';
import confetti from 'canvas-confetti';
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
  payment_url?: string | null;
  payment_data?: unknown | null;
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
  const navigate = useNavigate();
  const orderNumber = params.orderNumber || '';
  const { showToast } = useToast();
  const hasShownSuccessToast = useRef(false);

  const [order, setOrder] = useState<ProductOrder | null>(null);
  const [items, setItems] = useState<ProductOrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  
  const pickupCode = order?.pickup_code ?? null;
  const { initialized } = useAuth();
  const [autoSyncInProgress, setAutoSyncInProgress] = useState(false);
  const confettiTriggeredRef = useRef(false);

  // Confetti celebration effect (Match BookingSuccessPage)
  const triggerConfetti = useCallback(() => {
    if (confettiTriggeredRef.current) return;
    confettiTriggeredRef.current = true;

    const duration = 3000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 45, spread: 360, ticks: 100, zIndex: 9999, scalar: 1.2 };
    const colors = ['#FFD700', '#C0C0C0', '#FCEabb', '#EFEFEF'];

    const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

    const interval = window.setInterval(() => {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        clearInterval(interval);
        return;
      }

      const particleCount = 500 * (timeLeft / duration);

      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
        colors,
        shapes: ['square', 'circle', 'star'],
      });

      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
        colors,
        shapes: ['square', 'circle', 'star'],
      });
    }, 250);
  }, []);

  useEffect(() => {
    if (!order || loading) return;
    if (String(order.payment_status || '').toLowerCase() === 'paid') return;
    navigate(`/order/product/pending/${orderNumber}`, { replace: true, state: location.state });
  }, [loading, location.state, navigate, order, orderNumber]);

  // Show success toast and confetti if coming from successful payment
  useEffect(() => {
    const state = location.state as { paymentSuccess?: boolean; isPending?: boolean } | null;
    
    if (!hasShownSuccessToast.current && state?.paymentSuccess) {
      hasShownSuccessToast.current = true;
      triggerConfetti();
      showToast('success', '🎉 Payment confirmed! Your order is ready for pickup.');
    } else if (!hasShownSuccessToast.current && state?.isPending) {
      hasShownSuccessToast.current = true;
      showToast('info', 'Your payment is being processed. We’ll update the status shortly.');
    }
  }, [location.state, showToast, triggerConfetti]);

  const fetchOrder = useCallback(async () => {
    if (!orderNumber) return;
    const { data, error: orderError } = await supabase
      .from('order_products')
      .select(
        'id, order_number, payment_status, status, pickup_code, pickup_status, pickup_expires_at, paid_at, total, created_at, payment_url, payment_data'
      )
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

  const handleSyncStatus = useCallback(async (isAutoSync = false, retryCount = 0) => {
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
      // CRITICAL FIX: Always ensure we have a VALID token
      // 1. getSession() only returns localStorage data (may be expired)
      // 2. refreshSession() actually validates and renews the token
      
      let token: string | undefined;
      
      try {
        console.log(`[Product-Sync] Ensuring valid token (attempt ${retryCount + 1})...`);
        
        // Call Supabase refresh directly to get a guaranteed fresh token
        const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
        
        if (refreshError) {
          console.error('[Product-Sync] Token refresh error:', refreshError.message);
          const { data: { session: existingSession } } = await supabase.auth.getSession();
          token = existingSession?.access_token;
        } else if (refreshData.session) {
          token = refreshData.session.access_token;
          console.log('[Product-Sync] Got refreshed token successfully');
        }
      } catch (refreshError) {
        console.error('[Product-Sync] Session refresh failed:', refreshError);
        const { data: { session: fallbackSession } } = await supabase.auth.getSession();
        token = fallbackSession?.access_token;
      }
      
      if (!token) {
        if (!isAutoSync) setError('Not authenticated');
        if (isAutoSync) setAutoSyncInProgress(false);
        return;
      }

      console.log('[Product-Sync] Making API call with valid token...');
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

      // Handle 401 - retry once with delay
      if (response.status === 401 && retryCount < 1) {
        console.log('[Product-Sync] Got 401, retrying in 1s...');
        setAutoSyncInProgress(false);
        await new Promise(resolve => setTimeout(resolve, 1000));
        return handleSyncStatus(isAutoSync, retryCount + 1);
      }

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
  }, [orderNumber, autoSyncInProgress, fetchOrder]);



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
    // CRITICAL: Wait for auth to be initialized before attempting sync
    // This prevents 401 errors after Midtrans redirect when session is not yet ready
    if (!initialized) {
      console.log('[Product-Sync] Waiting for auth initialization...');
      return;
    }
    
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
  }, [initialized, orderNumber, pickupCode, order?.payment_status, handleSyncStatus]);

  const totalItems = useMemo(() => items.reduce((sum, i) => sum + i.quantity, 0), [items]);
  const paymentMethodLabel = useMemo(() => {
    const raw = order?.payment_data as
      | {
          payment_type?: string;
          va_numbers?: { bank?: string; va_number?: string }[];
          permata_va_number?: string;
          store?: string;
        }
      | null
      | undefined;

    const paymentType = raw?.payment_type ? String(raw.payment_type) : '';
    if (!paymentType) return 'Midtrans';

    if (paymentType === 'bank_transfer') {
      const va = Array.isArray(raw?.va_numbers) && raw.va_numbers.length > 0 ? raw.va_numbers[0] : null;
      if (va?.bank) return `${String(va.bank).toUpperCase()} Virtual Account`;
      if (raw?.permata_va_number) return 'Permata Virtual Account';
      return 'Bank Transfer';
    }

    if (paymentType === 'cstore') {
      if (raw?.store) return String(raw.store).toUpperCase();
      return 'Convenience Store';
    }

    if (paymentType === 'qris') return 'QRIS';
    if (paymentType === 'gopay') return 'GoPay';
    if (paymentType === 'shopeepay') return 'ShopeePay';
    if (paymentType === 'akulaku') return 'Akulaku';

    return paymentType.replace(/_/g, ' ').toUpperCase();
  }, [order?.payment_data]);
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
    <div className="bg-background-light relative overflow-hidden">
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        <div className="text-center mb-8">
          <p className="text-xs uppercase tracking-widest text-gray-400 font-semibold mb-3">
            Payment Successful
          </p>

          {/* Main Headline Image */}
          <div className="flex justify-center mb-2">
            <img 
              src="/images/landing/READY%20TO%20BE%20A%20STAR.PNG" 
              alt="Ready to Be a Star?" 
              className="h-auto w-full max-w-xl object-contain"
            />
          </div>
          
          <div className="text-gray-500 font-medium font-sans">
            Order Number
          </div>
          <div className="font-mono font-bold text-lg text-gray-900 tracking-wider">
            #{orderNumber}
          </div>
        </div>

        {error && (
          <div className="mb-8 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {loading || !order ? (
          <OrderSuccessSkeleton />
        ) : (
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
                          <p className="font-medium">{formatPickupExpiry(order.created_at)}</p>
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
                        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
                          <div className="bg-white p-4 rounded-xl border border-gray-100">
                            <QRCode value={pickupCode} size={200} />
                          </div>
                          <div className="flex-1 w-full">
                            <div className="bg-slate-50 p-4 rounded-lg">
                              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Pickup Code</p>
                              <p className="font-display text-2xl text-primary">{pickupCode}</p>
                              {order.pickup_expires_at && (
                                <p className="mt-2 text-sm text-gray-500">
                                  Pickup expires: {formatPickupExpiry(order.pickup_expires_at)}
                                </p>
                              )}
                            </div>
                            <p className="mt-3 text-sm text-gray-500">
                              Show this QR code to admin when picking up your items.
                            </p>
                          </div>
                        </div>
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
                  <div className="space-y-4">
                    {items.map((i) => (
                      <div key={i.id} className="flex items-center gap-4">
                        <div className="h-16 w-12 bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center">
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
              </div>

              <aside className="md:col-span-1">
                <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 sticky top-24">
                  <h2 className="text-xl font-display mb-6">Order Summary</h2>
                  <div className="space-y-4 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Items</span>
                      <span>{totalItems}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Subtotal</span>
                      <span>{formatCurrency(Number(order.total ?? 0))}</span>
                    </div>
                    <div className="pt-4 border-t border-dashed border-gray-200">
                      <div className="flex justify-between items-end">
                        <span className="text-base font-bold">Total Paid</span>
                        <span className="text-xl font-bold text-primary font-display">
                          {formatCurrency(Number(order.total ?? 0))}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-8 space-y-3">
                    <Link
                      to="/my-orders"
                      className="w-full py-4 bg-primary text-white rounded-full font-bold text-xs tracking-widest uppercase hover:bg-primary-dark transition-colors flex items-center justify-center space-x-2"
                    >
                      <span>View My Orders</span>
                      <span className="material-symbols-outlined text-sm">chevron_right</span>
                    </Link>
                    <Link
                      to="/shop"
                      className="w-full py-4 bg-transparent text-gray-600 border border-gray-200 rounded-full font-bold text-xs tracking-widest uppercase hover:bg-gray-50 transition-colors flex items-center justify-center space-x-2"
                    >
                      <span className="material-symbols-outlined text-sm">arrow_back</span>
                      <span>Continue Shopping</span>
                    </Link>
                  </div>
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
        )}
      </main>
    </div>
  );
}
