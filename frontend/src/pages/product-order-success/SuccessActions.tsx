import { Link } from 'react-router-dom';

export function SuccessActions() {
  return (
    <div className="mt-8 space-y-3">
      <Link
        to="/my-orders"
        className="w-full py-4 bg-primary text-white rounded-full font-bold text-xs tracking-widest uppercase hover:bg-primary-dark transition-colors flex items-center justify-center space-x-2"
      >
        <span>View My Orders</span>
        <span className="material-symbols-outlined text-sm">chevron_right</span>
      </Link>
      <Link
        to="/shop"
        className="w-full py-4 bg-transparent text-gray-600 border border-gray-200 rounded-full font-bold text-xs tracking-widest uppercase hover:bg-gray-50 transition-colors flex items-center justify-center space-x-2"
      >
        <span className="material-symbols-outlined text-sm">arrow_back</span>
        <span>Continue Shopping</span>
      </Link>
    </div>
  );
}
