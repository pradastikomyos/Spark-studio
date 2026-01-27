import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { formatCurrency, toLocalDateString } from '../utils/formatters';

interface Ticket {
  id: number;
  type: string;
  name: string;
  slug: string;
  description: string | null;
  price: string;
  available_from: string;
  available_until: string;
  time_slots: string[];
  is_active: boolean;
}

interface Availability {
  id: number;
  date: string;
  time_slot: string | null;
  total_capacity: number;
  reserved_capacity: number;
  sold_capacity: number;
  available_capacity: number;
}

interface RawAvailability {
  id: number;
  date: string;
  time_slot: string | null;
  total_capacity: number;
  reserved_capacity: number;
  sold_capacity: number;
}

export default function BookingPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [availabilities, setAvailabilities] = useState<Availability[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);

  useEffect(() => {
    const fetchTicketData = async () => {
      if (!slug) {
        setError('No ticket specified');
        setLoading(false);
        return;
      }

      try {
        // Fetch ticket details
        const { data: ticketData, error: ticketError } = await supabase
          .from('tickets')
          .select('*')
          .eq('slug', slug)
          .eq('is_active', true)
          .single();

        if (ticketError || !ticketData) {
          setError('Ticket not found');
          setLoading(false);
          return;
        }

        setTicket(ticketData);
        console.log('[BookingPage] Fetched ticket:', ticketData);

        // Fetch availabilities for this ticket
        const { data: availData, error: availError } = await supabase
          .from('ticket_availabilities')
          .select('*')
          .eq('ticket_id', ticketData.id)
          .gte('date', toLocalDateString(new Date()))
          .order('date', { ascending: true })
          .order('time_slot', { ascending: true });

        console.log('[BookingPage] Fetched raw availabilities:', availData);
        console.log('[BookingPage] Availability error:', availError);

        if (availError) {
          console.error('Error fetching availabilities:', availError);
        } else {
          // Calculate available capacity
          const processedAvail = (availData as RawAvailability[] | null || []).map((avail) => ({
            ...avail,
            available_capacity: avail.total_capacity - avail.reserved_capacity - avail.sold_capacity,
          }));
          console.log('[BookingPage] Processed availabilities:', processedAvail);
          setAvailabilities(processedAvail);

          // Auto-select today's date (entrance tickets are same-day only)
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          console.log('[BookingPage] Auto-selecting today:', today.toISOString());
          setSelectedDate(today);
          setCurrentDate(today);
        }
      } catch (err) {
        console.error('Error fetching ticket data:', err);
        setError('Failed to load ticket');
      } finally {
        setLoading(false);
      }
    };

    fetchTicketData();
  }, [slug]);

  // Generate calendar days for current month - memoized to prevent recalculation on every render
  const calendarDays = useMemo(() => {
    if (!ticket) return [];

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const availableFrom = new Date(ticket.available_from);
    const availableUntil = new Date(ticket.available_until);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const days = [];

    // Add empty cells for days before month starts
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }

    // Add actual days
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      date.setHours(0, 0, 0, 0);

      // Check if date is today (for entrance tickets, only today is bookable)
      const isToday = date.getTime() === today.getTime();

      const isAvailable = date >= today && date >= availableFrom && date <= availableUntil;
      const hasAvailability = availabilities.some(
        (avail) => avail.date === toLocalDateString(date) && avail.available_capacity > 0
      );

      // MVP: Same-day booking only - only today can be booked
      const canBook = isToday && isAvailable && hasAvailability;

      days.push({
        day,
        date,
        isAvailable: canBook,
        isDisabled: !canBook,
        isToday,
      });
    }

    return days;
  }, [ticket, currentDate, availabilities]);

  // Get available time slots for selected date - memoized to prevent recalculation on every render
  // CRITICAL: Timezone handling
  // - Database stores time_slot as TIME WITHOUT TIMEZONE (treated as local WIB time)
  // - Browser Date() uses local timezone (WIB for Indonesian users)
  // - We compare apples-to-apples: WIB time slot vs WIB current time
  const availableTimeSlots = useMemo(() => {
    if (!selectedDate) return [];

    const dateString = toLocalDateString(selectedDate);
    const now = new Date(); // Browser local time (WIB in Indonesia)
    const isToday = selectedDate.toDateString() === now.toDateString();
    
    // Industry standard: 30-minute buffer for booking preparation
    const BOOKING_BUFFER_MINUTES = 30;
    const currentTimeWithBuffer = new Date(now.getTime() + BOOKING_BUFFER_MINUTES * 60 * 1000);

    const filtered = availabilities.filter((avail) => {
      const matchesDate = avail.date === dateString;
      const hasCapacity = avail.available_capacity > 0;
      const hasTimeSlot = !!avail.time_slot;

      // For today, filter out past time slots and slots within buffer period
      if (isToday && avail.time_slot) {
        // Parse time slot (HH:MM:SS format from database)
        const [hours, minutes] = avail.time_slot.split(':').map(Number);
        
        // Create Date object for slot time TODAY in local timezone
        const slotDateTime = new Date(selectedDate);
        slotDateTime.setHours(hours, minutes, 0, 0);
        
        // Compare: slot time must be at least 30 minutes in the future
        // Both times are in local timezone (WIB), so comparison is valid
        if (slotDateTime <= currentTimeWithBuffer) {
          console.log(`[BookingPage] Filtering out slot ${avail.time_slot}: ${slotDateTime.toLocaleTimeString()} <= ${currentTimeWithBuffer.toLocaleTimeString()}`);
          return false;
        }
      }

      return matchesDate && hasCapacity && hasTimeSlot;
    });

    console.log(`[BookingPage] Available slots for ${dateString}:`, filtered.length);
    return filtered.map((avail) => ({
      time: avail.time_slot as string,
      available: avail.available_capacity,
    }));
  }, [selectedDate, availabilities]);

  // Check if this ticket has all-day access (no time slots) - memoized
  const isAllDayTicket = useMemo(() => {
    if (!selectedDate) return false;
    const dateString = toLocalDateString(selectedDate);
    return availabilities.some(
      (avail) => avail.date === dateString && avail.available_capacity > 0 && !avail.time_slot
    );
  }, [selectedDate, availabilities]);

  // Group time slots by period - memoized
  const groupedSlots = useMemo(() => {
    const morning: typeof availableTimeSlots = [];
    const afternoon: typeof availableTimeSlots = [];
    const evening: typeof availableTimeSlots = [];

    availableTimeSlots.forEach((slot) => {
      if (!slot.time) return; // Skip null/undefined time slots
      const hour = parseInt(slot.time.split(':')[0]);
      if (hour < 12) morning.push(slot);
      else if (hour < 17) afternoon.push(slot);
      else evening.push(slot);
    });

    return { morning, afternoon, evening };
  }, [availableTimeSlots]);

  const handleProceedToPayment = () => {
    if (!ticket || !selectedDate) {
      alert('Please select a date');
      return;
    }

    // For all-day access tickets, time slot is optional
    const isAllDay = isAllDayTicket && !selectedTime;
    if (!isAllDay && !selectedTime) {
      alert('Please select a time slot');
      return;
    }

    navigate('/payment', {
      state: {
        ticketId: ticket.id,
        ticketName: ticket.name,
        ticketType: ticket.type,
        price: parseFloat(ticket.price),
        date: toLocalDateString(selectedDate),
        time: selectedTime || 'all-day',
      },
    });
  };



  if (loading) {
    return (
      <div className="min-h-screen bg-background-light dark:bg-background-dark flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-500 dark:text-gray-400">Loading ticket details...</p>
        </div>
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="min-h-screen bg-background-light dark:bg-background-dark flex items-center justify-center">
        <div className="text-center">
          <span className="material-symbols-outlined text-6xl text-gray-300 dark:text-gray-700 mb-4">error</span>
          <p className="text-gray-500 dark:text-gray-400 text-lg mb-4">{error || 'Ticket not found'}</p>
          <button
            onClick={() => navigate('/')}
            className="bg-primary text-white px-6 py-2 rounded-lg hover:bg-primary/90"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  const price = parseFloat(ticket.price);
  const vat = price * 0.1;
  const total = price + vat;

  const monthName = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark">
      <main className="flex-1 max-w-[1200px] mx-auto w-full px-10 py-10">
        {/* Progress Bar */}
        <div className="mb-10">
          <div className="flex flex-col gap-3">
            <div className="flex gap-6 justify-between items-end">
              <p className="text-primary text-sm font-bold uppercase tracking-widest">Step 1: Selection</p>
              <p className="text-sm font-normal opacity-70">33% Complete</p>
            </div>
            <div className="rounded-full bg-[#e8cece] dark:bg-[#3d2424] overflow-hidden">
              <div className="h-1.5 rounded-full bg-primary" style={{ width: '33%' }}></div>
            </div>
          </div>
        </div>

        {/* Page Heading */}
        <div className="mb-12">
          <h1 className="text-5xl font-black leading-tight tracking-[-0.033em] mb-4">Reserve Your Session</h1>
          <p className="text-[#9c4949] dark:text-[#d19a9a] text-lg max-w-2xl font-normal leading-normal">
            {ticket.description || 'Secure your spot. Select your preferred date and time to begin your experience.'}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Left Column: Calendar & Time */}
          <div className="lg:col-span-2 flex flex-col gap-10">
            {/* Calendar Section */}
            <div className="bg-white dark:bg-[#1a0c0c] rounded-xl shadow-sm border border-[#f4e7e7] dark:border-[#3d2424] p-8">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-xl font-bold">Select Date</h3>
                <p className="text-lg font-bold uppercase tracking-tighter text-primary">{monthName}</p>
              </div>

              <div className="grid grid-cols-7 gap-2">
                {/* Weekdays */}
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                  <div key={day} className="text-primary text-xs font-black uppercase flex h-10 items-center justify-center opacity-40">
                    {day}
                  </div>
                ))}

                {/* Calendar Days */}
                {calendarDays.map((dayData, index) => {
                  if (!dayData) {
                    return <div key={`empty-${index}`} className="h-14 w-full"></div>;
                  }

                  const isSelected = selectedDate?.toDateString() === dayData.date.toDateString();

                  return (
                    <button
                      key={dayData.day}
                      onClick={() => {
                        if (!dayData.isDisabled) {
                          setSelectedDate(dayData.date);
                          setSelectedTime(null);
                        }
                      }}
                      disabled={dayData.isDisabled}
                      className={`h-14 w-full text-sm font-medium rounded-lg flex items-center justify-center transition-all
                        ${isSelected ? 'bg-primary text-white font-bold shadow-lg shadow-primary/20' : ''}
                        ${dayData.isDisabled ? 'opacity-20 cursor-not-allowed' : 'hover:bg-primary/5'}
                      `}
                    >
                      {dayData.day}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Time Slots Selection */}
            {selectedDate && (
              <div className="bg-white dark:bg-[#1a0c0c] rounded-xl shadow-sm border border-[#f4e7e7] dark:border-[#3d2424] p-8">
                <h3 className="text-xl font-bold mb-6">
                  {isAllDayTicket ? 'Access Type' : 'Available Time Slots'}
                </h3>

                {/* All Day Access Option */}
                {isAllDayTicket && (
                  <div className="mb-6">
                    <button
                      onClick={() => setSelectedTime(null)}
                      className={`w-full px-6 py-4 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-3
                        ${!selectedTime
                          ? 'border-2 border-primary bg-primary/5 text-primary font-bold'
                          : 'border border-[#e8cece] dark:border-[#3d2424] hover:border-primary'
                        }
                      `}
                    >
                      <span className="material-symbols-outlined">calendar_today</span>
                      All Day Access
                      <span className="text-xs opacity-60">(Valid entire day)</span>
                    </button>
                  </div>
                )}

                {/* Time Slot Options */}
                {availableTimeSlots.length > 0 ? (
                  <div className="space-y-6">
                    {isAllDayTicket && (
                      <p className="text-xs font-black uppercase tracking-widest text-primary/60 mb-2">
                        Or choose specific time
                      </p>
                    )}
                    {Object.entries(groupedSlots).map(([period, slots]) => {
                      if (slots.length === 0) return null;
                      return (
                        <div key={period}>
                          <p className="text-xs font-black uppercase tracking-widest text-primary/60 mb-4">
                            {period} Sessions
                          </p>
                          <div className="flex flex-wrap gap-3">
                            {slots.map((slot) => {
                              const isSelected = slot.time === selectedTime;
                              return (
                                <button
                                  key={slot.time}
                                  onClick={() => setSelectedTime(slot.time)}
                                  className={`px-6 py-3 rounded-lg text-sm font-medium transition-all
                                    ${isSelected
                                      ? 'border-2 border-primary bg-primary/5 text-primary font-bold'
                                      : 'border border-[#e8cece] dark:border-[#3d2424] hover:border-primary'
                                    }
                                  `}
                                >
                                  {slot.time.substring(0, 5)}
                                  <span className="text-xs ml-2 opacity-60">({slot.available} left)</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : !isAllDayTicket ? (
                  <p className="text-gray-500 text-center py-8">No available time slots for this date</p>
                ) : null}
              </div>
            )}
          </div>

          {/* Right Column: Summary & Payment */}
          <div className="flex flex-col gap-6">
            <div className="bg-white dark:bg-[#1a0c0c] rounded-xl shadow-xl border border-[#f4e7e7] dark:border-[#3d2424] p-8 lg:sticky lg:top-28 overflow-hidden z-10">
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-bl-full pointer-events-none"></div>

              <h3 className="text-2xl font-black mb-8 border-b border-background-light dark:border-background-dark pb-4 italic">
                Booking Summary
              </h3>

              <div className="space-y-6 mb-8">
                <div className="flex items-start gap-4">
                  <span className="material-symbols-outlined text-primary">confirmation_number</span>
                  <div>
                    <p className="text-sm font-bold uppercase tracking-tighter opacity-60">Ticket Type</p>
                    <p className="font-display font-medium">{ticket.name}</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <span className="material-symbols-outlined text-primary">event</span>
                  <div>
                    <p className="text-sm font-bold uppercase tracking-tighter opacity-60">Date</p>
                    <p className="font-display font-medium">
                      {selectedDate
                        ? selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })
                        : 'Not selected'}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <span className="material-symbols-outlined text-primary">schedule</span>
                  <div>
                    <p className="text-sm font-bold uppercase tracking-tighter opacity-60">Time</p>
                    <p className="font-display font-medium">
                      {selectedTime
                        ? selectedTime.substring(0, 5)
                        : isAllDayTicket
                          ? 'All Day Access'
                          : 'Not selected'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-background-light dark:border-background-dark space-y-4">
                <div className="flex justify-between text-sm">
                  <span>Ticket Price</span>
                  <span className="font-bold">{formatCurrency(price)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>VAT (10%)</span>
                  <span className="font-bold">{formatCurrency(vat)}</span>
                </div>
                <div className="flex justify-between text-xl font-black pt-4 border-t border-dashed border-[#e8cece] dark:border-[#3d2424]">
                  <span className="uppercase tracking-tighter">Total</span>
                  <span className="text-primary">{formatCurrency(total)}</span>
                </div>
              </div>

              <button
                onClick={handleProceedToPayment}
                disabled={!selectedDate || (!selectedTime && !isAllDayTicket)}
                className="w-full mt-8 bg-primary hover:bg-primary/90 text-white py-5 rounded-lg font-black uppercase tracking-widest text-sm shadow-xl shadow-primary/30 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Proceed to Payment
              </button>

              <p className="text-[10px] text-center mt-6 opacity-50 font-sans uppercase tracking-widest">
                Secure Encrypted Checkout
              </p>
            </div>

            {/* Additional Info Card */}
            <div className="bg-background-light dark:bg-background-dark rounded-xl p-6 border border-primary/10 relative z-0">
              <div className="flex gap-4 items-center mb-3">
                <span className="material-symbols-outlined text-primary">info</span>
                <h4 className="font-bold text-sm uppercase tracking-widest">Important Info</h4>
              </div>
              <ul className="text-xs space-y-2 font-sans opacity-80 leading-relaxed">
                <li>• Please arrive 15 minutes before your slot.</li>
                <li>• Cancellation required 48 hours in advance.</li>
                <li>• Ticket is valid only for selected date and time.</li>
              </ul>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
