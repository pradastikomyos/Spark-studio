import type { CSSProperties, ReactNode } from 'react';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import type { ProductVariantSearchResult } from '../../../utils/productVariantSearch';
import type { TagDraft } from './beautyPosterTypes';
import { formatPrice } from './beautyPosterHelpers';

export function VariantResultCard({
  variant,
  onSelect,
}: {
  variant: ProductVariantSearchResult;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className="group rounded-2xl border border-gray-200 bg-white p-2 hover:border-gray-300 hover:shadow-sm transition-shadow text-left"
    >
      <div className="aspect-square w-full rounded-xl border border-gray-100 bg-gray-50 overflow-hidden flex items-center justify-center">
        {variant.variantImageUrl || variant.productImageUrl ? (
          <img
            src={variant.variantImageUrl || (variant.productImageUrl as string)}
            alt={variant.name}
            className="h-full w-full object-contain"
            loading="lazy"
            decoding="async"
          />
        ) : (
          <span className="material-symbols-outlined text-gray-300">image</span>
        )}
      </div>
      <div className="mt-2 min-w-0">
        <p className="text-[9px] uppercase tracking-widest text-gray-400 font-bold truncate">{variant.productName}</p>
        <p className="text-[11px] font-semibold text-gray-900 truncate">{variant.name}</p>
        <p className="text-[10px] text-gray-500 mt-0.5">{variant.price !== null ? formatPrice(variant.price) : ''}</p>
      </div>
    </button>
  );
}

export function DraggableTaggedItem({ tag, disabled }: { tag: TagDraft; disabled: boolean }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `tag:${tag.product_variant_id}`,
    disabled,
    data: {
      product_variant_id: tag.product_variant_id,
      productName: tag.product_name,
      name: tag.variant_name,
    },
  });

  const style: CSSProperties = {
    transform: CSS.Translate.toString(transform),
    opacity: disabled ? 0.5 : isDragging ? 0.7 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="flex items-start gap-3 rounded-xl border border-gray-100 bg-gray-50 p-3">
      <div className="h-12 w-12 rounded-lg border border-gray-100 bg-white overflow-hidden flex items-center justify-center">
        {tag.image_url ? (
          <img src={tag.image_url} alt={tag.variant_name} className="h-full w-full object-contain" loading="lazy" decoding="async" />
        ) : (
          <span className="material-symbols-outlined text-gray-300">image</span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-widest text-gray-400 font-bold truncate">{tag.product_name}</p>
            <p className="text-sm font-semibold text-gray-900 truncate">{tag.variant_name}</p>
          </div>
          <span
            className={[
              'text-[10px] font-bold uppercase tracking-widest rounded-full px-2 py-1 border whitespace-nowrap',
              tag.is_placed ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : 'text-gray-500 bg-white border-gray-200',
            ].join(' ')}
          >
            {tag.is_placed ? 'Placed' : 'Drag to place'}
          </span>
        </div>
        <div className="mt-2 flex items-center gap-2">
          <span className="text-[11px] text-gray-400">{disabled ? 'Upload poster first.' : 'Drag this item onto the poster.'}</span>
          <span
            className="material-symbols-outlined text-[18px] text-gray-300 cursor-grab active:cursor-grabbing select-none touch-none"
            {...attributes}
            {...listeners}
            aria-label="Drag tag"
          >
            drag_indicator
          </span>
        </div>
      </div>
    </div>
  );
}

export function CanvasDroppable({ children }: { children: ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: 'poster-canvas' });
  return (
    <div ref={setNodeRef} className={`relative rounded-2xl border ${isOver ? 'border-[#ff4b86]' : 'border-gray-200'} bg-gray-50 overflow-hidden`}>
      {children}
    </div>
  );
}
