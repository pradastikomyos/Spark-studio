import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function CheckoutPage() {
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [newsletter, setNewsletter] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [address, setAddress] = useState('');
  const [apartment, setApartment] = useState('');
  const [city, setCity] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [phone, setPhone] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('bca_va');
  const [promoCode, setPromoCode] = useState('');

  // Mock order data
  const orderItems = [
    {
      id: 1,
      name: 'General Admission - Adult',
      description: 'Entry Ticket',
      quantity: 2,
      price: 25,
      image: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=100&h=100&fit=crop'
    },
    {
      id: 2,
      name: 'Studio Art Print',
      description: '12x18 / Matte',
      quantity: 1,
      price: 40,
      image: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?w=100&h=100&fit=crop'
    }
  ];

  const subtotal = orderItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const tax = subtotal * 0.08;
  const total = subtotal + tax;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !firstName || !lastName || !address || !city || !zipCode || !phone) {
      alert('Please fill in all required fields');
      return;
    }

    navigate('/booking-success', {
      state: {
        orderItems,
        total,
        paymentMethod
      }
    });
  };

  const paymentMethods = {
    virtualAccount: [
      { id: 'bca_va', name: 'BCA Virtual Account', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5c/Bank_Central_Asia.svg/200px-Bank_Central_Asia.svg.png' },
      { id: 'mandiri_va', name: 'Mandiri Bill Payment', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ad/Bank_Mandiri_logo_2016.svg/200px-Bank_Mandiri_logo_2016.svg.png' },
      { id: 'bni_va', name: 'BNI Virtual Account', logo: 'https://upload.wikimedia.org/wikipedia/id/thumb/5/55/BNI_logo.svg/200px-BNI_logo.svg.png' },
      { id: 'bri_va', name: 'BRI Virtual Account', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2e/BRI_2020.svg/200px-BRI_2020.svg.png' }
    ],
    ewallet: [
      { id: 'gopay', name: 'GoPay', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/86/Gopay_logo.svg/200px-Gopay_logo.svg.png' },
      { id: 'ovo', name: 'OVO', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/eb/Logo_ovo_purple.svg/200px-Logo_ovo_purple.svg.png' },
      { id: 'shopeepay', name: 'ShopeePay', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/fe/Shopee.svg/200px-Shopee.svg.png' }
    ],
    qris: [
      { id: 'qris', name: 'QRIS', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e1/QRIS_logo.svg/200px-QRIS_logo.svg.png' }
    ]
  };

  return (
    <div className="flex flex-col lg:flex-row min-h-screen">
      {/* Left Side - Form */}
      <div className="flex-1 flex flex-col w-full lg:w-[58%] border-r border-gray-100 bg-white order-2 lg:order-1">
        {/* Header */}
        <header className="px-6 py-6 lg:px-12 xl:px-20 border-b border-gray-50 lg:border-none">
          <div className="flex items-center gap-3">
            <span className="text-primary material-symbols-outlined text-3xl">shutter_speed</span>
            <h2 className="text-[#1c0d0d] text-xl font-bold tracking-tight">Spark Photo Studio</h2>
          </div>
        </header>

        <main className="flex-1 px-6 py-4 lg:px-12 xl:px-20 pb-20">
          {/* Breadcrumb */}
          <nav className="flex items-center text-sm mb-8 font-body">
            <button onClick={() => navigate('/cart')} className="text-primary hover:text-red-700 transition-colors">
              Cart
            </button>
            <span className="material-symbols-outlined text-gray-400 text-sm mx-2">chevron_right</span>
            <button className="text-primary hover:text-red-700 transition-colors">
              Information
            </button>
            <span className="material-symbols-outlined text-gray-400 text-sm mx-2">chevron_right</span>
            <span className="text-[#1c0d0d] font-semibold">Payment</span>
          </nav>

          <form onSubmit={handleSubmit}>
            {/* Contact Information */}
            <section className="mb-10">
              <div className="flex justify-between items-baseline mb-4">
                <h2 className="text-xl font-bold">Contact Information</h2>
                <div className="text-sm font-body">
                  <span className="text-gray-500">Already have an account?</span>
                  <button
                    type="button"
                    onClick={() => navigate('/login')}
                    className="text-primary font-medium ml-1"
                  >
                    Log in
                  </button>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2 font-body text-gray-700">
                    Email address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-lg border-border-light bg-[#fcf8f8] px-4 py-3 text-base focus:border-primary focus:ring-primary/20 placeholder:text-gray-400 font-body transition-colors"
                    placeholder="you@example.com"
                    required
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="newsletter"
                    checked={newsletter}
                    onChange={(e) => setNewsletter(e.target.checked)}
                    className="rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <label className="text-sm text-gray-600 font-body" htmlFor="newsletter">
                    Email me with news and offers
                  </label>
                </div>
              </div>
            </section>

            {/* Shipping Address */}
            <section className="mb-10">
              <h2 className="text-xl font-bold mb-4">Shipping Address</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-body">
                <div>
                  <label className="block text-sm font-medium mb-1.5 text-gray-700">First name</label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full rounded-lg border-border-light bg-[#fcf8f8] px-4 py-3 text-base focus:border-primary focus:ring-primary/20"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5 text-gray-700">Last name</label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full rounded-lg border-border-light bg-[#fcf8f8] px-4 py-3 text-base focus:border-primary focus:ring-primary/20"
                    required
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-1.5 text-gray-700">Address</label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full rounded-lg border-border-light bg-[#fcf8f8] px-4 py-3 text-base focus:border-primary focus:ring-primary/20"
                    placeholder="Street address, P.O. Box"
                    required
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-1.5 text-gray-700">
                    Apartment, suite, etc. (optional)
                  </label>
                  <input
                    type="text"
                    value={apartment}
                    onChange={(e) => setApartment(e.target.value)}
                    className="w-full rounded-lg border-border-light bg-[#fcf8f8] px-4 py-3 text-base focus:border-primary focus:ring-primary/20"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5 text-gray-700">City</label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full rounded-lg border-border-light bg-[#fcf8f8] px-4 py-3 text-base focus:border-primary focus:ring-primary/20"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5 text-gray-700">ZIP Code</label>
                  <input
                    type="text"
                    value={zipCode}
                    onChange={(e) => setZipCode(e.target.value)}
                    className="w-full rounded-lg border-border-light bg-[#fcf8f8] px-4 py-3 text-base focus:border-primary focus:ring-primary/20"
                    required
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-1.5 text-gray-700">Phone</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full rounded-lg border-border-light bg-[#fcf8f8] px-4 py-3 text-base focus:border-primary focus:ring-primary/20"
                    placeholder="(555) 555-5555"
                    required
                  />
                </div>
              </div>
            </section>

            {/* Payment Method */}
            <section className="mb-8">
              <h2 className="text-xl font-bold mb-4">Payment Method</h2>
              <p className="text-sm text-gray-500 mb-6 font-body">
                Select your preferred localized payment method. All transactions are secure.
              </p>

              <div className="space-y-6">
                {/* Virtual Account */}
                <div className="border border-border-light rounded-lg overflow-hidden bg-white">
                  <div className="px-5 py-4 bg-[#fcf8f8] border-b border-border-light">
                    <h3 className="font-display font-semibold text-lg text-[#1c0d0d]">Virtual Account</h3>
                    <p className="text-xs text-gray-500 font-body mt-0.5">Pay via bank transfer</p>
                  </div>
                  <div className="bg-white">
                    {paymentMethods.virtualAccount.map((method, index) => (
                      <label
                        key={method.id}
                        className={`relative block cursor-pointer group ${
                          index !== paymentMethods.virtualAccount.length - 1 ? 'border-b border-gray-50' : ''
                        }`}
                      >
                        <input
                          type="radio"
                          name="payment_method"
                          value={method.id}
                          checked={paymentMethod === method.id}
                          onChange={(e) => setPaymentMethod(e.target.value)}
                          className="peer sr-only"
                        />
                        <div className={`p-4 flex items-center justify-between transition-colors ${
                          paymentMethod === method.id ? 'bg-[#fff5f5]' : 'hover:bg-[#fcf8f8]'
                        }`}>
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-8 bg-white border border-gray-200 rounded flex items-center justify-center p-1 shadow-sm">
                              <span className="text-xs font-bold text-gray-600">{method.name.split(' ')[0]}</span>
                            </div>
                            <span className="font-body font-medium text-gray-900">{method.name}</span>
                          </div>
                          <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                            paymentMethod === method.id ? 'border-primary bg-primary' : 'border-gray-300'
                          }`}>
                            <div className={`w-2.5 h-2.5 bg-white rounded-full transition-opacity ${
                              paymentMethod === method.id ? 'opacity-100' : 'opacity-0'
                            }`}></div>
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {/* E-Wallet */}
                <div className="border border-border-light rounded-lg overflow-hidden bg-white">
                  <div className="px-5 py-4 bg-[#fcf8f8] border-b border-border-light">
                    <h3 className="font-display font-semibold text-lg text-[#1c0d0d]">E-Wallet</h3>
                    <p className="text-xs text-gray-500 font-body mt-0.5">Pay instantly with your wallet app</p>
                  </div>
                  <div className="bg-white">
                    {paymentMethods.ewallet.map((method, index) => (
                      <label
                        key={method.id}
                        className={`relative block cursor-pointer group ${
                          index !== paymentMethods.ewallet.length - 1 ? 'border-b border-gray-50' : ''
                        }`}
                      >
                        <input
                          type="radio"
                          name="payment_method"
                          value={method.id}
                          checked={paymentMethod === method.id}
                          onChange={(e) => setPaymentMethod(e.target.value)}
                          className="peer sr-only"
                        />
                        <div className={`p-4 flex items-center justify-between transition-colors ${
                          paymentMethod === method.id ? 'bg-[#fff5f5]' : 'hover:bg-[#fcf8f8]'
                        }`}>
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-8 bg-white border border-gray-200 rounded flex items-center justify-center p-1 shadow-sm">
                              <span className="text-xs font-bold text-gray-600">{method.name}</span>
                            </div>
                            <span className="font-body font-medium text-gray-900">{method.name}</span>
                          </div>
                          <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                            paymentMethod === method.id ? 'border-primary bg-primary' : 'border-gray-300'
                          }`}>
                            <div className={`w-2.5 h-2.5 bg-white rounded-full transition-opacity ${
                              paymentMethod === method.id ? 'opacity-100' : 'opacity-0'
                            }`}></div>
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {/* QRIS */}
                <div className="border border-border-light rounded-lg overflow-hidden bg-white">
                  <div className="px-5 py-4 bg-[#fcf8f8] border-b border-border-light">
                    <h3 className="font-display font-semibold text-lg text-[#1c0d0d]">QRIS</h3>
                    <p className="text-xs text-gray-500 font-body mt-0.5">Scan to pay with any supported app</p>
                  </div>
                  <div className="bg-white">
                    {paymentMethods.qris.map((method) => (
                      <label key={method.id} className="relative block cursor-pointer group">
                        <input
                          type="radio"
                          name="payment_method"
                          value={method.id}
                          checked={paymentMethod === method.id}
                          onChange={(e) => setPaymentMethod(e.target.value)}
                          className="peer sr-only"
                        />
                        <div className={`p-4 flex items-center justify-between transition-colors ${
                          paymentMethod === method.id ? 'bg-[#fff5f5]' : 'hover:bg-[#fcf8f8]'
                        }`}>
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-8 bg-white border border-gray-200 rounded flex items-center justify-center p-1 shadow-sm">
                              <span className="text-xs font-bold text-gray-600">QRIS</span>
                            </div>
                            <span className="font-body font-medium text-gray-900">{method.name}</span>
                          </div>
                          <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                            paymentMethod === method.id ? 'border-primary bg-primary' : 'border-gray-300'
                          }`}>
                            <div className={`w-2.5 h-2.5 bg-white rounded-full transition-opacity ${
                              paymentMethod === method.id ? 'opacity-100' : 'opacity-0'
                            }`}></div>
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-6 pt-6 border-t border-gray-100">
              <button
                type="button"
                onClick={() => navigate('/cart')}
                className="flex items-center gap-1 text-primary hover:text-red-700 font-medium text-sm"
              >
                <span className="material-symbols-outlined text-lg">arrow_back</span>
                Return to cart
              </button>
            </div>
          </form>
        </main>

        <footer className="px-6 lg:px-12 xl:px-20 py-4 border-t border-gray-50 text-xs text-gray-400 font-body">
          <div className="flex gap-4">
            <a className="hover:underline" href="#">Refund policy</a>
            <a className="hover:underline" href="#">Privacy policy</a>
            <a className="hover:underline" href="#">Terms of service</a>
          </div>
        </footer>
      </div>

      {/* Right Side - Order Summary */}
      <div className="w-full lg:w-[42%] bg-background-light dark:bg-background-dark border-l border-gray-200 order-1 lg:order-2">
        <div className="lg:sticky lg:top-0 h-auto lg:h-screen lg:overflow-y-auto px-6 py-8 lg:px-10 lg:py-12 flex flex-col">
          <h2 className="text-xl font-bold mb-6 text-[#1c0d0d]">Order Summary</h2>

          {/* Order Items */}
          <div className="space-y-6 flex-1 mb-8">
            {orderItems.map((item) => (
              <div key={item.id} className="flex gap-4 items-center">
                <div className="relative size-16 bg-white border border-gray-200 rounded-lg flex-shrink-0">
                  <img
                    alt={item.name}
                    className="w-full h-full object-cover rounded-lg"
                    src={item.image}
                  />
                  <span className="absolute -top-2 -right-2 bg-gray-500 text-white text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full font-body">
                    {item.quantity}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-bold text-[#1c0d0d] truncate">{item.name}</h3>
                  <p className="text-xs text-gray-500 font-body">{item.description}</p>
                </div>
                <div className="text-sm font-medium font-body">
                  ${(item.price * item.quantity).toFixed(2)}
                </div>
              </div>
            ))}
          </div>

          {/* Promo Code */}
          <div className="flex gap-3 mb-8 pb-8 border-b border-gray-200 border-dashed">
            <input
              type="text"
              value={promoCode}
              onChange={(e) => setPromoCode(e.target.value)}
              className="flex-1 rounded-lg border-gray-300 bg-white px-4 py-2.5 text-sm font-body focus:border-primary focus:ring-primary/20"
              placeholder="Gift card or discount code"
            />
            <button className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium px-4 py-2.5 rounded-lg text-sm transition-colors font-body">
              Apply
            </button>
          </div>

          {/* Price Summary */}
          <div className="space-y-3 text-sm font-body text-gray-600 mb-8">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span className="text-[#1c0d0d] font-medium">${subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Shipping</span>
              <span className="text-xs text-gray-500">(Calculated at next step)</span>
            </div>
            <div className="flex justify-between">
              <span className="flex items-center gap-1">
                Estimated Tax
                <span className="material-symbols-outlined text-[14px] text-gray-400" title="Estimated based on your location">
                  info
                </span>
              </span>
              <span className="text-[#1c0d0d] font-medium">${tax.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center pt-4 mt-4 border-t border-gray-200 text-[#1c0d0d]">
              <span className="text-base font-display font-bold">Total</span>
              <div className="flex items-baseline gap-2">
                <span className="text-xs text-gray-500">USD</span>
                <span className="text-2xl font-bold font-display tracking-tight">${total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <button
            onClick={handleSubmit}
            className="w-full bg-primary hover:bg-[#d90b0b] text-white rounded-lg py-4 px-6 font-bold text-lg shadow-lg hover:shadow-xl transition-all transform active:scale-[0.99] flex items-center justify-center gap-2 group"
          >
            <span>Bayar Sekarang</span>
            <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform">
              arrow_forward
            </span>
          </button>

          <p className="text-center text-xs text-gray-400 mt-4 font-body">
            By confirming, you agree to our{' '}
            <a className="underline" href="#">Terms</a> and{' '}
            <a className="underline" href="#">Privacy Policy</a>.
          </p>
        </div>
      </div>
    </div>
  );
}
