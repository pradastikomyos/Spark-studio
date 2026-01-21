import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useDarkMode } from './hooks/useDarkMode';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import PublicLayout from './components/PublicLayout';
import Home from './pages/Home';
import OnStage from './pages/OnStage';
import Shop from './pages/Shop';
import Events from './pages/Events';
import Login from './pages/Login';
import SignUp from './pages/SignUp';
import Dashboard from './pages/admin/Dashboard';
import TicketsManagement from './pages/admin/TicketsManagement';
import StoreInventory from './pages/admin/StoreInventory';
import StageManager from './pages/admin/StageManager';
import StageAnalytics from './pages/admin/StageAnalytics';
import StageBulkQR from './pages/admin/StageBulkQR';
import OrderTicket from './pages/admin/OrderTicket';
import BookingPage from './pages/BookingPage';
import PaymentPage from './pages/PaymentPage';
import BookingSuccessPage from './pages/BookingSuccessPage';
import FullCalendarPage from './pages/FullCalendarPage';
import CartPage from './pages/CartPage';
import CheckoutPage from './pages/CheckoutPage';
import MyTicketsPage from './pages/MyTicketsPage';
import StageScanPage from './pages/StageScanPage';
import NotFound from './pages/NotFound';

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

// Main app content - only rendered after auth is initialized
function AppContent() {
  const { isDark, toggleDarkMode } = useDarkMode();

  return (
    <Router>
      <div className="bg-background-light dark:bg-background-dark text-text-light dark:text-text-dark font-sans transition-colors duration-500 antialiased selection:bg-primary selection:text-white">
        <Routes>
          <Route path="/login" element={<Login isDark={isDark} />} />
          <Route path="/signup" element={<SignUp isDark={isDark} />} />
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="/scan/:stageCode" element={<StageScanPage />} />
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
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/tickets"
            element={
              <ProtectedRoute adminOnly>
                <TicketsManagement />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/store"
            element={
              <ProtectedRoute adminOnly>
                <StoreInventory />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/stages"
            element={
              <ProtectedRoute adminOnly>
                <StageManager />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/stage-analytics"
            element={
              <ProtectedRoute adminOnly>
                <StageAnalytics />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/qr-bulk"
            element={
              <ProtectedRoute adminOnly>
                <StageBulkQR />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/order-ticket"
            element={
              <ProtectedRoute adminOnly>
                <OrderTicket />
              </ProtectedRoute>
            }
          />
          <Route element={<PublicLayout isDark={isDark} onToggleDarkMode={toggleDarkMode} />}>
            <Route index element={<Home />} />
            <Route path="on-stage" element={<OnStage />} />
            <Route path="shop" element={<Shop />} />
            <Route path="events" element={<Events />} />
            <Route
              path="booking/:slug"
              element={
                <ProtectedRoute>
                  <BookingPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="payment"
              element={
                <ProtectedRoute>
                  <PaymentPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="booking-success"
              element={
                <ProtectedRoute>
                  <BookingSuccessPage />
                </ProtectedRoute>
              }
            />
            <Route path="calendar" element={<FullCalendarPage />} />
            <Route path="cart" element={<CartPage />} />
            <Route
              path="my-tickets"
              element={
                <ProtectedRoute>
                  <MyTicketsPage />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<NotFound />} />
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
      <AuthGate />
    </AuthProvider>
  );
}

export default App;
