import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { formatCurrency } from '../utils/formatters';
import {
  createWIBDate,
  addDays,
  todayWIB,
  nowWIB,
  isTimeSlotBookable,
  getMinutesUntilSessionEnd,
  toLocalDateString,
} from '../utils/timezone';
import { useTickets } from '../hooks/useTickets';
import { useTicketAvailability } from '../hooks/useTicketAvailability';
import { queryKeys } from '../lib/queryKeys';
import { useToast } from '../components/Toast';
import { PageTransition } from '../components/PageTransition';
import TicketCardSkeleton from '../components/skeletons/TicketCardSkeleton';
import { LazyMotion, m } from 'framer-motion';

export default function BookingPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const { data: ticket, error: ticketError, isLoading: ticketLoading } = useTickets(slug);
  const { data: availabilities = [], error: availabilityError, isLoading: availabilityLoading } = useTicketAvailability(ticket?.id ?? null);
  const loading = ticketLoading || availabilityLoading;
  const error = ticketError || availabilityError;

  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);

  // Layer 1: Track current time for time-based filtering (updates every minute)
  // This ensures past slots are filtered out as time progresses without manual refresh
  const [currentTime, setCurrentTime] = useState(nowWIB());

  // Urgency confirmation modal state
  const [showUrgencyModal, setShowUrgencyModal] = useState(false);

  useEffect(() => {
    if (!ticket) return;
    const today = todayWIB();
    setSelectedDate(today);
    setCurrentDate(today);
  }, [ticket]);

  useEffect(() => {
    if (error) {
      showToast('error', error instanceof Error ? error.message : 'Failed to load booking data');
    }
  }, [error, showToast]);

  // Layer 1: Update current time every minute (enterprise pattern: Google Calendar, Outlook)
  // This ensures time-based filtering stays accurate as time progresses
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(nowWIB());
      console.log('[BookingPage] Current time updated:', nowWIB().toISOString());
    }, 60000); // Update every 60 seconds

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        setCurrentTime(nowWIB());
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // Generate calendar days for current month - memoized to prevent recalculation on every render
  // UPDATED (Jan 2026): Rolling 30-day booking window instead of today-only
  const calendarDays = useMemo(() => {
    if (!ticket) return [];

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const extractDateOnly = (value: string) => value.split('T')[0].split(' ')[0];
    const ticketFromDate = extractDateOnly(ticket.available_from);
    const ticketUntilDate = extractDateOnly(ticket.available_until);

    const maxAvailabilityDate = availabilities.reduce<string>(
      (max, avail) => (avail.date > max ? avail.date : max),
      ''
    );

    const effectiveUntilDate = maxAvailabilityDate && maxAvailabilityDate > ticketUntilDate
      ? maxAvailabilityDate
      : ticketUntilDate;

    const availableFrom = createWIBDate(ticketFromDate);
    const availableUntil = createWIBDate(effectiveUntilDate, '23:59:59');
    const today = todayWIB();

    // Rolling 30-day booking window
    const maxBookingDate = addDays(today, 30);

    const days = [];

    // Add empty cells for days before month starts
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }

    // Add actual days
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      date.setHours(0, 0, 0, 0);

      // Check if date is today
      const isToday = toLocalDateString(date) === toLocalDateString(today);

      // Check if within 30-day rolling window
      const isWithinBookingWindow = date >= today && date <= maxBookingDate;

      const isAvailable = isWithinBookingWindow && date >= availableFrom && date <= availableUntil;
      const hasAvailability = availabilities.some(
        (avail) => avail.date === toLocalDateString(date) && avail.available_capacity > 0
      );

      // UPDATED: 30-day rolling window instead of same-day only
      const canBook = isAvailable && hasAvailability;

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
  // TIMEZONE-SAFE: All comparisons use WIB timezone utilities
  // UPDATED (Jan 2026): Show past slots as disabled instead of hiding them (boss feedback for better UX)
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

    console.log(`[BookingPage] Available slots for ${dateString} at ${currentTime.toISOString()}:`, filtered.length);
    return filtered.map((avail) => {
      // For today, check if session has ended - show as disabled instead of hiding
      const isPast = isToday && avail.time_slot ? !isTimeSlotBookable(dateString, avail.time_slot) : false;

      if (isPast) {
        console.log(`[BookingPage] Marking slot ${avail.time_slot} as past/disabled: session has ended`);
      }

      return {
        time: avail.time_slot as string,
        available: avail.available_capacity,
        isPast, // NEW: Flag for UI to show as disabled
      };
    });
  }, [selectedDate, availabilities, currentTime]); // CRITICAL: Added currentTime dependency

  // Calculate time until session ends (for warning system)
  // NEW LOGIC (Jan 2026): Returns minutes until SESSION END, not start time
  // This allows booking during active sessions
  const getMinutesUntilClose = (timeSlot: string): number | null => {
    if (!selectedDate) return null;

    const dateString = toLocalDateString(selectedDate);
    const isToday = selectedDate.toDateString() === todayWIB().toDateString();

    if (!isToday) return null; // No urgency for future dates

    // Calculate time until session END (start + 2.5 hours)
    return getMinutesUntilSessionEnd(dateString, timeSlot);
  };

  // Get urgency level for a time slot
  // NEW THRESHOLDS (Jan 2026): Based on time until session ENDS
  // - High: < 30 min until session ends (complete payment quickly!)
  // - Medium: 30-60 min until session ends
  // - Low: 60-90 min until session ends
  // - None: > 90 min until session ends
  const getSlotUrgency = (timeSlot: string): 'none' | 'low' | 'medium' | 'high' => {
    const minutes = getMinutesUntilClose(timeSlot);
    if (minutes === null || minutes > 90) return 'none';
    if (minutes > 60) return 'low';
    if (minutes > 30) return 'medium';
    return 'high';
  };

  // Check if this ticket has all-day access (no time slots) - memoized
  const isAllDayTicket = useMemo(() => {
    if (!selectedDate) return false;
    const dateString = toLocalDateString(selectedDate);
    return availabilities.some(
      (avail) => avail.date === dateString && avail.available_capacity > 0 && !avail.time_slot
    );
  }, [selectedDate, availabilities]);

  // Group time slots by period - memoized
  // UPDATED (Jan 2026): New session times (2.5 hours each)
  // Morning: 09:00-11:30, Afternoon: 12:00-14:30 & 15:00-17:30, Evening: 18:00-20:30
  const groupedSlots = useMemo(() => {
    const morning: typeof availableTimeSlots = [];
    const afternoon1: typeof availableTimeSlots = [];
    const afternoon2: typeof availableTimeSlots = [];
    const evening: typeof availableTimeSlots = [];

    availableTimeSlots.forEach((slot) => {
      if (!slot.time) return; // Skip null/undefined time slots
      const hour = parseInt(slot.time.split(':')[0]);
      if (hour >= 9 && hour < 12) morning.push(slot);
      else if (hour >= 12 && hour < 15) afternoon1.push(slot);
      else if (hour >= 15 && hour < 18) afternoon2.push(slot);
      else if (hour >= 18) evening.push(slot);
    });

    return { morning, afternoon1, afternoon2, evening };
  }, [availableTimeSlots]);

  // Month navigation handlers for 30-day rolling booking
  const today = todayWIB();
  const maxBookingDate = new Date(today);
  maxBookingDate.setDate(today.getDate() + 30);

  const canGoPrevMonth = useMemo(() => {
    const lastDayOfPrevMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 0);
    // Can go back if the previous month contains today or future dates within booking window
    return lastDayOfPrevMonth >= today;
  }, [currentDate, today]);

  const canGoNextMonth = useMemo(() => {
    const firstDayOfNextMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
    // Can go forward if next month has dates within 30-day booking window
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

    // Check urgency level - show confirmation modal for high urgency slots
    if (selectedTime) {
      const urgency = getSlotUrgency(selectedTime);
      if (urgency === 'high' && !showUrgencyModal) {
        setShowUrgencyModal(true);
        return;
      }
    }

    const dateKey = toLocalDateString(selectedDate);
    const optimistic = availabilities.map((avail) => {
      if (avail.date !== dateKey) return avail;
      if (selectedTime && avail.time_slot !== selectedTime) return avail;
      if (!selectedTime && avail.time_slot) return avail;
      return {
        ...avail,
        available_capacity: Math.max(0, avail.available_capacity - 1),
      };
    });
    queryClient.setQueryData(queryKeys.ticketAvailability(ticket.id), optimistic);

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
      <PageTransition>
        <div className="min-h-screen bg-background-light flex items-center justify-center">
          <div className="max-w-5xl w-full px-8 grid grid-cols-1 md:grid-cols-2 gap-6">
            <TicketCardSkeleton />
            <TicketCardSkeleton />
          </div>
        </div>
      </PageTransition>
    );
  }

  if (error || !ticket) {
    return (
      <PageTransition>
        <div className="min-h-screen bg-background-light flex items-center justify-center">
          <div className="text-center">
            <span className="material-symbols-outlined text-6xl text-gray-300 mb-4">error</span>
            <p className="text-gray-500 text-lg mb-4">{error instanceof Error ? error.message : error || 'Ticket not found'}</p>
            <button
              onClick={() => navigate('/')}
              className="bg-[#ff4b86] text-white px-6 py-2 rounded-lg hover:bg-[#e63d75] transition-colors"
            >
              Go Home
            </button>
          </div>
        </div>
      </PageTransition>
    );
  }

  const price = parseFloat(ticket.price);
  const total = price; // VAT already included in ticket price

  const monthName = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return (
    <PageTransition>
      <LazyMotion features={() => import('framer-motion').then((mod) => mod.domAnimation)}>
        <div className="min-h-screen bg-background-light">
          <main className="flex-1 max-w-[1200px] mx-auto w-full px-10 py-10">
            {/* Progress Bar */}
            <div className="mb-10">
              <div className="flex flex-col gap-3">
                <div className="flex gap-6 justify-between items-end">
                  <p className="text-primary text-sm font-bold uppercase tracking-widest">Step 1: Selection</p>
                  <p className="text-sm font-normal opacity-70">33% Complete</p>
                </div>
                <div className="rounded-full bg-rose-100 overflow-hidden">
                  <div className="h-1.5 rounded-full bg-primary" style={{ width: '33%' }}></div>
                </div>
              </div>
            </div>

            {/* Page Heading */}
            <div className="mb-12">
              <h1 className="text-5xl font-black leading-tight tracking-[-0.033em] mb-4">Reserve Your Session</h1>
              <p className="text-[#9c4949]#d19a9a] text-lg max-w-2xl font-normal leading-normal">
                {ticket.description || 'Secure your spot. Select your preferred date and time to begin your experience.'}
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
              {/* Left Column: Calendar & Time */}
              <div className="lg:col-span-2 flex flex-col gap-10">
                {/* Calendar Section */}
                <div className="bg-white#1a0c0c] rounded-xl shadow-sm border border-[#f4e7e7]#3d2424] p-8">
                  <div className="flex items-center justify-between mb-8">
                    <h3 className="text-xl font-bold">Select Date</h3>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={handlePrevMonth}
                        disabled={!canGoPrevMonth}
                        className="p-2 rounded-lg hover:bg-primary/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        aria-label="Previous month"
                      >
                        <span className="material-symbols-outlined text-primary">chevron_left</span>
                      </button>
                      <p className="text-lg font-bold uppercase tracking-tighter text-primary min-w-[140px] text-center">{monthName}</p>
                      <button
                        onClick={handleNextMonth}
                        disabled={!canGoNextMonth}
                        className="p-2 rounded-lg hover:bg-primary/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        aria-label="Next month"
                      >
                        <span className="material-symbols-outlined text-primary">chevron_right</span>
                      </button>
                    </div>
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
                        <m.button
                          key={dayData.day}
                          onClick={() => {
                            if (!dayData.isDisabled) {
                              setSelectedDate(dayData.date);
                              setSelectedTime(null);
                            }
                          }}
                          disabled={dayData.isDisabled}
                          whileTap={{ scale: 0.98 }}
                          className={`h-14 w-full text-sm font-medium rounded-lg flex items-center justify-center transition-all
                        ${isSelected ? 'bg-primary text-white font-bold shadow-lg shadow-primary/20' : ''}
                        ${dayData.isDisabled ? 'opacity-20 cursor-not-allowed' : 'hover:bg-primary/5'}
                      `}
                        >
                          {dayData.day}
                        </m.button>
                      );
                    })}
                  </div>
                </div>

                {/* Time Slots Selection */}
                {selectedDate && (
                  <div className="bg-white rounded-xl shadow-sm border border-rose-50 p-8">
                    <h3 className="text-xl font-bold mb-6">
                      {isAllDayTicket ? 'Access Type' : 'Available Time Slots'}
                    </h3>

                    {/* All Day Access Option */}
                    {isAllDayTicket && (
                      <div className="mb-6">
                        <m.button
                          onClick={() => setSelectedTime(null)}
                          whileTap={{ scale: 0.98 }}
                          className={`w-full px-6 py-4 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-3
                        ${!selectedTime
                              ? 'border-2 border-primary bg-primary/5 text-primary font-bold'
                              : 'border border-[#e8cece]#3d2424] hover:border-primary'
                            }
                      `}
                        >
                          <span className="material-symbols-outlined">calendar_today</span>
                          All Day Access
                          <span className="text-xs opacity-60">(Valid entire day)</span>
                        </m.button>
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

                          // Display names for new session structure
                          const periodNames: Record<string, string> = {
                            morning: 'Morning (09:00 - 11:30)',
                            afternoon1: 'Afternoon Early (12:00 - 14:30)',
                            afternoon2: 'Afternoon Late (15:00 - 17:30)',
                            evening: 'Evening (18:00 - 20:30)'
                          };

                          return (
                            <div key={period}>
                              <p className="text-xs font-black uppercase tracking-widest text-primary/60 mb-4">
                                {periodNames[period] || period}
                              </p>
                              <div className="flex flex-wrap gap-3">
                                {slots.map((slot) => {
                                  const isSelected = slot.time === selectedTime;
                                  const urgency = slot.isPast ? 'none' : getSlotUrgency(slot.time);
                                  const minutesLeft = slot.isPast ? null : getMinutesUntilClose(slot.time);

                                  return (
                                    <div key={slot.time} className="relative">
                                      <m.button
                                        onClick={() => !slot.isPast && setSelectedTime(slot.time)}
                                        disabled={slot.isPast}
                                        whileTap={slot.isPast ? {} : { scale: 0.98 }}
                                        className={`px-6 py-3 rounded-lg text-sm font-medium transition-all relative
                                          ${slot.isPast
                                            ? 'opacity-40 cursor-not-allowed bg-gray-100 border border-gray-300 line-through'
                                            : isSelected
                                              ? 'border-2 border-primary bg-primary/5 text-primary font-bold'
                                              : 'border border-[#e8cece]#3d2424] hover:border-primary'
                                          }
                                        `}
                                      >
                                        {slot.time.substring(0, 5)}
                                        <span className={`text-xs ml-2 ${slot.isPast ? 'opacity-60' : 'opacity-60'}`}>
                                          {slot.isPast ? '(Session ended)' : `(${slot.available} left)`}
                                        </span>

                                        {/* Urgency Badge - shows time until SESSION ENDS (only for non-past slots) */}
                                        {!slot.isPast && urgency !== 'none' && minutesLeft !== null && (
                                          <span className={`absolute -top-2 -right-2 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider
                                            ${urgency === 'high' ? 'bg-red-500 text-white animate-pulse' : ''}
                                            ${urgency === 'medium' ? 'bg-orange-500 text-white' : ''}
                                            ${urgency === 'low' ? 'bg-yellow-500 text-black' : ''}
                                          `}>
                                            {minutesLeft}m
                                          </span>
                                        )}

                                        {/* Past Session Badge - mobile-friendly indicator */}
                                        {slot.isPast && (
                                          <span className="absolute -top-2 -right-2 px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-400 text-white">
                                            Ended
                                          </span>
                                        )}
                                      </m.button>

                                      {/* Warning Tooltip - clarifies session ending soon (only on non-mobile/hover) */}
                                      {!slot.isPast && urgency === 'high' && minutesLeft !== null && (
                                        <div className="hidden md:block absolute top-full mt-2 left-1/2 -translate-x-1/2 z-10 w-48 bg-red-50 border border-red-200 rounded-lg p-2 text-xs text-red-700">
                                          <div className="flex items-start gap-1">
                                            <span className="material-symbols-outlined text-sm">warning</span>
                                            <span>Session ends in {minutesLeft} min. Complete payment quickly!</span>
                                          </div>
                                        </div>
                                      )}
                                    </div>
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
                <div className="bg-white rounded-xl shadow-xl border border-rose-50 p-8 lg:sticky lg:top-28 overflow-hidden z-10">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-bl-full pointer-events-none"></div>

                  <h3 className="text-2xl font-black mb-8 border-b border-background-light pb-4 italic">
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
                      <div className="flex-1">
                        <p className="text-sm font-bold uppercase tracking-tighter opacity-60">Time</p>
                        <p className="font-display font-medium">
                          {selectedTime
                            ? selectedTime.substring(0, 5)
                            : isAllDayTicket
                              ? 'All Day Access'
                              : 'Not selected'}
                        </p>

                        {/* Urgency Warning in Summary - Updated for session end time */}
                        {selectedTime && (() => {
                          const urgency = getSlotUrgency(selectedTime);
                          const minutesLeft = getMinutesUntilClose(selectedTime);

                          if (urgency === 'high' && minutesLeft !== null) {
                            return (
                              <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
                                <div className="flex items-start gap-1">
                                  <span className="material-symbols-outlined text-sm">warning</span>
                                  <div>
                                    <p className="font-bold">Session ends in {minutesLeft} minutes!</p>
                                    <p className="mt-1 opacity-80">Complete payment quickly to secure your booking.</p>
                                  </div>
                                </div>
                              </div>
                            );
                          }

                          if (urgency === 'medium' && minutesLeft !== null) {
                            return (
                              <div className="mt-2 p-2 bg-orange-50 border border-orange-200 rounded text-xs text-orange-700">
                                <div className="flex items-center gap-1">
                                  <span className="material-symbols-outlined text-sm">schedule</span>
                                  <span>Session ends in {minutesLeft} minutes</span>
                                </div>
                              </div>
                            );
                          }

                          if (urgency === 'low' && minutesLeft !== null) {
                            return (
                              <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-700">
                                <div className="flex items-center gap-1">
                                  <span className="material-symbols-outlined text-sm">info</span>
                                  <span>Session ends in {minutesLeft} minutes</span>
                                </div>
                              </div>
                            );
                          }

                          return null;
                        })()}
                      </div>
                    </div>
                  </div>

                  <div className="pt-6 border-t border-background-light space-y-4">
                    <div className="flex justify-between text-sm">
                      <span>Ticket Price <span className="text-xs text-gray-500">(VAT included)</span></span>
                      <span className="font-bold">{formatCurrency(price)}</span>
                    </div>
                    <div className="flex justify-between text-xl font-black pt-4 border-t border-dashed border-[#e8cece]#3d2424]">
                      <span className="uppercase tracking-tighter">Total</span>
                      <span className="text-primary">{formatCurrency(total)}</span>
                    </div>
                  </div>

                  <m.button
                    onClick={handleProceedToPayment}
                    disabled={!selectedDate || (!selectedTime && !isAllDayTicket)}
                    whileTap={{ scale: 0.98 }}
                    className="w-full mt-8 bg-[#ff4b86] hover:bg-[#e63d75] text-white py-5 rounded-lg font-black uppercase tracking-widest text-sm shadow-xl shadow-primary/30 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Proceed to Payment
                  </m.button>

                  <p className="text-[10px] text-center mt-6 opacity-50 font-sans uppercase tracking-widest">
                    Secure Encrypted Checkout
                  </p>
                </div>

                {/* Additional Info Card */}
                <div className="bg-background-light rounded-xl p-6 border border-primary/10 relative z-0">
                  <div className="flex gap-4 items-center mb-3">
                    <span className="material-symbols-outlined text-primary">info</span>
                    <h4 className="font-bold text-sm uppercase tracking-widest">Important Info</h4>
                  </div>
                  <ul className="text-xs space-y-2 font-sans opacity-80 leading-relaxed">
                    <li>• Please arrive 15 minutes before your slot.</li>
                    <li>• Ticket is valid only for selected date and time.</li>
                    <li className="text-red-600 font-semibold">• Tiket tidak dapat di-refund atau di-reschedule.</li>
                  </ul>
                </div>
              </div>
            </div>
          </main>

          {/* Urgency Confirmation Modal - Updated for flexible booking */}
          {showUrgencyModal && selectedTime && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white#1a0c0c] rounded-xl shadow-2xl border-2 border-red-500 max-w-md w-full p-6 animate-in fade-in zoom-in duration-200">
                <div className="flex items-start gap-4 mb-4">
                  <div className="flex-shrink-0 w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                    <span className="material-symbols-outlined text-red-600 text-2xl animate-pulse">
                      warning
                    </span>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-black text-red-600 mb-2">
                      Session Ending Soon!
                    </h3>
                    <p className="text-sm text-gray-700">
                      The session for <span className="font-bold">{selectedTime.substring(0, 5)}</span> ends in{' '}
                      <span className="font-bold text-red-600">
                        {getMinutesUntilClose(selectedTime)} minutes
                      </span>.
                    </p>
                  </div>
                </div>

                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                  <p className="text-sm text-red-800 font-medium mb-2">
                    ⚠️ Important Reminders:
                  </p>
                  <ul className="text-xs text-red-700 space-y-1">
                    <li>• Complete payment within the next few minutes</li>
                    <li>• Midtrans payment window: 15-30 minutes</li>
                    <li>• You can still book even if session has started</li>
                    <li>• Booking closes when session ends (not when it starts)</li>
                    <li>• Consider a later session for more flexibility</li>
                  </ul>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setShowUrgencyModal(false);
                      setSelectedTime(null);
                    }}
                    className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-lg font-bold text-sm hover:bg-gray-50:bg-gray-800 transition-all"
                  >
                    Choose Different Time
                  </button>
                  <button
                    onClick={() => {
                      setShowUrgencyModal(false);
                      handleProceedToPayment();
                    }}
                    className="flex-1 px-4 py-3 bg-primary hover:bg-primary-dark text-white rounded-lg font-bold text-sm transition-all shadow-lg"
                  >
                    I Understand, Continue
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </LazyMotion>
    </PageTransition>
  );
}
