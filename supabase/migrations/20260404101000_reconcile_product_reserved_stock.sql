WITH final_product_orders AS (
  SELECT id, status, payment_status
  FROM public.order_products
  WHERE lower(coalesce(status, '')) IN ('cancelled', 'expired')
    AND stock_released_at IS NULL
)
UPDATE public.order_products op
SET stock_released_at = coalesce(op.updated_at, now()),
    updated_at = coalesce(op.updated_at, now())
FROM final_product_orders fpo
WHERE op.id = fpo.id;

WITH expected_reserved AS (
  SELECT
    opi.product_variant_id,
    COALESCE(SUM(GREATEST(opi.quantity, 0)), 0)::INTEGER AS reserved_qty
  FROM public.order_product_items opi
  JOIN public.order_products op
    ON op.id = opi.order_product_id
  WHERE lower(coalesce(op.status, '')) NOT IN ('cancelled', 'expired', 'completed')
  GROUP BY opi.product_variant_id
)
UPDATE public.product_variants pv
SET reserved_stock = COALESCE(er.reserved_qty, 0),
    updated_at = now()
FROM (
  SELECT pv_inner.id, er_inner.reserved_qty
  FROM public.product_variants pv_inner
  LEFT JOIN expected_reserved er_inner
    ON er_inner.product_variant_id = pv_inner.id
) er
WHERE pv.id = er.id
  AND COALESCE(pv.reserved_stock, 0) <> COALESCE(er.reserved_qty, 0);
