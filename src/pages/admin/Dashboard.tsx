import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import AdminLayout from '../../components/AdminLayout';
import { ADMIN_MENU_ITEMS, ADMIN_MENU_SECTIONS } from '../../constants/adminMenu';

const Dashboard = () => {
  const { user, signOut } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalPurchasedTickets: 0,
    totalEntered: 0,
    totalNoShow: 0,
    totalGiftsExchanged: 0,
    totalOrders: 0,
    pendingOrders: 0,
    paidOrders: 0,
    processingOrders: 0,
  });

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // Fetch purchased tickets stats
      const { count: totalPurchased } = await supabase
        .from('purchased_tickets')
        .select('*', { count: 'exact', head: true });

      const { count: totalUsed } = await supabase
        .from('purchased_tickets')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'used');

      const { count: totalRedeemed } = await supabase
        .from('purchased_tickets')
        .select('*', { count: 'exact', head: true })
        .not('redeemed_merchandise_at', 'is', null);

      // Fetch orders stats
      const { count: totalOrders } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true });

      const { count: pendingOrders } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      const { count: paidOrders } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'paid');

      const { count: processingOrders } = await supabase
        .from('order_products')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'processing');

      setStats({
        totalPurchasedTickets: totalPurchased || 0,
        totalEntered: totalUsed || 0,
        totalNoShow: (totalPurchased || 0) - (totalUsed || 0),
        totalGiftsExchanged: totalRedeemed || 0,
        totalOrders: totalOrders || 0,
        pendingOrders: pendingOrders || 0,
        paidOrders: paidOrders || 0,
        processingOrders: processingOrders || 0,
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getUserInitials = () => {
    if (!user?.email) return 'A';
    return user.email.charAt(0).toUpperCase();
  };

  return (
    <AdminLayout
      menuItems={ADMIN_MENU_ITEMS}
      menuSections={ADMIN_MENU_SECTIONS}
      defaultActiveMenuId="dashboard"
      title="Dashboard Overview"
      onLogout={signOut}
    >
      {/* Welcome Card */}
      <div className="rounded-xl border border-white/5 bg-surface-dark p-6 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-full bg-surface-darker border border-white/10 flex items-center justify-center text-lg font-bold">
            {getUserInitials()}
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Welcome Back</h3>
            <p className="text-sm text-gray-400">Spark Admin Panel</p>
          </div>
        </div>
        <button 
          onClick={signOut}
          className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium hover:bg-white/10 transition-colors"
        >
          <span className="material-symbols-outlined text-sm">logout</span>
          Sign out
        </button>
      </div>

      {/* Ticket Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-white/5 bg-surface-dark p-5">
          <p className="text-sm text-gray-400 mb-1">Total purchased tickets</p>
          <p className="text-3xl font-bold text-white">
            {loading ? '...' : stats.totalPurchasedTickets}
          </p>
        </div>
        <div className="rounded-xl border border-white/5 bg-surface-dark p-5">
          <p className="text-sm text-gray-400 mb-1">Total already entered</p>
          <p className="text-3xl font-bold text-white">
            {loading ? '...' : stats.totalEntered}
          </p>
        </div>
        <div className="rounded-xl border border-white/5 bg-surface-dark p-5">
          <p className="text-sm text-gray-400 mb-1">Total didn't end up coming</p>
          <p className="text-3xl font-bold text-white">
            {loading ? '...' : stats.totalNoShow}
          </p>
        </div>
        <div className="rounded-xl border border-white/5 bg-surface-dark p-5">
          <p className="text-sm text-gray-400 mb-1">Total already exchanged gifts</p>
          <p className="text-3xl font-bold text-white">
            {loading ? '...' : stats.totalGiftsExchanged}
          </p>
        </div>
      </div>

      {/* Order Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-white/5 bg-surface-dark p-5">
          <p className="text-sm text-gray-400 mb-1">Total Orders</p>
          <p className="text-3xl font-bold text-white">
            {loading ? '...' : stats.totalOrders}
          </p>
        </div>
        <div className="rounded-xl border border-white/5 bg-surface-dark p-5">
          <p className="text-sm text-gray-400 mb-1">Pending Orders</p>
          <p className="text-3xl font-bold text-white">
            {loading ? '...' : stats.pendingOrders}
          </p>
        </div>
        <div className="rounded-xl border border-white/5 bg-surface-dark p-5">
          <p className="text-sm text-gray-400 mb-1">Paid Orders</p>
          <p className="text-3xl font-bold text-white">
            {loading ? '...' : stats.paidOrders}
          </p>
        </div>
        <div className="rounded-xl border border-white/5 bg-surface-dark p-5">
          <p className="text-sm text-gray-400 mb-1">Processing Orders</p>
          <p className="text-3xl font-bold text-white">
            {loading ? '...' : stats.processingOrders}
          </p>
        </div>
      </div>

      {/* QR Scanner Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-3 rounded-xl border border-white/5 bg-surface-dark p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-white font-display">Pickup Store Scanner</h3>
            <span className="px-2 py-1 rounded bg-green-500/10 text-green-400 text-xs font-bold border border-green-500/20">
              Ready to Scan
            </span>
          </div>
          <div className="border-2 border-dashed border-white/10 rounded-xl bg-surface-darker p-12 flex flex-col items-center justify-center text-center hover:border-primary/50 transition-colors cursor-pointer group">
            <div className="h-16 w-16 rounded-full bg-white/5 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <span className="material-symbols-outlined text-3xl text-primary">qr_code_scanner</span>
            </div>
            <h4 className="text-lg font-medium text-white mb-2">Scan QR Code</h4>
            <p className="text-sm text-gray-400 max-w-sm">
              Place the ticket QR code in front of the camera or click here to manually enter the ticket ID.
            </p>
            <button className="mt-6 px-4 py-2 bg-primary text-white text-sm font-bold rounded shadow-lg shadow-red-900/20 hover:bg-red-600 transition-colors">
              Activate Camera
            </button>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="rounded-xl border border-white/5 bg-surface-dark p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-bold text-white font-display">Chart Purchased Ticket</h3>
          <div className="relative">
            <select className="appearance-none bg-surface-darker border border-white/10 rounded px-3 py-1.5 pr-8 text-sm text-gray-300 focus:outline-none focus:border-primary">
              <option>This year</option>
              <option>Last year</option>
            </select>
            <span className="material-symbols-outlined absolute right-2 top-1.5 text-gray-500 text-sm pointer-events-none">
              expand_more
            </span>
          </div>
        </div>
        <div className="relative h-64 w-full rounded border border-white/5 p-4 flex items-end justify-between bg-[linear-gradient(to_right,#27272a_1px,transparent_1px),linear-gradient(to_bottom,#27272a_1px,transparent_1px)] bg-[size:40px_40px]">
          <div className="absolute left-0 top-0 bottom-8 w-8 flex flex-col justify-between text-[10px] text-gray-500 font-mono text-right pr-2">
            <span>7</span>
            <span>6</span>
            <span>5</span>
            <span>4</span>
            <span>3</span>
            <span>2</span>
            <span>1</span>
            <span>0</span>
          </div>
          <svg className="absolute left-8 right-0 top-0 bottom-8 h-full w-[calc(100%-2rem)] overflow-visible" preserveAspectRatio="none">
            <path d="M0,0 L50,180 L100,180 L150,180 L200,180 L250,180 L300,180 L350,180 L400,180 L450,180 L500,180 L550,180 L600,180 L650,180 L700,180 L750,180" fill="none" stroke="#8b5cf6" strokeWidth="2" />
            <circle cx="0" cy="0" fill="#8b5cf6" r="3" />
            <circle cx="50" cy="180" fill="#8b5cf6" r="3" />
            <circle cx="100" cy="180" fill="#8b5cf6" r="3" />
            <circle cx="150" cy="180" fill="#8b5cf6" r="3" />
            <circle cx="200" cy="180" fill="#8b5cf6" r="3" />
            <circle cx="250" cy="180" fill="#8b5cf6" r="3" />
            <circle cx="300" cy="180" fill="#8b5cf6" r="3" />
            <circle cx="350" cy="180" fill="#8b5cf6" r="3" />
            <circle cx="400" cy="180" fill="#8b5cf6" r="3" />
            <circle cx="450" cy="180" fill="#8b5cf6" r="3" />
            <circle cx="500" cy="180" fill="#8b5cf6" r="3" />
            <circle cx="550" cy="180" fill="#8b5cf6" r="3" />
            <circle cx="600" cy="180" fill="#8b5cf6" r="3" />
            <circle cx="650" cy="180" fill="#8b5cf6" r="3" />
            <circle cx="700" cy="180" fill="#8b5cf6" r="3" />
            <circle cx="750" cy="180" fill="#8b5cf6" r="3" />
          </svg>
          <div className="absolute left-8 right-0 bottom-0 h-6 flex justify-between text-[10px] text-gray-500 font-mono pt-2">
            <span>2026-01</span>
            <span>2026-02</span>
            <span>2026-03</span>
            <span>2026-04</span>
            <span>2026-05</span>
            <span>2026-06</span>
            <span>2026-07</span>
            <span>2026-08</span>
            <span>2026-09</span>
            <span>2026-10</span>
            <span>2026-11</span>
            <span>2026-12</span>
          </div>
        </div>
        <div className="flex items-center justify-center gap-2 mt-4">
          <div className="h-3 w-3 rounded-sm bg-accent-purple" />
          <span className="text-xs text-gray-400">Purchased tickets</span>
        </div>
      </div>

      <div className="rounded-xl border border-white/5 bg-surface-dark p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-bold text-white font-display">Chart Order Product</h3>
          <div className="relative">
            <select className="appearance-none bg-surface-darker border border-white/10 rounded px-3 py-1.5 pr-8 text-sm text-gray-300 focus:outline-none focus:border-primary">
              <option>This year</option>
              <option>Last year</option>
            </select>
            <span className="material-symbols-outlined absolute right-2 top-1.5 text-gray-500 text-sm pointer-events-none">
              expand_more
            </span>
          </div>
        </div>
        <div className="relative h-64 w-full rounded border border-white/5 p-4 flex items-end justify-between bg-[linear-gradient(to_right,#27272a_1px,transparent_1px),linear-gradient(to_bottom,#27272a_1px,transparent_1px)] bg-[size:40px_40px]">
          <div className="absolute left-0 top-0 bottom-8 w-8 flex flex-col justify-between text-[10px] text-gray-500 font-mono text-right pr-2">
            <span>1.0</span>
            <span>0.8</span>
            <span>0.6</span>
            <span>0.4</span>
            <span>0.2</span>
            <span>0.0</span>
            <span>-0.2</span>
            <span>-0.4</span>
          </div>
          <svg className="absolute left-8 right-0 top-0 bottom-8 h-full w-[calc(100%-2rem)] overflow-visible" preserveAspectRatio="none">
            <line stroke="#8b5cf6" strokeWidth="2" x1="0" x2="100%" y1="125" y2="125" />
            <circle cx="0%" cy="125" fill="#8b5cf6" r="3" />
            <circle cx="10%" cy="125" fill="#8b5cf6" r="3" />
            <circle cx="20%" cy="125" fill="#8b5cf6" r="3" />
            <circle cx="30%" cy="125" fill="#8b5cf6" r="3" />
            <circle cx="40%" cy="125" fill="#8b5cf6" r="3" />
            <circle cx="50%" cy="125" fill="#8b5cf6" r="3" />
            <circle cx="60%" cy="125" fill="#8b5cf6" r="3" />
            <circle cx="70%" cy="125" fill="#8b5cf6" r="3" />
            <circle cx="80%" cy="125" fill="#8b5cf6" r="3" />
            <circle cx="90%" cy="125" fill="#8b5cf6" r="3" />
            <circle cx="100%" cy="125" fill="#8b5cf6" r="3" />
          </svg>
          <div className="absolute left-8 right-0 bottom-0 h-6 flex justify-between text-[10px] text-gray-500 font-mono pt-2">
            <span>2026-01</span>
            <span>2026-02</span>
            <span>2026-03</span>
            <span>2026-04</span>
            <span>2026-05</span>
            <span>2026-06</span>
            <span>2026-07</span>
            <span>2026-08</span>
            <span>2026-09</span>
            <span>2026-10</span>
            <span>2026-11</span>
            <span>2026-12</span>
          </div>
        </div>
        <div className="flex items-center justify-center gap-2 mt-4">
          <div className="h-3 w-3 rounded-sm bg-accent-purple" />
          <span className="text-xs text-gray-400">Order Products</span>
        </div>
      </div>
    </AdminLayout>
  );
};

export default Dashboard;
