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
  const [status, setStatus] = useState<'idle' | 'starting' | 'scanning' | 'paused' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [manualStartRequired, setManualStartRequired] = useState(false);

  const stopScanner = useCallback(async () => {
    try {
      const qr = qrRef.current;
      if (qr) {
        try {
          await qr.stop();
        } catch {
          // ignore
        }
        try {
          await qr.clear();
        } catch {
          // ignore
        }
      }
    } finally {
      qrRef.current = null;
      setStatus('idle');
    }
  }, []);

  const startScanner = useCallback(async () => {
    setErrorMessage('');
    setManualStartRequired(false);
    setStatus('starting');

    const { Html5Qrcode } = await import('html5-qrcode');
    if (!qrRef.current) {
      qrRef.current = new Html5Qrcode(readerId);
    }

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
        setStatus('error');
        setManualStartRequired(true);

        const name = getErrorName(err2) || getErrorName(err);
        if (name === 'NotAllowedError') {
          setErrorMessage('Camera access denied. Please allow camera permission to scan.');
        } else if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
          setErrorMessage('No camera device found.');
        } else {
          setErrorMessage('Failed to start scanner.');
        }
      }
    }
  }, [autoResumeAfterMs, onScan, readerId]);

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
      startScanner().catch(() => {
        setStatus('error');
        setManualStartRequired(true);
        setErrorMessage('Failed to start scanner.');
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

          {manualStartRequired && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-white/80 dark:bg-black/50">
              {errorMessage && (
                <p className="text-sm text-neutral-900 dark:text-white text-center px-4">{errorMessage}</p>
              )}
              <button
                onClick={() => startScanner()}
                className="bg-primary hover:bg-red-700 text-white px-5 py-2.5 rounded-lg font-bold transition-colors"
              >
                Tap to Scan
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
            }}
            disabled={status !== 'paused'}
            className="flex-1 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 text-neutral-900 dark:text-white py-3 rounded-lg font-bold transition-colors disabled:opacity-50"
          >
            Resume
          </button>
          <button
            onClick={onClose}
            className="flex-1 bg-primary hover:bg-red-700 text-white py-3 rounded-lg font-bold transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default QRScannerModal;
