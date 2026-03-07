import type { MutableRefObject, PointerEvent as ReactPointerEvent } from 'react';
import { DragOverlay, DndContext, type DragEndEvent, type DragStartEvent } from '@dnd-kit/core';
import { CanvasDroppable } from './BeautyPosterDnd';
import type { ActiveDragPreview, TagDraft } from './beautyPosterTypes';

type BeautyPosterCanvasSectionProps = {
  imageUrl: string;
  title: string;
  tags: TagDraft[];
  isDraggingAny: boolean;
  activeDragPreview: ActiveDragPreview;
  sensors: ReturnType<typeof import('@dnd-kit/core').useSensors>;
  canvasRef: MutableRefObject<HTMLDivElement | null>;
  uploadInputRef: MutableRefObject<HTMLInputElement | null>;
  onUploadFile: (file: File) => void;
  onOpenUrlModal: () => void;
  onTagPointerDown: (variantId: number, event: ReactPointerEvent<HTMLElement>) => void;
  onTagPointerMove: (event: ReactPointerEvent<HTMLElement>) => void;
  onTagPointerUp: (event: ReactPointerEvent<HTMLElement>) => void;
  onResizePointerDown: (variantId: number, startSizePct: number, event: ReactPointerEvent<HTMLDivElement>) => void;
  onResizePointerMove: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onResizePointerUp: (event: ReactPointerEvent<HTMLDivElement>) => void;
  onDragStart: (event: DragStartEvent) => void;
  onDragEnd: (event: DragEndEvent) => void;
  onDragCancel: () => void;
};

export function BeautyPosterCanvasSection({
  imageUrl,
  title,
  tags,
  isDraggingAny,
  activeDragPreview,
  sensors,
  canvasRef,
  uploadInputRef,
  onUploadFile,
  onOpenUrlModal,
  onTagPointerDown,
  onTagPointerMove,
  onTagPointerUp,
  onResizePointerDown,
  onResizePointerMove,
  onResizePointerUp,
  onDragStart,
  onDragEnd,
  onDragCancel,
}: BeautyPosterCanvasSectionProps) {
  return (
    <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd} onDragCancel={onDragCancel}>
      <CanvasDroppable>
        <div
          ref={canvasRef}
          role="img"
          onDragOver={(event) => {
            event.preventDefault();
            event.stopPropagation();
          }}
          onDrop={(event) => {
            event.preventDefault();
            event.stopPropagation();
            const file = event.dataTransfer.files?.[0];
            if (file) onUploadFile(file);
          }}
          className="relative w-full aspect-[4/5] select-none"
          aria-label={imageUrl ? 'Poster image' : 'Upload poster image'}
        >
          {imageUrl ? (
            <img src={imageUrl} alt={title || 'Poster'} className="absolute inset-0 h-full w-full object-cover" decoding="async" />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-gray-300">
              <div className="text-center px-6">
                <span className="material-symbols-outlined text-5xl block mb-2">cloud_upload</span>
                <p className="text-sm font-semibold text-gray-600">Upload poster</p>
                <p className="mt-1 text-[11px] text-gray-400">4:5 portrait recommended</p>
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    if (isDraggingAny) return;
                    uploadInputRef.current?.click();
                  }}
                  className="mt-4 inline-flex items-center justify-center gap-2 rounded-full bg-[#ff4b86] px-5 py-2 text-xs font-bold text-white hover:bg-[#ff6a9a]"
                >
                  <span className="material-symbols-outlined text-base">cloud_upload</span>
                  Upload poster
                </button>
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    onOpenUrlModal();
                  }}
                  className="mt-4 inline-flex items-center justify-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50"
                >
                  <span className="material-symbols-outlined text-base">link</span>
                  Use stock image URL
                </button>
              </div>
            </div>
          )}

          <div className="absolute inset-0">
            {tags.map((tag) => {
              if (!tag.is_placed) return null;

              const sizeCss = `clamp(36px, ${tag.size_pct}%, 180px)`;
              return (
                <div
                  key={tag.product_variant_id}
                  onPointerDown={(event) => onTagPointerDown(tag.product_variant_id, event)}
                  onPointerMove={onTagPointerMove}
                  onPointerUp={onTagPointerUp}
                  onPointerCancel={onTagPointerUp}
                  className="absolute -translate-x-1/2 -translate-y-1/2 group touch-none"
                  style={{ left: `${tag.x_pct}%`, top: `${tag.y_pct}%`, width: sizeCss, height: sizeCss }}
                  role="button"
                  tabIndex={0}
                  aria-label={`Move tag ${tag.variant_name}`}
                >
                  <span className="relative flex h-full w-full items-center justify-center rounded-2xl bg-white/90 border border-black/10 shadow-lg overflow-hidden backdrop-blur-sm">
                    {tag.image_url ? (
                      <img
                        src={tag.image_url}
                        alt={tag.label ?? tag.variant_name}
                        className="h-full w-full object-contain"
                        loading="lazy"
                        decoding="async"
                        draggable={false}
                      />
                    ) : (
                      <span className="material-symbols-outlined text-gray-300">image</span>
                    )}
                    <span className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-white border border-black/10 flex items-center justify-center shadow">
                      <span className="h-2.5 w-2.5 rounded-full bg-[#e63d75]" />
                    </span>
                    <div
                      onPointerDown={(event) => onResizePointerDown(tag.product_variant_id, tag.size_pct, event)}
                      onPointerMove={onResizePointerMove}
                      onPointerUp={onResizePointerUp}
                      onPointerCancel={onResizePointerUp}
                      className="absolute right-0 top-0 h-8 w-8 flex items-center justify-center bg-white/80 border-l border-b border-black/10 text-gray-600 opacity-100 transition-opacity cursor-nwse-resize touch-none"
                      aria-label="Resize tag"
                      title="Drag to resize"
                    >
                      <span className="material-symbols-outlined text-[18px]">open_in_full</span>
                    </div>
                  </span>
                  <span className="pointer-events-none absolute left-1/2 top-full mt-2 -translate-x-1/2 whitespace-nowrap rounded-full bg-black/80 px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-white opacity-0 group-hover:opacity-100 transition-opacity">
                    {tag.label ?? tag.variant_name}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </CanvasDroppable>

      <DragOverlay>
        {activeDragPreview ? (
          <div className="rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-xl">
            <p className="text-xs uppercase tracking-widest text-gray-400 font-bold">{activeDragPreview.productName}</p>
            <p className="text-sm font-semibold text-gray-900">{activeDragPreview.name}</p>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
