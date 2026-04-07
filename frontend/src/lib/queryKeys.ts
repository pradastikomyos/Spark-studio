export const queryKeys = {
  products: () => ['products'] as const,
  productSummaries: () => ['products', 'summaries'] as const,
  productPickerOptions: () => ['products', 'picker-options'] as const,
  product: (productId: number | string) => ['product', productId] as const,
  categories: () => ['categories'] as const,
  inventory: () => ['inventory'] as const,
  inventoryList: (
    page: number,
    pageSize: number,
    searchQuery: string,
    categoryFilter: string,
    stockFilter: '' | 'in' | 'low' | 'out',
    activeFilter: '' | 'active' | 'inactive'
  ) => ['inventory', page, pageSize, searchQuery, categoryFilter, stockFilter, activeFilter] as const,

  tickets: () => ['tickets'] as const,
  ticket: (slug: string) => ['ticket', slug] as const,
  entranceTicket: (scope: 'public' | 'admin' = 'public') => ['entrance-ticket', scope] as const,
  ticketBookingSettings: (ticketId: number) => ['ticket-booking-settings', ticketId] as const,
  effectiveTicketAvailability: (ticketId: number, startDate: string, endDate: string) =>
    ['effective-ticket-availability', ticketId, startDate, endDate] as const,
  ticketAvailability: (ticketId: number, date?: string | null) => ['ticket-availability', ticketId, date ?? null] as const,

  myTickets: (userId: string) => ['my-tickets', userId] as const,
  myOrders: (userId: string) => ['my-orders', userId] as const,

  dashboardStats: () => ['dashboard-stats'] as const,
  productOrders: () => ['admin-product-orders'] as const,
  productOrderDetails: () => ['admin-product-order-detail'] as const,
  productOrderDetail: (pickupCode: string) => ['admin-product-order-detail', pickupCode] as const,

  stages: () => ['stages-with-stats'] as const,
  stageQrCodes: () => ['stage-qr-codes'] as const,
  stageAnalytics: (timeFilter: string) => ['stage-analytics', timeFilter] as const,
  ticketsManagement: () => ['tickets-management'] as const,

  banners: (type?: 'hero' | 'stage' | 'promo' | 'events' | 'shop' | 'process' | 'spark-map') => ['banners', type ?? 'all'] as const,
  eventSchedule: (scope?: 'public' | 'admin') => ['event-schedule', scope ?? 'public'] as const,
} as const
