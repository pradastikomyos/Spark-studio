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
    navigate('/journey');
  };

  const month = displayDate.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
  const day = displayDate.getDate();

  return (
    <div className="relative border border-gray-300 bg-gray-200 overflow-hidden">
      <div className="px-3 py-2 text-xs font-semibold text-gray-900">{ticket.name}</div>
      <div className="h-28 bg-gray-300 flex items-center justify-center">
        <span className="material-symbols-outlined text-5xl text-gray-400">image</span>
      </div>
      <div className="px-3 py-2 flex items-center justify-between gap-3 bg-gray-200">
        <div className="min-w-0">
          <p className="text-[11px] text-gray-600 font-semibold uppercase tracking-widest">
            {month} {day}
          </p>
          {isToday ? <p className="text-[10px] text-main-700 font-bold uppercase tracking-widest">Today</p> : null}
        </div>
        <button
          onClick={handleBookNow}
          disabled={!isBookable}
          className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-widest border ${
            isBookable ? 'border-main-700 bg-main-600 text-white hover:bg-main-700' : 'border-gray-300 bg-gray-100 text-gray-400 cursor-not-allowed'
          }`}
          type="button"
        >
          Book
        </button>
      </div>
    </div>
  );
};

export default TicketCard;
