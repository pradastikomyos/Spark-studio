import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Html5Qrcode } from 'html5-qrcode';

type QRScannerModalProps = {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  onScan?: (decodedText: string) => void | Promise<void>;
  autoResumeAfterMs?: number;
};

const QRScannerModal = ({
  isOpen,
  onClose,
  title = 'Scan QR Code',
  onScan,
  autoResumeAfterMs,
}: QRScannerModalProps) => {
  const readerId = useMemo(
    () => `qr-reader-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    []
  );

  const qrRef = useRef<Html5Qrcode | null>(null);
  const isOpenRef = useRef(false);
  const cleanupDoneRef = useRef(false);
  const [status, setStatus] = useState<'idle' | 'starting' | 'scanning' | 'paused' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [errorDetails, setErrorDetails] = useState<string>('');
  const [manualStartRequired, setManualStartRequired] = useState(false);

  const stopScanner = useCallback(async () => {
    if (cleanupDoneRef.current) return;
    cleanupDoneRef.current = true;

    try {
      const qr = qrRef.current;
      if (qr) {
        try {
          const state = qr.getState();
          if (state === 2) { // SCANNING
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
      }
    } finally {
      qrRef.current = null;
      setStatus('idle');
      cleanupDoneRef.current = false;
    }
  }, []);

  const checkPermissionsAndHTTPS = useCallback(async (): Promise<{ ok: boolean; error?: string; details?: string }> => {
    // Check HTTPS
    if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
      return {
        ok: false,
        error: 'Kamera memerlukan koneksi HTTPS',
        details: 'Halaman ini harus diakses melalui HTTPS untuk menggunakan kamera. Pastikan URL dimulai dengan https://'
      };
    }

    // Check if mediaDevices API is available
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      return {
        ok: false,
        error: 'Browser tidak mendukung akses kamera',
        details: 'Browser Anda tidak mendukung API kamera. Coba gunakan browser modern seperti Chrome atau Safari.'
      };
    }

    // Check camera permission
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      // Stop the stream immediately, we just needed to check permission
      stream.getTracks().forEach(track => track.stop());
      return { ok: true };
    } catch (err: any) {
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        return {
          ok: false,
          error: 'Izin kamera ditolak',
          details: 'Silakan izinkan akses kamera di pengaturan browser Anda, lalu klik "Coba Lagi".'
        };
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        return {
          ok: false,
          error: 'Kamera tidak ditemukan',
          details: 'Tidak ada kamera yang terdeteksi pada perangkat Anda.'
        };
      } else {
        return {
          ok: false,
          error: 'Gagal mengakses kamera',
          details: err.message || 'Terjadi kesalahan saat mengakses kamera.'
        };
      }
    }
  }, []);

  const startScanner = useCallback(async () => {
    setErrorMessage('');
    setErrorDetails('');
    setManualStartRequired(false);
    setStatus('starting');

    // Check permissions and HTTPS first
    const permCheck = await checkPermissionsAndHTTPS();
    if (!permCheck.ok) {
      setStatus('error');
      setManualStartRequired(true);
      setErrorMessage(permCheck.error || 'Gagal memulai pemindai');
      setErrorDetails(permCheck.details || '');
      return;
    }

    // Clear any existing DOM element to prevent conflicts
    const existingElement = document.getElementById(readerId);
    if (existingElement) {
      existingElement.innerHTML = '';
    }

    const { Html5Qrcode } = await import('html5-qrcode');
    
    // Clean up any existing instance
    if (qrRef.current) {
      try {
        await stopScanner();
      } catch (e) {
        console.warn('Error cleaning up previous scanner:', e);
      }
    }

    qrRef.current = new Html5Qrcode(readerId);
    const qr = qrRef.current;
    const config = { fps: 10, qrbox: { width: 250, height: 250 } };

    const onScanSuccess = (decodedText: string) => {
      try {
        qr.pause(true);
      } catch {
        // ignore
      }
      setStatus('paused');
      Promise.resolve(onScan?.(decodedText))
        .catch(() => {
          // ignore
        })
        .finally(() => {
          if (!autoResumeAfterMs || autoResumeAfterMs <= 0) return;
          setTimeout(() => {
            if (!isOpenRef.current) return;
            const instance = qrRef.current;
            if (!instance) return;
            try {
              instance.resume();
              setStatus('scanning');
            } catch {
              // ignore
            }
          }, autoResumeAfterMs);
        });
    };

    const onScanFailure = () => {
      // ignore scan failures, keep scanning
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
        await qr.start(cameraId, config, onScanSuccess, onScanFailure);
      } else {
        await qr.start({ facingMode: { exact: 'environment' } }, config, onScanSuccess, onScanFailure);
      }
      setStatus('scanning');
    } catch (err: unknown) {
      try {
        await qr.start({ facingMode: 'environment' }, config, onScanSuccess, onScanFailure);
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
        setManualStartRequired(true);

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
  }, [autoResumeAfterMs, onScan, readerId, checkPermissionsAndHTTPS, stopScanner]);

  const resumeScanner = useCallback(() => {
    const qr = qrRef.current;
    if (!qr) return;
    try {
      qr.resume();
      setStatus('scanning');
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    isOpenRef.current = isOpen;
    if (!isOpen) return;
    
    const timer = setTimeout(() => {
      startScanner().catch((err) => {
        console.error('Failed to start scanner:', err);
        setStatus('error');
        setManualStartRequired(true);
        setErrorMessage('Gagal memulai pemindai');
        setErrorDetails('Terjadi kesalahan saat memulai pemindai. Coba klik "Coba Lagi" atau refresh halaman.');
      });
    }, 300);
    
    return () => clearTimeout(timer);
  }, [isOpen, startScanner]);

  useEffect(() => {
    if (!isOpen) {
      stopScanner().catch(() => {
        // ignore
      });
    }
  }, [isOpen, stopScanner]);

  useEffect(() => {
    return () => {
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

          {status === 'starting' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-white/90 dark:bg-black/70">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
              <p className="text-sm text-neutral-900 dark:text-white font-medium">Memulai kamera...</p>
            </div>
          )}

          {manualStartRequired && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-white/90 dark:bg-black/70 p-6">
              <span className="material-symbols-outlined text-5xl text-red-500 mb-2">error</span>
              {errorMessage && (
                <p className="text-base font-bold text-neutral-900 dark:text-white text-center">{errorMessage}</p>
              )}
              {errorDetails && (
                <p className="text-sm text-neutral-700 dark:text-gray-300 text-center max-w-xs">{errorDetails}</p>
              )}
              <button
                onClick={() => startScanner()}
                className="bg-primary hover:bg-red-700 text-white px-6 py-3 rounded-lg font-bold transition-colors mt-2 flex items-center gap-2"
              >
                <span className="material-symbols-outlined">refresh</span>
                Coba Lagi
              </button>
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => {
              resumeScanner();
              setManualStartRequired(false);
              setErrorMessage('');
              setErrorDetails('');
            }}
            disabled={status !== 'paused'}
            className="flex-1 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 text-neutral-900 dark:text-white py-3 rounded-lg font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Resume
          </button>
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
