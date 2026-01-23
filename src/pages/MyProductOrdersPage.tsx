import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

type ProductOrderRow = {
  id: number;
  order_number: string;
  total: number;
  status: string;
  payment_status: string;
  pickup_status: string | null;
  pickup_code: string | null;
  created_at: string | null;
};

export default function MyProductOrdersPage() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<ProductOrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const statusLabel = useMemo(() => {
    const map = new Map<string, string>([
      ['unpaid', 'Unpaid'],
      ['paid', 'Paid'],
      ['failed', 'Failed'],
      ['expired', 'Expired'],
      ['refunded', 'Refunded'],
      ['pending_pickup', 'Waiting Pickup'],
      ['completed', 'Completed'],
      ['cancelled', 'Cancelled'],
    ]);
    return (key: string | null | undefined) => map.get(String(key ?? '').toLowerCase()) ?? String(key ?? '-');
  }, []);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!user?.email) {
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        setError(null);

        const { data: userRow, error: userErr } = await supabase.from('users').select('id').eq('email', user.email).single();
        if (userErr || !userRow) throw userErr ?? new Error('User not found');

        const { data: rows, error: ordersErr } = await supabase
          .from('order_products')
          .select('id, order_number, total, status, payment_status, pickup_status, pickup_code, created_at')
          .eq('user_id', (userRow as unknown as { id: number }).id)
          .order('created_at', { ascending: false });

        if (ordersErr) throw ordersErr;
        if (!cancelled) setOrders((rows || []) as unknown as ProductOrderRow[]);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : 'Failed to load orders');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [user]);

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark">
      <main className="max-w-5xl mx-auto px-6 lg:px-12 py-16 w-full">
        <header className="mb-10 border-b border-gray-200 dark:border-gray-800 pb-6 flex items-end justify-between gap-6">
          <div>
            <h1 className="font-display text-4xl md:text-5xl font-light">My Orders</h1>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 uppercase tracking-widest">Product orders</p>
          </div>
          <Link
            to="/shop"
            className="text-primary hover:text-white hover:bg-primary border border-primary px-6 py-2 text-sm uppercase tracking-widest transition-all duration-300"
          >
            Shop
          </Link>
        </header>

        {error && <div className="mb-6 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-700 dark:text-red-200">{error}</div>}

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : orders.length === 0 ? (
          <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white/50 dark:bg-surface-dark p-10 text-center">
            <p className="text-gray-600 dark:text-gray-300">No orders yet.</p>
            <Link to="/shop" className="inline-block mt-6 bg-primary text-white px-8 py-3 uppercase tracking-widest text-sm hover:bg-red-700 transition-colors">
              Browse Shop
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((o) => (
              <Link
                key={o.id}
                to={`/order/product/success/${o.order_number}`}
                className="block rounded-xl border border-gray-200 dark:border-gray-800 bg-white/50 dark:bg-surface-dark p-6 hover:border-primary/50 transition-colors"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-xs uppercase tracking-widest text-gray-500 dark:text-gray-400">Order</p>
                    <p className="font-display text-xl truncate">{o.order_number}</p>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      {o.created_at ? new Date(o.created_at).toLocaleString() : '-'}
                    </p>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className="text-xs uppercase tracking-widest text-gray-500 dark:text-gray-400">Status</p>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{statusLabel(o.pickup_status ?? o.payment_status)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs uppercase tracking-widest text-gray-500 dark:text-gray-400">Total</p>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">${Number(o.total ?? 0).toFixed(2)}</p>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

