import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../../components/Toast';
import { supabase } from '../../lib/supabase';
import { buildInstructionSteps, getCountdownParts, getProductOrderPaymentInfo, getRemainingMs } from '../product-orders/payment';
import { fetchProductOrderDetail } from '../product-orders/orderDetailData';
import { shouldAutoSyncProductOrder, shouldRedirectPendingToSuccess } from '../product-orders/status';
import { syncProductOrderStatus } from '../product-orders/syncProductOrderStatus';
import type { ProductOrderDetail, ProductOrderItem } from '../product-orders/types';

type UseProductOrderPendingControllerParams = {
  orderNumber: string;
  locationState: unknown;
  sessionToken: string | null | undefined;
};

export function useProductOrderPendingController({
  orderNumber,
  locationState,
  sessionToken,
}: UseProductOrderPendingControllerParams) {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [order, setOrder] = useState<ProductOrderDetail | null>(null);
  const [items, setItems] = useState<ProductOrderItem[]>([]);
  const [now, setNow] = useState(() => Date.now());
  const hasAutoSynced = useRef(false);
  const autoSyncAttemptsRef = useRef(0);

  const fetchOrder = useCallback(async () => {
    if (!orderNumber) return;
    const result = await fetchProductOrderDetail(orderNumber);
    setOrder(result.order);
    setItems(result.items);
  }, [orderNumber]);

  const handleSyncStatus = useCallback(
    async (silent = false) => {
      if (!orderNumber) return;

      setRefreshing(true);
      setError(null);

      try {
        if (!sessionToken) {
          setError('Not authenticated');
          return;
        }

        await syncProductOrderStatus(orderNumber, sessionToken);
        if (!silent) {
          showToast('success', 'Status refreshed.');
        }
        await fetchOrder();
      } catch (syncError) {
        setError(syncError instanceof Error ? syncError.message : 'Failed to sync status');
      } finally {
        setRefreshing(false);
      }
    },
    [fetchOrder, orderNumber, sessionToken, showToast]
  );

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        setLoading(true);
        setError(null);
        await fetchOrder();
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : 'Failed to load order');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

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
          const next = (payload as unknown as { new?: ProductOrderDetail }).new;
          if (!next) return;
          setOrder((prev) => ({ ...(prev || ({} as ProductOrderDetail)), ...next }));
          if (shouldRedirectPendingToSuccess(next)) {
            navigate(`/order/product/success/${orderNumber}`, { replace: true, state: locationState });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [locationState, navigate, orderNumber]);

  useEffect(() => {
    if (!order) return;
    if (!shouldRedirectPendingToSuccess(order)) return;
    navigate(`/order/product/success/${orderNumber}`, { replace: true, state: locationState });
  }, [locationState, navigate, order, orderNumber]);

  useEffect(() => {
    if (!order || hasAutoSynced.current) return;
    if (order.payment_data) return;
    if (!shouldAutoSyncProductOrder(order)) return;

    hasAutoSynced.current = true;
    void handleSyncStatus(true);
  }, [handleSyncStatus, order]);

  useEffect(() => {
    if (!order) return;
    if (order.payment_data) return;
    if (!shouldAutoSyncProductOrder(order)) return;

    let cancelled = false;
    const timeouts: number[] = [];
    const delaysMs = [15000, 30000, 60000, 90000, 120000];

    const runAttempt = () => {
      if (cancelled) return;
      const attempt = autoSyncAttemptsRef.current;
      if (attempt >= delaysMs.length) return;
      autoSyncAttemptsRef.current += 1;

      const timeoutId = window.setTimeout(async () => {
        if (cancelled) return;
        await handleSyncStatus(true);
        runAttempt();
      }, delaysMs[attempt]);

      timeouts.push(timeoutId);
    };

    runAttempt();

    return () => {
      cancelled = true;
      timeouts.forEach((timeoutId) => window.clearTimeout(timeoutId));
    };
  }, [handleSyncStatus, order]);

  useEffect(() => {
    const handleVisibility = () => {
      if (!document.hidden) {
        void fetchOrder().catch(() => null);
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [fetchOrder]);

  const paymentInfo = useMemo(() => getProductOrderPaymentInfo(order), [order]);
  const instructionSteps = useMemo(
    () => buildInstructionSteps(paymentInfo, Number(order?.total ?? 0)),
    [order?.total, paymentInfo]
  );
  const remainingMs = useMemo(() => getRemainingMs(paymentInfo.expiryAt, now), [now, paymentInfo.expiryAt]);
  const countdown = useMemo(() => getCountdownParts(remainingMs), [remainingMs]);

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

  return {
    loading,
    error,
    refreshing,
    order,
    items,
    paymentInfo,
    instructionSteps,
    countdown,
    statusView,
    handleSyncStatus,
    copyToClipboard,
  };
}
