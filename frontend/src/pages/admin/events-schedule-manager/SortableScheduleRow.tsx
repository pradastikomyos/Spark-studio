import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { EventScheduleItem } from '../../../hooks/useEventSchedule';

type SortableScheduleRowProps = {
  item: EventScheduleItem;
};

export function SortableScheduleRow({ item }: SortableScheduleRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.6 : 1,
      }}
      className={`flex items-center justify-between gap-3 rounded-lg border bg-white px-3 py-2 ${
        isDragging ? 'border-primary shadow-md' : 'border-gray-200'
      }`}
    >
      <div className="min-w-0 flex items-center gap-2">
        <div
          {...attributes}
          {...listeners}
          className="flex-shrink-0 cursor-grab text-gray-500 active:cursor-grabbing"
          aria-label="Drag to reorder"
        >
          <span className="material-symbols-outlined text-[18px]">drag_indicator</span>
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-gray-900">{item.title}</p>
          <p className="truncate text-xs text-gray-500">
            {item.event_date} • {item.category}
          </p>
        </div>
      </div>
      <span
        className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-widest ${
          item.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
        }`}
      >
        {item.is_active ? 'Active' : 'Hidden'}
      </span>
    </div>
  );
}
