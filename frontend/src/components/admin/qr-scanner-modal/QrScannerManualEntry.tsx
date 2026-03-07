import type { FormEvent } from 'react';

type QrScannerManualEntryProps = {
  manualCode: string;
  manualSubmitting: boolean;
  processing: boolean;
  onChange: (value: string) => void;
  onSubmit: (event: FormEvent) => void;
};

export function QrScannerManualEntry({
  manualCode,
  manualSubmitting,
  processing,
  onChange,
  onSubmit,
}: QrScannerManualEntryProps) {
  return (
    <div className="border-t border-gray-100 pt-4">
      <p className="mb-3 text-center text-xs text-gray-500">📝 Kamera bermasalah? Input kode manual:</p>
      <form onSubmit={onSubmit} className="flex gap-2">
        <input
          type="text"
          value={manualCode}
          onChange={(event) => onChange(event.target.value)}
          placeholder="Contoh: TKT-ABC-123"
          disabled={manualSubmitting || processing}
          className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm font-mono uppercase text-neutral-900 outline-none focus:ring-2 focus:ring-primary disabled:opacity-50 placeholder:text-gray-400"
        />
        <button
          type="submit"
          disabled={!manualCode.trim() || manualSubmitting || processing}
          className="flex items-center gap-1 rounded-lg bg-primary px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-primary-dark disabled:opacity-50"
        >
          {manualSubmitting ? (
            <span className="material-symbols-outlined animate-spin text-lg">progress_activity</span>
          ) : (
            <>
              <span className="material-symbols-outlined text-lg">check</span>
              Cek
            </>
          )}
        </button>
      </form>
    </div>
  );
}
