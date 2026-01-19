import { useNavigate } from 'react-router-dom';
import { TicketData } from '../types';

interface TicketCardProps {
  ticket: TicketData;
  displayDate: Date;
  isToday?: boolean;
  isBookable?: boolean;
}

const TicketCard = ({ ticket, displayDate, isToday, isBookable = true }: TicketCardProps) => {
  const navigate = useNavigate();

  const handleBookNow = () => {
    if (!isBookable) return;
    navigate(`/booking/${ticket.slug}`);
  };

  const month = displayDate.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
  const day = displayDate.getDate();

  return (
    <div className="group relative bg-surface-light dark:bg-surface-dark border border-gray-100 dark:border-white/5 p-8 hover:border-primary/50 transition-colors duration-300">
      <div className="absolute top-0 left-0 w-full h-1 bg-primary transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300"></div>
      <div className="flex justify-between items-start mb-6">
        <div>
          <span className="block text-xs font-bold text-subtext-light dark:text-subtext-dark uppercase tracking-wider mb-1">
            {month}
          </span>
          <span className="block text-4xl font-display font-bold text-text-light dark:text-white">
            {day}
          </span>
        </div>
        {isToday && (
          <span className="px-2 py-1 bg-primary text-white text-[10px] font-bold uppercase tracking-wide">
            Today
          </span>
        )}
      </div>
      <h3 className="font-display text-xl text-text-light dark:text-white mb-2 group-hover:text-primary transition-colors">
        {ticket.name}
      </h3>
      <p className="text-sm text-subtext-light dark:text-subtext-dark mb-8 font-light">
        {ticket.description || 'Includes lighting equipment & stage props.'}
      </p>
      <button 
        onClick={handleBookNow}
        disabled={!isBookable}
        className={`w-full py-3 border text-xs font-bold uppercase tracking-widest flex justify-center items-center gap-2 transition-all duration-300 ${
          isBookable 
            ? 'border-gray-200 dark:border-white/10 hover:bg-primary hover:border-primary hover:text-white cursor-pointer' 
            : 'border-gray-300 dark:border-white/5 text-gray-400 dark:text-gray-600 cursor-not-allowed hover:bg-gray-100 dark:hover:bg-gray-900'
        }`}
      >
        Book Now
      </button>
    </div>
  );
};

export default TicketCard;
