type CheckoutCustomerFormProps = {
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  loading: boolean;
  onChangeName: (value: string) => void;
  onChangePhone: (value: string) => void;
};

export function CheckoutCustomerForm({
  customerName,
  customerPhone,
  customerEmail,
  loading,
  onChangeName,
  onChangePhone,
}: CheckoutCustomerFormProps) {
  const nameInputId = 'checkout-customer-name';
  const phoneInputId = 'checkout-customer-phone';
  const emailInputId = 'checkout-customer-email';

  return (
    <div className="space-y-5 mb-8">
      <div className="space-y-1.5">
        <label htmlFor={nameInputId} className="text-sm font-semibold text-neutral-950">
          Your Name <span className="text-red-500">*</span>
        </label>
        <input
          id={nameInputId}
          type="text"
          value={customerName}
          onChange={(event) => onChangeName(event.target.value)}
          className="w-full rounded-lg border border-rose-100 focus:ring-primary focus:border-primary text-sm py-3 px-4 outline-none transition-all"
          placeholder="Enter your full name"
          disabled={loading}
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor={phoneInputId} className="text-sm font-semibold text-neutral-950">Phone Number (Optional)</label>
        <input
          id={phoneInputId}
          type="tel"
          value={customerPhone}
          onChange={(event) => onChangePhone(event.target.value)}
          className="w-full rounded-lg border border-rose-100 focus:ring-primary focus:border-primary text-sm py-3 px-4 outline-none transition-all"
          placeholder="08xxxxxxxxxx"
          disabled={loading}
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor={emailInputId} className="text-sm font-semibold text-neutral-950">Email</label>
        <input
          id={emailInputId}
          type="email"
          value={customerEmail}
          className="w-full rounded-lg border border-rose-100 text-sm py-3 px-4 bg-gray-50 outline-none"
          disabled
        />
        <p className="text-xs text-rose-700">Order details will be sent to this email</p>
      </div>
    </div>
  );
}
