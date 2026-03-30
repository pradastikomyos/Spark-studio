-- Historical note: this voucher-system migration was followed by
-- 20260213032737_add_voucher_system.sql with the same descriptive suffix.
-- Keep both files for history; do not rename or rewrite either migration.
-- ============================================
-- Migration: Voucher/Discount System
-- Date: 2026-02-13
-- Description: Add voucher management system with atomic quota tracking
-- ============================================

-- PHASE 1: Create vouchers table
-- ============================================

CREATE TABLE IF NOT EXISTS public.vouchers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value NUMERIC NOT NULL CHECK (discount_value > 0),
  valid_from TIMESTAMPTZ NOT NULL,
  valid_until TIMESTAMPTZ NOT NULL,
  quota INTEGER NOT NULL CHECK (quota > 0),
  used_count INTEGER NOT NULL DEFAULT 0 CHECK (used_count >= 0),
  min_purchase NUMERIC CHECK (min_purchase >= 0),
  max_discount NUMERIC CHECK (max_discount >= 0),
  applicable_categories INTEGER[] DEFAULT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_date_range CHECK (valid_until > valid_from),
  CONSTRAINT quota_not_exceeded CHECK (used_count <= quota)
);

-- Indexes for performance
CREATE INDEX idx_vouchers_code ON public.vouchers(code) WHERE is_active = true;
CREATE INDEX idx_vouchers_active ON public.vouchers(is_active, valid_from, valid_until);
CREATE INDEX idx_vouchers_categories ON public.vouchers USING GIN(applicable_categories);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_vouchers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_vouchers_updated_at
  BEFORE UPDATE ON public.vouchers
  FOR EACH ROW
  EXECUTE FUNCTION update_vouchers_updated_at();


-- PHASE 2: Create voucher_usage tracking table
-- ============================================

CREATE TABLE IF NOT EXISTS public.voucher_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  voucher_id UUID NOT NULL REFERENCES public.vouchers(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  order_product_id INTEGER NOT NULL REFERENCES public.order_products(id) ON DELETE CASCADE,
  discount_amount NUMERIC NOT NULL CHECK (discount_amount >= 0),
  used_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Prevent duplicate usage per order
  CONSTRAINT unique_voucher_per_order UNIQUE(order_product_id)
);

-- Indexes
CREATE INDEX idx_voucher_usage_voucher ON public.voucher_usage(voucher_id);
CREATE INDEX idx_voucher_usage_user ON public.voucher_usage(user_id);
CREATE INDEX idx_voucher_usage_order ON public.voucher_usage(order_product_id);


-- PHASE 3: Add voucher columns to order_products
-- ============================================

