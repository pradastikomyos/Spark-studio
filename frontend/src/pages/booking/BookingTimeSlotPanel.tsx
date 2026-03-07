import { m } from 'framer-motion';
import { SESSION_DURATION_MINUTES } from '../../utils/timezone';
import type { BookableSlotViewModel, GroupedBookableSlots } from './bookingTypes';

type BookingTimeSlotPanelProps = {
  selectedDate: Date | null;
  isAllDayTicket: boolean;
  selectedTime: string | null;
  availableTimeSlots: BookableSlotViewModel[];
  groupedSlots: GroupedBookableSlots;
  getMinutesUntilClose: (timeSlot: string) => number | null;
  getSlotUrgency: (timeSlot: string) => 'none' | 'low' | 'medium' | 'high';
  onSelectTime: (time: string | null) => void;
};

const PERIOD_NAMES: Record<keyof GroupedBookableSlots, string> = {
  morning: 'Morning (09:00 - 11:30)',
  afternoon1: 'Afternoon Early (12:00 - 14:30)',
  afternoon2: 'Afternoon Late (15:00 - 17:30)',
  evening: 'Evening (18:00 - 20:30)',
};

export function BookingTimeSlotPanel(props: BookingTimeSlotPanelProps) {
  const {
    selectedDate,
    isAllDayTicket,
    selectedTime,
    availableTimeSlots,
    groupedSlots,
    getMinutesUntilClose,
    getSlotUrgency,
    onSelectTime,
  } = props;

  if (!selectedDate) return null;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-rose-50 p-8">
      <h3 className="text-xl font-bold mb-6">{isAllDayTicket ? 'Access Type' : 'Available Time Slots'}</h3>

      {isAllDayTicket && (
        <div className="mb-6">
          <m.button
            onClick={() => onSelectTime(null)}
            whileTap={{ scale: 0.98 }}
            className={`w-full px-6 py-4 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-3
              ${!selectedTime ? 'border-2 border-primary bg-primary/5 text-primary font-bold' : 'border border-[#e8cece]#3d2424] hover:border-primary'}
            `}
          >
            <span className="material-symbols-outlined">calendar_today</span>
            All Day Access
            <span className="text-xs opacity-60">(Valid entire day)</span>
          </m.button>
        </div>
      )}

      {availableTimeSlots.length > 0 ? (
        <div className="space-y-6">
          {isAllDayTicket && (
            <p className="text-xs font-black uppercase tracking-widest text-primary/60 mb-2">Or choose specific time</p>
          )}
          {(Object.entries(groupedSlots) as Array<[keyof GroupedBookableSlots, BookableSlotViewModel[]]>).map(([period, slots]) => {
            if (slots.length === 0) return null;

            return (
              <div key={period}>
                <p className="text-xs font-black uppercase tracking-widest text-primary/60 mb-4">{PERIOD_NAMES[period] || period}</p>
                <div className="flex flex-wrap gap-3">
                  {slots.map((slot) => {
                    const isSelected = slot.time === selectedTime;
                    const urgency = slot.isPast ? 'none' : getSlotUrgency(slot.time);
                    const minutesLeft = slot.isPast ? null : getMinutesUntilClose(slot.time);

                    return (
                      <div key={slot.time} className="relative">
                        <m.button
                          onClick={() => !slot.isPast && onSelectTime(slot.time)}
                          disabled={slot.isPast}
                          whileTap={slot.isPast ? {} : { scale: 0.98 }}
                          className={`px-6 py-3 rounded-lg text-sm font-medium transition-all relative
                            ${slot.isPast
                              ? 'opacity-40 cursor-not-allowed bg-gray-100 border border-gray-300 line-through'
                              : isSelected
                                ? 'border-2 border-primary bg-primary/5 text-primary font-bold'
                                : 'border border-[#e8cece]#3d2424] hover:border-primary'
                            }
                          `}
                        >
                          {slot.time.substring(0, 5)}
                          <span className="text-xs ml-2 opacity-60">{slot.isPast ? '(Session ended)' : `(${slot.available} left)`}</span>

                          {!slot.isPast && minutesLeft !== null && minutesLeft <= SESSION_DURATION_MINUTES && (
                            <span
                              className={`absolute -top-2 -right-2 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider
                                ${urgency === 'high' ? 'bg-red-500 text-white animate-pulse' : ''}
                                ${urgency === 'medium' ? 'bg-orange-500 text-white' : ''}
                                ${urgency === 'low' ? 'bg-yellow-500 text-black' : ''}
                                ${urgency === 'none' ? 'bg-green-500 text-white' : ''}
                              `}
                            >
                              {minutesLeft}m
                            </span>
                          )}

                          {slot.isPast && (
                            <span className="absolute -top-2 -right-2 px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-400 text-white">
                              Ended
                            </span>
                          )}
                        </m.button>

                        {!slot.isPast && urgency === 'high' && minutesLeft !== null && (
                          <div className="hidden md:block absolute top-full mt-2 left-1/2 -translate-x-1/2 z-10 w-48 bg-red-50 border border-red-200 rounded-lg p-2 text-xs text-red-700">
                            <div className="flex items-start gap-1">
                              <span className="material-symbols-outlined text-sm">warning</span>
                              <span>Session ends in {minutesLeft} min. Complete payment quickly!</span>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      ) : !isAllDayTicket ? (
        <p className="text-gray-500 text-center py-8">No available time slots for this date</p>
      ) : null}
    </div>
  );
}
