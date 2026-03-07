import type { FormEvent } from 'react';

export type QrScannerStatus = 'idle' | 'starting' | 'scanning' | 'processing' | 'success' | 'error';

export type QrScannerModalProps = {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  onScan?: (decodedText: string) => void | Promise<void>;
  autoResumeAfterMs?: number;
  autoResumeOnError?: boolean;
  closeOnSuccess?: boolean;
  closeDelayMs?: number;
  closeOnError?: boolean;
  closeOnErrorDelayMs?: number;
};

export type QrScannerControllerResult = {
  readerId: string;
  status: QrScannerStatus;
  errorMessage: string;
  errorDetails: string;
  isClosing: boolean;
  manualCode: string;
  manualSubmitting: boolean;
  handleClose: () => void;
  handleManualCodeChange: (value: string) => void;
  handleManualSubmit: (event: FormEvent) => Promise<void>;
  handleRetry: () => void;
};
