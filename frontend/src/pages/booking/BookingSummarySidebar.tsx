import { m } from 'framer-motion';
import type { BookingPageSettings } from '../../hooks/useBookingPageSettings';
import type { Ticket } from '../../hooks/useTickets';
import { formatCurrency } from '../../utils/formatters';

type BookingSummarySidebarProps = {
  copy: Pick<
    BookingPageSettings,
    | 'booking_summary_title'
    | 'ticket_type_label'
    | 'date_label'
    | 'time_label'
    | 'not_selected_label'
    | 'all_day_access_value_label'
    | 'quantity_label'
    | 'max_tickets_label_template'
    | 'total_label'
    | 'proceed_button_label'
    | 'secure_checkout_label'
    | 'important_info_title'
    | 'important_info_items'
  >;
  ticket: Ticket;
  selectedDate: Date | null;
  selectedTime: string | null;
  isAllDayTicket: boolean;
  quantity: number;
  maxTickets: number;
  price: number;
  total: number;
  getMinutesUntilClose: (timeSlot: string) => number | null;
  getSlotUrgency: (timeSlot: string) => 'none' | 'low' | 'medium' | 'high';
  onDecreaseQuantity: () => void;
  onIncreaseQuantity: () => void;
  onProceed: () => void;
};

export function BookingSummarySidebar(props: BookingSummarySidebarProps) {
  const {
    copy,
    ticket,
    selectedDate,
    selectedTime,
    isAllDayTicket,
    quantity,
    maxTickets,
    price,
    total,
    getMinutesUntilClose,
    getSlotUrgency,
    onDecreaseQuantity,
    onIncreaseQuantity,
    onProceed,
  } = props;
  const maxTicketsLabel = copy.max_tickets_label_template.replace('{count}', String(maxTickets));

  return (
    <div className="flex flex-col gap-6">
      <div className="bg-white rounded-xl shadow-xl border border-rose-50 p-8 lg:sticky lg:top-28 overflow-hidden z-10">
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-bl-full pointer-events-none"></div>

        <h3 className="text-2xl font-black mb-8 border-b border-background-light pb-4 italic">{copy.booking_summary_title}</h3>

        <div className="space-y-6 mb-8">
          <div className="flex items-start gap-4">
            <span className="material-symbols-outlined text-primary">confirmation_number</span>
            <div>
              <p className="text-sm font-bold uppercase tracking-tighter opacity-60">{copy.ticket_type_label}</p>
              <p className="font-display font-medium">{ticket.name}</p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <span className="material-symbols-outlined text-primary">event</span>
            <div>
              <p className="text-sm font-bold uppercase tracking-tighter opacity-60">{copy.date_label}</p>
              <p className="font-display font-medium">
                {selectedDate
                  ? selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })
                  : copy.not_selected_label}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <span className="material-symbols-outlined text-primary">schedule</span>
            <div className="flex-1">
              <p className="text-sm font-bold uppercase tracking-tighter opacity-60">{copy.time_label}</p>
              <p className="font-display font-medium">
                {selectedTime ? selectedTime.substring(0, 5) : isAllDayTicket ? copy.all_day_access_value_label : copy.not_selected_label}
              </p>

              {selectedTime && (() => {
                const urgency = getSlotUrgency(selectedTime);
                const minutesLeft = getMinutesUntilClose(selectedTime);

                if (urgency === 'high' && minutesLeft !== null) {
                  return (
                    <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
                      <div className="flex items-start gap-1">
                        <span className="material-symbols-outlined text-sm">warning</span>
                        <div>
                          <p className="font-bold">Session ends in {minutesLeft} minutes!</p>
                          <p className="mt-1 opacity-80">Complete payment quickly to secure your booking.</p>
                        </div>
                      </div>
                    </div>
                  );
                }

                if (urgency === 'medium' && minutesLeft !== null) {
                  return (
                    <div className="mt-2 p-2 bg-orange-50 border border-orange-200 rounded text-xs text-orange-700">
                      <div className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-sm">schedule</span>
                        <span>Session ends in {minutesLeft} minutes</span>
                      </div>
                    </div>
                  );
                }

                if (urgency === 'low' && minutesLeft !== null) {
                  return (
                    <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-700">
                      <div className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-sm">info</span>
                        <span>Session ends in {minutesLeft} minutes</span>
                      </div>
                    </div>
                  );
                }

                return null;
              })()}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-background-light">
          <div>
            <p className="text-sm font-bold uppercase tracking-tighter opacity-60">{copy.quantity_label}</p>
            <p className="text-xs text-gray-500">{maxTicketsLabel}</p>
          </div>
          <div className="flex items-center gap-3">
            <m.button
              onClick={onDecreaseQuantity}
              disabled={quantity <= 1}
              whileTap={{ scale: 0.95 }}
              className="w-10 h-10 rounded-lg border border-[#e8cece] flex items-center justify-center text-primary font-bold text-xl disabled:opacity-30 disabled:cursor-not-allowed hover:bg-primary/5 transition-colors"
            >
              −
            </m.button>
            <span className="w-8 text-center font-black text-xl">{quantity}</span>
            <m.button
              onClick={onIncreaseQuantity}
              disabled={quantity >= maxTickets}
              whileTap={{ scale: 0.95 }}
              className="w-10 h-10 rounded-lg border border-[#e8cece] flex items-center justify-center text-primary font-bold text-xl disabled:opacity-30 disabled:cursor-not-allowed hover:bg-primary/5 transition-colors"
            >
              +
            </m.button>
          </div>
        </div>

        <div className="pt-6 border-t border-background-light space-y-4">
          <div className="flex justify-between text-sm">
            <span>{quantity} × {formatCurrency(price)}</span>
            <span className="font-bold">{formatCurrency(total)}</span>
          </div>
          <div className="flex justify-between text-xl font-black pt-4 border-t border-dashed border-[#e8cece]">
            <span className="uppercase tracking-tighter">{copy.total_label}</span>
            <span className="text-primary">{formatCurrency(total)}</span>
          </div>
        </div>

        <m.button
          onClick={onProceed}
          disabled={!selectedDate || (!selectedTime && !isAllDayTicket)}
          whileTap={{ scale: 0.98 }}
          className="w-full mt-8 bg-[#ff4b86] hover:bg-[#e63d75] text-white py-5 rounded-lg font-black uppercase tracking-widest text-sm shadow-xl shadow-primary/30 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {copy.proceed_button_label}
        </m.button>

        <p className="text-[10px] text-center mt-6 opacity-50 font-sans uppercase tracking-widest">{copy.secure_checkout_label}</p>
      </div>

      <div className="bg-background-light rounded-xl p-6 border border-primary/10 relative z-0">
        <div className="flex gap-4 items-center mb-3">
          <span className="material-symbols-outlined text-primary">info</span>
          <h4 className="font-bold text-sm uppercase tracking-widest">{copy.important_info_title}</h4>
        </div>
        <ul className="text-xs space-y-2 font-sans opacity-80 leading-relaxed">
          {copy.important_info_items.map((item, index) => (
            <li
              key={`${item}-${index}`}
              className={index === copy.important_info_items.length - 1 ? 'text-red-600 font-semibold' : undefined}
            >
              • {item}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
