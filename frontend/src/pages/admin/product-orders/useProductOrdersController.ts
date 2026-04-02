import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { OrderSummaryRow } from '../../../hooks/useProductOrders';
import { queryKeys } from '../../../lib/queryKeys';
import {
  buildProductOrdersMenuSections,
  getCompletedOrders,
  getDisplayOrders,
  getPendingOrders,
  getTodaysOrders,
} from './productOrdersHelpers';
import { completeProductPickup, loadProductOrderDetailsByPickupCode } from './productOrdersData';
import type { ProductOrderDetails, ProductOrdersTab, UseProductOrdersControllerParams } from './productOrdersTypes';

const EMPTY_ORDERS: OrderSummaryRow[] = [];
const PRODUCT_ORDER_DETAIL_STALE_TIME_MS = 30 * 1000;

export function useProductOrdersController({
  orders,
  pendingCount,
  ordersError,
  session,
  showToast,
}: UseProductOrdersControllerParams) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<ProductOrdersTab>('pending');
  const [scannerOpen, setScannerOpen] = useState(false);
  const [lookupCode, setLookupCode] = useState('');
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [selectedPickupCode, setSelectedPickupCode] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (ordersError) showToast('error', ordersError);
  }, [ordersError, showToast]);

  const detailsQuery = useQuery<ProductOrderDetails>({
    queryKey: selectedPickupCode ? queryKeys.productOrderDetail(selectedPickupCode) : [...queryKeys.productOrderDetails(), 'idle'],
    enabled: Boolean(selectedPickupCode),
    queryFn: () => loadProductOrderDetailsByPickupCode(String(selectedPickupCode)),
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    staleTime: PRODUCT_ORDER_DETAIL_STALE_TIME_MS,
  });

  useEffect(() => {
    if (!selectedPickupCode || !detailsQuery.error) return;
    showToast('warning', detailsQuery.error.message || 'Order tidak lagi tersedia untuk pickup');
    setSelectedPickupCode(null);
    setActionError(null);
  }, [detailsQuery.error, selectedPickupCode, showToast]);

  const openDetails = useCallback(
    async (pickupCode: string) => {
      const normalizedCode = pickupCode.trim().toUpperCase();
      if (!normalizedCode) throw new Error('Kode pickup tidak valid');

      const nextDetails = await queryClient.fetchQuery({
        queryKey: queryKeys.productOrderDetail(normalizedCode),
        queryFn: () => loadProductOrderDetailsByPickupCode(normalizedCode),
        staleTime: PRODUCT_ORDER_DETAIL_STALE_TIME_MS,
      });
      setLookupCode(normalizedCode);
      setSelectedPickupCode(normalizedCode);
      return nextDetails;
    },
    [queryClient]
  );

  const completePickupMutation = useMutation({
    mutationFn: async (pickupCode: string) =>
      completeProductPickup({
        pickupCode,
        session,
      }),
    onSuccess: async (_, pickupCode) => {
      setSelectedPickupCode(null);
      setLookupCode('');
      setActionError(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.productOrders() }),
        queryClient.invalidateQueries({ queryKey: queryKeys.productOrderDetail(pickupCode) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.productOrderDetails() }),
      ]);
      showToast('success', 'Pickup produk berhasil diverifikasi');
    },
    onError: (error) => {
      setActionError(error instanceof Error ? error.message : 'Gagal memverifikasi barang');
    },
  });

  const handleLookup = useCallback(async () => {
    const trimmed = lookupCode.trim().toUpperCase();
    if (!trimmed) return;
    setLookupError(null);
    setActionError(null);
    try {
      await openDetails(trimmed);
    } catch (error) {
      setLookupError(error instanceof Error ? error.message : 'Gagal mencari order');
    }
  }, [lookupCode, openDetails]);

  const flashLookupInput = useCallback((color: 'green' | 'red') => {
    setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.classList.add('ring-2', `ring-${color}-500`);
      setTimeout(() => {
        inputRef.current?.classList.remove('ring-2', `ring-${color}-500`);
      }, 2000);
    }, 300);
  }, []);

  const handleScan = useCallback(
    async (decodedText: string) => {
      const code = decodedText.trim().toUpperCase();
      if (!code) throw new Error('Kode tidak valid');

      setLookupCode(code);
      setLookupError(null);
      setActionError(null);

      try {
        await openDetails(code);
        flashLookupInput('green');
      } catch (error) {
        setLookupError(error instanceof Error ? error.message : 'Gagal mencari order');
        flashLookupInput('red');
      }
    },
    [flashLookupInput, openDetails]
  );

  const handleSelectOrder = useCallback(
    async (pickupCode: string | null) => {
      if (!pickupCode) return;
      try {
        await openDetails(String(pickupCode));
      } catch {
        return;
      }
    },
    [openDetails]
  );

  const handleCloseDetails = useCallback(() => {
    setSelectedPickupCode(null);
    setActionError(null);
  }, []);

  const handleCompletePickup = useCallback(async () => {
    const pickupCode = detailsQuery.data?.order.pickup_code;
    if (!pickupCode) return;
    setActionError(null);
    await completePickupMutation.mutateAsync(pickupCode);
  }, [completePickupMutation, detailsQuery.data?.order.pickup_code]);

  const safeOrders = orders.length > 0 ? orders : EMPTY_ORDERS;
  const pendingOrders = useMemo(() => getPendingOrders(safeOrders), [safeOrders]);
  const todaysOrders = useMemo(() => getTodaysOrders(safeOrders), [safeOrders]);
  const completedOrders = useMemo(() => getCompletedOrders(safeOrders), [safeOrders]);
  const displayOrders = useMemo(
    () => getDisplayOrders(activeTab, pendingOrders, todaysOrders, completedOrders),
    [activeTab, completedOrders, pendingOrders, todaysOrders]
  );
  const menuSections = useMemo(() => buildProductOrdersMenuSections(pendingCount), [pendingCount]);

  return {
    activeTab,
    scannerOpen,
    lookupCode,
    lookupError,
    details: detailsQuery.data ?? null,
    submitting: completePickupMutation.isPending,
    actionError,
    inputRef,
    pendingOrders,
    todaysOrders,
    completedOrders,
    displayOrders,
    menuSections,
    setActiveTab,
    setScannerOpen,
    setLookupCode,
    handleLookup,
    handleScan,
    handleSelectOrder,
    handleCloseDetails,
    handleCompletePickup,
  };
}
