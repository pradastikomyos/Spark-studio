import { useNavigate } from 'react-router-dom';
import TicketCard from './TicketCard';
import { TicketData } from '../types';

const TicketSection = () => {
  const navigate = useNavigate();

  const tickets: TicketData[] = [
    { month: 'Jan', day: 17, dayOfWeek: 'Sat', isToday: true },
    { month: 'Jan', day: 18, dayOfWeek: 'Sun' },
    { month: 'Jan', day: 19, dayOfWeek: 'Mon' },
    { month: 'Jan', day: 20, dayOfWeek: 'Tue' },
  ];

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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {tickets.map((ticket, index) => (
          <TicketCard key={index} ticket={ticket} />
        ))}
      </div>
    </section>
  );
};

export default TicketSection;
