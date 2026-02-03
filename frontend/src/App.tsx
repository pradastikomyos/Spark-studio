import { lazy, Suspense, useEffect, useRef, type ReactNode } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useSessionRefresh } from './hooks/useSessionRefresh';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { CartProvider } from './contexts/CartContext';
import { ToastProvider, useToast } from './components/Toast';
import { ErrorBoundary } from './components/ErrorBoundary';
import ProtectedRoute from './components/ProtectedRoute';
import PublicLayout from './components/PublicLayout';
import Home from './pages/Home';
import { supabase } from './lib/supabase';
import { queryClient } from './lib/queryClient';

const OnStage = lazy(() => import('./pages/OnStage'));
const Fashion = lazy(() => import('./pages/Fashion'));
const Beauty = lazy(() => import('./pages/Beauty'));
const Events = lazy(() => import('./pages/Events'));
const SparkClub = lazy(() => import('./pages/SparkClub'));
const News = lazy(() => import('./pages/News'));
const Login = lazy(() => import('./pages/Login'));
const SignUp = lazy(() => import('./pages/SignUp'));
const AuthCallback = lazy(() => import('./pages/AuthCallback'));
const Dashboard = lazy(() => import('./pages/admin/Dashboard'));
const TicketsManagement = lazy(() => import('./pages/admin/TicketsManagement'));
const StoreInventory = lazy(() => import('./pages/admin/StoreInventory'));
const StageManager = lazy(() => import('./pages/admin/StageManager'));
const StageAnalytics = lazy(() => import('./pages/admin/StageAnalytics'));
const StageBulkQR = lazy(() => import('./pages/admin/StageBulkQR'));
const OrderTicket = lazy(() => import('./pages/admin/OrderTicket'));
const ProductOrders = lazy(() => import('./pages/admin/ProductOrders'));
const BannerManager = lazy(() => import('./pages/admin/BannerManager'));
const BookingPage = lazy(() => import('./pages/BookingPage'));
const JourneySelectionPage = lazy(() => import('./pages/JourneySelectionPage'));
const PaymentPage = lazy(() => import('./pages/PaymentPage'));
const BookingSuccessPage = lazy(() => import('./pages/BookingSuccessPage'));
const CartPage = lazy(() => import('./pages/CartPage'));
const CheckoutPage = lazy(() => import('./pages/CheckoutPage'));
const ProductCheckoutPage = lazy(() => import('./pages/ProductCheckoutPage'));
const ProductOrderSuccessPage = lazy(() => import('./pages/ProductOrderSuccessPage'));
const ProductDetailPage = lazy(() => import('./pages/ProductDetailPage'));
const MyProductOrdersPage = lazy(() => import('./pages/MyProductOrdersPage'));
const MyTicketsPage = lazy(() => import('./pages/MyTicketsPage'));
const StageScanPage = lazy(() => import('./pages/StageScanPage'));
const NotFound = lazy(() => import('./pages/NotFound'));

// App-level loading screen - shown until auth is initialized
function AppLoadingScreen() {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-background-light z-50">
      <div className="text-center">
        <div className="relative">
          {/* Spark Logo Animation */}
          <div className="flex h-16 w-16 mx-auto items-center justify-center rounded-xl bg-primary text-white shadow-2xl shadow-red-900/30 animate-pulse">
            <span className="material-symbols-outlined text-3xl">shutter_speed</span>
          </div>
          {/* Loading spinner ring */}
          <div className="absolute inset-0 -m-2">
            <div className="h-20 w-20 rounded-full border-4 border-primary/20 border-t-primary animate-spin"></div>
          </div>
        </div>
        <p className="mt-6 text-sm font-medium text-gray-500 tracking-wide uppercase">
          Loading Spark Stage...
        </p>
      </div>
    </div>
  );
}

function RouteLoading() {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>
  );
}

// Main app content - only rendered after auth is initialized
const TAB_RETURN_EVENT = 'tab-returned-from-idle';
const TAB_IDLE_THRESHOLD_MS = 10 * 60 * 1000;

