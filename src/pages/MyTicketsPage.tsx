import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

interface Ticket {
  id: string;
  month: string;
  day: number;
  dayOfWeek: string;
  time: string;
  type: string;
  category: string;
  location: string;
  isToday?: boolean;
}

export default function MyTicketsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'upcoming' | 'history'>('upcoming');

  type AppUserRow = { id: number; name: string; email: string };
  type ReservationRow = {
    id: string | number;
    selected_date: string;
    selected_time_slots: unknown;
    status: string;
    tickets?: { name: string } | Array<{ name: string }> | null;
  };

  const [upcomingTickets, setUpcomingTickets] = useState<Ticket[]>([]);
  const [historyTickets, setHistoryTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const todayIso = useMemo(() => {
    const now = new Date();
    const localMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return localMidnight.toISOString().slice(0, 10);
  }, []);

  const formatTime = (value: unknown) => {
    if (!value) return 'All Day';
    if (typeof value === 'object' && value && 'time_slot' in value) {
      const raw = (value as { time_slot?: unknown }).time_slot;
      return typeof raw === 'string' ? raw.slice(0, 5) : 'All Day';
    }
    return 'All Day';
  };

  useEffect(() => {
    const run = async () => {
      if (!supabase) {
        setUpcomingTickets([]);
        setHistoryTickets([]);
        setLoading(false);
        setErrorMessage('Supabase belum terkonfigurasi.');
        return;
      }

      if (!user?.email) {
        setUpcomingTickets([]);
        setHistoryTickets([]);
        setLoading(false);
        setErrorMessage(null);
        return;
      }

      try {
        setLoading(true);
        setErrorMessage(null);

        const { data: appUser, error: appUserError } = await supabase
          .from('users')
          .select('id,name,email')
          .eq('email', user.email)
          .maybeSingle();

        if (appUserError) throw appUserError;
        if (!appUser) {
          setUpcomingTickets([]);
          setHistoryTickets([]);
          setErrorMessage('Akun kamu belum terdaftar di database aplikasi.');
          return;
        }

        const { data: reservations, error: reservationsError } = await supabase
          .from('reservations')
          .select('id,selected_date,selected_time_slots,status,tickets(name)')
          .eq('user_id', (appUser as AppUserRow).id)
          .order('selected_date', { ascending: true });

        if (reservationsError) throw reservationsError;

        const rows = (reservations ?? []) as unknown as ReservationRow[];
        const mapped: Ticket[] = rows.map((row) => {
          const d = new Date(`${row.selected_date}T00:00:00`);
          const month = d.toLocaleString('en-US', { month: 'short' });
          const day = d.getDate();
          const dayOfWeek = d.toLocaleString('en-US', { weekday: 'long' });

          const ticketInfo = row.tickets ? (Array.isArray(row.tickets) ? row.tickets[0] ?? null : row.tickets) : null;

          return {
            id: String(row.id),
            month,
            day,
            dayOfWeek: row.selected_date === todayIso ? 'Today' : dayOfWeek,
            time: formatTime(row.selected_time_slots),
            type: row.status === 'pending' ? 'Reservation' : 'Entry Pass',
            category: ticketInfo?.name ?? 'Entrance Ticket',
            location: 'Spark Studio',
            isToday: row.selected_date === todayIso,
          };
        });

        const rowById = new Map(rows.map((r) => [String(r.id), r] as const));

        const upcomingSorted = mapped
          .filter((t) => {
            const row = rowById.get(t.id);
            if (!row) return false;
            return (row.status === 'pending' || row.status === 'confirmed') && row.selected_date >= todayIso;
          })
          .sort((a, b) => {
            const ad = rowById.get(a.id)?.selected_date ?? '';
            const bd = rowById.get(b.id)?.selected_date ?? '';
            return ad.localeCompare(bd);
          });

        const historySorted = mapped
          .filter((t) => {
            const row = rowById.get(t.id);
            if (!row) return false;
            return row.selected_date < todayIso || ['cancelled', 'expired'].includes(row.status);
          })
          .sort((a, b) => {
            const ad = rowById.get(a.id)?.selected_date ?? '';
            const bd = rowById.get(b.id)?.selected_date ?? '';
            return bd.localeCompare(ad);
          });

        setUpcomingTickets(upcomingSorted);
        setHistoryTickets(historySorted);
      } catch {
        setUpcomingTickets([]);
        setHistoryTickets([]);
        setErrorMessage('Gagal memuat tiket.');
      } finally {
        setLoading(false);
      }
    };

    void run();
  }, [todayIso, user?.email]);

  const handleViewQR = (ticketId: string) => {
    navigate('/booking-success', { state: { reservationId: ticketId } });
  };

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark flex flex-col">
      <main className="flex-grow w-full max-w-[1000px] mx-auto py-8 px-4 md:px-10 mt-24">
        {/* Breadcrumb */}
        <div className="mb-8">
          <div className="w-full flex gap-2 pb-4">
            <button onClick={() => navigate('/')} className="text-[#9c4949] dark:text-primary/70 text-sm font-medium hover:text-primary">
              Home
            </button>
            <span className="text-[#9c4949] text-sm">/</span>
            <button className="text-[#9c4949] dark:text-primary/70 text-sm font-medium hover:text-primary">
              Dashboard
            </button>
            <span className="text-[#9c4949] text-sm">/</span>
            <span className="text-[#1c0d0d] dark:text-white text-sm font-medium">My Tickets</span>
          </div>

          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-serif font-bold text-[#1c0d0d] dark:text-white tracking-tight mb-2">
                My Tickets
              </h1>
              <p className="text-[#5c4a4a] dark:text-[#a89898] font-medium">
                Manage and access your upcoming photo sessions
              </p>
            </div>

            {/* Tab Switcher */}
            <div className="flex gap-1 bg-white dark:bg-[#1c0d0d] p-1 rounded-lg border border-[#f4e7e7] dark:border-[#331a1a]">
              <button
                onClick={() => setActiveTab('upcoming')}
                className={`px-4 py-1.5 text-sm font-bold rounded shadow-sm transition-colors ${
                  activeTab === 'upcoming'
                    ? 'bg-primary text-white'
                    : 'text-[#9c4949] hover:bg-background-light dark:hover:bg-[#2a1616]'
                }`}
              >
                Upcoming
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`px-4 py-1.5 text-sm font-bold rounded shadow-sm transition-colors ${
                  activeTab === 'history'
                    ? 'bg-primary text-white'
                    : 'text-[#9c4949] hover:bg-background-light dark:hover:bg-[#2a1616]'
                }`}
              >
                History
              </button>
            </div>
          </div>
        </div>

        {/* Tickets List */}
        <div className="space-y-4">
          {activeTab === 'upcoming' ? (
            loading ? (
              <div className="text-center py-16">
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
                <p className="mt-4 text-gray-500 dark:text-gray-400 text-lg">Loading...</p>
              </div>
            ) : errorMessage ? (
              <div className="text-center py-16">
                <span className="material-symbols-outlined text-6xl text-gray-300 dark:text-gray-700 mb-4">error</span>
                <p className="text-gray-500 dark:text-gray-400 text-lg">{errorMessage}</p>
              </div>
            ) : upcomingTickets.length === 0 ? (
              <div className="text-center py-16">
                <span className="material-symbols-outlined text-6xl text-gray-300 dark:text-gray-700 mb-4">
                  confirmation_number
                </span>
                <p className="text-gray-500 dark:text-gray-400 text-lg">No upcoming tickets</p>
                <button
                  onClick={() => navigate('/calendar')}
                  className="mt-6 inline-flex items-center rounded-lg bg-primary px-6 py-3 text-sm font-bold text-white hover:bg-red-700 transition-colors"
                >
                  Book a session
                </button>
              </div>
            ) : (
              upcomingTickets.map((ticket) => (
              <div
                key={ticket.id}
                className={`group bg-white dark:bg-[#1c0d0d] rounded-xl p-6 border border-[#f4e7e7] dark:border-[#331a1a] shadow-sm hover:shadow-lg hover:border-primary/20 transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden ${
                  ticket.isToday ? 'pl-6 md:pl-6' : 'pl-6 md:pl-6'
                }`}
              >
                {/* Today Indicator */}
                {ticket.isToday && (
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary"></div>
                )}

                <div className="flex items-start gap-6 w-full md:w-auto">
                  {/* Date Box - Desktop */}
                  <div className="hidden md:flex flex-col items-center justify-center w-20 h-20 bg-background-light dark:bg-[#2a1616] rounded-lg border border-[#f4e7e7] dark:border-[#331a1a] text-center shrink-0">
                    <span className={`text-xs font-bold uppercase tracking-wide ${
                      ticket.isToday ? 'text-primary' : 'text-gray-500'
                    }`}>
                      {ticket.month}
                    </span>
                    <span className="text-2xl font-serif font-bold text-[#1c0d0d] dark:text-white leading-none mt-1">
                      {ticket.day}
                    </span>
                  </div>

                  {/* Ticket Info */}
                  <div className="flex flex-col justify-center h-full">
                    {/* Meta Info */}
                    <div className="flex items-center flex-wrap gap-3 mb-2">
                      <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-primary">
                        {ticket.type}
                      </span>
                      <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                      <span className="text-xs font-medium text-gray-500 font-mono tracking-wide">
                        #{ticket.id}
                      </span>
                      <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                      <span className="text-xs font-bold text-gray-700 dark:text-gray-300">
                        {ticket.category}
                      </span>
                    </div>

                    {/* Date & Time - Mobile */}
                    <div className="md:hidden flex items-center gap-2 mb-1 text-[#1c0d0d] dark:text-white font-serif font-bold text-xl">
                      <span>{ticket.month} {ticket.day}</span>
                      <span className="text-gray-300">•</span>
                      <span>{ticket.time}</span>
                    </div>

                    {/* Date & Time - Desktop */}
                    <div className="hidden md:block">
                      <h3 className="text-xl font-serif font-bold text-[#1c0d0d] dark:text-white mb-1">
                        {ticket.dayOfWeek}, {ticket.time}
                      </h3>
                    </div>

                    {/* Location */}
                    <div className="flex items-center gap-1 text-sm text-[#9c4949]">
                      <span className="material-symbols-outlined text-base">location_on</span>
                      <span>{ticket.location}</span>
                    </div>
                  </div>
                </div>

                {/* Action Button */}
                <div className="w-full md:w-auto flex justify-end">
                  <button
                    onClick={() => handleViewQR(ticket.id)}
                    className="w-full md:w-auto bg-primary text-white text-sm font-bold px-6 py-3 rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center gap-2 shadow-sm shadow-primary/20"
                  >
                    <span className="material-symbols-outlined text-lg">qr_code_scanner</span>
                    View QR
                  </button>
                </div>
              </div>
              ))
            )
          ) : (
            <div className="text-center py-16">
              <span className="material-symbols-outlined text-6xl text-gray-300 dark:text-gray-700 mb-4">
                history
              </span>
              <p className="text-gray-500 dark:text-gray-400 text-lg">
                {loading ? 'Loading...' : historyTickets.length === 0 ? 'No ticket history yet' : ''}
              </p>
              {!loading && historyTickets.length > 0 ? (
                <div className="mt-8 space-y-4 text-left">
                  {historyTickets.map((ticket) => (
                    <div
                      key={ticket.id}
                      className="bg-white dark:bg-[#1c0d0d] rounded-xl p-6 border border-[#f4e7e7] dark:border-[#331a1a] shadow-sm"
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <p className="text-sm font-bold text-primary">{ticket.category}</p>
                          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            {ticket.month} {ticket.day} • {ticket.time}
                          </p>
                        </div>
                        <button
                          onClick={() => handleViewQR(ticket.id)}
                          className="rounded-lg border border-primary/20 px-4 py-2 text-sm font-bold text-primary hover:bg-primary/5 transition-colors"
                        >
                          Details
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
