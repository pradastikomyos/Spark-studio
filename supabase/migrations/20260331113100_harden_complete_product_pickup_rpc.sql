REVOKE ALL ON FUNCTION public.complete_product_pickup_atomic(TEXT, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.complete_product_pickup_atomic(TEXT, UUID) FROM anon;
REVOKE ALL ON FUNCTION public.complete_product_pickup_atomic(TEXT, UUID) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.complete_product_pickup_atomic(TEXT, UUID) TO service_role;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'order_product_items'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.order_product_items;
  END IF;
END
$$;
