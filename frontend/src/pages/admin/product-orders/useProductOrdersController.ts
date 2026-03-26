import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { OrderSummaryRow } from '../../../hooks/useProductOrders';
import {
  buildProductOrdersMenuSections,
  getCompletedOrders,
  getDisplayOrders,
  getPendingOrders,
  getTodaysOrders,
  TAB_RETURN_EVENT,
} from './productOrdersHelpers';
import { completeProductPickup, loadProductOrderDetailsByPickupCode } from './productOrdersData';
import type { ProductOrderDetails, ProductOrdersTab, UseProductOrdersControllerParams } from './productOrdersTypes';

const EMPTY_ORDERS: OrderSummaryRow[] = [];

export function useProductOrdersController({
  orders,
  pendingCount,
  ordersError,
  refetch,
  session,
  showToast,
}: UseProductOrdersControllerParams) {
  const [activeTab, setActiveTab] = useState<ProductOrdersTab>('pending');
  const [scannerOpen, setScannerOpen] = useState(false);
  const [lookupCode, setLookupCode] = useState('');
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [details, setDetails] = useState<ProductOrderDetails | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleTabReturn = () => {
      void refetch();
    };
    window.addEventListener(TAB_RETURN_EVENT, handleTabReturn);
    return () => {
      window.removeEventListener(TAB_RETURN_EVENT, handleTabReturn);
    };
  }, [refetch]);

  useEffect(() => {
    if (ordersError) showToast('error', ordersError);
  }, [ordersError, showToast]);

  const loadDetails = useCallback(async (pickupCode: string) => {
    const nextDetails = await loadProductOrderDetailsByPickupCode(pickupCode);
    setDetails(nextDetails);
    return nextDetails;
  }, []);

  const handleLookup = useCallback(async () => {
    const trimmed = lookupCode.trim().toUpperCase();
    if (!trimmed) return;
    setLookupError(null);
    setActionError(null);
    try {
      await loadDetails(trimmed);
    } catch (error) {
      setLookupError(error instanceof Error ? error.message : 'Gagal mencari order');
    }
  }, [loadDetails, lookupCode]);

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
        await loadDetails(code);
        flashLookupInput('green');
      } catch (error) {
        setLookupError(error instanceof Error ? error.message : 'Gagal mencari order');
        flashLookupInput('red');
      }
    },
    [flashLookupInput, loadDetails]
  );

  const handleSelectOrder = useCallback(
    async (pickupCode: string | null) => {
      if (!pickupCode) return;
      try {
        await loadDetails(String(pickupCode));
      } catch {
        return;
      }
    },
    [loadDetails]
  );

  const handleCloseDetails = useCallback(() => {
    setDetails(null);
    setActionError(null);
  }, []);

  const handleCompletePickup = useCallback(async () => {
    if (!details?.order.pickup_code) return;
    setSubmitting(true);
    setActionError(null);
    try {
      await completeProductPickup({
        pickupCode: details.order.pickup_code,
        session,
      });
      setDetails(null);
      setLookupCode('');
      await refetch();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Gagal memverifikasi barang');
    } finally {
      setSubmitting(false);
    }
  }, [details?.order.pickup_code, refetch, session]);

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
    details,
    submitting,
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
