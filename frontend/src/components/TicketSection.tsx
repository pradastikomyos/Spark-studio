import { useState, useEffect } from 'react';
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

          const ticketDates: TicketWithDate[] = sortedAvailableDateStrings.map((dateString) => ({
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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-main-600 mx-auto mb-4"></div>
          <p className="text-gray-500">Loading tickets...</p>
        </div>
      </section>
    );
  }

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10" id="tickets">
      {ticketsWithDates.length > 0 ? (
        <div className="relative">
          <button
            className="hidden md:flex absolute -left-10 top-1/2 -translate-y-1/2 w-10 h-10 items-center justify-center text-main-700"
            type="button"
            aria-label="Previous"
          >
            <span className="material-symbols-outlined">chevron_left</span>
          </button>

          <button
            className="hidden md:flex absolute -right-10 top-1/2 -translate-y-1/2 w-10 h-10 items-center justify-center text-main-700"
            type="button"
            aria-label="Next"
          >
            <span className="material-symbols-outlined">chevron_right</span>
          </button>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {ticketsWithDates.map((item, index) => (
              <TicketCard
                key={index}
                ticket={item.ticket}
                displayDate={item.date}
                isToday={item.isToday}
                isBookable
              />
            ))}
          </div>
        </div>
      ) : (
        <div className="text-center py-16">
          <p className="text-gray-500 text-sm">No tickets available at the moment</p>
        </div>
      )}
    </section>
  );
};

export default TicketSection;
