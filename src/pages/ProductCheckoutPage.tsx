import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/cartStore';
import { supabase } from '../lib/supabase';
import { loadSnapScript, type SnapResult } from '../utils/midtransSnap';

type CreateProductTokenResponse = {
  token: string;
  order_number: string;
};

export default function ProductCheckoutPage() {
  const navigate = useNavigate();
  const { user, session, initialized } = useAuth();
  const { items, subtotal, clear } = useCart();

  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [snapLoaded, setSnapLoaded] = useState(false);

  useEffect(() => {
    loadSnapScript()
      .then(() => setSnapLoaded(true))
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load payment system'));
  }, []);

  useEffect(() => {
    if (!user) return;
    const base = user.email ? user.email.split('@')[0] : '';
    if (base) setCustomerName(base);
  }, [user]);

  useEffect(() => {
    if (items.length === 0) navigate('/cart');
  }, [items.length, navigate]);

  const orderItems = useMemo(
    () =>
      items.map((i) => ({
        product_variant_id: i.variantId,
        product_name: i.productName,
        variant_name: i.variantName,
        quantity: i.quantity,
        unit_price: i.unitPrice,
        subtotal: i.unitPrice * i.quantity,
      })),
    [items]
  );

  const canCheckout = initialized && Boolean(session?.access_token) && snapLoaded && items.length > 0;

  const handlePay = async () => {
    if (!user) {
      navigate('/login');
      return;
    }

    if (!snapLoaded) {
      setError('Payment system not ready. Please refresh.');
      return;
    }

    if (!initialized || !session?.access_token) {
      setError('Session expired. Please refresh and login again.');
      return;
    }

    if (!customerName.trim()) {
      setError('Please enter your name');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (!user.email) throw new Error('Missing account email');

      const { data, error: invokeError } = await supabase.functions.invoke('create-midtrans-product-token', {
        body: {
          items: orderItems.map((i) => ({
            productVariantId: i.product_variant_id,
            name: `${i.product_name} - ${i.variant_name}`.slice(0, 50),
            price: i.unit_price,
            quantity: i.quantity,
          })),
          customerName: customerName.trim(),
          customerEmail: user.email,
          customerPhone: customerPhone.trim() || undefined,
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (invokeError) {
        console.error('Edge Function error:', invokeError);
        const contextError =
          typeof (invokeError as { context?: { error?: unknown } }).context?.error === 'string'
            ? String((invokeError as { context?: { error?: unknown } }).context?.error)
            : null;
        throw new Error(contextError || invokeError.message || 'Failed to create payment');
      }

      const payload = data as CreateProductTokenResponse;
      if (!payload.token || !payload.order_number) throw new Error('Invalid payment response');
      const orderNumber = payload.order_number;

      if (!window.snap) throw new Error('Midtrans Snap not loaded');

      window.snap.pay(payload.token, {
        onSuccess: () => {
          clear();
          navigate(`/order/product/success/${orderNumber}`);
        },
        onPending: (result: SnapResult) => {
          navigate(`/order/product/success/${orderNumber}`, { state: { paymentResult: result, isPending: true } });
        },
        onError: () => {
          setError('Payment failed. Please try again.');
        },
        onClose: () => {
          setLoading(false);
          navigate(`/order/product/success/${orderNumber}`, { state: { isPending: true } });
        },
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to process payment');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark">
      <main className="max-w-4xl mx-auto px-6 lg:px-12 py-16 w-full">
        <header className="mb-10 border-b border-gray-200 dark:border-gray-800 pb-6">
          <h1 className="font-display text-4xl md:text-5xl font-light">Checkout</h1>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 uppercase tracking-widest">Buy Online, Pick Up In Store</p>
        </header>

        {error && <div className="mb-6 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-700 dark:text-red-200">{error}</div>}

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-10">
          <section className="lg:col-span-3">
            <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white/50 dark:bg-surface-dark p-6">
              <h2 className="font-display text-2xl mb-6">Customer Details</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-2">Name</label>
                  <input
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-background-dark px-4 py-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                    placeholder="Your name"
                    type="text"
                  />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-2">Phone (optional)</label>
                  <input
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-background-dark px-4 py-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                    placeholder="08xxxxxxxxxx"
                    type="tel"
                  />
                </div>
              </div>
            </div>
          </section>

          <aside className="lg:col-span-2">
            <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white/50 dark:bg-surface-dark p-6 sticky top-24">
              <h2 className="font-display text-2xl mb-6">Order Summary</h2>
              <div className="space-y-3 text-sm mb-6">
                {orderItems.map((i) => (
                  <div key={i.product_variant_id} className="flex justify-between gap-4 text-gray-700 dark:text-gray-200">
                    <div className="min-w-0">
                      <p className="truncate">{i.product_name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {i.variant_name} · {i.quantity} × ${i.unit_price.toFixed(2)}
                      </p>
                    </div>
                    <span className="font-medium">${i.subtotal.toFixed(2)}</span>
                  </div>
                ))}
              </div>
              <div className="border-t border-gray-200 dark:border-gray-800 pt-4 flex justify-between items-center">
                <span className="uppercase tracking-widest text-xs text-gray-500 dark:text-gray-400">Total</span>
                <span className="font-display text-2xl text-primary">${subtotal.toFixed(2)}</span>
              </div>
              <button
                onClick={handlePay}
                disabled={loading || !canCheckout}
                className="mt-6 w-full bg-primary text-white py-4 uppercase tracking-widest text-sm font-bold hover:bg-red-700 transition-colors shadow-lg shadow-red-900/20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {!initialized ? 'Loading...' : loading ? 'Processing...' : 'Pay with Midtrans'}
              </button>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
