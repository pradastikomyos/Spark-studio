import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { BannerCard } from './BannerCard';
import type { Banner } from './bannerManagerTypes';

type SortableBannerCardProps = {
  banner: Banner;
  onEdit: (banner: Banner) => void;
  onToggleActive: (banner: Banner) => void;
  onDelete: (id: number) => void;
};

export function SortableBannerCard(props: SortableBannerCardProps) {
  const { banner, onEdit, onToggleActive, onDelete } = props;
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: banner.id });

  return (
    <div ref={setNodeRef}>
      <BannerCard
        banner={banner}
        onEdit={onEdit}
        onToggleActive={onToggleActive}
        onDelete={onDelete}
        style={{
          transform: CSS.Transform.toString(transform),
          transition,
          opacity: isDragging ? 0.5 : 1,
        }}
        className={`overflow-hidden rounded-lg border-2 bg-white ${
          isDragging ? 'border-[#ff4b86] shadow-lg' : 'border-gray-200'
        }`}
        dragHandle={
          <div
            {...attributes}
            {...listeners}
            className="flex cursor-grab items-center gap-2 border-b border-gray-200 bg-gray-50 px-4 py-2 transition-colors hover:bg-gray-100 active:cursor-grabbing"
          >
            <span className="material-symbols-outlined text-gray-600">drag_indicator</span>
            <span className="text-xs font-bold text-gray-600">Drag to reorder</span>
          </div>
        }
      />
    </div>
  );
}
