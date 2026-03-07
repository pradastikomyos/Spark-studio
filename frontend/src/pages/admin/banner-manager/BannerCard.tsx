import type { CSSProperties, ReactNode } from 'react';
import type { Banner } from './bannerManagerTypes';

type BannerCardProps = {
  banner: Banner;
  onEdit: (banner: Banner) => void;
  onToggleActive: (banner: Banner) => void;
  onDelete: (id: number) => void;
  style?: CSSProperties;
  className?: string;
  dragHandle?: ReactNode;
  inactiveTextClassName?: string;
  activateButtonClassName?: string;
};

export function BannerCard({
  banner,
  onEdit,
  onToggleActive,
  onDelete,
  style,
  className,
  dragHandle,
  inactiveTextClassName = 'text-white',
  activateButtonClassName = 'text-white bg-green-600 hover:bg-green-700',
}: BannerCardProps) {
  return (
    <div style={style} className={className ?? 'rounded-lg border border-gray-200 overflow-hidden bg-white'}>
      {dragHandle}
      <div className="relative aspect-video bg-gray-100">
        <img src={banner.image_url} alt={banner.title} className="h-full w-full object-cover" />
        {!banner.is_active ? (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <span className={`${inactiveTextClassName} font-bold text-sm`}>INACTIVE</span>
          </div>
        ) : null}
      </div>
      <div className="p-4">
        <h4 className="truncate font-bold text-gray-900">{banner.title}</h4>
        {banner.subtitle ? <p className="mt-1 truncate text-sm text-gray-600">{banner.subtitle}</p> : null}
        <div className="mt-3 flex items-center gap-2">
          <button
            type="button"
            onClick={() => onEdit(banner)}
            className="flex-1 rounded border border-gray-300 px-3 py-1.5 text-xs font-bold text-neutral-900 hover:bg-gray-50"
          >
            Edit
          </button>
          <button
            type="button"
            onClick={() => onToggleActive(banner)}
            className={`flex-1 rounded px-3 py-1.5 text-xs font-bold ${
              banner.is_active ? 'text-gray-600 border border-gray-300 hover:bg-gray-50' : activateButtonClassName
            }`}
          >
            {banner.is_active ? 'Deactivate' : 'Activate'}
          </button>
          <button
            type="button"
            onClick={() => onDelete(banner.id)}
            className="rounded border border-red-300 px-3 py-1.5 text-xs font-bold text-red-600 hover:bg-red-50"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
