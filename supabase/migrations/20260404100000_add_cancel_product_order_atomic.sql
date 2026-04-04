CREATE OR REPLACE FUNCTION public.cancel_product_order_atomic(
  p_order_number TEXT,
  p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order_number TEXT := btrim(coalesce(p_order_number, ''));
  v_now TIMESTAMPTZ := now();
  v_order public.order_products%ROWTYPE;
  v_item RECORD;
  v_variant RECORD;
  v_variant_ids BIGINT[] := ARRAY[]::BIGINT[];
  v_quantities INTEGER[] := ARRAY[]::INTEGER[];
  v_idx INTEGER;
BEGIN
  IF v_order_number = '' THEN
    RETURN jsonb_build_object(
      'ok', false,
      'code', 'missing_order_number',
      'message', 'Missing order number'
    );
  END IF;

  IF p_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'ok', false,
      'code', 'missing_user_id',
      'message', 'Missing user id'
    );
  END IF;

  SELECT *
  INTO v_order
  FROM public.order_products
  WHERE order_number = v_order_number
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'ok', false,
      'code', 'order_not_found',
      'message', 'Order not found'
    );
  END IF;

  IF v_order.user_id IS DISTINCT FROM p_user_id THEN
    RETURN jsonb_build_object(
      'ok', false,
      'code', 'forbidden',
      'message', 'Forbidden'
    );
  END IF;

  IF lower(coalesce(v_order.payment_status, '')) = 'paid' THEN
    RETURN jsonb_build_object(
      'ok', true,
      'result', 'noop',
      'reason', 'already_paid',
      'order_number', v_order.order_number
    );
  END IF;

  IF lower(coalesce(v_order.status, '')) IN ('cancelled', 'expired') THEN
    RETURN jsonb_build_object(
      'ok', true,
      'result', 'noop',
      'reason', 'already_final',
      'order_number', v_order.order_number
    );
  END IF;

  FOR v_item IN
    SELECT
      product_variant_id,
      SUM(GREATEST(quantity, 0))::INTEGER AS quantity
    FROM public.order_product_items
    WHERE order_product_id = v_order.id
    GROUP BY product_variant_id
    ORDER BY product_variant_id
  LOOP
    IF v_item.product_variant_id IS NULL OR coalesce(v_item.quantity, 0) <= 0 THEN
      CONTINUE;
    END IF;

    SELECT id, reserved_stock
    INTO v_variant
    FROM public.product_variants
    WHERE id = v_item.product_variant_id
    FOR UPDATE;

    IF FOUND THEN
      v_variant_ids := array_append(v_variant_ids, v_item.product_variant_id::BIGINT);
      v_quantities := array_append(
        v_quantities,
        LEAST(
          GREATEST(coalesce(v_variant.reserved_stock, 0), 0),
          v_item.quantity
        )::INTEGER
      );
    END IF;
  END LOOP;

  FOR v_idx IN 1 .. coalesce(array_length(v_variant_ids, 1), 0)
  LOOP
    IF coalesce(v_quantities[v_idx], 0) <= 0 THEN
      CONTINUE;
    END IF;

    UPDATE public.product_variants
    SET reserved_stock = GREATEST(reserved_stock - v_quantities[v_idx], 0),
        updated_at = v_now
    WHERE id = v_variant_ids[v_idx];
  END LOOP;

  IF v_order.voucher_id IS NOT NULL THEN
    PERFORM public.release_voucher_quota(v_order.voucher_id);
  END IF;

  UPDATE public.order_products
  SET status = 'cancelled',
      pickup_status = 'cancelled',
      stock_released_at = coalesce(stock_released_at, v_now),
      updated_at = v_now
  WHERE id = v_order.id;

  RETURN jsonb_build_object(
    'ok', true,
    'result', 'cancelled',
    'order_number', v_order.order_number,
    'order_id', v_order.id,
    'stock_released_at', v_now
  );
END;
$$;
