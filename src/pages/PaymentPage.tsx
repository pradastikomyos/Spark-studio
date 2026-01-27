import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useDarkMode } from '../hooks/useDarkMode';
import { useAuth } from '../contexts/AuthContext';
import { loadSnapScript } from '../utils/midtransSnap';
import { formatCurrency } from '../utils/formatters';
import { createWIBDate } from '../utils/timezone';
import {
  restoreBookingState,
  hasBookingState,
  clearBookingState,
  type BookingState
} from '../utils/bookingStateManager';
import { SessionErrorHandler } from '../utils/sessionErrorHandler';

interface LocationState {
  ticketId?: number;
  ticketName?: string;
  ticketType?: string;
  price?: number;
  date?: string;
  time?: string;
}

export default function PaymentPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as LocationState;
  const { isDark, toggleDarkMode } = useDarkMode();
  const { user, session, validateSession } = useAuth();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [snapLoaded, setSnapLoaded] = useState(false);

  // Ticket data from booking page
  const ticketId = state?.ticketId || 0;
  const ticketName = state?.ticketName || 'Photo Session';
  const ticketType = state?.ticketType || 'entrance';
  const price = state?.price || 0;
  const bookingDate = state?.date || '';
  const timeSlot = state?.time || '';
  const quantity = 1;
  const total = price * quantity;

  // Load Midtrans Snap.js on component mount
  useEffect(() => {
    loadSnapScript()
      .then(() => setSnapLoaded(true))
      .catch((err) => {
        console.error('Failed to load Snap:', err);
        setError('Failed to load payment system. Please refresh the page.');
      });
  }, []);

  useEffect(() => {
    // Pre-fill customer name from auth if available
    if (user?.email) {
      setCustomerName(user.email.split('@')[0] || '');
    }
  }, [user]);

  useEffect(() => {
    // Check if we have required booking data
    if (!ticketId || !price || !bookingDate || !timeSlot) {
      // Try to restore from sessionStorage if current state is missing
      if (hasBookingState()) {
        const restored = restoreBookingState();
        if (restored) {
          console.log('Restoring booking state after session recovery');
          navigate(location.pathname, { state: restored, replace: true });
          return;
        }
      }
      setError('We couldn\'t find your booking details. Your selection may have timed out. Please go back and select your session again.');
    } else {
      // We have valid state, clear the backup
      // clearBookingState(); // Only clear after successful payment
    }
  }, [ticketId, price, bookingDate, timeSlot, navigate, location.pathname]);

  const errorHandler = new SessionErrorHandler({
    onSessionExpired: (returnPath, state) => {
      // State is preserved by the handler if preserveState is true
      navigate('/login', { state: { returnTo: returnPath, returnState: state } });
    },
    preserveState: true
  });

  const handlePayWithMidtrans = async () => {
    if (!user) {
      alert('Please log in to complete your payment. We\'ll save your booking details so you can continue immediately after signing in.');
      navigate('/login', { state: { returnTo: location.pathname, returnState: state } });
      return;
    }

    if (!customerName.trim()) {
      setError('Please enter your name');
      return;
    }

    setLoading(true);
    setError(null);

    const bookingData: Omit<BookingState, 'timestamp'> = {
      ticketId,
      ticketName,
      ticketType,
      price,
      date: bookingDate,
      time: timeSlot,
      quantity,
      total
    };

    try {
      // Use the new validateSession for robust check
      const isValid = await validateSession();
      if (!isValid) {
        // handleAuthError will handle state preservation and navigation
        alert('Your session has expired. We\'ve saved your booking details—please log in again to complete your payment.');
        await errorHandler.handleAuthError({ status: 401 }, { returnPath: location.pathname, state: bookingData });
        setLoading(false);
        return;
      }

      // CRITICAL: Use session from AuthContext (validated), not from supabase.auth.getSession() (localStorage)
      // This ensures we send the EXACT token that was just validated, preventing 401 errors
      const token = session?.access_token;

      if (!token) {
        throw new Error('Not authenticated');
      }

      // Call edge function to create Midtrans token
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-midtrans-token`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            items: [
              {
                ticketId,
                ticketName,
                price,
                quantity,
                date: bookingDate,
                timeSlot,
              },
            ],
            customerName: customerName.trim(),
            customerEmail: user.email,
            customerPhone: customerPhone.trim() || undefined,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        // Handle 401 Unauthorized - session expired on server
        if (response.status === 401) {
          console.error('Auth error from edge function:', data);
          alert('Your session has timed out for security. Don\'t worry—your booking details are saved. Please log in again to finish.');
          // Use errorHandler to handle session expiration and navigation
          await errorHandler.handleAuthError({ status: 401 }, { returnPath: location.pathname, state: bookingData });
          return;
        }
        throw new Error(data.error || 'Failed to create payment');
      }

      // Open Midtrans Snap popup
      if (window.snap && snapLoaded) {
        window.snap.pay(data.token, {
          onSuccess: (result) => {
            console.log('Payment success:', result);
            clearBookingState(); // Success! Clear the preserved state
            navigate('/booking-success', {
              state: {
                orderNumber: data.order_number,
                orderId: data.order_id,
                ticketName,
                total,
                date: bookingDate,
                time: timeSlot,
                customerName: customerName.trim(),
                paymentResult: result,
              },
            });
          },
          onPending: (result) => {
            console.log('Payment pending:', result);
            // Navigate to success page with pending status
            navigate('/booking-success', {
              state: {
                orderNumber: data.order_number,
                orderId: data.order_id,
                ticketName,
                total,
                date: bookingDate,
                time: timeSlot,
                customerName: customerName.trim(),
                paymentResult: result,
                isPending: true,
              },
            });
          },
          onError: (result) => {
            console.error('Payment error:', result);
            setError('Payment failed. Please try again.');
          },
          onClose: () => {
            console.log('Payment popup closed');
            setLoading(false);
          },
        });
      } else {
        throw new Error('Midtrans Snap not loaded. Please refresh the page.');
      }
    } catch (err: unknown) {
      console.error('Payment error:', err);
      setError(err instanceof Error ? err.message : 'Failed to process payment');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    const date = createWIBDate(dateString);
    return date.toLocaleDateString('en-US', {
      timeZone: 'Asia/Jakarta',
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-solid border-[#e8cece] dark:border-[#422020] px-10 py-4 bg-white dark:bg-background-dark sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <div className="size-8 text-primary">
            <svg fill="none" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
              <g clipPath="url(#clip0_6_543)">
                <path d="M42.1739 20.1739L27.8261 5.82609C29.1366 7.13663 28.3989 10.1876 26.2002 13.7654C24.8538 15.9564 22.9595 18.3449 20.6522 20.6522C18.3449 22.9595 15.9564 24.8538 13.7654 26.2002C10.1876 28.3989 7.13663 29.1366 5.82609 27.8261L20.1739 42.1739C21.4845 43.4845 24.5355 42.7467 28.1133 40.548C30.3042 39.2016 32.6927 37.3073 35 35C37.3073 32.6927 39.2016 30.3042 40.548 28.1133C42.7467 24.5355 43.4845 21.4845 42.1739 20.1739Z" fill="currentColor"></path>
              </g>
              <defs>
                <clipPath id="clip0_6_543">
                  <rect fill="white" height="48" width="48"></rect>
                </clipPath>
              </defs>
            </svg>
          </div>
          <h2 className="text-lg font-bold leading-tight tracking-[-0.015em]">Spark Photo Studio</h2>
        </div>
        <div className="flex items-center gap-8">
          <nav className="hidden md:flex items-center gap-9">
            <button onClick={() => navigate('/')} className="text-sm font-medium hover:text-primary transition-colors">
              Studio
            </button>
            <button className="text-sm font-medium hover:text-primary transition-colors">Gallery</button>
            <button className="text-sm font-medium hover:text-primary transition-colors">Bookings</button>
            <button className="text-sm font-medium hover:text-primary transition-colors">Contact</button>
          </nav>
          <button
            onClick={toggleDarkMode}
            className="size-10 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <span className="material-symbols-outlined">
              {isDark ? 'light_mode' : 'dark_mode'}
            </span>
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-10 flex-1">
        {/* Progress Bar */}
        <div className="max-w-[800px] mx-auto mb-8">
          <div className="flex flex-col gap-3">
            <div className="flex gap-6 justify-between items-end">
              <p className="text-base font-medium">Step 2 of 3</p>
              <p className="text-sm font-normal opacity-70">66% Complete</p>
            </div>
            <div className="rounded-full bg-[#e8cece] dark:bg-[#422020] overflow-hidden">
              <div className="h-2.5 rounded-full bg-primary" style={{ width: '66%' }}></div>
            </div>
            <p className="text-primary text-sm font-medium">Payment Confirmation</p>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined">error</span>
              <span>{error}</span>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Side: Order Summary */}
          <div className="space-y-6">
            <div className="bg-white dark:bg-background-dark/50 p-6 rounded-xl border border-[#e8cece] dark:border-[#422020] shadow-sm">
              <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">shopping_bag</span>
                Order Summary
              </h3>

              <div className="space-y-4">
                <div className="flex justify-between items-start border-b border-dashed border-[#e8cece] dark:border-[#422020] pb-4">
                  <div>
                    <p className="font-bold text-[#1c0d0d] dark:text-white">{ticketName}</p>
                    <p className="text-sm text-[#9c4949] dark:text-[#cc7a7a] capitalize">{ticketType}</p>
                  </div>
                  <p className="font-semibold">{formatCurrency(price)}</p>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <p className="text-[#9c4949] dark:text-[#cc7a7a]">Quantity</p>
                    <p className="text-[#1c0d0d] dark:text-white">{quantity}</p>
                  </div>
                </div>

                <div className="pt-4 border-t border-[#e8cece] dark:border-[#422020] mt-4">
                  <div className="flex justify-between items-center mb-1">
                    <p className="text-sm text-[#9c4949] dark:text-[#cc7a7a]">Booking Date</p>
                    <p className="text-sm font-medium">{formatDate(bookingDate)}</p>
                  </div>
                  <div className="flex justify-between items-center">
                    <p className="text-sm text-[#9c4949] dark:text-[#cc7a7a]">Time Slot</p>
                    <p className="text-sm font-medium">{timeSlot}</p>
                  </div>
                </div>

                <div className="pt-6 flex justify-between items-end">
                  <p className="text-lg font-bold">Total Amount</p>
                  <div className="text-right">
                    <p className="text-2xl font-black text-primary tracking-tight">
                      {formatCurrency(total)}
                    </p>
                    <p className="text-[10px] text-[#9c4949] uppercase tracking-wider">
                      Inclusive of all taxes
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4 p-4 bg-primary/5 rounded-lg border border-primary/10">
              <span className="material-symbols-outlined text-primary">verified_user</span>
              <p className="text-xs leading-relaxed text-[#9c4949] dark:text-[#cc7a7a]">
                Your payment is secured by Midtrans with 256-bit SSL encryption.
              </p>
            </div>
          </div>

          {/* Right Side: Customer Details & Pay */}
          <div>
            <div className="bg-white dark:bg-background-dark/50 p-6 rounded-xl border border-[#e8cece] dark:border-[#422020] shadow-sm">
              <h1 className="text-2xl font-bold mb-6">Complete Payment</h1>

              <div className="space-y-5 mb-8">
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-[#1c0d0d] dark:text-white">
                    Your Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full rounded-lg border border-[#e8cece] dark:border-[#422020] dark:bg-[#1a0c0c] focus:ring-primary focus:border-primary text-sm py-3 px-4"
                    placeholder="Enter your full name"
                    disabled={loading}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-[#1c0d0d] dark:text-white">
                    Phone Number (Optional)
                  </label>
                  <input
                    type="tel"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="w-full rounded-lg border border-[#e8cece] dark:border-[#422020] dark:bg-[#1a0c0c] focus:ring-primary focus:border-primary text-sm py-3 px-4"
                    placeholder="08xxxxxxxxxx"
                    disabled={loading}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-[#1c0d0d] dark:text-white">
                    Email
                  </label>
                  <input
                    type="email"
                    value={user?.email || ''}
                    className="w-full rounded-lg border border-[#e8cece] dark:border-[#422020] dark:bg-[#1a0c0c] text-sm py-3 px-4 bg-gray-50 dark:bg-gray-900"
                    disabled
                  />
                  <p className="text-xs text-[#9c4949]">Ticket will be sent to this email</p>
                </div>
              </div>

              {/* Midtrans Payment Info */}
              <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800">
                <div className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-blue-500">info</span>
                  <div>
                    <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                      Secure Payment via Midtrans
                    </p>
                    <p className="text-xs text-blue-600 dark:text-blue-300 mt-1">
                      You can pay using Credit Card, Bank Transfer, E-Wallet (GoPay, OVO, ShopeePay), QRIS, and more.
                    </p>
                  </div>
                </div>
              </div>

              <button
                onClick={handlePayWithMidtrans}
                disabled={loading || !ticketId || !price || !snapLoaded}
                className="w-full bg-primary hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <span className="material-symbols-outlined animate-spin">progress_activity</span>
                    Processing...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[20px]">lock</span>
                    Pay {formatCurrency(total)} Now
                  </>
                )}
              </button>

              {/* Payment Method Logos */}
              <div className="mt-6 pt-6 border-t border-[#e8cece] dark:border-[#422020]">
                <p className="text-xs text-center text-[#9c4949] mb-3">Supported Payment Methods</p>
                <div className="flex justify-center items-center gap-4 flex-wrap opacity-60">
                  <img
                    alt="Visa"
                    className="h-5"
                    src="https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Visa_Inc._logo.svg/200px-Visa_Inc._logo.svg.png"
                  />
                  <img
                    alt="Mastercard"
                    className="h-5"
                    src="https://upload.wikimedia.org/wikipedia/commons/thumb/2/2a/Mastercard-logo.svg/200px-Mastercard-logo.svg.png"
                  />
                  <div className="px-2 py-1 bg-[#00AED6] rounded text-white text-[10px] font-bold">GoPay</div>
                  <div className="px-2 py-1 bg-[#4C3494] rounded text-white text-[10px] font-bold">OVO</div>
                  <div className="px-2 py-1 bg-[#EE4D2D] rounded text-white text-[10px] font-bold">ShopeePay</div>
                  <div className="px-2 py-1 bg-gray-800 rounded text-white text-[10px] font-bold">QRIS</div>
                </div>
              </div>
            </div>

            <p className="text-center mt-6 text-xs text-[#9c4949] dark:text-[#cc7a7a]">
              By clicking "Pay Now", you agree to Spark Photo Studio's{' '}
              <a className="underline" href="#">Terms of Service</a> and{' '}
              <a className="underline" href="#">Cancellation Policy</a>.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-auto py-10 border-t border-[#e8cece] dark:border-[#422020] text-center">
        <div className="flex flex-col items-center gap-2">
          <div className="size-6 text-gray-400">
            <svg fill="none" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
              <path d="M42.1739 20.1739L27.8261 5.82609C29.1366 7.13663 28.3989 10.1876 26.2002 13.7654C24.8538 15.9564 22.9595 18.3449 20.6522 20.6522C18.3449 22.9595 15.9564 24.8538 13.7654 26.2002C10.1876 28.3989 7.13663 29.1366 5.82609 27.8261L20.1739 42.1739C21.4845 43.4845 24.5355 42.7467 28.1133 40.548C30.3042 39.2016 32.6927 37.3073 35 35C37.3073 32.6927 39.2016 30.3042 40.548 28.1133C42.7467 24.5355 43.4845 21.4845 42.1739 20.1739Z" fill="currentColor"></path>
            </svg>
          </div>
          <p className="text-xs text-[#9c4949] dark:text-[#cc7a7a]">
            © 2023 Spark Photo Studio. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
