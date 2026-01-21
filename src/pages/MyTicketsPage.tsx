import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface PurchasedTicket {
  id: number;
  ticket_code: string;
  ticket_id: number;
  valid_date: string;
  time_slot: string | null;
  status: string;
  created_at: string;
  ticket: {
    name: string;
    type: string;
    description: string | null;
  };
}

interface PurchasedTicketRow {
  id: number;
  ticket_code: string;
  ticket_id: number;
  valid_date: string;
  time_slot: string | null;
  status: string;
  created_at: string;
  tickets?: {
    name: string;
    type: string;
    description?: string | null;
  } | { name: string; type: string; description?: string | null }[] | null;
}

export default function MyTicketsPage() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<'upcoming' | 'history'>('upcoming');
  const [tickets, setTickets] = useState<PurchasedTicket[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Wait for auth to finish loading
    if (authLoading) {
      return;
    }

    if (!user?.email) {
      setLoading(false);
      return;
    }

    // Reset loading state when user changes
    setLoading(true);

    const fetchTickets = async () => {
      try {
        // First get the user_id from public.users table based on email
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('id')
          .eq('email', user.email)
          .single();

        if (userError || !userData) {
          console.error('Error fetching user:', userError);
          setTickets([]);
          setLoading(false);
          return;
        }

        // Fetch purchased tickets with ticket details
        const { data: ticketsData, error: ticketsError } = await supabase
          .from('purchased_tickets')
          .select(`
            id,
            ticket_code,
            ticket_id,
            valid_date,
            time_slot,
            status,
            created_at,
            tickets:ticket_id (
              name,
              type,
              description
            )
          `)
          .eq('user_id', userData.id)
          .order('valid_date', { ascending: true });

        if (ticketsError) {
          console.error('Error fetching tickets:', ticketsError);
          setTickets([]);
        } else {
          // Transform the data to match our interface
          const transformedTickets = ((ticketsData as PurchasedTicketRow[] | null) || []).map((ticket) => {
            const ticketMeta = Array.isArray(ticket.tickets) ? ticket.tickets[0] : ticket.tickets;
            return {
              id: ticket.id,
              ticket_code: ticket.ticket_code,
              ticket_id: ticket.ticket_id,
              valid_date: ticket.valid_date,
              time_slot: ticket.time_slot,
              status: ticket.status,
              created_at: ticket.created_at,
              ticket: {
                name: ticketMeta?.name || 'Unknown Ticket',
                type: ticketMeta?.type || 'entrance',
                description: ticketMeta?.description || null,
              },
            };
          });
          setTickets(transformedTickets);
        }
      } catch (error) {
        console.error('Error in fetchTickets:', error);
        setTickets([]);
      } finally {
        setLoading(false);
      }
    };

    fetchTickets();

    // Subscribe to changes in purchased_tickets
    const subscription = supabase
      .channel('my_tickets_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'purchased_tickets' }, () => {
        fetchTickets();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user?.id, user?.email, authLoading]);

  // Filter tickets based on active tab
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const upcomingTickets = tickets.filter((ticket) => {
    const ticketDate = new Date(ticket.valid_date);
    ticketDate.setHours(0, 0, 0, 0);
    return ticketDate >= today && ticket.status === 'active';
  });

  const historyTickets = tickets.filter((ticket) => {
    const ticketDate = new Date(ticket.valid_date);
    ticketDate.setHours(0, 0, 0, 0);
    return ticketDate < today || ticket.status !== 'active';
  });

  const displayTickets = activeTab === 'upcoming' ? upcomingTickets : historyTickets;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const month = date.toLocaleDateString('en-US', { month: 'short' });
    const day = date.getDate();
    const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'long' });

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const ticketDate = new Date(dateString);
    ticketDate.setHours(0, 0, 0, 0);
    const isToday = ticketDate.getTime() === today.getTime();

    return { month, day, dayOfWeek: isToday ? 'Today' : dayOfWeek, isToday };
  };

  const handleViewQR = (ticketCode: string) => {
    navigate('/booking-success', { state: { ticketCode } });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background-light dark:bg-background-dark flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-500 dark:text-gray-400">Loading your tickets...</p>
        </div>
      </div>
    );
  }

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
                className={`px-4 py-1.5 text-sm font-bold rounded shadow-sm transition-colors ${activeTab === 'upcoming'
                    ? 'bg-primary text-white'
                    : 'text-[#9c4949] hover:bg-background-light dark:hover:bg-[#2a1616]'
                  }`}
              >
                Upcoming
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`px-4 py-1.5 text-sm font-bold rounded shadow-sm transition-colors ${activeTab === 'history'
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
          {displayTickets.length > 0 ? (
            displayTickets.map((ticket) => {
              const { month, day, dayOfWeek, isToday } = formatDate(ticket.valid_date);
              const timeDisplay = ticket.time_slot || 'All Day';

              return (
                <div
                  key={ticket.id}
                  className={`group bg-white dark:bg-[#1c0d0d] rounded-xl p-6 border border-[#f4e7e7] dark:border-[#331a1a] shadow-sm hover:shadow-lg hover:border-primary/20 transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden ${isToday ? 'pl-6 md:pl-6' : 'pl-6 md:pl-6'
                    }`}
                >
                  {/* Today Indicator */}
                  {isToday && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary"></div>
                  )}

                  <div className="flex items-start gap-6 w-full md:w-auto">
                    {/* Date Box - Desktop */}
                    <div className="hidden md:flex flex-col items-center justify-center w-20 h-20 bg-background-light dark:bg-[#2a1616] rounded-lg border border-[#f4e7e7] dark:border-[#331a1a] text-center shrink-0">
                      <span className={`text-xs font-bold uppercase tracking-wide ${isToday ? 'text-primary' : 'text-gray-500'
                        }`}>
                        {month}
                      </span>
                      <span className="text-2xl font-serif font-bold text-[#1c0d0d] dark:text-white leading-none mt-1">
                        {day}
                      </span>
                    </div>

                    {/* Ticket Info */}
                    <div className="flex flex-col justify-center h-full">
                      {/* Meta Info */}
                      <div className="flex items-center flex-wrap gap-3 mb-2">
                        <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-primary">
                          {ticket.ticket.type === 'entrance' ? 'Entry Pass' : 'Stage Pass'}
                        </span>
                        <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                        <span className="text-xs font-medium text-gray-500 font-mono tracking-wide">
                          #{ticket.ticket_code}
                        </span>
                        <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                        <span className="text-xs font-bold text-gray-700 dark:text-gray-300">
                          {ticket.ticket.name}
                        </span>
                      </div>

                      {/* Date & Time - Mobile */}
                      <div className="md:hidden flex items-center gap-2 mb-1 text-[#1c0d0d] dark:text-white font-serif font-bold text-xl">
                        <span>{month} {day}</span>
                        <span className="text-gray-300">•</span>
                        <span>{timeDisplay}</span>
                      </div>

                      {/* Date & Time - Desktop */}
                      <div className="hidden md:block">
                        <h3 className="text-xl font-serif font-bold text-[#1c0d0d] dark:text-white mb-1">
                          {dayOfWeek}, {timeDisplay}
                        </h3>
                      </div>

                      {/* Description/Location */}
                      {ticket.ticket.description && (
                        <div className="flex items-center gap-1 text-sm text-[#9c4949]">
                          <span className="material-symbols-outlined text-base">location_on</span>
                          <span>{ticket.ticket.description}</span>
                        </div>
                      )}

                      {/* Status Badge */}
                      {ticket.status !== 'active' && (
                        <div className="mt-2">
                          <span className={`inline-block px-2 py-1 text-xs font-bold rounded ${ticket.status === 'used' ? 'bg-green-100 text-green-700' :
                              ticket.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                                'bg-gray-100 text-gray-700'
                            }`}>
                            {ticket.status.toUpperCase()}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Action Button */}
                  <div className="w-full md:w-auto flex justify-end">
                    <button
                      onClick={() => handleViewQR(ticket.ticket_code)}
                      className="w-full md:w-auto bg-primary text-white text-sm font-bold px-6 py-3 rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center gap-2 shadow-sm shadow-primary/20"
                      disabled={ticket.status !== 'active'}
                    >
                      <span className="material-symbols-outlined text-lg">qr_code_scanner</span>
                      View QR
                    </button>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-16">
              <span className="material-symbols-outlined text-6xl text-gray-300 dark:text-gray-700 mb-4">
                {activeTab === 'upcoming' ? 'confirmation_number' : 'history'}
              </span>
              <p className="text-gray-500 dark:text-gray-400 text-lg mb-2">
                {activeTab === 'upcoming' ? 'No upcoming tickets' : 'No ticket history yet'}
              </p>
              <p className="text-gray-400 dark:text-gray-500 text-sm">
                {activeTab === 'upcoming'
                  ? 'Book a ticket to see it here'
                  : 'Your past tickets will appear here'}
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
