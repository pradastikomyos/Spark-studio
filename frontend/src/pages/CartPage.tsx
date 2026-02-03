import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../contexts/cartStore';
import { formatCurrency } from '../utils/formatters';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingBag, Trash2, Plus, Minus, ArrowRight, ArrowLeft, CheckSquare, Square } from 'lucide-react';

export default function CartPage() {
  const navigate = useNavigate();
  const { items, setQuantity, removeItem } = useCart();
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());

  // Initialize selection with all items on load
  useEffect(() => {
    // Only set if we haven't set it yet (to avoid resetting on every render if we didn't want to)
    // But actually, for a simple implementation, let's just make sure we capture new items? 
    // Or just default to all if empty and items exist.
    // Let's use a simpler approach: If items change length, we might want to preserve selection or select new ones.
    // For now, let's just default to ALL selected on first load.
    if (selectedItems.size === 0 && items.length > 0) {
      setSelectedItems(new Set(items.map((i) => i.variantId)));
    }
  }, [items.length]); // Dependency on length so if items are added we might re-evaluate? Ideally we typically select new items.

  const toggleSelection = (id: number) => {
    const newSet = new Set(selectedItems);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedItems(newSet);
  };

  const toggleAll = () => {
    if (selectedItems.size === items.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(items.map((i) => i.variantId)));
    }
  };

  const selectedSubtotal = useMemo(() => {
    return items
      .filter((i) => selectedItems.has(i.variantId))
      .reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
  }, [items, selectedItems]);

  const selectedCount = selectedItems.size;

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <main className="max-w-7xl mx-auto px-6 lg:px-12 py-12 w-full">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12 flex flex-col items-center justify-center text-center space-y-4"
        >
          <h1 className="font-serif text-5xl md:text-6xl text-gray-900 tracking-tight">
            Shopping Bag
          </h1>
          <div className="flex items-center gap-2 text-sm uppercase tracking-widest text-[#e63d75] font-medium">
            <span>{items.length} Items</span>
            <span className="w-1 h-1 rounded-full bg-[#e63d75]" />
            <span>{selectedCount} Selected</span>
          </div>
        </motion.div>

        <div className="flex flex-col lg:flex-row gap-12 lg:gap-20">
          {/* Cart Items */}
          <div className="flex-1 space-y-6">
            {items.length > 0 && (
              <div className="flex items-center gap-3 mb-4 px-4">
                <button
                  onClick={toggleAll}
                  className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors"
                >
                  {selectedItems.size === items.length ? (
                    <CheckSquare className="w-5 h-5 text-[#e63d75]" />
                  ) : (
                    <Square className="w-5 h-5" />
                  )}
                  Select All
                </button>
              </div>
            )}

            <AnimatePresence mode="popLayout">
              {items.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="bg-white rounded-2xl border border-gray-100 p-12 text-center shadow-sm"
                >
                  <div className="w-20 h-20 bg-pink-50 rounded-full flex items-center justify-center mx-auto mb-6">
                    <ShoppingBag className="w-10 h-10 text-[#e63d75]" />
                  </div>
                  <h3 className="font-serif text-2xl mb-3 text-gray-900">Your bag is empty</h3>
                  <p className="text-gray-500 mb-8 max-w-md mx-auto">
                    Looks like you haven't added anything to your cart yet. Explore our collections to find something you love.
                  </p>
                  <button
                    onClick={() => navigate('/shop')}
                    className="inline-flex items-center gap-2 bg-[#e63d75] text-white px-8 py-3 rounded-full text-sm font-bold uppercase tracking-widest hover:bg-[#cc2f64] transition-all shadow-lg shadow-pink-200"
                  >
                    Start Shopping
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </motion.div>
              ) : (
                items.map((item) => (
                  <motion.div
                    key={item.variantId}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className={`group bg-white p-4 rounded-2xl border shadow-sm hover:shadow-md transition-all duration-300 flex gap-6 ${selectedItems.has(item.variantId) ? 'border-[#e63d75]/30 ring-1 ring-[#e63d75]/30' : 'border-gray-100'}`}
                  >
                    {/* Checkbox */}
                    <div className="flex items-center">
                      <button
                        onClick={() => toggleSelection(item.variantId)}
                        className="text-gray-400 hover:text-[#e63d75] transition-colors"
                      >
                        {selectedItems.has(item.variantId) ? (
                          <CheckSquare className="w-6 h-6 text-[#e63d75]" />
                        ) : (
                          <Square className="w-6 h-6" />
                        )}
                      </button>
                    </div>

                    {/* Image */}
                    <div className="relative w-28 h-36 flex-shrink-0 bg-gray-50 rounded-xl overflow-hidden">
                      {item.productImageUrl ? (
                        <img
                          alt={item.productName}
                          src={item.productImageUrl}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-300">
                          <ShoppingBag className="w-8 h-8" />
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 flex flex-col justify-between py-1">
                      <div className="flex justify-between items-start gap-4">
                        <div>
                          <h3 className="font-serif text-xl text-gray-900 leading-tight mb-1">
                            {item.productName}
                          </h3>
                          <p className="text-sm text-gray-500 font-medium">
                            {item.variantName}
                          </p>
                        </div>
                        <button
                          onClick={() => removeItem(item.variantId)}
                          className="text-gray-400 hover:text-red-500 hover:bg-red-50 p-2 rounded-full transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="flex items-end justify-between">
                        {/* Quantity */}
                        <div className="flex items-center gap-3 bg-gray-50 rounded-full px-3 py-1.5 border border-gray-100">
                          <button
                            onClick={() => setQuantity(item.variantId, item.quantity - 1)}
                            className="w-6 h-6 flex items-center justify-center text-gray-500 hover:text-[#e63d75] transition-colors"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="text-sm font-semibold w-6 text-center text-gray-900">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => setQuantity(item.variantId, item.quantity + 1)}
                            className="w-6 h-6 flex items-center justify-center text-gray-500 hover:text-[#e63d75] transition-colors"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>

                        {/* Price */}
                        <div className="text-right">
                          <p className="text-xs text-gray-400 uppercase tracking-wider mb-0.5">Total</p>
                          <p className="font-serif text-lg text-[#e63d75] font-medium">
                            {formatCurrency(item.unitPrice * item.quantity)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </AnimatePresence>
          </div>

          {/* Summary Sidebar */}
          <div className="lg:w-[400px]">
            <div className="sticky top-32">
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-white p-8 rounded-3xl border border-gray-100 shadow-xl shadow-pink-500/5 overflow-hidden relative"
              >
                {/* Decoration */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-pink-50 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />

                <h2 className="font-serif text-2xl text-gray-900 mb-8 relative">Order Summary</h2>

                <div className="space-y-4 mb-8 text-sm relative">
                  <div className="flex justify-between text-gray-600">
                    <span>Subtotal</span>
                    <span className="font-medium text-gray-900">{formatCurrency(selectedSubtotal)}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Tax (Included)</span>
                    <span className="font-medium text-gray-900">-</span>
                  </div>
                  <div className="border-t border-dashed border-gray-200 pt-4 mt-6 flex justify-between items-baseline">
                    <span className="font-medium text-lg text-gray-900">Total</span>
                    <span className="font-serif text-2xl text-[#e63d75]">{formatCurrency(selectedSubtotal)}</span>
                  </div>
                </div>

                <div className="space-y-3 relative">
                  <button
                    onClick={() => navigate('/checkout/product', { state: { selectedVariantIds: Array.from(selectedItems) } })}
                    disabled={selectedCount === 0}
                    className="w-full bg-[#e63d75] text-white py-4 rounded-xl uppercase tracking-widest text-sm font-bold shadow-lg shadow-pink-200 hover:bg-[#cc2f64] hover:shadow-pink-300 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed group flex items-center justify-center gap-2"
                  >
                    Checkout ({selectedCount})
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </button>

                  <button
                    onClick={() => navigate('/shop')}
                    className="w-full py-4 text-xs font-bold text-gray-500 hover:text-gray-900 uppercase tracking-widest transition-colors flex items-center justify-center gap-2"
                  >
                    <ArrowLeft className="w-3 h-3" />
                    Continue Shopping
                  </button>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
