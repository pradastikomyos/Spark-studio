import type { BookingPageSettings } from '../../hooks/useBookingPageSettings';
import { formatCurrency } from '../../utils/formatters';
import type { TicketData } from '../../types';

type JourneySummaryCardProps = {
  copy: Pick<
    BookingPageSettings,
    | 'booking_summary_title'
    | 'ticket_type_label'
    | 'date_label'
    | 'time_label'
    | 'not_selected_label'
    | 'all_day_access_value_label'
    | 'ticket_price_label'
    | 'vat_included_label'
    | 'total_label'
    | 'proceed_button_label'
    | 'secure_checkout_label'
    | 'important_info_title'
    | 'important_info_items'
  >;
  ticket: TicketData;
  selectedDate: Date | null;
  selectedTime: string | null;
  isAllDayTicket: boolean;
  onProceed: () => void;
};

export function JourneySummaryCard({
  copy,
  ticket,
  selectedDate,
  selectedTime,
  isAllDayTicket,
  onProceed,
}: JourneySummaryCardProps) {
  const price = Number.parseFloat(ticket.price);
  const total = price;

  return (
    <div className="bg-white rounded-xl shadow-xl border border-gray-200 p-8 lg:sticky lg:top-28">
      <h3 className="text-2xl font-black mb-8 italic">{copy.booking_summary_title}</h3>

      <div className="space-y-6 mb-8">
        <div className="flex items-start gap-4">
          <span className="material-symbols-outlined text-main-600">confirmation_number</span>
          <div>
            <p className="text-sm font-bold uppercase tracking-tighter opacity-60">{copy.ticket_type_label}</p>
            <p className="font-medium">{ticket.name}</p>
          </div>
        </div>

        <div className="flex items-start gap-4">
          <span className="material-symbols-outlined text-main-600">event</span>
          <div>
            <p className="text-sm font-bold uppercase tracking-tighter opacity-60">{copy.date_label}</p>
            <p className="font-medium">
              {selectedDate
                ? selectedDate.toLocaleDateString('en-US', {
                    weekday: 'long',
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })
                : copy.not_selected_label}
            </p>
          </div>
        </div>

        <div className="flex items-start gap-4">
          <span className="material-symbols-outlined text-main-600">schedule</span>
          <div>
            <p className="text-sm font-bold uppercase tracking-tighter opacity-60">{copy.time_label}</p>
            <p className="font-medium">
              {selectedTime ? selectedTime.substring(0, 5) : isAllDayTicket ? copy.all_day_access_value_label : copy.not_selected_label}
            </p>
          </div>
        </div>
      </div>

      <div className="border-t border-gray-200 pt-6 mb-6 space-y-3">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">
            {copy.ticket_price_label} <span className="text-xs text-gray-500">{copy.vat_included_label}</span>
          </span>
          <span className="font-medium">{formatCurrency(price)}</span>
        </div>
        <div className="flex justify-between items-center pt-3 border-t border-gray-200">
          <span className="text-lg font-bold">{copy.total_label}</span>
          <span className="text-2xl font-black text-main-600">{formatCurrency(total)}</span>
        </div>
      </div>

      <button
        onClick={onProceed}
        disabled={!selectedDate || (!selectedTime && !isAllDayTicket)}
        className="w-full bg-main-600 hover:bg-main-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold py-4 rounded-lg transition-all shadow-lg"
      >
        {copy.proceed_button_label}
      </button>

      <p className="text-center text-xs text-gray-500 mt-4">{copy.secure_checkout_label}</p>

      <div className="mt-6 pt-6 border-t border-gray-200">
        <p className="text-xs font-bold uppercase tracking-wider text-gray-700 mb-3">{copy.important_info_title}</p>
        <ul className="space-y-2 text-xs text-gray-600">
          {copy.important_info_items.map((item, index) => (
            <li
              key={`${item}-${index}`}
              className={index === copy.important_info_items.length - 1 ? 'text-red-600 font-medium' : undefined}
            >
              • {item}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
