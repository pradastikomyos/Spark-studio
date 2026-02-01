import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { formatCurrency } from '../utils/formatters';
import {
  addDays,
  todayWIB,
  nowWIB,
  isTimeSlotBookable,
  getMinutesUntilSessionEnd,
  toLocalDateString,
} from '../utils/timezone';
import { TicketData } from '../types';
import { PageTransition } from '../components/PageTransition';

interface TicketAvailability {
  date: string;
  time_slot: string | null;
  total_capacity: number;
  reserved_capacity: number;
  sold_capacity: number;
  available_capacity: number;
}

export default function JourneySelectionPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [ticket, setTicket] = useState<TicketData | null>(null);
  const [availabilities, setAvailabilities] = useState<TicketAvailability[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(nowWIB());

  // Fetch first active ticket
  useEffect(() => {
    const fetchTicket = async () => {
      try {
        const { data, error } = await supabase
          .from('tickets')
          .select('*')
          .eq('is_active', true)
          .order('type', { ascending: true })
          .limit(1);

        if (error) throw error;
        if (data && data.length > 0) {
          setTicket(data[0]);
        }
      } catch (err) {
        console.error('Error fetching ticket:', err);
      }
    };

    fetchTicket();
  }, []);

  // Fetch availabilities when ticket is loaded
  useEffect(() => {
    if (!ticket) return;

    const fetchAvailabilities = async () => {
      try {
        const today = todayWIB();
        const lookaheadEnd = addDays(today, 30);

        const { data, error } = await supabase
          .from('ticket_availabilities')
          .select('*')
          .eq('ticket_id', ticket.id)
          .gte('date', toLocalDateString(today))
          .lte('date', toLocalDateString(lookaheadEnd))
          .order('date', { ascending: true });

        if (error) throw error;

        const processed = (data || []).map((row) => ({
          ...row,
          available_capacity: row.total_capacity - row.reserved_capacity - row.sold_capacity,
        }));

        setAvailabilities(processed);
        setSelectedDate(today);
        setCurrentDate(today);
      } catch (err) {
        console.error('Error fetching availabilities:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAvailabilities();
  }, [ticket]);

  // Update current time every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(nowWIB());
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  // Calendar days generation
  const calendarDays = useMemo(() => {
    if (!ticket) return [];

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const today = todayWIB();
    const maxBookingDate = addDays(today, 30);

    const days = [];

    // Empty cells before month starts
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }

    // Actual days
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      date.setHours(0, 0, 0, 0);

      const isToday = toLocalDateString(date) === toLocalDateString(today);
      const isWithinBookingWindow = date >= today && date <= maxBookingDate;
      const hasAvailability = availabilities.some(
        (avail) => avail.date === toLocalDateString(date) && avail.available_capacity > 0
      );

      const canBook = isWithinBookingWindow && hasAvailability;

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

  // Available time slots for selected date
  const availableTimeSlots = useMemo(() => {
    if (!selectedDate) return [];

    const dateString = toLocalDateString(selectedDate);
    const isToday = dateString === toLocalDateString(todayWIB());

    const filtered = availabilities.filter((avail) => {
      const matchesDate = avail.date === dateString;
      const hasCapacity = avail.available_capacity > 0;
      const hasTimeSlot = !!avail.time_slot;

      return matchesDate && hasCapacity && hasTimeSlot;
    });

    return filtered.map((avail) => {
      const isPast = isToday && avail.time_slot ? !isTimeSlotBookable(dateString, avail.time_slot) : false;

      return {
        time: avail.time_slot as string,
        available: avail.available_capacity,
        isPast,
      };
    });
  }, [selectedDate, availabilities, currentTime]);

  // Group time slots by period
  const groupedSlots = useMemo(() => {
    const morning: typeof availableTimeSlots = [];
    const afternoon1: typeof availableTimeSlots = [];
    const afternoon2: typeof availableTimeSlots = [];
    const evening: typeof availableTimeSlots = [];

    availableTimeSlots.forEach((slot) => {
      if (!slot.time) return;
      const hour = parseInt(slot.time.split(':')[0]);
      if (hour >= 9 && hour < 12) morning.push(slot);
      else if (hour >= 12 && hour < 15) afternoon1.push(slot);
      else if (hour >= 15 && hour < 18) afternoon2.push(slot);
      else if (hour >= 18) evening.push(slot);
    });

    return { morning, afternoon1, afternoon2, evening };
  }, [availableTimeSlots]);

  const getMinutesUntilClose = (timeSlot: string): number | null => {
    if (!selectedDate) return null;
    const dateString = toLocalDateString(selectedDate);
    const isToday = selectedDate.toDateString() === todayWIB().toDateString();
    if (!isToday) return null;
    return getMinutesUntilSessionEnd(dateString, timeSlot);
  };

  const getSlotUrgency = (timeSlot: string): 'none' | 'low' | 'medium' | 'high' => {
    const minutes = getMinutesUntilClose(timeSlot);
    if (minutes === null || minutes > 90) return 'none';
    if (minutes > 60) return 'low';
    if (minutes > 30) return 'medium';
    return 'high';
  };

  const handleProceedToPayment = () => {
    if (!ticket || !selectedDate) {
      alert('Please select a date');
      return;
    }

    if (!selectedTime) {
      alert('Please select a time slot');
      return;
    }

    if (!user) {
      alert('Please log in to continue');
      navigate('/login', { state: { returnTo: '/journey' } });
      return;
    }

    navigate('/payment', {
      state: {
        ticketId: ticket.id,
        ticketName: ticket.name,
        ticketType: ticket.type,
        price: parseFloat(ticket.price),
        date: toLocalDateString(selectedDate),
        time: selectedTime,
      },
    });
  };

  const today = todayWIB();
  const maxBookingDate = addDays(today, 30);

  const canGoPrevMonth = useMemo(() => {
    const lastDayOfPrevMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 0);
    return lastDayOfPrevMonth >= today;
  }, [currentDate, today]);

  const canGoNextMonth = useMemo(() => {
    const firstDayOfNextMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
    return firstDayOfNextMonth <= maxBookingDate;
  }, [currentDate, maxBookingDate]);

  const handlePrevMonth = () => {
    if (canGoPrevMonth) {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    }
  };

  const handleNextMonth = () => {
    if (canGoNextMonth) {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    }
  };

  const monthName = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  if (loading || !ticket) {
    return (
      <PageTransition>
        <div className="min-h-screen bg-white flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-main-600"></div>
        </div>
      </PageTransition>
    );
  }

  const price = parseFloat(ticket.price);
  const vat = price * 0.1;
  const total = price + vat;

  return (
    <PageTransition>
      <div className="min-h-screen bg-white">
        <main className="max-w-[1200px] mx-auto px-6 py-12">
          {/* Page Heading */}
          <div className="mb-12">
            <h1 className="text-5xl font-black leading-tight tracking-tight mb-4">Select Your Journey</h1>
            <p className="text-gray-600 text-lg">Pick a date to see available magical experiences.</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            {/* Left Column: Calendar & Time */}
            <div className="lg:col-span-2 flex flex-col gap-10">
              {/* Calendar Section - Always Visible */}
              <div className="bg-gray-50 rounded-xl p-8 border border-gray-200">
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-xl font-bold uppercase tracking-wider text-gray-400">{monthName}</h3>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={handlePrevMonth}
                      disabled={!canGoPrevMonth}
                      className="p-2 rounded-lg hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      aria-label="Previous month"
                    >
                      <span className="material-symbols-outlined text-gray-700">chevron_left</span>
                    </button>
                    <button
                      onClick={handleNextMonth}
                      disabled={!canGoNextMonth}
                      className="p-2 rounded-lg hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      aria-label="Next month"
                    >
                      <span className="material-symbols-outlined text-gray-700">chevron_right</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-7 gap-2">
                  {/* Weekdays */}
                  {['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'].map((day) => (
                    <div key={day} className="text-gray-500 text-xs font-bold uppercase flex h-10 items-center justify-center">
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
                        className={`h-14 w-full text-2xl font-bold rounded-lg flex items-center justify-center transition-all
                          ${isSelected ? 'bg-main-600 text-white shadow-lg' : ''}
                          ${dayData.isDisabled ? 'opacity-20 cursor-not-allowed' : 'hover:bg-gray-200'}
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
                <div className="bg-gray-50 rounded-xl p-8 border border-gray-200">
                  <h3 className="text-xl font-bold mb-6">Available Time Slots</h3>

                  {availableTimeSlots.length > 0 ? (
                    <div className="space-y-6">
                      {Object.entries(groupedSlots).map(([period, slots]) => {
                        if (slots.length === 0) return null;

                        const periodNames: Record<string, string> = {
                          morning: 'MORNING (09:00 - 11:30)',
                          afternoon1: 'AFTERNOON EARLY (12:00 - 14:30)',
                          afternoon2: 'AFTERNOON LATE (15:00 - 17:30)',
                          evening: 'EVENING (18:00 - 20:30)'
                        };

                        return (
                          <div key={period}>
                            <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4">
                              {periodNames[period] || period}
                            </p>
                            <div className="flex flex-wrap gap-3">
                              {slots.map((slot) => {
                                const isSelected = slot.time === selectedTime;
                                const urgency = slot.isPast ? 'none' : getSlotUrgency(slot.time);
                                const minutesLeft = slot.isPast ? null : getMinutesUntilClose(slot.time);

                                return (
                                  <div key={slot.time} className="relative">
                                    <button
                                      onClick={() => !slot.isPast && setSelectedTime(slot.time)}
                                      disabled={slot.isPast}
                                      className={`px-6 py-3 rounded-lg text-sm font-medium transition-all relative
                                        ${slot.isPast
                                          ? 'opacity-40 cursor-not-allowed bg-gray-200 border border-gray-300 line-through'
                                          : isSelected
                                            ? 'bg-main-600 text-white font-bold shadow-lg'
                                            : 'border border-gray-300 hover:border-main-600'
                                        }
                                      `}
                                    >
                                      {slot.time.substring(0, 5)}
                                      <span className="text-xs ml-2 opacity-60">
                                        {slot.isPast ? '(Ended)' : `(${slot.available} left)`}
                                      </span>

                                      {!slot.isPast && urgency !== 'none' && minutesLeft !== null && (
                                        <span className={`absolute -top-2 -right-2 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase
                                          ${urgency === 'high' ? 'bg-red-500 text-white animate-pulse' : ''}
                                          ${urgency === 'medium' ? 'bg-orange-500 text-white' : ''}
                                          ${urgency === 'low' ? 'bg-yellow-500 text-black' : ''}
                                        `}>
                                          {minutesLeft}m
                                        </span>
                                      )}
                                    </button>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-center py-8">No available time slots for this date</p>
                  )}
                </div>
              )}
            </div>

            {/* Right Column: Booking Summary */}
            <div className="flex flex-col gap-6">
              <div className="bg-white rounded-xl shadow-xl border border-gray-200 p-8 lg:sticky lg:top-28">
                <h3 className="text-2xl font-black mb-8 italic">Booking Summary</h3>

                <div className="space-y-6 mb-8">
                  <div className="flex items-start gap-4">
                    <span className="material-symbols-outlined text-main-600">confirmation_number</span>
                    <div>
                      <p className="text-sm font-bold uppercase tracking-tighter opacity-60">TICKET TYPE</p>
                      <p className="font-medium">{ticket.name}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <span className="material-symbols-outlined text-main-600">event</span>
                    <div>
                      <p className="text-sm font-bold uppercase tracking-tighter opacity-60">DATE</p>
                      <p className="font-medium">
                        {selectedDate
                          ? selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })
                          : 'Not selected'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <span className="material-symbols-outlined text-main-600">schedule</span>
                    <div>
                      <p className="text-sm font-bold uppercase tracking-tighter opacity-60">TIME</p>
                      <p className="font-medium">
                        {selectedTime ? selectedTime.substring(0, 5) : 'Not selected'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="border-t border-gray-200 pt-6 mb-6 space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Ticket Price</span>
                    <span className="font-medium">{formatCurrency(price)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">VAT (10%)</span>
                    <span className="font-medium">{formatCurrency(vat)}</span>
                  </div>
                  <div className="flex justify-between items-center pt-3 border-t border-gray-200">
                    <span className="text-lg font-bold">TOTAL</span>
                    <span className="text-2xl font-black text-main-600">{formatCurrency(total)}</span>
                  </div>
                </div>

                <button
                  onClick={handleProceedToPayment}
                  disabled={!selectedDate || !selectedTime}
                  className="w-full bg-main-600 hover:bg-main-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold py-4 rounded-lg transition-all shadow-lg"
                >
                  PROCEED TO PAYMENT
                </button>

                <p className="text-center text-xs text-gray-500 mt-4">
                  SECURE ENCRYPTED CHECKOUT
                </p>

                <div className="mt-6 pt-6 border-t border-gray-200">
                  <p className="text-xs font-bold uppercase tracking-wider text-gray-700 mb-3">IMPORTANT INFO</p>
                  <ul className="space-y-2 text-xs text-gray-600">
                    <li>• Please arrive 15 minutes before your slot.</li>
                    <li>• Ticket is valid only for selected date and time.</li>
                    <li className="text-red-600 font-medium">• Tiket tidak dapat di-refund atau di-reschedule.</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </PageTransition>
  );
}
