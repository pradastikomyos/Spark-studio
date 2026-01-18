import { useNavigate } from 'react-router-dom';
import { TicketData } from '../types';

interface TicketCardProps {
  ticket: TicketData;
}

const TicketCard = ({ ticket }: TicketCardProps) => {
  const navigate = useNavigate();

  const handleBookNow = () => {
    navigate('/booking', {
      state: {
        ticketType: 'All Access Pass',
        ticketPrice: 250,
        date: `${ticket.month} ${ticket.day}`
      }
    });
  };

  return (
    <div className="group relative bg-surface-light dark:bg-surface-dark border border-gray-100 dark:border-white/5 p-8 hover:border-primary/50 transition-colors duration-300">
      <div className="absolute top-0 left-0 w-full h-1 bg-primary transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300"></div>
      <div className="flex justify-between items-start mb-6">
        <div>
          <span className="block text-xs font-bold text-subtext-light dark:text-subtext-dark uppercase tracking-wider mb-1">
            {ticket.month}
          </span>
          <span className="block text-4xl font-display font-bold text-text-light dark:text-white">
            {ticket.day}
          </span>
        </div>
        {ticket.isToday && (
          <span className="px-2 py-1 bg-primary text-white text-[10px] font-bold uppercase tracking-wide">
            Today
          </span>
        )}
      </div>
      <h3 className="font-display text-xl text-text-light dark:text-white mb-2 group-hover:text-primary transition-colors">
        All Access Pass
      </h3>
      <p className="text-sm text-subtext-light dark:text-subtext-dark mb-8 font-light">
        Includes lighting equipment & stage props.
      </p>
      <button 
        onClick={handleBookNow}
        className="w-full py-3 border border-gray-200 dark:border-white/10 text-xs font-bold uppercase tracking-widest hover:bg-primary hover:border-primary hover:text-white transition-all duration-300 flex justify-center items-center gap-2"
      >
        Book Now
      </button>
    </div>
  );
};

export default TicketCard;
