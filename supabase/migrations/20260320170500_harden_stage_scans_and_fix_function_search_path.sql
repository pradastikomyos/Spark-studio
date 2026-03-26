CREATE OR REPLACE FUNCTION public.update_events_schedule_items_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = public;
CREATE OR REPLACE FUNCTION public.update_vouchers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = public;
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
  SELECT *
  INTO v_voucher
  FROM public.vouchers
  WHERE code = UPPER(TRIM(p_code))
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT NULL::UUID, NULL::TEXT, NULL::NUMERIC, NULL::NUMERIC, 'Kode voucher tidak valid'::TEXT;
    RETURN;
  END IF;

  IF v_voucher.is_active = false THEN
    RETURN QUERY SELECT NULL::UUID, NULL::TEXT, NULL::NUMERIC, NULL::NUMERIC, 'Voucher tidak aktif'::TEXT;
    RETURN;
  END IF;

  IF v_now < v_voucher.valid_from THEN
    RETURN QUERY SELECT NULL::UUID, NULL::TEXT, NULL::NUMERIC, NULL::NUMERIC, 'Voucher belum berlaku'::TEXT;
    RETURN;
  END IF;

  IF v_now > v_voucher.valid_until THEN
    RETURN QUERY SELECT NULL::UUID, NULL::TEXT, NULL::NUMERIC, NULL::NUMERIC, 'Voucher sudah kadaluarsa'::TEXT;
    RETURN;
  END IF;

  IF v_voucher.used_count >= v_voucher.quota THEN
    RETURN QUERY SELECT NULL::UUID, NULL::TEXT, NULL::NUMERIC, NULL::NUMERIC, 'Kuota voucher habis'::TEXT;
    RETURN;
  END IF;

  IF v_voucher.min_purchase IS NOT NULL AND p_subtotal < v_voucher.min_purchase THEN
    RETURN QUERY SELECT
      NULL::UUID,
      NULL::TEXT,
      NULL::NUMERIC,
      NULL::NUMERIC,
      FORMAT('Minimum pembelian Rp %s', v_voucher.min_purchase)::TEXT;
    RETURN;
  END IF;

  IF v_voucher.applicable_categories IS NOT NULL AND array_length(v_voucher.applicable_categories, 1) > 0 THEN
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

    IF v_category_ids IS NULL
      OR array_length(v_category_ids, 1) IS NULL
      OR NOT EXISTS (
        SELECT 1
        FROM unnest(v_category_ids) AS cat_id
        WHERE cat_id = ANY(v_voucher.applicable_categories::BIGINT[])
      ) THEN
      RETURN QUERY SELECT NULL::UUID, NULL::TEXT, NULL::NUMERIC, NULL::NUMERIC, 'Voucher tidak berlaku untuk kategori produk ini'::TEXT;
      RETURN;
    END IF;
  END IF;

  IF v_voucher.discount_type = 'percentage' THEN
    v_calculated_discount := ROUND(p_subtotal * (v_voucher.discount_value / 100), 0);

    IF v_voucher.max_discount IS NOT NULL AND v_calculated_discount > v_voucher.max_discount THEN
      v_calculated_discount := v_voucher.max_discount;
    END IF;
  ELSE
    v_calculated_discount := LEAST(v_voucher.discount_value, p_subtotal);
  END IF;

  v_calculated_discount := LEAST(v_calculated_discount, p_subtotal);

  UPDATE public.vouchers
  SET used_count = used_count + 1
  WHERE id = v_voucher.id;

  RETURN QUERY SELECT
    v_voucher.id::UUID,
    v_voucher.discount_type::TEXT,
    v_voucher.discount_value::NUMERIC,
    v_calculated_discount::NUMERIC,
    NULL::TEXT;
END;
$$ LANGUAGE plpgsql
SET search_path = public;
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
$$ LANGUAGE plpgsql
SET search_path = public;
DROP POLICY IF EXISTS "Admins can view all scans" ON public.stage_scans;
CREATE POLICY "Admins can view all scans"
  ON public.stage_scans
  FOR SELECT
  TO public
  USING (public.is_admin());
DROP POLICY IF EXISTS "Anyone can create scans" ON public.stage_scans;
DROP POLICY IF EXISTS "Public can record active stage scans" ON public.stage_scans;
CREATE POLICY "Public can record active stage scans"
  ON public.stage_scans
  FOR INSERT
  TO public
  WITH CHECK (
    purchased_ticket_id IS NULL
    AND scanned_at >= NOW() - INTERVAL '10 minutes'
    AND scanned_at <= NOW() + INTERVAL '1 minute'
    AND EXISTS (
      SELECT 1
      FROM public.stages
      WHERE public.stages.id = stage_id
        AND public.stages.status = 'active'
    )
  );
CREATE INDEX IF NOT EXISTS idx_stage_scans_stage_id_scanned_at
  ON public.stage_scans(stage_id, scanned_at DESC);
