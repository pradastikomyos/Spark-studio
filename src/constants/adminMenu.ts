import { type AdminMenuItem, type AdminMenuSection } from '../components/AdminLayout';

export const ADMIN_MENU_ITEMS: AdminMenuItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: 'dashboard', path: '/admin/dashboard', filled: true },
  { id: 'fashion', label: 'Fashion Showcases', icon: 'styler', path: '/admin/fashion' },
];

export const ADMIN_MENU_SECTIONS: AdminMenuSection[] = [
  {
    id: 'tickets',
    label: 'Tickets',
    items: [
      { id: 'order-ticket', label: 'Order Ticket', icon: 'add_shopping_cart', path: '/admin/order-ticket' },
      { id: 'purchased-tickets', label: 'Purchased Tickets', icon: 'confirmation_number', path: '/admin/tickets' },
    ],
  },
  {
    id: 'store',
    label: 'Store',
    items: [
      { id: 'pickup-scanner', label: 'Pickup Store Scanner', icon: 'qr_code_scanner', path: '/admin/pickup-scanner', highlight: true },
      { id: 'discounts', label: 'Discounts', icon: 'local_offer', path: '/admin/discounts' },
      { id: 'order-products', label: 'Order Products', icon: 'shopping_bag', path: '/admin/store', badge: 0 },
    ],
  },
];
