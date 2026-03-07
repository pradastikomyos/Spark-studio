export type CreateProductTokenResponse = {
  token: string;
  order_number: string;
  discount_amount?: number;
};

export type CreateCashierOrderResponse = {
  order_number: string;
};

export type InvokeErrorWithContext = {
  status?: number;
  context?: {
    status?: number;
    statusCode?: number;
    response?: Response;
  };
};

export type AppliedVoucher = {
  id: string;
  code: string;
  discountAmount: number;
  discountType?: string | null;
  discountValue?: number | null;
};

export type ValidateVoucherResult = {
  voucher_id?: string | null;
  discount_type?: string | null;
  discount_value?: number | string | null;
  discount_amount?: number | string | null;
  error_message?: string | null;
  error_code?: string | null;
  applicable_category_names?: string[] | null;
};

export type CheckoutOrderItem = {
  product_variant_id: number;
  product_name: string;
  variant_name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
};
