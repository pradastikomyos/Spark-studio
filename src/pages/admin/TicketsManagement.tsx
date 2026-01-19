import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import AdminLayout from '../../components/AdminLayout';
import QRScannerModal from '../../components/admin/QRScannerModal';
import { ADMIN_MENU_ITEMS } from '../../constants/adminMenu';
import { getTicketStatusBadge } from '../../utils/statusHelpers.tsx';

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
  const { signOut, user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [eventFilter, setEventFilter] = useState('');
  const [showScanner, setShowScanner] = useState(false);
  const [tickets, setTickets] = useState<PurchasedTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [validating, setValidating] = useState(false);
  const [validationBanner, setValidationBanner] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);
  const [stats, setStats] = useState({
    totalValid: 0,
    entered: 0,
  });

  const fetchTickets = useCallback(async () => {
    try {
      setLoading(true);

      // Fetch purchased tickets with user and ticket info
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

      // Calculate stats
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

  const getStatusLabel = (status: string) => {
    const labels = {
      entered: 'Already Entered',
      not_yet: 'Not Yet Entered',
      invalid: 'Invalid',
    };
    return labels[status as keyof typeof labels] || status;
  };

  const validateTicket = useCallback(
    async (rawCode: string) => {
      const code = rawCode.trim();
      if (!code || validating) return;

      setValidating(true);
      setValidationBanner(null);

      try {
        const { data, error } = await supabase
          .from('purchased_tickets')
          .select('id, ticket_code, status, valid_date, used_at')
          .eq('ticket_code', code)
          .maybeSingle();

        if (error) throw error;
        if (!data) {
          setValidationBanner({ type: 'error', message: 'Ticket code not found.' });
          return;
        }

        if (data.status !== 'active') {
          setValidationBanner({
            type: 'error',
            message: data.status === 'used' ? 'Ticket already used.' : `Ticket is ${data.status}.`,
          });
          return;
        }

        const today = new Date();
        const todayIso = new Date(today.getFullYear(), today.getMonth(), today.getDate())
          .toISOString()
          .slice(0, 10);

        if (data.valid_date < todayIso) {
          setValidationBanner({ type: 'error', message: 'Ticket expired.' });
          return;
        }

        const { error: updateError } = await supabase
          .from('purchased_tickets')
          .update({
            status: 'used',
            used_at: new Date().toISOString(),
            scanned_by: user?.email ?? null,
          })
          .eq('id', data.id)
          .eq('status', 'active');

        if (updateError) throw updateError;

        setValidationBanner({ type: 'success', message: 'Ticket validated. Entry allowed.' });
        await fetchTickets();
      } catch {
        setValidationBanner({ type: 'error', message: 'Validation failed.' });
      } finally {
        setValidating(false);
        setTimeout(() => setValidationBanner(null), 3000);
      }
    },
    [fetchTickets, user?.email, validating]
  );

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
      (statusFilter === 'entered' && ticket.entry_status === 'entered') ||
      (statusFilter === 'not_yet' && ticket.entry_status === 'not_yet') ||
      (statusFilter === 'cancelled' && ticket.status === 'cancelled');

    const matchesEvent = eventFilter === '' || eventFilter === 'all' || ticket.tickets.name.toLowerCase().includes(eventFilter);

    return matchesSearch && matchesStatus && matchesEvent;
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <AdminLayout
      menuItems={ADMIN_MENU_ITEMS.map(item => 
        item.id === 'events' ? { ...item, filled: true } : item
      )}
      defaultActiveMenuId="events"
      title="Tickets Management"
      subtitle="Manage entrance scanning and view ticket status."
      headerActions={
        <>
          <button className="flex items-center justify-center gap-2 rounded-lg bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 px-4 py-2.5 text-sm font-bold text-neutral-900 dark:text-white hover:bg-gray-50 dark:hover:bg-white/10 transition-colors shadow-sm">
            <span className="material-symbols-outlined text-[20px]">download</span>
            <span>Export CSV</span>
          </button>
          <button
            onClick={() => setShowScanner(true)}
            className="flex items-center justify-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-sm font-bold text-white shadow-lg hover:bg-red-700 transition-colors ring-4 ring-primary/20"
          >
            <span className="material-symbols-outlined text-[20px]">qr_code_scanner</span>
            <span>Scan QR Ticket</span>
          </button>
        </>
      }
      onLogout={signOut}
    >
      <section className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="md:col-span-2 relative">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <span className="material-symbols-outlined text-gray-400">search</span>
          </div>
          <input
            className="block w-full rounded-lg border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1a0f0f] py-3 pl-10 pr-3 text-sm text-gray-900 dark:text-white placeholder-gray-500 focus:border-primary focus:ring-primary shadow-sm"
            placeholder="Search by Order ID, Customer Name..."
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
            <option value="">Filter by Status</option>
            <option value="all">All Statuses</option>
            <option value="entered">Already Entered</option>
            <option value="not_yet">Not Yet Entered</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
        <div className="relative">
          <select
            className="block w-full rounded-lg border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1a0f0f] py-3 pl-3 pr-10 text-sm text-gray-900 dark:text-white focus:border-primary focus:ring-primary shadow-sm font-sans"
            value={eventFilter}
            onChange={(e) => setEventFilter(e.target.value)}
          >
            <option value="">Filter by Event</option>
            <option value="all">All Events</option>
            <option value="gala">Annual Gala</option>
            <option value="workshop">Photo Workshop</option>
          </select>
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-lg font-bold text-neutral-900 dark:text-white">Purchased Tickets</h3>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
              Total Valid Tickets: <span className="text-neutral-900 dark:text-white font-bold">{stats.totalValid}</span>
            </span>
            <span className="h-4 w-px bg-gray-300 dark:bg-gray-700 mx-2"></span>
            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
              Entered: <span className="text-primary font-bold">{stats.entered}</span>
            </span>
          </div>
        </div>

        {validationBanner && (
          <div
            className={`rounded-lg border px-4 py-3 text-sm font-medium ${
              validationBanner.type === 'success'
                ? 'border-green-200 bg-green-50 text-green-800 dark:border-green-900/30 dark:bg-green-900/20 dark:text-green-200'
                : 'border-red-200 bg-red-50 text-red-800 dark:border-red-900/30 dark:bg-red-900/20 dark:text-red-200'
            }`}
          >
            {validationBanner.message}
          </div>
        )}

        <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#1a0f0f] shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-white/5">
                  <th className="whitespace-nowrap px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Ticket ID</th>
                  <th className="whitespace-nowrap px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Customer Name</th>
                  <th className="whitespace-nowrap px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Event</th>
                  <th className="whitespace-nowrap px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Purchase Date</th>
                  <th className="whitespace-nowrap px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 text-center">Entry Status</th>
                  <th className="whitespace-nowrap px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-white/5 font-sans">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                      Loading tickets...
                    </td>
                  </tr>
                ) : filteredTickets.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                      No tickets found
                    </td>
                  </tr>
                ) : (
                  filteredTickets.map((ticket) => (
                    <tr key={ticket.id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors group">
                      <td className="whitespace-nowrap px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-gray-400 text-lg">confirmation_number</span>
                          <span className="text-sm font-medium text-primary">{ticket.qr_code || ticket.id.slice(0, 8)}</span>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                            {ticket.users.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                          </div>
                          <div>
                            <span className="block text-sm font-semibold text-neutral-900 dark:text-white">{ticket.users.name}</span>
                            <span className="block text-xs text-gray-500">{ticket.users.email}</span>
                          </div>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-neutral-900 dark:text-white">{ticket.tickets.name}</td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500 dark:text-gray-400">{formatDate(ticket.purchase_date)}</td>
                      <td className="whitespace-nowrap px-6 py-4 text-center">{getTicketStatusBadge(ticket.entry_status, getStatusLabel(ticket.entry_status))}</td>
                      <td className="whitespace-nowrap px-6 py-4 text-right">
                        <button className="text-gray-400 hover:text-primary transition-colors">
                          <span className="material-symbols-outlined text-[20px]">more_vert</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between border-t border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-white/5 px-6 py-4">
            <span className="text-sm text-gray-500 dark:text-gray-400 font-sans">Showing {filteredTickets.length} tickets</span>
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

      <QRScannerModal 
        isOpen={showScanner} 
        onClose={() => setShowScanner(false)}
        title="Scan QR Ticket"
        autoResumeAfterMs={3000}
        onScan={async (decodedText) => {
          await validateTicket(decodedText);
        }}
      />
    </AdminLayout>
  );
};

export default TicketsManagement;
