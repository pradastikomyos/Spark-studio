import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/cartStore';
import { useToast } from '../components/Toast';
import { supabase } from '../lib/supabase';
import { loadSnapScript, type SnapResult } from '../utils/midtransSnap';
import { formatCurrency } from '../utils/formatters';
import { queryKeys } from '../lib/queryKeys';
import { withTimeout } from '../utils/queryHelpers';
import { ensureFreshToken } from '../utils/auth';

type CreateProductTokenResponse = {
  token: string;
  order_number: string;
  discount_amount?: number;
};

type CreateCashierOrderResponse = {
  order_number: string;
};

type InvokeErrorWithContext = {
  status?: number;
  context?: {
    status?: number;
    statusCode?: number;
    response?: Response;
  };
};

const getInvokeStatus = (invokeError: unknown) => {
  const error = invokeError as InvokeErrorWithContext | null | undefined;
  return (
    error?.status ??
    error?.context?.status ??
    error?.context?.statusCode ??
    error?.context?.response?.status
  );
};

type AppliedVoucher = {
  id: string;
  code: string;
  discountAmount: number;
  discountType?: string | null;
  discountValue?: number | null;
};

const mapVoucherErrorCode = (message?: string | null, code?: string | null) => {
  const normalized = String(message || '').toLowerCase();
  if (code === 'VOUCHER_INACTIVE' || normalized.includes('tidak aktif')) return 'voucher.errors.inactive';
  if (code === 'VOUCHER_NOT_YET_VALID' || normalized.includes('belum berlaku')) return 'voucher.errors.notYetValid';
  if (code === 'VOUCHER_EXPIRED' || normalized.includes('kadaluarsa')) return 'voucher.errors.expired';
  if (code === 'VOUCHER_QUOTA_EXCEEDED' || normalized.includes('kuota')) return 'voucher.errors.quotaExceeded';
  if (code === 'VOUCHER_MIN_PURCHASE' || normalized.includes('minimum')) return 'voucher.errors.minPurchase';
  if (code === 'VOUCHER_CATEGORY_MISMATCH' || normalized.includes('kategori')) return 'voucher.errors.categoryMismatch';
  if (code === 'VOUCHER_INVALID' || normalized.includes('voucher')) return 'voucher.errors.invalid';
  return null;
};

