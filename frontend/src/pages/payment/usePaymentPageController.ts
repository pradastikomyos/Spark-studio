import { useEffect, useMemo, useState } from 'react';
import type { NavigateFunction, Location } from 'react-router-dom';
import { loadSnapScript } from '../../utils/midtransSnap';
import {
  restoreBookingState,
  hasBookingState,
  clearBookingState,
} from '../../utils/bookingStateManager';
import { SessionErrorHandler } from '../../utils/sessionErrorHandler';
import { buildBookingSuccessState, getPaymentBookingDetails, hasRequiredPaymentDetails } from './paymentHelpers';
import { createMidtransToken, validatePaymentSession } from './paymentMidtrans';
import type { PaymentLocationState, PreservedBookingData } from './paymentTypes';

type UsePaymentPageControllerParams = {
  location: Location;
  navigate: NavigateFunction;
  locationState: PaymentLocationState;
  user: {
    email?: string | null;
    user_metadata?: { name?: string | null };
  } | null;
};

export function usePaymentPageController({
  location,
  navigate,
  locationState,
  user,
}: UsePaymentPageControllerParams) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [snapLoaded, setSnapLoaded] = useState(false);

  const bookingDetails = useMemo(() => getPaymentBookingDetails(locationState), [locationState]);

  useEffect(() => {
    loadSnapScript()
      .then(() => setSnapLoaded(true))
      .catch((loadError) => {
        console.error('Failed to load Snap:', loadError);
        setError('Failed to load payment system. Please refresh the page.');
      });
  }, []);

  useEffect(() => {
    if (user?.user_metadata?.name) {
      setCustomerName(user.user_metadata.name);
      return;
    }
    if (user?.email) {
      setCustomerName(user.email.split('@')[0] || '');
    }
  }, [user]);

  useEffect(() => {
    if (hasRequiredPaymentDetails(bookingDetails)) {
      return;
    }

    if (hasBookingState()) {
      const restored = restoreBookingState();
      if (restored) {
        console.log('Restoring booking state after session recovery');
        navigate(location.pathname, { state: restored, replace: true });
        return;
      }
    }

    setError(
      "We couldn't find your booking details. Your selection may have timed out. Please go back and select your session again."
    );
  }, [bookingDetails, location.pathname, navigate]);

  const errorHandler = useMemo(
    () =>
      new SessionErrorHandler({
        onSessionExpired: (returnPath, state) => {
          navigate('/login', { state: { returnTo: returnPath, returnState: state } });
        },
        preserveState: true,
      }),
    [navigate]
  );

  const handlePayWithMidtrans = async () => {
    if (!user) {
      alert(
        "Please log in to complete your payment. We'll save your booking details so you can continue immediately after signing in."
      );
      navigate('/login', { state: { returnTo: location.pathname, returnState: locationState } });
      return;
    }

    if (!customerName.trim()) {
      setError('Please enter your name');
      return;
    }

    setLoading(true);
    setError(null);

    const bookingData: PreservedBookingData = {
      ticketId: bookingDetails.ticketId,
      ticketName: bookingDetails.ticketName,
      ticketType: bookingDetails.ticketType,
      price: bookingDetails.price,
      date: bookingDetails.bookingDate,
      time: bookingDetails.timeSlot,
      quantity: bookingDetails.quantity,
      total: bookingDetails.total,
    };

    try {
      console.log('[PaymentPage] Validating session with getUser()...');
      const { session, error: sessionError } = await validatePaymentSession();

      if (sessionError || !session?.access_token) {
        console.error('[PaymentPage] Session validation failed:', sessionError);
        alert(
          "Your session has expired. We've saved your booking details—please log in again to complete your payment."
        );
        await errorHandler.handleAuthError({ status: 401 }, { returnPath: location.pathname, state: bookingData });
        return;
      }

      console.log('[PaymentPage] Session validated and refreshed successfully');

      const response = await createMidtransToken({
        booking: bookingDetails,
        customerName: customerName.trim(),
        customerEmail: user.email || '',
        customerPhone: customerPhone.trim() || undefined,
        token: session.access_token,
      });

      if (!window.snap || !snapLoaded) {
        throw new Error('Midtrans Snap not loaded. Please refresh the page.');
      }

      window.snap.pay(response.token, {
        onSuccess: (result) => {
          console.log('Payment success:', result);
          clearBookingState();
          navigate(`/booking-success?order_id=${encodeURIComponent(response.order_number)}`, {
            state: buildBookingSuccessState({
              orderNumber: response.order_number,
              orderId: response.order_id,
              ticketName: bookingDetails.ticketName,
              total: bookingDetails.total,
              date: bookingDetails.bookingDate,
              time: bookingDetails.timeSlot,
              customerName: customerName.trim(),
              paymentResult: result,
            }),
          });
        },
        onPending: (result) => {
          console.log('Payment pending:', result);
          navigate(`/booking-success?order_id=${encodeURIComponent(response.order_number)}`, {
            state: buildBookingSuccessState({
              orderNumber: response.order_number,
              orderId: response.order_id,
              ticketName: bookingDetails.ticketName,
              total: bookingDetails.total,
              date: bookingDetails.bookingDate,
              time: bookingDetails.timeSlot,
              customerName: customerName.trim(),
              paymentResult: result,
            }),
          });
        },
        onError: (result) => {
          console.error('Payment error:', result);
          setError('Payment failed. Please try again.');
        },
        onClose: () => {
          console.log('Payment popup closed');
          setLoading(false);
          navigate(`/booking-success?order_id=${encodeURIComponent(response.order_number)}`, {
            state: buildBookingSuccessState({
              orderNumber: response.order_number,
              orderId: response.order_id,
              ticketName: bookingDetails.ticketName,
              total: bookingDetails.total,
              date: bookingDetails.bookingDate,
              time: bookingDetails.timeSlot,
              customerName: customerName.trim(),
            }),
          });
        },
      });
    } catch (paymentError) {
      if ((paymentError as { status?: number }).status === 401) {
        console.error('Auth error from edge function:', paymentError);
        alert(
          "Your session has timed out for security. Don't worry—your booking details are saved. Please log in again to finish."
        );
        await errorHandler.handleAuthError({ status: 401 }, { returnPath: location.pathname, state: bookingData });
        return;
      }

      console.error('Payment error:', paymentError);
      setError(paymentError instanceof Error ? paymentError.message : 'Failed to process payment');
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    error,
    customerName,
    customerPhone,
    snapLoaded,
    bookingDetails,
    setCustomerName,
    setCustomerPhone,
    handlePayWithMidtrans,
  };
}
