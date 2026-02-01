import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ErrorBoundary } from './ErrorBoundary';

// Component that throws an error
function ThrowError({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) {
    throw new Error('Test error message');
  }
  return <div>No error</div>;
}

// Component that works fine
function WorkingComponent() {
  return <div>Working component</div>;
}

describe('ErrorBoundary', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    // Suppress console.error in tests to avoid noise
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  describe('Error Catching (Requirement 12.1)', () => {
    it('should catch errors thrown by child components', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      // Should display error UI instead of crashing
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
      expect(screen.getByText('Test error message')).toBeInTheDocument();
    });

    it('should render children normally when no error occurs', () => {
      render(
        <ErrorBoundary>
          <WorkingComponent />
        </ErrorBoundary>
      );

      expect(screen.getByText('Working component')).toBeInTheDocument();
      expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument();
    });

    it('should prevent the entire application from crashing', () => {
      // If ErrorBoundary didn't catch the error, this test would fail
      expect(() => {
        render(
          <ErrorBoundary>
            <ThrowError shouldThrow={true} />
          </ErrorBoundary>
        );
      }).not.toThrow();
    });
  });

  describe('Fallback UI (Requirements 12.2, 12.4)', () => {
    it('should display fallback UI with error details', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      // Check for error heading
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
      
      // Check for error message
      expect(screen.getByText('Test error message')).toBeInTheDocument();
      
      // Check for retry button
      expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
    });

    it('should support custom fallback UI', () => {
      const customFallback = (error: Error, retry: () => void) => (
        <div>
          <h1>Custom Error: {error.message}</h1>
          <button onClick={retry}>Custom Retry</button>
        </div>
      );

      render(
        <ErrorBoundary fallback={customFallback}>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText('Custom Error: Test error message')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /custom retry/i })).toBeInTheDocument();
    });

    it('should display error message in dark mode compatible styling', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      const errorContainer = screen.getByText('Test error message').closest('div');
      expect(errorContainer).toHaveClass('bg-gray-50');
    });
  });

  describe('Error Logging (Requirement 12.3)', () => {
    it('should log error to console when caught', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      // Verify console.error was called
      expect(consoleErrorSpy).toHaveBeenCalled();
      
      // Verify it was called with error details
      const calls = consoleErrorSpy.mock.calls;
      const errorBoundaryCall = calls.find((call: unknown[]) => 
        typeof call[0] === 'string' && call[0] === 'ErrorBoundary caught:'
      );
      expect(errorBoundaryCall).toBeDefined();
    });
  });

  describe('Retry Functionality (Requirement 12.4)', () => {
    it('should provide a "Try Again" button', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      const retryButton = screen.getByRole('button', { name: /try again/i });
      expect(retryButton).toBeInTheDocument();
    });

    it('should reset error state when retry button is clicked', async () => {
      const user = userEvent.setup();
      
      // Use a component that can be controlled externally
      let throwError = true;
      function ControlledComponent() {
        if (throwError) {
          throw new Error('Test error message');
        }
        return <div>No error</div>;
      }

      render(
        <ErrorBoundary>
          <ControlledComponent />
        </ErrorBoundary>
      );

      // Error UI should be displayed
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();

      // Fix the error condition
      throwError = false;

      // Click retry button - this resets the error boundary state
      const retryButton = screen.getByRole('button', { name: /try again/i });
      await user.click(retryButton);

      // After clicking retry, the error boundary resets and re-renders children
      // Since throwError is now false, it should render successfully
      expect(screen.getByText('No error')).toBeInTheDocument();
      expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument();
    });
  });

  describe('Error Isolation (Requirement 12.6)', () => {
    it('should isolate errors to the boundary without affecting siblings', () => {
      render(
        <div>
          <ErrorBoundary>
            <ThrowError shouldThrow={true} />
          </ErrorBoundary>
          <WorkingComponent />
        </div>
      );

      // Error boundary should catch the error
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
      
      // Sibling component should still render
      expect(screen.getByText('Working component')).toBeInTheDocument();
    });

    it('should allow multiple error boundaries to work independently', () => {
      render(
        <div>
          <ErrorBoundary>
            <ThrowError shouldThrow={true} />
          </ErrorBoundary>
          <ErrorBoundary>
            <WorkingComponent />
          </ErrorBoundary>
        </div>
      );

      // First boundary should show error
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
      
      // Second boundary should render normally
      expect(screen.getByText('Working component')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle errors with empty messages', () => {
      function ThrowEmptyError(): never {
        throw new Error('');
      }

      render(
        <ErrorBoundary>
          <ThrowEmptyError />
        </ErrorBoundary>
      );

      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
      // Should still render the error UI even with empty message
      expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
    });

    it('should handle errors with very long messages', () => {
      const longMessage = 'A'.repeat(500);
      
      function ThrowLongError(): never {
        throw new Error(longMessage);
      }

      render(
        <ErrorBoundary>
          <ThrowLongError />
        </ErrorBoundary>
      );

      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
      expect(screen.getByText(longMessage)).toBeInTheDocument();
    });

    it('should handle nested error boundaries', () => {
      render(
        <ErrorBoundary fallback={(error) => <div>Outer: {error.message}</div>}>
          <ErrorBoundary fallback={(error) => <div>Inner: {error.message}</div>}>
            <ThrowError shouldThrow={true} />
          </ErrorBoundary>
        </ErrorBoundary>
      );

      // Inner boundary should catch the error
      expect(screen.getByText('Inner: Test error message')).toBeInTheDocument();
      expect(screen.queryByText('Outer: Test error message')).not.toBeInTheDocument();
    });
  });

  describe('TypeScript Types', () => {
    it('should accept ReactNode as children', () => {
      render(
        <ErrorBoundary>
          <div>Text</div>
          <span>More text</span>
          {null}
          {undefined}
          {false}
          {123}
        </ErrorBoundary>
      );

      expect(screen.getByText('Text')).toBeInTheDocument();
      expect(screen.getByText('More text')).toBeInTheDocument();
    });

    it('should accept optional fallback function', () => {
      const fallback = (error: Error, retry: () => void) => (
        <div>
          <p>{error.message}</p>
          <button onClick={retry}>Retry</button>
        </div>
      );

      render(
        <ErrorBoundary fallback={fallback}>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText('Test error message')).toBeInTheDocument();
    });
  });
});
