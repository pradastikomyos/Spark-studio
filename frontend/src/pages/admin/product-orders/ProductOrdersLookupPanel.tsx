import type { RefObject } from 'react';

type ProductOrdersLookupPanelProps = {
  inputRef: RefObject<HTMLInputElement>;
  lookupCode: string;
  lookupError: string | null;
  onChangeCode: (value: string) => void;
  onLookup: () => void;
};

export function ProductOrdersLookupPanel({
  inputRef,
  lookupCode,
  lookupError,
  onChangeCode,
  onLookup,
}: ProductOrdersLookupPanelProps) {
  const inputId = 'product-orders-lookup-code';

  return (
    <section className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      <div className="p-6">
        <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
          <div className="flex-1">
            <label htmlFor={inputId} className="block text-xs font-bold uppercase tracking-wide text-gray-500 mb-2">
              Cari kode
            </label>
            <input
              id={inputId}
              ref={inputRef}
              value={lookupCode}
              onChange={(event) => onChangeCode(event.target.value.toUpperCase())}
              onKeyDown={(event) => {
                if (event.key === 'Enter') onLookup();
              }}
              placeholder="PRX-XXX-YYY"
              className="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary text-gray-900 font-sans uppercase tracking-widest placeholder:normal-case placeholder:tracking-normal transition-all duration-300"
            />
          </div>
          <button
            onClick={onLookup}
            className="rounded-lg bg-[#ff4b86] px-6 py-3 text-sm font-bold text-white hover:bg-[#ff6a9a] transition-opacity"
          >
            Verifikasi
          </button>
        </div>
        {lookupError && <div className="mt-4 text-sm text-red-600">{lookupError}</div>}
      </div>
    </section>
  );
}
