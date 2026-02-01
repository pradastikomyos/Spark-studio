import { Component, ReactNode, type ErrorInfo } from 'react';

interface Props {
  children: ReactNode;
  fallback?: (error: Error, retry: () => void) => ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error Boundary component that catches and handles component errors gracefully.
 * 
 * Features:
 * - Catches errors during rendering, lifecycle methods, and constructors
 * - Displays fallback UI with error details
 * - Provides retry functionality to recover from errors
 * - Supports custom fallback UI via props
 * - Logs errors to console for debugging
 * - Supports dark mode styling
 * 
 * @example
 * ```tsx
 * <ErrorBoundary>
 *   <MyComponent />
 * </ErrorBoundary>
 * ```
 * 
 * @example Custom fallback
 * ```tsx
 * <ErrorBoundary fallback={(error, retry) => (
 *   <div>
 *     <h1>Custom Error: {error.message}</h1>
 *     <button onClick={retry}>Retry</button>
 *   </div>
 * )}>
 *   <MyComponent />
 * </ErrorBoundary>
 * ```
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  
  /**
   * Update state when an error is caught.
   * This lifecycle method is called during the "render" phase,
   * so side effects are not permitted.
   */
  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }
  
  /**
   * Log error details to console.
   * This lifecycle method is called during the "commit" phase,
   * so side effects are permitted.
   */
  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }
  
  /**
   * Reset error state to retry rendering the component.
   * This allows users to recover from errors without refreshing the page.
   */
  retry = () => {
    this.setState({ hasError: false, error: null });
  };
  
  render() {
    if (this.state.hasError && this.state.error) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.retry);
      }
      
      // Default fallback UI
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="max-w-md w-full bg-gray-50 rounded-lg shadow-lg p-8">
            <h2 className="text-2xl font-bold text-red-600 mb-4">
              Something went wrong
            </h2>
            <p className="text-gray-600 mb-6">
              {this.state.error.message}
            </p>
            <button
              onClick={this.retry}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      );
    }
    
    return this.props.children;
  }
}
