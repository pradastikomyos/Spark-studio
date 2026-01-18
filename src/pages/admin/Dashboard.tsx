import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import AdminLayout from '../../components/AdminLayout';
import { ADMIN_MENU_ITEMS } from '../../constants/adminMenu';
import { getOrderStatusColor } from '../../utils/statusHelpers.tsx';
import { formatDate, getInitials, formatCurrency } from '../../utils/formatters';

type RecentOrder = {
  id: string;
  order_number: string;
  created_at: string;
  total_amount: string;
  status: string;
  users: {
    name: string;
    email: string;
  };
  order_items?: Array<{
    tickets?: {
      name?: string | null;
    } | null;
  }> | null;
};

const Dashboard = () => {
  const { signOut } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalBookings: 0,
    shopRevenue: 0,
    activeEvents: 0,
  });
  const [orders, setOrders] = useState<RecentOrder[]>([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // Fetch total bookings (purchased tickets)
      const { count: bookingsCount } = await supabase
        .from('purchased_tickets')
        .select('*', { count: 'exact', head: true });

      // Fetch shop revenue (from orders)
      const { data: ordersData } = await supabase
        .from('orders')
        .select('total_amount')
        .eq('status', 'paid');

      const totalRevenue = ordersData?.reduce((sum, order) => sum + parseFloat(order.total_amount), 0) || 0;

      // Fetch active events (tickets)
      const { count: eventsCount } = await supabase
        .from('tickets')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);

      setStats({
        totalBookings: bookingsCount || 0,
        shopRevenue: totalRevenue,
        activeEvents: eventsCount || 0,
      });

      // Fetch recent orders with user details
      const { data: recentOrders } = await supabase
        .from('orders')
        .select(`
          id,
          order_number,
          created_at,
          total_amount,
          status,
          users!inner(name, email),
          order_items!inner(
            tickets(name)
          )
        `)
        .order('created_at', { ascending: false })
        .limit(5);

      setOrders(((recentOrders ?? []) as unknown) as RecentOrder[]);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const statsDisplay = [
    { 
      label: 'Total Bookings', 
      value: loading ? '...' : stats.totalBookings.toLocaleString(), 
      change: '+12%', 
      description: 'Tickets sold' 
    },
    { 
      label: 'Shop Revenue', 
      value: loading ? '...' : formatCurrency(stats.shopRevenue), 
      change: '+5%', 
      description: 'Gross volume' 
    },
    { 
      label: 'Active Events', 
      value: loading ? '...' : stats.activeEvents.toString(), 
      change: '+2%', 
      description: 'Currently live' 
    },
  ];

  return (
    <AdminLayout
      menuItems={ADMIN_MENU_ITEMS.map(item => 
        item.id === 'dashboard' ? { ...item, filled: true } : item
      )}
      defaultActiveMenuId="dashboard"
      title="Dashboard Overview"
      subtitle="Welcome back, Admin. Here's what's happening today."
      headerActions={
        <>
          <button className="flex items-center justify-center gap-2 rounded-lg bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 px-4 py-2.5 text-sm font-bold text-neutral-900 dark:text-white hover:bg-gray-50 dark:hover:bg-white/10 transition-colors shadow-sm">
            <span className="material-symbols-outlined text-[20px]">add</span>
            <span>Add New Stage</span>
          </button>
          <button className="flex items-center justify-center gap-2 rounded-lg bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 px-4 py-2.5 text-sm font-bold text-neutral-900 dark:text-white hover:bg-gray-50 dark:hover:bg-white/10 transition-colors shadow-sm">
            <span className="material-symbols-outlined text-[20px]">download</span>
            <span>Export Data</span>
          </button>
        </>
      }
      onLogout={signOut}
    >
      <section className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {statsDisplay.map((stat, index) => (
          <div
            key={index}
            className="flex flex-col gap-1 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#1a0f0f] p-6 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">{stat.label}</p>
              <span className="rounded-full bg-green-100 dark:bg-green-900/30 px-2 py-0.5 text-xs font-bold text-green-700 dark:text-green-400 font-sans">
                {stat.change}
              </span>
            </div>
            <p className="text-4xl font-black text-primary tracking-tight mt-2">{stat.value}</p>
            <p className="text-sm text-gray-400 mt-1 font-sans">{stat.description}</p>
          </div>
        ))}
      </section>

      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-lg font-bold text-neutral-900 dark:text-white">Recent Orders</h3>
          <a className="text-sm font-bold text-primary hover:underline" href="#">
            View All
          </a>
        </div>
        <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#1a0f0f] shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-white/5">
                  <th className="whitespace-nowrap px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Order ID</th>
                  <th className="whitespace-nowrap px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Customer</th>
                  <th className="whitespace-nowrap px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Date</th>
                  <th className="whitespace-nowrap px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Service</th>
                  <th className="whitespace-nowrap px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 text-right">Amount</th>
                  <th className="whitespace-nowrap px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-white/5 font-sans">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                      Loading orders...
                    </td>
                  </tr>
                ) : orders.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                      No orders found
                    </td>
                  </tr>
                ) : (
                  orders.map((order) => (
                    <tr key={order.id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors group">
                      <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-primary">{order.order_number}</td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                            {getInitials(order.users.name)}
                          </div>
                          <span className="text-sm font-semibold text-neutral-900 dark:text-white">{order.users.name}</span>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                        {formatDate(order.created_at)}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-neutral-900 dark:text-white">
                        {order.order_items?.[0]?.tickets?.name || 'N/A'}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm font-bold text-neutral-900 dark:text-white text-right">
                        {formatCurrency(order.total_amount)}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-center">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold capitalize ${getOrderStatusColor(order.status)}`}
                        >
                          {order.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between border-t border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-white/5 px-6 py-4">
            <span className="text-sm text-gray-500 dark:text-gray-400 font-sans">
              Showing {orders.length} of {orders.length} items
            </span>
            <div className="flex gap-2">
              <button className="flex h-8 w-8 items-center justify-center rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-transparent text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 disabled:opacity-50">
                <span className="material-symbols-outlined text-sm">chevron_left</span>
              </button>
              <button className="flex h-8 w-8 items-center justify-center rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-transparent text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5">
                <span className="material-symbols-outlined text-sm">chevron_right</span>
              </button>
            </div>
          </div>
        </div>
      </section>
    </AdminLayout>
  );
};

export default Dashboard;
