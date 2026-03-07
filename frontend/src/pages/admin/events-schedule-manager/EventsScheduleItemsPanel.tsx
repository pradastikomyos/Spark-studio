import { EventScheduleCard } from '../../../components/events/EventScheduleCard';
import type { EventScheduleItem } from '../../../hooks/useEventSchedule';

type EventsScheduleItemsPanelProps = {
  searchQuery: string;
  filteredItems: EventScheduleItem[];
  editingItemId: number | null;
  onChangeSearch: (value: string) => void;
  onEdit: (item: EventScheduleItem) => void;
  onDelete: (item: EventScheduleItem) => void;
  onToggleActive: (item: EventScheduleItem) => void;
};

export function EventsScheduleItemsPanel({
  searchQuery,
  filteredItems,
  editingItemId,
  onChangeSearch,
  onEdit,
  onDelete,
  onToggleActive,
}: EventsScheduleItemsPanelProps) {
  return (
    <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="text-lg font-bold text-gray-900">Items</h3>
        <div className="flex items-center gap-3">
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-gray-400">
              search
            </span>
            <input
              value={searchQuery}
              onChange={(event) => onChangeSearch(event.target.value)}
              placeholder="Search..."
              className="ux-transition-color rounded-lg border border-gray-200 bg-gray-50 py-2 pl-10 pr-3 text-sm focus:border-[#ff4b86] focus:outline-none focus:ring-1 focus:ring-[#ff4b86]"
            />
          </div>
        </div>
      </div>

      {filteredItems.length === 0 ? (
        <p className="py-8 text-center text-sm text-gray-500">No schedule items yet</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {filteredItems.map((item) => (
            <div key={item.id} className={editingItemId === item.id ? 'rounded-2xl ring-2 ring-primary' : ''}>
              <EventScheduleCard item={item} onClick={() => onEdit(item)} />
              <div className="mt-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onEdit(item)}
                    className="rounded border border-gray-200 px-3 py-1.5 text-xs font-bold text-gray-700 hover:bg-gray-50"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(item)}
                    className="rounded border border-red-200 px-3 py-1.5 text-xs font-bold text-red-600 hover:bg-red-50"
                  >
                    Delete
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => onToggleActive(item)}
                  className={`rounded px-3 py-1.5 text-xs font-bold ${
                    item.is_active ? 'border border-gray-200 text-gray-600 hover:bg-gray-50' : 'bg-green-600 text-white hover:bg-green-700'
                  }`}
                >
                  {item.is_active ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
