import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Html5Qrcode } from 'html5-qrcode';

// ============================================================================
// iOS/Safari Detection Utilities
// ============================================================================

/**
 * Detects if the current device is running iOS (iPhone/iPad)
 * Note: All browsers on iOS use WebKit, so Chrome/Firefox on iOS behave like Safari
 */
const isIOS = (): boolean => {
  if (typeof navigator === 'undefined') return false;

  const ua = navigator.userAgent;
  // Check for iPhone, iPad, iPod
  const isAppleDevice = /iPad|iPhone|iPod/.test(ua);
  // iPad on iOS 13+ reports as Mac, check for touch support
  const isIPadOS = /Macintosh/.test(ua) && navigator.maxTouchPoints > 1;

  return isAppleDevice || isIPadOS;
};

/**
 * Detects if the browser is Safari (not Chrome/Firefox on Mac)
 */
const isSafari = (): boolean => {
  if (typeof navigator === 'undefined') return false;

  const ua = navigator.userAgent;
  // Safari but not Chrome/Firefox
  return /Safari/.test(ua) && !/Chrome/.test(ua) && !/Firefox/.test(ua);
};

/**
 * Calculate responsive QR box size based on viewport and device
 * iOS cameras are more sensitive to aspect ratio constraints
 */
const calculateResponsiveQrBox = (containerSize: number): { width: number; height: number } => {
  // For iOS, use smaller qrbox to ensure camera view fits properly
  const isAppleDevice = isIOS();
  const sizeFactor = isAppleDevice ? 0.6 : 0.7; // iOS gets smaller box
  const size = Math.min(Math.floor(containerSize * sizeFactor), 250);

  return { width: size, height: size };
};

type QRScannerModalProps = {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  onScan?: (decodedText: string) => void | Promise<void>;
  /** Delay before auto-resume in ms. Default: 3000 */
  autoResumeAfterMs?: number;
  autoResumeOnError?: boolean;
  /** If true, close modal automatically after successful scan. Default: false */
  closeOnSuccess?: boolean;
  /** Delay before closing modal on success (ms). Default: 2500 */
  closeDelayMs?: number;
  /** If true, close modal automatically after error/failed scan. Default: false */
  closeOnError?: boolean;
  /** Delay before closing modal on error (ms). Default: 3000 */
  closeOnErrorDelayMs?: number;
};

