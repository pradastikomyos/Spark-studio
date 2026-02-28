import type { EventScheduleItem } from '../../hooks/useEventSchedule';

type EventScheduleCardProps = {
  item: EventScheduleItem;
  onClick?: () => void;
};

function getMonthLabel(dateIso: string): { month: string; day: number } {
  const [yearRaw, monthRaw, dayRaw] = dateIso.split('-');
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  const day = Number(dayRaw);

  if (!year || !month || !day) {
    return { month: '', day: 0 };
  }

  const utcDate = new Date(Date.UTC(year, month - 1, day));
  const monthLabel = utcDate.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' });
  return { month: monthLabel, day };
}

export function EventScheduleCard({ item, onClick }: EventScheduleCardProps) {
  const { month, day } = getMonthLabel(item.event_date);
  const categoryBadgeClass =
    item.category === 'Workshop' || item.category === 'Masterclass' ? 'bg-primary' : 'bg-gray-900';

  return (
    <article
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={(e) => {
        if (!onClick) return;
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      className={`group bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-xl hover:shadow-primary/10:shadow-primary/5 transition-all duration-500 flex flex-col relative ${
        onClick ? 'cursor-pointer' : ''
      }`}
    >
      {item.is_coming_soon ? (
        <div className="absolute top-4 right-4 z-10 bg-yellow-500 text-black text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full shadow-lg">
          Coming Soon
        </div>
      ) : null}

      <div className="relative h-64 overflow-hidden">
        {item.image_url ? (
          <img
            alt={item.title}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            src={item.image_url}
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full bg-gray-50 flex items-center justify-center relative">
            {item.placeholder_icon === 'photo_camera' ? (
              <div
                className="absolute inset-0 opacity-10"
                style={{
                  backgroundImage: 'radial-gradient(#ff4b86 1px, transparent 1px)',
                  backgroundSize: '20px 20px',
                }}
              />
            ) : null}
            <div className="text-center z-10">
              <span className="material-symbols-outlined text-6xl text-primary/40">
                {item.placeholder_icon || 'photo_camera'}
              </span>
            </div>
          </div>
        )}

        <div className="absolute top-4 left-4 bg-white/95 backdrop-blur text-center py-2 px-3 rounded-lg shadow-sm border border-gray-100">
          <span className="block text-xs uppercase font-bold text-gray-400">{month}</span>
          <span className="block text-xl font-display font-bold text-primary">{day || ''}</span>
        </div>

        <div className="absolute bottom-4 right-4">
          <span className={`${categoryBadgeClass} text-white text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full shadow-md`}>
            {item.category}
          </span>
        </div>
      </div>

      <div className="p-8 flex-grow flex flex-col">
        <div className="mb-4">
          <h3 className="font-display text-2xl font-bold text-text-light mb-2 group-hover:text-primary transition-colors">
            {item.title}
          </h3>
          <p className="text-sm font-light text-subtext-light line-clamp-2">{item.description}</p>
        </div>

        <div className="mt-auto pt-6 border-t border-gray-50 flex items-center justify-between">
          <div className="flex items-center text-gray-400 text-xs font-bold uppercase tracking-wider">
            <span className="material-symbols-outlined text-base mr-1">schedule</span>
            {item.time_label}
          </div>

          {item.button_url ? (
            <a
              href={item.button_url}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => {
                if (onClick) {
                  e.preventDefault();
                  e.stopPropagation();
                  window.open(item.button_url ?? '', '_blank', 'noopener,noreferrer');
                }
              }}
              className="text-primary font-bold text-sm flex items-center gap-1 hover:text-gray-900 ux-transition-color"
            >
              {item.button_text}
              <span className="material-symbols-outlined text-sm">arrow_forward</span>
            </a>
          ) : (
            <button disabled className="text-gray-400 font-bold text-sm cursor-not-allowed flex items-center gap-1 opacity-50">
              {item.button_text}
              <span className="material-symbols-outlined text-sm">arrow_forward</span>
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

