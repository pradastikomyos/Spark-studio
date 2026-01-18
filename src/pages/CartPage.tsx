import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface CartItem {
  id: number;
  name: string;
  description: string;
  size: string;
  finish: string;
  frame: string;
  price: number;
  quantity: number;
  image: string;
}

interface RecommendedProduct {
  id: number;
  name: string;
  price: number;
  image: string;
}

export default function CartPage() {
  const navigate = useNavigate();

  const [cartItems, setCartItems] = useState<CartItem[]>([
    {
      id: 1,
      name: 'Minimalist Concrete No. 4',
      description: 'Limited Edition Print',
      size: '24 x 36 inches',
      finish: 'Matte Finish',
      frame: 'Black Oak Frame',
      price: 350,
      quantity: 1,
      image: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&h=600&fit=crop'
    },
    {
      id: 2,
      name: 'Shadow Play Series',
      description: 'Fine Art Canvas',
      size: '18 x 24 inches',
      finish: 'Unframed',
      frame: 'Signed',
      price: 180,
      quantity: 1,
      image: 'https://images.unsplash.com/photo-1544967082-d9d25d867d66?w=400&h=600&fit=crop'
    }
  ]);

  const [promoCode, setPromoCode] = useState('');
  const [promoApplied, setPromoApplied] = useState(false);

  const recommendedProducts: RecommendedProduct[] = [
    { id: 3, name: 'Urban Decay III', price: 120, image: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?w=400&h=600&fit=crop' },
    { id: 4, name: 'Silence in Focus', price: 210, image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&h=600&fit=crop' },
    { id: 5, name: 'Tokyo Nights', price: 450, image: 'https://images.unsplash.com/photo-1542051841857-5f90071e7989?w=400&h=600&fit=crop' },
    { id: 6, name: 'Form & Void', price: 195, image: 'https://images.unsplash.com/photo-1557672172-298e090bd0f1?w=400&h=600&fit=crop' }
  ];

  const updateQuantity = (id: number, delta: number) => {
    setCartItems(items =>
      items.map(item =>
        item.id === id
          ? { ...item, quantity: Math.max(1, item.quantity + delta) }
          : item
      )
    );
  };

  const removeItem = (id: number) => {
    setCartItems(items => items.filter(item => item.id !== id));
  };

  const applyPromoCode = () => {
    if (promoCode.trim()) {
      setPromoApplied(true);
      alert('Promo code applied!');
    }
  };

  const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const shipping = subtotal >= 500 ? 0 : 25;
  const taxes = subtotal * 0.08;
  const discount = promoApplied ? subtotal * 0.1 : 0;
  const total = subtotal + shipping + taxes - discount;

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark">

      <main className="flex-grow max-w-7xl mx-auto px-6 lg:px-12 py-16 w-full">
        {/* Header */}
        <header className="mb-16 border-b border-gray-200 dark:border-gray-800 pb-8 flex flex-col md:flex-row justify-between items-start md:items-end">
          <div>
            <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-light mb-4">
              Your Selection
            </h1>
            <p className="text-gray-500 dark:text-gray-400 font-light tracking-wide text-sm uppercase">
              {cartItems.length} Items in Cart — Free shipping on orders over $500
            </p>
          </div>
          <button
            onClick={() => navigate('/shop')}
            className="mt-4 md:mt-0 text-primary hover:text-white hover:bg-primary border border-primary px-6 py-2 text-sm uppercase tracking-widest transition-all duration-300"
          >
            Continue Shopping
          </button>
        </header>

        <div className="flex flex-col lg:flex-row gap-16">
          {/* Cart Items */}
          <div className="lg:w-2/3 space-y-12">
            {cartItems.length === 0 ? (
              <div className="text-center py-16">
                <span className="material-icons-outlined text-6xl text-gray-300 dark:text-gray-700 mb-4">
                  shopping_cart
                </span>
                <p className="text-gray-500 dark:text-gray-400 text-lg mb-6">Your cart is empty</p>
                <button
                  onClick={() => navigate('/shop')}
                  className="bg-primary text-white px-8 py-3 uppercase tracking-widest text-sm hover:bg-red-700 transition-colors"
                >
                  Start Shopping
                </button>
              </div>
            ) : (
              cartItems.map((item) => (
                <div
                  key={item.id}
                  className="group flex flex-col sm:flex-row gap-8 pb-12 border-b border-gray-200 dark:border-gray-800 transition-all duration-300 hover:border-gray-400 dark:hover:border-gray-600"
                >
                  {/* Product Image */}
                  <div className="relative w-full sm:w-48 aspect-[3/4] overflow-hidden bg-gray-100 dark:bg-surface-dark">
                    <img
                      alt={item.name}
                      className="object-cover w-full h-full transition-transform duration-700 group-hover:scale-105"
                      src={item.image}
                    />
                  </div>

                  {/* Product Details */}
                  <div className="flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-display text-2xl font-normal leading-tight">
                          {item.name}
                        </h3>
                        <button
                          onClick={() => removeItem(item.id)}
                          className="text-gray-400 hover:text-primary transition-colors"
                        >
                          <span className="material-icons-outlined">close</span>
                        </button>
                      </div>
                      <p className="text-gray-500 dark:text-gray-400 text-sm tracking-wide mb-4">
                        {item.description} • {item.size}
                      </p>
                      <div className="flex gap-4 text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-6">
                        <span className="px-2 py-1 border border-gray-300 dark:border-gray-700">
                          {item.finish}
                        </span>
                        <span className="px-2 py-1 border border-gray-300 dark:border-gray-700">
                          {item.frame}
                        </span>
                      </div>
                    </div>

                    {/* Quantity and Price */}
                    <div className="flex justify-between items-end">
                      <div className="flex items-center border border-gray-300 dark:border-gray-700">
                        <button
                          onClick={() => updateQuantity(item.id, -1)}
                          className="px-3 py-1 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-gray-500 dark:text-gray-300"
                        >
                          -
                        </button>
                        <span className="px-3 py-1 text-sm font-light">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.id, 1)}
                          className="px-3 py-1 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-gray-500 dark:text-gray-300"
                        >
                          +
                        </button>
                      </div>
                      <span className="font-display text-xl text-primary">
                        ${(item.price * item.quantity).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Order Summary */}
          <div className="lg:w-1/3">
            <div className="sticky top-28 bg-surface-light dark:bg-surface-dark p-8 border border-gray-200 dark:border-gray-700 shadow-xl dark:shadow-none">
              <h2 className="font-display text-2xl mb-8">Order Summary</h2>

              <div className="space-y-4 text-sm font-light mb-8">
                <div className="flex justify-between text-gray-600 dark:text-gray-300">
                  <span>Subtotal</span>
                  <span>${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-gray-600 dark:text-gray-300">
                  <span>Shipping</span>
                  <span className={shipping === 0 ? 'text-primary' : ''}>
                    {shipping === 0 ? 'Free' : `$${shipping.toFixed(2)}`}
                  </span>
                </div>
                <div className="flex justify-between text-gray-600 dark:text-gray-300">
                  <span>Taxes (Estimated)</span>
                  <span>${taxes.toFixed(2)}</span>
                </div>
                {promoApplied && (
                  <div className="flex justify-between text-green-600 dark:text-green-400">
                    <span>Discount (10%)</span>
                    <span>-${discount.toFixed(2)}</span>
                  </div>
                )}
              </div>

              <div className="border-t border-gray-200 dark:border-gray-600 pt-6 mb-8">
                <div className="flex justify-between items-baseline">
                  <span className="uppercase tracking-widest text-sm font-bold">Total</span>
                  <span className="font-display text-3xl text-primary">${total.toFixed(2)}</span>
                </div>
              </div>

              <button
                onClick={() => navigate('/checkout', { state: { cartItems, total } })}
                disabled={cartItems.length === 0}
                className="w-full bg-primary text-white py-4 uppercase tracking-widest text-sm font-bold hover:bg-red-700 transition-colors shadow-lg shadow-red-900/20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Checkout Securely
              </button>

              {/* Payment Methods */}
              <div className="mt-6 flex justify-center space-x-4 opacity-50 grayscale">
                <div className="text-xs font-bold">VISA</div>
                <div className="text-xs font-bold">MC</div>
                <div className="text-xs font-bold">AMEX</div>
                <div className="text-xs font-bold">PayPal</div>
              </div>
            </div>

            {/* Promo Code */}
            <div className="mt-8">
              <details className="group">
                <summary className="flex justify-between items-center cursor-pointer list-none text-sm uppercase tracking-wider font-light hover:text-primary transition-colors">
                  <span>Have a promo code?</span>
                  <span className="transition group-open:rotate-180">
                    <span className="material-icons-outlined text-sm">expand_more</span>
                  </span>
                </summary>
                <div className="text-gray-500 mt-4 group-open:animate-fadeIn">
                  <div className="flex">
                    <input
                      type="text"
                      value={promoCode}
                      onChange={(e) => setPromoCode(e.target.value)}
                      className="w-full bg-transparent border-b border-gray-300 dark:border-gray-600 py-2 focus:outline-none focus:border-primary text-sm"
                      placeholder="Enter code"
                    />
                    <button
                      onClick={applyPromoCode}
                      className="ml-4 text-primary uppercase text-xs font-bold tracking-widest hover:text-red-700 transition-colors"
                    >
                      Apply
                    </button>
                  </div>
                </div>
              </details>
            </div>
          </div>
        </div>

        {/* Recommended Products */}
        <section className="mt-24 pt-16 border-t border-gray-200 dark:border-gray-800">
          <h2 className="font-display text-3xl mb-12 text-center">You Might Also Like</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8">
            {recommendedProducts.map((product) => (
              <div key={product.id} className="group cursor-pointer">
                <div className="aspect-[3/4] bg-gray-100 dark:bg-surface-dark overflow-hidden mb-4 relative">
                  <img
                    alt={product.name}
                    className="object-cover w-full h-full transition-transform duration-500 group-hover:scale-105 opacity-90 group-hover:opacity-100"
                    src={product.image}
                  />
                  <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors duration-300"></div>
                  <button className="absolute bottom-4 right-4 bg-white dark:bg-surface-dark text-black dark:text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 shadow-lg hover:text-primary">
                    <span className="material-icons-outlined text-lg">add_shopping_cart</span>
                  </button>
                </div>
                <h4 className="font-display text-lg">{product.name}</h4>
                <p className="text-primary text-sm font-bold mt-1">${product.price.toFixed(2)}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

    </div>
  );
}
