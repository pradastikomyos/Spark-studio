DO $$
BEGIN
  EXECUTE 'REVOKE ALL ON FUNCTION public.cancel_product_order_atomic(TEXT, UUID) FROM PUBLIC';
  EXECUTE 'REVOKE ALL ON FUNCTION public.cancel_product_order_atomic(TEXT, UUID) FROM anon';
  EXECUTE 'REVOKE ALL ON FUNCTION public.cancel_product_order_atomic(TEXT, UUID) FROM authenticated';
  EXECUTE 'GRANT EXECUTE ON FUNCTION public.cancel_product_order_atomic(TEXT, UUID) TO service_role';

  EXECUTE 'REVOKE ALL ON FUNCTION public.expire_product_order_atomic(BIGINT, TIMESTAMPTZ) FROM PUBLIC';
  EXECUTE 'REVOKE ALL ON FUNCTION public.expire_product_order_atomic(BIGINT, TIMESTAMPTZ) FROM anon';
  EXECUTE 'REVOKE ALL ON FUNCTION public.expire_product_order_atomic(BIGINT, TIMESTAMPTZ) FROM authenticated';
  EXECUTE 'GRANT EXECUTE ON FUNCTION public.expire_product_order_atomic(BIGINT, TIMESTAMPTZ) TO service_role';
END $$;
