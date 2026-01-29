-- ============================================================================
-- PRODUCT SCHEMA REFACTOR MIGRATION
-- ============================================================================
-- Purpose: Simplify product schema by consolidating type into categories
--          and merging online/offline pricing into single price field
-- Date: 2026-01-29
-- 
-- Changes:
-- 1. Add default categories (Fashion, Beauty, Other) if they don't exist
-- 2. Migrate products.type → categories (update category_id)
-- 3. Add product_variants.price column
-- 4. Migrate online_price/offline_price → price (prefer online, fallback offline)
-- 5. Drop online_price and offline_price columns
-- 6. Drop type column from products
-- 7. Update indexes and constraints
--
-- SAFE TO RUN: Uses staged migration approach
-- ============================================================================

-- ============================================================================
-- PHASE 1: ADD DEFAULT CATEGORIES
-- ============================================================================

INSERT INTO public.categories (name, slug, is_active, created_at, updated_at)
VALUES 
  ('Fashion', 'fashion', true, NOW(), NOW()),
  ('Beauty', 'beauty', true, NOW(), NOW()),
  ('Other', 'other', true, NOW(), NOW())
ON CONFLICT (slug) DO NOTHING;


-- ============================================================================
-- PHASE 2: MIGRATE PRODUCTS.TYPE TO CATEGORY_ID
-- ============================================================================

-- Update products with type='fashion' to Fashion category (only if category_id is null)
UPDATE public.products p
SET category_id = c.id, updated_at = NOW()
FROM public.categories c
WHERE c.slug = 'fashion'
  AND p.type = 'fashion'
  AND p.category_id IS NULL;

-- Update products with type='beauty' to Beauty category (only if category_id is null)
UPDATE public.products p
SET category_id = c.id, updated_at = NOW()
FROM public.categories c
WHERE c.slug = 'beauty'
  AND p.type = 'beauty'
  AND p.category_id IS NULL;

-- Update products with type='other' to Other category (only if category_id is null)
UPDATE public.products p
SET category_id = c.id, updated_at = NOW()
FROM public.categories c
WHERE c.slug = 'other'
  AND p.type = 'other'
  AND p.category_id IS NULL;


-- ============================================================================
-- PHASE 3: ADD PRICE COLUMN TO PRODUCT_VARIANTS
-- ============================================================================

ALTER TABLE public.product_variants 
ADD COLUMN IF NOT EXISTS price DECIMAL(10,2);

CREATE INDEX IF NOT EXISTS product_variants_price_idx ON public.product_variants(price);


-- ============================================================================
-- PHASE 4: MIGRATE PRICING DATA
-- ============================================================================

-- Migrate pricing: prefer online_price, fallback to offline_price
UPDATE public.product_variants
SET price = COALESCE(
  CASE WHEN online_price IS NOT NULL AND online_price > 0 THEN online_price ELSE NULL END,
  CASE WHEN offline_price IS NOT NULL AND offline_price > 0 THEN offline_price ELSE NULL END,
  0
);


-- ============================================================================
-- PHASE 5: DROP OLD COLUMNS
-- ============================================================================

ALTER TABLE public.product_variants 
DROP COLUMN IF EXISTS online_price,
DROP COLUMN IF EXISTS offline_price;

ALTER TABLE public.products 
DROP COLUMN IF EXISTS type;

DROP INDEX IF EXISTS product_variants_online_price_idx;
DROP INDEX IF EXISTS product_variants_offline_price_idx;


-- ============================================================================
-- PHASE 6: ADD CONSTRAINTS AND OPTIMIZE
-- ============================================================================

-- Make category_id NOT NULL (all products must have category)
ALTER TABLE public.products 
ALTER COLUMN category_id SET NOT NULL;

-- Add check constraint: price must be >= 0
ALTER TABLE public.product_variants
ADD CONSTRAINT product_variants_price_check CHECK (price >= 0);

-- Create composite index for common queries
CREATE INDEX IF NOT EXISTS product_variants_product_price_idx 
ON public.product_variants(product_id, price) 
WHERE is_active = true;
