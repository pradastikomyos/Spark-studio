import { QrScannerManualEntry } from './qr-scanner-modal/QrScannerManualEntry';
import { QrScannerViewport } from './qr-scanner-modal/QrScannerViewport';
import { useQrScannerController } from './qr-scanner-modal/useQrScannerController';
import type { QrScannerModalProps } from './qr-scanner-modal/qrScannerTypes';

export default function QRScannerModal(props: QrScannerModalProps) {
  const { isOpen, title = 'Scan QR Code', closeOnSuccess = false, closeOnError = false } = props;
  const controller = useQrScannerController(props);

  if (!isOpen) return null;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm transition-opacity duration-300 ${
        controller.isClosing ? 'opacity-0' : 'opacity-100'
      }`}
      onClick={controller.handleClose}
    >
      <div
        className={`w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl transition-all duration-300 ${
          controller.isClosing ? 'scale-95 opacity-0' : 'scale-100 opacity-100'
        }`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-6 flex items-center justify-between">
          <h3 className="text-xl font-bold text-neutral-900">{title}</h3>
          <button
            type="button"
            onClick={controller.handleClose}
            className="rounded-lg p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <QrScannerViewport
          readerId={controller.readerId}
          status={controller.status}
          errorMessage={controller.errorMessage}
          errorDetails={controller.errorDetails}
          closeOnSuccess={closeOnSuccess}
          closeOnError={closeOnError}
          onRetry={controller.handleRetry}
        />

        <QrScannerManualEntry
          manualCode={controller.manualCode}
          manualSubmitting={controller.manualSubmitting}
          processing={controller.status === 'processing'}
          onChange={controller.handleManualCodeChange}
          onSubmit={(event) => void controller.handleManualSubmit(event)}
        />

        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={controller.handleClose}
            className="flex-1 rounded-lg bg-neutral-200 py-3 font-bold text-neutral-900 transition-colors hover:bg-neutral-300"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
