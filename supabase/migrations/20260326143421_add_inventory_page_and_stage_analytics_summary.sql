-- Historical note: this migration name was reused later by
-- 20260326190000_add_inventory_page_and_stage_analytics_summary.sql.
-- Keep both files for ordering history; do not rename the earlier file.
CREATE OR REPLACE FUNCTION public.list_inventory_product_page(
  p_search_query TEXT DEFAULT '',
  p_category_slug TEXT DEFAULT '',
  p_stock_filter TEXT DEFAULT '',
  p_page INTEGER DEFAULT 1,
  p_page_size INTEGER DEFAULT 24
)
RETURNS TABLE(
  product_id BIGINT,
  total_count BIGINT
)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  WITH filtered_products AS (
    SELECT
      p.id,
      p.name,
      COALESCE(
        SUM(
          CASE
            WHEN pv.is_active = false THEN 0
            ELSE GREATEST(COALESCE(pv.stock, 0) - COALESCE(pv.reserved_stock, 0), 0)
          END
        ),
        0
      ) AS available_stock
    FROM public.products p
    LEFT JOIN public.categories c
      ON c.id = p.category_id
    LEFT JOIN public.product_variants pv
      ON pv.product_id = p.id
    WHERE p.deleted_at IS NULL
      AND (
        COALESCE(p_search_query, '') = ''
        OR p.name ILIKE '%' || p_search_query || '%'
        OR p.sku ILIKE '%' || p_search_query || '%'
      )
      AND (
        COALESCE(p_category_slug, '') = ''
        OR c.slug = p_category_slug
      )
    GROUP BY p.id, p.name
  ),
  stock_filtered_products AS (
    SELECT
      id,
      name
    FROM filtered_products
    WHERE COALESCE(p_stock_filter, '') NOT IN ('in', 'low', 'out')
      OR (p_stock_filter = 'in' AND available_stock > 0)
      OR (p_stock_filter = 'low' AND available_stock > 0 AND available_stock <= 10)
      OR (p_stock_filter = 'out' AND available_stock <= 0)
  )
  SELECT
    id AS product_id,
    COUNT(*) OVER () AS total_count
  FROM stock_filtered_products
  ORDER BY name ASC, id ASC
  LIMIT GREATEST(COALESCE(p_page_size, 24), 1)
  OFFSET (GREATEST(COALESCE(p_page, 1), 1) - 1) * GREATEST(COALESCE(p_page_size, 24), 1);
$$;

CREATE OR REPLACE FUNCTION public.get_stage_analytics_summary(
  p_time_filter TEXT DEFAULT 'all'
)
RETURNS TABLE(
  stage_id INTEGER,
  stage_code VARCHAR,
  stage_name VARCHAR,
  stage_zone VARCHAR,
  total_scans BIGINT,
  period_scans BIGINT,
  prev_period_scans BIGINT
)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  WITH bounds AS (
    SELECT
      CASE
        WHEN p_time_filter = 'weekly' THEN NOW() - INTERVAL '7 days'
        WHEN p_time_filter = 'monthly' THEN NOW() - INTERVAL '30 days'
        ELSE NULL
      END AS current_start,
      CASE
        WHEN p_time_filter = 'weekly' THEN NOW() - INTERVAL '14 days'
        WHEN p_time_filter = 'monthly' THEN NOW() - INTERVAL '60 days'
        ELSE NULL
      END AS prev_start
  )
  SELECT
    s.id AS stage_id,
    s.code AS stage_code,
    s.name AS stage_name,
    s.zone AS stage_zone,
    COUNT(ss.id) AS total_scans,
    COUNT(ss.id) FILTER (
      WHERE p_time_filter = 'all'
        OR (
          bounds.current_start IS NOT NULL
          AND ss.scanned_at >= bounds.current_start
        )
    ) AS period_scans,
    COUNT(ss.id) FILTER (
      WHERE bounds.prev_start IS NOT NULL
        AND bounds.current_start IS NOT NULL
        AND ss.scanned_at >= bounds.prev_start
        AND ss.scanned_at < bounds.current_start
    ) AS prev_period_scans
  FROM public.stages s
  CROSS JOIN bounds
  LEFT JOIN public.stage_scans ss
    ON ss.stage_id = s.id
  GROUP BY
    s.id,
    s.code,
    s.name,
    s.zone,
    bounds.current_start,
    bounds.prev_start
  ORDER BY period_scans DESC, s.id ASC;
$$;;
