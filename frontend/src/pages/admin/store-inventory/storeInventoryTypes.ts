export type InventoryProduct = {
  id: number;
  name: string;
  sku: string;
  is_active: boolean;
  category: string;
  category_slug?: string;
  stock_available: number;
  stock_status: 'good' | 'ok' | 'low' | 'out';
  price_min: number;
  price_max: number;
  variant_count: number;
  image_url?: string | null;
  image_url_original?: string | null;
};

export type StockFilter = '' | 'in' | 'low' | 'out';

export type DeletingProduct = {
  id: number;
  name: string;
};
