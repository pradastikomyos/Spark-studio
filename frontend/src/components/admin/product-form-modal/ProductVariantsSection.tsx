import type { Dispatch, SetStateAction } from 'react';
import { RupiahPriceInput } from '../../RupiahPriceInput';
import { createEmptyVariant } from './productFormModalHelpers';
import type { ProductDraft } from './productFormModalTypes';

type ProductVariantsSectionProps = {
  draft: ProductDraft;
  saving: boolean;
  setDraft: Dispatch<SetStateAction<ProductDraft>>;
};


export function ProductVariantsSection({ draft, saving, setDraft }: ProductVariantsSectionProps) {
  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-bold">Variants</p>
          <p className="text-xs text-gray-600">Each variant must have a unique SKU.</p>
          <p className="text-xs text-gray-600">Price must be whole rupiah (e.g. 30000 or 30.000).</p>
        </div>
        <button
          type="button"
          onClick={() => setDraft((current) => ({ ...current, variants: [...current.variants, createEmptyVariant()] }))}
          className="rounded-lg bg-[#ff4b86] px-3 py-2 text-xs font-bold text-white hover:bg-[#e63d75]"
        >
          Add Variant
        </button>
      </div>

      <div className="mt-4 max-h-[400px] overflow-x-auto overflow-y-auto">
        <table className="w-full text-left text-xs text-gray-700">
          <thead className="text-[10px] uppercase text-gray-600">
            <tr>
              <th className="py-2 pr-3">Name</th>
              <th className="py-2 pr-3">SKU</th>
              <th className="py-2 pr-3">Price</th>
              <th className="py-2 pr-3">Stock</th>
              <th className="py-2 pr-3">Size</th>
              <th className="py-2 pr-3">Color</th>
              <th className="py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {draft.variants.map((variant, index) => (
              <tr key={variant.id ?? `new-${index}`}>
                <td className="py-2 pr-3">
                  <input
                    value={variant.name}
                    onChange={(event) =>
                      setDraft((current) => {
                        const next = current.variants.slice();
                        next[index] = { ...next[index], name: event.target.value };
                        return { ...current, variants: next };
                      })
                    }
                    className="w-36 rounded border border-gray-200 bg-gray-50 px-2 py-1 outline-none focus:border-primary"
                  />
                </td>
                <td className="py-2 pr-3">
                  <input
                    value={variant.sku}
                    onChange={(event) =>
                      setDraft((current) => {
                        const next = current.variants.slice();
                        next[index] = { ...next[index], sku: event.target.value.toUpperCase() };
                        return { ...current, variants: next };
                      })
                    }
                    className="w-32 rounded border border-gray-200 bg-gray-50 px-2 py-1 outline-none focus:border-primary"
                  />
                </td>
                <td className="py-2 pr-3">
                  <RupiahPriceInput
                    value={variant.price}
                    className="w-28 rounded border border-gray-200 bg-gray-50 px-2 py-1 outline-none focus:border-primary"
                    onChange={(raw) => {
                      setDraft((current) => {
                        const next = current.variants.slice();
                        next[index] = { ...next[index], price: raw };
                        return { ...current, variants: next };
                      });
                    }}
                  />
                </td>
                <td className="py-2 pr-3">
                  <input
                    value={String(variant.stock)}
                    onChange={(event) =>
                      setDraft((current) => {
                        const next = current.variants.slice();
                        const stock = Number(event.target.value);
                        next[index] = { ...next[index], stock: Number.isFinite(stock) ? stock : 0 };
                        return { ...current, variants: next };
                      })
                    }
                    className="w-16 rounded border border-gray-200 bg-gray-50 px-2 py-1 outline-none focus:border-primary"
                  />
                </td>
                <td className="py-2 pr-3">
                  <input
                    value={variant.size ?? ''}
                    onChange={(event) =>
                      setDraft((current) => {
                        const next = current.variants.slice();
                        next[index] = { ...next[index], size: event.target.value };
                        return { ...current, variants: next };
                      })
                    }
                    className="w-16 rounded border border-gray-200 bg-gray-50 px-2 py-1 outline-none focus:border-primary"
                  />
                </td>
                <td className="py-2 pr-3">
                  <input
                    value={variant.color ?? ''}
                    onChange={(event) =>
                      setDraft((current) => {
                        const next = current.variants.slice();
                        next[index] = { ...next[index], color: event.target.value };
                        return { ...current, variants: next };
                      })
                    }
                    className="w-16 rounded border border-gray-200 bg-gray-50 px-2 py-1 outline-none focus:border-primary"
                  />
                </td>
                <td className="py-2 text-right">
                  <button
                    type="button"
                    disabled={saving || draft.variants.length <= 1}
                    onClick={() =>
                      setDraft((current) => {
                        const next = current.variants.slice();
                        next.splice(index, 1);
                        return { ...current, variants: next };
                      })
                    }
                    className="rounded bg-gray-100 px-2 py-1 text-[10px] font-bold hover:bg-white/15 disabled:opacity-40"
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
