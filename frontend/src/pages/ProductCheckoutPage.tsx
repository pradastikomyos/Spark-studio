import { useNavigate, useLocation } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/cartStore';
import { useToast } from '../components/Toast';
import { CheckoutCustomerForm } from './product-checkout/CheckoutCustomerForm';
import { CheckoutPaymentSection } from './product-checkout/CheckoutPaymentSection';
import { CheckoutSummaryCard } from './product-checkout/CheckoutSummaryCard';
import { CheckoutVoucherSection } from './product-checkout/CheckoutVoucherSection';
import { useProductCheckoutController } from './product-checkout/useProductCheckoutController';

export default function ProductCheckoutPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const { user, session, initialized } = useAuth();
  const { items: allItems, removeItem } = useCart();
  const { showToast } = useToast();
  const cashierCheckoutEnabled = String(import.meta.env.VITE_ENABLE_CASHIER_CHECKOUT || '').toLowerCase() !== 'false';
  const {
    customerName,
    customerPhone,
    error,
    loading,
    voucherCode,
    appliedVoucher,
    voucherError,
    applyingVoucher,
    orderItems,
    subtotal,
    discountAmount,
    finalTotal,
    canCheckout,
    setCustomerName,
    setCustomerPhone,
    setVoucherCode,
    handleApplyVoucher,
    handleRemoveVoucher,
    handlePay,
    handleCashierCheckout,
    cashierDisabled,
  } = useProductCheckoutController({
    allItems,
    selectedVariantIds: location.state?.selectedVariantIds as number[] | undefined,
    user,
    sessionToken: session?.access_token,
    initialized,
    t,
    navigate,
    queryClient,
    removeItem,
    showToast,
    cashierCheckoutEnabled,
  });

  return (
    <div className="min-h-screen bg-background-light flex flex-col">
       {/* Header */}


      <main className="max-w-4xl mx-auto px-6 py-10 flex-1 w-full">
         {/* Progress Bar */}
         <div className="max-w-[800px] mx-auto mb-8">
          <div className="flex flex-col gap-3">
            <div className="flex gap-6 justify-between items-end">
              <p className="text-base font-medium">Step 2 of 3</p>
              <p className="text-sm font-normal opacity-70">66% Complete</p>
            </div>
            <div className="rounded-full bg-rose-100 overflow-hidden">
              <div className="h-2.5 rounded-full bg-primary" style={{ width: '66%' }}></div>
            </div>
            <p className="text-primary text-sm font-medium">Payment Confirmation</p>
          </div>
        </div>

        {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            <div className="flex items-center gap-2">
                <span className="material-symbols-outlined">error</span>
                <span>{error}</span>
            </div>
            </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
           {/* Left Side: Order Summary */}
           <div className="space-y-6">
            <CheckoutSummaryCard
              orderItems={orderItems}
              subtotal={subtotal}
              discountAmount={discountAmount}
              finalTotal={finalTotal}
              appliedVoucher={appliedVoucher}
            />

            <div className="flex items-center gap-4 p-4 bg-primary/5 rounded-lg border border-primary/10">
              <span className="material-symbols-outlined text-primary">verified_user</span>
              <p className="text-xs leading-relaxed text-rose-700">
                Your payment is secured by Midtrans with 256-bit SSL encryption.
              </p>
            </div>
          </div>

          {/* Right Side: Customer Details & Pay */}
          <div>
            <div className="bg-white p-6 rounded-xl border border-rose-100 shadow-sm">
              <h1 className="text-2xl font-bold mb-6">Complete Payment</h1>

              <CheckoutCustomerForm
                customerName={customerName}
                customerPhone={customerPhone}
                customerEmail={user?.email || ''}
                loading={loading}
                onChangeName={setCustomerName}
                onChangePhone={setCustomerPhone}
              />

              <CheckoutVoucherSection
                voucherCode={voucherCode}
                appliedVoucher={appliedVoucher}
                voucherError={voucherError}
                loading={loading}
                applyingVoucher={applyingVoucher}
                onChangeVoucherCode={setVoucherCode}
                onApplyVoucher={handleApplyVoucher}
                onRemoveVoucher={handleRemoveVoucher}
              />

              <CheckoutPaymentSection
                loading={loading}
                canCheckout={canCheckout}
                finalTotal={finalTotal}
                cashierCheckoutEnabled={cashierCheckoutEnabled}
                cashierDisabled={cashierDisabled}
                onPay={handlePay}
                onCashierCheckout={handleCashierCheckout}
              />

              {/* Payment Method Logos */}
              <div className="mt-6 pt-6 border-t border-rose-100">
                <p className="text-xs text-center text-rose-700 mb-3">Supported Payment Methods</p>
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
                  <div className="px-2 py-1 bg-cyan-500 rounded text-white text-[10px] font-bold">GoPay</div>
                  <div className="px-2 py-1 bg-purple-700 rounded text-white text-[10px] font-bold">OVO</div>
                  <div className="px-2 py-1 bg-orange-500 rounded text-white text-[10px] font-bold">ShopeePay</div>
                  <div className="px-2 py-1 bg-gray-800 rounded text-white text-[10px] font-bold">QRIS</div>
                </div>
              </div>
            </div>

            <p className="text-center mt-6 text-xs text-rose-700">
              By clicking "Pay Now", you agree to Spark Stage's{' '}
              <a className="underline" href="#">Terms of Service</a> and{' '}
              <a className="underline" href="#">Cancellation Policy</a>.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}

    </div>
  );
}
