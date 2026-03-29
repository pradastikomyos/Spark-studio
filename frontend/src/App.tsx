import { BrowserRouter as Router } from 'react-router-dom';

import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

import { AppRoutes } from './app/AppRoutes';
import BrandedLoader from './components/BrandedLoader';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ToastProvider } from './components/Toast';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { CartProvider } from './contexts/CartContext';
import { useIdleTabSessionRefresh } from './hooks/useIdleTabSessionRefresh';
import { useSessionRefresh } from './hooks/useSessionRefresh';
import { queryClient } from './lib/queryClient';

function AppLoadingScreen() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background-light">
      <BrandedLoader text="Loading Spark Stage..." size="lg" />
    </div>
  );
}

function AppContent() {
  useSessionRefresh();
  useIdleTabSessionRefresh();

  return (
    <Router>
      <div className="bg-background-light text-text-light font-sans antialiased transition-colors duration-500 selection:bg-primary selection:text-white">
        <AppRoutes />
      </div>
    </Router>
  );
}

function AuthGate() {
  const { initialized } = useAuth();

  if (!initialized) {
    return <AppLoadingScreen />;
  }

  return <AppContent />;
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <AuthProvider>
            <CartProvider>
              <AuthGate />
            </CartProvider>
          </AuthProvider>
        </ToastProvider>
        {import.meta.env.DEV ? <ReactQueryDevtools initialIsOpen={false} /> : null}
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
