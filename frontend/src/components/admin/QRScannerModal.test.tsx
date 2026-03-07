import type { FormEvent } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import QRScannerModal from './QRScannerModal';

const controllerState = {
  readerId: 'reader-1',
  status: 'error' as const,
  errorMessage: 'Gagal memulai pemindai',
  errorDetails: 'Detail error',
  isClosing: false,
  manualCode: 'ABC-123',
  manualSubmitting: false,
  handleClose: vi.fn(),
  handleManualCodeChange: vi.fn(),
  handleManualSubmit: vi.fn(async (event: FormEvent) => {
    event.preventDefault();
  }),
  handleRetry: vi.fn(),
};

vi.mock('./qr-scanner-modal/useQrScannerController', () => ({
  useQrScannerController: () => controllerState,
}));

describe('QRScannerModal', () => {
  it('renders the modal shell and retry affordance', () => {
    render(<QRScannerModal isOpen onClose={vi.fn()} title="Scan Pickup QR" />);

    expect(screen.getByText('Scan Pickup QR')).toBeInTheDocument();
    expect(screen.getByText('Gagal memulai pemindai')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /coba lagi/i }));
    expect(controllerState.handleRetry).toHaveBeenCalled();
  });

  it('submits manual entry through the controller', () => {
    render(<QRScannerModal isOpen onClose={vi.fn()} />);

    fireEvent.submit(screen.getByRole('textbox'));
    expect(controllerState.handleManualSubmit).toHaveBeenCalled();
  });
});
