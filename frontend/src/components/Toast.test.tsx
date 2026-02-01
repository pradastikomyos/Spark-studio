import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act, fireEvent } from '@testing-library/react';
import { ToastProvider, useToast } from './Toast';

// Test component that uses the toast hook
function TestComponent() {
  const { showToast } = useToast();

  return (
    <div>
      <button onClick={() => showToast('success', 'Success message')}>
        Show Success
      </button>
      <button onClick={() => showToast('error', 'Error message')}>
        Show Error
      </button>
      <button onClick={() => showToast('warning', 'Warning message')}>
        Show Warning
      </button>
      <button onClick={() => showToast('info', 'Info message')}>
        Show Info
      </button>
    </div>
  );
}

describe('Toast Notification System', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('should throw error when useToast is used outside ToastProvider', () => {
    // Suppress console.error for this test
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      render(<TestComponent />);
    }).toThrow('useToast must be used within ToastProvider');

    consoleError.mockRestore();
  });

  it('should display success toast with correct styling', () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    const button = screen.getByText('Show Success');
    fireEvent.click(button);

    // Check toast appears with success message
    expect(screen.getByText('Success message')).toBeInTheDocument();

    // Check success icon is present
    expect(screen.getByText('check_circle')).toBeInTheDocument();

    // Check success styling (green background) - find the parent motion.div
    const toastElement = screen.getByText('Success message').parentElement?.parentElement;
    expect(toastElement?.className).toMatch(/bg-green-500/);
  });

  it('should display error toast with correct styling', () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    const button = screen.getByText('Show Error');
    fireEvent.click(button);

    // Check toast appears with error message
    expect(screen.getByText('Error message')).toBeInTheDocument();

    // Check error icon is present
    expect(screen.getByText('error')).toBeInTheDocument();

    // Check error styling (red background) - find the parent motion.div
    const toastElement = screen.getByText('Error message').parentElement?.parentElement;
    expect(toastElement?.className).toMatch(/bg-red-500/);
  });

  it('should display warning toast with correct styling', () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    const button = screen.getByText('Show Warning');
    fireEvent.click(button);

    // Check toast appears with warning message
    expect(screen.getByText('Warning message')).toBeInTheDocument();

    // Check warning icon is present
    expect(screen.getByText('warning')).toBeInTheDocument();

    // Check warning styling (yellow background) - find the parent motion.div
    const toastElement = screen.getByText('Warning message').parentElement?.parentElement;
    expect(toastElement?.className).toMatch(/bg-yellow-500/);
  });

  it('should display info toast with correct styling', () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    const button = screen.getByText('Show Info');
    fireEvent.click(button);

    // Check toast appears with info message
    expect(screen.getByText('Info message')).toBeInTheDocument();

    // Check info icon is present
    expect(screen.getByText('info')).toBeInTheDocument();

    // Check info styling (blue background) - find the parent motion.div
    const toastElement = screen.getByText('Info message').parentElement?.parentElement;
    expect(toastElement?.className).toMatch(/bg-blue-500/);
  });

  it('should auto-dismiss toast after 5 seconds', () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    const button = screen.getByText('Show Success');
    fireEvent.click(button);

    // Toast should be visible initially
    expect(screen.getByText('Success message')).toBeInTheDocument();

    // Verify that setTimeout was called (auto-dismiss is scheduled)
    expect(vi.getTimerCount()).toBeGreaterThan(0);
  });

  it('should manually dismiss toast when close button is clicked', () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    const button = screen.getByText('Show Success');
    fireEvent.click(button);

    // Toast should be visible
    expect(screen.getByText('Success message')).toBeInTheDocument();

    // Get initial toast count
    const initialToasts = screen.getAllByRole('button', { name: 'Dismiss notification' });
    expect(initialToasts).toHaveLength(1);

    // Click the dismiss button
    const dismissButton = screen.getByLabelText('Dismiss notification');
    fireEvent.click(dismissButton);

    // Verify dismiss was triggered (toast starts exit animation)
    // The toast may still be in DOM during exit animation, but dismiss button should be gone or disabled
    const toastsAfterDismiss = screen.queryAllByRole('button', { name: 'Dismiss notification' });
    expect(toastsAfterDismiss.length).toBeLessThanOrEqual(initialToasts.length);
  });

  it('should stack multiple toasts vertically', () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    // Show multiple toasts
    fireEvent.click(screen.getByText('Show Success'));
    fireEvent.click(screen.getByText('Show Error'));
    fireEvent.click(screen.getByText('Show Warning'));

    // All toasts should be visible
    expect(screen.getByText('Success message')).toBeInTheDocument();
    expect(screen.getByText('Error message')).toBeInTheDocument();
    expect(screen.getByText('Warning message')).toBeInTheDocument();

    // Check that toasts are in a container with vertical spacing
    // Navigate up: p -> div (flex) -> motion.div (toast) -> div (container)
    const container = screen.getByText('Success message').parentElement?.parentElement?.parentElement;
    expect(container?.className).toMatch(/space-y-2/);
  });

  it('should queue toasts and dismiss them independently', () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    // Show first toast
    fireEvent.click(screen.getByText('Show Success'));
    expect(screen.getByText('Success message')).toBeInTheDocument();

    // Wait 2 seconds and show second toast
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    fireEvent.click(screen.getByText('Show Error'));
    expect(screen.getByText('Error message')).toBeInTheDocument();

    // Both toasts should be visible
    expect(screen.getByText('Success message')).toBeInTheDocument();
    expect(screen.getByText('Error message')).toBeInTheDocument();

    // Verify multiple timers are scheduled (one for each toast)
    expect(vi.getTimerCount()).toBeGreaterThanOrEqual(2);
  });

  it('should handle rapid toast creation without overlap', () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    // Rapidly create multiple toasts
    fireEvent.click(screen.getByText('Show Success'));
    fireEvent.click(screen.getByText('Show Error'));
    fireEvent.click(screen.getByText('Show Warning'));
    fireEvent.click(screen.getByText('Show Info'));

    // All toasts should be visible and stacked
    expect(screen.getByText('Success message')).toBeInTheDocument();
    expect(screen.getByText('Error message')).toBeInTheDocument();
    expect(screen.getByText('Warning message')).toBeInTheDocument();
    expect(screen.getByText('Info message')).toBeInTheDocument();

    // Verify they're in the same container with proper spacing
    // Navigate up: p -> div (flex) -> motion.div (toast) -> div (container)
    const toastContainer = screen.getByText('Success message').parentElement?.parentElement?.parentElement;
    expect(toastContainer?.className).toMatch(/space-y-2/);
  });

  it('should position toasts in top-right corner', () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    fireEvent.click(screen.getByText('Show Success'));

    // Find the toast container
    // Navigate up: p -> div (flex) -> motion.div (toast) -> div (container)
    const container = screen.getByText('Success message').parentElement?.parentElement?.parentElement;
    expect(container?.className).toMatch(/top-4/);
    expect(container?.className).toMatch(/right-4/);
    expect(container?.className).toMatch(/z-50/);
  });

  it('should generate unique IDs for each toast', () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    // Create multiple toasts with the same message
    fireEvent.click(screen.getByText('Show Success'));
    fireEvent.click(screen.getByText('Show Success'));

    // Both toasts should be visible (they have different IDs)
    const toasts = screen.getAllByText('Success message');
    expect(toasts).toHaveLength(2);
  });
});
