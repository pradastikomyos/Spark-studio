import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import AdminLayout from '../../components/AdminLayout';
import QRScannerModal from '../../components/admin/QRScannerModal';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { ADMIN_MENU_ITEMS, ADMIN_MENU_SECTIONS } from '../../constants/adminMenu';
import { formatCurrency } from '../../utils/formatters';
import { ensureFreshToken } from '../../utils/auth';
import { useSessionRefresh } from '../../hooks/useSessionRefresh';
import { useProductOrders, type OrderSummaryRow } from '../../hooks/useProductOrders';
import { useToast } from '../../components/Toast';

type OrderItemRow = {
  id: number;
  quantity: number;
  price: number;
  subtotal: number;
  variantName: string;
  productName: string;
};

type OrderDetails = {
  order: OrderSummaryRow & {
    payment_status: string;
    status: string;
    pickup_expires_at: string | null;
  };
  items: OrderItemRow[];
};

const TAB_RETURN_EVENT = 'tab-returned-from-idle';

export default function ProductOrders() {
  const { signOut, session } = useAuth();
  const { showToast } = useToast();

  // Enable background session refresh for long-idle admin sessions
  useSessionRefresh();

  const [activeTab, setActiveTab] = useState<'pending' | 'today' | 'completed'>('pending');
  const [scannerOpen, setScannerOpen] = useState(false);
  const [lookupCode, setLookupCode] = useState('');
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [details, setDetails] = useState<OrderDetails | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data, error, isLoading, isFetching, refetch } = useProductOrders();
  const orders = data?.orders ?? [];
  const pendingCount = data?.pendingCount ?? 0;
  const ordersError = error instanceof Error ? error.message : error ? 'Gagal memuat daftar pesanan' : null;

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleTabReturn = () => {
      refetch();
    };
    window.addEventListener(TAB_RETURN_EVENT, handleTabReturn);
    return () => {
      window.removeEventListener(TAB_RETURN_EVENT, handleTabReturn);
    };
  }, [refetch]);

  useEffect(() => {
    if (ordersError) showToast('error', ordersError);
  }, [ordersError, showToast]);

  const loadDetailsByPickupCode = useCallback(async (pickupCode: string) => {
    const { data: orderRow, error: orderError } = await supabase
      .from('order_products')
      .select('id, order_number, total, pickup_code, pickup_status, paid_at, payment_status, status, pickup_expires_at, profiles(name, email)')
      .eq('pickup_code', pickupCode)
      .single();

    if (orderError || !orderRow) throw orderError ?? new Error('Order not found');

    const paymentStatus = String((orderRow as { payment_status?: string }).payment_status || '').toLowerCase();
    if (paymentStatus !== 'paid') throw new Error('Order belum dibayar');

    const pickupStatus = String((orderRow as { pickup_status?: string | null }).pickup_status || '').toLowerCase();
    if (pickupStatus === 'completed') throw new Error('Barang sudah diambil');
    if (pickupStatus === 'expired') throw new Error('Pickup code sudah expired');

    const expiresAt = (orderRow as { pickup_expires_at?: string | null }).pickup_expires_at ?? null;
    if (expiresAt && Date.now() > new Date(expiresAt).getTime()) throw new Error('Pickup code sudah expired');

    const orderId = Number((orderRow as { id: number | string }).id);
    const { data: itemRows, error: itemsError } = await supabase
      .from('order_product_items')
      .select('id, quantity, price, subtotal, product_variants(name, products(name))')
      .eq('order_product_id', orderId);

    if (itemsError) throw itemsError;

    const items: OrderItemRow[] = (itemRows || []).map((row) => {
      const pv = (row as unknown as { product_variants?: { name?: string; products?: { name?: string } | null } | null }).product_variants;
      return {
        id: Number((row as unknown as { id: number | string }).id),
        quantity: Number((row as unknown as { quantity: number | string }).quantity),
        price: Number((row as unknown as { price: number | string }).price),
        subtotal: Number((row as unknown as { subtotal: number | string }).subtotal),
        variantName: String(pv?.name ?? 'Variant'),
        productName: String(pv?.products?.name ?? 'Product'),
      };
    });

    setDetails({ order: orderRow as unknown as OrderDetails['order'], items });
  }, []);

  const handleLookup = useCallback(async () => {
    const trimmed = lookupCode.trim().toUpperCase();
    if (!trimmed) return;
    setLookupError(null);
    setActionError(null);
    try {
      await loadDetailsByPickupCode(trimmed);
    } catch (e) {
      setLookupError(e instanceof Error ? e.message : 'Gagal mencari order');
    }
  }, [lookupCode, loadDetailsByPickupCode]);

  const handleScan = useCallback(
    async (decodedText: string) => {
      const code = decodedText.trim().toUpperCase();
      if (!code) throw new Error('Kode tidak valid');

      // Set code immediately so user can see what was scanned
      setLookupCode(code);
      setLookupError(null);
      setActionError(null);

      // Try to load details - if it fails, error will show on page, not in modal
      try {
        await loadDetailsByPickupCode(code);

        // Success - animate input
        setTimeout(() => {
          inputRef.current?.focus();
          inputRef.current?.classList.add('ring-2', 'ring-green-500');
          setTimeout(() => {
            inputRef.current?.classList.remove('ring-2', 'ring-green-500');
          }, 2000);
        }, 300);
      } catch (err) {
        // Show error on page, not in modal
        setLookupError(err instanceof Error ? err.message : 'Gagal mencari order');

        // Still animate input to show code was scanned
        setTimeout(() => {
          inputRef.current?.focus();
          inputRef.current?.classList.add('ring-2', 'ring-red-500');
          setTimeout(() => {
            inputRef.current?.classList.remove('ring-2', 'ring-red-500');
          }, 2000);
        }, 300);
      }

      // Don't throw - let modal close gracefully
    },
    [loadDetailsByPickupCode]
  );

  const handleCompletePickup = useCallback(async () => {
    if (!details?.order.pickup_code) return;
    setSubmitting(true);
    setActionError(null);
    try {
      // Proactively ensure token is fresh before critical operation
      let token = await ensureFreshToken(session);

      if (!token) {
        throw new Error('Sesi login tidak valid. Silakan login ulang.');
      }

      const invokePickup = async (accessToken: string) => {
        return supabase.functions.invoke('complete-product-pickup', {
          body: { pickupCode: details.order.pickup_code },
          headers: { Authorization: `Bearer ${accessToken}` },
        });
      };

      let { error: invokeError } = await invokePickup(token);
      const status = invokeError ? (invokeError as { status?: number }).status : undefined;

      // Fallback: if still get 401, try one more refresh
      if (invokeError && status === 401) {
        const { data, error } = await supabase.auth.refreshSession();
        if (error || !data.session?.access_token) {
          throw new Error('Sesi login kadaluarsa. Silakan login ulang.');
        }
        token = data.session.access_token;
        const retry = await invokePickup(token);
        invokeError = retry.error ?? null;
      }

      if (invokeError) {
        const contextError =
          typeof (invokeError as { context?: { error?: unknown } }).context?.error === 'string'
            ? String((invokeError as { context?: { error?: unknown } }).context?.error)
            : null;
        throw new Error(contextError || invokeError.message || 'Gagal memverifikasi barang');
      }

      setDetails(null);
      setLookupCode('');
      await refetch();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Gagal memverifikasi barang');
    } finally {
      setSubmitting(false);
    }
  }, [details, refetch, session]);

  const pendingOrders = useMemo(() => {
    return orders.filter((o) => o.pickup_status === 'pending_pickup');
  }, [orders]);

  const todays = useMemo(() => {
    const today = new Date();
    const key = today.toISOString().slice(0, 10);
    return orders.filter((o) => (o.paid_at ? String(o.paid_at).slice(0, 10) === key : false));
  }, [orders]);

  const completedOrders = useMemo(() => {
    return orders.filter((o) => o.pickup_status === 'completed');
  }, [orders]);

  const menuSections = useMemo(() => {
    return ADMIN_MENU_SECTIONS.map((section) => {
      if (section.id !== 'store') return section;
      return {
        ...section,
        items: section.items.map((item) => {
          if (item.id !== 'product-orders') return item;
          return { ...item, badge: pendingCount };
        }),
      };
    });
  }, [pendingCount]);

  const displayOrders = useMemo(() => {
    if (activeTab === 'pending') return pendingOrders;
    if (activeTab === 'today') return todays;
    return completedOrders;
  }, [activeTab, pendingOrders, todays, completedOrders]);

  return (
    <AdminLayout
      menuItems={ADMIN_MENU_ITEMS}
      menuSections={menuSections}
      defaultActiveMenuId="product-orders"
      title="Pesanan Produk"
      subtitle="Scan pickup code untuk verifikasi barang."
      headerActions={
        <button
          onClick={() => setScannerOpen(true)}
          className="flex items-center justify-center gap-2 rounded-lg bg-neutral-900 px-3 md:px-4 py-2.5 text-sm font-bold text-gray-900 hover:bg-neutral-800 transition-colors shadow-md"
        >
          <span className="material-symbols-outlined text-[20px]">qr_code_scanner</span>
          <span className="hidden sm:inline">Scan QR</span>
        </button>
      }
      onLogout={signOut}
    >
      <section className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="p-6">
          <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
            <div className="flex-1">
              <label className="block text-xs font-bold uppercase tracking-wide text-gray-500 mb-2">
                Cari kode
              </label>
              <input
                ref={inputRef}
                value={lookupCode}
                onChange={(e) => setLookupCode(e.target.value.toUpperCase())}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleLookup();
                }}
                placeholder="PRX-XXX-YYY"
                className="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary text-gray-900 font-sans uppercase tracking-widest placeholder:normal-case placeholder:tracking-normal transition-all duration-300"
              />
            </div>
            <button
              onClick={handleLookup}
              className="rounded-lg bg-neutral-900 px-6 py-3 text-sm font-bold text-gray-900 hover:opacity-90 transition-opacity"
            >
              Verifikasi
            </button>
          </div>
          {lookupError && <div className="mt-4 text-sm text-red-600">{lookupError}</div>}
        </div>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="p-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-4">
            <h3 className="text-xl font-bold text-neutral-900">Daftar Pesanan</h3>
            <div className="flex items-center gap-3">
              <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
                <button
                  onClick={() => setActiveTab('pending')}
                  className={`px-3 py-1.5 text-xs font-bold rounded transition-colors ${activeTab === 'pending'
                      ? 'bg-primary text-gray-900'
                      : 'text-gray-600 hover:bg-white'
                    }`}
                >
                  Pending ({pendingOrders.length})
                </button>
                <button
                  onClick={() => setActiveTab('today')}
                  className={`px-3 py-1.5 text-xs font-bold rounded transition-colors ${activeTab === 'today'
                      ? 'bg-primary text-gray-900'
                      : 'text-gray-600 hover:bg-white'
                    }`}
                >
                  Hari Ini ({todays.length})
                </button>
                <button
                  onClick={() => setActiveTab('completed')}
                  className={`px-3 py-1.5 text-xs font-bold rounded transition-colors ${activeTab === 'completed'
                      ? 'bg-primary text-gray-900'
                      : 'text-gray-600 hover:bg-white'
                    }`}
                >
                  Selesai ({completedOrders.length})
                </button>
              </div>
              <button
                onClick={() => refetch()}
                className="text-sm font-bold text-primary hover:underline"
                disabled={isFetching}
              >
                Refresh
              </button>
            </div>
          </div>
          {ordersError && <div className="mb-4 text-sm text-red-600">{ordersError}</div>}

          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, index) => (
                <div
                  key={index}
                  className="h-[64px] rounded-lg border border-gray-100 bg-gray-50/60 animate-pulse"
                />
              ))}
            </div>
          ) : displayOrders.length === 0 ? (
            <div className="py-10 text-center">
              <span className="material-symbols-outlined text-4xl text-gray-700 mb-2">
                {activeTab === 'pending' ? 'inventory_2' : activeTab === 'today' ? 'today' : 'check_circle'}
              </span>
              <p className="text-sm text-gray-500">
                {activeTab === 'pending' && 'Tidak ada pesanan menunggu pickup.'}
                {activeTab === 'today' && 'Belum ada pesanan paid hari ini.'}
                {activeTab === 'completed' && 'Belum ada pesanan selesai.'}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {displayOrders.map((o) => (
                <button
                  key={o.id}
                  onClick={() => {
                    if (!o.pickup_code) return;
                    loadDetailsByPickupCode(String(o.pickup_code)).catch(() => {
                      return;
                    });
                  }}
                  className="w-full flex items-center justify-between gap-4 rounded-lg border border-gray-100 bg-gray-50/60 px-4 py-3 text-left hover:bg-gray-100 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-neutral-900 truncate">
                      {o.pickup_code ?? '-'}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {o.profiles?.name ?? o.profiles?.email ?? 'Customer'}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-gray-500">{formatCurrency(Number(o.total ?? 0))}</span>
                    <span className={`text-xs font-bold uppercase tracking-wide px-2 py-1 rounded ${o.pickup_status === 'pending_pickup'
                        ? 'bg-yellow-100 text-yellow-700'
                        : o.pickup_status === 'completed'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}>
                      {o.pickup_status === 'pending_pickup' ? 'Pending' : o.pickup_status === 'completed' ? 'Selesai' : o.pickup_status ?? 'pending'}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      <QRScannerModal
        isOpen={scannerOpen}
        onClose={() => setScannerOpen(false)}
        title="Scan Pickup QR"
        onScan={handleScan}
        closeOnSuccess={true}
        closeDelayMs={1000}
        closeOnError={true}
        closeOnErrorDelayMs={1000}
        autoResumeOnError={false}
      />

      {details && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setDetails(null)}>
          <div className="w-full max-w-2xl rounded-xl bg-white border border-gray-200 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-200 flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-xs uppercase tracking-widest text-gray-500">Pickup Code</p>
                <h3 className="text-2xl font-bold text-neutral-900 truncate">{details.order.pickup_code}</h3>
                <p className="mt-1 text-sm text-gray-500">{details.order.profiles?.name ?? details.order.profiles?.email ?? 'Customer'}</p>
              </div>
              <button className="text-gray-600 hover:text-gray-900" onClick={() => setDetails(null)} aria-label="Close">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="p-6">
              {actionError && <div className="mb-4 text-sm text-red-600">{actionError}</div>}
              <div className="space-y-3">
                {details.items.map((i) => (
                  <div key={i.id} className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-neutral-900 truncate">{i.productName}</p>
                      <p className="text-xs text-gray-500 truncate">
                        {i.variantName} · {i.quantity} × {formatCurrency(i.price)}
                      </p>
                    </div>
                    <span className="text-sm font-bold text-neutral-900">{formatCurrency(i.subtotal)}</span>
                  </div>
                ))}
              </div>

              <div className="mt-6 border-t border-gray-200 pt-4 flex items-center justify-between">
                <span className="text-xs uppercase tracking-widest text-gray-500">Total</span>
                <span className="text-xl font-bold text-primary">{formatCurrency(Number(details.order.total ?? 0))}</span>
              </div>

              <button
                onClick={handleCompletePickup}
                disabled={submitting}
                className="mt-6 w-full rounded-lg bg-neutral-900 px-6 py-3 text-sm font-bold text-gray-900 hover:bg-neutral-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Memproses...' : 'Verifikasi Barang'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