function AppRoutes() {
  const location = useLocation();
  const wrap = (node: ReactNode) => {
    const path = location.pathname;
    const isSuccessPage = path === '/booking-success' || path.startsWith('/order/product/success/');
    const shouldWrap = !isSuccessPage && (path.startsWith('/admin') || path === '/fashion' || path.startsWith('/fashion/') || path === '/beauty' || path.startsWith('/beauty/'));
    return shouldWrap ? <ErrorBoundary>{node}</ErrorBoundary> : node;
  };
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route
          path="/login"
          element={
            wrap(
              <Suspense fallback={<RouteLoading />}>
                <Login />
              </Suspense>
            )
          }
        />
        <Route
          path="/signup"
          element={
            wrap(
              <Suspense fallback={<RouteLoading />}>
                <SignUp />
              </Suspense>
            )
          }
        />
        <Route
          path="/auth/callback"
          element={
            wrap(
              <Suspense fallback={<RouteLoading />}>
                <AuthCallback />
              </Suspense>
            )
          }
        />
        <Route
          path="/checkout"
          element={
            wrap(
              <Suspense fallback={<RouteLoading />}>
                <CheckoutPage />
              </Suspense>
            )
          }
        />
        <Route
          path="/checkout/product"
          element={
            wrap(
              <ProtectedRoute>
                <Suspense fallback={<RouteLoading />}>
                  <ProductCheckoutPage />
                </Suspense>
              </ProtectedRoute>
            )
          }
        />
        <Route
          path="/scan/:stageCode"
          element={
            wrap(
              <Suspense fallback={<RouteLoading />}>
                <StageScanPage />
              </Suspense>
            )
          }
        />
        <Route
          path="/admin"
          element={
            wrap(
              <ProtectedRoute adminOnly>
                <Navigate to="/admin/dashboard" replace />
              </ProtectedRoute>
            )
          }
        />
        <Route
          path="/admin/dashboard"
          element={
            wrap(
              <ProtectedRoute adminOnly>
                <Suspense fallback={<RouteLoading />}>
                  <Dashboard />
                </Suspense>
              </ProtectedRoute>
            )
          }
        />
        <Route
          path="/admin/tickets"
          element={
            wrap(
              <ProtectedRoute adminOnly>
                <Suspense fallback={<RouteLoading />}>
                  <TicketsManagement />
                </Suspense>
              </ProtectedRoute>
            )
          }
        />
        <Route
          path="/admin/store"
          element={
            wrap(
              <ProtectedRoute adminOnly>
                <Suspense fallback={<RouteLoading />}>
                  <StoreInventory />
                </Suspense>
              </ProtectedRoute>
            )
          }
        />
        <Route
          path="/admin/stages"
          element={
            wrap(
              <ProtectedRoute adminOnly>
                <Suspense fallback={<RouteLoading />}>
                  <StageManager />
                </Suspense>
              </ProtectedRoute>
            )
          }
        />
        <Route
          path="/admin/stage-analytics"
          element={
            wrap(
              <ProtectedRoute adminOnly>
                <Suspense fallback={<RouteLoading />}>
                  <StageAnalytics />
                </Suspense>
              </ProtectedRoute>
            )
          }
        />
        <Route
          path="/admin/qr-bulk"
          element={
            wrap(
              <ProtectedRoute adminOnly>
                <Suspense fallback={<RouteLoading />}>
                  <StageBulkQR />
                </Suspense>
              </ProtectedRoute>
            )
          }
        />
        <Route
          path="/admin/order-ticket"
          element={
            wrap(
              <ProtectedRoute adminOnly>
                <Suspense fallback={<RouteLoading />}>
                  <OrderTicket />
                </Suspense>
              </ProtectedRoute>
            )
          }
        />
        <Route
          path="/admin/product-orders"
          element={
            wrap(
              <ProtectedRoute adminOnly>
                <Suspense fallback={<RouteLoading />}>
                  <ProductOrders />
                </Suspense>
              </ProtectedRoute>
            )
          }
        />
        <Route
          path="/admin/banner-manager"
          element={
            wrap(
              <ProtectedRoute adminOnly>
                <Suspense fallback={<RouteLoading />}>
                  <BannerManager />
                </Suspense>
              </ProtectedRoute>
            )
          }
        />
        <Route element={<PublicLayout />}>
          <Route index element={<Home />} />
          <Route
            path="on-stage"
            element={
              wrap(
                <Suspense fallback={<RouteLoading />}>
                  <OnStage />
                </Suspense>
              )
            }
          />
          <Route
            path="fashion"
            element={
              wrap(
                <Suspense fallback={<RouteLoading />}>
                  <Fashion />
                </Suspense>
              )
            }
          />
          <Route
            path="beauty"
            element={
              wrap(
                <Suspense fallback={<RouteLoading />}>
                  <Beauty />
                </Suspense>
              )
            }
          />
          <Route
            path="fashion/product/:productId"
            element={
              wrap(
                <Suspense fallback={<RouteLoading />}>
                  <ProductDetailPage />
                </Suspense>
              )
            }
          />
          <Route
            path="beauty/product/:productId"
            element={
              wrap(
                <Suspense fallback={<RouteLoading />}>
                  <ProductDetailPage />
                </Suspense>
              )
            }
          />
          <Route
            path="events"
            element={
              wrap(
                <Suspense fallback={<RouteLoading />}>
                  <Events />
                </Suspense>
              )
            }
          />
          <Route
            path="spark-club"
            element={
              wrap(
                <Suspense fallback={<RouteLoading />}>
                  <SparkClub />
                </Suspense>
              )
            }
          />
          <Route
            path="news"
            element={
              wrap(
                <Suspense fallback={<RouteLoading />}>
                  <News />
                </Suspense>
              )
            }
          />
          <Route
            path="journey"
            element={
              wrap(
                <Suspense fallback={<RouteLoading />}>
                  <JourneySelectionPage />
                </Suspense>
              )
            }
          />
          <Route
            path="booking/:slug"
            element={
              wrap(
                <ProtectedRoute>
                  <Suspense fallback={<RouteLoading />}>
                    <BookingPage />
                  </Suspense>
                </ProtectedRoute>
              )
            }
          />
          <Route
            path="payment"
            element={
              wrap(
                <ProtectedRoute>
                  <Suspense fallback={<RouteLoading />}>
                    <PaymentPage />
                  </Suspense>
                </ProtectedRoute>
              )
            }
          />
          <Route
            path="booking-success"
            element={
              wrap(
                <ProtectedRoute>
                  <Suspense fallback={<RouteLoading />}>
                    <BookingSuccessPage />
                  </Suspense>
                </ProtectedRoute>
              )
            }
          />
          <Route
            path="cart"
            element={
              wrap(
                <Suspense fallback={<RouteLoading />}>
                  <CartPage />
                </Suspense>
              )
            }
          />
          <Route
            path="my-tickets"
            element={
              wrap(
                <ProtectedRoute>
                  <Suspense fallback={<RouteLoading />}>
                    <MyTicketsPage />
                  </Suspense>
                </ProtectedRoute>
              )
            }
          />
          <Route
            path="my-orders"
            element={
              wrap(
                <ProtectedRoute>
                  <Suspense fallback={<RouteLoading />}>
                    <MyProductOrdersPage />
                  </Suspense>
                </ProtectedRoute>
              )
            }
          />
          <Route
            path="order/product/success/:orderNumber"
            element={
              wrap(
                <ProtectedRoute>
                  <Suspense fallback={<RouteLoading />}>
                    <ProductOrderSuccessPage />
                  </Suspense>
                </ProtectedRoute>
              )
            }
          />
          <Route
            path="*"
            element={
              wrap(
                <Suspense fallback={<RouteLoading />}>
                  <NotFound />
                </Suspense>
              )
            }
          />
        </Route>
      </Routes>
    </AnimatePresence>
  );
}