ALTER TABLE public.order_products 
  ADD COLUMN IF NOT EXISTS voucher_code TEXT,
  ADD COLUMN IF NOT EXISTS voucher_id UUID REFERENCES public.vouchers(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_order_products_voucher ON public.order_products(voucher_id);


-- PHASE 4: RPC function for atomic voucher validation & usage
-- ============================================

CREATE OR REPLACE FUNCTION public.validate_and_reserve_voucher(
  p_code TEXT,
  p_user_id UUID,
  p_subtotal NUMERIC,
  p_category_ids INTEGER[]
)
RETURNS TABLE(
  voucher_id UUID,
  discount_type TEXT,
  discount_value NUMERIC,
  discount_amount NUMERIC,
  error_message TEXT
) AS $$
DECLARE
  v_voucher RECORD;
  v_calculated_discount NUMERIC;
  v_now TIMESTAMPTZ := NOW();
BEGIN
  -- Lock voucher row for atomic quota check (prevents race conditions)
  SELECT * INTO v_voucher
  FROM public.vouchers
  WHERE code = UPPER(TRIM(p_code))
  FOR UPDATE;
  
  -- Voucher not found
  IF NOT FOUND THEN
    RETURN QUERY SELECT NULL::UUID, NULL::TEXT, NULL::NUMERIC, NULL::NUMERIC, 'Kode voucher tidak valid'::TEXT;
    RETURN;
  END IF;
  
  -- Check if active
  IF v_voucher.is_active = false THEN
    RETURN QUERY SELECT NULL::UUID, NULL::TEXT, NULL::NUMERIC, NULL::NUMERIC, 'Voucher tidak aktif'::TEXT;
    RETURN;
  END IF;
  
  -- Check date validity
  IF v_now < v_voucher.valid_from THEN
    RETURN QUERY SELECT NULL::UUID, NULL::TEXT, NULL::NUMERIC, NULL::NUMERIC, 'Voucher belum berlaku'::TEXT;
    RETURN;
  END IF;
  
  IF v_now > v_voucher.valid_until THEN
    RETURN QUERY SELECT NULL::UUID, NULL::TEXT, NULL::NUMERIC, NULL::NUMERIC, 'Voucher sudah kadaluarsa'::TEXT;
    RETURN;
  END IF;
  
  -- Check quota (atomic check with FOR UPDATE lock)
  IF v_voucher.used_count >= v_voucher.quota THEN
    RETURN QUERY SELECT NULL::UUID, NULL::TEXT, NULL::NUMERIC, NULL::NUMERIC, 'Kuota voucher habis'::TEXT;
    RETURN;
  END IF;
  
  -- Check minimum purchase
  IF v_voucher.min_purchase IS NOT NULL AND p_subtotal < v_voucher.min_purchase THEN
    RETURN QUERY SELECT 
      NULL::UUID, 
      NULL::TEXT, 
      NULL::NUMERIC, 
      NULL::NUMERIC, 
      FORMAT('Minimum pembelian Rp %s', v_voucher.min_purchase)::TEXT;
    RETURN;
  END IF;
  
  -- Check category restrictions
  IF v_voucher.applicable_categories IS NOT NULL AND array_length(v_voucher.applicable_categories, 1) > 0 THEN
    -- Check if any product category matches voucher categories
    IF NOT EXISTS (
      SELECT 1 
      FROM unnest(p_category_ids) AS cat_id
      WHERE cat_id = ANY(v_voucher.applicable_categories)
    ) THEN
      RETURN QUERY SELECT NULL::UUID, NULL::TEXT, NULL::NUMERIC, NULL::NUMERIC, 'Voucher tidak berlaku untuk kategori produk ini'::TEXT;
      RETURN;
    END IF;
  END IF;
  
  -- Calculate discount
  IF v_voucher.discount_type = 'percentage' THEN
    v_calculated_discount := ROUND(p_subtotal * (v_voucher.discount_value / 100), 0);
    
    -- Apply max discount cap if set
    IF v_voucher.max_discount IS NOT NULL AND v_calculated_discount > v_voucher.max_discount THEN
      v_calculated_discount := v_voucher.max_discount;
    END IF;
  ELSE
    -- Fixed discount
    v_calculated_discount := LEAST(v_voucher.discount_value, p_subtotal);
  END IF;
  
  -- Ensure discount doesn't exceed subtotal
  v_calculated_discount := LEAST(v_calculated_discount, p_subtotal);
  
  -- Increment used_count atomically (still holding FOR UPDATE lock)
  UPDATE public.vouchers
  SET used_count = used_count + 1
  WHERE id = v_voucher.id;
  
  -- Return success with discount details
  RETURN QUERY SELECT 
    v_voucher.id::UUID,
    v_voucher.discount_type::TEXT,
    v_voucher.discount_value::NUMERIC,
    v_calculated_discount::NUMERIC,
    NULL::TEXT;
END;
$$ LANGUAGE plpgsql;


-- PHASE 5: RPC function to release voucher quota (for failed payments)
-- ============================================

CREATE OR REPLACE FUNCTION public.release_voucher_quota(
  p_voucher_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE public.vouchers
  SET used_count = GREATEST(0, used_count - 1)
  WHERE id = p_voucher_id;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql;


-- PHASE 6: Row Level Security (RLS) Policies
-- ============================================

ALTER TABLE public.vouchers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voucher_usage ENABLE ROW LEVEL SECURITY;

-- Vouchers: Admin can do everything
CREATE POLICY vouchers_admin_all
  ON public.vouchers
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

-- Vouchers: Customers can only read active vouchers
CREATE POLICY vouchers_customer_read
  ON public.vouchers
  FOR SELECT
  TO authenticated
  USING (
    is_active = true 
    AND valid_from <= NOW() 
    AND valid_until >= NOW()
  );

-- Voucher Usage: Users can only see their own usage
CREATE POLICY voucher_usage_user_read
  ON public.voucher_usage
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Voucher Usage: Admin can see all
CREATE POLICY voucher_usage_admin_all
  ON public.voucher_usage
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );


-- PHASE 7: Grant permissions
-- ============================================

GRANT SELECT ON public.vouchers TO authenticated;
GRANT SELECT ON public.voucher_usage TO authenticated;
GRANT EXECUTE ON FUNCTION public.validate_and_reserve_voucher TO authenticated;
GRANT EXECUTE ON FUNCTION public.release_voucher_quota TO authenticated;


-- ============================================
-- Migration Complete
-- ============================================;
