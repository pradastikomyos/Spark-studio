-- Allow vouchers to match parent categories (e.g. Aksesoris -> Bangle)
-- Updates validate_and_reserve_voucher to include ancestor category IDs.

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
  v_category_ids BIGINT[];
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
    -- Build product category + ancestor category set
    IF p_category_ids IS NOT NULL AND array_length(p_category_ids, 1) > 0 THEN
      WITH RECURSIVE category_tree AS (
        SELECT id, parent_id
        FROM public.categories
        WHERE id = ANY(p_category_ids)
        UNION
        SELECT c.id, c.parent_id
        FROM public.categories c
        JOIN category_tree ct ON ct.parent_id = c.id
      )
      SELECT ARRAY_AGG(DISTINCT id) INTO v_category_ids FROM category_tree;
    ELSE
      v_category_ids := ARRAY[]::BIGINT[];
    END IF;

    -- Check if any product category (or its parent) matches voucher categories
    IF v_category_ids IS NULL OR array_length(v_category_ids, 1) IS NULL OR NOT EXISTS (
      SELECT 1 
      FROM unnest(v_category_ids) AS cat_id
      WHERE cat_id = ANY(v_voucher.applicable_categories::BIGINT[])
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
;
