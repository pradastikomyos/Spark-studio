import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export default function FullCalendarPage() {
  const navigate = useNavigate();

  type TicketRow = {
    id: string | number;
    name: string;
    description?: string | null;
    price: string | number;
  };

  type AvailabilityRow = {
    id: string | number;
    date: string;
    time_slot: string | null;
    total_capacity: number;
    reserved_capacity: number;
    sold_capacity: number;
  };

  const toNumber = (value: unknown, fallback: number = 0) => {
    if (typeof value === 'number') return Number.isFinite(value) ? value : fallback;
    if (typeof value === 'string' && value.trim() !== '') {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : fallback;
    }
    return fallback;
  };

  const toLocalDateIso = (d: Date) => {
    const localMidnight = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    return localMidnight.toISOString().slice(0, 10);
  };

  const formatTime = (value: string | null) => {
    if (!value) return 'All Day';
    return value.slice(0, 5);
  };

  const [monthCursor, setMonthCursor] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [ticket, setTicket] = useState<TicketRow | null>(null);
  const [availabilities, setAvailabilities] = useState<AvailabilityRow[]>([]);
  const [selectedDateIso, setSelectedDateIso] = useState<string | null>(null);
  const [selectedAvailabilityId, setSelectedAvailabilityId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const monthLabel = useMemo(() => {
    return monthCursor.toLocaleString('en-US', { month: 'long', year: 'numeric' });
  }, [monthCursor]);

  const monthStartIso = useMemo(() => toLocalDateIso(monthCursor), [monthCursor]);
  const monthEndIso = useMemo(() => {
    const end = new Date(monthCursor.getFullYear(), monthCursor.getMonth() + 1, 0);
    return toLocalDateIso(end);
  }, [monthCursor]);

  useEffect(() => {
    const run = async () => {
      if (!supabase) {
        setErrorMessage('Supabase belum terkonfigurasi.');
        setTicket(null);
        setAvailabilities([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setErrorMessage(null);

        const { data: ticketData, error: ticketError } = await supabase
          .from('tickets')
          .select('id,name,description,price')
          .eq('type', 'entrance')
          .eq('is_active', true)
          .order('id', { ascending: true })
          .limit(1)
          .maybeSingle();

        if (ticketError) throw ticketError;
        if (!ticketData) {
          setTicket(null);
          setAvailabilities([]);
          setSelectedDateIso(null);
          setSelectedAvailabilityId(null);
          setErrorMessage('Tiket entrance belum tersedia.');
          return;
        }

        setTicket(ticketData as TicketRow);

        const { data: availabilityData, error: availabilityError } = await supabase
          .from('ticket_availabilities')
          .select('id,date,time_slot,total_capacity,reserved_capacity,sold_capacity')
          .eq('ticket_id', ticketData.id)
          .gte('date', monthStartIso)
          .lte('date', monthEndIso)
          .order('date', { ascending: true })
          .order('time_slot', { ascending: true, nullsFirst: true });

        if (availabilityError) throw availabilityError;

        const rows = (availabilityData ?? []) as AvailabilityRow[];
        setAvailabilities(rows);

        const hasAnySelectionInMonth = selectedDateIso
          ? selectedDateIso >= monthStartIso && selectedDateIso <= monthEndIso
          : false;

        if (!hasAnySelectionInMonth) {
          const firstAvailableDate = rows
            .map((r) => r.date)
            .find((dateStr) => {
              const daySlots = rows.filter((x) => x.date === dateStr);
              return daySlots.some((slot) => {
                const remaining =
                  toNumber(slot.total_capacity) - toNumber(slot.reserved_capacity) - toNumber(slot.sold_capacity);
                return remaining > 0;
              });
            });

          setSelectedDateIso(firstAvailableDate ?? null);
          setSelectedAvailabilityId(null);
        }
      } catch {
        setTicket(null);
        setAvailabilities([]);
        setSelectedDateIso(null);
        setSelectedAvailabilityId(null);
        setErrorMessage('Gagal memuat kalender.');
      } finally {
        setLoading(false);
      }
    };

    void run();
  }, [monthEndIso, monthStartIso, selectedDateIso]);

  const availabilityByDate = useMemo(() => {
    const map = new Map<string, AvailabilityRow[]>();
    for (const row of availabilities) {
      const list = map.get(row.date) ?? [];
      list.push(row);
      map.set(row.date, list);
    }
    return map;
  }, [availabilities]);

  const selectedSlots = useMemo(() => {
    if (!selectedDateIso) return [];
    return availabilityByDate.get(selectedDateIso) ?? [];
  }, [availabilityByDate, selectedDateIso]);

  const availableSlots = useMemo(() => {
    return selectedSlots
      .map((slot) => {
        const remaining =
          toNumber(slot.total_capacity) - toNumber(slot.reserved_capacity) - toNumber(slot.sold_capacity);
        return { ...slot, remaining };
      })
      .filter((slot) => slot.remaining > 0);
  }, [selectedSlots]);

  useEffect(() => {
    if (selectedAvailabilityId && availableSlots.some((x) => String(x.id) === selectedAvailabilityId)) return;
    setSelectedAvailabilityId(availableSlots.length > 0 ? String(availableSlots[0].id) : null);
  }, [availableSlots, selectedAvailabilityId]);

  const handleConfirmDate = () => {
    if (!ticket || !selectedAvailabilityId || !selectedDateIso) return;
    const chosen = availableSlots.find((x) => String(x.id) === selectedAvailabilityId);
    if (!chosen) return;

    navigate('/booking', {
      state: {
        ticketId: ticket.id,
        ticketName: ticket.name,
        ticketPrice: toNumber(ticket.price, 0),
        dateIso: selectedDateIso,
        timeSlotValue: chosen.time_slot,
        availabilityId: chosen.id,
      },
    });
  };

  const daysInMonth = new Date(monthCursor.getFullYear(), monthCursor.getMonth() + 1, 0).getDate();
  const leadingEmpty = new Date(monthCursor.getFullYear(), monthCursor.getMonth(), 1).getDay();
  const calendarCells = useMemo(() => {
    const cells: Array<{ day: number } | null> = Array.from({ length: leadingEmpty }, () => null);
    for (let day = 1; day <= daysInMonth; day += 1) {
      cells.push({ day });
    }
    return cells;
  }, [daysInMonth, leadingEmpty]);

  return (
    <div className="min-h-screen flex flex-col bg-background-light dark:bg-background-dark">
      {/* Decorative Background Element */}
      <div className="fixed top-0 right-0 p-6 pointer-events-none hidden md:block z-0">
        <svg 
          className="opacity-10 dark:opacity-20 text-primary" 
          fill="none" 
          height="120" 
          viewBox="0 0 100 100" 
          width="120" 
          xmlns="http://www.w3.org/2000/svg"
        >
          <path 
            d="M50 0L61 39L100 50L61 61L50 100L39 61L0 50L39 39L50 0Z" 
            fill="currentColor"
          />
        </svg>
      </div>

      <main className="flex-grow container mx-auto px-4 md:px-6 py-8 md:py-12 max-w-7xl relative z-10">
        {/* Header */}
        <header className="mb-8 md:mb-16 relative">
          <div className="max-w-3xl">
            <h1 className="font-display text-4xl md:text-6xl lg:text-7xl text-gray-900 dark:text-white mb-4 md:mb-6 leading-tight">
              Entrance <span className="text-primary italic">Access</span>
            </h1>
            <p className="text-base md:text-lg lg:text-xl text-gray-500 dark:text-gray-400 font-light leading-relaxed max-w-2xl">
              Exclusive access to our professional stages. Secure your session on the full monthly grid below. 
              Limited availability for daily sessions.
            </p>
          </div>
          <button
            onClick={() => navigate('/')}
            className="inline-flex items-center mt-6 md:mt-8 text-sm font-medium text-gray-400 hover:text-primary transition-colors uppercase tracking-widest"
          >
            <span className="material-icons text-base mr-2">arrow_back</span>
            Return to Weekly View
          </button>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 xl:gap-20">
          {/* Calendar Section */}
          <div className="lg:col-span-8">
            {/* Month Header */}
            <div className="flex justify-between items-end mb-8 border-b border-gray-200 dark:border-gray-700 pb-4">
              <div>
                <span className="block text-sm text-primary font-bold tracking-widest uppercase mb-1">
                  Select Date
                </span>
                <h2 className="font-display text-4xl text-gray-900 dark:text-white">
                  {monthLabel}
                </h2>
              </div>
              <div className="flex space-x-4">
                <button
                  onClick={() =>
                    setMonthCursor((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))
                  }
                  className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition text-gray-400 hover:text-gray-900 dark:hover:text-white"
                >
                  <span className="material-icons">chevron_left</span>
                </button>
                <button
                  onClick={() =>
                    setMonthCursor((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))
                  }
                  className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition text-gray-900 dark:text-white"
                >
                  <span className="material-icons">chevron_right</span>
                </button>
              </div>
            </div>

            {/* Weekday Headers */}
            <div className="grid grid-cols-7 mb-4">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                <div key={day} className="text-center text-xs font-bold text-gray-400 uppercase tracking-widest py-2">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 auto-rows-fr gap-y-8 gap-x-2">
              {calendarCells.map((cell, index) => {
                if (!cell) return <div key={index} className="aspect-square"></div>;

                const date = new Date(monthCursor.getFullYear(), monthCursor.getMonth(), cell.day);
                const dateIso = toLocalDateIso(date);
                const daySlots = availabilityByDate.get(dateIso) ?? [];
                const remainingValues = daySlots.map((slot) =>
                  toNumber(slot.total_capacity) - toNumber(slot.reserved_capacity) - toNumber(slot.sold_capacity)
                );
                const isAvailable = remainingValues.some((r) => r > 0);
                const isLimited = remainingValues.some((r) => r > 0 && r <= 3);
                const hasBooking = daySlots.some((slot) =>
                  toNumber(slot.sold_capacity) + toNumber(slot.reserved_capacity) > 0
                );
                const isSelected = selectedDateIso === dateIso;

                return (
                  <button
                    key={index}
                    onClick={() => {
                      if (!isAvailable) return;
                      setSelectedDateIso(dateIso);
                      setSelectedAvailabilityId(null);
                    }}
                    disabled={!isAvailable}
                    className={`
                      aspect-square flex flex-col items-center justify-center relative rounded-full transition-all
                      ${isSelected
                        ? 'bg-primary shadow-lg shadow-red-200 dark:shadow-red-900/20 transform scale-110'
                        : isAvailable
                          ? 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
                          : 'cursor-not-allowed'
                      }
                    `}
                  >
                    <span
                      className={`
                      text-lg font-medium
                      ${isSelected
                        ? 'text-white font-bold'
                        : !isAvailable
                          ? 'text-gray-400 dark:text-gray-600 line-through decoration-gray-300'
                          : 'text-gray-900 dark:text-white'
                      }
                    `}
                    >
                      {cell.day}
                    </span>

                    {hasBooking && !isSelected && (
                      <span className={`mt-1 w-1 h-1 rounded-full ${isLimited ? 'bg-primary' : 'bg-gray-300'}`}></span>
                    )}

                    {isSelected && (
                      <span className="absolute -top-1 -right-1 flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Legend */}
            <div className="mt-8 flex items-center space-x-8 text-sm text-gray-500 dark:text-gray-400">
              <div className="flex items-center">
                <div className="w-2 h-2 rounded-full bg-gray-900 dark:bg-white mr-2"></div>
                <span>Available</span>
              </div>
              <div className="flex items-center">
                <div className="w-2 h-2 rounded-full bg-gray-300 dark:bg-gray-700 mr-2"></div>
                <span>Limited</span>
              </div>
              <div className="flex items-center">
                <div className="w-2 h-2 rounded-full bg-primary mr-2"></div>
                <span>Selected</span>
              </div>
            </div>
          </div>

          {/* Sidebar - Booking Summary */}
          <aside className="lg:col-span-4 mt-8 lg:mt-0">
            <div className="lg:sticky lg:top-24 bg-white dark:bg-[#1c0d0d] border border-gray-200 dark:border-gray-800 p-6 md:p-8 shadow-lg rounded-lg">
              {errorMessage ? (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-amber-900 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-100">
                  <p className="text-sm font-bold">{errorMessage}</p>
                  <button
                    onClick={() => navigate('/')}
                    className="mt-3 inline-flex items-center rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white hover:bg-red-700 transition-colors"
                  >
                    Kembali
                  </button>
                </div>
              ) : loading ? (
                <div className="animate-pulse">
                  <div className="h-6 w-40 bg-gray-200 dark:bg-white/10 rounded mb-4" />
                  <div className="h-10 w-32 bg-gray-200 dark:bg-white/10 rounded mb-6" />
                  <div className="h-4 w-full bg-gray-200 dark:bg-white/10 rounded mb-2" />
                  <div className="h-4 w-2/3 bg-gray-200 dark:bg-white/10 rounded" />
                </div>
              ) : null}

              {/* Date Info */}
              <div className="border-b border-gray-200 dark:border-gray-800 pb-6 mb-6">
                <span className="block text-xs font-bold text-primary uppercase tracking-widest mb-2">
                  Booking Summary
                </span>
                <h3 className="font-display text-3xl text-gray-900 dark:text-white mb-1">
                  {selectedDateIso ? new Date(`${selectedDateIso}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '-'}
                </h3>
                <p className="text-gray-500 dark:text-gray-400 font-light">
                  {selectedDateIso ? new Date(`${selectedDateIso}T00:00:00`).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric' }) : ''}
                </p>
              </div>

              {/* Pass Info */}
              <div className="mb-8">
                <h4 className="font-display text-xl text-gray-900 dark:text-white mb-2">
                  {ticket?.name ?? 'Entrance Ticket'}
                </h4>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 leading-relaxed">
                  {ticket?.description ?? 'Pilih sesi yang tersedia untuk masuk ke studio.'}
                </p>
                {availableSlots.length > 0 ? (
                  <div className="inline-flex items-center px-2.5 py-1 rounded bg-red-50 dark:bg-red-900/30 text-primary text-xs font-semibold tracking-wide uppercase">
                    Slots Available
                  </div>
                ) : (
                  <div className="inline-flex items-center px-2.5 py-1 rounded bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-200 text-xs font-semibold tracking-wide uppercase">
                    No slots
                  </div>
                )}
              </div>

              {/* Time Slots */}
              <div className="mb-8">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 uppercase tracking-wider text-xs">
                  Available Sessions
                </label>
                <div className="space-y-3">
                  {availableSlots.length === 0 ? (
                    <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1c0d0d] p-4 text-sm text-gray-500 dark:text-gray-400">
                      Tidak ada sesi tersedia untuk tanggal ini.
                    </div>
                  ) : (
                    availableSlots.map((slot) => {
                      const checked = selectedAvailabilityId === String(slot.id);
                      return (
                        <label
                          key={String(slot.id)}
                          className={`
                            flex items-center justify-between p-3 border rounded cursor-pointer transition-colors
                            ${checked
                              ? 'border-primary bg-red-50/50 dark:bg-red-900/10'
                              : 'border-gray-200 dark:border-gray-800 hover:border-gray-400 dark:hover:border-gray-500 bg-white dark:bg-[#1c0d0d]'
                            }
                          `}
                        >
                          <span className="flex items-center">
                            <input
                              type="radio"
                              name="time"
                              checked={checked}
                              onChange={() => setSelectedAvailabilityId(String(slot.id))}
                              className="h-4 w-4 text-primary focus:ring-primary border-gray-300"
                            />
                            <span className="ml-3 text-sm font-medium text-gray-900 dark:text-white">
                              {formatTime(slot.time_slot)}
                            </span>
                          </span>
                          <span className={`text-xs font-semibold ${checked ? 'text-primary' : 'text-gray-500'}`}>
                            {toNumber(ticket?.price, 0) ? `IDR ${toNumber(ticket?.price, 0).toLocaleString('id-ID')}` : ''}
                          </span>
                        </label>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Confirm Button */}
              <button
                onClick={handleConfirmDate}
                disabled={!selectedAvailabilityId || !ticket}
                className="w-full bg-primary hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-4 px-6 shadow-lg shadow-red-500/30 transition-all duration-300 transform hover:-translate-y-0.5 flex items-center justify-center group"
              >
                Confirm Date
                <span className="material-icons ml-2 text-sm group-hover:translate-x-1 transition-transform">
                  arrow_forward
                </span>
              </button>

              <p className="text-center text-xs text-gray-400 mt-4">
                Free cancellation up to 24h before.
              </p>
            </div>
          </aside>
        </div>
      </main>

    </div>
  );
}
