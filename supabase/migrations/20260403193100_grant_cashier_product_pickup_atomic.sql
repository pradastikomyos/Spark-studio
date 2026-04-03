DO $$
BEGIN
  EXECUTE 'REVOKE ALL ON FUNCTION public.complete_cashier_product_pickup_atomic(TEXT, UUID) FROM PUBLIC';
  EXECUTE 'REVOKE ALL ON FUNCTION public.complete_cashier_product_pickup_atomic(TEXT, UUID) FROM anon';
  EXECUTE 'REVOKE ALL ON FUNCTION public.complete_cashier_product_pickup_atomic(TEXT, UUID) FROM authenticated';
  EXECUTE 'GRANT EXECUTE ON FUNCTION public.complete_cashier_product_pickup_atomic(TEXT, UUID) TO service_role';
END
$$;
