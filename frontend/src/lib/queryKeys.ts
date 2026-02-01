export const queryKeys = {
  products: () => ['products'] as const,
  product: (productId: number | string) => ['product', productId] as const,
  categories: () => ['categories'] as const,
  inventory: () => ['inventory'] as const,

  tickets: () => ['tickets'] as const,
  ticket: (slug: string) => ['ticket', slug] as const,
  ticketAvailability: (ticketId: number, date?: string | null) => ['ticket-availability', ticketId, date ?? null] as const,

  myTickets: (userId: string) => ['my-tickets', userId] as const,
  myOrders: (userId: string) => ['my-orders', userId] as const,

  dashboardStats: () => ['dashboard-stats'] as const,
  productOrders: () => ['admin-product-orders'] as const,

  stages: () => ['stages-with-stats'] as const,
  stageQrCodes: () => ['stage-qr-codes'] as const,
  stageAnalytics: (timeFilter: string) => ['stage-analytics', timeFilter] as const,
  ticketsManagement: () => ['tickets-management'] as const,

  banners: (type?: 'hero' | 'stage' | 'promo' | 'events' | 'fashion' | 'beauty') => ['banners', type ?? 'all'] as const,
} as const
