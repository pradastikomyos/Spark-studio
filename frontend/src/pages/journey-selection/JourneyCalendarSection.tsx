import type { CalendarDay } from './journeySelectionTypes';

type JourneyCalendarSectionProps = {
  monthName: string;
  canGoPrevMonth: boolean;
  canGoNextMonth: boolean;
  calendarDays: Array<CalendarDay | null>;
  selectedDate: Date | null;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onSelectDate: (date: Date) => void;
};

export function JourneyCalendarSection({
  monthName,
  canGoPrevMonth,
  canGoNextMonth,
  calendarDays,
  selectedDate,
  onPrevMonth,
  onNextMonth,
  onSelectDate,
}: JourneyCalendarSectionProps) {
  return (
    <div className="bg-gray-50 rounded-xl p-8 border border-gray-200">
      <div className="flex items-center justify-between mb-8">
        <h3 className="text-xl font-bold uppercase tracking-wider text-gray-400">{monthName}</h3>
        <div className="flex items-center gap-3">
          <button
            onClick={onPrevMonth}
            disabled={!canGoPrevMonth}
            className="p-2 rounded-lg hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            aria-label="Previous month"
          >
            <span className="material-symbols-outlined text-gray-700">chevron_left</span>
          </button>
          <button
            onClick={onNextMonth}
            disabled={!canGoNextMonth}
            className="p-2 rounded-lg hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            aria-label="Next month"
          >
            <span className="material-symbols-outlined text-gray-700">chevron_right</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-2">
        {['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'].map((day) => (
          <div key={day} className="text-gray-500 text-xs font-bold uppercase flex h-10 items-center justify-center">
            {day}
          </div>
        ))}

        {calendarDays.map((dayData, index) => {
          if (!dayData) {
            return <div key={`empty-${index}`} className="h-14 w-full"></div>;
          }

          const isSelected = selectedDate?.toDateString() === dayData.date.toDateString();

          return (
            <button
              key={dayData.day}
              onClick={() => {
                if (!dayData.isDisabled) onSelectDate(dayData.date);
              }}
              disabled={dayData.isDisabled}
              className={`h-14 w-full text-2xl font-bold rounded-lg flex items-center justify-center transition-all
                ${isSelected ? 'bg-main-600 text-white shadow-lg' : ''}
                ${dayData.isDisabled ? 'opacity-20 cursor-not-allowed' : 'hover:bg-gray-200'}
              `}
            >
              {dayData.day}
            </button>
          );
        })}
      </div>
    </div>
  );
}
