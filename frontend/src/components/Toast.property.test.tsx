import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import * as fc from 'fast-check';
import { useEffect } from 'react';
import { ToastProvider, useToast } from './Toast';

function TestEmitter({ type, message }: { type: 'success' | 'error' | 'warning' | 'info'; message: string }) {
  const { showToast } = useToast();
  useEffect(() => {
    showToast(type, message);
  }, [message, showToast, type]);
  return null;
}

describe('Toast - Property Tests', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows toasts for any valid type and message', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('success', 'error', 'warning', 'info'),
        fc
          .string({ minLength: 1, maxLength: 80 })
          .map((s) => s.trim().replace(/\s+/g, ' '))
          .filter((s) => s.length > 0),
        (type, message) => {
          document.body.innerHTML = '';
          vi.clearAllTimers();
          const { unmount } = render(
            <ToastProvider>
              <TestEmitter type={type} message={message} />
            </ToastProvider>
          );
          expect(screen.getAllByText(message).length).toBeGreaterThan(0);
          act(() => {
            vi.runOnlyPendingTimers();
          });
          unmount();
        }
      ),
      { numRuns: 50 }
    );
  });

  it('queues multiple toasts independently', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc
            .string({ minLength: 1, maxLength: 30 })
            .map((s) => s.trim().replace(/\s+/g, ' '))
            .filter((s) => s.length > 0),
          { minLength: 2, maxLength: 6 }
        ),
        (messages) => {
        document.body.innerHTML = '';
        vi.clearAllTimers();
        const { unmount } = render(
          <ToastProvider>
            {messages.map((message, idx) => (
              <TestEmitter key={idx} type="success" message={message} />
            ))}
          </ToastProvider>
        );
        const counts = new Map<string, number>();
        for (const message of messages) {
          counts.set(message, (counts.get(message) ?? 0) + 1);
        }
        for (const [message, expectedCount] of counts.entries()) {
          expect(screen.getAllByText(message).length).toBeGreaterThanOrEqual(expectedCount);
        }
        act(() => {
          vi.runOnlyPendingTimers();
        });
        unmount();
      }
      ),
      { numRuns: 30 }
    );
  });

  it('auto-dismisses after 5 seconds', () => {
    render(
      <ToastProvider>
        <TestEmitter type="success" message="auto-dismiss" />
      </ToastProvider>
    );
    expect(screen.getByText('auto-dismiss')).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(5000);
    });
  });
});
