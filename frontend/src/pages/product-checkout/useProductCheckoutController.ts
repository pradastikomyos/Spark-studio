import { useEffect, useMemo, useRef, useState } from 'react';
import type { NavigateFunction } from 'react-router-dom';
import type { TFunction } from 'i18next';
import type { QueryClient } from '@tanstack/react-query';
import type { CartItem } from '../../contexts/cartStore';
import { supabase } from '../../lib/supabase';
import { queryKeys } from '../../lib/queryKeys';
import { withTimeout } from '../../utils/queryHelpers';
import { loadSnapScript, type SnapResult } from '../../utils/midtransSnap';
import { calculateFinalTotal, calculateSubtotal, mapCheckoutOrderItems, selectCheckoutItems } from './checkoutPricing';
import type {
  AppliedVoucher,
  CheckoutOrderItem,
  CreateCashierOrderResponse,
  CreateProductTokenResponse,
  InvokeErrorWithContext,
  ValidateVoucherResult,
} from './checkoutTypes';

type UserLike = {
  id?: string;
  email?: string | null;
  user_metadata?: { name?: string };
} | null | undefined;

type UseProductCheckoutControllerParams = {
  allItems: CartItem[];
  selectedVariantIds?: number[];
  user: UserLike;
  sessionToken: string | null | undefined;
  initialized: boolean;
  getValidAccessToken: () => Promise<string | null>;
  refreshSession: () => Promise<void>;
  t: TFunction;
  navigate: NavigateFunction;
  queryClient: QueryClient;
  removeItem: (variantId: number) => void;
  showToast: (type: 'success' | 'error' | 'info' | 'warning', message: string) => void;
  cashierCheckoutEnabled: boolean;
};

