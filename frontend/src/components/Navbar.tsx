import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LogOut, ReceiptText, Search, ShoppingCart, Ticket, UserRound } from 'lucide-react';
import Logo from './Logo';
import LanguageSwitcher from './LanguageSwitcher';
import { useAuth } from '../contexts/AuthContext';
import { useTicketCount } from '../hooks/useTicketCount';
import { useOrderCount } from '../hooks/useOrderCount';
import { useCart } from '../contexts/cartStore';
import { getUserDisplayName } from '../utils/auth';

const Navbar = () => {
  // On phones the spacer centres the active item; on tablets (md+) less
  // spacer is needed because more items fit on screen.
  const mobileEdgeSpacerWidth = 'max(34vw, calc(50vw - 53px))';
  const tabletEdgeSpacerWidth = 'max(18vw, calc(50vw - 180px))';
  const narrowPhoneMaxWidth = 430;
  const narrowPhoneTrailingInset = 52;
  const { t, i18n } = useTranslation();
  const { user, signOut, isAdmin, loggingOut } = useAuth();
  const { count: ticketCount } = useTicketCount();
  const { count: orderCount } = useOrderCount();
  const { totalQuantity } = useCart();
  const navigate = useNavigate();
  const location = useLocation();

  const [scrolled, setScrolled] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [desktopStarPosition, setDesktopStarPosition] = useState(0);

  const desktopNavItemsRef = useRef<(HTMLAnchorElement | null)[]>([]);
  const mobileNavItemsRef = useRef<(HTMLAnchorElement | null)[]>([]);
  const mobileNavScrollerRef = useRef<HTMLDivElement | null>(null);
  const pointerStartRef = useRef<{ id: number; x: number; y: number } | null>(null);
  const hasNavigatedThisGestureRef = useRef(false);
  const hasCenteredMobileItemRef = useRef(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const activeNavKey = (() => {
    const path = location.pathname;
    if (path === '/') return 'on-stage';
    if (path.startsWith('/on-stage')) return 'on-stage';
    if (path.startsWith('/events')) return 'event';
    if (path.startsWith('/shop')) return 'shop';
    if (path.startsWith('/dressing-room') || path.startsWith('/fashion')) return 'dressing-room';
    if (path.startsWith('/beauty') || path.startsWith('/glam')) return 'glam';
    if (path.startsWith('/spark-club')) return 'spark-club';
    if (path.startsWith('/news')) return 'news';
    return '';
  })();

  const navItems = [
    { key: 'on-stage', label: 'ON STAGE', to: '/on-stage' },
    { key: 'glam', label: 'GLAM', to: '/glam' },
    { key: 'dressing-room', label: 'DRESSING ROOM', to: '/dressing-room' },
    { key: 'event', label: 'CELEBRATE', to: '/events' },
    { key: 'shop', label: 'SHOP', to: '/shop' },
    { key: 'spark-club', label: 'SPARK CLUB', to: '/spark-club' },
    { key: 'news', label: 'NEWS', to: '/news' },
  ] as const;

  const renderNavItemLabel = (item: (typeof navItems)[number]) => {
    if (item.key !== 'dressing-room') return item.label;
    const [top, ...rest] = item.label.split(' ');
    const bottom = rest.join(' ');
    return (
      <span className="block leading-tight text-center">
        {top}
        <br />
        {bottom}
      </span>
    );
  };

  const activeIndex = Math.max(0, navItems.findIndex((item) => item.key === activeNavKey));
  const currentLanguage = (i18n.resolvedLanguage ?? i18n.language ?? 'en').toLowerCase();
  const isIndonesian = currentLanguage.startsWith('id');

  const updateDesktopStarPosition = useCallback(() => {
    const activeItem = desktopNavItemsRef.current[activeIndex];
    if (!activeItem) return;

    const left = activeItem.offsetLeft + (activeItem.offsetWidth / 2);
    setDesktopStarPosition(left);
  }, [activeIndex]);

  const centerMobileActiveItem = useCallback((behavior: ScrollBehavior = 'smooth') => {
    const scroller = mobileNavScrollerRef.current;
    const activeItem = mobileNavItemsRef.current[activeIndex];
    if (!scroller || !activeItem) return;

    const doScroll = () => {
      const s = mobileNavScrollerRef.current;
      const a = mobileNavItemsRef.current[activeIndex];
      if (!s || !a) return;
      const maxScrollLeft = Math.max(0, s.scrollWidth - s.clientWidth);
      const centeredLeft = a.offsetLeft - ((s.clientWidth - a.offsetWidth) / 2);
      const rightBiasedLeft = a.offsetLeft + a.offsetWidth - s.clientWidth + narrowPhoneTrailingInset;
      const targetLeft = s.clientWidth <= narrowPhoneMaxWidth ? rightBiasedLeft : centeredLeft;
      const clampedLeft = Math.min(maxScrollLeft, Math.max(0, targetLeft));
      try {
        s.scrollTo({ left: clampedLeft, behavior });
      } catch {
        // Safari fallback: scrollTo with options may throw in very old versions
        s.scrollLeft = clampedLeft;
      }
    };

    // Safari iOS needs a layout flush before offsetLeft is accurate.
    // Double-rAF ensures the browser has painted at least one frame.
    requestAnimationFrame(() => requestAnimationFrame(doScroll));
  }, [activeIndex]);

  useEffect(() => {
    updateDesktopStarPosition();
    const behavior: ScrollBehavior = hasCenteredMobileItemRef.current ? 'smooth' : 'auto';
    centerMobileActiveItem(behavior);
    hasCenteredMobileItemRef.current = true;
  }, [centerMobileActiveItem, updateDesktopStarPosition]);

  useEffect(() => {
    const onResize = () => {
      updateDesktopStarPosition();
      centerMobileActiveItem('auto');
    };

    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [centerMobileActiveItem, updateDesktopStarPosition]);

  const handleMobilePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== 'touch') return;
    pointerStartRef.current = { id: event.pointerId, x: event.clientX, y: event.clientY };
    hasNavigatedThisGestureRef.current = false;
  };

  const handleMobilePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const start = pointerStartRef.current;
    if (!start) return;
    if (event.pointerType !== 'touch') return;
    if (hasNavigatedThisGestureRef.current) return;
    if (event.pointerId !== start.id) return;

    const deltaX = event.clientX - start.x;
    const deltaY = event.clientY - start.y;

    if (Math.abs(deltaX) < 48) return;
    // Keep vertical scroll feeling natural; only act on clearly horizontal swipes.
    if (Math.abs(deltaX) <= Math.abs(deltaY) + 12) return;

    const direction = deltaX < 0 ? 1 : -1;
    const nextIndex = activeIndex + direction;
    if (nextIndex < 0 || nextIndex >= navItems.length) return;

    hasNavigatedThisGestureRef.current = true;
    pointerStartRef.current = null;
    event.preventDefault();
    navigate(navItems[nextIndex].to);
  };

  const handleMobilePointerEnd = (event: React.PointerEvent<HTMLDivElement>) => {
    const start = pointerStartRef.current;
    if (!start) return;
    if (event.pointerType !== 'touch') return;
    if (event.pointerId !== start.id) return;
    pointerStartRef.current = null;
  };

  const handleMobileLanguageToggle = () => {
    void i18n.changeLanguage(isIndonesian ? 'en' : 'id');
  };

  const handleSignOutClick = () => {
    setShowLogoutConfirm(true);
  };

  const handleSignOutConfirm = async () => {
    if (loggingOut) return;
    setShowLogoutConfirm(false);
    const { error } = await signOut();
    if (!error) {
      navigate('/login');
    }
  };

  const handleSignOutCancel = () => {
    setShowLogoutConfirm(false);
  };

  return (
    <nav className={`w-full z-[100] bg-white border-b border-gray-300 transition-shadow ${scrolled ? 'shadow-sm' : ''}`.trim()}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between py-3 lg:py-4">
          <div className="hidden lg:flex items-center gap-3 w-1/3">
            <LanguageSwitcher />
          </div>

          <div className="lg:w-1/3 flex justify-start lg:justify-center">
            <Link to="/" className="inline-flex items-center" aria-label="Home">
              <Logo className="text-4xl md:text-5xl" />
            </Link>
          </div>

          <div className="ml-auto lg:w-1/3 flex items-center justify-end gap-4">
            <div className="hidden lg:block">
              <img src="/images/landing/stage55.png" alt="Stage 55" className="h-14 w-auto md:h-18 object-contain" />
            </div>

            {user ? (
              <div className="hidden lg:flex items-center gap-5">
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
                  className="relative text-gray-500 hover:text-main-600 transition-colors"
                  title={t('nav.myTickets')}
                >
                  <Ticket className="h-5 w-5" />
                  {ticketCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 bg-main-600 text-white text-[10px] w-4 h-4 flex items-center justify-center rounded-full">
                      {ticketCount}
                    </span>
                  )}
                </Link>

                <Link
                  to="/my-orders"
                  className="relative text-gray-500 hover:text-main-600 transition-colors"
                  title={t('nav.myOrders')}
                >
                  <ReceiptText className="h-5 w-5" />
                  {orderCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 bg-main-600 text-white text-[10px] w-4 h-4 flex items-center justify-center rounded-full">
                      {orderCount}
                    </span>
                  )}
                </Link>

                <Link to="/cart" className="relative text-gray-500 hover:text-main-600 transition-colors" aria-label={t('nav.cart')}>
                  <ShoppingCart className="h-5 w-5" />
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
              <div className="hidden lg:flex items-center gap-4">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-bold uppercase tracking-widest bg-main-600 text-white rounded-md hover:bg-main-700 transition-colors shadow-sm"
                >
                  <UserRound className="h-4 w-4" />
                  {t('auth.signIn')}
                </Link>

                <Link to="/cart" className="relative p-2 text-gray-700 hover:text-main-600 transition-colors" aria-label={t('nav.cart')}>
                  <ShoppingCart className="h-5 w-5" />
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

            <div className="lg:hidden flex items-center gap-2">
              <img src="/images/landing/stage55.png" alt="Stage 55" className="h-10 w-auto object-contain" />

              <button
                type="button"
                onClick={handleMobileLanguageToggle}
                className="px-2.5 py-1.5 rounded-md border border-gray-300 text-[11px] font-black uppercase tracking-wider text-gray-800 active:bg-gray-50"
                aria-label={t('language.switch')}
                title={`${t('language.switch')}: ${isIndonesian ? 'English' : 'Bahasa Indonesia'}`}
              >
                {isIndonesian ? 'ID' : 'EN'}
              </button>

              {!user && (
                <Link
                  to="/login"
                  className="p-2 rounded-md border border-gray-300 text-gray-700 active:bg-gray-50"
                  aria-label={t('auth.signIn')}
                  title={t('auth.signIn')}
                >
                  <UserRound className="h-5 w-5" />
                </Link>
              )}

              <Link to="/cart" className="relative p-2 text-gray-700 active:text-main-600" aria-label={t('nav.cart')}>
                <ShoppingCart className="h-6 w-6" />
                {totalQuantity > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 bg-main-600 text-white text-[10px] w-4 h-4 flex items-center justify-center rounded-full">
                    {totalQuantity}
                  </span>
                )}
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-gray-300" />

      <div className="hidden lg:block">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="relative py-6">
            <div
              className="absolute transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] pointer-events-none"
              style={{
                left: `${desktopStarPosition}px`,
                top: '50%',
                transform: 'translate(-50%, -50%)',
                width: '100px',
                height: '100px',
                zIndex: 0,
              }}
            >
              <img
                src="/images/landing/ICON%20STAR-01.svg"
                alt="Active"
                className="w-full h-full object-contain"
              />
            </div>

            <div className="flex justify-evenly items-center relative z-10">
              {navItems.map((item, idx) => {
                const isActive = idx === activeIndex;

                return (
                  <Link
                    key={item.key}
                    ref={(el) => (desktopNavItemsRef.current[idx] = el)}
                    to={item.to}
                    className={`text-sm font-semibold uppercase px-4 py-2 transition-colors ${isActive ? 'text-white' : 'text-gray-600 hover:text-gray-900'
                      }`}
                  >
                    {renderNavItemLabel(item)}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="lg:hidden">
        <div
          className="relative flex items-center justify-center min-h-[92px] py-2 sm:min-h-[96px] md:min-h-[104px]"
          onPointerDown={handleMobilePointerDown}
          onPointerMove={handleMobilePointerMove}
          onPointerUp={handleMobilePointerEnd}
          onPointerCancel={handleMobilePointerEnd}
        >
          <div
            ref={mobileNavScrollerRef}
            className="w-full relative z-10 flex items-center py-8 overflow-x-auto scroll-smooth snap-x snap-proximity [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
            style={{ WebkitOverflowScrolling: 'touch' }}
          >
            <div
              className="shrink-0 md:hidden"
              style={{ width: mobileEdgeSpacerWidth }}
              aria-hidden
            />
            <div
              className="shrink-0 hidden md:block"
              style={{ width: tabletEdgeSpacerWidth }}
              aria-hidden
            />
            {navItems.map((item, idx) => {
              const isActive = idx === activeIndex;

              return (
                <Link
                  key={item.key}
                  ref={(el) => (mobileNavItemsRef.current[idx] = el)}
                  to={item.to}
                  className={`relative z-10 shrink-0 snap-center min-w-[106px] md:min-w-[120px] text-center text-xs md:text-sm font-semibold uppercase px-3 md:px-4 py-2 mx-0.5 transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${isActive ? 'text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.18)] -translate-y-[1px] scale-[1.03]' : 'text-gray-600 active:text-gray-900'
                    }`}
                >
                  {isActive && (
                    <span className="pointer-events-none absolute left-1/2 top-1/2 -z-10 -translate-x-1/2 -translate-y-1/2" aria-hidden>
                      <span className="animate-nav-star-breathe block h-[72px] w-[72px] sm:h-[84px] sm:w-[84px] md:h-[92px] md:w-[92px]">
                        <img
                          src="/images/landing/ICON%20STAR-01.svg"
                          alt=""
                          className="h-full w-full object-contain"
                        />
                      </span>
                    </span>
                  )}
                  <span className="relative z-10 block">
                    {renderNavItemLabel(item)}
                  </span>
                </Link>
              );
            })}
            <div
              className="shrink-0 md:hidden"
              style={{ width: mobileEdgeSpacerWidth }}
              aria-hidden
            />
            <div
              className="shrink-0 hidden md:block"
              style={{ width: tabletEdgeSpacerWidth }}
              aria-hidden
            />
          </div>
        </div>
      </div>

      <div className="lg:hidden border-t border-gray-200 bg-white">
        <div className="px-4 sm:px-6 py-2 flex items-center gap-2 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          {isAdmin && (
            <Link
              to="/admin/dashboard"
              className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-gray-300 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-gray-800 active:bg-gray-50"
            >
              <span className="material-symbols-outlined text-[16px]">dashboard</span>
              Dashboard
            </Link>
          )}

          {user && (
            <>
              <Link
                to="/my-tickets"
                className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-gray-300 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-gray-800 active:bg-gray-50"
              >
                <Ticket className="h-3.5 w-3.5" />
                {t('nav.myTickets')}
                {ticketCount > 0 && (
                  <span className="bg-main-600 text-white text-[10px] px-1.5 py-0.5 rounded-full">
                    {ticketCount}
                  </span>
                )}
              </Link>

              <Link
                to="/my-orders"
                className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-gray-300 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-gray-800 active:bg-gray-50"
              >
                <ReceiptText className="h-3.5 w-3.5" />
                {t('nav.myOrders')}
                {orderCount > 0 && (
                  <span className="bg-main-600 text-white text-[10px] px-1.5 py-0.5 rounded-full">
                    {orderCount}
                  </span>
                )}
              </Link>

              <button
                type="button"
                onClick={handleSignOutClick}
                disabled={loggingOut}
                className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-pink-300 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-[#ff4b86] active:bg-pink-50 disabled:opacity-50"
              >
                <LogOut className="h-3.5 w-3.5" />
                {t('auth.signOut')}
              </button>
            </>
          )}

        </div>
      </div>

      {showLogoutConfirm && (
        <>
          <div
            className="fixed inset-0 bg-black/70 z-[60] flex items-end md:items-center justify-center p-0 md:p-4"
            onClick={handleSignOutCancel}
          >
            <div
              className="bg-white rounded-t-3xl md:rounded-xl shadow-2xl w-full md:max-w-sm md:w-full p-6 space-y-5 animate-slide-up md:animate-none"
              onClick={(event) => event.stopPropagation()}
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
