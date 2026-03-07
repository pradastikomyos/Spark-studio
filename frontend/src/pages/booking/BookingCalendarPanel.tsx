import { m } from 'framer-motion';
import type { CalendarDay } from './bookingTypes';

type BookingCalendarPanelProps = {
  monthName: string;
  calendarDays: (CalendarDay | null)[];
  selectedDate: Date | null;
  canGoPrevMonth: boolean;
  canGoNextMonth: boolean;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onSelectDate: (date: Date) => void;
};

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function BookingCalendarPanel(props: BookingCalendarPanelProps) {
  const {
    monthName,
    calendarDays,
    selectedDate,
    canGoPrevMonth,
    canGoNextMonth,
    onPrevMonth,
    onNextMonth,
    onSelectDate,
  } = props;

  return (
    <div className="bg-white#1a0c0c] rounded-xl shadow-sm border border-[#f4e7e7]#3d2424] p-8">
      <div className="flex items-center justify-between mb-8">
        <h3 className="text-xl font-bold">Select Date</h3>
        <div className="flex items-center gap-3">
          <button
            onClick={onPrevMonth}
            disabled={!canGoPrevMonth}
            className="p-2 rounded-lg hover:bg-primary/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            aria-label="Previous month"
          >
            <span className="material-symbols-outlined text-primary">chevron_left</span>
          </button>
          <p className="text-lg font-bold uppercase tracking-tighter text-primary min-w-[140px] text-center">{monthName}</p>
          <button
            onClick={onNextMonth}
            disabled={!canGoNextMonth}
            className="p-2 rounded-lg hover:bg-primary/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            aria-label="Next month"
          >
            <span className="material-symbols-outlined text-primary">chevron_right</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-2">
        {WEEKDAYS.map((day) => (
          <div key={day} className="text-primary text-xs font-black uppercase flex h-10 items-center justify-center opacity-40">
            {day}
          </div>
        ))}

        {calendarDays.map((dayData, index) => {
          if (!dayData) {
            return <div key={`empty-${index}`} className="h-14 w-full"></div>;
          }

          const isSelected = selectedDate?.toDateString() === dayData.date.toDateString();

          return (
            <m.button
              key={`${dayData.date.toISOString()}-${dayData.day}`}
              onClick={() => {
                if (!dayData.isDisabled) {
                  onSelectDate(dayData.date);
                }
              }}
              disabled={dayData.isDisabled}
              whileTap={{ scale: 0.98 }}
              className={`h-14 w-full text-sm font-medium rounded-lg flex items-center justify-center transition-all
                ${isSelected ? 'bg-primary text-white font-bold shadow-lg shadow-primary/20' : ''}
                ${dayData.isDisabled ? 'opacity-20 cursor-not-allowed' : 'hover:bg-primary/5'}
              `}
            >
              {dayData.day}
            </m.button>
          );
        })}
      </div>
    </div>
  );
}
