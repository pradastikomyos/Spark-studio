import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { SortableContext, arrayMove, horizontalListSortingStrategy, sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { BannerCard } from './BannerCard';
import { SortableBannerCard } from './SortableBannerCard';
import type { Banner, BannerType } from './bannerManagerTypes';

type BannerTypeSectionProps = {
  type: BannerType;
  banners: Banner[];
  hasUnsavedChanges: boolean;
  applyingOrder: boolean;
  onEdit: (banner: Banner) => void;
  onToggleActive: (banner: Banner) => void;
  onDelete: (id: number) => void;
  onStageOrderChange: (orderedIds: number[]) => void;
  onApplyOrder: () => void;
  onCancelOrder: () => void;
};

export function BannerTypeSection({
  type,
  banners,
  hasUnsavedChanges,
  applyingOrder,
  onEdit,
  onToggleActive,
  onDelete,
  onStageOrderChange,
  onApplyOrder,
  onCancelOrder,
}: BannerTypeSectionProps) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = banners.findIndex((banner) => banner.id === active.id);
    const newIndex = banners.findIndex((banner) => banner.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;

    const nextOrder = arrayMove(banners, oldIndex, newIndex);
    onStageOrderChange(nextOrder.map((banner) => banner.id));
  };

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-bold capitalize text-gray-900">{type === 'spark-map' ? 'Spark Map' : type} Banners</h3>

        {type === 'stage' && hasUnsavedChanges ? (
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
        ) : null}
      </div>

      {banners.length === 0 ? (
        <p className="py-8 text-center text-sm text-gray-500">No {type} banners yet</p>
      ) : type === 'stage' ? (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={banners.map((banner) => banner.id)} strategy={horizontalListSortingStrategy}>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {banners.map((banner) => (
                <SortableBannerCard
                  key={banner.id}
                  banner={banner}
                  onEdit={onEdit}
                  onToggleActive={onToggleActive}
                  onDelete={onDelete}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {banners.map((banner) => (
            <BannerCard
              key={banner.id}
              banner={banner}
              onEdit={onEdit}
              onToggleActive={onToggleActive}
              onDelete={onDelete}
              inactiveTextClassName="text-gray-900"
              activateButtonClassName="text-gray-900 bg-green-600 hover:bg-green-700"
            />
          ))}
        </div>
      )}
    </section>
  );
}
