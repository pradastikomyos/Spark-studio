export type ProductVariantRow = {
  id: number;
  product_id: number;
  name: string;
  sku: string;
  price: string | number | null;
  stock: number | null;
  reserved_stock: number | null;
  attributes: Record<string, unknown> | null;
  is_active: boolean | null;
};

export type ProductImageRow = {
  image_url: string;
  is_primary: boolean;
  display_order: number;
};

export type ProductRow = {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  category_id: number | null;
  sku: string;
  is_active: boolean;
  deleted_at: string | null;
  categories?: { id: number; name: string; slug: string; is_active: boolean | null } | null;
  product_variants?: ProductVariantRow[] | null;
  product_images?: ProductImageRow[] | null;
};

export type CategoryRow = {
  id: number;
  name: string;
  slug: string;
  is_active: boolean | null;
  parent_id: number | null;
};

export type UseInventoryParams = {
  page: number;
  pageSize: number;
  searchQuery: string;
  categoryFilter: string;
  stockFilter: '' | 'in' | 'low' | 'out';
  activeFilter: '' | 'active' | 'inactive';
};

export type InventorySource = 'rpc' | 'rpc-fallback';

export type InventoryDiagnostics = {
  fetchMs: number;
  fullScan: boolean;
  source: InventorySource;
  warning: string | null;
};

export type InventoryQueryData = {
  products: ProductRow[];
  categories: CategoryRow[];
  totalCount: number;
  diagnostics: InventoryDiagnostics;
};

export type InventoryListFilters = {
  searchQuery: string;
  categoryFilter: string;
};

export type InventoryProductFetchResult = {
  data: ProductRow[] | null;
  error: unknown;
  count: number | null;
  fullScan: boolean;
  source: InventorySource;
  warning: string | null;
};

export type InventoryPageRow = {
  product_id: number | string | null;
  total_count: number | string | null;
};
