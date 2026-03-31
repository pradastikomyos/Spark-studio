-- Atomically complete product pickup and ensure the admin Product Orders view
-- can receive realtime invalidations for order item changes as well.

CREATE OR REPLACE FUNCTION public.complete_product_pickup_atomic(
  p_pickup_code TEXT,
  p_picked_up_by UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pickup_code TEXT := upper(btrim(coalesce(p_pickup_code, '')));
  v_now TIMESTAMPTZ := now();
  v_order public.order_products%ROWTYPE;
  v_item RECORD;
  v_variant RECORD;
  v_variant_ids BIGINT[] := ARRAY[]::BIGINT[];
  v_quantities INTEGER[] := ARRAY[]::INTEGER[];
  v_idx INTEGER;
BEGIN
  IF v_pickup_code = '' THEN
    RETURN jsonb_build_object(
      'ok', false,
      'code', 'missing_pickup_code',
      'message', 'Missing pickup code'
    );
  END IF;

  IF p_picked_up_by IS NULL THEN
    RETURN jsonb_build_object(
      'ok', false,
      'code', 'missing_picked_up_by',
      'message', 'Missing picked up by user'
    );
  END IF;

  SELECT *
  INTO v_order
  FROM public.order_products
  WHERE pickup_code = v_pickup_code
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'ok', false,
      'code', 'order_not_found',
      'message', 'Order not found'
    );
  END IF;

  IF lower(coalesce(v_order.pickup_status, '')) = 'completed' THEN
    RETURN jsonb_build_object(
      'ok', false,
      'code', 'already_completed',
      'message', 'Order already completed'
    );
  END IF;

  IF lower(coalesce(v_order.pickup_status, '')) = 'cancelled' THEN
    RETURN jsonb_build_object(
      'ok', false,
      'code', 'pickup_cancelled',
      'message', 'Pickup already cancelled'
    );
  END IF;

  IF v_order.pickup_expires_at IS NOT NULL AND v_order.pickup_expires_at < v_now THEN
    UPDATE public.order_products
    SET pickup_status = 'expired',
        updated_at = v_now
    WHERE id = v_order.id
      AND coalesce(pickup_status, '') <> 'expired';

    RETURN jsonb_build_object(
      'ok', false,
      'code', 'pickup_expired',
      'message', 'Pickup code expired'
    );
  END IF;

  IF lower(coalesce(v_order.payment_status, '')) <> 'paid' THEN
    RETURN jsonb_build_object(
      'ok', false,
      'code', 'order_not_paid',
      'message', 'Order not paid'
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
      RETURN jsonb_build_object(
        'ok', false,
        'code', 'invalid_order_item',
        'message', 'Order item is invalid'
      );
    END IF;

    SELECT id, stock, reserved_stock
    INTO v_variant
    FROM public.product_variants
    WHERE id = v_item.product_variant_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RETURN jsonb_build_object(
        'ok', false,
        'code', 'variant_not_found',
        'message', 'Variant not found'
      );
    END IF;

    IF coalesce(v_variant.reserved_stock, 0) < v_item.quantity OR coalesce(v_variant.stock, 0) < v_item.quantity THEN
      RETURN jsonb_build_object(
        'ok', false,
        'code', 'insufficient_stock',
        'message', format('Insufficient stock for variant %s', v_item.product_variant_id)
      );
    END IF;

    v_variant_ids := array_append(v_variant_ids, v_item.product_variant_id::BIGINT);
    v_quantities := array_append(v_quantities, v_item.quantity::INTEGER);
  END LOOP;

  IF coalesce(array_length(v_variant_ids, 1), 0) = 0 THEN
    RETURN jsonb_build_object(
      'ok', false,
      'code', 'no_order_items',
      'message', 'Order items not found'
    );
  END IF;

  FOR v_idx IN 1 .. array_length(v_variant_ids, 1)
  LOOP
    UPDATE public.product_variants
    SET stock = stock - v_quantities[v_idx],
        reserved_stock = GREATEST(reserved_stock - v_quantities[v_idx], 0),
        updated_at = v_now
    WHERE id = v_variant_ids[v_idx];
  END LOOP;

  UPDATE public.order_products
  SET pickup_status = 'completed',
      picked_up_at = v_now,
      picked_up_by = p_picked_up_by,
      status = 'completed',
      updated_at = v_now
  WHERE id = v_order.id;

  RETURN jsonb_build_object(
    'ok', true,
    'orderId', v_order.id,
    'pickupCode', v_pickup_code,
    'pickupStatus', 'completed'
  );
END;
$$;
