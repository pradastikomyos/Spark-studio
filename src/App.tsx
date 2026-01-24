import { lazy, Suspense, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useDarkMode } from './hooks/useDarkMode';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { CartProvider } from './contexts/CartContext';
import ProtectedRoute from './components/ProtectedRoute';
import PublicLayout from './components/PublicLayout';
import Home from './pages/Home';
import { supabase } from './lib/supabase';

const OnStage = lazy(() => import('./pages/OnStage'));
const Shop = lazy(() => import('./pages/Shop'));
const Events = lazy(() => import('./pages/Events'));
const Login = lazy(() => import('./pages/Login'));
const SignUp = lazy(() => import('./pages/SignUp'));
const Dashboard = lazy(() => import('./pages/admin/Dashboard'));
const TicketsManagement = lazy(() => import('./pages/admin/TicketsManagement'));
const StoreInventory = lazy(() => import('./pages/admin/StoreInventory'));
const StageManager = lazy(() => import('./pages/admin/StageManager'));
const StageAnalytics = lazy(() => import('./pages/admin/StageAnalytics'));
const StageBulkQR = lazy(() => import('./pages/admin/StageBulkQR'));
const OrderTicket = lazy(() => import('./pages/admin/OrderTicket'));
const ProductOrders = lazy(() => import('./pages/admin/ProductOrders'));
const BookingPage = lazy(() => import('./pages/BookingPage'));
const PaymentPage = lazy(() => import('./pages/PaymentPage'));
const BookingSuccessPage = lazy(() => import('./pages/BookingSuccessPage'));
const FullCalendarPage = lazy(() => import('./pages/FullCalendarPage'));
const CartPage = lazy(() => import('./pages/CartPage'));
const CheckoutPage = lazy(() => import('./pages/CheckoutPage'));
const ProductCheckoutPage = lazy(() => import('./pages/ProductCheckoutPage'));
const ProductOrderSuccessPage = lazy(() => import('./pages/ProductOrderSuccessPage'));
const MyProductOrdersPage = lazy(() => import('./pages/MyProductOrdersPage'));
const MyTicketsPage = lazy(() => import('./pages/MyTicketsPage'));
const StageScanPage = lazy(() => import('./pages/StageScanPage'));
const NotFound = lazy(() => import('./pages/NotFound'));

