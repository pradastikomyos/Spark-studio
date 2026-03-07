import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import type { EventScheduleItem } from '../../../hooks/useEventSchedule';
import { SortableScheduleRow } from './SortableScheduleRow';

type EventsScheduleOrderPanelProps = {
  orderItems: EventScheduleItem[];
  hasUnsavedOrder: boolean;
  applyingOrder: boolean;
  onOrderChange: (orderedIds: number[]) => void;
  onApplyOrder: () => void;
  onCancelOrder: () => void;
};

export function EventsScheduleOrderPanel({
  orderItems,
  hasUnsavedOrder,
  applyingOrder,
  onOrderChange,
  onApplyOrder,
  onCancelOrder,
}: EventsScheduleOrderPanelProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const nextIds = orderItems.map((item) => item.id);
    const oldIndex = nextIds.findIndex((id) => id === active.id);
    const newIndex = nextIds.findIndex((id) => id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;

    const [moved] = nextIds.splice(oldIndex, 1);
    nextIds.splice(newIndex, 0, moved);
    onOrderChange(nextIds);
  };

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-bold text-gray-900">Order</h3>
        {hasUnsavedOrder ? (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onCancelOrder}
              disabled={applyingOrder}
              className="flex items-center gap-1 rounded border border-gray-300 px-3 py-1.5 text-xs font-bold text-gray-600 hover:bg-gray-50 disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[16px]">close</span>
              Cancel
            </button>
            <button
              type="button"
              onClick={onApplyOrder}
              disabled={applyingOrder}
              className="flex items-center gap-1 rounded bg-[#ff4b86] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#ff6a9a] disabled:opacity-50"
            >
              {applyingOrder ? (
                <>
                  <div className="h-3 w-3 animate-spin rounded-full border-b-2 border-white" />
                  Applying...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[16px]">check</span>
                  Confirm Order
                </>
              )}
            </button>
          </div>
        ) : (
          <p className="text-xs text-gray-500">Drag to reorder</p>
        )}
      </div>

      {orderItems.length === 0 ? (
        <p className="py-8 text-center text-sm text-gray-500">No items to reorder</p>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={orderItems.map((item) => item.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {orderItems.map((item) => (
                <SortableScheduleRow key={item.id} item={item} />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </section>
  );
}
