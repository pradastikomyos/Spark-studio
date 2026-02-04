import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/cartStore';
import { useToast } from '../components/Toast';
import { supabase } from '../lib/supabase';
import { loadSnapScript, type SnapResult } from '../utils/midtransSnap';
import { formatCurrency } from '../utils/formatters';
import { queryKeys } from '../lib/queryKeys';

type CreateProductTokenResponse = {
  token: string;
  order_number: string;
};

export default function ProductCheckoutPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { user, session, initialized } = useAuth();
  const { items: allItems, removeItem, clear: clearCart } = useCart();
  const { showToast } = useToast();

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
    // Priority: registered name from metadata > email prefix
    if (user.user_metadata?.name) {
      setCustomerName(user.user_metadata.name);
    } else {
      const base = user.email ? user.email.split('@')[0] : '';
      if (base) setCustomerName(base);
    }
  }, [user]);

  // Filter items based on selection passed from CartPage
  const items = useMemo(() => {
    const selectedIds = location.state?.selectedVariantIds as number[] | undefined;
    if (selectedIds && Array.isArray(selectedIds) && selectedIds.length > 0) {
      return allItems.filter((i) => selectedIds.includes(i.variantId));
    }
    return allItems;
  }, [allItems, location.state]);

  const subtotal = useMemo(() => items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0), [items]);

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
          // Clear all purchased items from cart
          const purchasedVariantIds = orderItems.map(item => item.product_variant_id);
          purchasedVariantIds.forEach(id => removeItem(id));
          
          // Invalidate order queries for real-time badge update
          if (user?.id) {
            queryClient.invalidateQueries({ queryKey: queryKeys.myOrders(user.id) });
          }
          
          showToast('success', '🎉 Payment successful! Your order is confirmed.');
          navigate(`/order/product/success/${orderNumber}`, { state: { paymentSuccess: true } });
        },
        onPending: (result: SnapResult) => {
          showToast('info', 'Payment is being processed. Please wait for confirmation.');
          navigate(`/order/product/success/${orderNumber}`, { state: { paymentResult: result, isPending: true } });
        },
        onError: () => {
          showToast('error', 'Payment failed. Please try again.');
          setError('Payment failed. Please try again.');
        },
        onClose: () => {
          setLoading(false);
          // User closed payment popup - order was created, navigate to check status
          showToast('info', 'Payment window closed. Check your order status.');
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
    <div className="min-h-screen bg-background-light flex flex-col">
       {/* Header */}


      <main className="max-w-4xl mx-auto px-6 py-10 flex-1 w-full">
         {/* Progress Bar */}
         <div className="max-w-[800px] mx-auto mb-8">
          <div className="flex flex-col gap-3">
            <div className="flex gap-6 justify-between items-end">
              <p className="text-base font-medium">Step 2 of 3</p>
              <p className="text-sm font-normal opacity-70">66% Complete</p>
            </div>
            <div className="rounded-full bg-rose-100 overflow-hidden">
              <div className="h-2.5 rounded-full bg-primary" style={{ width: '66%' }}></div>
            </div>
            <p className="text-primary text-sm font-medium">Payment Confirmation</p>
          </div>
        </div>

        {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            <div className="flex items-center gap-2">
                <span className="material-symbols-outlined">error</span>
                <span>{error}</span>
            </div>
            </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
           {/* Left Side: Order Summary */}
           <div className="space-y-6">
            <div className="bg-white p-6 rounded-xl border border-rose-100 shadow-sm">
              <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">shopping_bag</span>
                Order Summary
              </h3>

              <div className="space-y-4">
                 {orderItems.map((i) => (
                    <div key={i.product_variant_id} className="flex justify-between items-start border-b border-dashed border-rose-100 pb-4 last:border-0 last:pb-0">
                        <div>
                            <p className="font-bold text-neutral-950">{i.product_name}</p>
                            <p className="text-sm text-rose-700">{i.variant_name}</p>
                            <p className="text-xs text-gray-500 mt-1">{i.quantity} x {formatCurrency(i.unit_price)}</p>
                        </div>
                        <p className="font-semibold">{formatCurrency(i.subtotal)}</p>
                    </div>
                ))}

                <div className="pt-6 flex justify-between items-end border-t border-rose-100 mt-4">
                  <p className="text-lg font-bold">Total Amount</p>
                  <div className="text-right">
                    <p className="text-2xl font-black text-primary tracking-tight">
                      {formatCurrency(subtotal)}
                    </p>
                    <p className="text-[10px] text-rose-700 uppercase tracking-wider">
                      Inclusive of all taxes
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4 p-4 bg-primary/5 rounded-lg border border-primary/10">
              <span className="material-symbols-outlined text-primary">verified_user</span>
              <p className="text-xs leading-relaxed text-rose-700">
                Your payment is secured by Midtrans with 256-bit SSL encryption.
              </p>
            </div>
          </div>

          {/* Right Side: Customer Details & Pay */}
          <div>
            <div className="bg-white p-6 rounded-xl border border-rose-100 shadow-sm">
              <h1 className="text-2xl font-bold mb-6">Complete Payment</h1>

              <div className="space-y-5 mb-8">
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-neutral-950">
                    Your Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full rounded-lg border border-rose-100 focus:ring-primary focus:border-primary text-sm py-3 px-4 outline-none transition-all"
                    placeholder="Enter your full name"
                    disabled={loading}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-neutral-950">
                    Phone Number (Optional)
                  </label>
                  <input
                    type="tel"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="w-full rounded-lg border border-rose-100 focus:ring-primary focus:border-primary text-sm py-3 px-4 outline-none transition-all"
                    placeholder="08xxxxxxxxxx"
                    disabled={loading}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-neutral-950">
                    Email
                  </label>
                  <input
                    type="email"
                    value={user?.email || ''}
                    className="w-full rounded-lg border border-rose-100 text-sm py-3 px-4 bg-gray-50 outline-none"
                    disabled
                  />
                  <p className="text-xs text-rose-700">Order details will be sent to this email</p>
                </div>
              </div>

              {/* Midtrans Payment Info */}
              <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-100">
                <div className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-blue-500">info</span>
                  <div>
                    <p className="text-sm font-medium text-blue-800">
                      Secure Payment via Midtrans
                    </p>
                    <p className="text-xs text-blue-600 mt-1">
                      You can pay using Credit Card, Bank Transfer, E-Wallet (GoPay, OVO, ShopeePay), QRIS, and more.
                    </p>
                  </div>
                </div>
              </div>

              <button
                onClick={handlePay}
                disabled={loading || !canCheckout}
                className="w-full bg-[#ff4b86] hover:bg-[#e63d75] disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <span className="material-symbols-outlined animate-spin">progress_activity</span>
                    Processing...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[20px]">lock</span>
                    Pay {formatCurrency(subtotal)} Now
                  </>
                )}
              </button>

              {/* Payment Method Logos */}
              <div className="mt-6 pt-6 border-t border-rose-100">
                <p className="text-xs text-center text-rose-700 mb-3">Supported Payment Methods</p>
                <div className="flex justify-center items-center gap-4 flex-wrap opacity-60">
                  <img
                    alt="Visa"
                    className="h-5"
                    src="https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Visa_Inc._logo.svg/200px-Visa_Inc._logo.svg.png"
                  />
                  <img
                    alt="Mastercard"
                    className="h-5"
                    src="https://upload.wikimedia.org/wikipedia/commons/thumb/2/2a/Mastercard-logo.svg/200px-Mastercard-logo.svg.png"
                  />
                  <div className="px-2 py-1 bg-cyan-500 rounded text-white text-[10px] font-bold">GoPay</div>
                  <div className="px-2 py-1 bg-purple-700 rounded text-white text-[10px] font-bold">OVO</div>
                  <div className="px-2 py-1 bg-orange-500 rounded text-white text-[10px] font-bold">ShopeePay</div>
                  <div className="px-2 py-1 bg-gray-800 rounded text-white text-[10px] font-bold">QRIS</div>
                </div>
              </div>
            </div>

            <p className="text-center mt-6 text-xs text-rose-700">
              By clicking "Pay Now", you agree to Spark Stage's{' '}
              <a className="underline" href="#">Terms of Service</a> and{' '}
              <a className="underline" href="#">Cancellation Policy</a>.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}

    </div>
  );
}
