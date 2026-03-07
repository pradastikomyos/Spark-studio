import { useCallback, useEffect, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import { supabase } from '../../lib/supabase';
import { incrementMetric, METRIC_KEYS, readMetric } from '../../utils/metrics';
import {
  fetchBookingOrderStatusSnapshot,
  fetchBookingSuccessData,
  fetchPurchasedTicketsForOrderNumber,
} from './bookingSuccessData';
import { MAX_SKELETON_MS, shouldAutoSyncBookingStatus, shouldTriggerBookingConfetti } from './bookingSuccessHelpers';
import { getBookingSuccessAccessToken, syncBookingSuccessStatus } from './bookingSuccessSync';
import type { OrderRow, OrderState, PurchasedTicket } from './bookingSuccessTypes';

type UseBookingSuccessControllerParams = {
  orderNumber: string;
  ticketCode?: string;
  initialIsPending: boolean;
  initialized: boolean;
  session: { access_token?: string | null } | null;
  validateSession: () => Promise<boolean>;
};

export function useBookingSuccessController(params: UseBookingSuccessControllerParams) {
  const { orderNumber, ticketCode, initialIsPending, initialized, session, validateSession } = params;
  const [loading, setLoading] = useState(true);
  const [tickets, setTickets] = useState<PurchasedTicket[]>([]);
  const [orderData, setOrderData] = useState<OrderState | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [loadingTimedOut, setLoadingTimedOut] = useState(false);
  const [showManualButton, setShowManualButton] = useState(false);
  const [autoSyncInProgress, setAutoSyncInProgress] = useState(false);
  const confettiTriggeredRef = useRef(false);

  const showSkeleton = loading && !loadingTimedOut && !orderData && tickets.length === 0;
  const effectiveStatus: string | null = orderData?.status || (initialIsPending ? 'pending' : null);

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

  const fetchOrderAndTickets = useCallback(
    async (setBusy = false) => {
      if (setBusy) {
        setLoading(true);
        setLoadingTimedOut(false);
      }

      try {
        const result = await fetchBookingSuccessData({ orderNumber, ticketCode });
        setOrderData(result.orderData);
        setTickets(result.tickets);
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setLoading(false);
      }
    },
    [orderNumber, ticketCode]
  );

  useEffect(() => {
    console.info('[Metrics] Snapshot', {
      manualRefreshClick: readMetric(METRIC_KEYS.manualRefreshClick),
      autoSyncSuccess: readMetric(METRIC_KEYS.autoSyncSuccess),
      loadingTimeout: readMetric(METRIC_KEYS.loadingTimeout),
    });

    void fetchOrderAndTickets(true);

    const channel = orderNumber
      ? supabase
          .channel(`orders:${orderNumber}`)
          .on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'orders',
              filter: `order_number=eq.${orderNumber}`,
            },
            async (payload) => {
              const next = (payload as unknown as { new?: OrderRow }).new;
              if (next) {
                setOrderData(next);
                if (next.status === 'paid') {
                  await fetchOrderAndTickets(false);
                }
              }
            }
          )
          .subscribe()
      : null;

    let pollInterval: NodeJS.Timeout | null = null;
    if (orderNumber) {
      pollInterval = setInterval(async () => {
        let order: Pick<OrderRow, 'status' | 'expires_at'> | null = null;
        try {
          order = await fetchBookingOrderStatusSnapshot(orderNumber);
        } catch {
          return;
        }

        if (order?.expires_at && new Date(order.expires_at) <= new Date() && order.status === 'pending') {
          setOrderData((prev) => ({ ...(prev || {}), status: 'expired' }));
          if (pollInterval) clearInterval(pollInterval);
          return;
        }

        if (order?.status && order.status !== 'pending') {
          setOrderData((prev) => ({ ...(prev || {}), status: order.status }));
          if (order.status === 'paid') {
            await fetchOrderAndTickets(false);
          }
          if (pollInterval) clearInterval(pollInterval);
        }
      }, 5000);
    }

    return () => {
      if (channel) supabase.removeChannel(channel);
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [orderNumber, ticketCode, fetchOrderAndTickets]);

  useEffect(() => {
    if (!showSkeleton) return;

    const timeout = setTimeout(() => {
      if (!showSkeleton) return;
      console.warn('[BookingSuccess] Loading timeout reached');
      incrementMetric(METRIC_KEYS.loadingTimeout);
      setLoadingTimedOut(true);
      setShowManualButton(true);
      setSyncError((prev) => prev ?? 'Loading is taking longer than expected. Please retry.');
      setLoading(false);
    }, MAX_SKELETON_MS);

    return () => clearTimeout(timeout);
  }, [showSkeleton]);

  const getValidAccessToken = useCallback(async () => {
    return getBookingSuccessAccessToken({ session, validateSession });
  }, [session, validateSession]);

  const handleSyncStatus = useCallback(
    async (isAutoSync = false, retryCount = 0) => {
      if (!orderNumber) return;

      if (isAutoSync && autoSyncInProgress) {
        console.log('[Auto-Sync] Skipping - sync already in progress');
        return;
      }

      if (isAutoSync) {
        setAutoSyncInProgress(true);
        console.log('[Auto-Sync] Checking payment status...');
      } else {
        setSyncing(true);
        console.info('[BookingSuccess] Manual status check triggered');
        incrementMetric(METRIC_KEYS.manualRefreshClick);
      }

      setSyncError(null);

      try {
        console.info('[BookingSuccess] Sync start', { orderNumber, isAutoSync, retryCount });
        const response = await syncBookingSuccessStatus({
          orderNumber,
          getValidAccessToken,
          retryCount,
        });
        if (response.order) {
          setOrderData(response.order);
        }

        if (response.order?.status === 'paid') {
          setShowManualButton(false);
          if (isAutoSync) {
            incrementMetric(METRIC_KEYS.autoSyncSuccess);
          }

          try {
            const purchasedTickets = await fetchPurchasedTicketsForOrderNumber(orderNumber);
            if (purchasedTickets.length > 0) {
              setTickets(purchasedTickets);
              setLoading(false);
            }
          } catch (refetchError) {
            console.error('[Auto-Sync] Error fetching tickets:', refetchError);
          }

          setLoading(false);
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Failed to sync status';
        setSyncError(errorMsg);
      } finally {
        if (isAutoSync) {
          setAutoSyncInProgress(false);
        } else {
          setSyncing(false);
        }
      }
    },
    [orderNumber, autoSyncInProgress, getValidAccessToken]
  );

  const handleRetryLoad = useCallback(() => {
    incrementMetric(METRIC_KEYS.manualRefreshClick);
    setSyncError(null);
    void fetchOrderAndTickets(true);
  }, [fetchOrderAndTickets]);

  useEffect(() => {
    if (!initialized) {
      console.log('[Auto-Sync] Waiting for auth initialization...');
      return;
    }

    const shouldSync = shouldAutoSyncBookingStatus({
      orderNumber,
      effectiveStatus,
      initialIsPending,
      ticketsCount: tickets.length,
    });

    if (!shouldSync) return;

    const delays = [0, 5000, 15000, 35000];
    let attempt = 0;
    let cancelled = false;
    const timeouts: NodeJS.Timeout[] = [];

    const runSync = async () => {
      if (cancelled || attempt >= delays.length) return;

      const delay = delays[attempt];
      const timeout = setTimeout(async () => {
        if (cancelled) return;
        await handleSyncStatus(true);
        attempt += 1;
        if (!cancelled && tickets.length === 0) {
          void runSync();
        }
      }, delay);

      timeouts.push(timeout);
    };

    void runSync();

    const showButtonTimer = setTimeout(() => {
      if (!cancelled) {
        setShowManualButton(true);
      }
    }, 8000);
    timeouts.push(showButtonTimer);

    return () => {
      cancelled = true;
      timeouts.forEach((timeout) => clearTimeout(timeout));
    };
  }, [initialized, orderNumber, effectiveStatus, initialIsPending, tickets.length, handleSyncStatus]);

  useEffect(() => {
    if (shouldTriggerBookingConfetti({ ticketsCount: tickets.length, effectiveStatus, loading })) {
      const timer = setTimeout(() => {
        triggerConfetti();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [tickets.length, effectiveStatus, loading, triggerConfetti]);

  return {
    loading,
    tickets,
    orderData,
    syncing,
    syncError,
    loadingTimedOut,
    showManualButton,
    autoSyncInProgress,
    effectiveStatus,
    showSkeleton,
    handleSyncStatus,
    handleRetryLoad,
  };
}