const getInvokeStatus = (invokeError: unknown) => {
  const error = invokeError as InvokeErrorWithContext | null | undefined;
  return error?.status ?? error?.context?.status ?? error?.context?.statusCode ?? error?.context?.response?.status;
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

export function useProductCheckoutController({
  allItems,
  selectedVariantIds,
  user,
  sessionToken,
  initialized,
  getValidAccessToken,
  refreshSession,
  t,
  navigate,
  queryClient,
  removeItem,
  showToast,
  cashierCheckoutEnabled,
}: UseProductCheckoutControllerParams) {
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
      .catch((loadError) => setError(loadError instanceof Error ? loadError.message : 'Failed to load payment system'));
  }, []);

  useEffect(() => {
    if (!user) return;
    if (user.user_metadata?.name) {
      setCustomerName(user.user_metadata.name);
      return;
    }
    const base = user.email ? user.email.split('@')[0] : '';
    if (base) {
      setCustomerName(base);
    }
  }, [user]);

  const items = useMemo(() => selectCheckoutItems(allItems, selectedVariantIds), [allItems, selectedVariantIds]);
  const subtotal = useMemo(() => calculateSubtotal(items), [items]);
  const discountAmount = appliedVoucher?.discountAmount ?? 0;
  const finalTotal = useMemo(() => calculateFinalTotal(subtotal, discountAmount), [discountAmount, subtotal]);
  const orderItems = useMemo<CheckoutOrderItem[]>(() => mapCheckoutOrderItems(items), [items]);
  const canCheckout = initialized && Boolean(sessionToken) && snapLoaded && items.length > 0;

  useEffect(() => {
    if (items.length === 0 && !skipEmptyCartRedirectRef.current) {
      navigate('/cart');
    }
  }, [items.length, navigate]);

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

  const resolveVoucherErrorMessage = (
    message?: string | null,
    code?: string | null,
    applicableCategoryNames?: string[] | null
  ) => {
    const key = mapVoucherErrorCode(message, code);
    if (key === 'voucher.errors.categoryMismatch' && applicableCategoryNames && applicableCategoryNames.length > 0) {
      return t('voucher.errors.categoryMismatchWithCategories', { categories: applicableCategoryNames.join(', ') });
    }
    if (key === 'voucher.errors.minPurchase' && message) {
      const match = message.match(/Rp\s*([0-9.,]+)/i);
      const amount = match ? `Rp ${match[1]}` : message;
      return t(key, { amount });
    }
    if (key) return t(key);
    return message || t('voucher.errors.generic');
  };

  const completeSuccessfulOrder = (orderNumber: string, nextState: Record<string, unknown>) => {
    skipEmptyCartRedirectRef.current = true;
    orderItems.map((item) => item.product_variant_id).forEach((id) => removeItem(id));

    if (user?.id) {
      queryClient.invalidateQueries({ queryKey: queryKeys.myOrders(user.id) });
    }

    navigate(`/order/product/success/${orderNumber}`, { state: nextState });
  };

  const handleApplyVoucher = async () => {
    if (!user || !sessionToken) {
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
      const token = await getValidAccessToken();
      if (!token) {
        setVoucherError('Sesi login kadaluarsa. Silakan login ulang.');
        return;
      }

      const categoryIds = await fetchCategoryIds();
      const { data, error: validateError } = await withTimeout(
        supabase.rpc('validate_voucher', {
          p_code: trimmed,
          p_subtotal: subtotal,
          p_category_ids: categoryIds,
        }),
        15000,
        t('voucher.errors.timeout')
      );

      if (validateError) throw validateError;

      const result = (Array.isArray(data) ? data[0] : data) as ValidateVoucherResult | null | undefined;
      if (result?.error_message) {
        setAppliedVoucher(null);
        setVoucherError(
          resolveVoucherErrorMessage(result.error_message, result.error_code ?? null, result.applicable_category_names)
        );
        return;
      }

      setAppliedVoucher({
        id: String(result?.voucher_id || ''),
        code: trimmed,
        discountAmount: Number(result?.discount_amount ?? 0),
        discountType: result?.discount_type ?? null,
        discountValue: result?.discount_value != null ? Number(result.discount_value) : null,
      });
    } catch (applyError) {
      setAppliedVoucher(null);
      setVoucherError(applyError instanceof Error ? applyError.message : t('voucher.errors.applyFailed'));
    } finally {
      setApplyingVoucher(false);
    }
  };

  const handleRemoveVoucher = () => {
    setAppliedVoucher(null);
    setVoucherCode('');
    setVoucherError(null);
  };

  const createOrder = async (functionName: 'create-midtrans-product-token' | 'create-cashier-product-order') => {
    if (!user) {
      navigate('/login');
      return null;
    }

    if (!initialized || !sessionToken) {
      setError('Session expired. Please refresh and login again.');
      return null;
    }

    if (!customerName.trim()) {
      setError('Please enter your name');
      return null;
    }

    if (!user.email) {
      throw new Error('Missing account email');
    }

    let token = await getValidAccessToken();
    if (!token) {
      setError('Sesi login kadaluarsa. Silakan login ulang.');
      navigate('/login');
      return null;
    }

    const invoke = async (accessToken: string) =>
      withTimeout(
        supabase.functions.invoke(functionName, {
          body: {
            items: orderItems.map((item) => ({
              productVariantId: item.product_variant_id,
              name: `${item.product_name} - ${item.variant_name}`.slice(0, 50),
              price: item.unit_price,
              quantity: item.quantity,
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

    let { data, error: invokeError } = await invoke(token);
    const status = invokeError ? getInvokeStatus(invokeError) : undefined;
    if (invokeError && status === 401) {
      await refreshSession();
      token = await getValidAccessToken();
      if (!token) {
        setError('Sesi login kadaluarsa. Silakan login ulang.');
        navigate('/login');
        return null;
      }
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
        return null;
      }

      throw new Error(
        contextError || invokeError.message || `Failed to create ${functionName.includes('cashier') ? 'cashier order' : 'payment'}`
      );
    }

    return data;
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

    setLoading(true);
    setError(null);

    try {
      const payload = (await createOrder('create-midtrans-product-token')) as CreateProductTokenResponse | null;
      if (!payload?.token || !payload.order_number) {
        return;
      }

      if (!window.snap) throw new Error('Midtrans Snap not loaded');

      window.snap.pay(payload.token, {
        onSuccess: () => {
          showToast('success', '🎉 Payment successful! Your order is confirmed.');
          completeSuccessfulOrder(payload.order_number, { paymentSuccess: true });
        },
        onPending: (result: SnapResult) => {
          showToast('info', 'Payment is being processed. Please wait for confirmation.');
          navigate(`/order/product/success/${payload.order_number}`, { state: { paymentResult: result, isPending: true } });
        },
        onError: () => {
          showToast('error', 'Payment failed. Please try again.');
          setError('Payment failed. Please try again.');
          setAppliedVoucher(null);
        },
        onClose: () => {
          setLoading(false);
          showToast('info', 'Payment window closed. Check your order status.');
          navigate(`/order/product/success/${payload.order_number}`, { state: { isPending: true } });
        },
      });
    } catch (payError) {
      setError(payError instanceof Error ? payError.message : 'Failed to process payment');
    } finally {
      setLoading(false);
    }
  };

  const handleCashierCheckout = async () => {
    if (!cashierCheckoutEnabled) return;

    setLoading(true);
    setError(null);

    try {
      const payload = (await createOrder('create-cashier-product-order')) as CreateCashierOrderResponse | null;
      if (!payload?.order_number) {
        return;
      }

      showToast('success', 'Order dibuat. Bayar cash di kasir setelah QR discan admin.');
      completeSuccessfulOrder(payload.order_number, { cashier: true });
    } catch (cashierError) {
      setError(cashierError instanceof Error ? cashierError.message : 'Failed to create cashier order');
    } finally {
      setLoading(false);
    }
  };

  return {
    customerName,
    customerPhone,
    error,
    loading,
    voucherCode,
    appliedVoucher,
    voucherError,
    applyingVoucher,
    items,
    orderItems,
    subtotal,
    discountAmount,
    finalTotal,
    canCheckout,
    setCustomerName,
    setCustomerPhone,
    setVoucherCode,
    handleApplyVoucher,
    handleRemoveVoucher,
    handlePay,
    handleCashierCheckout,
    cashierDisabled: !initialized || !sessionToken || items.length === 0,
  };
}