const QRScannerModal = ({
  isOpen,
  onClose,
  title = 'Scan QR Code',
  onScan,
  autoResumeAfterMs = 3000,
  autoResumeOnError = true,
  closeOnSuccess = false,
  closeDelayMs = 2500,
  closeOnError = false,
  closeOnErrorDelayMs = 3000,
}: QRScannerModalProps) => {
  const readerId = useMemo(
    () => `qr-reader-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    []
  );

  const qrRef = useRef<Html5Qrcode | null>(null);
  const isOpenRef = useRef(false);
  const processingRef = useRef(false);
  const lastScannedRef = useRef<string>('');
  const lastScannedTimeRef = useRef<number>(0);
  const closingRef = useRef(false);
  const [status, setStatus] = useState<'idle' | 'starting' | 'scanning' | 'processing' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [errorDetails, setErrorDetails] = useState<string>('');
  const [isClosing, setIsClosing] = useState(false);

  // Manual input fallback state
  const [manualCode, setManualCode] = useState('');
  const [manualSubmitting, setManualSubmitting] = useState(false);

  // Debounce time to prevent duplicate scans (ms)
  const SCAN_DEBOUNCE_MS = 2000;

  const handleClose = useCallback(() => {
    if (closingRef.current) return;
    closingRef.current = true;
    setIsClosing(true);

    // Smooth closing animation
    setTimeout(() => {
      onClose();
      setIsClosing(false);
      closingRef.current = false;
      setManualCode(''); // Reset manual input on close
    }, 300);
  }, [onClose]);

  // Handle manual code submission (fallback when camera fails)
  const handleManualSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    const code = manualCode.trim();
    if (!code || manualSubmitting || processingRef.current) return;

    setManualSubmitting(true);
    processingRef.current = true;
    setStatus('processing');

    try {
      await onScan?.(code);
      setStatus('success');
      setManualCode('');
      setErrorMessage('');
      setErrorDetails('');

      // Auto-close on success if configured
      if (closeOnSuccess) {
        setTimeout(() => {
          processingRef.current = false;
          handleClose();
        }, closeDelayMs);
      } else {
        setTimeout(() => {
          processingRef.current = false;
          setStatus('scanning');
        }, autoResumeAfterMs);
      }
    } catch (err) {
      setStatus('error');
      const error = err instanceof Error ? err : new Error('Gagal memproses');
      setErrorMessage(error.message);

      if (closeOnError) {
        setTimeout(() => {
          processingRef.current = false;
          handleClose();
        }, closeOnErrorDelayMs);
      } else {
        setTimeout(() => {
          processingRef.current = false;
          setStatus('scanning');
        }, autoResumeAfterMs);
      }
    } finally {
      setManualSubmitting(false);
    }
  }, [manualCode, manualSubmitting, onScan, closeOnSuccess, closeDelayMs, closeOnError, closeOnErrorDelayMs, autoResumeAfterMs, handleClose]);

  const stopScanner = useCallback(async () => {
    const qr = qrRef.current;
    if (!qr) return;

    try {
      // Check if scanner is in a valid state before trying to stop
      // Html5QrcodeScannerState: NOT_STARTED=0, SCANNING=2, PAUSED=3
      const state = qr.getState();
      if (state === 2) { // Html5QrcodeScannerState.SCANNING
        await qr.stop();
      }
    } catch (e) {
      // Ignore errors during stop - scanner might already be stopped
      console.warn('[QRScanner] Error stopping scanner:', e);
    }

    try {
      await qr.clear();
    } catch (e) {
      // Ignore errors during clear - DOM might already be cleaned
      console.warn('[QRScanner] Error clearing scanner:', e);
    }

    // Defensive DOM cleanup: ensure video elements are removed
    // This prevents memory leaks on iOS Safari which can retain video streams
    try {
      const readerElement = document.getElementById(readerId);
      if (readerElement) {
        // Stop any lingering video tracks
        const videos = readerElement.querySelectorAll('video');
        videos.forEach((video) => {
          const stream = video.srcObject as MediaStream | null;
          if (stream) {
            stream.getTracks().forEach((track) => {
              track.stop();
            });
          }
          video.srcObject = null;
        });
        // Clear the container
        readerElement.innerHTML = '';
      }
    } catch (e) {
      console.warn('[QRScanner] Error cleaning up DOM:', e);
    }

    qrRef.current = null;
  }, [readerId]);

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

    // Calculate responsive qrbox based on container size
    // iOS needs special handling for camera aspect ratio
    const container = document.getElementById(readerId);
    const containerWidth = container?.clientWidth || 280;
    const qrbox = calculateResponsiveQrBox(containerWidth);

    // iOS cameras work better with lower FPS to reduce processing load
    const fps = isIOS() ? 3 : 5;
    const config = { fps, qrbox };

    const onScanSuccessHandler = async (decodedText: string) => {
      // Prevent duplicate scans with debounce
      const now = Date.now();
      if (
        processingRef.current ||
        (decodedText === lastScannedRef.current && now - lastScannedTimeRef.current < SCAN_DEBOUNCE_MS)
      ) {
        return;
      }

      processingRef.current = true;
      lastScannedRef.current = decodedText;
      lastScannedTimeRef.current = now;

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
        const error = err instanceof Error ? err : new Error('Gagal memproses');
        setErrorMessage(error.message);
        setErrorDetails('');
        scanSucceeded = false;
      }

      // Handle post-scan behavior with smooth transitions
      if (scanSucceeded && closeOnSuccess) {
        // Show success state for a moment, then close smoothly
        setTimeout(() => {
          processingRef.current = false;
          handleClose();
        }, closeDelayMs);
      } else if (!scanSucceeded && closeOnError) {
        // Show error state for a moment, then close smoothly
        setTimeout(() => {
          processingRef.current = false;
          handleClose();
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

    // iOS Safari requires different camera constraints approach
    const appleDevice = isIOS();
    const safariOnMac = isSafari() && !appleDevice;

    try {
      const cameraId = await pickBackCameraId();

      if (cameraId) {
        await qr.start(cameraId, config, onScanSuccessHandler, onScanFailure);
      } else if (appleDevice) {
        // iOS: use 'environment' without 'exact' for better compatibility
        // iOS WebKit is strict about facingMode constraints
        await qr.start({ facingMode: 'environment' }, config, onScanSuccessHandler, onScanFailure);
      } else {
        // Non-iOS: try exact first
        await qr.start({ facingMode: { exact: 'environment' } }, config, onScanSuccessHandler, onScanFailure);
      }
      setStatus('scanning');
    } catch (err: unknown) {
      // Fallback: try without 'exact' constraint
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
          // iOS-specific guidance vs generic browser guidance
          if (appleDevice) {
            setErrorDetails(
              'Di iPhone/iPad: Buka Settings → Safari → Camera → Izinkan. ' +
              'Lalu kembali ke halaman ini dan klik "Coba Lagi".'
            );
          } else if (safariOnMac) {
            setErrorDetails(
              'Di Safari Mac: Klik Safari → Settings → Websites → Camera. ' +
              'Pilih "Allow" untuk situs ini, lalu klik "Coba Lagi".'
            );
          } else {
            setErrorDetails(
              'Silakan izinkan akses kamera di pengaturan browser Anda, lalu klik "Coba Lagi".'
            );
          }
        } else if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
          setErrorMessage('Kamera tidak ditemukan');
          setErrorDetails('Tidak ada kamera yang terdeteksi pada perangkat Anda.');
        } else if (name === 'NotReadableError' || name === 'TrackStartError') {
          // This happens on iOS when camera is in use by another app
          setErrorMessage('Kamera sedang digunakan');
          setErrorDetails(
            appleDevice
              ? 'Tutup aplikasi lain yang menggunakan kamera, lalu klik "Coba Lagi".'
              : 'Pastikan tidak ada aplikasi lain yang menggunakan kamera.'
          );
        } else if (name === 'OverconstrainedError') {
          // iOS camera doesn't support the requested constraints
          setErrorMessage('Kamera tidak kompatibel');
          setErrorDetails('Kamera perangkat Anda tidak mendukung konfigurasi yang diminta. Coba gunakan kamera lain.');
        } else {
          setErrorMessage('Gagal memulai pemindai');
          setErrorDetails(
            appleDevice
              ? 'Coba tutup Safari, buka ulang, dan scan lagi. Jika masih error, restart perangkat.'
              : 'Terjadi kesalahan saat memulai pemindai. Coba refresh halaman atau gunakan browser lain.'
          );
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoResumeAfterMs, autoResumeOnError, closeOnSuccess, closeDelayMs, closeOnError, closeOnErrorDelayMs, onScan, handleClose, readerId, stopScanner]);

  useEffect(() => {
    isOpenRef.current = isOpen;
    if (!isOpen) return;

    // Reset states when opening
    setIsClosing(false);
    closingRef.current = false;
    lastScannedRef.current = '';
    lastScannedTimeRef.current = 0;

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
      closingRef.current = false;
      stopScanner().catch(() => {
        // ignore
      });
      setStatus('idle');
    }
  }, [isOpen, stopScanner]);

  // ============================================================================
  // Phase 2: Visibility Change Handling for iOS Tab Freezing
  // ============================================================================
  // iOS Safari aggressively freezes background tabs, killing camera streams.
  // When user switches to another app (e.g., payment app) and returns,
  // the camera stream is dead. This handler restarts it automatically.
  useEffect(() => {
    if (!isOpen) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        // Tab is going to background - stop scanner to release camera
        // This prevents iOS from killing the tab due to camera resource usage
        console.log('[QRScanner] Tab hidden, stopping scanner');
        stopScanner().catch((e) => {
          console.warn('[QRScanner] Error stopping scanner on hide:', e);
        });
        setStatus('idle');
      } else if (document.visibilityState === 'visible') {
        // Tab is coming back to foreground - restart scanner
        // Small delay to let iOS Safari stabilize after app switch
        console.log('[QRScanner] Tab visible, restarting scanner');
        const delay = isIOS() ? 500 : 200; // iOS needs more time to stabilize

        setTimeout(() => {
          if (!isOpenRef.current || processingRef.current) return;

          startScanner().catch((err) => {
            console.error('[QRScanner] Failed to restart scanner after visibility change:', err);
            setStatus('error');
            setErrorMessage('Gagal memulai ulang pemindai');
            setErrorDetails(
              isIOS()
                ? 'Kamera perlu dimulai ulang setelah Anda kembali. Klik "Coba Lagi".'
                : 'Terjadi kesalahan. Klik "Coba Lagi" untuk mencoba lagi.'
            );
          });
        }, delay);
      }
    };

    // Also handle page unload for Safari which doesn't always fire visibilitychange
    const handlePageHide = () => {
      console.log('[QRScanner] Page hide, stopping scanner');
      stopScanner().catch(() => {
        // ignore
      });
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pagehide', handlePageHide);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pagehide', handlePageHide);
    };
  }, [isOpen, startScanner, stopScanner]);

  useEffect(() => {
    return () => {
      processingRef.current = false;
      closingRef.current = false;
      stopScanner().catch(() => {
        // ignore
      });
    };
  }, [stopScanner]);

  if (!isOpen) return null;

  return (
    <div
      className={`fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 transition-opacity duration-300 ${isClosing ? 'opacity-0' : 'opacity-100'}`}
      onClick={handleClose}
    >
      <div
        className={`bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-gray-200 transition-all duration-300 ${isClosing ? 'scale-95 opacity-0' : 'scale-100 opacity-100'}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-neutral-900">{title}</h3>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-lg hover:bg-gray-100"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="relative aspect-square bg-gray-100 rounded-xl overflow-hidden mb-4">
          <div id={readerId} className="h-full w-full" />

          {/* Starting State */}
          {status === 'starting' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-white/90 transition-opacity duration-300">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
              <p className="text-sm text-neutral-900 font-medium">Memulai kamera...</p>
            </div>
          )}

          {/* Scanning State - subtle indicator */}
          {status === 'scanning' && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-sm px-4 py-2 rounded-full">
              <p className="text-xs text-white font-medium flex items-center gap-2">
                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                Arahkan ke QR Code
              </p>
            </div>
          )}

          {/* Processing State */}
          {status === 'processing' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-white/90 transition-opacity duration-300">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
              <p className="text-sm text-neutral-900 font-medium">Memproses...</p>
            </div>
          )}

          {/* Success State - Clear and visible */}
          {status === 'success' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-green-50/95 p-6 transition-all duration-500">
              <div className="relative">
                <div className="absolute inset-0 bg-green-400/30 rounded-full animate-ping"></div>
                <div className="relative bg-green-500 rounded-full p-4">
                  <span className="material-symbols-outlined text-4xl text-white">check</span>
                </div>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-green-800">Berhasil!</p>
                {!closeOnSuccess && (
                  <p className="text-sm text-green-700 mt-1">Siap scan berikutnya...</p>
                )}
              </div>
            </div>
          )}

          {/* Error State */}
          {status === 'error' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-white/95 p-6 transition-all duration-300">
              <div className="bg-red-100 rounded-full p-4">
                <span className="material-symbols-outlined text-4xl text-red-500">error</span>
              </div>
              <div className="text-center">
                {errorMessage && (
                  <p className="text-base font-bold text-neutral-900">{errorMessage}</p>
                )}
                {errorDetails && (
                  <p className="text-sm text-neutral-600 mt-2 max-w-xs">{errorDetails}</p>
                )}
              </div>
              {closeOnError ? (
                <p className="text-sm text-red-600 mt-2">Menutup...</p>
              ) : (
                <button
                  onClick={() => startScanner()}
                  className="bg-primary hover:bg-red-700 text-white px-6 py-3 rounded-lg font-bold transition-colors mt-2 flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-xl">refresh</span>
                  Coba Lagi
                </button>
              )}
            </div>
          )}
        </div>

        {/* Manual Input Fallback - Safety Net for Camera Issues */}
        <div className="pt-4 border-t border-gray-100">
          <p className="text-xs text-center text-gray-500 mb-3">
            📝 Kamera bermasalah? Input kode manual:
          </p>
          <form onSubmit={handleManualSubmit} className="flex gap-2">
            <input
              type="text"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value.toUpperCase())}
              placeholder="Contoh: TKT-ABC-123"
              disabled={manualSubmitting || status === 'processing'}
              className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm font-mono uppercase focus:ring-2 focus:ring-primary outline-none disabled:opacity-50 text-neutral-900 placeholder:text-gray-400"
            />
            <button
              type="submit"
              disabled={!manualCode.trim() || manualSubmitting || status === 'processing'}
              className="bg-primary text-white px-5 py-2.5 rounded-lg text-sm font-bold disabled:opacity-50 hover:bg-red-700 transition-colors flex items-center gap-1"
            >
              {manualSubmitting ? (
                <span className="material-symbols-outlined text-lg animate-spin">progress_activity</span>
              ) : (
                <>
                  <span className="material-symbols-outlined text-lg">check</span>
                  Cek
                </>
              )}
            </button>
          </form>
        </div>

        <div className="flex gap-2 mt-4">
          <button
            onClick={handleClose}
            className="flex-1 bg-neutral-200 hover:bg-neutral-300 text-neutral-900 py-3 rounded-lg font-bold transition-colors"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};

export default QRScannerModal;
