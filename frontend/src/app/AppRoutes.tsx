import { lazy, Suspense, type ElementType, type ReactNode } from 'react';

import { AnimatePresence } from 'framer-motion';
import { Navigate, Route, Routes, useLocation, useParams } from 'react-router-dom';

import BrandedLoader from '../components/BrandedLoader';
import { ErrorBoundary } from '../components/ErrorBoundary';
import ProtectedRoute from '../components/ProtectedRoute';
import PublicLayout from '../components/PublicLayout';
import Home from '../pages/Home';

const Shop = lazy(() => import('../pages/Shop'));
const Events = lazy(() => import('../pages/Events'));
const SparkClub = lazy(() => import('../pages/SparkClub'));
const CharmBar = lazy(() => import('../pages/CharmBar'));
const News = lazy(() => import('../pages/News'));
const Login = lazy(() => import('../pages/Login'));
const SignUp = lazy(() => import('../pages/SignUp'));
const AuthCallback = lazy(() => import('../pages/AuthCallback'));
const Dashboard = lazy(() => import('../pages/admin/Dashboard'));
const TicketsManagement = lazy(() => import('../pages/admin/TicketsManagement'));
const StoreInventory = lazy(() => import('../pages/admin/StoreInventory'));
const StageManager = lazy(() => import('../pages/admin/StageManager'));
const StageAnalytics = lazy(() => import('../pages/admin/StageAnalytics'));
const StageBulkQR = lazy(() => import('../pages/admin/StageBulkQR'));
const OrderTicket = lazy(() => import('../pages/admin/OrderTicket'));
const ProductOrders = lazy(() => import('../pages/admin/ProductOrders'));
const VoucherManager = lazy(() => import('../pages/admin/VoucherManager'));
const BannerManager = lazy(() => import('../pages/admin/BannerManager'));
const EventsScheduleManager = lazy(() => import('../pages/admin/EventsScheduleManager'));
const EventPageManager = lazy(() => import('../pages/admin/EventPageManager'));
const NewsPageManager = lazy(() => import('../pages/admin/NewsPageManager'));
const CharmBarPageManager = lazy(() => import('../pages/admin/CharmBarPageManager'));
const BookingPageManager = lazy(() => import('../pages/admin/BookingPageManager'));
const EntranceBookingManager = lazy(() => import('../pages/admin/EntranceBookingManager'));
const DressingRoomManager = lazy(() => import('../pages/admin/DressingRoomManager'));
const BeautyPosterManager = lazy(() => import('../pages/admin/BeautyPosterManager'));
const BookingPage = lazy(() => import('../pages/BookingPage'));
const JourneySelectionPage = lazy(() => import('../pages/JourneySelectionPage'));
const PaymentPage = lazy(() => import('../pages/PaymentPage'));
const BookingSuccessPage = lazy(() => import('../pages/BookingSuccessPage'));
const CartPage = lazy(() => import('../pages/CartPage'));
const CheckoutPage = lazy(() => import('../pages/CheckoutPage'));
const ProductCheckoutPage = lazy(() => import('../pages/ProductCheckoutPage'));
const ProductOrderSuccessPage = lazy(() => import('../pages/ProductOrderSuccessPage'));
const ProductOrderPendingPage = lazy(() => import('../pages/ProductOrderPendingPage'));
const ProductDetailPage = lazy(() => import('../pages/ProductDetailPage'));
const MyProductOrdersPage = lazy(() => import('../pages/MyProductOrdersPage'));
const MyTicketsPage = lazy(() => import('../pages/MyTicketsPage'));
const StageScanPage = lazy(() => import('../pages/StageScanPage'));
const StageDetailPage = lazy(() => import('../pages/StageDetailPage'));
const DressingRoomCollectionPage = lazy(() => import('../pages/DressingRoomCollectionPage'));
const DressingRoomLandingPage = lazy(() => import('../pages/DressingRoomLandingPage'));
const DressingRoomLookPage = lazy(() => import('../pages/DressingRoomLookPage'));
const BeautyPage = lazy(() => import('../pages/BeautyPage'));
const NotFound = lazy(() => import('../pages/NotFound'));

interface RouteConfig {
  path: string;
  Page: ElementType;
}

const standaloneRouteConfigs: RouteConfig[] = [
  { path: '/login', Page: Login },
  { path: '/signup', Page: SignUp },
  { path: '/auth/callback', Page: AuthCallback },
  { path: '/checkout', Page: CheckoutPage },
  { path: '/scan/:stageCode', Page: StageScanPage },
  { path: '/stage/:stageCode', Page: StageDetailPage },
];

const adminRouteConfigs: RouteConfig[] = [
  { path: '/admin/dashboard', Page: Dashboard },
  { path: '/admin/tickets', Page: TicketsManagement },
  { path: '/admin/store', Page: StoreInventory },
  { path: '/admin/stages', Page: StageManager },
  { path: '/admin/stage-analytics', Page: StageAnalytics },
  { path: '/admin/qr-bulk', Page: StageBulkQR },
  { path: '/admin/booking-page', Page: BookingPageManager },
  { path: '/admin/entrance-booking', Page: EntranceBookingManager },
  { path: '/admin/order-ticket', Page: OrderTicket },
  { path: '/admin/product-orders', Page: ProductOrders },
  { path: '/admin/vouchers', Page: VoucherManager },
  { path: '/admin/banner-manager', Page: BannerManager },
  { path: '/admin/events-schedule', Page: EventsScheduleManager },
  { path: '/admin/event-page', Page: EventPageManager },
  { path: '/admin/news-page', Page: NewsPageManager },
  { path: '/admin/charm-bar-page', Page: CharmBarPageManager },
  { path: '/admin/dressing-room', Page: DressingRoomManager },
  { path: '/admin/glam-page', Page: BeautyPosterManager },
];

