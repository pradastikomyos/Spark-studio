import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { PaymentCustomerForm } from './payment/PaymentCustomerForm';
import { PaymentOrderSummary } from './payment/PaymentOrderSummary';
import { PaymentProgress } from './payment/PaymentProgress';
import { usePaymentPageController } from './payment/usePaymentPageController';
import type { PaymentLocationState } from './payment/paymentTypes';

export default function PaymentPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as PaymentLocationState;
  const { user } = useAuth();
  const {
    loading,
    error,
    customerName,
    customerPhone,
    snapLoaded,
    bookingDetails,
    setCustomerName,
    setCustomerPhone,
    handlePayWithMidtrans,
  } = usePaymentPageController({
    location,
    navigate,
    locationState: state,
    user,
  });

  return (
    <div className="min-h-screen bg-background-light flex flex-col">
      {/* Header */}


      <main className="max-w-4xl mx-auto px-6 py-10 flex-1">
        <PaymentProgress />

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined">error</span>
              <span>{error}</span>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <PaymentOrderSummary bookingDetails={bookingDetails} />

          <div>
            <PaymentCustomerForm
              bookingDetails={bookingDetails}
              loading={loading}
              snapLoaded={snapLoaded}
              customerName={customerName}
              customerPhone={customerPhone}
              customerEmail={user?.email || ''}
              onChangeCustomerName={setCustomerName}
              onChangeCustomerPhone={setCustomerPhone}
              onPay={() => {
                void handlePayWithMidtrans();
              }}
            />

            <p className="text-center mt-6 text-xs text-rose-700">
              By clicking "Pay Now", you agree to Spark Stage's{' '}
              <a className="underline" href="#">Terms of Service</a> and{' '}
              <a className="underline" href="#">Cancellation Policy</a>.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-auto py-10 border-t border-rose-100 text-center">
        <div className="flex flex-col items-center gap-2">
          <div className="size-6 text-gray-400">
            <svg fill="none" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
              <path d="M42.1739 20.1739L27.8261 5.82609C29.1366 7.13663 28.3989 10.1876 26.2002 13.7654C24.8538 15.9564 22.9595 18.3449 20.6522 20.6522C18.3449 22.9595 15.9564 24.8538 13.7654 26.2002C10.1876 28.3989 7.13663 29.1366 5.82609 27.8261L20.1739 42.1739C21.4845 43.4845 24.5355 42.7467 28.1133 40.548C30.3042 39.2016 32.6927 37.3073 35 35C37.3073 32.6927 39.2016 30.3042 40.548 28.1133C42.7467 24.5355 43.4845 21.4845 42.1739 20.1739Z" fill="currentColor"></path>
            </svg>
          </div>
          <p className="text-xs text-rose-700">
            © 2023 Spark Stage. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
