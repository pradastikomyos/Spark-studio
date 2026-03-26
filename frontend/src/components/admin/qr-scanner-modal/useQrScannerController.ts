import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import type { Html5Qrcode } from 'html5-qrcode';
import { calculateResponsiveQrBox, isIOS, isSafari } from './qrScannerEnvironment';
import { mapScannerStartError } from './qrScannerErrors';
import type { QrScannerControllerResult, QrScannerModalProps, QrScannerStatus } from './qrScannerTypes';

const SCAN_DEBOUNCE_MS = 2000;

export function useQrScannerController({
  isOpen,
  onClose,
  onScan,
  autoResumeAfterMs = 3000,
  autoResumeOnError = true,
  closeOnSuccess = false,
  closeDelayMs = 2500,
  closeOnError = false,
  closeOnErrorDelayMs = 3000,
}: QrScannerModalProps): QrScannerControllerResult {
  const readerId = useMemo(() => `qr-reader-${Date.now()}-${Math.random().toString(16).slice(2)}`, []);
  const qrRef = useRef<Html5Qrcode | null>(null);
  const isOpenRef = useRef(false);
  const processingRef = useRef(false);
  const lastScannedRef = useRef('');
  const lastScannedTimeRef = useRef(0);
  const closingRef = useRef(false);
  const timersRef = useRef<number[]>([]);

  const [status, setStatus] = useState<QrScannerStatus>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [errorDetails, setErrorDetails] = useState('');
  const [isClosing, setIsClosing] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [manualSubmitting, setManualSubmitting] = useState(false);

  const trackTimer = useCallback((timer: number) => {
    timersRef.current.push(timer);
    return timer;
  }, []);

  const clearTimers = useCallback(() => {
    timersRef.current.forEach((timer) => window.clearTimeout(timer));
    timersRef.current = [];
  }, []);

  const clearReaderDom = useCallback(() => {
    try {
      const readerElement = document.getElementById(readerId);
      if (!readerElement) return;

      const videos = readerElement.querySelectorAll('video');
      videos.forEach((video) => {
        const stream = video.srcObject as MediaStream | null;
        if (stream) {
          stream.getTracks().forEach((track) => track.stop());
        }
        video.srcObject = null;
      });
      readerElement.innerHTML = '';
    } catch (error) {
      console.warn('[QRScanner] Error cleaning up DOM:', error);
    }
  }, [readerId]);

  const stopScanner = useCallback(async () => {
    const qr = qrRef.current;
    if (!qr) return;

    try {
      if (qr.getState() === 2) {
        await qr.stop();
      }
    } catch (error) {
      console.warn('[QRScanner] Error stopping scanner:', error);
    }

    try {
      await qr.clear();
    } catch (error) {
      console.warn('[QRScanner] Error clearing scanner:', error);
    }

    clearReaderDom();
    qrRef.current = null;
  }, [clearReaderDom]);

  const handleClose = useCallback(() => {
    if (closingRef.current) return;

    closingRef.current = true;
    setIsClosing(true);
    clearTimers();
    trackTimer(
      window.setTimeout(() => {
        onClose();
        setIsClosing(false);
        closingRef.current = false;
        setManualCode('');
      }, 300)
    );
  }, [clearTimers, onClose, trackTimer]);

  const handleManualCodeChange = useCallback((value: string) => {
    setManualCode(value.toUpperCase());
  }, []);

  const startScanner = useCallback(async () => {
    clearTimers();
    setErrorMessage('');
    setErrorDetails('');
    setStatus('starting');
    processingRef.current = false;

    clearReaderDom();

    if (qrRef.current) {
      try {
        await stopScanner();
      } catch (error) {
        console.warn('Error cleaning up previous scanner:', error);
      }
    }

    const { Html5Qrcode } = await import('html5-qrcode');
    qrRef.current = new Html5Qrcode(readerId);
    const qr = qrRef.current;

    const container = document.getElementById(readerId);
    const containerWidth = container?.clientWidth || 280;
    const qrbox = calculateResponsiveQrBox(containerWidth);
    const appleDevice = isIOS();
    const safariOnMac = isSafari() && !appleDevice;
    const fps = appleDevice ? 3 : 5;
    const config = { fps, qrbox };

    const scheduleResume = (onError = false) => {
      trackTimer(
        window.setTimeout(() => {
          if (!isOpenRef.current) return;
          processingRef.current = false;
          void startScanner().catch((error) => {
            console.error('Failed to restart scanner:', error);
            setStatus('error');
            setErrorMessage(onError ? 'Gagal memulai ulang pemindai' : 'Gagal memulai ulang pemindai');
            setErrorDetails('');
          });
        }, autoResumeAfterMs)
      );
    };

    const onScanSuccessHandler = async (decodedText: string) => {
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
      setStatus('processing');

      try {
        if (qr.getState() === 2) {
          await qr.stop();
        }
      } catch (error) {
        console.warn('Error stopping scanner during scan:', error);
      }

      let scanSucceeded = false;
      try {
        await onScan?.(decodedText);
        setStatus('success');
        setErrorMessage('');
        setErrorDetails('');
        scanSucceeded = true;
      } catch (error) {
        console.error('Scan processing error:', error);
        setStatus('error');
        const nextError = error instanceof Error ? error : new Error('Gagal memproses');
        setErrorMessage(nextError.message);
        setErrorDetails('');
      }

      if (scanSucceeded && closeOnSuccess) {
        trackTimer(
          window.setTimeout(() => {
            processingRef.current = false;
            handleClose();
          }, closeDelayMs)
        );
        return;
      }

      if (!scanSucceeded && closeOnError) {
        trackTimer(
          window.setTimeout(() => {
            processingRef.current = false;
            handleClose();
          }, closeOnErrorDelayMs)
        );
        return;
      }

      if (scanSucceeded) {
        scheduleResume(false);
      } else if (autoResumeOnError) {
        scheduleResume(true);
      } else {
        processingRef.current = false;
      }
    };

    const onScanFailure = () => undefined;

    const pickBackCameraId = async () => {
      try {
        const devices = await Html5Qrcode.getCameras();
        if (!devices?.length) return null;
        const back = devices.find((device) => {
          const label = (device.label || '').toLowerCase();
          return label.includes('back') || label.includes('rear') || label.includes('environment');
        });
        return (back?.id || devices[devices.length - 1].id) ?? null;
      } catch {
        return null;
      }
    };

    try {
      const cameraId = await pickBackCameraId();

      if (cameraId) {
        await qr.start(cameraId, config, onScanSuccessHandler, onScanFailure);
      } else if (appleDevice) {
        await qr.start({ facingMode: 'environment' }, config, onScanSuccessHandler, onScanFailure);
      } else {
        await qr.start({ facingMode: { exact: 'environment' } }, config, onScanSuccessHandler, onScanFailure);
      }
      setStatus('scanning');
    } catch (primaryError) {
      try {
        await qr.start({ facingMode: 'environment' }, config, onScanSuccessHandler, onScanFailure);
        setStatus('scanning');
      } catch (fallbackError) {
        try {
          await qr.clear();
        } catch (error) {
          console.warn('Error clearing failed scanner:', error);
        }
        qrRef.current = null;
        setStatus('error');
        const mapped = mapScannerStartError({ appleDevice, safariOnMac, primaryError, fallbackError });
        setErrorMessage(mapped.message);
        setErrorDetails(mapped.details);
      }
    }
  }, [
    autoResumeAfterMs,
    autoResumeOnError,
    clearReaderDom,
    clearTimers,
    closeDelayMs,
    closeOnError,
    closeOnErrorDelayMs,
    closeOnSuccess,
    handleClose,
    onScan,
    readerId,
    stopScanner,
    trackTimer,
  ]);

  const handleRetry = useCallback(() => {
    void startScanner();
  }, [startScanner]);

  const handleManualSubmit = useCallback(
    async (event: FormEvent) => {
      event.preventDefault();
      const code = manualCode.trim();
      if (!code || manualSubmitting || processingRef.current) return;

      clearTimers();
      setManualSubmitting(true);
      processingRef.current = true;
      setStatus('processing');

      try {
        await onScan?.(code);
        setStatus('success');
        setManualCode('');
        setErrorMessage('');
        setErrorDetails('');

        if (closeOnSuccess) {
          trackTimer(
            window.setTimeout(() => {
              processingRef.current = false;
              handleClose();
            }, closeDelayMs)
          );
        } else {
          trackTimer(
            window.setTimeout(() => {
              processingRef.current = false;
              setStatus('scanning');
            }, autoResumeAfterMs)
          );
        }
      } catch (error) {
        const nextError = error instanceof Error ? error : new Error('Gagal memproses');
        setStatus('error');
        setErrorMessage(nextError.message);
        setErrorDetails('');

        if (closeOnError) {
          trackTimer(
            window.setTimeout(() => {
              processingRef.current = false;
              handleClose();
            }, closeOnErrorDelayMs)
          );
        } else {
          trackTimer(
            window.setTimeout(() => {
              processingRef.current = false;
              setStatus('scanning');
            }, autoResumeAfterMs)
          );
        }
      } finally {
        setManualSubmitting(false);
      }
    },
    [
      autoResumeAfterMs,
      clearTimers,
      closeDelayMs,
      closeOnError,
      closeOnErrorDelayMs,
      closeOnSuccess,
      handleClose,
      manualCode,
      manualSubmitting,
      onScan,
      trackTimer,
    ]
  );

  useEffect(() => {
    isOpenRef.current = isOpen;
    if (!isOpen) return;

    setIsClosing(false);
    closingRef.current = false;
    lastScannedRef.current = '';
    lastScannedTimeRef.current = 0;
    trackTimer(
      window.setTimeout(() => {
        void startScanner().catch((error) => {
          console.error('Failed to start scanner:', error);
          setStatus('error');
          setErrorMessage('Gagal memulai pemindai');
          setErrorDetails('Terjadi kesalahan saat memulai pemindai. Coba tutup dan buka kembali modal.');
        });
      }, 300)
    );

    return () => {
      clearTimers();
    };
  }, [clearTimers, isOpen, startScanner, trackTimer]);

  useEffect(() => {
    if (isOpen) return;
    clearTimers();
    processingRef.current = false;
    closingRef.current = false;
    void stopScanner();
    setStatus('idle');
  }, [clearTimers, isOpen, stopScanner]);

  useEffect(() => {
    if (!isOpen) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        void stopScanner();
        setStatus('idle');
        return;
      }

      if (document.visibilityState === 'visible') {
        const delay = isIOS() ? 500 : 200;
        trackTimer(
          window.setTimeout(() => {
            if (!isOpenRef.current || processingRef.current) return;
            void startScanner().catch((error) => {
              console.error('[QRScanner] Failed to restart scanner after visibility change:', error);
              setStatus('error');
              setErrorMessage('Gagal memulai ulang pemindai');
              setErrorDetails(
                isIOS()
                  ? 'Kamera perlu dimulai ulang setelah Anda kembali. Klik "Coba Lagi".'
                  : 'Terjadi kesalahan. Klik "Coba Lagi" untuk mencoba lagi.'
              );
            });
          }, delay)
        );
      }
    };

    const handlePageHide = () => {
      void stopScanner();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pagehide', handlePageHide);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pagehide', handlePageHide);
    };
  }, [isOpen, startScanner, stopScanner, trackTimer]);

  useEffect(() => {
    return () => {
      clearTimers();
      processingRef.current = false;
      closingRef.current = false;
      void stopScanner();
    };
  }, [clearTimers, stopScanner]);

  return {
    readerId,
    status,
    errorMessage,
    errorDetails,
    isClosing,
    manualCode,
    manualSubmitting,
    handleClose,
    handleManualCodeChange,
    handleManualSubmit,
    handleRetry,
  };
}
