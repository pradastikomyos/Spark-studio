import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Logo from './Logo';
import LanguageSwitcher from './LanguageSwitcher';
import { useAuth } from '../contexts/AuthContext';
import { useTicketCount } from '../hooks/useTicketCount';
import { useCart } from '../contexts/cartStore';
import { getUserDisplayName } from '../utils/auth';

interface NavbarProps {
  isDark: boolean;
  onToggleDarkMode: () => void;
}

const Navbar = ({ isDark, onToggleDarkMode }: NavbarProps) => {
  const { t } = useTranslation();
  const { user, signOut, isAdmin, loggingOut } = useAuth();
  const { count: ticketCount } = useTicketCount();
  const { totalQuantity } = useCart();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSignOut = async () => {
    if (loggingOut) return;
    const { error } = await signOut();
    if (!error) {
      navigate('/login');
      setMobileMenuOpen(false);
    }
  };

  const closeMobileMenu = () => setMobileMenuOpen(false);

  return (
    <nav className="fixed top-0 w-full z-50 bg-background-light/95 dark:bg-background-dark/95 backdrop-blur-md border-b border-gray-100 dark:border-white/10 transition-all duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16 md:h-24">
          {/* Logo */}
          <Link to="/" className="flex-shrink-0 flex items-center relative group cursor-pointer" onClick={closeMobileMenu}>
            <Logo isDark={isDark} />
          </Link>

          {/* Desktop Navigation Links */}
          <div className="hidden md:flex items-center space-x-10">
            <Link
              to="/"
              className="text-xs uppercase tracking-widest font-medium hover:text-primary transition-colors relative after:content-[''] after:absolute after:-bottom-1 after:left-0 after:w-0 after:h-px after:bg-primary hover:after:w-full after:transition-all"
            >
              {t('nav.home')}
            </Link>
            <Link
              to="/on-stage"
              className="text-xs uppercase tracking-widest font-medium hover:text-primary transition-colors relative after:content-[''] after:absolute after:-bottom-1 after:left-0 after:w-0 after:h-px after:bg-primary hover:after:w-full after:transition-all"
            >
              {t('nav.onStage')}
            </Link>
            <Link
              to="/events"
              className="text-xs uppercase tracking-widest font-medium hover:text-primary transition-colors relative after:content-[''] after:absolute after:-bottom-1 after:left-0 after:w-0 after:h-px after:bg-primary hover:after:w-full after:transition-all"
            >
              {t('nav.events')}
            </Link>
            <Link
              to="/shop"
              className="text-xs uppercase tracking-widest font-medium hover:text-primary transition-colors relative after:content-[''] after:absolute after:-bottom-1 after:left-0 after:w-0 after:h-px after:bg-primary hover:after:w-full after:transition-all"
            >
              {t('nav.shop')}
            </Link>
            <a className="text-xs uppercase tracking-widest font-bold text-primary hover:text-primary-dark transition-colors border border-primary/20 px-4 py-2 rounded-full hover:bg-primary hover:text-white" href="#">
              {t('nav.sparkClub')}
            </a>
          </div>

          {/* Desktop Icons */}
          <div className="hidden md:flex items-center space-x-6 text-gray-500 dark:text-gray-400">
            {user ? (
              <>
                <div className="text-xs text-text-light dark:text-text-dark">
                  {getUserDisplayName(user)}
                </div>
                {isAdmin && (
                  <Link
                    to="/admin/dashboard"
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all duration-200 border border-primary/20 hover:border-primary"
                  >
                    <span className="material-symbols-outlined text-[18px]">dashboard</span>
                    <span className="text-xs font-bold uppercase tracking-wider hidden lg:block">{t('nav.dashboard')}</span>
                  </Link>
                )}
                <button
                  onClick={handleSignOut}
                  disabled={loggingOut}
                  className={`hover:text-primary transition-colors ${loggingOut ? 'opacity-50 cursor-not-allowed' : ''}`}
                  title={t('auth.signOut')}
                >
                  <span className={`material-symbols-outlined text-[20px] ${loggingOut ? 'animate-spin' : ''}`}>
                    {loggingOut ? 'progress_activity' : 'logout'}
                  </span>
                </button>
              </>
            ) : (
              <Link to="/login" className="hover:text-primary transition-colors" title={t('auth.signIn')}>
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
            <LanguageSwitcher />
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

          {/* Mobile: Cart + Hamburger */}
          <div className="flex md:hidden items-center gap-4 text-gray-500 dark:text-gray-400">
            {/* Cart with badge - always visible on mobile */}
            <Link to="/cart" className="hover:text-primary transition-colors relative" title="Shopping Cart" onClick={closeMobileMenu}>
              <span className="material-symbols-outlined text-[22px]">shopping_bag</span>
              {totalQuantity > 0 && (
                <span className="absolute -top-1 -right-1 bg-primary text-white text-[10px] w-4 h-4 flex items-center justify-center rounded-full">
                  {totalQuantity}
                </span>
              )}
            </Link>

            {/* Hamburger Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 hover:text-primary transition-colors"
              aria-label="Toggle mobile menu"
            >
              <span className="material-symbols-outlined text-[24px]">
                {mobileMenuOpen ? 'close' : 'menu'}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={closeMobileMenu}
        />
      )}

      {/* Mobile Menu Drawer */}
      <div className={`fixed top-16 right-0 h-[calc(100vh-4rem)] w-72 bg-background-light dark:bg-background-dark z-50 transform transition-transform duration-300 ease-out md:hidden border-l border-gray-100 dark:border-white/10 overflow-y-auto ${mobileMenuOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="p-6 space-y-6">
          {/* User Info */}
          {user && (
            <div className="pb-4 border-b border-gray-100 dark:border-white/10">
              <p className="text-sm font-medium text-text-light dark:text-text-dark">
                {getUserDisplayName(user)}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {user.email}
              </p>
            </div>
          )}

          {/* Navigation Links */}
          <div className="space-y-4">
            <Link
              to="/"
              onClick={closeMobileMenu}
              className="block text-sm uppercase tracking-widest font-medium hover:text-primary transition-colors py-2"
            >
              {t('nav.home')}
            </Link>
            <Link
              to="/on-stage"
              onClick={closeMobileMenu}
              className="block text-sm uppercase tracking-widest font-medium hover:text-primary transition-colors py-2"
            >
              {t('nav.onStage')}
            </Link>
            <Link
              to="/events"
              onClick={closeMobileMenu}
              className="block text-sm uppercase tracking-widest font-medium hover:text-primary transition-colors py-2"
            >
              {t('nav.events')}
            </Link>
            <Link
              to="/shop"
              onClick={closeMobileMenu}
              className="block text-sm uppercase tracking-widest font-medium hover:text-primary transition-colors py-2"
            >
              {t('nav.shop')}
            </Link>
            <a
              href="#"
              onClick={closeMobileMenu}
              className="block text-sm uppercase tracking-widest font-bold text-primary hover:text-primary-dark transition-colors py-2"
            >
              {t('nav.sparkClub')}
            </a>
          </div>

          {/* Divider */}
          <div className="border-t border-gray-100 dark:border-white/10" />

          {/* Quick Access */}
          <div className="space-y-3">
            <Link
              to="/my-tickets"
              onClick={closeMobileMenu}
              className="flex items-center gap-3 py-2 text-sm hover:text-primary transition-colors"
            >
              <span className="material-symbols-outlined text-[20px]">confirmation_number</span>
              <span>My Tickets</span>
              {ticketCount > 0 && (
                <span className="ml-auto bg-primary text-white text-[10px] px-2 py-0.5 rounded-full">
                  {ticketCount}
                </span>
              )}
            </Link>
            <Link
              to="/my-orders"
              onClick={closeMobileMenu}
              className="flex items-center gap-3 py-2 text-sm hover:text-primary transition-colors"
            >
              <span className="material-symbols-outlined text-[20px]">receipt_long</span>
              <span>My Orders</span>
            </Link>
            {isAdmin && (
              <Link
                to="/admin/dashboard"
                onClick={closeMobileMenu}
                className="flex items-center gap-3 py-2 text-sm text-primary font-medium hover:text-primary-dark transition-colors"
              >
                <span className="material-symbols-outlined text-[20px]">dashboard</span>
                <span>{t('nav.dashboard')}</span>
              </Link>
            )}
          </div>

          {/* Divider */}
          <div className="border-t border-gray-100 dark:border-white/10" />

          {/* Settings Row */}
          <div className="flex items-center justify-between">
            <LanguageSwitcher />
            <button
              onClick={onToggleDarkMode}
              className="p-2 hover:text-primary transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-white/5"
              aria-label="Toggle dark mode"
            >
              {isDark ? (
                <span className="material-symbols-outlined text-[20px]">light_mode</span>
              ) : (
                <span className="material-symbols-outlined text-[20px]">dark_mode</span>
              )}
            </button>
          </div>

          {/* Login/Logout Button */}
          <div className="pt-4 border-t border-gray-100 dark:border-white/10">
            {user ? (
              <button
                onClick={handleSignOut}
                disabled={loggingOut}
                className="w-full flex items-center justify-center gap-2 py-3 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-lg transition-colors disabled:opacity-50"
              >
                <span className={`material-symbols-outlined text-[20px] ${loggingOut ? 'animate-spin' : ''}`}>
                  {loggingOut ? 'progress_activity' : 'logout'}
                </span>
                <span>{t('auth.signOut')}</span>
              </button>
            ) : (
              <Link
                to="/login"
                onClick={closeMobileMenu}
                className="w-full flex items-center justify-center gap-2 py-3 text-sm font-medium bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
              >
                <span className="material-symbols-outlined text-[20px]">person</span>
                <span>{t('auth.signIn')}</span>
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
