CREATE OR REPLACE FUNCTION public.expire_product_order_atomic(
  p_order_id BIGINT,
  p_now TIMESTAMPTZ DEFAULT now()
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now TIMESTAMPTZ := coalesce(p_now, now());
  v_order public.order_products%ROWTYPE;
  v_item RECORD;
  v_variant RECORD;
  v_variant_ids BIGINT[] := ARRAY[]::BIGINT[];
  v_quantities INTEGER[] := ARRAY[]::INTEGER[];
  v_idx INTEGER;
  v_is_cashier_pending BOOLEAN;
  v_is_paid_pickup_expired BOOLEAN;
BEGIN
  IF p_order_id IS NULL THEN
    RETURN jsonb_build_object(
      'ok', false,
      'code', 'missing_order_id',
      'message', 'Missing order id'
    );
  END IF;

  SELECT *
  INTO v_order
  FROM public.order_products
  WHERE id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'ok', true,
      'result', 'noop',
      'reason', 'order_not_found',
      'order_id', p_order_id
    );
  END IF;

  IF lower(coalesce(v_order.status, '')) IN ('cancelled', 'expired', 'completed') THEN
    RETURN jsonb_build_object(
      'ok', true,
      'result', 'noop',
      'reason', 'already_final',
      'order_number', v_order.order_number,
      'order_id', v_order.id
    );
  END IF;

  v_is_cashier_pending :=
    lower(coalesce(v_order.channel, '')) = 'cashier'
    AND lower(coalesce(v_order.payment_status, '')) IN ('unpaid', 'pending')
    AND lower(coalesce(v_order.pickup_status, '')) IN ('pending', 'pending_pickup')
    AND v_order.pickup_expires_at IS NOT NULL
    AND v_order.pickup_expires_at < v_now;

  v_is_paid_pickup_expired :=
    lower(coalesce(v_order.payment_status, '')) = 'paid'
    AND lower(coalesce(v_order.pickup_status, '')) IN ('pending', 'pending_pickup', 'pending_review')
    AND v_order.pickup_expires_at IS NOT NULL
    AND v_order.pickup_expires_at < v_now;

  IF NOT (v_is_cashier_pending OR v_is_paid_pickup_expired) THEN
    RETURN jsonb_build_object(
      'ok', true,
      'result', 'noop',
      'reason', 'not_eligible',
      'order_number', v_order.order_number,
      'order_id', v_order.id
    );
  END IF;

  IF v_order.stock_released_at IS NULL THEN
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
  END IF;

  IF v_is_cashier_pending AND v_order.voucher_id IS NOT NULL THEN
    PERFORM public.release_voucher_quota(v_order.voucher_id);
  END IF;

  UPDATE public.order_products
  SET pickup_status = 'expired',
      status = 'expired',
      expired_at = coalesce(expired_at, v_now),
      stock_released_at = coalesce(stock_released_at, v_now),
      updated_at = v_now
  WHERE id = v_order.id;

  RETURN jsonb_build_object(
    'ok', true,
    'result', 'expired',
    'order_number', v_order.order_number,
    'order_id', v_order.id,
    'stock_released_at', coalesce(v_order.stock_released_at, v_now)
  );
END;
$$;
