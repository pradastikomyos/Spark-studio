import { type AdminMenuItem, type AdminMenuSection } from '../components/AdminLayout';

export const ADMIN_MENU_ITEMS: AdminMenuItem[] = [
  { id: 'dashboard', label: 'Dasbor', icon: 'dashboard', path: '/admin/dashboard', filled: true },
];

export const ADMIN_MENU_SECTIONS: AdminMenuSection[] = [
  {
    id: 'management',
    label: 'Manajemen',
    items: [
      { id: 'stages', label: 'Kelola Stage', icon: 'grid_view', path: '/admin/stages' },
      { id: 'qr-bulk', label: 'Kelola QR Massal', icon: 'qr_code_2', path: '/admin/qr-bulk' },
      { id: 'stage-analytics', label: 'Analitik Stage', icon: 'analytics', path: '/admin/stage-analytics' },
      { id: 'banner-manager', label: 'Kelola Banner', icon: 'image', path: '/admin/banner-manager' },
      { id: 'event-page', label: 'Event Page Config', icon: 'edit_document', path: '/admin/event-page' },
      { id: 'news-page', label: 'News Page Config', icon: 'article', path: '/admin/news-page' },
      { id: 'charm-bar-page', label: 'Charm Bar Config', icon: 'diamond', path: '/admin/charm-bar-page' },
    ],
  },
  {
    id: 'tickets',
    label: 'Tiket',
    items: [
      { id: 'booking-page', label: 'Booking Page Config', icon: 'calendar_month', path: '/admin/booking-page' },
      { id: 'entrance-booking', label: 'Entrance Booking Manager', icon: 'event_available', path: '/admin/entrance-booking' },
      { id: 'order-ticket', label: 'Scan Tiket Masuk', icon: 'qr_code_scanner', path: '/admin/order-ticket', highlight: true },
      { id: 'entrance-log', label: 'Log Tiket Masuk', icon: 'fact_check', path: '/admin/tickets' },
    ],
  },
  {
    id: 'store',
    label: 'Toko',
    items: [
      { id: 'product-orders', label: 'Pesanan Produk', icon: 'shopping_bag', path: '/admin/product-orders', badge: 0 },
      { id: 'vouchers', label: 'Voucher & Diskon', icon: 'confirmation_number', path: '/admin/vouchers' },
      { id: 'store-inventory', label: 'Stok & Produk', icon: 'inventory_2', path: '/admin/store' },
    ],
  },
  {
    id: 'dressing-room',
    label: 'Dressing Room',
    items: [
      { id: 'dressing-room', label: 'Dressing Room Manager', icon: 'styler', path: '/admin/dressing-room' },
    ],
  },
  {
    id: 'glam',
    label: 'GLAM',
    items: [
      { id: 'glam-page', label: 'GLAM Page Config', icon: 'auto_awesome', path: '/admin/glam-page' },
    ],
  },
];
