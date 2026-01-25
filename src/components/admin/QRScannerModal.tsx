import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Html5Qrcode } from 'html5-qrcode';

type QRScannerModalProps = {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  onScan?: (decodedText: string) => void | Promise<void>;
  /** Delay before auto-resume in ms. Default: 2000 */
  autoResumeAfterMs?: number;
  autoResumeOnError?: boolean;
  /** If true, close modal automatically after successful scan. Default: false */
  closeOnSuccess?: boolean;
  /** Delay before closing modal on success (ms). Default: 1500 */
  closeDelayMs?: number;
  /** If true, close modal automatically after error/failed scan. Default: false */
  closeOnError?: boolean;
  /** Delay before closing modal on error (ms). Default: 2000 */
  closeOnErrorDelayMs?: number;
};

const QRScannerModal = ({
  isOpen,
  onClose,
  title = 'Scan QR Code',
  onScan,
  autoResumeAfterMs = 2000,
  autoResumeOnError = true,
  closeOnSuccess = false,
  closeDelayMs = 1500,
  closeOnError = false,
  closeOnErrorDelayMs = 2000,
}: QRScannerModalProps) => {
  const readerId = useMemo(
    () => `qr-reader-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    []
  );

  const qrRef = useRef<Html5Qrcode | null>(null);
  const isOpenRef = useRef(false);
  const processingRef = useRef(false);
  const [status, setStatus] = useState<'idle' | 'starting' | 'scanning' | 'processing' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [errorDetails, setErrorDetails] = useState<string>('');

  const stopScanner = useCallback(async () => {
    const qr = qrRef.current;
    if (!qr) return;

    try {
      const state = qr.getState();
      if (state === 2) { // Html5QrcodeScannerState.SCANNING
        await qr.stop();
      }
    } catch (e) {
      console.warn('Error stopping scanner:', e);
    }

    try {
      await qr.clear();
    } catch (e) {
      console.warn('Error clearing scanner:', e);
    }

    qrRef.current = null;
  }, []);

  const startScanner = useCallback(async () => {
    setErrorMessage('');
    setErrorDetails('');
    setStatus('starting');
    processingRef.current = false;

    // Clear any existing DOM element
    const existingElement = document.getElementById(readerId);
    if (existingElement) {
      existingElement.innerHTML = '';
    }

    // Clean up any existing instance
    if (qrRef.current) {
      try {
        await stopScanner();
      } catch (e) {
        console.warn('Error cleaning up previous scanner:', e);
      }
    }

    const { Html5Qrcode } = await import('html5-qrcode');
    qrRef.current = new Html5Qrcode(readerId);
    const qr = qrRef.current;
    const config = { fps: 10, qrbox: { width: 250, height: 250 } };

    const onScanSuccessHandler = async (decodedText: string) => {
      // Prevent duplicate scans
      if (processingRef.current) return;
      processingRef.current = true;

      // Stop scanner immediately
      setStatus('processing');
      try {
        const state = qr.getState();
        if (state === 2) {
          await qr.stop();
        }
      } catch (e) {
        console.warn('Error stopping scanner during scan:', e);
      }

      // Process the scan
      let scanSucceeded = false;
      try {
        await onScan?.(decodedText);
        // Only reach here if onScan didn't throw
        setStatus('success');
        setErrorMessage('');
        setErrorDetails('');
        scanSucceeded = true;
      } catch (err) {
        console.error('Scan processing error:', err);
        setStatus('error');
        const error = err instanceof Error ? err : new Error('Gagal memproses tiket');
        setErrorMessage(error.message);
        setErrorDetails('');
        scanSucceeded = false;
      }

      // Handle post-scan behavior
      if (scanSucceeded && closeOnSuccess) {
        // Close modal after delay on success
        setTimeout(() => {
          processingRef.current = false;
          onClose();
        }, closeDelayMs);
      } else if (!scanSucceeded && closeOnError) {
        // Close modal after delay on error
        setTimeout(() => {
          processingRef.current = false;
          onClose();
        }, closeOnErrorDelayMs);
      } else if (scanSucceeded) {
        // Auto-restart scanner after delay for next scan
        setTimeout(() => {
          if (!isOpenRef.current) return;
          processingRef.current = false;
          startScanner().catch((err) => {
            console.error('Failed to restart scanner:', err);
            setStatus('error');
            setErrorMessage('Gagal memulai ulang pemindai');
          });
        }, autoResumeAfterMs);
      } else if (autoResumeOnError) {
        setTimeout(() => {
          if (!isOpenRef.current) return;
          processingRef.current = false;
          startScanner().catch((err) => {
            console.error('Failed to restart scanner:', err);
            setStatus('error');
            setErrorMessage('Gagal memulai ulang pemindai');
          });
        }, autoResumeAfterMs);
      } else {
        processingRef.current = false;
      }
    };

    const onScanFailure = () => {
      // Ignore scan failures, keep scanning
    };

    const pickBackCameraId = async () => {
      try {
        const devices = await Html5Qrcode.getCameras();
        if (!devices?.length) return null;
        const back = devices.find((d) => {
          const label = (d.label || '').toLowerCase();
          return label.includes('back') || label.includes('rear') || label.includes('environment');
        });
        return (back?.id || devices[devices.length - 1].id) ?? null;
      } catch {
        return null;
      }
    };

    const getErrorName = (e: unknown) => {
      if (!e || typeof e !== 'object') return undefined;
      if (!('name' in e)) return undefined;
      const name = (e as { name?: unknown }).name;
      return typeof name === 'string' ? name : undefined;
    };

    try {
      const cameraId = await pickBackCameraId();
      if (cameraId) {
        await qr.start(cameraId, config, onScanSuccessHandler, onScanFailure);
      } else {
        await qr.start({ facingMode: { exact: 'environment' } }, config, onScanSuccessHandler, onScanFailure);
      }
      setStatus('scanning');
    } catch (err: unknown) {
      try {
        await qr.start({ facingMode: 'environment' }, config, onScanSuccessHandler, onScanFailure);
        setStatus('scanning');
      } catch (err2: unknown) {
        // Clean up failed instance
        try {
          await qr.clear();
        } catch (e) {
          console.warn('Error clearing failed scanner:', e);
        }
        qrRef.current = null;

        setStatus('error');
        const name = getErrorName(err2) || getErrorName(err);
        if (name === 'NotAllowedError') {
          setErrorMessage('Izin kamera ditolak');
          setErrorDetails('Silakan izinkan akses kamera di pengaturan browser Anda, lalu klik "Coba Lagi".');
        } else if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
          setErrorMessage('Kamera tidak ditemukan');
          setErrorDetails('Tidak ada kamera yang terdeteksi pada perangkat Anda.');
        } else {
          setErrorMessage('Gagal memulai pemindai');
          setErrorDetails('Terjadi kesalahan saat memulai pemindai. Coba refresh halaman atau gunakan browser lain.');
        }
      }
    }
    }, [autoResumeAfterMs, autoResumeOnError, closeOnSuccess, closeDelayMs, closeOnError, closeOnErrorDelayMs, onScan, onClose, readerId, stopScanner]);

  useEffect(() => {
    isOpenRef.current = isOpen;
    if (!isOpen) return;

    const timer = setTimeout(() => {
      startScanner().catch((err) => {
        console.error('Failed to start scanner:', err);
        setStatus('error');
        setErrorMessage('Gagal memulai pemindai');
        setErrorDetails('Terjadi kesalahan saat memulai pemindai. Coba tutup dan buka kembali modal.');
      });
    }, 300);

    return () => clearTimeout(timer);
  }, [isOpen, startScanner]);

  useEffect(() => {
    if (!isOpen) {
      processingRef.current = false;
      stopScanner().catch(() => {
        // ignore
      });
      setStatus('idle');
    }
  }, [isOpen, stopScanner]);

  useEffect(() => {
    return () => {
      processingRef.current = false;
      stopScanner().catch(() => {
        // ignore
      });
    };
  }, [stopScanner]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-[#1a0f0f] rounded-2xl shadow-2xl max-w-md w-full p-6 border border-gray-200 dark:border-white/10">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-neutral-900 dark:text-white">{title}</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="relative aspect-square bg-gray-100 dark:bg-gray-800 rounded-xl overflow-hidden mb-4">
          <div id={readerId} className="h-full w-full" />

          {/* Starting State */}
          {status === 'starting' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-white/90 dark:bg-black/70">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
              <p className="text-sm text-neutral-900 dark:text-white font-medium">Memulai kamera...</p>
            </div>
          )}

          {/* Processing State */}
          {status === 'processing' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-white/90 dark:bg-black/70">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
              <p className="text-sm text-neutral-900 dark:text-white font-medium">Memproses tiket...</p>
            </div>
          )}

          {/* Success State */}
          {status === 'success' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-green-50/95 dark:bg-green-900/70 p-6">
              <div className="animate-bounce">
                <span className="material-symbols-outlined text-6xl text-green-600 dark:text-green-400">check_circle</span>
              </div>
              <p className="text-base font-bold text-green-800 dark:text-green-200">Tiket Valid!</p>
              {closeOnSuccess ? (
                <p className="text-sm text-green-700 dark:text-green-300">Menutup scanner...</p>
              ) : (
                <p className="text-sm text-green-700 dark:text-green-300">Memulai ulang pemindai...</p>
              )}
            </div>
          )}

          {/* Error State */}
          {status === 'error' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-white/90 dark:bg-black/70 p-6">
              <span className="material-symbols-outlined text-5xl text-red-500 mb-2">error</span>
              {errorMessage && (
                <p className="text-base font-bold text-neutral-900 dark:text-white text-center">{errorMessage}</p>
              )}
              {errorDetails && (
                <p className="text-sm text-neutral-700 dark:text-gray-300 text-center max-w-xs">{errorDetails}</p>
              )}
              {closeOnError ? (
                <p className="text-sm text-red-700 dark:text-red-300">Menutup scanner...</p>
              ) : (
                <button
                  onClick={() => startScanner()}
                  className="bg-primary hover:bg-red-700 text-white px-6 py-3 rounded-lg font-bold transition-colors mt-2 flex items-center gap-2"
                >
                  <span className="material-symbols-outlined">refresh</span>
                  Coba Lagi
                </button>
              )}
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 bg-primary hover:bg-red-700 text-white py-3 rounded-lg font-bold transition-colors"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};

export default QRScannerModal;