// App-level loading screen - shown until auth is initialized
function AppLoadingScreen() {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-background-light dark:bg-background-dark z-50">
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
        <p className="mt-6 text-sm font-medium text-gray-500 dark:text-gray-400 tracking-wide uppercase">
          Loading Spark Studio...
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
const TAB_IDLE_THRESHOLD_MS = 2 * 60 * 1000;

function AppContent() {
  const { isDark, toggleDarkMode } = useDarkMode();
  const hiddenAtRef = useRef<number | null>(null);
  const refreshInFlightRef = useRef(false);
  const lastActiveAtRef = useRef(Date.now());

  useEffect(() => {
    if (typeof document === 'undefined') return;

    const handleIdleReturn = async (hiddenAt: number) => {
      const idleDuration = Date.now() - hiddenAt;
      if (idleDuration < TAB_IDLE_THRESHOLD_MS) return;
      if (refreshInFlightRef.current) return;

      refreshInFlightRef.current = true;
      await supabase.auth.refreshSession();
      window.dispatchEvent(
        new CustomEvent(TAB_RETURN_EVENT, {
          detail: { idleDuration },
        })
      );
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
  }, []);

  return (
    <Router>
      <div className="bg-background-light dark:bg-background-dark text-text-light dark:text-text-dark font-sans transition-colors duration-500 antialiased selection:bg-primary selection:text-white">
        <Routes>
          <Route
            path="/login"
            element={
              <Suspense fallback={<RouteLoading />}>
                <Login isDark={isDark} />
              </Suspense>
            }
          />
          <Route
            path="/signup"
            element={
              <Suspense fallback={<RouteLoading />}>
                <SignUp isDark={isDark} />
              </Suspense>
            }
          />
          <Route
            path="/checkout"
            element={
              <Suspense fallback={<RouteLoading />}>
                <CheckoutPage />
              </Suspense>
            }
          />
          <Route
            path="/checkout/product"
            element={
              <ProtectedRoute>
                <Suspense fallback={<RouteLoading />}>
                  <ProductCheckoutPage />
                </Suspense>
              </ProtectedRoute>
            }
          />
          <Route
            path="/scan/:stageCode"
            element={
              <Suspense fallback={<RouteLoading />}>
                <StageScanPage />
              </Suspense>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute adminOnly>
                <Navigate to="/admin/dashboard" replace />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/dashboard"
            element={
              <ProtectedRoute adminOnly>
                <Suspense fallback={<RouteLoading />}>
                  <Dashboard />
                </Suspense>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/tickets"
            element={
              <ProtectedRoute adminOnly>
                <Suspense fallback={<RouteLoading />}>
                  <TicketsManagement />
                </Suspense>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/store"
            element={
              <ProtectedRoute adminOnly>
                <Suspense fallback={<RouteLoading />}>
                  <StoreInventory />
                </Suspense>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/stages"
            element={
              <ProtectedRoute adminOnly>
                <Suspense fallback={<RouteLoading />}>
                  <StageManager />
                </Suspense>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/stage-analytics"
            element={
              <ProtectedRoute adminOnly>
                <Suspense fallback={<RouteLoading />}>
                  <StageAnalytics />
                </Suspense>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/qr-bulk"
            element={
              <ProtectedRoute adminOnly>
                <Suspense fallback={<RouteLoading />}>
                  <StageBulkQR />
                </Suspense>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/order-ticket"
            element={
              <ProtectedRoute adminOnly>
                <Suspense fallback={<RouteLoading />}>
                  <OrderTicket />
                </Suspense>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/product-orders"
            element={
              <ProtectedRoute adminOnly>
                <Suspense fallback={<RouteLoading />}>
                  <ProductOrders />
                </Suspense>
              </ProtectedRoute>
            }
          />
          <Route element={<PublicLayout isDark={isDark} onToggleDarkMode={toggleDarkMode} />}>
            <Route index element={<Home />} />
            <Route
              path="on-stage"
              element={
                <Suspense fallback={<RouteLoading />}>
                  <OnStage />
                </Suspense>
              }
            />
            <Route
              path="shop"
              element={
                <Suspense fallback={<RouteLoading />}>
                  <Shop />
                </Suspense>
              }
            />
            <Route
              path="events"
              element={
                <Suspense fallback={<RouteLoading />}>
                  <Events />
                </Suspense>
              }
            />
            <Route
              path="booking/:slug"
              element={
                <ProtectedRoute>
                  <Suspense fallback={<RouteLoading />}>
                    <BookingPage />
                  </Suspense>
                </ProtectedRoute>
              }
            />
            <Route
              path="payment"
              element={
                <ProtectedRoute>
                  <Suspense fallback={<RouteLoading />}>
                    <PaymentPage />
                  </Suspense>
                </ProtectedRoute>
              }
            />
            <Route
              path="booking-success"
              element={
                <ProtectedRoute>
                  <Suspense fallback={<RouteLoading />}>
                    <BookingSuccessPage />
                  </Suspense>
                </ProtectedRoute>
              }
            />
            <Route
              path="calendar"
              element={
                <Suspense fallback={<RouteLoading />}>
                  <FullCalendarPage />
                </Suspense>
              }
            />
            <Route
              path="cart"
              element={
                <Suspense fallback={<RouteLoading />}>
                  <CartPage />
                </Suspense>
              }
            />
            <Route
              path="my-tickets"
              element={
                <ProtectedRoute>
                  <Suspense fallback={<RouteLoading />}>
                    <MyTicketsPage />
                  </Suspense>
                </ProtectedRoute>
              }
            />
            <Route
              path="my-orders"
              element={
                <ProtectedRoute>
                  <Suspense fallback={<RouteLoading />}>
                    <MyProductOrdersPage />
                  </Suspense>
                </ProtectedRoute>
              }
            />
            <Route
              path="order/product/success/:orderNumber"
              element={
                <ProtectedRoute>
                  <Suspense fallback={<RouteLoading />}>
                    <ProductOrderSuccessPage />
                  </Suspense>
                </ProtectedRoute>
              }
            />
            <Route
              path="*"
              element={
                <Suspense fallback={<RouteLoading />}>
                  <NotFound />
                </Suspense>
              }
            />
          </Route>
        </Routes>
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
    <AuthProvider>
      <CartProvider>
        <AuthGate />
      </CartProvider>
    </AuthProvider>
  );
}

export default App;
