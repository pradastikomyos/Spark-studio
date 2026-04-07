import { getStockBadge, getStockBarColor } from '../../../utils/statusHelpers';
import { formatCurrency } from '../../../utils/formatters';
import { getStockLabel, getStockPercent } from './inventoryProducts';
import type { InventoryProduct } from './storeInventoryTypes';

type InventoryProductCardProps = {
  product: InventoryProduct;
  isThumbFallback: boolean;
  saving?: boolean;
  onEdit: (productId: number) => void;
  onDelete: (product: { id: number; name: string }) => void;
  onToggleActive: (productId: number, currentlyActive: boolean) => void;
  onTrackImageResult: (result: 'loaded' | 'error') => void;
  onThumbFallback: (productId: number) => void;
};

export function InventoryProductCard(props: InventoryProductCardProps) {
  const { product, isThumbFallback, saving, onEdit, onDelete, onToggleActive, onTrackImageResult, onThumbFallback } =
    props;
  const isInactive = !product.is_active;

  return (
    <div
      className={`group flex flex-col rounded-xl border overflow-hidden shadow-sm transition-all duration-200 ${
        isInactive
          ? 'border-gray-300 bg-gray-50 opacity-60 hover:opacity-80'
          : 'border-gray-200 bg-white hover:shadow-md hover:border-primary/30'
      }`}
    >
      {/* Image area */}
      <div className="group aspect-[4/3] w-full bg-gray-100 relative overflow-hidden">
        {product.image_url ? (
          <img
            alt={product.name}
            src={isThumbFallback ? product.image_url_original ?? product.image_url : product.image_url}
            className={`h-full w-full object-cover transition-transform duration-150 ease-out group-active:scale-[0.99] ${isInactive ? 'grayscale' : ''}`}
            loading="lazy"
            decoding="async"
            onLoad={() => onTrackImageResult('loaded')}
            onError={() => {
              onTrackImageResult('error');
              if (product.image_url_original) {
                onThumbFallback(product.id);
              }
            }}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-gray-700 transition-transform duration-150 ease-out group-active:scale-[0.99]">
            <span className="material-symbols-outlined text-6xl">inventory_2</span>
          </div>
        )}
        {/* Invisible edit overlay */}
        <button
          type="button"
          onClick={() => onEdit(product.id)}
          aria-label={`Edit ${product.name}`}
          title="Edit product"
          className="absolute inset-0 z-10 cursor-pointer bg-transparent transition-colors active:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
        />
        {/* Mobile hint */}
        <div className="absolute left-3 bottom-3 z-20 sm:hidden">
          <span className="inline-flex items-center rounded-full bg-white/90 px-2 py-1 text-[10px] font-semibold text-gray-700 shadow-sm">
            Tap image to edit
          </span>
        </div>
        {/* Top badges row */}
        <div className="absolute inset-x-3 top-3 flex items-start justify-between gap-2 z-20">
          <div className="flex flex-col items-start gap-1">
            {isInactive && (
              <div className="bg-gray-700/90 text-white text-[10px] font-bold px-2 py-1 rounded-md tracking-wide">
                NONAKTIF
              </div>
            )}
            {!isInactive && product.stock_status === 'out' && (
              <div className="bg-neutral-800 text-gray-900 text-[10px] font-bold px-2 py-1 rounded-br-lg">
                SOLD OUT
              </div>
            )}
            {!isInactive && product.stock_status === 'low' && (
              <div className="bg-primary text-gray-900 text-[10px] font-bold px-2 py-1 rounded-br-lg">LOW STOCK</div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onEdit(product.id)}
              className="rounded-lg bg-white/90 px-2 py-1 text-[10px] font-bold text-neutral-900 hover:bg-white"
            >
              Edit
            </button>
            <button
              onClick={() => onDelete({ id: product.id, name: product.name })}
              className="rounded-lg bg-[#ff4b86]/90 px-2 py-1 text-[10px] font-bold text-white hover:bg-[#ff4b86]"
            >
              Delete
            </button>
          </div>
        </div>
      </div>

      {/* Info area */}
      <div className="p-4 flex flex-col gap-3 flex-1">
        <div>
          <div className="flex justify-between items-start">
            <h4 className={`text-base font-bold leading-tight ${isInactive ? 'text-gray-400' : 'text-neutral-900'}`}>
              {product.name}
            </h4>
            <span className={`text-sm font-bold ${isInactive ? 'text-gray-400' : 'text-neutral-900'}`}>
              {formatCurrency(product.price_min)}
              {product.price_max !== product.price_min ? `–${formatCurrency(product.price_max)}` : ''}
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1 font-sans">
            {product.category} • {product.variant_count} variants
          </p>
          <p className="mt-1 text-[10px] text-gray-600 font-mono">{product.sku}</p>
        </div>

        {/* Stock bar (hidden when inactive) */}
        {!isInactive && (
          <div className="mt-auto">
            <div className="flex justify-between items-center mb-1.5">
              <span
                className={`text-xs font-medium font-sans ${
                  product.stock_status === 'low'
                    ? 'text-primary'
                    : product.stock_status === 'out'
                      ? 'text-gray-600'
                      : 'text-gray-500'
                }`}
              >
                {product.stock_available} in stock
              </span>
              {getStockBadge(product.stock_status, getStockLabel(product.stock_status))}
            </div>
            <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full ${getStockBarColor(product.stock_status)} rounded-full`}
                style={{ width: `${getStockPercent(product.stock_available)}%` }}
              />
            </div>
          </div>
        )}

        {/* NONAKTIF overlay message when inactive */}
        {isInactive && (
          <div className="mt-auto rounded-lg border border-dashed border-gray-300 bg-gray-100/60 px-3 py-2 text-center">
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest">Produk Nonaktif</p>
            <p className="text-[10px] text-gray-400 mt-0.5">Tidak muncul di toko</p>
          </div>
        )}

        {/* Divider */}
        <div className="border-t border-gray-100 pt-2 flex gap-2 mt-auto">
          {!isInactive && (
            <button
              type="button"
              disabled={saving}
              aria-label="Restock product"
              className="flex-1 rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-[11px] font-bold text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              RESTOCK
            </button>
          )}
          <button
            type="button"
            disabled={saving}
            onClick={() => onToggleActive(product.id, product.is_active)}
            aria-label={isInactive ? 'Aktifkan produk' : 'Nonaktifkan produk'}
            className={`flex-1 rounded-lg px-2 py-1.5 text-[11px] font-bold transition-colors disabled:opacity-50 ${
              isInactive
                ? 'border border-emerald-400 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                : 'border border-gray-300 bg-gray-50 text-gray-500 hover:bg-gray-100'
            }`}
          >
            {isInactive ? 'Aktifkan' : 'Nonaktifkan'}
          </button>
        </div>
      </div>
    </div>
  );
}
