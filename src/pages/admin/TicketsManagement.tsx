import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import AdminLayout from '../../components/AdminLayout';
import AvailabilityGenerator from '../../components/admin/AvailabilityGenerator';
import PurchasedTicketsTable from '../../components/admin/PurchasedTicketsTable';
import { ADMIN_MENU_ITEMS, ADMIN_MENU_SECTIONS } from '../../constants/adminMenu';

type PurchasedTicket = {
  id: string;
  ticket_id: string;
  user_id: string;
  purchase_date: string;
  entry_status: 'entered' | 'not_yet' | 'invalid';
  qr_code: string;
  status: 'active' | 'used' | 'cancelled' | 'expired';
  valid_date: string;
  used_at?: string | null;
  users: {
    name: string;
    email: string;
  };
  tickets: {
    name: string;
  };
};

type PurchasedTicketRow = {
  id: string | number;
  ticket_id: string | number;
  user_id: string | number;
  created_at: string | null;
  status: 'active' | 'used' | 'cancelled' | 'expired';
  used_at: string | null;
  ticket_code: string;
  valid_date: string;
  users: { name: string; email: string };
  tickets: { name: string };
};

const TicketsManagement = () => {
  const { signOut } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('used'); // Default to 'used' (scanned tickets)
  const [eventFilter, setEventFilter] = useState('');
  const [tickets, setTickets] = useState<PurchasedTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalValid: 0,
    entered: 0,
  });

  const fetchTickets = useCallback(async () => {
    try {
      setLoading(true);

      const { data: ticketsData, error } = await supabase
        .from('purchased_tickets')
        .select(
          `
          id,
          ticket_id,
          user_id,
          created_at,
          status,
          used_at,
          ticket_code,
          valid_date,
          users!inner(name, email),
          tickets!inner(name)
        `
        )
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      const rows = (ticketsData || []) as unknown as PurchasedTicketRow[];
      const mapped: PurchasedTicket[] = rows.map((row) => {
        const entry_status: PurchasedTicket['entry_status'] =
          row.status === 'used' ? 'entered' : row.status === 'active' ? 'not_yet' : 'invalid';

        return {
          id: String(row.id),
          ticket_id: String(row.ticket_id),
          user_id: String(row.user_id),
          purchase_date: row.created_at || new Date().toISOString(),
          entry_status,
          qr_code: row.ticket_code,
          status: row.status,
          valid_date: row.valid_date,
          used_at: row.used_at,
          users: row.users,
          tickets: row.tickets,
        };
      });

      setTickets(mapped);

      const totalValid = mapped.length;
      const entered = mapped.filter((t) => t.status === 'used').length;

      setStats({ totalValid, entered });
    } catch (error) {
      console.error('Error fetching tickets:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

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
      {/* Info Banner */}
      <div className="rounded-xl border border-blue-200 bg-blue-50 dark:border-blue-900/30 dark:bg-blue-900/20 p-4 mb-6">
        <div className="flex items-start gap-3">
          <span className="material-symbols-outlined text-blue-600 dark:text-blue-400 flex-shrink-0">info</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-blue-800 dark:text-blue-200 font-medium mb-1">
              Halaman ini menampilkan tiket yang sudah dipindai di pintu masuk
            </p>
            <p className="text-xs text-blue-700 dark:text-blue-300">
              Filter default menampilkan hanya tiket yang sudah dipindai. Ubah filter ke "Semua Tiket" untuk melihat tiket yang belum dipindai.
            </p>
          </div>
        </div>
      </div>

      {/* Availability Generator Section */}
      <section className="mb-8">
        <AvailabilityGenerator onSuccess={fetchTickets} />
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
        <PurchasedTicketsTable
          tickets={filteredTickets}
          loading={loading}
          stats={stats}
        />
      </section>
    </AdminLayout>
  );
};

export default TicketsManagement;
