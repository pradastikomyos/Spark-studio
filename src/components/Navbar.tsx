import { Link, useNavigate } from 'react-router-dom';
import Logo from './Logo';
import { useAuth } from '../contexts/AuthContext';
import { useTicketCount } from '../hooks/useTicketCount';
import { useCart } from '../contexts/cartStore';

interface NavbarProps {
  isDark: boolean;
  onToggleDarkMode: () => void;
}

const Navbar = ({ isDark, onToggleDarkMode }: NavbarProps) => {
  const { user, signOut, isAdmin, loggingOut } = useAuth();
  const { count: ticketCount } = useTicketCount();
  const { totalQuantity } = useCart();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    if (loggingOut) return; // Prevent double-click
    const { error } = await signOut();
    if (!error) {
      navigate('/login');
    }
  };

  return (
    <nav className="fixed top-0 w-full z-50 bg-background-light/95 dark:bg-background-dark/95 backdrop-blur-md border-b border-gray-100 dark:border-white/10 transition-all duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-24">
          <Link to="/" className="flex-shrink-0 flex items-center relative group cursor-pointer">
            <Logo isDark={isDark} />
          </Link>
          <div className="hidden md:flex items-center space-x-10">
            <Link
              to="/"
              className="text-xs uppercase tracking-widest font-medium hover:text-primary transition-colors relative after:content-[''] after:absolute after:-bottom-1 after:left-0 after:w-0 after:h-px after:bg-primary hover:after:w-full after:transition-all"
            >
              Home
            </Link>
            <Link
              to="/on-stage"
              className="text-xs uppercase tracking-widest font-medium hover:text-primary transition-colors relative after:content-[''] after:absolute after:-bottom-1 after:left-0 after:w-0 after:h-px after:bg-primary hover:after:w-full after:transition-all"
            >
              On Stage
            </Link>
            <Link
              to="/events"
              className="text-xs uppercase tracking-widest font-medium hover:text-primary transition-colors relative after:content-[''] after:absolute after:-bottom-1 after:left-0 after:w-0 after:h-px after:bg-primary hover:after:w-full after:transition-all"
            >
              Events
            </Link>
            <Link
              to="/shop"
              className="text-xs uppercase tracking-widest font-medium hover:text-primary transition-colors relative after:content-[''] after:absolute after:-bottom-1 after:left-0 after:w-0 after:h-px after:bg-primary hover:after:w-full after:transition-all"
            >
              Shop
            </Link>
            <a className="text-xs uppercase tracking-widest font-bold text-primary hover:text-primary-dark transition-colors border border-primary/20 px-4 py-2 rounded-full hover:bg-primary hover:text-white" href="#">
              Spark Club
            </a>
          </div>
          <div className="flex items-center space-x-6 text-gray-500 dark:text-gray-400">
            {user ? (
              <>
                <div className="text-xs text-text-light dark:text-text-dark hidden md:block">
                  {user.email}
                </div>
                {isAdmin && (
                  <Link 
                    to="/admin/dashboard" 
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all duration-200 border border-primary/20 hover:border-primary"
                  >
                    <span className="material-symbols-outlined text-[18px]">dashboard</span>
                    <span className="text-xs font-bold uppercase tracking-wider hidden lg:block">Dashboard</span>
                  </Link>
                )}
                <button 
                  onClick={handleSignOut} 
                  disabled={loggingOut}
                  className={`hover:text-primary transition-colors ${loggingOut ? 'opacity-50 cursor-not-allowed' : ''}`} 
                  title="Sign Out"
                >
                  <span className={`material-symbols-outlined text-[20px] ${loggingOut ? 'animate-spin' : ''}`}>
                    {loggingOut ? 'progress_activity' : 'logout'}
                  </span>
                </button>
              </>
            ) : (
              <Link to="/login" className="hover:text-primary transition-colors" title="Sign In">
                <span className="material-symbols-outlined text-[20px]">person</span>
              </Link>
            )}
            <Link to="/my-tickets" className="hover:text-primary transition-colors relative" title="My Tickets">
              <span className="material-symbols-outlined text-[20px]">confirmation_number</span>
              {ticketCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-primary text-white text-[10px] w-4 h-4 flex items-center justify-center rounded-full">
                  {ticketCount}
                </span>
              )}
            </Link>
            <Link to="/my-orders" className="hover:text-primary transition-colors relative" title="My Orders">
              <span className="material-symbols-outlined text-[20px]">receipt_long</span>
            </Link>
            <Link to="/cart" className="hover:text-primary transition-colors relative" title="Shopping Cart">
              <span className="material-symbols-outlined text-[20px]">shopping_bag</span>
              {totalQuantity > 0 && (
                <span className="absolute -top-1 -right-1 bg-primary text-white text-[10px] w-4 h-4 flex items-center justify-center rounded-full">
                  {totalQuantity}
                </span>
              )}
            </Link>
            <button className="hover:text-primary transition-colors" title="Search">
              <span className="material-symbols-outlined text-[20px]">search</span>
            </button>
            <button
              onClick={onToggleDarkMode}
              className="hover:text-primary transition-colors"
              aria-label="Toggle dark mode"
            >
              {isDark ? (
                <span className="material-symbols-outlined text-[20px]">light_mode</span>
              ) : (
                <span className="material-symbols-outlined text-[20px]">dark_mode</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
