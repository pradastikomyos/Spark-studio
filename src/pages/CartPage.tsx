import { useNavigate } from 'react-router-dom';
import { useCart } from '../contexts/cartStore';

export default function CartPage() {
  const navigate = useNavigate();
  const { items, subtotal, setQuantity, removeItem, clear } = useCart();

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark">
      <main className="flex-grow max-w-7xl mx-auto px-6 lg:px-12 py-16 w-full">
        <header className="mb-16 border-b border-gray-200 dark:border-gray-800 pb-8 flex flex-col md:flex-row justify-between items-start md:items-end">
          <div>
            <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-light mb-4">Your Selection</h1>
            <p className="text-gray-500 dark:text-gray-400 font-light tracking-wide text-sm uppercase">{items.length} Items in Cart</p>
          </div>
          <button
            onClick={() => navigate('/shop')}
            className="mt-4 md:mt-0 text-primary hover:text-white hover:bg-primary border border-primary px-6 py-2 text-sm uppercase tracking-widest transition-all duration-300"
          >
            Continue Shopping
          </button>
        </header>

        <div className="flex flex-col lg:flex-row gap-16">
          <div className="lg:w-2/3 space-y-12">
            {items.length === 0 ? (
              <div className="text-center py-16">
                <span className="material-icons-outlined text-6xl text-gray-300 dark:text-gray-700 mb-4">shopping_cart</span>
                <p className="text-gray-500 dark:text-gray-400 text-lg mb-6">Your cart is empty</p>
                <button
                  onClick={() => navigate('/shop')}
                  className="bg-primary text-white px-8 py-3 uppercase tracking-widest text-sm hover:bg-red-700 transition-colors"
                >
                  Start Shopping
                </button>
              </div>
            ) : (
              items.map((item) => (
                <div
                  key={item.variantId}
                  className="group flex flex-col sm:flex-row gap-8 pb-12 border-b border-gray-200 dark:border-gray-800 transition-all duration-300 hover:border-gray-400 dark:hover:border-gray-600"
                >
                  <div className="relative w-full sm:w-48 aspect-[3/4] overflow-hidden bg-gray-100 dark:bg-surface-dark">
                    {item.productImageUrl ? (
                      <img
                        alt={item.productName}
                        className="object-cover w-full h-full transition-transform duration-700 group-hover:scale-105"
                        src={item.productImageUrl}
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-300 dark:text-gray-600">
                        <span className="material-symbols-outlined text-6xl">inventory_2</span>
                      </div>
                    )}
                  </div>

                  <div className="flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-display text-2xl font-normal leading-tight">{item.productName}</h3>
                        <button onClick={() => removeItem(item.variantId)} className="text-gray-400 hover:text-primary transition-colors">
                          <span className="material-icons-outlined">close</span>
                        </button>
                      </div>
                      <p className="text-gray-500 dark:text-gray-400 text-sm tracking-wide mb-6">{item.variantName}</p>
                    </div>

                    <div className="flex justify-between items-end">
                      <div className="flex items-center border border-gray-300 dark:border-gray-700">
                        <button
                          onClick={() => setQuantity(item.variantId, item.quantity - 1)}
                          className="px-3 py-1 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-gray-500 dark:text-gray-300"
                        >
                          -
                        </button>
                        <span className="px-3 py-1 text-sm font-light">{item.quantity}</span>
                        <button
                          onClick={() => setQuantity(item.variantId, item.quantity + 1)}
                          className="px-3 py-1 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-gray-500 dark:text-gray-300"
                        >
                          +
                        </button>
                      </div>
                      <span className="font-display text-xl text-primary">${(item.unitPrice * item.quantity).toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="lg:w-1/3">
            <div className="sticky top-28 bg-surface-light dark:bg-surface-dark p-8 border border-gray-200 dark:border-gray-700 shadow-xl dark:shadow-none">
              <h2 className="font-display text-2xl mb-8">Order Summary</h2>

              <div className="space-y-4 text-sm font-light mb-8">
                <div className="flex justify-between text-gray-600 dark:text-gray-300">
                  <span>Subtotal</span>
                  <span>${subtotal.toFixed(2)}</span>
                </div>
                <div className="border-t border-gray-300 dark:border-gray-600 pt-4 flex justify-between font-normal">
                  <span>Total</span>
                  <span className="font-display text-lg text-primary">${subtotal.toFixed(2)}</span>
                </div>
              </div>

              <button
                onClick={() => navigate('/checkout/product')}
                disabled={items.length === 0}
                className="w-full bg-primary text-white py-4 uppercase tracking-widest text-sm font-bold hover:bg-red-700 transition-colors shadow-lg shadow-red-900/20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Checkout Securely
              </button>

              <button
                onClick={() => clear()}
                disabled={items.length === 0}
                className="mt-4 w-full border border-gray-200 dark:border-gray-700 py-3 uppercase tracking-widest text-xs font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Clear Cart
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
