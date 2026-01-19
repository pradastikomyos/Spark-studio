import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useDarkMode } from './hooks/useDarkMode';
import { AuthProvider } from './contexts/AuthContext';
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
import BookingPage from './pages/BookingPage';
import PaymentPage from './pages/PaymentPage';
import BookingSuccessPage from './pages/BookingSuccessPage';
import FullCalendarPage from './pages/FullCalendarPage';
import CartPage from './pages/CartPage';
import CheckoutPage from './pages/CheckoutPage';
import MyTicketsPage from './pages/MyTicketsPage';
import NotFound from './pages/NotFound';

function App() {
  const { isDark, toggleDarkMode } = useDarkMode();

  return (
    <AuthProvider>
      <Router>
        <div className="bg-background-light dark:bg-background-dark text-text-light dark:text-text-dark font-sans transition-colors duration-500 antialiased selection:bg-primary selection:text-white">
          <Routes>
            <Route path="/login" element={<Login isDark={isDark} />} />
            <Route path="/signup" element={<SignUp isDark={isDark} />} />
            <Route path="/checkout" element={<CheckoutPage />} />
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
    </AuthProvider>
  );
}

export default App;
