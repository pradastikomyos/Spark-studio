-- Enable Supabase Realtime (Postgres Changes) for tables used by the frontend listeners,
-- and harden state-mutating SECURITY DEFINER RPCs so they cannot be executed by anon/authenticated.
--
-- Notes:
-- - We intentionally scope hardening to capacity + stock reservation RPCs only.
-- - Publication changes are idempotent (safe to re-run).

-- -----------------------------------------------------------------------------
-- 1) Ensure supabase_realtime publication exists
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication
    WHERE pubname = 'supabase_realtime'
  ) THEN
    EXECUTE 'CREATE PUBLICATION supabase_realtime';
  END IF;
END
$$;

-- -----------------------------------------------------------------------------
-- 2) Add tables to supabase_realtime publication (idempotent)
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  tables text[] := ARRAY[
    'public.tickets',
    'public.ticket_availabilities',
    'public.reservations',
    'public.orders',
    'public.purchased_tickets',
    'public.products',
    'public.product_variants',
    'public.product_images',
    'public.categories',
    'public.order_products',
    'public.stage_scans'
  ];
  t text;
  schema_name text;
  table_name text;
BEGIN
  FOREACH t IN ARRAY tables
  LOOP
    schema_name := split_part(t, '.', 1);
    table_name := split_part(t, '.', 2);

    IF NOT EXISTS (
      SELECT 1
      FROM pg_publication_tables ppt
      WHERE pubname = 'supabase_realtime'
        AND ppt.schemaname = schema_name
        AND ppt.tablename = table_name
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE %I.%I', schema_name, table_name);
    END IF;
  END LOOP;
END
$$;

-- -----------------------------------------------------------------------------
-- 3) Harden capacity/stock reservation RPCs (idempotent)
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  -- Ticket capacity reservation RPCs
  IF EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'reserve_ticket_capacity'
  ) THEN
    REVOKE EXECUTE ON FUNCTION public.reserve_ticket_capacity(bigint, date, text, integer) FROM PUBLIC;
    REVOKE EXECUTE ON FUNCTION public.reserve_ticket_capacity(bigint, date, text, integer) FROM anon;
    REVOKE EXECUTE ON FUNCTION public.reserve_ticket_capacity(bigint, date, text, integer) FROM authenticated;
    GRANT EXECUTE ON FUNCTION public.reserve_ticket_capacity(bigint, date, text, integer) TO service_role;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'release_ticket_capacity'
  ) THEN
    REVOKE EXECUTE ON FUNCTION public.release_ticket_capacity(bigint, date, text, integer) FROM PUBLIC;
    REVOKE EXECUTE ON FUNCTION public.release_ticket_capacity(bigint, date, text, integer) FROM anon;
    REVOKE EXECUTE ON FUNCTION public.release_ticket_capacity(bigint, date, text, integer) FROM authenticated;
    GRANT EXECUTE ON FUNCTION public.release_ticket_capacity(bigint, date, text, integer) TO service_role;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'finalize_ticket_capacity'
  ) THEN
    REVOKE EXECUTE ON FUNCTION public.finalize_ticket_capacity(bigint, date, text, integer) FROM PUBLIC;
    REVOKE EXECUTE ON FUNCTION public.finalize_ticket_capacity(bigint, date, text, integer) FROM anon;
    REVOKE EXECUTE ON FUNCTION public.finalize_ticket_capacity(bigint, date, text, integer) FROM authenticated;
    GRANT EXECUTE ON FUNCTION public.finalize_ticket_capacity(bigint, date, text, integer) TO service_role;
  END IF;

  -- Product stock reservation RPCs
  IF EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'reserve_product_stock'
  ) THEN
    REVOKE EXECUTE ON FUNCTION public.reserve_product_stock(bigint, integer) FROM PUBLIC;
    REVOKE EXECUTE ON FUNCTION public.reserve_product_stock(bigint, integer) FROM anon;
    REVOKE EXECUTE ON FUNCTION public.reserve_product_stock(bigint, integer) FROM authenticated;
    GRANT EXECUTE ON FUNCTION public.reserve_product_stock(bigint, integer) TO service_role;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'release_product_stock'
  ) THEN
    REVOKE EXECUTE ON FUNCTION public.release_product_stock(bigint, integer) FROM PUBLIC;
    REVOKE EXECUTE ON FUNCTION public.release_product_stock(bigint, integer) FROM anon;
    REVOKE EXECUTE ON FUNCTION public.release_product_stock(bigint, integer) FROM authenticated;
    GRANT EXECUTE ON FUNCTION public.release_product_stock(bigint, integer) TO service_role;
  END IF;
END
$$;
;
