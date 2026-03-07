export type VoucherRow = {
  id: string;
  code: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  valid_from: string;
  valid_until: string;
  quota: number;
  used_count: number;
  min_purchase: number | null;
  max_discount: number | null;
  applicable_categories: number[] | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type CategoryRow = {
  id: number;
  name: string;
  is_active: boolean | null;
};

export type VoucherStats = {
  redemptions: number;
  discountTotal: number;
};

export type VoucherFormState = {
  code: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: string;
  valid_from: string;
  valid_until: string;
  quota: string;
  min_purchase: string;
  max_discount: string;
  applicable_categories: number[];
  is_active: boolean;
};

export type VoucherStatusFilter = 'all' | 'active' | 'inactive' | 'expired';
