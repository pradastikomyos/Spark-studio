import type { QrScannerStatus } from './qrScannerTypes';

type QrScannerViewportProps = {
  readerId: string;
  status: QrScannerStatus;
  errorMessage: string;
  errorDetails: string;
  closeOnSuccess: boolean;
  closeOnError: boolean;
  onRetry: () => void;
};

export function QrScannerViewport({
  readerId,
  status,
  errorMessage,
  errorDetails,
  closeOnSuccess,
  closeOnError,
  onRetry,
}: QrScannerViewportProps) {
  return (
    <div className="relative mb-4 aspect-square overflow-hidden rounded-xl bg-gray-100">
      <div id={readerId} className="h-full w-full" />

      {status === 'starting' ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-white/90 transition-opacity duration-300">
          <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-primary" />
          <p className="text-sm font-medium text-neutral-900">Memulai kamera...</p>
        </div>
      ) : null}

      {status === 'scanning' ? (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-4 py-2 backdrop-blur-sm">
          <p className="flex items-center gap-2 text-xs font-medium text-white">
            <span className="h-2 w-2 animate-pulse rounded-full bg-green-400" />
            Arahkan ke QR Code
          </p>
        </div>
      ) : null}

      {status === 'processing' ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-white/90 transition-opacity duration-300">
          <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-primary" />
          <p className="text-sm font-medium text-neutral-900">Memproses...</p>
        </div>
      ) : null}

      {status === 'success' ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-green-50/95 p-6 transition-all duration-500">
          <div className="relative">
            <div className="absolute inset-0 animate-ping rounded-full bg-green-400/30" />
            <div className="relative rounded-full bg-green-500 p-4">
              <span className="material-symbols-outlined text-4xl text-white">check</span>
            </div>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-green-800">Berhasil!</p>
            {!closeOnSuccess ? <p className="mt-1 text-sm text-green-700">Siap scan berikutnya...</p> : null}
          </div>
        </div>
      ) : null}

      {status === 'error' ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-white/95 p-6 transition-all duration-300">
          <div className="rounded-full bg-red-100 p-4">
            <span className="material-symbols-outlined text-4xl text-red-500">error</span>
          </div>
          <div className="text-center">
            {errorMessage ? <p className="text-base font-bold text-neutral-900">{errorMessage}</p> : null}
            {errorDetails ? <p className="mt-2 max-w-xs text-sm text-neutral-600">{errorDetails}</p> : null}
          </div>
          {closeOnError ? (
            <p className="mt-2 text-sm text-red-600">Menutup...</p>
          ) : (
            <button
              type="button"
              onClick={onRetry}
              className="mt-2 flex items-center gap-2 rounded-lg bg-primary px-6 py-3 font-bold text-white transition-colors hover:bg-primary-dark"
            >
              <span className="material-symbols-outlined text-xl">refresh</span>
              Coba Lagi
            </button>
          )}
        </div>
      ) : null}
    </div>
  );
}
