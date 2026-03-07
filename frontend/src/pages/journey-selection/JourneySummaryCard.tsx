import { formatCurrency } from '../../utils/formatters';
import type { TicketData } from '../../types';

type JourneySummaryCardProps = {
  ticket: TicketData;
  selectedDate: Date | null;
  selectedTime: string | null;
  onProceed: () => void;
};

export function JourneySummaryCard({
  ticket,
  selectedDate,
  selectedTime,
  onProceed,
}: JourneySummaryCardProps) {
  const price = Number.parseFloat(ticket.price);
  const total = price;

  return (
    <div className="bg-white rounded-xl shadow-xl border border-gray-200 p-8 lg:sticky lg:top-28">
      <h3 className="text-2xl font-black mb-8 italic">Booking Summary</h3>

      <div className="space-y-6 mb-8">
        <div className="flex items-start gap-4">
          <span className="material-symbols-outlined text-main-600">confirmation_number</span>
          <div>
            <p className="text-sm font-bold uppercase tracking-tighter opacity-60">TICKET TYPE</p>
            <p className="font-medium">{ticket.name}</p>
          </div>
        </div>

        <div className="flex items-start gap-4">
          <span className="material-symbols-outlined text-main-600">event</span>
          <div>
            <p className="text-sm font-bold uppercase tracking-tighter opacity-60">DATE</p>
            <p className="font-medium">
              {selectedDate
                ? selectedDate.toLocaleDateString('en-US', {
                    weekday: 'long',
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })
                : 'Not selected'}
            </p>
          </div>
        </div>

        <div className="flex items-start gap-4">
          <span className="material-symbols-outlined text-main-600">schedule</span>
          <div>
            <p className="text-sm font-bold uppercase tracking-tighter opacity-60">TIME</p>
            <p className="font-medium">{selectedTime ? selectedTime.substring(0, 5) : 'Not selected'}</p>
          </div>
        </div>
      </div>

      <div className="border-t border-gray-200 pt-6 mb-6 space-y-3">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">
            Ticket Price <span className="text-xs text-gray-500">(VAT included)</span>
          </span>
          <span className="font-medium">{formatCurrency(price)}</span>
        </div>
        <div className="flex justify-between items-center pt-3 border-t border-gray-200">
          <span className="text-lg font-bold">TOTAL</span>
          <span className="text-2xl font-black text-main-600">{formatCurrency(total)}</span>
        </div>
      </div>

      <button
        onClick={onProceed}
        disabled={!selectedDate || !selectedTime}
        className="w-full bg-main-600 hover:bg-main-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold py-4 rounded-lg transition-all shadow-lg"
      >
        PROCEED TO PAYMENT
      </button>

      <p className="text-center text-xs text-gray-500 mt-4">SECURE ENCRYPTED CHECKOUT</p>

      <div className="mt-6 pt-6 border-t border-gray-200">
        <p className="text-xs font-bold uppercase tracking-wider text-gray-700 mb-3">IMPORTANT INFO</p>
        <ul className="space-y-2 text-xs text-gray-600">
          <li>• Please arrive 15 minutes before your slot.</li>
          <li>• Ticket is valid only for selected date and time.</li>
          <li className="text-red-600 font-medium">• Tiket tidak dapat di-refund atau di-reschedule.</li>
        </ul>
      </div>
    </div>
  );
}
