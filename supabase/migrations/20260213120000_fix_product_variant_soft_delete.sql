-- Fix product variant soft delete + SKU uniqueness
-- Rollback plan (manual):
-- 1) DROP TRIGGER trg_products_soft_delete_cascade ON public.products;
-- 2) DROP FUNCTION public.tg_products_soft_delete_cascade();
-- 3) DROP FUNCTION public.soft_delete_product_cascade(bigint, timestamptz);
-- 4) DROP FUNCTION public.cleanup_zombie_variants();
-- 5) DROP INDEX IF EXISTS public.product_variants_sku_active_unique;
-- 6) Recreate unique constraint on product_variants(sku) if needed.

-- Drop any existing UNIQUE constraint/index on product_variants.sku
DO $$
DECLARE
  constraint_name text;
BEGIN
  SELECT c.conname INTO constraint_name
  FROM pg_constraint c
  JOIN pg_class t ON t.oid = c.conrelid
  JOIN pg_namespace n ON n.oid = t.relnamespace
  JOIN unnest(c.conkey) WITH ORDINALITY AS cols(attnum, ord) ON true
  JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = cols.attnum
  WHERE n.nspname = 'public'
    AND t.relname = 'product_variants'
    AND c.contype = 'u'
  GROUP BY c.conname
  HAVING array_agg(a.attname ORDER BY cols.ord) = ARRAY['sku']
  LIMIT 1;

  IF constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.product_variants DROP CONSTRAINT IF EXISTS %I', constraint_name);
  END IF;
END $$;

DO $$
DECLARE
  idx_name text;
BEGIN
  SELECT i.relname INTO idx_name
  FROM pg_class t
  JOIN pg_namespace n ON n.oid = t.relnamespace
  JOIN pg_index ix ON ix.indrelid = t.oid
  JOIN pg_class i ON i.oid = ix.indexrelid
  JOIN unnest(ix.indkey) WITH ORDINALITY AS cols(attnum, ord) ON true
  JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = cols.attnum
  WHERE n.nspname = 'public'
    AND t.relname = 'product_variants'
    AND ix.indisunique = true
  GROUP BY i.relname
  HAVING array_agg(a.attname ORDER BY cols.ord) = ARRAY['sku']
  LIMIT 1;

  IF idx_name IS NOT NULL THEN
    EXECUTE format('DROP INDEX IF EXISTS public.%I', idx_name);
  END IF;
END $$;

-- One-time cleanup: deactivate variants belonging to soft-deleted products
UPDATE public.product_variants pv
SET is_active = false,
    sku = pv.sku || '_DEL_' || EXTRACT(EPOCH FROM COALESCE(p.deleted_at, now()))::bigint
FROM public.products p
WHERE p.id = pv.product_id
  AND p.deleted_at IS NOT NULL
  AND pv.is_active = true;

-- Enforce SKU uniqueness only for active variants
CREATE UNIQUE INDEX IF NOT EXISTS product_variants_sku_active_unique
  ON public.product_variants(sku)
  WHERE is_active = true;

-- Cascade soft delete to variants when product is deleted
CREATE OR REPLACE FUNCTION public.soft_delete_product_cascade(
  p_product_id bigint,
  p_deleted_at timestamptz DEFAULT now()
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (public.is_admin() OR auth.role() = 'service_role') THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  UPDATE public.product_variants pv
  SET is_active = false,
      sku = pv.sku || '_DEL_' || EXTRACT(EPOCH FROM COALESCE(p_deleted_at, now()))::bigint
  WHERE pv.product_id = p_product_id
    AND pv.is_active = true;
END;
$$;

REVOKE ALL ON FUNCTION public.soft_delete_product_cascade(bigint, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.soft_delete_product_cascade(bigint, timestamptz) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.cleanup_zombie_variants()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  updated_count integer;
BEGIN
  IF NOT (public.is_admin() OR auth.role() = 'service_role') THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  UPDATE public.product_variants pv
  SET is_active = false,
      sku = pv.sku || '_DEL_' || EXTRACT(EPOCH FROM COALESCE(p.deleted_at, now()))::bigint
  FROM public.products p
  WHERE p.id = pv.product_id
    AND p.deleted_at IS NOT NULL
    AND pv.is_active = true;

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$;

REVOKE ALL ON FUNCTION public.cleanup_zombie_variants() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cleanup_zombie_variants() TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.tg_products_soft_delete_cascade()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.deleted_at IS NULL THEN
    RETURN NEW;
  END IF;

  PERFORM public.soft_delete_product_cascade(NEW.id, NEW.deleted_at);
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.tg_products_soft_delete_cascade() FROM PUBLIC;

DROP TRIGGER IF EXISTS trg_products_soft_delete_cascade ON public.products;
CREATE TRIGGER trg_products_soft_delete_cascade
AFTER UPDATE OF deleted_at ON public.products
FOR EACH ROW
WHEN (NEW.deleted_at IS NOT NULL AND (OLD.deleted_at IS DISTINCT FROM NEW.deleted_at))
EXECUTE FUNCTION public.tg_products_soft_delete_cascade();
