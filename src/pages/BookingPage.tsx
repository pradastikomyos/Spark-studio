import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

interface LocationState {
  ticketId?: string | number;
  ticketName?: string;
  ticketPrice?: number;
  dateIso?: string;
  timeSlotValue?: string | null;
  availabilityId?: string | number;
}

export default function BookingPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const state = location.state as LocationState;

  type TicketRow = {
    id: string | number;
    name: string;
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

  type AppUserRow = { id: number; name: string; email: string };

  const toNumber = (value: unknown, fallback: number = 0) => {
    if (typeof value === 'number') return Number.isFinite(value) ? value : fallback;
    if (typeof value === 'string' && value.trim() !== '') {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : fallback;
    }
    return fallback;
  };

  const formatTime = (value: string | null | undefined) => {
    if (!value) return 'All Day';
    return value.slice(0, 5);
  };

  const ticketId = state?.ticketId;
  const dateIso = state?.dateIso;

  const [ticket, setTicket] = useState<TicketRow | null>(
    state?.ticketName && typeof state?.ticketPrice === 'number'
      ? ({ id: ticketId ?? '', name: state.ticketName, price: state.ticketPrice } as TicketRow)
      : null
  );
  const [slots, setSlots] = useState<AvailabilityRow[]>([]);
  const [selectedAvailabilityId, setSelectedAvailabilityId] = useState<string | null>(
    state?.availabilityId != null ? String(state.availabilityId) : null
  );
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const dateLabel = useMemo(() => {
    if (!dateIso) return '-';
    const d = new Date(`${dateIso}T00:00:00`);
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  }, [dateIso]);

  useEffect(() => {
    const run = async () => {
      if (!ticketId || !dateIso) {
        setLoading(false);
        return;
      }
      if (!supabase) {
        setErrorMessage('Supabase belum terkonfigurasi.');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setErrorMessage(null);

        const { data: ticketData, error: ticketError } = await supabase
          .from('tickets')
          .select('id,name,price')
          .eq('id', ticketId)
          .maybeSingle();

        if (ticketError) throw ticketError;
        if (ticketData) setTicket(ticketData as TicketRow);

        const { data: availabilityData, error: availabilityError } = await supabase
          .from('ticket_availabilities')
          .select('id,date,time_slot,total_capacity,reserved_capacity,sold_capacity')
          .eq('ticket_id', ticketId)
          .eq('date', dateIso)
          .order('time_slot', { ascending: true, nullsFirst: true });

        if (availabilityError) throw availabilityError;
        setSlots((availabilityData ?? []) as AvailabilityRow[]);
      } catch {
        setErrorMessage('Gagal memuat detail booking.');
        setSlots([]);
      } finally {
        setLoading(false);
      }
    };

    void run();
  }, [dateIso, ticketId]);

  const availableSlots = useMemo(() => {
    return slots
      .map((slot) => {
        const remaining =
          toNumber(slot.total_capacity) - toNumber(slot.reserved_capacity) - toNumber(slot.sold_capacity);
        return { ...slot, remaining };
      })
      .filter((slot) => slot.remaining > 0);
  }, [slots]);

  useEffect(() => {
    if (selectedAvailabilityId && availableSlots.some((x) => String(x.id) === selectedAvailabilityId)) return;
    setSelectedAvailabilityId(availableSlots.length > 0 ? String(availableSlots[0].id) : null);
  }, [availableSlots, selectedAvailabilityId]);

  const total = toNumber(ticket?.price, 0);

  const handleProceedToPayment = async () => {
    if (!supabase) {
      setErrorMessage('Supabase belum terkonfigurasi.');
      return;
    }
    if (!user?.email) {
      navigate('/login');
      return;
    }
    if (!ticketId || !dateIso || !selectedAvailabilityId) {
      setErrorMessage('Tanggal atau sesi belum dipilih.');
      return;
    }

    const chosen = availableSlots.find((x) => String(x.id) === selectedAvailabilityId);
    if (!chosen) {
      setErrorMessage('Sesi yang dipilih sudah tidak tersedia.');
      return;
    }

    try {
      setSubmitting(true);
      setErrorMessage(null);

      const { data: appUser, error: appUserError } = await supabase
        .from('users')
        .select('id,name,email')
        .eq('email', user.email)
        .maybeSingle();

      if (appUserError) throw appUserError;
      if (!appUser) {
        setErrorMessage('Akun kamu belum terdaftar di database aplikasi.');
        return;
      }

      const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
      const { data: reservation, error: reservationError } = await supabase
        .from('reservations')
        .insert({
          user_id: (appUser as AppUserRow).id,
          ticket_id: ticketId,
          selected_date: dateIso,
          selected_time_slots: chosen.time_slot ? { time_slot: chosen.time_slot } : null,
          quantity: 1,
          status: 'pending',
          expires_at: expiresAt,
        })
        .select('id')
        .single();

      if (reservationError) throw reservationError;

      navigate('/payment', {
        state: {
          reservationId: reservation?.id,
          ticketName: ticket?.name,
          totalAmount: total,
          dateIso,
          timeSlotValue: chosen.time_slot,
        },
      });
    } catch {
      setErrorMessage('Gagal membuat reservasi.');
    } finally {
      setSubmitting(false);
    }
  };

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
            Secure your spot at our premium studio. Select your preferred date and time to begin your high-end professional photography experience.
          </p>
        </div>

        {!ticketId || !dateIso ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-6 py-5 text-amber-900 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-100">
            <p className="text-sm font-bold">Data booking tidak ditemukan.</p>
            <button
              onClick={() => navigate('/calendar')}
              className="mt-4 inline-flex items-center rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white hover:bg-red-700 transition-colors"
            >
              Kembali ke kalender
            </button>
          </div>
        ) : (
          <>
            {errorMessage ? (
              <div className="mb-8 rounded-xl border border-amber-200 bg-amber-50 px-6 py-5 text-amber-900 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-100">
                <p className="text-sm font-bold">{errorMessage}</p>
              </div>
            ) : null}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          <div className="lg:col-span-2 flex flex-col gap-10">
            <div className="bg-white dark:bg-[#1a0c0c] rounded-xl shadow-sm border border-[#f4e7e7] dark:border-[#3d2424] p-8">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-widest text-primary/60">Selected Date</p>
                  <h3 className="text-2xl font-black mt-1">{dateLabel}</h3>
                </div>
                <button
                  onClick={() => navigate('/calendar')}
                  className="inline-flex items-center justify-center rounded-lg border border-primary/20 px-4 py-2 text-sm font-bold text-primary hover:bg-primary/5 transition-colors"
                >
                  Change Date
                </button>
              </div>
            </div>

            <div className="bg-white dark:bg-[#1a0c0c] rounded-xl shadow-sm border border-[#f4e7e7] dark:border-[#3d2424] p-8">
              <h3 className="text-xl font-bold mb-6">Available Time Slots</h3>
              {loading ? (
                <div className="text-sm text-gray-500 dark:text-gray-400">Loading time slots...</div>
              ) : availableSlots.length === 0 ? (
                <div className="text-sm text-gray-500 dark:text-gray-400">No slots available for this date.</div>
              ) : (
                <div className="flex flex-wrap gap-3">
                  {availableSlots.map((slot) => {
                    const checked = selectedAvailabilityId === String(slot.id);
                    return (
                      <button
                        key={String(slot.id)}
                        onClick={() => setSelectedAvailabilityId(String(slot.id))}
                        className={`px-6 py-3 rounded-lg text-sm font-medium transition-all
                          ${checked
                            ? 'border-2 border-primary bg-primary/5 text-primary font-bold'
                            : 'border border-[#e8cece] dark:border-[#3d2424] hover:border-primary'
                          }
                        `}
                      >
                        {formatTime(slot.time_slot)}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Summary & Payment */}
          <div className="flex flex-col gap-6">
            <div className="bg-white dark:bg-[#1a0c0c] rounded-xl shadow-xl border border-[#f4e7e7] dark:border-[#3d2424] p-8 sticky top-28 overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-bl-full pointer-events-none"></div>
              
              <h3 className="text-2xl font-black mb-8 border-b border-background-light dark:border-background-dark pb-4 italic">
                Booking Summary
              </h3>

              <div className="space-y-6 mb-8">
                <div className="flex items-start gap-4">
                  <span className="material-symbols-outlined text-primary">photo_camera</span>
                  <div>
                    <p className="text-sm font-bold uppercase tracking-tighter opacity-60">Session Type</p>
                    <p className="font-display font-medium">{ticket?.name ?? state?.ticketName ?? 'Entrance Ticket'}</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <span className="material-symbols-outlined text-primary">event</span>
                  <div>
                    <p className="text-sm font-bold uppercase tracking-tighter opacity-60">Date</p>
                    <p className="font-display font-medium">{dateLabel}</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <span className="material-symbols-outlined text-primary">schedule</span>
                  <div>
                    <p className="text-sm font-bold uppercase tracking-tighter opacity-60">Time</p>
                    <p className="font-display font-medium">
                      {formatTime(
                        availableSlots.find((x) => String(x.id) === selectedAvailabilityId)?.time_slot ?? state?.timeSlotValue
                      )}
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-background-light dark:border-background-dark space-y-4">
                <div className="flex justify-between text-sm">
                  <span>Ticket Price</span>
                  <span className="font-bold">IDR {total.toLocaleString('id-ID')}</span>
                </div>
                <div className="flex justify-between text-xl font-black pt-4 border-t border-dashed border-[#e8cece] dark:border-[#3d2424]">
                  <span className="uppercase tracking-tighter">Total</span>
                  <span className="text-primary">IDR {total.toLocaleString('id-ID')}</span>
                </div>
              </div>

              <button 
                onClick={() => void handleProceedToPayment()}
                disabled={submitting || !selectedAvailabilityId || total <= 0}
                className="w-full mt-8 bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-white py-5 rounded-lg font-black uppercase tracking-widest text-sm shadow-xl shadow-primary/30 transition-all active:scale-95"
              >
                {submitting ? 'Processing...' : 'Proceed to Payment'}
              </button>

              <p className="text-[10px] text-center mt-6 opacity-50 font-sans uppercase tracking-widest">
                Secure Encrypted Checkout
              </p>
            </div>

            {/* Additional Info Card */}
            <div className="bg-primary/5 rounded-xl p-6 border border-primary/10">
              <div className="flex gap-4 items-center mb-3">
                <span className="material-symbols-outlined text-primary">info</span>
                <h4 className="font-bold text-sm uppercase tracking-widest">Important Info</h4>
              </div>
              <ul className="text-xs space-y-2 font-sans opacity-80 leading-relaxed">
                <li>• Please arrive 15 minutes before your slot.</li>
                <li>• Cancellation required 48 hours in advance.</li>
                <li>• All raw files included in package.</li>
              </ul>
            </div>
          </div>
        </div>
          </>
        )}
      </main>
    </div>
  );
}
