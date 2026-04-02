-- Canonical timestamp restored to match the migration history already recorded
-- in the linked Supabase project. The same SQL previously existed locally under
-- 20260402184500, which created migration drift between repo and remote.
--
-- Align product soft-delete semantics with active-only uniqueness.
-- This migration also purges the current backlog of soft-deleted products
-- after asserting they are not referenced by transactional or editorial tables.

DO $$
DECLARE
  v_duplicate_slug TEXT;
  v_duplicate_sku TEXT;
  v_blocking_deleted_count INTEGER;
BEGIN
  SELECT slug
  INTO v_duplicate_slug
  FROM public.products
  WHERE deleted_at IS NULL
  GROUP BY slug
  HAVING COUNT(*) > 1
  LIMIT 1;

  IF v_duplicate_slug IS NOT NULL THEN
    RAISE EXCEPTION 'Cannot switch products.slug to active-only uniqueness; duplicate active slug found: %', v_duplicate_slug;
  END IF;

  SELECT sku
  INTO v_duplicate_sku
  FROM public.products
  WHERE deleted_at IS NULL
  GROUP BY sku
  HAVING COUNT(*) > 1
  LIMIT 1;

  IF v_duplicate_sku IS NOT NULL THEN
    RAISE EXCEPTION 'Cannot switch products.sku to active-only uniqueness; duplicate active SKU found: %', v_duplicate_sku;
  END IF;

  WITH deleted_products AS (
    SELECT id
    FROM public.products
    WHERE deleted_at IS NOT NULL
  ),
  blocked_products AS (
    SELECT DISTINCT dp.id
    FROM deleted_products dp
    LEFT JOIN public.product_variants pv
      ON pv.product_id = dp.id
    LEFT JOIN public.order_product_items opi
      ON opi.product_variant_id = pv.id
    LEFT JOIN public.stock_reservations sr
      ON sr.product_variant_id = pv.id
    LEFT JOIN public.product_reviews prv
      ON prv.product_id = dp.id OR prv.product_variant_id = pv.id
    LEFT JOIN public.dressing_room_look_items drli
      ON drli.product_variant_id = pv.id
    LEFT JOIN public.beauty_poster_tags bpt
      ON bpt.product_variant_id = pv.id
    LEFT JOIN public.discount_products dpr
      ON dpr.product_id = dp.id
    WHERE opi.id IS NOT NULL
       OR sr.id IS NOT NULL
       OR prv.id IS NOT NULL
       OR drli.id IS NOT NULL
       OR bpt.id IS NOT NULL
       OR dpr.id IS NOT NULL
  )
  SELECT COUNT(*)
  INTO v_blocking_deleted_count
  FROM blocked_products;

  IF v_blocking_deleted_count > 0 THEN
    RAISE EXCEPTION 'Refusing to purge soft-deleted products; % blocked rows still have downstream references', v_blocking_deleted_count;
  END IF;
END;
$$;

DELETE FROM public.products
WHERE deleted_at IS NOT NULL;

ALTER TABLE public.products
  DROP CONSTRAINT IF EXISTS products_slug_unique;

ALTER TABLE public.products
  DROP CONSTRAINT IF EXISTS products_sku_unique;

DROP INDEX IF EXISTS public.products_slug_unique;
DROP INDEX IF EXISTS public.products_sku_unique;

CREATE UNIQUE INDEX IF NOT EXISTS products_slug_active_unique
  ON public.products USING btree (slug)
  WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS products_sku_active_unique
  ON public.products USING btree (sku)
  WHERE deleted_at IS NULL;

CREATE OR REPLACE FUNCTION public.soft_delete_product_cascade(
  p_product_id bigint,
  p_deleted_at timestamp with time zone DEFAULT now()
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_deleted_at timestamp without time zone := timezone('UTC', COALESCE(p_deleted_at, now()));
  v_product_exists boolean := false;
BEGIN
  IF NOT (public.is_admin() OR auth.role() = 'service_role') THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  SELECT EXISTS(
    SELECT 1
    FROM public.products
    WHERE id = p_product_id
  )
  INTO v_product_exists;

  IF NOT v_product_exists THEN
    RAISE EXCEPTION 'product % not found', p_product_id;
  END IF;

  UPDATE public.products
  SET deleted_at = COALESCE(deleted_at, v_deleted_at),
      is_active = false
  WHERE id = p_product_id;

  UPDATE public.product_variants pv
  SET is_active = false
  WHERE pv.product_id = p_product_id
    AND pv.is_active = true;
END;
$function$;
