import { lazy } from 'react';

import type { AppRouteConfig } from './routeTypes';

const ProductCheckoutPage = lazy(() => import('../../pages/ProductCheckoutPage'));
const BookingPage = lazy(() => import('../../pages/BookingPage'));
const PaymentPage = lazy(() => import('../../pages/PaymentPage'));
const BookingSuccessPage = lazy(() => import('../../pages/BookingSuccessPage'));
const CartPage = lazy(() => import('../../pages/CartPage'));
const MyTicketsPage = lazy(() => import('../../pages/MyTicketsPage'));
const MyProductOrdersPage = lazy(() => import('../../pages/MyProductOrdersPage'));
const ProductOrderSuccessPage = lazy(() => import('../../pages/ProductOrderSuccessPage'));
const ProductOrderPendingPage = lazy(() => import('../../pages/ProductOrderPendingPage'));

export const protectedPublicRouteConfigs: AppRouteConfig[] = [
  { path: 'cart', Page: CartPage },
  { path: 'checkout/product', Page: ProductCheckoutPage },
  { path: 'booking/:slug', Page: BookingPage },
  { path: 'payment', Page: PaymentPage },
  { path: 'booking-success', Page: BookingSuccessPage },
  { path: 'my-tickets', Page: MyTicketsPage },
  { path: 'my-orders', Page: MyProductOrdersPage },
  { path: 'order/product/success/:orderNumber', Page: ProductOrderSuccessPage },
  { path: 'order/product/pending/:orderNumber', Page: ProductOrderPendingPage },
];
