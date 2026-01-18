import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

interface LocationState {
  reservationId?: string | number;
}

export default function BookingSuccessPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as LocationState;

  type ReservationRow = {
    id: string | number;
    selected_date: string;
    selected_time_slots: unknown;
    status: string;
    users?: { name: string; email: string } | Array<{ name: string; email: string }> | null;
    tickets?: { name: string } | Array<{ name: string }> | null;
  };

  const reservationId = state?.reservationId;
  const [reservation, setReservation] = useState<ReservationRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      if (!reservationId) {
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
        const { data, error } = await supabase
          .from('reservations')
          .select('id,selected_date,selected_time_slots,status,users(name,email),tickets(name)')
          .eq('id', reservationId)
          .maybeSingle();
        if (error) throw error;
        setReservation((data as unknown as ReservationRow) ?? null);
      } catch {
        setReservation(null);
        setErrorMessage('Gagal memuat data booking.');
      } finally {
        setLoading(false);
      }
    };

    void run();
  }, [reservationId]);

  const bookingId = useMemo(() => {
    if (!reservation) return '';
    return `RES-${reservation.id}`;
  }, [reservation]);

  const ticketInfo = reservation?.tickets
    ? Array.isArray(reservation.tickets)
      ? reservation.tickets[0] ?? null
      : reservation.tickets
    : null;

  const userInfo = reservation?.users
    ? Array.isArray(reservation.users)
      ? reservation.users[0] ?? null
      : reservation.users
    : null;

  const ticketType = ticketInfo?.name ?? 'Entrance Ticket';
  const customerName = userInfo?.name ?? '';
  const bookingDate = reservation?.selected_date
    ? new Date(`${reservation.selected_date}T00:00:00`).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : '';
  const timeSlot = (() => {
    const value = reservation?.selected_time_slots;
    if (!value) return 'All Day';
    if (typeof value === 'object' && value && 'time_slot' in value) {
      const raw = (value as { time_slot?: unknown }).time_slot;
      return typeof raw === 'string' ? raw.slice(0, 5) : 'All Day';
    }
    return 'All Day';
  })();

  const handlePrint = () => {
    window.print();
  };

  const handleEmail = () => {
    alert('Ticket has been sent to your email!');
  };

  const handleDownloadPDF = () => {
    alert('PDF download started!');
  };

  const handleSaveToGallery = () => {
    alert('Ticket saved to your gallery!');
  };

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark">
      <main className="flex-1 flex justify-center py-12 px-4">
        <div className="layout-content-container flex flex-col max-w-[800px] flex-1">
          {!reservationId ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-6 py-5 text-amber-900 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-100">
              <p className="text-sm font-bold">Data booking tidak ditemukan.</p>
              <button
                onClick={() => navigate('/calendar')}
                className="mt-4 inline-flex items-center rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white hover:bg-red-700 transition-colors"
              >
                Kembali ke kalender
              </button>
            </div>
          ) : loading ? (
            <div className="rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#1a0f0f] p-8 animate-pulse">
              <div className="h-8 w-40 bg-gray-200 dark:bg-white/10 rounded mb-4" />
              <div className="h-4 w-2/3 bg-gray-200 dark:bg-white/10 rounded mb-2" />
              <div className="h-4 w-1/2 bg-gray-200 dark:bg-white/10 rounded" />
            </div>
          ) : errorMessage ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-6 py-5 text-amber-900 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-100">
              <p className="text-sm font-bold">{errorMessage}</p>
              <button
                onClick={() => navigate('/calendar')}
                className="mt-4 inline-flex items-center rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white hover:bg-red-700 transition-colors"
              >
                Kembali ke kalender
              </button>
            </div>
          ) : (
            <>
          {/* Celebration Section */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center p-3 mb-4 rounded-full bg-primary/10 text-primary">
              <span className="material-symbols-outlined text-4xl">check_circle</span>
            </div>
            <h1 className="text-[#1c0d0d] dark:text-white tracking-tight text-4xl md:text-5xl font-bold leading-tight pb-3 font-display">
              Thank You!
            </h1>
            <p className="text-[#9c4949] dark:text-red-200 text-lg font-normal leading-normal max-w-xl mx-auto px-4">
              Your session is locked in. We can't wait to see your vision come to life at Spark Photo Studio.
            </p>
          </div>

          {/* Digital Ticket Card */}
          <div className="relative bg-white dark:bg-background-dark/80 rounded-xl shadow-2xl overflow-hidden border border-[#f4e7e7] dark:border-[#3d2020]">
            {/* Decorative Header */}
            <div className="h-2 bg-primary"></div>

            <div className="p-8 md:p-12 flex flex-col md:flex-row gap-10">
              {/* Left Side: QR Code */}
              <div className="flex flex-col items-center justify-center flex-shrink-0">
                <div className="p-4 bg-white rounded-xl border-4 border-primary/10 shadow-inner">
                  <div className="size-48 bg-white flex items-center justify-center">
                    {/* Mock QR Code */}
                    <div className="w-full h-full bg-slate-100 rounded flex items-center justify-center relative overflow-hidden">
                      <div 
                        className="absolute inset-0 opacity-20" 
                        style={{ 
                          backgroundImage: 'radial-gradient(#f20d0d 1px, transparent 1px)', 
                          backgroundSize: '8px 8px' 
                        }}
                      ></div>
                      <span className="material-symbols-outlined text-primary text-8xl">qr_code_2</span>
                    </div>
                  </div>
                </div>
                <p className="mt-4 text-xs font-mono text-[#9c4949] dark:text-red-300 tracking-widest uppercase">
                  ID: {bookingId}
                </p>
              </div>

              {/* Right Side: Details */}
              <div className="flex-1 space-y-6">
                <div>
                  <p className="text-primary text-sm font-bold uppercase tracking-widest mb-1">
                    Official Studio Pass
                  </p>
                  <h2 className="text-2xl font-bold font-display">{ticketType}</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 py-6 border-y border-[#f4e7e7] dark:border-[#3d2020]">
                  <div className="space-y-1">
                    <p className="text-[#9c4949] dark:text-red-300 text-xs font-medium uppercase">Customer</p>
                    <p className="text-lg font-bold">{customerName}</p>
                  </div>
                  <div className="space-y-1 text-right md:text-left">
                    <p className="text-[#9c4949] dark:text-red-300 text-xs font-medium uppercase">Session Date</p>
                    <p className="text-lg font-bold">{bookingDate}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[#9c4949] dark:text-red-300 text-xs font-medium uppercase">Time Slot</p>
                    <p className="text-lg font-bold">{timeSlot}</p>
                  </div>
                  <div className="space-y-1 text-right md:text-left">
                    <p className="text-[#9c4949] dark:text-red-300 text-xs font-medium uppercase">Studio Location</p>
                    <p className="text-lg font-bold">Studio A</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 bg-primary/5 p-4 rounded-lg border border-primary/10">
                  <span className="material-symbols-outlined text-primary">info</span>
                  <p className="text-sm text-[#1c0d0d] dark:text-red-100">
                    Please present this QR code at the reception. Arrive 15 minutes before your slot.
                  </p>
                </div>
              </div>
            </div>

            {/* Ticket Footer Action Strip */}
            <div className="bg-slate-50 dark:bg-black/20 p-6 border-t border-[#f4e7e7] dark:border-[#3d2020] flex flex-wrap items-center justify-between gap-4">
              <div className="flex gap-4">
                <button 
                  onClick={handlePrint}
                  className="flex items-center gap-2 text-[#9c4949] hover:text-primary transition-colors text-sm font-medium"
                >
                  <span className="material-symbols-outlined text-lg">print</span>
                  Print Receipt
                </button>
                <button 
                  onClick={handleEmail}
                  className="flex items-center gap-2 text-[#9c4949] hover:text-primary transition-colors text-sm font-medium"
                >
                  <span className="material-symbols-outlined text-lg">share</span>
                  Email Ticket
                </button>
              </div>
              <div className="flex items-center gap-2">
                <span className="size-2 bg-green-500 rounded-full"></span>
                <span className="text-sm font-bold text-green-600 uppercase">{reservation?.status ?? 'confirmed'}</span>
              </div>
            </div>
          </div>

          {/* Main Action Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-10 px-4">
            <button 
              onClick={handleDownloadPDF}
              className="flex items-center justify-center gap-2 min-w-[180px] h-14 rounded-xl bg-primary text-white font-bold text-lg hover:bg-primary/90 transition-all shadow-xl shadow-primary/30"
            >
              <span className="material-symbols-outlined">download</span>
              Download PDF
            </button>
            <button 
              onClick={handleSaveToGallery}
              className="flex items-center justify-center gap-2 min-w-[180px] h-14 rounded-xl bg-white dark:bg-background-dark border-2 border-primary text-primary font-bold text-lg hover:bg-primary/5 transition-all"
            >
              <span className="material-symbols-outlined">add_to_photos</span>
              Save to Gallery
            </button>
          </div>

          <div className="mt-12 text-center pb-12">
            <button
              onClick={() => navigate('/')}
              className="text-[#9c4949] dark:text-red-300 hover:text-primary transition-colors text-sm underline underline-offset-4"
            >
              Back to Studio Dashboard
            </button>
          </div>
            </>
          )}
        </div>
      </main>

      {/* Location Note Footer */}
      <footer className="text-center py-10 text-[#9c4949]/60 text-xs tracking-widest uppercase px-4 border-t border-[#f4e7e7] dark:border-[#3d2020]">
        Spark Photo Studio • 120 Editorial Way, Manhattan NY • (555) 012-3456
      </footer>
    </div>
  );
}
