import { lazy } from 'react';

import type { AppRouteConfig } from './routeTypes';

const Dashboard = lazy(() => import('../../pages/admin/Dashboard'));
const TicketsManagement = lazy(() => import('../../pages/admin/TicketsManagement'));
const StoreInventory = lazy(() => import('../../pages/admin/StoreInventory'));
const StageManager = lazy(() => import('../../pages/admin/StageManager'));
const StageAnalytics = lazy(() => import('../../pages/admin/StageAnalytics'));
const StageBulkQR = lazy(() => import('../../pages/admin/StageBulkQR'));
const OrderTicket = lazy(() => import('../../pages/admin/OrderTicket'));
const ProductOrders = lazy(() => import('../../pages/admin/ProductOrders'));
const VoucherManager = lazy(() => import('../../pages/admin/VoucherManager'));
const BannerManager = lazy(() => import('../../pages/admin/BannerManager'));
const EventsScheduleManager = lazy(() => import('../../pages/admin/EventsScheduleManager'));
const EventPageManager = lazy(() => import('../../pages/admin/EventPageManager'));
const NewsPageManager = lazy(() => import('../../pages/admin/NewsPageManager'));
const CharmBarPageManager = lazy(() => import('../../pages/admin/CharmBarPageManager'));
const BookingPageManager = lazy(() => import('../../pages/admin/BookingPageManager'));
const EntranceBookingManager = lazy(() => import('../../pages/admin/EntranceBookingManager'));
const DressingRoomManager = lazy(() => import('../../pages/admin/DressingRoomManager'));
const BeautyPosterManager = lazy(() => import('../../pages/admin/BeautyPosterManager'));

export const adminRouteConfigs: AppRouteConfig[] = [
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