const publicRouteConfigs: RouteConfig[] = [
  { path: 'shop', Page: Shop },
  { path: 'dressing-room', Page: DressingRoomLandingPage },
  { path: 'dressing-room/look/:lookNumber', Page: DressingRoomLookPage },
  { path: 'dressing-room/:collectionSlug', Page: DressingRoomCollectionPage },
  { path: 'glam', Page: BeautyPage },
  { path: 'shop/product/:productId', Page: ProductDetailPage },
  { path: 'events', Page: Events },
  { path: 'spark-club', Page: SparkClub },
  { path: 'charm-bar', Page: CharmBar },
  { path: 'news', Page: News },
  { path: 'journey', Page: JourneySelectionPage },
  { path: 'cart', Page: CartPage },
];

const protectedPublicRouteConfigs: RouteConfig[] = [
  { path: 'checkout/product', Page: ProductCheckoutPage },
  { path: 'booking/:slug', Page: BookingPage },
  { path: 'payment', Page: PaymentPage },
  { path: 'booking-success', Page: BookingSuccessPage },
  { path: 'my-tickets', Page: MyTicketsPage },
  { path: 'my-orders', Page: MyProductOrdersPage },
  { path: 'order/product/success/:orderNumber', Page: ProductOrderSuccessPage },
  { path: 'order/product/pending/:orderNumber', Page: ProductOrderPendingPage },
];

function RouteLoading() {
  return (
    <div className="flex items-center justify-center py-16">
      <BrandedLoader size="sm" />
    </div>
  );
}

function LegacyFashionLookRedirect() {
  const { lookNumber } = useParams<{ lookNumber: string }>();
  return <Navigate to={`/dressing-room/look/${lookNumber ?? ''}`} replace />;
}

function LegacyFashionCollectionRedirect() {
  const { collectionSlug } = useParams<{ collectionSlug: string }>();
  return <Navigate to={`/dressing-room/${collectionSlug ?? ''}`} replace />;
}

function shouldWrapWithErrorBoundary(path: string) {
  const isSuccessPage =
    path === '/booking-success' || path.startsWith('/order/product/success/') || path.startsWith('/order/product/pending/');

  return !isSuccessPage && (path.startsWith('/admin') || path === '/shop' || path.startsWith('/shop/'));
}

export function AppRoutes() {
  const location = useLocation();

  const wrap = (node: ReactNode) =>
    shouldWrapWithErrorBoundary(location.pathname) ? <ErrorBoundary>{node}</ErrorBoundary> : node;

  const renderLazyPage = (Page: ElementType) =>
    wrap(
      <Suspense fallback={<RouteLoading />}>
        <Page />
      </Suspense>
    );

  const renderProtected = (node: ReactNode, adminOnly = false) => wrap(<ProtectedRoute adminOnly={adminOnly}>{node}</ProtectedRoute>);

  const renderProtectedLazyPage = (Page: ElementType, adminOnly = false) =>
    renderProtected(
      <Suspense fallback={<RouteLoading />}>
        <Page />
      </Suspense>,
      adminOnly
    );

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        {standaloneRouteConfigs.map(({ path, Page }) => (
          <Route key={path} path={path} element={renderLazyPage(Page)} />
        ))}

        <Route path="/admin" element={renderProtected(<Navigate to="/admin/dashboard" replace />, true)} />

        {adminRouteConfigs.map(({ path, Page }) => (
          <Route key={path} path={path} element={renderProtectedLazyPage(Page, true)} />
        ))}

        <Route path="/admin/fashion" element={wrap(<Navigate to="/admin/dressing-room" replace />)} />
        <Route path="/admin/beauty-posters" element={wrap(<Navigate to="/admin/glam-page" replace />)} />

        <Route element={<PublicLayout />}>
          <Route index element={<Home />} />
          <Route path="on-stage" element={wrap(<Home />)} />

          {publicRouteConfigs.map(({ path, Page }) => (
            <Route key={path} path={path} element={renderLazyPage(Page)} />
          ))}

          <Route path="fashion" element={wrap(<Navigate to="/dressing-room" replace />)} />
          <Route path="fashion/look/:lookNumber" element={wrap(<LegacyFashionLookRedirect />)} />
          <Route path="fashion/:collectionSlug" element={wrap(<LegacyFashionCollectionRedirect />)} />
          <Route path="beauty" element={wrap(<Navigate to="/glam" replace />)} />
          <Route path="beauty/:posterSlug" element={wrap(<Navigate to="/glam" replace />)} />
          <Route path="chamr-bar" element={wrap(<Navigate to="/charm-bar" replace />)} />

          {protectedPublicRouteConfigs.map(({ path, Page }) => (
            <Route key={path} path={path} element={renderProtectedLazyPage(Page)} />
          ))}

          <Route path="*" element={renderLazyPage(NotFound)} />
        </Route>
      </Routes>
    </AnimatePresence>
  );
}
