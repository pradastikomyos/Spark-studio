import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import TicketCard from './TicketCard';
import { TicketData } from '../types';
import { addDays, createWIBDate, todayWIB, toLocalDateString } from '../utils/timezone';

interface TicketWithDate {
  ticket: TicketData;
  date: Date;
  isToday: boolean;
}

const TicketSection = () => {
  const navigate = useNavigate();
  const [ticketsWithDates, setTicketsWithDates] = useState<TicketWithDate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTickets = async () => {
      try {
        const { data, error } = await supabase
          .from('tickets')
          .select('*')
          .eq('is_active', true)
          .order('type', { ascending: true })
          .limit(1); // Get first active ticket

        if (error) {
          console.error('Error fetching tickets:', error);
          setLoading(false);
          return;
        }

        if (data && data.length > 0) {
          const ticket = data[0];
          const today = todayWIB();
          const todayDateString = toLocalDateString(today);

          const lookaheadEndDateString = toLocalDateString(addDays(today, 14));

          const { data: availabilityRows, error: availabilityError } = await supabase
            .from('ticket_availabilities')
            .select('date,total_capacity,reserved_capacity,sold_capacity')
            .eq('ticket_id', ticket.id)
            .gte('date', todayDateString)
            .lte('date', lookaheadEndDateString)
            .order('date', { ascending: true });

          if (availabilityError) {
            console.error('Error fetching ticket availability:', availabilityError);
          }

          const availableDateStrings = new Set<string>();

          (availabilityRows || []).forEach((row) => {
            const availableCapacity = row.total_capacity - row.reserved_capacity - row.sold_capacity;
            if (availableCapacity > 0) availableDateStrings.add(row.date);
          });

          const sortedAvailableDateStrings = Array.from(availableDateStrings).sort().slice(0, 4);

          let ticketDates: TicketWithDate[] = sortedAvailableDateStrings.map((dateString) => ({
            ticket,
            date: createWIBDate(dateString),
            isToday: dateString === todayDateString,
          }));

          if (ticketDates.length === 0) {
            const extractDateOnly = (value: string) => value.split('T')[0].split(' ')[0];
            const ticketFromDate = extractDateOnly(ticket.available_from);
            const ticketUntilDate = extractDateOnly(ticket.available_until);

            const startDate = createWIBDate(ticketFromDate);
            const endDate = createWIBDate(ticketUntilDate);

            const currentDate = today >= startDate ? new Date(today) : new Date(startDate);
            let count = 0;

            while (count < 4 && currentDate <= endDate) {
              const dateString = toLocalDateString(currentDate);
              ticketDates.push({
                ticket,
                date: createWIBDate(dateString),
                isToday: dateString === todayDateString,
              });
              currentDate.setDate(currentDate.getDate() + 1);
              count++;
            }
          }

          setTicketsWithDates(ticketDates);
        }
      } catch (err) {
        console.error('Error in fetchTickets:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchTickets();

    // Subscribe to changes
    const subscription = supabase
      .channel('tickets_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tickets' }, () => {
        fetchTickets();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ticket_availabilities' }, () => {
        fetchTickets();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  if (loading) {
    return (
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24" id="tickets">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-500 dark:text-gray-400">Loading tickets...</p>
        </div>
      </section>
    );
  }

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 relative" id="tickets">
      <div className="absolute top-10 right-10 text-primary/5 dark:text-primary/10 select-none pointer-events-none">
        <svg fill="currentColor" height="200" viewBox="0 0 24 24" width="200">
          <path d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2Z"></path>
        </svg>
      </div>
      <div className="flex flex-col md:flex-row justify-between items-end mb-16">
        <div className="max-w-2xl">
          <h2 className="font-display text-5xl md:text-6xl font-medium text-text-light dark:text-white mb-4">
            Entrance <span className="italic text-primary">Access</span>
          </h2>
          <p className="text-subtext-light dark:text-subtext-dark text-lg font-light leading-relaxed">
            Exclusive access to our professional stages. Limited availability for daily sessions.
          </p>
        </div>
        <div className="mt-6 md:mt-0">
          <button 
            onClick={() => navigate('/calendar')}
            className="inline-flex items-center text-sm font-semibold text-primary hover:text-text-light dark:hover:text-white transition-colors uppercase tracking-widest group"
          >
            View Full Calendar
            <span className="material-symbols-outlined ml-2 group-hover:translate-x-1 transition-transform text-sm">
              arrow_forward
            </span>
          </button>
        </div>
      </div>
      
      {ticketsWithDates.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {ticketsWithDates.map((item, index) => (
            <TicketCard 
              key={index} 
              ticket={item.ticket} 
              displayDate={item.date}
              isToday={item.isToday}
              isBookable={item.isToday}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <span className="material-symbols-outlined text-6xl text-gray-300 dark:text-gray-700 mb-4">
            confirmation_number
          </span>
          <p className="text-gray-500 dark:text-gray-400 text-lg">No tickets available at the moment</p>
        </div>
      )}
    </section>
  );
};

export default TicketSection;
