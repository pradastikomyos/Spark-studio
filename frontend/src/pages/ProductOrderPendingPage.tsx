import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import QRCode from 'react-qr-code';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { formatCurrency } from '../utils/formatters';
import { useToast } from '../components/Toast';
import OrderSuccessSkeleton from '../components/skeletons/OrderSuccessSkeleton';

export default function ProductOrderPendingPage() {
  const params = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const orderNumber = params.orderNumber || '';
  const { showToast } = useToast();
  const { session } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [order, setOrder] = useState<{
    id: number;
    order_number: string;
    payment_status: string;
    status: string;
    total: number;
    created_at: string | null;
    payment_url: string | null;
    payment_data: unknown | null;
    pickup_code: string | null;
  } | null>(null);
  const [items, setItems] = useState<
    {
      id: number;
      quantity: number;
      price: number;
      subtotal: number;
      productName: string;
      variantName: string;
      imageUrl?: string;
    }[]
  >([]);
  const [now, setNow] = useState(() => Date.now());
  const hasAutoSynced = useRef(false);

  useEffect(() => {
    if (!orderNumber) {
      navigate('/shop', { replace: true, state: { from: location.pathname } });
    }
  }, [location.pathname, navigate, orderNumber]);

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const fetchOrder = useCallback(async () => {
    if (!orderNumber) return;
    const primarySelect = 'id, order_number, payment_status, status, total, created_at, payment_url, payment_data, pickup_code';
    const fallbackSelect = 'id, order_number, payment_status, status, total, created_at, payment_url, pickup_code';

    let result = await supabase
      .from('order_products')
      .select(primarySelect)
      .eq('order_number', orderNumber)
      .single();

    const errorCode = (result.error as { code?: string } | null)?.code;
    if (result.error && (errorCode === '42703' || errorCode === 'PGRST204')) {
      result = await supabase
        .from('order_products')
        .select(fallbackSelect)
        .eq('order_number', orderNumber)
        .single();
    }

    if (result.error || !result.data) throw result.error ?? new Error('Order not found');
    setOrder(result.data as unknown as typeof order);

    const orderId = Number((result.data as unknown as { id: number | string }).id);
    const { data: itemRows, error: itemsError } = await supabase
      .from('order_product_items')
      .select('id, quantity, price, subtotal, product_variants(name, product_id, products(name, image_url, product_images(image_url, is_primary)))')
      .eq('order_product_id', orderId);

    if (itemsError) throw itemsError;

    const mapped = (itemRows || []).map((row) => {
      const pv = (row as unknown as {
        product_variants?: {
          name?: string;
          products?: {
            name?: string;
            image_url?: string | null;
            product_images?: { image_url?: string | null; is_primary?: boolean }[] | null;
          } | null;
        } | null;
      }).product_variants;

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

  const handleSyncStatus = useCallback(async (silent = false) => {
    if (!orderNumber) return;
    setRefreshing(true);
    setError(null);
    try {
      const token = session?.access_token;
      if (!token) {
        setError('Not authenticated');
        return;
      }
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sync-midtrans-product-status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ order_number: orderNumber }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        setError(data?.error || 'Failed to sync status');
        return;
      }
      if (!silent) showToast('success', 'Status refreshed.');
      await fetchOrder();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to sync status');
    } finally {
      setRefreshing(false);
    }
  }, [fetchOrder, orderNumber, session, showToast]);

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
  }, [fetchOrder]);

  useEffect(() => {
    if (!orderNumber) return;
    const channel = supabase
      .channel(`order_products:${orderNumber}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'order_products', filter: `order_number=eq.${orderNumber}` },
        async (payload) => {
          const next = (payload as unknown as { new?: typeof order }).new;
          if (!next) return;
          setOrder((prev) => ({ ...(prev || ({} as NonNullable<typeof order>)), ...next }));
          if (String((next as unknown as { payment_status?: string }).payment_status || '').toLowerCase() === 'paid') {
            navigate(`/order/product/success/${orderNumber}`, { replace: true, state: location.state });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [location.state, navigate, orderNumber]);

  useEffect(() => {
    if (!order) return;
    if (String(order.payment_status || '').toLowerCase() !== 'paid') return;
    navigate(`/order/product/success/${orderNumber}`, { replace: true, state: location.state });
  }, [location.state, navigate, order, orderNumber]);

  useEffect(() => {
    if (!order) return;
    if (hasAutoSynced.current) return;
    if (order.payment_data) return;
    if (String(order.payment_status || '').toLowerCase() === 'paid') return;
    const orderStatus = String(order.status || '').toLowerCase();
    const paymentStatus = String(order.payment_status || '').toLowerCase();
    if (orderStatus === 'expired' || orderStatus === 'cancelled') return;
    if (paymentStatus === 'failed' || paymentStatus === 'refunded') return;
    hasAutoSynced.current = true;
    void handleSyncStatus(true);
  }, [handleSyncStatus, order]);

  const paymentInfo = useMemo(() => {
    const raw = order?.payment_data as
      | {
          payment_type?: string;
          expiry_time?: string;
          transaction_time?: string;
          gross_amount?: string | number;
          va_numbers?: { bank?: string; va_number?: string }[];
          permata_va_number?: string;
          bill_key?: string;
          biller_code?: string;
          payment_code?: string;
          store?: string;
          qr_string?: string;
          actions?: { name?: string; method?: string; url?: string }[];
        }
      | null
      | undefined;

    const expiry = raw?.expiry_time ? new Date(raw.expiry_time) : null;
    const paymentType = raw?.payment_type ? String(raw.payment_type) : null;
    const primaryVa = Array.isArray(raw?.va_numbers) && raw.va_numbers.length > 0 ? raw.va_numbers[0] : null;

    return {
      raw,
      paymentType,
      expiryAt: expiry && !Number.isNaN(expiry.getTime()) ? expiry : null,
      primaryCode:
        primaryVa?.va_number ||
        raw?.permata_va_number ||
        raw?.bill_key ||
        raw?.payment_code ||
        null,
      primaryCodeLabel:
        primaryVa?.va_number
          ? `${String(primaryVa.bank || 'VA').toUpperCase()} Virtual Account`
          : raw?.permata_va_number
            ? 'Permata Virtual Account'
            : raw?.bill_key
              ? 'Bill Key'
              : raw?.payment_code
                ? 'Payment Code'
                : null,
      actions: raw?.actions || [],
      qrString: raw?.qr_string || null,
      billerCode: raw?.biller_code || null,
      store: raw?.store || null,
    };
  }, [order?.payment_data]);

  const instructionSteps = useMemo(() => {
    if (!paymentInfo.paymentType) return [];
    if (paymentInfo.paymentType === 'bank_transfer') {
      return [
        'Log in to your mobile banking or ATM and select "Transfer / Virtual Account".',
        'Enter the Virtual Account number displayed above.',
        `Ensure the total amount matches exactly ${formatCurrency(Number(order?.total ?? 0))}.`,
      ];
    }
    if (paymentInfo.paymentType === 'cstore') {
      return [
        'Go to the selected store and tell the cashier you want to make a payment.',
        'Provide the payment code displayed above.',
        `Pay the exact amount ${formatCurrency(Number(order?.total ?? 0))}.`,
      ];
    }
    if (paymentInfo.paymentType === 'qris') {
      return [
        'Open your preferred e-wallet or mobile banking app.',
        'Scan the QR code shown above.',
        `Confirm the payment amount ${formatCurrency(Number(order?.total ?? 0))} and complete the payment.`,
      ];
    }
    return [
      'Complete the payment using your selected method.',
      'Return to this page and tap "Check Status" to refresh.',
      'If the status remains pending, please wait a moment and try again.',
    ];
  }, [order?.total, paymentInfo.paymentType]);

  const remainingMs = useMemo(() => {
    if (!paymentInfo.expiryAt) return null;
    return Math.max(0, paymentInfo.expiryAt.getTime() - now);
  }, [now, paymentInfo.expiryAt]);

  const countdown = useMemo(() => {
    if (remainingMs === null) return null;
    const totalSeconds = Math.floor(remainingMs / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return { hours, minutes, seconds };
  }, [remainingMs]);

  const statusView = useMemo(() => {
    const paymentStatus = String(order?.payment_status || '').toLowerCase();
    const orderStatus = String(order?.status || '').toLowerCase();

    if (orderStatus === 'expired') {
      return {
        kind: 'expired' as const,
        title: 'Payment Expired',
        description: 'This order has expired. Please create a new order to try again.',
        icon: 'timer_off',
        iconBg: 'bg-red-50',
        iconText: 'text-red-600',
        accentText: 'text-red-600',
        allowPayNow: false,
        allowInstructions: false,
      };
    }

    if (orderStatus === 'cancelled') {
      return {
        kind: 'cancelled' as const,
        title: 'Order Cancelled',
        description: 'This order was cancelled. Please place a new order if you still want the items.',
        icon: 'cancel',
        iconBg: 'bg-red-50',
        iconText: 'text-red-600',
        accentText: 'text-red-600',
        allowPayNow: false,
        allowInstructions: false,
      };
    }

    if (paymentStatus === 'failed') {
      return {
        kind: 'failed' as const,
        title: 'Payment Failed',
        description: 'Your payment could not be completed. Please try again or use a different method.',
        icon: 'error',
        iconBg: 'bg-red-50',
        iconText: 'text-red-600',
        accentText: 'text-red-600',
        allowPayNow: false,
        allowInstructions: false,
      };
    }

    if (paymentStatus === 'refunded') {
      return {
        kind: 'refunded' as const,
        title: 'Payment Refunded',
        description: 'This payment was refunded. If you still want the items, please create a new order.',
        icon: 'undo',
        iconBg: 'bg-slate-50',
        iconText: 'text-slate-700',
        accentText: 'text-slate-700',
        allowPayNow: false,
        allowInstructions: false,
      };
    }

    return {
      kind: 'pending' as const,
      title: 'Awaiting Payment',
      description:
        'Please complete your payment to secure your order items. You can come back later and finish payment anytime before it expires.',
      icon: 'schedule',
      iconBg: 'bg-orange-50',
      iconText: 'text-orange-500',
      accentText: 'text-primary',
      allowPayNow: true,
      allowInstructions: true,
    };
  }, [order?.payment_status, order?.status]);

  const copyToClipboard = useCallback(
    async (value: string) => {
      try {
        await navigator.clipboard.writeText(value);
        showToast('success', 'Copied');
      } catch {
        showToast('error', 'Failed to copy');
      }
    },
    [showToast]
  );

  if (!orderNumber) return null;

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
              <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
                <div className="flex flex-col items-center text-center space-y-4">
                  <div className={`w-20 h-20 ${statusView.iconBg} rounded-full flex items-center justify-center mb-2`}>
                    <span className={`material-symbols-outlined ${statusView.iconText} text-4xl`}>{statusView.icon}</span>
                  </div>
                  <h2 className="text-2xl font-semibold">{statusView.title}</h2>
                  <p className="text-gray-500 max-w-md">{statusView.description}</p>

                  {statusView.kind === 'pending' && countdown && (
                    <div className="flex space-x-4 mt-4">
                      <div className="flex flex-col">
                        <span className="text-3xl font-bold text-gray-800">{String(countdown.hours).padStart(2, '0')}</span>
                        <span className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">Hours</span>
                      </div>
                      <span className="text-3xl font-bold text-gray-300">:</span>
                      <div className="flex flex-col">
                        <span className="text-3xl font-bold text-gray-800">{String(countdown.minutes).padStart(2, '0')}</span>
                        <span className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">Mins</span>
                      </div>
                      <span className="text-3xl font-bold text-gray-300">:</span>
                      <div className="flex flex-col">
                        <span className="text-3xl font-bold text-gray-800">{String(countdown.seconds).padStart(2, '0')}</span>
                        <span className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">Secs</span>
                      </div>
                    </div>
                  )}
                </div>

                {statusView.allowInstructions ? (
                  <div className="mt-12 border-t border-gray-50 pt-8">
                    <h3 className="text-sm font-bold uppercase tracking-wider mb-6 text-gray-400">Payment Instructions</h3>

                    <div className="space-y-6">
                      {paymentInfo.primaryCode ? (
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 p-4 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                          <div>
                            <p className="text-xs text-gray-500 mb-1">
                              {paymentInfo.primaryCodeLabel || 'Payment Code'}
                            </p>
                            <p className="text-xl font-mono font-bold tracking-wider">{paymentInfo.primaryCode}</p>
                            {paymentInfo.billerCode && (
                              <p className="mt-2 text-xs text-gray-500">
                                Biller Code: <span className="font-mono font-semibold">{paymentInfo.billerCode}</span>
                              </p>
                            )}
                            {paymentInfo.store && (
                              <p className="mt-1 text-xs text-gray-500">
                                Store: <span className="font-semibold">{paymentInfo.store}</span>
                              </p>
                            )}
                          </div>
                          <button
                            onClick={() => copyToClipboard(paymentInfo.primaryCode!)}
                            className="text-primary text-xs font-bold hover:underline flex items-center justify-center gap-2"
                          >
                            COPY <span className="material-symbols-outlined text-sm">content_copy</span>
                          </button>
                        </div>
                      ) : (
                        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
                          Tap “Check Status” to load payment instructions, or use “Pay Now” to continue.
                        </div>
                      )}

                      {paymentInfo.qrString && (
                        <div className="rounded-2xl border border-gray-100 bg-white p-6">
                          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">QR Payment</p>
                          <div className="flex justify-center">
                            <div className="bg-white p-4 rounded-xl border border-gray-100">
                              <QRCode value={paymentInfo.qrString} size={220} />
                            </div>
                          </div>
                        </div>
                      )}

                      {instructionSteps.length > 0 && (
                        <div className="space-y-4">
                          {instructionSteps.slice(0, 3).map((step, idx) => (
                            <div key={idx} className="flex items-start gap-3">
                              <span className="w-6 h-6 rounded-full bg-gray-200 text-xs flex items-center justify-center flex-shrink-0">
                                {idx + 1}
                              </span>
                              <p className="text-sm text-gray-600 pt-0.5">{step}</p>
                            </div>
                          ))}
                        </div>
                      )}

                      {Array.isArray(paymentInfo.actions) && paymentInfo.actions.length > 0 && (
                        <div className="rounded-2xl border border-gray-100 bg-white p-6">
                          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Payment Actions</p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {paymentInfo.actions
                              .filter((a) => a?.url)
                              .slice(0, 4)
                              .map((a, idx) => (
                                <a
                                  key={`${a?.name || 'action'}-${idx}`}
                                  href={String(a.url)}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="w-full bg-white border border-gray-200 hover:border-primary/30 py-3 rounded-xl font-bold text-gray-700 transition-colors flex items-center justify-center gap-2"
                                >
                                  <span className="material-symbols-outlined text-base">open_in_new</span>
                                  <span className="text-xs tracking-widest uppercase">
                                    {String(a?.name || 'Open').replace(/_/g, ' ')}
                                  </span>
                                </a>
                              ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
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

            <aside className="space-y-6">
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 flex flex-col h-full sticky top-24">
                <h2 className="text-2xl font-display text-gray-900 mb-8">Order Summary</h2>
                <div className="space-y-4 flex-grow text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500">Subtotal</span>
                    <span className="font-medium">{formatCurrency(Number(order.total ?? 0))}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500">Tax (Included)</span>
                    <span className="font-medium">-</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500">Shipping</span>
                    <span className="font-medium">{formatCurrency(0)}</span>
                  </div>
                  <div className="border-t border-dashed border-gray-100 pt-6 mt-6 flex justify-between items-center">
                    <span className="text-lg font-bold">Total</span>
                    <span className="text-2xl font-bold text-primary">{formatCurrency(Number(order.total ?? 0))}</span>
                  </div>
                </div>

                <div className="mt-10 space-y-4">
                  {statusView.allowPayNow && order.payment_url ? (
                    <a
                      href={order.payment_url}
                      target="_blank"
                      rel="noreferrer"
                      className="w-full bg-primary hover:bg-primary-dark text-white font-bold py-4 rounded-xl shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-2"
                    >
                      PAY NOW <span className="material-symbols-outlined transition-transform">arrow_forward</span>
                    </a>
                  ) : (
                    <Link
                      to="/my-orders"
                      className="w-full bg-primary hover:bg-primary-dark text-white font-bold py-4 rounded-xl shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-2"
                    >
                      <span className="material-symbols-outlined">receipt_long</span>
                      <span className="text-xs tracking-widest uppercase">View My Orders</span>
                    </Link>
                  )}

                  <button
                    onClick={() => void handleSyncStatus()}
                    disabled={refreshing}
                    className="w-full border-2 border-gray-100 hover:border-primary/30 py-4 rounded-xl font-bold text-gray-600 transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
                  >
                    {refreshing ? 'CHECKING...' : 'CHECK STATUS'}
                  </button>

                  <Link
                    to="/shop"
                    className="w-full text-[10px] font-bold tracking-widest text-gray-400 hover:text-primary transition-colors flex items-center justify-center mt-4"
                  >
                    <span className="material-symbols-outlined text-sm mr-2">arrow_back</span>
                    CONTINUE SHOPPING
                  </Link>
                </div>
              </div>

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
