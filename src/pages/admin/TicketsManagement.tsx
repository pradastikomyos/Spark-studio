import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import AdminLayout from '../../components/AdminLayout';
import AvailabilityGenerator from '../../components/admin/AvailabilityGenerator';
import PurchasedTicketsTable from '../../components/admin/PurchasedTicketsTable';
import { ADMIN_MENU_ITEMS, ADMIN_MENU_SECTIONS } from '../../constants/adminMenu';
import { useTicketsManagement } from '../../hooks/useTicketsManagement';
import TableRowSkeleton from '../../components/skeletons/TableRowSkeleton';
import { useToast } from '../../components/Toast';

const TAB_RETURN_EVENT = 'tab-returned-from-idle';

const TicketsManagement = () => {
  const { signOut } = useAuth();
  const { showToast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('used'); // Default to 'used' (scanned tickets)
  const [eventFilter, setEventFilter] = useState('');
  const { data, error, isLoading, isValidating, mutate } = useTicketsManagement();
  const tickets = data?.tickets ?? [];
  const stats = data?.stats ?? { totalValid: 0, entered: 0 };

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleTabReturn = () => {
      mutate();
    };

    window.addEventListener(TAB_RETURN_EVENT, handleTabReturn);
    return () => {
      window.removeEventListener(TAB_RETURN_EVENT, handleTabReturn);
    };
  }, [mutate]);

  useEffect(() => {
    if (error) {
      showToast('error', error instanceof Error ? error.message : 'Failed to load tickets');
    }
  }, [error, showToast]);
  const normalizedSearch = searchQuery.trim().toLowerCase();
  const filteredTickets = tickets.filter((ticket) => {
    const matchesSearch =
      normalizedSearch === '' ||
      [ticket.qr_code, ticket.users.name, ticket.users.email, ticket.tickets.name]
        .filter(Boolean)
        .some((v) => v.toLowerCase().includes(normalizedSearch));

    const matchesStatus =
      statusFilter === '' ||
      statusFilter === 'all' ||
      (statusFilter === 'used' && ticket.status === 'used') ||
      (statusFilter === 'active' && ticket.status === 'active') ||
      (statusFilter === 'cancelled' && ticket.status === 'cancelled');

    const matchesEvent = eventFilter === '' || eventFilter === 'all' || ticket.tickets.name.toLowerCase().includes(eventFilter);

    return matchesSearch && matchesStatus && matchesEvent;
  });

  return (
    <AdminLayout
      menuItems={ADMIN_MENU_ITEMS}
      menuSections={ADMIN_MENU_SECTIONS}
      defaultActiveMenuId="entrance-log"
      title="Log Tiket Masuk"
      onLogout={signOut}
    >
      {/* Info Banner with Refresh Button */}
      <div className="rounded-xl border border-blue-200 bg-blue-50 dark:border-blue-900/30 dark:bg-blue-900/20 p-4 mb-6">
        <div className="flex items-start gap-3">
          <span className="material-symbols-outlined text-blue-600 dark:text-blue-400 flex-shrink-0">info</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-blue-800 dark:text-blue-200 font-medium mb-1">
              Halaman ini menampilkan tiket yang sudah dipindai di pintu masuk
            </p>
            <p className="text-xs text-blue-700 dark:text-blue-300">
              Filter default menampilkan hanya tiket yang sudah dipindai. Data diperbarui secara otomatis saat ada perubahan.
            </p>
          </div>
          <button
            onClick={() => mutate()}
            disabled={isValidating}
            className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-colors disabled:opacity-50 flex-shrink-0"
          >
            <span className={`material-symbols-outlined text-sm ${isValidating ? 'animate-spin' : ''}`}>
              {isValidating ? 'progress_activity' : 'refresh'}
            </span>
            Refresh
          </button>
        </div>
      </div>

      {/* Availability Generator Section */}
      <section className="mb-8">
        <AvailabilityGenerator onSuccess={() => mutate()} />
      </section>

      {/* Filters Section */}
      <section className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="md:col-span-2 relative">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <span className="material-symbols-outlined text-gray-400">search</span>
          </div>
          <input
            className="block w-full rounded-lg border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1a0f0f] py-3 pl-10 pr-3 text-sm text-gray-900 dark:text-white placeholder-gray-500 focus:border-primary focus:ring-primary shadow-sm"
            placeholder="Cari berdasarkan ID Pesanan, Nama Pelanggan..."
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="relative">
          <select
            className="block w-full rounded-lg border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1a0f0f] py-3 pl-3 pr-10 text-sm text-gray-900 dark:text-white focus:border-primary focus:ring-primary shadow-sm font-sans"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="used">Hanya yang Sudah Discan (Default)</option>
            <option value="all">Semua Tiket</option>
            <option value="active">Belum Discan</option>
            <option value="cancelled">Dibatalkan</option>
          </select>
        </div>
        <div className="relative">
          <select
            className="block w-full rounded-lg border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1a0f0f] py-3 pl-3 pr-10 text-sm text-gray-900 dark:text-white focus:border-primary focus:ring-primary shadow-sm font-sans"
            value={eventFilter}
            onChange={(e) => setEventFilter(e.target.value)}
          >
            <option value="">Filter berdasarkan Event</option>
            <option value="all">Semua Event</option>
            <option value="gala">Annual Gala</option>
            <option value="workshop">Photo Workshop</option>
          </select>
        </div>
      </section>

      {/* Purchased Tickets Table */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-bold text-white">
            {statusFilter === 'used' ? 'Tiket yang Sudah Discan' : 
             statusFilter === 'active' ? 'Tiket Belum Discan' : 
             'Semua Tiket'}
          </h3>
          <div className="text-sm text-gray-400">
            Menampilkan {filteredTickets.length} dari {tickets.length} tiket
          </div>
        </div>
        {isLoading ? (
          <div className="w-full overflow-hidden rounded-xl border border-white/5 bg-surface-dark">
            <table className="w-full">
              <tbody>
                <TableRowSkeleton columns={6} />
                <TableRowSkeleton columns={6} />
                <TableRowSkeleton columns={6} />
              </tbody>
            </table>
          </div>
        ) : (
          <PurchasedTicketsTable tickets={filteredTickets} loading={false} stats={stats} />
        )}
      </section>
    </AdminLayout>
  );
};

export default TicketsManagement;
