import { useCallback, useEffect, useMemo, useState } from 'react';
import AdminLayout from '../../components/AdminLayout';
import QRScannerModal from '../../components/admin/QRScannerModal';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { ADMIN_MENU_ITEMS, ADMIN_MENU_SECTIONS } from '../../constants/adminMenu';

type OrderSummaryRow = {
  id: number;
  order_number: string;
  total: number;
  pickup_code: string | null;
  pickup_status: string | null;
  paid_at: string | null;
  users?: { name?: string; email?: string } | null;
};

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
  const { signOut } = useAuth();
  const [orders, setOrders] = useState<OrderSummaryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [lookupCode, setLookupCode] = useState('');
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [details, setDetails] = useState<OrderDetails | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('order_products')
      .select('id, order_number, total, pickup_code, pickup_status, paid_at, users(name, email)')
      .eq('payment_status', 'paid')
      .order('paid_at', { ascending: false })
      .limit(25);

    if (error) {
      setOrders([]);
      setLoading(false);
      return;
    }

    setOrders((data || []) as unknown as OrderSummaryRow[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleTabReturn = () => {
      fetchOrders();
    };
    window.addEventListener(TAB_RETURN_EVENT, handleTabReturn);
    return () => {
      window.removeEventListener(TAB_RETURN_EVENT, handleTabReturn);
    };
  }, [fetchOrders]);

  const loadDetailsByPickupCode = useCallback(async (pickupCode: string) => {
    const { data: orderRow, error: orderError } = await supabase
      .from('order_products')
      .select('id, order_number, total, pickup_code, pickup_status, paid_at, payment_status, status, pickup_expires_at, users(name, email)')
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
      setLookupCode(code);
      setLookupError(null);
      setActionError(null);
      await loadDetailsByPickupCode(code);
    },
    [loadDetailsByPickupCode]
  );

  const handleCompletePickup = useCallback(async () => {
    if (!details?.order.pickup_code) return;
    setSubmitting(true);
    setActionError(null);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) throw new Error('Not authenticated');

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/complete-product-pickup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ pickupCode: details.order.pickup_code }),
      });

      const data = (await response.json()) as unknown;
      if (!response.ok) {
        const message = typeof (data as { error?: unknown }).error === 'string' ? String((data as { error?: unknown }).error) : 'Gagal menyelesaikan pickup';
        throw new Error(message);
      }

      setDetails(null);
      setLookupCode('');
      await fetchOrders();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Gagal menyelesaikan pickup');
    } finally {
      setSubmitting(false);
    }
  }, [details, fetchOrders]);

  const todays = useMemo(() => {
    const today = new Date();
    const key = today.toISOString().slice(0, 10);
    return orders.filter((o) => (o.paid_at ? String(o.paid_at).slice(0, 10) === key : false));
  }, [orders]);

  return (
    <AdminLayout
      menuItems={ADMIN_MENU_ITEMS}
      menuSections={ADMIN_MENU_SECTIONS}
      defaultActiveMenuId="product-orders"
      title="Pesanan Produk"
      subtitle="Scan pickup code untuk serahkan barang."
      headerActions={
        <button
          onClick={() => setScannerOpen(true)}
          className="flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-white hover:bg-red-700 transition-colors shadow-md"
        >
          <span className="material-symbols-outlined text-[20px]">qr_code_scanner</span>
          <span>Scan QR</span>
        </button>
      }
      onLogout={signOut}
    >
      <section className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#1a0f0f] shadow-sm overflow-hidden">
        <div className="p-6">
          <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
            <div className="flex-1">
              <label className="block text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2">
                Cari kode
              </label>
              <input
                value={lookupCode}
                onChange={(e) => setLookupCode(e.target.value.toUpperCase())}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleLookup();
                }}
                placeholder="PRX-XXX-YYY"
                className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1a0f0f] px-4 py-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary dark:text-white font-sans uppercase tracking-widest placeholder:normal-case placeholder:tracking-normal"
              />
            </div>
            <button
              onClick={handleLookup}
              className="rounded-lg bg-neutral-900 dark:bg-white px-6 py-3 text-sm font-bold text-white dark:text-neutral-900 hover:opacity-90 transition-opacity"
            >
              Verifikasi
            </button>
          </div>
          {lookupError && <div className="mt-4 text-sm text-red-600 dark:text-red-300">{lookupError}</div>}
        </div>
      </section>

      <section className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#1a0f0f] shadow-sm overflow-hidden">
        <div className="p-6">
          <div className="flex items-center justify-between gap-4">
            <h3 className="text-xl font-bold text-neutral-900 dark:text-white">Pesanan Hari Ini</h3>
            <button
              onClick={fetchOrders}
              className="text-sm font-bold text-primary hover:underline"
              disabled={loading}
            >
              Refresh
            </button>
          </div>

          {loading ? (
            <div className="py-10 text-sm text-gray-500 dark:text-gray-400">Loading...</div>
          ) : todays.length === 0 ? (
            <div className="py-10 text-sm text-gray-500 dark:text-gray-400">Belum ada pesanan paid hari ini.</div>
          ) : (
            <div className="mt-4 space-y-2">
              {todays.map((o) => (
                <button
                  key={o.id}
                  onClick={() => {
                    if (!o.pickup_code) return;
                    loadDetailsByPickupCode(String(o.pickup_code)).catch(() => {
                      return;
                    });
                  }}
                  className="w-full flex items-center justify-between gap-4 rounded-lg border border-gray-100 dark:border-white/10 bg-gray-50/60 dark:bg-white/5 px-4 py-3 text-left hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-neutral-900 dark:text-white truncate">
                      {o.pickup_code ?? '-'}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {o.users?.name ?? o.users?.email ?? 'Customer'}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-gray-500 dark:text-gray-400">${Number(o.total ?? 0).toFixed(2)}</span>
                    <span className="text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">{o.pickup_status ?? 'pending'}</span>
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
        closeOnSuccess
      />

      {details && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setDetails(null)}>
          <div className="w-full max-w-2xl rounded-xl bg-white dark:bg-[#120909] border border-gray-200 dark:border-white/10 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-200 dark:border-white/10 flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-xs uppercase tracking-widest text-gray-500 dark:text-gray-400">Pickup Code</p>
                <h3 className="text-2xl font-bold text-neutral-900 dark:text-white truncate">{details.order.pickup_code}</h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{details.order.users?.name ?? details.order.users?.email ?? 'Customer'}</p>
              </div>
              <button className="text-gray-400 hover:text-white" onClick={() => setDetails(null)} aria-label="Close">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="p-6">
              {actionError && <div className="mb-4 text-sm text-red-600 dark:text-red-300">{actionError}</div>}
              <div className="space-y-3">
                {details.items.map((i) => (
                  <div key={i.id} className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-neutral-900 dark:text-white truncate">{i.productName}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {i.variantName} · {i.quantity} × ${i.price.toFixed(2)}
                      </p>
                    </div>
                    <span className="text-sm font-bold text-neutral-900 dark:text-white">${i.subtotal.toFixed(2)}</span>
                  </div>
                ))}
              </div>

              <div className="mt-6 border-t border-gray-200 dark:border-white/10 pt-4 flex items-center justify-between">
                <span className="text-xs uppercase tracking-widest text-gray-500 dark:text-gray-400">Total</span>
                <span className="text-xl font-bold text-primary">${Number(details.order.total ?? 0).toFixed(2)}</span>
              </div>

              <button
                onClick={handleCompletePickup}
                disabled={submitting}
                className="mt-6 w-full rounded-lg bg-primary px-6 py-3 text-sm font-bold text-white hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Memproses...' : 'Serahkan Barang'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
