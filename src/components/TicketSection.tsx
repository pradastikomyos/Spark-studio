import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TicketCard from './TicketCard';
import { TicketData } from '../types';
import { supabase } from '../lib/supabase';

const TicketSection = () => {
  const navigate = useNavigate();

  const [tickets, setTickets] = useState<TicketData[]>([]);
  const [loading, setLoading] = useState(true);

  const todayIso = useMemo(() => {
    const now = new Date();
    const localMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return localMidnight.toISOString().slice(0, 10);
  }, []);

  useEffect(() => {
    const run = async () => {
      if (!supabase) {
        setTickets([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('ticket_availabilities')
          .select('date,tickets!inner(type)')
          .eq('tickets.type', 'entrance')
          .gte('date', todayIso)
          .order('date', { ascending: true })
          .limit(100);

        if (error) throw error;

        const uniqueDates = Array.from(
          new Set(
            (data ?? [])
              .map((row) => row.date)
              .filter((d): d is string => typeof d === 'string' && d.length > 0)
          )
        ).slice(0, 4);

        const mapped: TicketData[] = uniqueDates.map((dateStr) => {
          const d = new Date(`${dateStr}T00:00:00`);
          const month = d.toLocaleString('en-US', { month: 'short' });
          const day = d.getDate();
          const dayOfWeek = d.toLocaleString('en-US', { weekday: 'short' });
          return { month, day, dayOfWeek, isToday: dateStr === todayIso };
        });

        setTickets(mapped);
      } catch {
        setTickets([]);
      } finally {
        setLoading(false);
      }
    };

    void run();
  }, [todayIso]);

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
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white/70 dark:bg-white/5 p-6 animate-pulse"
            >
              <div className="h-8 w-24 bg-gray-200 dark:bg-white/10 rounded mb-3" />
              <div className="h-12 w-16 bg-gray-200 dark:bg-white/10 rounded mb-6" />
              <div className="h-4 w-32 bg-gray-200 dark:bg-white/10 rounded" />
            </div>
          ))}
        </div>
      ) : tickets.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {tickets.map((ticket, index) => (
            <TicketCard key={index} ticket={ticket} />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#1a0f0f] p-8">
          <p className="text-sm text-gray-600 dark:text-gray-300 font-medium">
            Jadwal tiket belum tersedia saat ini.
          </p>
          <button
            onClick={() => navigate('/calendar')}
            className="mt-4 inline-flex items-center rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white hover:bg-red-700 transition-colors"
          >
            Lihat kalender
          </button>
        </div>
      )}
    </section>
  );
};

export default TicketSection;