function AppContent() {
  const hiddenAtRef = useRef<number | null>(null);
  const refreshInFlightRef = useRef(false);
  const lastActiveAtRef = useRef(Date.now());
  const lastAutoRefreshAtRef = useRef<number | null>(null);
  const { showToast } = useToast();
  
  // Enterprise-grade session refresh - auto-refresh before expiry
  useSessionRefresh();

  useEffect(() => {
    if (typeof document === 'undefined') return;

    const handleIdleReturn = async (hiddenAt: number) => {
      const idleDuration = Date.now() - hiddenAt;
      if (idleDuration < TAB_IDLE_THRESHOLD_MS) return;
      if (refreshInFlightRef.current) return;

      refreshInFlightRef.current = true;
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        refreshInFlightRef.current = false;
        return;
      }

      const { error } = await supabase.auth.refreshSession();
      if (error) {
        refreshInFlightRef.current = false;
        return;
      }
      const isAdminRoute = window.location.pathname.startsWith('/admin');
      if (isAdminRoute) {
        queryClient.invalidateQueries();
        const now = Date.now();
        if (!lastAutoRefreshAtRef.current || now - lastAutoRefreshAtRef.current > 30 * 1000) {
          showToast('info', 'Data admin disegarkan otomatis setelah tab aktif kembali.');
          lastAutoRefreshAtRef.current = now;
        }
        window.dispatchEvent(
          new CustomEvent(TAB_RETURN_EVENT, {
            detail: { idleDuration },
          })
        );
      }
      refreshInFlightRef.current = false;
    };

    const handleVisibilityChange = async () => {
      if (document.hidden) {
        hiddenAtRef.current = Date.now();
        return;
      }

      const hiddenAt = hiddenAtRef.current;
      hiddenAtRef.current = null;
      if (!hiddenAt) return;

      await handleIdleReturn(hiddenAt);
      lastActiveAtRef.current = Date.now();
    };

    const handleFocus = async () => {
      const now = Date.now();
      const idleDuration = now - lastActiveAtRef.current;
      lastActiveAtRef.current = now;
      if (idleDuration < TAB_IDLE_THRESHOLD_MS) return;
      await handleIdleReturn(now - idleDuration);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [showToast]);

  return (
    <Router>
      <div className="bg-background-light text-text-light font-sans transition-colors duration-500 antialiased selection:bg-primary selection:text-white">
        <AppRoutes />
      </div>
    </Router>
  );
}

// Auth Gate - blocks all rendering until auth is initialized
function AuthGate() {
  const { initialized } = useAuth();

  // CRITICAL: Don't render anything until auth is fully initialized
  // This prevents race conditions where components try to fetch data before session is ready
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
