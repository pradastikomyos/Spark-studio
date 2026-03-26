import { useMemo } from 'react';
import TicketCard from './TicketCard';
import { useEffectiveTicketAvailability } from '../hooks/useEffectiveTicketAvailability';
import { useEntranceTicket } from '../hooks/useEntranceTicket';
import { useTicketBookingSettings } from '../hooks/useTicketBookingSettings';
import { createWIBDate, todayWIB, toLocalDateString } from '../utils/timezone';

interface TicketWithDate {
  date: Date;
  isToday: boolean;
}

const MAX_VISIBLE_DATES = 4;

const TicketSection = () => {
  const { data: ticket, isLoading: ticketLoading } = useEntranceTicket('public');
  const { data: bookingSettings, isLoading: settingsLoading } = useTicketBookingSettings(ticket?.id ?? null);
  const { data: availabilities = [], isLoading: availabilityLoading } = useEffectiveTicketAvailability(
    ticket?.id ?? null,
    bookingSettings?.booking_window_days
  );

  const loading = ticketLoading || settingsLoading || availabilityLoading;

  const ticketsWithDates = useMemo<TicketWithDate[]>(() => {
    if (!ticket) return [];

    const today = todayWIB();
    const todayDateString = toLocalDateString(today);
    const visibleDateStrings = Array.from(
      new Set(
        availabilities
          .filter((row) => !row.is_closed && row.available_capacity > 0)
          .map((row) => row.date)
      )
    )
      .sort()
      .slice(0, MAX_VISIBLE_DATES);

    return visibleDateStrings.map((dateString) => ({
      date: createWIBDate(dateString),
      isToday: dateString === todayDateString,
    }));
  }, [availabilities, ticket]);

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
      {ticket && ticketsWithDates.length > 0 ? (
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
            {ticketsWithDates.map((item) => (
              <TicketCard
                key={`${ticket.id}-${toLocalDateString(item.date)}`}
                ticket={ticket}
                displayDate={item.date}
                isToday={item.isToday}
                isBookable
              />
            ))}
          </div>
        </div>
      ) : (
        <div className="text-center py-16">
          <p className="text-gray-500 text-sm">Booking dates are not available right now. Please check back soon.</p>
        </div>
      )}
    </section>
  );
};

export default TicketSection;
