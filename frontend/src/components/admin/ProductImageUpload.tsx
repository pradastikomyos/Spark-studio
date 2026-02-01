import { useState, useCallback, useRef } from 'react';

export type ImagePreview = {
  file: File;
  preview: string;
  order: number;
};

type ProductImageUploadProps = {
  images: ImagePreview[];
  existingImages?: Array<{ url: string; is_primary: boolean }>;
  maxImages?: number;
  onChange: (images: ImagePreview[]) => void;
  onRemoveExisting?: (url: string) => void;
};

export default function ProductImageUpload(props: ProductImageUploadProps) {
  const { images, existingImages = [], maxImages = 3, onChange, onRemoveExisting } = props;
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleEmptySlotClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const totalImages = images.length + existingImages.length;
  const canAddMore = totalImages < maxImages;

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []);
      const remainingSlots = maxImages - totalImages;
      const filesToAdd = files.slice(0, remainingSlots);

      const newPreviews: ImagePreview[] = filesToAdd.map((file, idx) => ({
        file,
        preview: URL.createObjectURL(file),
        order: images.length + idx,
      }));

      onChange([...images, ...newPreviews]);
      e.target.value = ''; // Reset input
    },
    [images, totalImages, maxImages, onChange]
  );

  const handleRemove = useCallback(
    (index: number) => {
      const updated = images.filter((_, i) => i !== index);
      // Reorder remaining images
      const reordered = updated.map((img, idx) => ({ ...img, order: idx }));
      onChange(reordered);
    },
    [images, onChange]
  );

  const handleDragStart = useCallback((index: number) => {
    setDraggedIndex(index);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const reordered = [...images];
    const [draggedItem] = reordered.splice(draggedIndex, 1);
    reordered.splice(index, 0, draggedItem);

    // Update order property
    const updated = reordered.map((img, idx) => ({ ...img, order: idx }));
    onChange(updated);
    setDraggedIndex(index);
  }, [draggedIndex, images, onChange]);

  const handleDragEnd = useCallback(() => {
    setDraggedIndex(null);
  }, []);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-bold">Product Images</p>
          <p className="text-xs text-gray-400">
            Add up to {maxImages} images. First image will be the primary display.
          </p>
        </div>
        {canAddMore && (
          <button
            type="button"
            onClick={handleEmptySlotClick}
            className="cursor-pointer rounded-lg bg-primary px-3 py-2 text-xs font-bold text-white hover:bg-red-700"
          >
            Add Image
          </button>
        )}
        {/* Hidden file input - triggered by both button and empty slots */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp"
          multiple
          className="hidden"
          onChange={handleFileSelect}
        />
      </div>

      {/* Image Grid */}
      <div className="grid grid-cols-3 gap-3">
        {/* Existing Images */}
        {existingImages.map((img, idx) => (
          <div
            key={`existing-${idx}`}
            className="group relative aspect-square overflow-hidden rounded-lg border border-white/10 bg-white/5"
          >
            <img
              src={img.url}
              alt={`Product ${idx + 1}`}
              className="h-full w-full object-cover"
            />
            {img.is_primary && (
              <div className="absolute left-2 top-2 rounded bg-primary px-2 py-1 text-[10px] font-bold text-white">
                Primary
              </div>
            )}
            {onRemoveExisting && (
              <button
                type="button"
                onClick={() => onRemoveExisting(img.url)}
                className="absolute right-2 top-2 rounded-full bg-black/60 p-1.5 text-white opacity-0 transition-opacity hover:bg-black/80 group-hover:opacity-100"
              >
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            )}
          </div>
        ))}

        {/* New Images */}
        {images.map((img, idx) => (
          <div
            key={`new-${idx}`}
            draggable
            onDragStart={() => handleDragStart(idx)}
            onDragOver={(e) => handleDragOver(e, idx)}
            onDragEnd={handleDragEnd}
            className={`group relative aspect-square cursor-move overflow-hidden rounded-lg border border-white/10 bg-white/5 transition-opacity ${draggedIndex === idx ? 'opacity-50' : 'opacity-100'
              }`}
          >
            <img
              src={img.preview}
              alt={`Upload ${idx + 1}`}
              className="h-full w-full object-cover"
            />
            {idx === 0 && existingImages.length === 0 && (
              <div className="absolute left-2 top-2 rounded bg-primary px-2 py-1 text-[10px] font-bold text-white">
                Primary
              </div>
            )}
            <button
              type="button"
              onClick={() => handleRemove(idx)}
              className="absolute right-2 top-2 rounded-full bg-black/60 p-1.5 text-white opacity-0 transition-opacity hover:bg-black/80 group-hover:opacity-100"
            >
              <span className="material-symbols-outlined text-sm">close</span>
            </button>
            <div className="absolute bottom-2 left-2 rounded bg-black/60 px-2 py-1 text-[10px] text-white">
              Drag to reorder
            </div>
          </div>
        ))}

        {/* Empty Slots - Clickable to add images */}
        {Array.from({ length: maxImages - totalImages }).map((_, idx) => (
          <button
            key={`empty-${idx}`}
            type="button"
            onClick={handleEmptySlotClick}
            className="group flex aspect-square cursor-pointer items-center justify-center rounded-lg border border-dashed border-white/20 bg-white/5 transition-all duration-200 hover:border-primary hover:bg-white/10"
          >
            <div className="flex flex-col items-center gap-1 transition-transform duration-200 group-hover:scale-110">
              <span className="material-symbols-outlined text-3xl text-gray-500 transition-colors duration-200 group-hover:text-primary">add_photo_alternate</span>
              <span className="text-[10px] text-gray-500 transition-colors duration-200 group-hover:text-primary/80">Click to add</span>
            </div>
          </button>
        ))}
      </div>

      {/* Helper Text */}
      <p className="text-xs text-gray-400">
        Click on empty slots or use the Add Image button. JPG/PNG/WEBP, max 2MB per image.
      </p>
    </div>
  );
}
