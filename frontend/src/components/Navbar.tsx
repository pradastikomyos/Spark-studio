import { useEffect, useState, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LogOut, ReceiptText, Search, ShoppingBag, Ticket, UserRound, X } from 'lucide-react';
import Logo from './Logo';
import LanguageSwitcher from './LanguageSwitcher';
import { useAuth } from '../contexts/AuthContext';
import { useTicketCount } from '../hooks/useTicketCount';
import { useCart } from '../contexts/cartStore';
import { getUserDisplayName } from '../utils/auth';

const Navbar = () => {
  const { t } = useTranslation();
  const { user, signOut, isAdmin, loggingOut } = useAuth();
  const { count: ticketCount } = useTicketCount();
  const { totalQuantity } = useCart();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const navItemsRef = useRef<(HTMLAnchorElement | null)[]>([]);
  const [starPosition, setStarPosition] = useState(0);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const activeNavKey = (() => {
    const path = location.pathname;
    const params = new URLSearchParams(location.search);
    const category = (params.get('category') || '').toLowerCase();

    if (path === '/') return 'on-stage';
    if (path.startsWith('/on-stage')) return 'on-stage';
    if (path.startsWith('/events')) return 'event';
    if (path.startsWith('/fashion')) return 'fashion';
    if (path.startsWith('/beauty')) return 'beauty';
    if (path.startsWith('/shop')) {
      if (category === 'fashion') return 'fashion';
      if (category === 'beauty') return 'beauty';
      return 'shop';
    }
    if (path.startsWith('/spark-club')) return 'spark-club';
    if (path.startsWith('/news')) return 'news';
    return '';
  })();

  const navItems = [
    { key: 'on-stage', label: 'ON STAGE', to: '/on-stage' },
    { key: 'event', label: 'EVENT', to: '/events' },
    { key: 'fashion', label: 'FASHION', to: '/fashion' },
    { key: 'beauty', label: 'BEAUTY', to: '/beauty' },
    { key: 'spark-club', label: 'SPARK CLUB', to: '/spark-club' },
    { key: 'news', label: 'NEWS', to: '/news' },
  ] as const;

  const activeIndex = Math.max(0, navItems.findIndex((i) => i.key === activeNavKey));

  // Calculate star position based on active nav item
  useEffect(() => {
    const activeItem = navItemsRef.current[activeIndex];
    if (activeItem) {
      const left = activeItem.offsetLeft + (activeItem.offsetWidth / 2) - 14; // 14px = half of star width (28px)
      setStarPosition(left);
    }
  }, [activeIndex]);

  const closeMobileMenu = () => setMobileMenuOpen(false);

  const handleSignOutClick = () => {
    setShowLogoutConfirm(true);
  };

  const handleSignOutConfirm = async () => {
    if (loggingOut) return;
    setShowLogoutConfirm(false);
    const { error } = await signOut();
    if (!error) {
      navigate('/login');
      setMobileMenuOpen(false);
    }
  };

  const handleSignOutCancel = () => {
    setShowLogoutConfirm(false);
  };

  return (
    <nav className={`w-full z-50 bg-white border-b border-gray-300 transition-shadow ${scrolled ? 'shadow-sm' : ''}`.trim()}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between py-3 md:py-4">
          <div className="hidden md:flex items-center gap-3 w-1/3">
            <LanguageSwitcher />
          </div>

          <div className="w-full md:w-1/3 text-center">
            <Link to="/" className="inline-flex items-center justify-center" onClick={closeMobileMenu} aria-label="Home">
              <Logo className="text-3xl md:text-5xl" />
            </Link>
          </div>

          <div className="w-full md:w-1/3 flex items-center justify-end gap-4">
            {user ? (
              <div className="hidden md:flex items-center gap-5">
                <span className="text-sm font-medium text-gray-900">
                  {getUserDisplayName(user)}
                </span>

                {isAdmin && (
                  <Link
                    to="/admin/dashboard"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold uppercase tracking-wider bg-[#ff4b86] text-white rounded-md hover:bg-[#e63d75] transition-colors shadow-sm"
                    title="Admin Dashboard"
                  >
                    <span className="material-symbols-outlined text-sm">dashboard</span>
                    Dashboard
                  </Link>
                )}

                <button
                  onClick={handleSignOutClick}
                  disabled={loggingOut}
                  className="text-gray-500 hover:text-primary transition-colors"
                  title={t('auth.signOut')}
                >
                  <LogOut className="h-5 w-5" />
                </button>

                <Link
                  to="/my-tickets"
                  className="text-gray-500 hover:text-main-600 transition-colors"
                  title={t('nav.myTickets')}
                >
                  <Ticket className="h-5 w-5" />
                </Link>

                <Link
                  to="/my-orders"
                  className="text-gray-500 hover:text-main-600 transition-colors"
                  title={t('nav.myOrders')}
                >
                  <ReceiptText className="h-5 w-5" />
                </Link>

                <Link to="/cart" className="relative text-gray-500 hover:text-main-600 transition-colors" aria-label={t('nav.cart')}>
                  <ShoppingBag className="h-5 w-5" />
                  {totalQuantity > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 bg-main-600 text-white text-[10px] w-4 h-4 flex items-center justify-center rounded-full">
                      {totalQuantity}
                    </span>
                  )}
                </Link>

                <button aria-label={t('nav.search')} className="text-gray-500 hover:text-main-600 transition-colors" type="button">
                  <Search className="h-5 w-5" />
                </button>
              </div>
            ) : (
              <div className="hidden md:flex items-center gap-4">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-bold uppercase tracking-widest bg-main-600 text-white rounded-md hover:bg-main-700 transition-colors shadow-sm"
                >
                  <UserRound className="h-4 w-4" />
                  {t('auth.signIn')}
                </Link>

                <Link to="/cart" className="relative p-2 text-gray-700 hover:text-main-600 transition-colors" aria-label={t('nav.cart')}>
                  <ShoppingBag className="h-5 w-5" />
                  {totalQuantity > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 bg-main-600 text-white text-[10px] w-4 h-4 flex items-center justify-center rounded-full">
                      {totalQuantity}
                    </span>
                  )}
                </Link>

                <button aria-label={t('nav.search')} className="p-2 text-gray-700 hover:text-main-600 transition-colors" type="button">
                  <Search className="h-5 w-5" />
                </button>
              </div>
            )}

            <div className="md:hidden flex items-center gap-3">
              <Link to="/cart" className="relative p-2 text-gray-700 active:text-main-600" aria-label={t('nav.cart')} onClick={closeMobileMenu}>
                <ShoppingBag className="h-6 w-6" />
                {totalQuantity > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 bg-main-600 text-white text-[10px] w-4 h-4 flex items-center justify-center rounded-full">
                    {totalQuantity}
                  </span>
                )}
              </Link>
              <button
                onClick={() => setMobileMenuOpen((v) => !v)}
                className="px-4 py-2.5 rounded-md border border-gray-300 text-xs font-black uppercase tracking-widest text-gray-900 active:bg-gray-50 min-w-[70px]"
                aria-label="Toggle mobile menu"
                type="button"
              >
                {mobileMenuOpen ? 'Close' : 'Menu'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-gray-300" />

      <div className="hidden md:block">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="relative py-6">
            {/* Large star background behind active nav item */}
            <div
              className="absolute transition-all duration-300 ease-out pointer-events-none"
              style={{
                left: `${starPosition}px`,
                top: '50%',
                transform: 'translate(-50%, -50%)',
                width: '120px',
                height: '120px',
                zIndex: 0
              }}
            >
              <svg viewBox="0 0 100 100" className="w-full h-full">
                <path
                  d="M50 6 L61 36 L94 36 L66 54 L76 84 L50 66 L24 84 L34 54 L6 36 L39 36 Z"
                  fill="#ff4b86"
                />
              </svg>
            </div>

            {/* Navigation items */}
            <div className="flex justify-evenly items-center relative z-10">
              {navItems.map((item, idx) => {
                const isActive = idx === activeIndex;

                return (
                  <Link
                    key={item.key}
                    ref={(el) => (navItemsRef.current[idx] = el)}
                    to={item.to}
                    className={`text-sm font-semibold uppercase px-4 py-2 transition-colors ${isActive ? 'text-white' : 'text-gray-600 hover:text-gray-900'
                      }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>
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
      <div className={`fixed top-0 right-0 h-full w-80 bg-white z-50 transform transition-transform duration-300 ease-out md:hidden border-l border-gray-100 overflow-y-auto ${mobileMenuOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="p-6 space-y-6">
          {/* Close button for mobile */}
          <button
            onClick={closeMobileMenu}
            className="absolute top-4 right-4 p-2 text-gray-500 hover:text-gray-900 active:bg-gray-100 rounded-lg"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>

          {/* Language Switcher - Top Priority on Mobile */}
          <div className="pt-2 pb-4 border-b border-gray-100 pr-10">
            <LanguageSwitcher />
          </div>

          {user && (
            <div className="pb-4 border-b border-gray-100 pr-10">
              <p className="text-sm font-black uppercase tracking-widest text-gray-900">{getUserDisplayName(user)}</p>
              <p className="text-xs text-gray-500 mt-1 break-all">{user.email}</p>
            </div>
          )}

          <div className="space-y-2">
            <Link
              to="/on-stage"
              onClick={closeMobileMenu}
              className="block text-sm uppercase tracking-widest font-bold text-gray-900 active:text-main-600 py-3 px-2 active:bg-gray-50 rounded-lg transition-colors"
            >
              {t('nav.onStage')}
            </Link>
            <Link
              to="/events"
              onClick={closeMobileMenu}
              className="block text-sm uppercase tracking-widest font-bold text-gray-900 active:text-main-600 py-3 px-2 active:bg-gray-50 rounded-lg transition-colors"
            >
              {t('nav.events')}
            </Link>
            <Link
              to="/fashion"
              onClick={closeMobileMenu}
              className="block text-sm uppercase tracking-widest font-bold text-gray-900 active:text-main-600 py-3 px-2 active:bg-gray-50 rounded-lg transition-colors"
            >
              Fashion
            </Link>
            <Link
              to="/beauty"
              onClick={closeMobileMenu}
              className="block text-sm uppercase tracking-widest font-bold text-gray-900 active:text-main-600 py-3 px-2 active:bg-gray-50 rounded-lg transition-colors"
            >
              Beauty
            </Link>
            <Link
              to="/spark-club"
              onClick={closeMobileMenu}
              className="block text-sm uppercase tracking-widest font-bold text-gray-900 active:text-main-600 py-3 px-2 active:bg-gray-50 rounded-lg transition-colors"
            >
              {t('nav.sparkClub')}
            </Link>
            <Link
              to="/news"
              onClick={closeMobileMenu}
              className="block text-sm uppercase tracking-widest font-bold text-gray-900 active:text-main-600 py-3 px-2 active:bg-gray-50 rounded-lg transition-colors"
            >
              {t('nav.news')}
            </Link>
          </div>

          <div className="border-t border-gray-100" />

          <div className="space-y-1">
            {isAdmin && (
              <Link
                to="/admin/dashboard"
                onClick={closeMobileMenu}
                className="flex items-center gap-3 py-3 px-2 text-sm font-bold text-neutral-900 active:text-main-600 active:bg-gray-50 rounded-lg transition-colors"
              >
                <span className="material-symbols-outlined text-[22px]">dashboard</span>
                <span>{t('nav.dashboard')}</span>
              </Link>
            )}
            <Link
              to="/my-tickets"
              onClick={closeMobileMenu}
              className="flex items-center gap-3 py-3 px-2 text-sm text-gray-900 active:text-main-600 active:bg-gray-50 rounded-lg transition-colors"
            >
              <span className="material-symbols-outlined text-[22px]">confirmation_number</span>
              <span>{t('nav.myTickets')}</span>
              {ticketCount > 0 && (
                <span className="ml-auto bg-main-600 text-white text-[10px] px-2 py-0.5 rounded-full">
                  {ticketCount}
                </span>
              )}
            </Link>
            <Link
              to="/my-orders"
              onClick={closeMobileMenu}
              className="flex items-center gap-3 py-3 px-2 text-sm text-gray-900 active:text-main-600 active:bg-gray-50 rounded-lg transition-colors"
            >
              <span className="material-symbols-outlined text-[22px]">receipt_long</span>
              <span>{t('nav.myOrders')}</span>
            </Link>
          </div>

          <div className="pt-4 border-t border-gray-100">
            {user ? (
              <button
                onClick={handleSignOutClick}
                disabled={loggingOut}
                className="w-full flex items-center justify-center gap-2 py-3.5 text-sm font-bold uppercase tracking-widest text-[#ff4b86] hover:bg-pink-50 active:bg-pink-100 rounded-lg transition-colors disabled:opacity-50"
                type="button"
              >
                <LogOut className="h-4 w-4" />
                <span>{t('auth.signOut')}</span>
              </button>
            ) : (
              <Link
                to="/login"
                onClick={closeMobileMenu}
                className="w-full flex items-center justify-center gap-2 py-3.5 text-sm font-black uppercase tracking-widest bg-main-600 text-white rounded-lg hover:bg-main-700 active:bg-main-800 transition-colors"
              >
                <UserRound className="h-4 w-4" />
                <span>{t('auth.signIn')}</span>
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <>
          <div
            className="fixed inset-0 bg-black/70 z-[60] flex items-end md:items-center justify-center p-0 md:p-4"
            onClick={handleSignOutCancel}
          >
            <div
              className="bg-white rounded-t-3xl md:rounded-xl shadow-2xl w-full md:max-w-sm md:w-full p-6 space-y-5 animate-slide-up md:animate-none"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex flex-col items-center gap-4 text-center">
                <div className="flex-shrink-0 w-16 h-16 rounded-full bg-pink-100 flex items-center justify-center">
                  <LogOut className="h-8 w-8 text-[#ff4b86]" />
                </div>
                <div>
                  <h3 className="text-xl font-black uppercase tracking-wider text-gray-900">{t('auth.signOut')}</h3>
                  <p className="text-sm text-gray-600 mt-2">{t('auth.signOutConfirm')}</p>
                </div>
              </div>
              <div className="flex flex-col md:flex-row gap-3 pt-2">
                <button
                  onClick={handleSignOutCancel}
                  className="flex-1 px-4 py-3.5 text-sm font-bold uppercase tracking-wider text-gray-700 bg-gray-100 hover:bg-gray-200 active:bg-gray-300 rounded-xl transition-colors order-2 md:order-1"
                  type="button"
                >
                  {t('auth.cancel')}
                </button>
                <button
                  onClick={handleSignOutConfirm}
                  disabled={loggingOut}
                  className="flex-1 px-4 py-3.5 text-sm font-bold uppercase tracking-wider text-white bg-[#ff4b86] hover:bg-[#e63d75] active:bg-[#cc2f64] rounded-xl transition-colors disabled:opacity-50 order-1 md:order-2"
                  type="button"
                >
                  {t('auth.confirm')}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </nav>
  );
};

export default Navbar;
