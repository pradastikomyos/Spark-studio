import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useDarkMode } from '../hooks/useDarkMode';

interface LocationState {
  ticketType?: string;
  sessionFee?: number;
  date?: string;
  time?: string;
}

export default function PaymentPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as LocationState;
  const { isDark, toggleDarkMode } = useDarkMode();

  const [paymentMethod, setPaymentMethod] = useState<'card' | 'ewallet' | 'transfer'>('card');
  const [cardName, setCardName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [cvv, setCvv] = useState('');
  const [saveCard, setSaveCard] = useState(false);

  // Mock data dari booking page
  const ticketType = state?.ticketType || 'Premium Portrait Session';
  const sessionFee = state?.sessionFee || 1200000;
  const additionalTime = 200000;
  const digitalFiles = 100000;
  const total = sessionFee + additionalTime + digitalFiles;
  const bookingDate = state?.date || 'Sat, Dec 24, 2023';
  const timeSlot = state?.time || '14:00 - 16:00';

  const handlePayment = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (paymentMethod === 'card') {
      if (!cardName || !cardNumber || !expiryDate || !cvv) {
        alert('Please fill in all card details');
        return;
      }
    }

    // Simulate payment processing and navigate to success page
    navigate('/booking-success', {
      state: {
        ticketType,
        total,
        date: bookingDate,
        time: timeSlot,
        customerName: cardName || 'Guest'
      }
    });
  };

  const formatCardNumber = (value: string) => {
    const cleaned = value.replace(/\s/g, '');
    const formatted = cleaned.match(/.{1,4}/g)?.join(' ') || cleaned;
    return formatted;
  };

  const formatExpiryDate = (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length >= 2) {
      return cleaned.slice(0, 2) + ' / ' + cleaned.slice(2, 4);
    }
    return cleaned;
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

      <main className="max-w-6xl mx-auto px-6 py-10">
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

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* Left Side: Order Summary */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white dark:bg-background-dark/50 p-6 rounded-xl border border-[#e8cece] dark:border-[#422020] shadow-sm">
              <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">shopping_bag</span>
                Order Summary
              </h3>

              <div className="space-y-4">
                <div className="flex justify-between items-start border-b border-dashed border-[#e8cece] dark:border-[#422020] pb-4">
                  <div>
                    <p className="font-bold text-[#1c0d0d] dark:text-white">{ticketType}</p>
                    <p className="text-sm text-[#9c4949] dark:text-[#cc7a7a]">Studio Room A • 90 mins</p>
                  </div>
                  <p className="font-semibold">IDR {sessionFee.toLocaleString('id-ID')}</p>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <p className="text-[#9c4949] dark:text-[#cc7a7a]">Additional 30 mins</p>
                    <p className="text-[#1c0d0d] dark:text-white">IDR {additionalTime.toLocaleString('id-ID')}</p>
                  </div>
                  <div className="flex justify-between text-sm">
                    <p className="text-[#9c4949] dark:text-[#cc7a7a]">All Digital Files (High-Res)</p>
                    <p className="text-[#1c0d0d] dark:text-white">IDR {digitalFiles.toLocaleString('id-ID')}</p>
                  </div>
                </div>

                <div className="pt-4 border-t border-[#e8cece] dark:border-[#422020] mt-4">
                  <div className="flex justify-between items-center mb-1">
                    <p className="text-sm text-[#9c4949] dark:text-[#cc7a7a]">Booking Date</p>
                    <p className="text-sm font-medium">{bookingDate}</p>
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
                      IDR {total.toLocaleString('id-ID')}
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
                Your payment is secured with 256-bit SSL encryption. We do not store your full card details.
              </p>
            </div>
          </div>

          {/* Right Side: Payment Methods */}
          <div className="lg:col-span-7">
            <div className="bg-white dark:bg-background-dark/50 p-6 rounded-xl border border-[#e8cece] dark:border-[#422020] shadow-sm">
              <h1 className="text-2xl font-bold mb-8">Payment Method</h1>

              {/* Payment Method Tabs */}
              <div className="grid grid-cols-3 gap-3 mb-8">
                <button
                  onClick={() => setPaymentMethod('card')}
                  className={`flex flex-col items-center justify-center p-4 rounded-lg transition-colors ${
                    paymentMethod === 'card'
                      ? 'border-2 border-primary bg-primary/5 text-primary'
                      : 'border border-[#e8cece] dark:border-[#422020] hover:border-primary/50'
                  }`}
                >
                  <span className="material-symbols-outlined mb-2">credit_card</span>
                  <span className="text-xs font-bold uppercase">Credit Card</span>
                </button>

                <button
                  onClick={() => setPaymentMethod('ewallet')}
                  className={`flex flex-col items-center justify-center p-4 rounded-lg transition-colors ${
                    paymentMethod === 'ewallet'
                      ? 'border-2 border-primary bg-primary/5 text-primary'
                      : 'border border-[#e8cece] dark:border-[#422020] hover:border-primary/50'
                  }`}
                >
                  <span className="material-symbols-outlined mb-2">account_balance_wallet</span>
                  <span className="text-xs font-bold uppercase">E Wallet</span>
                </button>

                <button
                  onClick={() => setPaymentMethod('transfer')}
                  className={`flex flex-col items-center justify-center p-4 rounded-lg transition-colors ${
                    paymentMethod === 'transfer'
                      ? 'border-2 border-primary bg-primary/5 text-primary'
                      : 'border border-[#e8cece] dark:border-[#422020] hover:border-primary/50'
                  }`}
                >
                  <span className="material-symbols-outlined mb-2">account_balance</span>
                  <span className="text-xs font-bold uppercase">Transfer</span>
                </button>
              </div>

              {/* Payment Forms */}
              <form onSubmit={handlePayment} className="space-y-6">
                {paymentMethod === 'card' && (
                  <>
                    <div className="space-y-1.5">
                      <label className="text-sm font-semibold text-[#1c0d0d] dark:text-white">
                        Cardholder Name
                      </label>
                      <input
                        type="text"
                        value={cardName}
                        onChange={(e) => setCardName(e.target.value)}
                        className="w-full rounded-lg border-[#e8cece] dark:border-[#422020] dark:bg-[#1a0c0c] focus:ring-primary focus:border-primary text-sm py-3 px-4"
                        placeholder="John Doe"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-sm font-semibold text-[#1c0d0d] dark:text-white">
                        Card Number
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          value={cardNumber}
                          onChange={(e) => {
                            const formatted = formatCardNumber(e.target.value);
                            if (formatted.replace(/\s/g, '').length <= 16) {
                              setCardNumber(formatted);
                            }
                          }}
                          className="w-full rounded-lg border-[#e8cece] dark:border-[#422020] dark:bg-[#1a0c0c] focus:ring-primary focus:border-primary text-sm py-3 px-4 pr-12"
                          placeholder="0000 0000 0000 0000"
                        />
                        <div className="absolute right-4 top-1/2 -translate-y-1/2">
                          <span className="material-symbols-outlined text-gray-400 text-lg">credit_card</span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-sm font-semibold text-[#1c0d0d] dark:text-white">
                          Expiry Date
                        </label>
                        <input
                          type="text"
                          value={expiryDate}
                          onChange={(e) => {
                            const formatted = formatExpiryDate(e.target.value);
                            if (formatted.replace(/\D/g, '').length <= 4) {
                              setExpiryDate(formatted);
                            }
                          }}
                          className="w-full rounded-lg border-[#e8cece] dark:border-[#422020] dark:bg-[#1a0c0c] focus:ring-primary focus:border-primary text-sm py-3 px-4 text-center"
                          placeholder="MM / YY"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-sm font-semibold text-[#1c0d0d] dark:text-white">
                          CVV
                        </label>
                        <div className="relative">
                          <input
                            type="password"
                            value={cvv}
                            onChange={(e) => {
                              if (e.target.value.length <= 3) {
                                setCvv(e.target.value);
                              }
                            }}
                            className="w-full rounded-lg border-[#e8cece] dark:border-[#422020] dark:bg-[#1a0c0c] focus:ring-primary focus:border-primary text-sm py-3 px-4 text-center"
                            placeholder="***"
                            maxLength={3}
                          />
                          <span
                            className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm cursor-help"
                            title="3-digit code on the back of your card"
                          >
                            help
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 pt-2">
                      <input
                        type="checkbox"
                        id="save-card"
                        checked={saveCard}
                        onChange={(e) => setSaveCard(e.target.checked)}
                        className="mt-1 rounded border-[#e8cece] text-primary focus:ring-primary"
                      />
                      <label htmlFor="save-card" className="text-sm text-[#9c4949] dark:text-[#cc7a7a]">
                        Save this card for future bookings
                      </label>
                    </div>
                  </>
                )}

                {paymentMethod === 'ewallet' && (
                  <div className="space-y-3">
                    <label className="relative block cursor-pointer group">
                      <input
                        type="radio"
                        name="ewallet_method"
                        value="gopay"
                        className="peer sr-only"
                      />
                      <div className="p-4 flex items-center justify-between bg-white dark:bg-[#1a0c0c] rounded-lg border border-[#e8cece] dark:border-[#422020] peer-checked:border-primary peer-checked:bg-primary/5 hover:border-primary/50 transition-colors">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 flex items-center justify-center">
                            <svg viewBox="0 0 24 24" className="w-8 h-8" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <rect width="24" height="24" rx="4" fill="#00AED6"/>
                              <path d="M8 7h8v2H8V7zm0 4h8v2H8v-2zm0 4h5v2H8v-2z" fill="white"/>
                            </svg>
                          </div>
                          <span className="text-base font-semibold text-[#1c0d0d] dark:text-white">GoPay</span>
                        </div>
                        <div className="w-5 h-5 rounded-full border-2 border-gray-300 peer-checked:border-primary peer-checked:bg-white flex items-center justify-center">
                          <div className="w-2.5 h-2.5 rounded-full bg-primary opacity-0 peer-checked:opacity-100"></div>
                        </div>
                      </div>
                    </label>

                    <label className="relative block cursor-pointer group">
                      <input
                        type="radio"
                        name="ewallet_method"
                        value="ovo"
                        className="peer sr-only"
                      />
                      <div className="p-4 flex items-center justify-between bg-white dark:bg-[#1a0c0c] rounded-lg border border-[#e8cece] dark:border-[#422020] peer-checked:border-primary peer-checked:bg-primary/5 hover:border-primary/50 transition-colors">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 flex items-center justify-center">
                            <svg viewBox="0 0 24 24" className="w-8 h-8" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <rect width="24" height="24" rx="4" fill="#4C3494"/>
                              <circle cx="9" cy="12" r="3" fill="white"/>
                              <circle cx="15" cy="12" r="3" fill="white"/>
                            </svg>
                          </div>
                          <span className="text-base font-semibold text-[#1c0d0d] dark:text-white">OVO</span>
                        </div>
                        <div className="w-5 h-5 rounded-full border-2 border-gray-300 peer-checked:border-primary peer-checked:bg-white flex items-center justify-center">
                          <div className="w-2.5 h-2.5 rounded-full bg-primary opacity-0 peer-checked:opacity-100"></div>
                        </div>
                      </div>
                    </label>

                    <label className="relative block cursor-pointer group">
                      <input
                        type="radio"
                        name="ewallet_method"
                        value="shopeepay"
                        className="peer sr-only"
                      />
                      <div className="p-4 flex items-center justify-between bg-white dark:bg-[#1a0c0c] rounded-lg border border-[#e8cece] dark:border-[#422020] peer-checked:border-primary peer-checked:bg-primary/5 hover:border-primary/50 transition-colors">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 flex items-center justify-center">
                            <svg viewBox="0 0 24 24" className="w-8 h-8" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <rect width="24" height="24" rx="4" fill="#EE4D2D"/>
                              <path d="M7 8h10v2H7V8zm0 4h10v2H7v-2zm0 4h7v2H7v-2z" fill="white"/>
                            </svg>
                          </div>
                          <span className="text-base font-semibold text-[#1c0d0d] dark:text-white">ShopeePay</span>
                        </div>
                        <div className="w-5 h-5 rounded-full border-2 border-gray-300 peer-checked:border-primary peer-checked:bg-white flex items-center justify-center">
                          <div className="w-2.5 h-2.5 rounded-full bg-primary opacity-0 peer-checked:opacity-100"></div>
                        </div>
                      </div>
                    </label>

                    <p className="text-xs text-[#9c4949] dark:text-[#cc7a7a] mt-4">
                      You will be redirected to complete payment in your e-wallet app.
                    </p>
                  </div>
                )}

                {paymentMethod === 'transfer' && (
                  <div className="space-y-4">
                    <div className="bg-primary/5 p-4 rounded-lg border border-primary/10">
                      <p className="text-sm font-semibold mb-2">Bank Transfer Details:</p>
                      <div className="space-y-1 text-sm">
                        <p className="text-[#9c4949] dark:text-[#cc7a7a]">Bank: BCA</p>
                        <p className="text-[#9c4949] dark:text-[#cc7a7a]">Account Number: 1234567890</p>
                        <p className="text-[#9c4949] dark:text-[#cc7a7a]">Account Name: Spark Photo Studio</p>
                      </div>
                    </div>
                    <p className="text-xs text-[#9c4949] dark:text-[#cc7a7a]">
                      Please transfer the exact amount and upload your payment proof after completing the transfer.
                    </p>
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full bg-primary hover:bg-red-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-2 group mt-4"
                >
                  <span className="material-symbols-outlined text-[20px]">lock</span>
                  Pay IDR {total.toLocaleString('id-ID')} Now
                </button>
              </form>

              {/* Payment Logos */}
              <div className="mt-8 flex justify-center items-center gap-6 opacity-40 grayscale hover:grayscale-0 transition-all">
                <img 
                  alt="Visa Logo" 
                  className="h-6"
                  src="https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Visa_Inc._logo.svg/200px-Visa_Inc._logo.svg.png"
                />
                <img 
                  alt="Mastercard Logo" 
                  className="h-6"
                  src="https://upload.wikimedia.org/wikipedia/commons/thumb/2/2a/Mastercard-logo.svg/200px-Mastercard-logo.svg.png"
                />
                <img 
                  alt="Amex Logo" 
                  className="h-6"
                  src="https://upload.wikimedia.org/wikipedia/commons/thumb/f/fa/American_Express_logo_%282018%29.svg/200px-American_Express_logo_%282018%29.svg.png"
                />
                <div className="text-xs font-bold text-gray-600">PCI DSS</div>
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
