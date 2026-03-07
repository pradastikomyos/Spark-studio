import { DraggableTaggedItem, VariantResultCard } from './BeautyPosterDnd';
import type { ProductVariantSearchResult } from '../../../utils/productVariantSearch';
import type { TagDraft } from './beautyPosterTypes';

type BeautyPosterSidebarProps = {
  imageUrl: string;
  tags: TagDraft[];
  productSearch: string;
  searchingProducts: boolean;
  productResults: ProductVariantSearchResult[];
  onSearchProducts: (query: string) => void;
  onSelectVariant: (variant: ProductVariantSearchResult) => void;
  onChangeTagLabel: (variantId: number, value: string) => void;
  onRemoveTag: (variantId: number) => void;
};

export function BeautyPosterSidebar({
  imageUrl,
  tags,
  productSearch,
  searchingProducts,
  productResults,
  onSearchProducts,
  onSelectVariant,
  onChangeTagLabel,
  onRemoveTag,
}: BeautyPosterSidebarProps) {
  return (
    <div className="lg:col-span-4 space-y-4">
      <div className="rounded-2xl border border-gray-200 bg-white p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-bold uppercase tracking-widest text-gray-500">Products</p>
          <span className="text-xs text-gray-400">{tags.length} tag(s)</span>
        </div>

        <input
          value={productSearch}
          onChange={(event) => void onSearchProducts(event.target.value)}
          placeholder="Cari produk variant..."
          className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm focus:outline-none focus:border-[#ff4b86] focus:ring-1 focus:ring-[#ff4b86]"
        />
        {searchingProducts ? <p className="mt-2 text-xs text-gray-400">Mencari...</p> : null}

        <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-[360px] overflow-y-auto pr-1" style={{ scrollbarWidth: 'thin' }}>
          {productResults.length === 0 ? (
            <p className="col-span-full text-xs text-gray-400 text-center py-6">Ketik minimal 2 huruf, lalu klik item untuk masuk ke tagged items.</p>
          ) : (
            productResults.map((variant) => (
              <VariantResultCard key={variant.id} variant={variant} onSelect={() => onSelectVariant(variant)} />
            ))
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-4">
        <p className="text-xs font-bold uppercase tracking-widest text-gray-500">Tagged Items</p>
        <div className="mt-3 space-y-3 max-h-[320px] overflow-y-auto pr-1" style={{ scrollbarWidth: 'thin' }}>
          {tags.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-6">No tags yet.</p>
          ) : (
            <div className="space-y-3">
              {tags
                .slice()
                .sort((a, b) => a.sort_order - b.sort_order)
                .map((tag) => (
                  <div key={tag.product_variant_id} className="relative">
                    <DraggableTaggedItem tag={tag} disabled={!imageUrl.trim()} />
                    <div className="mt-2">
                      <input
                        value={tag.label ?? ''}
                        onChange={(event) => onChangeTagLabel(tag.product_variant_id, event.target.value)}
                        className="w-full rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs"
                        placeholder="Label override (optional)"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => onRemoveTag(tag.product_variant_id)}
                      className="absolute top-2 right-2 text-gray-300 hover:text-red-500 transition-colors"
                      title="Remove tag"
                    >
                      <span className="material-symbols-outlined text-lg">close</span>
                    </button>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
