import { useMutation } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { TFunction } from 'i18next';
import { getSupabaseFunctionStatus } from '../../lib/supabaseFunctionError';
import { invokeSupabaseFunction } from '../../lib/supabaseFunctionInvoke';
import { withTimeout } from '../../utils/queryHelpers';
import { useMyOrders } from '../../hooks/useMyOrders';
import { classifyProductOrder, isCashierOrder, isPickupReady, shouldAutoSyncProductOrder } from '../product-orders/status';
import { syncProductOrderStatus } from '../product-orders/syncProductOrderStatus';
import type { ProductOrderListItem } from '../product-orders/types';

type UseMyProductOrdersViewParams = {
  userId: string | null | undefined;
  sessionToken: string | null | undefined;
  getValidAccessToken: () => Promise<string | null>;
  refreshSession: () => Promise<void>;
  showToast: (type: 'success' | 'error' | 'info' | 'warning', message: string) => void;
  t: TFunction;
};

export function useMyProductOrdersView({
  userId,
  sessionToken,
  getValidAccessToken,
  refreshSession,
  showToast,
  t,
}: UseMyProductOrdersViewParams) {
  const [activeTab, setActiveTab] = useState<'pending' | 'active' | 'history'>('pending');
  const [expandedOrder, setExpandedOrder] = useState<number | null>(null);
  const [syncingOrderId, setSyncingOrderId] = useState<number | null>(null);
  const attemptedAutoSync = useRef(new Set<string>());
  const autoSelectedTab = useRef(false);
  const { data: orders = [], error, isLoading: loading, isFetching } = useMyOrders(userId);

  useEffect(() => {
    if (error) {
      showToast('error', error instanceof Error ? error.message : 'Failed to load orders');
    }
  }, [error, showToast]);

  const { pendingOrders, activeOrders, historyOrders } = useMemo(() => {
    const pending: ProductOrderListItem[] = [];
    const active: ProductOrderListItem[] = [];
    const history: ProductOrderListItem[] = [];
    for (const order of orders) {
      const category = classifyProductOrder(order);
      if (category === 'pending') pending.push(order);
      else if (category === 'active') active.push(order);
      else history.push(order);
    }
    return { pendingOrders: pending, activeOrders: active, historyOrders: history };
  }, [orders]);

  useEffect(() => {
    if (autoSelectedTab.current || loading || orders.length === 0) return;

    if (pendingOrders.length > 0) {
      setActiveTab('pending');
    } else if (activeOrders.length > 0) {
      setActiveTab('active');
    } else if (historyOrders.length > 0) {
      setActiveTab('history');
    }

    autoSelectedTab.current = true;
  }, [activeOrders.length, historyOrders.length, loading, orders.length, pendingOrders.length]);

  const displayOrders = useMemo(() => {
    if (activeTab === 'pending') return pendingOrders;
    if (activeTab === 'active') return activeOrders;
    return historyOrders;
  }, [activeOrders, activeTab, historyOrders, pendingOrders]);

  const { mutate: autoSyncMidtransProductStatus } = useMutation({
    mutationFn: async ({ orderNumber }: { orderNumber: string }) => {
      const token = (await getValidAccessToken()) ?? sessionToken ?? null;
      if (!token) return;

      await syncProductOrderStatus(orderNumber, token, {
        retryWithFreshToken: async () => {
          await refreshSession();
          return getValidAccessToken();
        },
      });
    },
    retry: 0,
  });

  useEffect(() => {
    if (!userId) return;

    const pending = pendingOrders.filter((order) => shouldAutoSyncProductOrder(order));
    const timeoutIds: number[] = [];

    pending.forEach((order) => {
      const key = order.order_number;
      if (attemptedAutoSync.current.has(key)) return;

      attemptedAutoSync.current.add(key);
      [0, 20000].forEach((delayMs) => {
        timeoutIds.push(
          window.setTimeout(() => {
            autoSyncMidtransProductStatus({ orderNumber: order.order_number });
          }, delayMs)
        );
      });
    });

    return () => {
      timeoutIds.forEach((timeoutId) => window.clearTimeout(timeoutId));
    };
  }, [autoSyncMidtransProductStatus, pendingOrders, userId]);

  const handleSyncStatus = useCallback(
    async (order: ProductOrderListItem) => {
      if (!sessionToken) {
        showToast('error', t('myOrders.errors.notAuthenticated'));
        return;
      }

      setSyncingOrderId(order.id);
      try {
        await syncProductOrderStatus(order.order_number, sessionToken, {
          retryWithFreshToken: async () => {
            await refreshSession();
            return getValidAccessToken();
          },
        });
        showToast('success', t('myOrders.toast.syncSuccess'));
      } catch (syncError) {
        showToast(
          'error',
          syncError instanceof Error && syncError.message ? syncError.message : t('myOrders.errors.syncFailed')
        );
      } finally {
        setSyncingOrderId(null);
      }
    },
    [getValidAccessToken, refreshSession, sessionToken, showToast, t]
  );


  const handleCancelOrder = useCallback(
    async (order: ProductOrderListItem) => {
      const invokeCancelProductOrder = (accessToken: string) =>
        withTimeout(
          invokeSupabaseFunction({
            functionName: 'cancel-product-order',
            body: { order_number: order.order_number },
            headers: { Authorization: `Bearer ${accessToken}` },
            fallbackMessage: 'Failed to cancel order',
          }),
          15000,
          'Request timeout. Please try again.'
        );

      let accessToken = (await getValidAccessToken()) ?? sessionToken ?? null;
      if (!accessToken) {
        showToast('error', t('myOrders.errors.notAuthenticated'));
        return;
      }

      const orderStatus = String(order.status || '').toLowerCase();
      const paymentStatus = String(order.payment_status || '').toLowerCase();

      if (paymentStatus === 'paid') {
        showToast('info', t('myOrders.toast.alreadyPaid', 'This order is already paid.'));
        return;
      }
      if (orderStatus === 'cancelled' || orderStatus === 'expired') {
        showToast('info', t('myOrders.toast.alreadyFinal', 'This order can no longer be cancelled.'));
        return;
      }

      setSyncingOrderId(order.id);
      try {
        try {
          await invokeCancelProductOrder(accessToken);
        } catch (cancelError) {
          if (getSupabaseFunctionStatus(cancelError) === 401) {
            await refreshSession();
            accessToken = await getValidAccessToken();
            if (!accessToken) {
              throw cancelError;
            }
            await invokeCancelProductOrder(accessToken);
          } else {
            throw cancelError;
          }
        }

        showToast('success', t('myOrders.toast.cancelSuccess', 'Order cancelled.'));
      } catch (cancelError) {
        showToast('error', cancelError instanceof Error ? cancelError.message : 'Failed to cancel order');
      } finally {
        setSyncingOrderId(null);
      }
    },
    [getValidAccessToken, refreshSession, sessionToken, showToast, t]
  );

  const toggleExpand = useCallback((orderId: number) => {
    setExpandedOrder((current) => (current === orderId ? null : orderId));
  }, []);

  const getStatusBadge = useCallback(
    (order: ProductOrderListItem) => {
      if (String(order.payment_status || '').toLowerCase() !== 'paid') {
        if (isCashierOrder(order)) {
          const orderStatus = String(order.status || '').toLowerCase();
          if (orderStatus === 'expired') {
            return { label: t('myOrders.status.cashierExpired', 'Cashier reservation expired'), tone: 'gray' as const };
          }
          return { label: t('myOrders.status.cashierPending', 'Awaiting cashier payment'), tone: 'amber' as const };
        }
        return { label: t('myOrders.status.pendingPayment'), tone: 'yellow' as const };
      }
      if (order.pickup_status === 'pending_review') {
        return { label: t('myOrders.status.pendingReview'), tone: 'amber' as const };
      }
      if (order.pickup_status === 'completed') {
        return { label: t('myOrders.status.pickedUp'), tone: 'green' as const };
      }
      if (order.pickup_status === 'expired') {
        return { label: t('myOrders.status.expired'), tone: 'gray' as const };
      }
      if (order.pickup_status === 'cancelled') {
        return { label: t('myOrders.status.cancelled'), tone: 'red' as const };
      }
      return { label: t('myOrders.status.readyForPickup'), tone: 'blue' as const };
    },
    [t]
  );

  const getPickupInstruction = useCallback(
    (order: ProductOrderListItem) => {
      const status = String(order.pickup_status || '').toLowerCase();
      if (status === 'completed') return t('myOrders.pickup.instructions.pickedUp');
      if (status === 'expired') return t('myOrders.pickup.instructions.expired');
      if (status === 'cancelled') return t('myOrders.pickup.instructions.cancelled');
      if (status === 'pending_review') return t('myOrders.pickup.instructions.pendingReview');
      return t('myOrders.pickup.instructions.ready');
    },
    [t]
  );

  const shouldShowPickupExpiry = useCallback((order: ProductOrderListItem) => {
    const status = String(order.pickup_status || '').toLowerCase();
    return Boolean(order.pickup_expires_at && (status === 'pending_pickup' || status === 'pending_review'));
  }, []);

  return {
    orders,
    loading,
    isFetching,
    activeTab,
    expandedOrder,
    syncingOrderId,
    pendingOrders,
    activeOrders,
    historyOrders,
    displayOrders,
    setActiveTab,
    toggleExpand,
    handleSyncStatus,
    handleCancelOrder,
    getStatusBadge,
    getPickupInstruction,
    shouldShowPickupExpiry,
    isPickupReady,
  };
}
