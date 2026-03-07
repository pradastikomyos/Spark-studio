import { useNavigate } from 'react-router-dom';

type BookingSuccessActionsProps = {
  hasTickets: boolean;
};

export function BookingSuccessActions({ hasTickets }: BookingSuccessActionsProps) {
  const navigate = useNavigate();

  return (
    <>
      {hasTickets && (
        <div className="flex justify-center mt-10 px-4">
          <button
            onClick={() => navigate('/my-tickets')}
            className="flex items-center justify-center gap-2 min-w-[200px] h-14 rounded-xl bg-[#ff4b86] text-white font-bold text-lg hover:bg-[#e63d75] transition-all shadow-xl shadow-primary/30"
          >
            <span className="material-symbols-outlined">confirmation_number</span>
            View My Tickets
          </button>
        </div>
      )}

      <div className="mt-12 text-center pb-12">
        <button onClick={() => navigate('/')} className="text-[#9c4949] hover:text-primary transition-colors text-sm underline underline-offset-4">
          Back to Home
        </button>
      </div>
    </>
  );
}
