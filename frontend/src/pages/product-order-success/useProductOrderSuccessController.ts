import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../../components/Toast';
import { supabase } from '../../lib/supabase';
import { incrementMetric, METRIC_KEYS } from '../../utils/metrics';
import { getPaymentMethodLabel } from '../product-orders/payment';
import { fetchProductOrderDetail } from '../product-orders/orderDetailData';
import { shouldRedirectSuccessToPending } from '../product-orders/status';
import { syncProductOrderStatus } from '../product-orders/syncProductOrderStatus';
import type { ProductOrderDetail, ProductOrderItem } from '../product-orders/types';

type UseProductOrderSuccessControllerParams = {
  orderNumber: string;
  initialized: boolean;
  locationState: unknown;
  sessionToken: string | null | undefined;
};

const MAX_SKELETON_MS = 20000;

export function useProductOrderSuccessController({
  orderNumber,
  initialized,
  locationState,
  sessionToken,
}: UseProductOrderSuccessControllerParams) {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const hasShownSuccessToast = useRef(false);
  const confettiTriggeredRef = useRef(false);
  const backgroundRefreshErrorRef = useRef<string | null>(null);
  const [order, setOrder] = useState<ProductOrderDetail | null>(null);
  const [items, setItems] = useState<ProductOrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingTimedOut, setLoadingTimedOut] = useState(false);
  const [autoSyncInProgress, setAutoSyncInProgress] = useState(false);

  const fetchOrder = useCallback(async () => {
    if (!orderNumber) return;
    const result = await fetchProductOrderDetail(orderNumber);
    setOrder(result.order);
    setItems(result.items);
  }, [orderNumber]);

  const refreshOrderInBackground = useCallback(
    async (reason: 'poll' | 'visibility' | 'realtime') => {
      try {
        await fetchOrder();
        backgroundRefreshErrorRef.current = null;
      } catch (loadError) {
        const message = loadError instanceof Error ? loadError.message : 'Failed to refresh order';
        console.warn(`[ProductOrderSuccess] Background refresh failed during ${reason}:`, loadError);
        if (backgroundRefreshErrorRef.current === message) return;
        backgroundRefreshErrorRef.current = message;
        showToast('warning', 'Order status belum bisa diperbarui otomatis. Coba refresh manual sebentar lagi.');
      }
    },
    [fetchOrder, showToast]
  );

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

  const getValidAccessToken = useCallback(async () => {
    try {
      const { data, error: refreshError } = await supabase.auth.refreshSession();
      if (!refreshError && data.session?.access_token) {
        return data.session.access_token;
      }

      const { data: existing } = await supabase.auth.getSession();
      return existing.session?.access_token ?? sessionToken ?? null;
    } catch {
      return sessionToken ?? null;
    }
  }, [sessionToken]);

  const handleSyncStatus = useCallback(
    async (isAutoSync = false, retryCount = 0) => {
      if (!orderNumber) return;
      if (isAutoSync && autoSyncInProgress) return;

      if (isAutoSync) {
        setAutoSyncInProgress(true);
      } else {
        setRefreshing(true);
        incrementMetric(METRIC_KEYS.manualRefreshClick);
      }

      setError(null);

      try {
        let token = await getValidAccessToken();
        if (!token) {
          if (!isAutoSync) {
            setError('Not authenticated');
          }
          return;
        }

        try {
          const data = await syncProductOrderStatus(orderNumber, token);
          if (data?.order) {
            setOrder((prev) => ({ ...(prev || ({} as ProductOrderDetail)), ...(data.order as ProductOrderDetail) }));
            if ((data.order as { payment_status?: string }).payment_status === 'paid') {
              if (isAutoSync) {
                incrementMetric(METRIC_KEYS.autoSyncSuccess);
              }
              await fetchOrder();
            }
          }
        } catch (syncError) {
          if (syncError instanceof Error && syncError.message === 'Failed to sync status' && retryCount < 1) {
            token = await getValidAccessToken();
            if (token) {
              await syncProductOrderStatus(orderNumber, token);
            }
          } else {
            throw syncError;
          }
        }
      } catch (syncError) {
        const message = syncError instanceof Error ? syncError.message : 'Failed to sync status';
        if (!isAutoSync) {
          setError(message);
        }
      } finally {
        if (isAutoSync) {
          setAutoSyncInProgress(false);
        } else {
          setRefreshing(false);
        }
      }
    },
    [autoSyncInProgress, fetchOrder, getValidAccessToken, orderNumber]
  );

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        setLoading(true);
        setLoadingTimedOut(false);
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
  }, [fetchOrder, orderNumber]);

  useEffect(() => {
    if (!order || loading) return;
    if (!shouldRedirectSuccessToPending(order)) return;
    navigate(`/order/product/pending/${orderNumber}`, { replace: true, state: locationState });
  }, [loading, locationState, navigate, order, orderNumber]);

  useEffect(() => {
    const state = locationState as { paymentSuccess?: boolean; isPending?: boolean } | null;
    if (hasShownSuccessToast.current) return;

    if (state?.paymentSuccess) {
      hasShownSuccessToast.current = true;
      triggerConfetti();
      showToast('success', '🎉 Payment confirmed! Your order is ready for pickup.');
      return;
    }

    if (state?.isPending) {
      hasShownSuccessToast.current = true;
      showToast('info', 'Your payment is being processed. We’ll update the status shortly.');
    }
  }, [locationState, showToast, triggerConfetti]);

  useEffect(() => {
    if (!loading) return;

    const timeoutId = window.setTimeout(() => {
      incrementMetric(METRIC_KEYS.loadingTimeout);
      setLoadingTimedOut(true);
      setError((prev) => prev ?? 'Loading is taking longer than expected. Please retry.');
      setLoading(false);
    }, MAX_SKELETON_MS);

    return () => clearTimeout(timeoutId);
  }, [loading]);

  const handleRetryLoad = useCallback(() => {
    incrementMetric(METRIC_KEYS.manualRefreshClick);
    setError(null);
    setLoadingTimedOut(false);
    setLoading(true);

    void fetchOrder()
      .catch((loadError) => {
        setError(loadError instanceof Error ? loadError.message : 'Failed to load order');
      })
      .finally(() => {
        setLoading(false);
      });
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
          if (next.payment_status === 'paid' || next.pickup_code) {
            await refreshOrderInBackground('realtime');
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [orderNumber, refreshOrderInBackground]);

  const pickupCode = order?.pickup_code ?? null;

  useEffect(() => {
    if (!initialized || !orderNumber) return;
    if (pickupCode || String(order?.payment_status || '').toLowerCase() === 'paid') return;

    const delaysMs = [0, 5000, 15000, 35000, 60000, 90000, 120000];
    const timeouts: number[] = [];

    delaysMs.forEach((delayMs) => {
      timeouts.push(
        window.setTimeout(() => {
          void handleSyncStatus(true);
        }, delayMs)
      );
    });

    return () => {
      timeouts.forEach((timeoutId) => window.clearTimeout(timeoutId));
    };
  }, [handleSyncStatus, initialized, order?.payment_status, orderNumber, pickupCode]);

  useEffect(() => {
    if (!orderNumber || !order) return;
    if (String(order.payment_status || '').toLowerCase() !== 'paid' || pickupCode) return;

    const intervalId = window.setInterval(() => {
      void refreshOrderInBackground('poll');
    }, 15000);

    return () => clearInterval(intervalId);
  }, [order, orderNumber, pickupCode, refreshOrderInBackground]);

  useEffect(() => {
    const handleVisibility = () => {
      if (!document.hidden) {
        void refreshOrderInBackground('visibility');
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [refreshOrderInBackground]);

  const totalItems = useMemo(() => items.reduce((sum, item) => sum + item.quantity, 0), [items]);
  const paymentMethodLabel = useMemo(() => getPaymentMethodLabel(order), [order]);

  return {
    order,
    items,
    loading,
    error,
    refreshing,
    loadingTimedOut,
    autoSyncInProgress,
    pickupCode,
    totalItems,
    paymentMethodLabel,
    handleSyncStatus,
    handleRetryLoad,
  };
}