export default function ProductCheckoutPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const { user, session, initialized } = useAuth();
  const { items: allItems, removeItem } = useCart();
  const { showToast } = useToast();
  const cashierCheckoutEnabled = String(import.meta.env.VITE_ENABLE_CASHIER_CHECKOUT || '').toLowerCase() !== 'false';

  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [snapLoaded, setSnapLoaded] = useState(false);
  const [voucherCode, setVoucherCode] = useState('');
  const [appliedVoucher, setAppliedVoucher] = useState<AppliedVoucher | null>(null);
  const [voucherError, setVoucherError] = useState<string | null>(null);
  const [applyingVoucher, setApplyingVoucher] = useState(false);
  const skipEmptyCartRedirectRef = useRef(false);

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
  const discountAmount = appliedVoucher?.discountAmount ?? 0;
  const finalTotal = Math.max(0, subtotal - discountAmount);

  useEffect(() => {
    if (items.length === 0 && !skipEmptyCartRedirectRef.current) navigate('/cart');
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

  const fetchCategoryIds = async () => {
    const variantIds = items.map((item) => item.variantId);
    if (variantIds.length === 0) return [];

    const { data: variantRows, error: variantError } = await supabase
      .from('product_variants')
      .select('product_id')
      .in('id', variantIds);
    if (variantError) throw variantError;

    const productIds = Array.from(
      new Set(
        (variantRows || [])
          .map((row) => Number((row as { product_id?: number }).product_id))
          .filter((id) => id > 0)
      )
    );
    if (productIds.length === 0) return [];

    const { data: productRows, error: productError } = await supabase
      .from('products')
      .select('category_id')
      .in('id', productIds);
    if (productError) throw productError;

    return Array.from(
      new Set(
        (productRows || [])
          .map((row) => Number((row as { category_id?: number }).category_id))
          .filter((id) => id > 0)
      )
    );
  };

  const resolveVoucherErrorMessage = (message?: string | null, code?: string | null) => {
    const key = mapVoucherErrorCode(message, code);
    if (key === 'voucher.errors.minPurchase' && message) {
      const match = message.match(/Rp\s*([0-9.,]+)/i);
      const amount = match ? `Rp ${match[1]}` : message;
      return t(key, { amount });
    }
    if (key) return t(key);
    return message || t('voucher.errors.generic');
  };

  const handleApplyVoucher = async () => {
    if (!user || !session) {
      setVoucherError('Sesi login kadaluarsa. Silakan login ulang.');
      return;
    }

    const trimmed = voucherCode.trim().toUpperCase();
    if (!trimmed) {
      setVoucherError(t('voucher.errors.empty'));
      return;
    }

    setApplyingVoucher(true);
    setVoucherError(null);

    try {
      const token = await ensureFreshToken(session);
      if (!token) {
        setVoucherError('Sesi login kadaluarsa. Silakan login ulang.');
        return;
      }

      const categoryIds = await fetchCategoryIds();
      const { data, error: voucherError } = await withTimeout(
        supabase.rpc('validate_and_reserve_voucher', {
          p_code: trimmed,
          p_user_id: user.id,
          p_subtotal: subtotal,
          p_category_ids: categoryIds,
        }),
        15000,
        t('voucher.errors.timeout')
      );

      if (voucherError) throw voucherError;

      const result = Array.isArray(data) ? data[0] : data;
      if (result?.error_message) {
        setAppliedVoucher(null);
        setVoucherError(resolveVoucherErrorMessage(result.error_message, null));
        return;
      }

      const voucherId = String(result?.voucher_id || '');
      const discountAmountValue = Number(result?.discount_amount ?? 0);
      setAppliedVoucher({
        id: voucherId,
        code: trimmed,
        discountAmount: discountAmountValue,
        discountType: result?.discount_type ?? null,
        discountValue: result?.discount_value ?? null,
      });

      // Immediately release quota so we don't double-reserve before checkout
      if (voucherId) {
        await supabase.rpc('release_voucher_quota', { p_voucher_id: voucherId });
      }
    } catch (e) {
      setAppliedVoucher(null);
      setVoucherError(e instanceof Error ? e.message : t('voucher.errors.applyFailed'));
    } finally {
      setApplyingVoucher(false);
    }
  };

  const handleRemoveVoucher = () => {
    setAppliedVoucher(null);
    setVoucherCode('');
    setVoucherError(null);
  };

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

      const invoke = async (accessToken: string) => {
        return withTimeout(
          supabase.functions.invoke('create-midtrans-product-token', {
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
              voucherCode: appliedVoucher?.code || undefined,
            },
            headers: { Authorization: `Bearer ${accessToken}` },
          }),
          15000,
          'Request timeout. Please try again.'
        );
      };

      let token = await ensureFreshToken(session);
      if (!token) {
        setError('Sesi login kadaluarsa. Silakan login ulang.');
        navigate('/login');
        return;
      }

      let { data, error: invokeError } = await invoke(token);
      const status = invokeError ? getInvokeStatus(invokeError) : undefined;
      if (invokeError && status === 401) {
        const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
        if (refreshError || !refreshData.session?.access_token) {
          setError('Sesi login kadaluarsa. Silakan login ulang.');
          navigate('/login');
          return;
        }
        token = refreshData.session.access_token;
        const retry = await invoke(token);
        data = retry.data;
        invokeError = retry.error ?? null;
      }

      if (invokeError) {
        const rawContext = (invokeError as { context?: { error?: unknown } }).context?.error;
        const contextError =
          typeof rawContext === 'string'
            ? rawContext
            : rawContext && typeof rawContext === 'object'
              ? String((rawContext as { error?: string }).error || (rawContext as { message?: string }).message || '')
              : null;
        const contextCode =
          rawContext && typeof rawContext === 'object' ? (rawContext as { code?: string }).code : null;

        if (contextCode?.startsWith('VOUCHER_') || String(contextError || '').toLowerCase().includes('voucher')) {
          setVoucherError(resolveVoucherErrorMessage(contextError, contextCode));
          setAppliedVoucher(null);
          return;
        }

        throw new Error(contextError || invokeError.message || 'Failed to create payment');
      }

      const payload = data as CreateProductTokenResponse;
      if (!payload.token || !payload.order_number) throw new Error('Invalid payment response');
      const orderNumber = payload.order_number;

      if (!window.snap) throw new Error('Midtrans Snap not loaded');

      window.snap.pay(payload.token, {
        onSuccess: () => {
          skipEmptyCartRedirectRef.current = true;
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
          setAppliedVoucher(null);
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

  const handleCashierCheckout = async () => {
    if (!user) {
      navigate('/login');
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

      // Validate current session
      console.log('[CashierCheckout] Validating session');
      const { data: { session: currentSession }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !currentSession) {
        console.error('[CashierCheckout] No valid session:', sessionError);
        await supabase.auth.signOut();
        setError('Sesi login kadaluarsa. Silakan login ulang.');
        setTimeout(() => navigate('/login?reason=session_expired'), 2000);
        return;
      }

      // Check if token is about to expire (within 5 minutes)
      const expiresAt = currentSession.expires_at || 0;
      const now = Math.floor(Date.now() / 1000);
      const timeUntilExpiry = expiresAt - now;
      
      if (timeUntilExpiry < 300) { // Less than 5 minutes
        console.log('[CashierCheckout] Token expiring soon, attempting refresh');
        const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
        
        if (refreshError || !refreshData.session) {
          console.error('[CashierCheckout] Refresh failed:', refreshError);
          await supabase.auth.signOut();
          setError('Sesi login tidak dapat diperpanjang. Silakan login ulang.');
          setTimeout(() => navigate('/login?reason=session_expired'), 2000);
          return;
        }
        
        console.log('[CashierCheckout] Session refreshed successfully');
      }

      console.log('[CashierCheckout] Session valid, calling edge function');

      let token = await ensureFreshToken(session);
      if (!token) {
        setError('Sesi login kadaluarsa. Silakan login ulang.');
        navigate('/login');
        return;
      }

      const invoke = async (accessToken: string) => {
        return withTimeout(
          supabase.functions.invoke('create-cashier-product-order', {
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
              voucherCode: appliedVoucher?.code || undefined,
            },
            headers: { Authorization: `Bearer ${accessToken}` },
          }),
          15000,
          'Request timeout. Please try again.'
        );
      };

      let { data, error: invokeError } = await invoke(token);
      const status = invokeError ? getInvokeStatus(invokeError) : undefined;
      if (invokeError && status === 401) {
        const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
        if (refreshError || !refreshData.session?.access_token) {
          setError('Sesi login kadaluarsa. Silakan login ulang.');
          navigate('/login');
          return;
        }
        token = refreshData.session.access_token;
        const retry = await invoke(token);
        data = retry.data;
        invokeError = retry.error ?? null;
      }

      if (invokeError) {
        const rawContext = (invokeError as { context?: { error?: unknown } }).context?.error;
        const contextError =
          typeof rawContext === 'string'
            ? rawContext
            : rawContext && typeof rawContext === 'object'
              ? String((rawContext as { error?: string }).error || (rawContext as { message?: string }).message || '')
              : null;
        const contextCode =
          rawContext && typeof rawContext === 'object' ? (rawContext as { code?: string }).code : null;

        if (contextCode?.startsWith('VOUCHER_') || String(contextError || '').toLowerCase().includes('voucher')) {
          setVoucherError(resolveVoucherErrorMessage(contextError, contextCode));
          setAppliedVoucher(null);
          return;
        }

        throw new Error(contextError || invokeError.message || 'Failed to create cashier order');
      }

      const payload = data as CreateCashierOrderResponse;
      if (!payload.order_number) throw new Error('Invalid cashier response');
      const orderNumber = payload.order_number;

      skipEmptyCartRedirectRef.current = true;
      const purchasedVariantIds = orderItems.map((item) => item.product_variant_id);
      purchasedVariantIds.forEach((id) => removeItem(id));

      if (user?.id) {
        queryClient.invalidateQueries({ queryKey: queryKeys.myOrders(user.id) });
      }

      showToast('success', 'Order dibuat. Bayar cash di kasir setelah QR discan admin.');
      navigate(`/order/product/success/${orderNumber}`, { state: { cashier: true } });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create cashier order');
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

                <div className="pt-6 border-t border-rose-100 mt-4 space-y-2">
                  <div className="flex justify-between text-sm text-rose-700">
                    <span>{t('voucher.summary.subtotal')}</span>
                    <span>{formatCurrency(subtotal)}</span>
                  </div>
                  {appliedVoucher && discountAmount > 0 && (
                    <div className="flex justify-between text-sm text-green-700">
                      <span>{t('voucher.summary.discount', { code: appliedVoucher.code })}</span>
                      <span>-{formatCurrency(discountAmount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-end">
                    <p className="text-lg font-bold">{t('voucher.summary.total')}</p>
                    <div className="text-right">
                      <p className="text-2xl font-black text-primary tracking-tight">
                        {formatCurrency(finalTotal)}
                      </p>
                      <p className="text-[10px] text-rose-700 uppercase tracking-wider">
                        {t('voucher.summary.taxes')}
                      </p>
                    </div>
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

              {/* Voucher Section */}
              <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-semibold text-amber-900">{t('voucher.label')}</p>
                  {appliedVoucher && (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-700">
                      {t('voucher.applied')}
                    </span>
                  )}
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    value={voucherCode}
                    onChange={(e) => setVoucherCode(e.target.value.toUpperCase())}
                    className="flex-1 rounded-lg border border-amber-200 bg-white text-sm py-3 px-4 outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400"
                    placeholder={t('voucher.placeholder')}
                    disabled={loading || applyingVoucher}
                  />
                  <button
                    onClick={handleApplyVoucher}
                    disabled={loading || applyingVoucher || !voucherCode.trim()}
                    className="rounded-lg bg-amber-500 px-4 py-3 text-sm font-bold text-white hover:bg-amber-600 disabled:bg-amber-200 disabled:cursor-not-allowed"
                  >
                    {applyingVoucher ? t('voucher.applying') : t('voucher.apply')}
                  </button>
                </div>
                {voucherError && (
                  <p className="mt-2 text-xs text-red-600">{voucherError}</p>
                )}
                {appliedVoucher && (
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-amber-800">
                    <span>
                      {t('voucher.success', { code: appliedVoucher.code, amount: formatCurrency(appliedVoucher.discountAmount) })}
                    </span>
                    <button
                      onClick={handleRemoveVoucher}
                      className="text-amber-700 underline hover:text-amber-900"
                    >
                      {t('voucher.remove')}
                    </button>
                  </div>
                )}
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
                    Pay {formatCurrency(finalTotal)} Now
                  </>
                )}
              </button>

              {cashierCheckoutEnabled && (
                <button
                  onClick={handleCashierCheckout}
                  disabled={loading || !initialized || !session?.access_token || items.length === 0}
                  className="w-full mt-3 bg-white hover:bg-rose-50 disabled:bg-gray-100 disabled:cursor-not-allowed text-primary font-bold py-4 rounded-xl border border-rose-100 transition-all flex flex-col items-center justify-center"
                >
                  <span>Bayar di Kasir</span>
                  <span className="text-xs font-semibold text-rose-700 mt-1">Checkout at cashier</span>
                </button>
              )}

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
