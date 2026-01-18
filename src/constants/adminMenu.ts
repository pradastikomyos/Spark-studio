import { type AdminMenuItem } from '../components/AdminLayout';

export const ADMIN_MENU_ITEMS: AdminMenuItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: 'dashboard', path: '/admin/dashboard' },
  { id: 'booking', label: 'Booking Management', icon: 'calendar_month' },
  { id: 'orders', label: 'Store & Inventory', icon: 'shopping_bag', path: '/admin/store' },
  { id: 'events', label: 'Event Registrations', icon: 'confirmation_number', path: '/admin/tickets' },
  { id: 'content', label: 'Content Manager', icon: 'podium' },
  { id: 'settings', label: 'Settings', icon: 'settings' },
];
