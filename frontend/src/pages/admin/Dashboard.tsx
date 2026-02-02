import { useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import AdminLayout from '../../components/AdminLayout';
import { ADMIN_MENU_ITEMS, ADMIN_MENU_SECTIONS } from '../../constants/adminMenu';
import { useDashboardStats } from '../../hooks/useDashboardStats';
import DashboardStatSkeleton from '../../components/skeletons/DashboardStatSkeleton';
import { useToast } from '../../components/Toast';
import { LazyMotion, m } from 'framer-motion';

const TAB_RETURN_EVENT = 'tab-returned-from-idle';

const Dashboard = () => {
  const { user, signOut } = useAuth();
  const { showToast } = useToast();
  const { data: stats, error, isLoading, refetch } = useDashboardStats();

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
    if (error) {
      showToast('error', error instanceof Error ? error.message : 'Failed to load dashboard');
    }
  }, [error, showToast]);

  const getUserInitials = () => {
    if (!user?.email) return 'A';
    return user.email.charAt(0).toUpperCase();
  };

  return (
    <AdminLayout
      menuItems={ADMIN_MENU_ITEMS}
      menuSections={ADMIN_MENU_SECTIONS}
      defaultActiveMenuId="dashboard"
      title="Dashboard"
      onLogout={signOut}
    >
      {/* Welcome Card */}
      <div className="rounded-xl border border-gray-200 bg-white p-4 md:p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4 min-w-0">
          <div className="h-12 w-12 rounded-full bg-gray-900 flex items-center justify-center text-lg font-bold text-white flex-shrink-0">
            {getUserInitials()}
          </div>
          <div className="min-w-0">
            <h3 className="text-lg font-black text-gray-900 truncate">Selamat Datang Kembali</h3>
            <p className="text-sm text-gray-500 truncate">Panel Admin Spark</p>
          </div>
        </div>
        <button
          onClick={signOut}
          className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-bold hover:bg-gray-50 transition-colors w-full sm:w-auto justify-center"
        >
          <span className="material-symbols-outlined text-sm text-gray-700">logout</span>
          Keluar
        </button>
      </div>

      <LazyMotion features={() => import('framer-motion').then((mod) => mod.domAnimation)}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {isLoading
            ? Array.from({ length: 4 }).map((_, index) => <DashboardStatSkeleton key={`ticket-${index}`} />)
            : [
              { label: 'Total tiket terjual', value: stats?.totalPurchasedTickets ?? 0 },
              { label: 'Total sudah masuk', value: stats?.totalEntered ?? 0 },
              { label: 'Total tidak datang', value: stats?.totalNoShow ?? 0 },
              { label: 'Total sudah tukar hadiah', value: stats?.totalGiftsExchanged ?? 0 },
            ].map((item, index) => (
              <m.div
                key={item.label}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.05 }}
                className="rounded-xl border border-gray-200 bg-white p-5"
              >
                <p className="text-sm text-gray-500 mb-1">{item.label}</p>
                <p className="text-3xl font-black text-gray-900">{item.value}</p>
              </m.div>
            ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {isLoading
            ? Array.from({ length: 4 }).map((_, index) => <DashboardStatSkeleton key={`order-${index}`} />)
            : [
              { label: 'Total Pesanan', value: stats?.totalOrders ?? 0 },
              { label: 'Pesanan Pending', value: stats?.pendingOrders ?? 0 },
              { label: 'Pesanan Lunas', value: stats?.paidOrders ?? 0 },
              { label: 'Pesanan Diproses', value: stats?.processingOrders ?? 0 },
            ].map((item, index) => (
              <m.div
                key={item.label}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.05 }}
                className="rounded-xl border border-gray-200 bg-white p-5"
              >
                <p className="text-sm text-gray-500 mb-1">{item.label}</p>
                <p className="text-3xl font-black text-gray-900">{item.value}</p>
              </m.div>
            ))}
        </div>
      </LazyMotion>

      {/* QR Scanner Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-3 rounded-xl border border-gray-200 bg-white p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-black text-gray-900 font-serif">Pemindai Toko</h3>
            <span className="px-2 py-1 rounded bg-green-50 text-green-700 text-xs font-bold border border-green-100">
              Siap Memindai
            </span>
          </div>
          <div className="border-2 border-dashed border-gray-200 rounded-xl bg-gray-50 p-12 flex flex-col items-center justify-center text-center hover:border-main-500/60 transition-colors cursor-pointer group">
            <div className="h-16 w-16 rounded-full bg-white border border-gray-200 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <span className="material-symbols-outlined text-3xl text-main-500">qr_code_scanner</span>
            </div>
            <h4 className="text-lg font-black text-gray-900 mb-2">Pindai Kode QR</h4>
            <p className="text-sm text-gray-500 max-w-sm">
              Letakkan kode QR tiket di depan kamera atau klik di sini untuk memasukkan ID tiket secara manual.
            </p>
            <button className="mt-6 px-4 py-2 bg-main-500 text-gray-900 text-sm font-black rounded hover:bg-main-600 transition-colors">
              Aktifkan Kamera
            </button>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="rounded-xl border border-gray-200 bg-white p-4 md:p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <h3 className="text-lg font-black text-gray-900 font-serif">Grafik Tiket Terjual</h3>
          <div className="relative w-full sm:w-auto">
            <select className="appearance-none bg-white border border-gray-200 rounded px-3 py-2 pr-8 text-sm text-gray-900 focus:outline-none focus:border-main-500 w-full sm:w-auto">
              <option>Tahun ini</option>
              <option>Tahun lalu</option>
            </select>
            <span className="material-symbols-outlined absolute right-2 top-1.5 text-gray-500 text-sm pointer-events-none">
              expand_more
            </span>
          </div>
        </div>
        <div className="overflow-x-auto -mx-4 md:mx-0 px-4 md:px-0">
          <div className="relative h-64 min-w-[600px] md:min-w-0 md:w-full rounded border border-gray-200 p-4 flex items-end justify-between bg-[linear-gradient(to_right,#e5e7eb_1px,transparent_1px),linear-gradient(to_bottom,#e5e7eb_1px,transparent_1px)] bg-[size:40px_40px]">
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
        </div>
        <div className="flex items-center justify-center gap-2 mt-4">
          <div className="h-3 w-3 rounded-sm bg-accent-purple" />
          <span className="text-xs text-gray-600">Tiket terjual</span>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4 md:p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <h3 className="text-lg font-black text-gray-900 font-serif">Grafik Pesanan Produk</h3>
          <div className="relative w-full sm:w-auto">
            <select className="appearance-none bg-white border border-gray-200 rounded px-3 py-2 pr-8 text-sm text-gray-900 focus:outline-none focus:border-main-500 w-full sm:w-auto">
              <option>Tahun ini</option>
              <option>Tahun lalu</option>
            </select>
            <span className="material-symbols-outlined absolute right-2 top-1.5 text-gray-500 text-sm pointer-events-none">
              expand_more
            </span>
          </div>
        </div>
        <div className="overflow-x-auto -mx-4 md:mx-0 px-4 md:px-0">
          <div className="relative h-64 min-w-[600px] md:min-w-0 md:w-full rounded border border-gray-200 p-4 flex items-end justify-between bg-[linear-gradient(to_right,#e5e7eb_1px,transparent_1px),linear-gradient(to_bottom,#e5e7eb_1px,transparent_1px)] bg-[size:40px_40px]">
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
        </div>
        <div className="flex items-center justify-center gap-2 mt-4">
          <div className="h-3 w-3 rounded-sm bg-accent-purple" />
          <span className="text-xs text-gray-600">Pesanan Produk</span>
        </div>
      </div>
    </AdminLayout>
  );
};

export default Dashboard;
