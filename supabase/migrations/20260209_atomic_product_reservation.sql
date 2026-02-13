-- Migration: Atomic Product Stock Reservation
-- Purpose: Add RPC functions for atomic stock reservation to prevent overselling

-- ============================================================================
-- reserve_product_stock: Atomically reserve stock for a product variant
-- Returns TRUE if successful, FALSE if insufficient stock
-- ============================================================================
CREATE OR REPLACE FUNCTION public.reserve_product_stock(
  p_variant_id BIGINT,
  p_quantity INTEGER
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_quantity IS NULL OR p_quantity <= 0 THEN
    RETURN FALSE;
  END IF;

  -- Atomic: UPDATE only succeeds if available stock >= requested
  UPDATE public.product_variants
  SET 
    reserved_stock = reserved_stock + p_quantity,
    updated_at = now()
  WHERE id = p_variant_id
    AND is_active = TRUE
    AND (stock - reserved_stock) >= p_quantity;

  RETURN FOUND;
END;
$$;
-- ============================================================================
-- release_product_stock: Release previously reserved stock
-- Used for rollback when order creation fails or order expires
-- ============================================================================
CREATE OR REPLACE FUNCTION public.release_product_stock(
  p_variant_id BIGINT,
  p_quantity INTEGER
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_quantity IS NULL OR p_quantity <= 0 THEN
    RETURN FALSE;
  END IF;

  UPDATE public.product_variants
  SET 
    reserved_stock = GREATEST(reserved_stock - p_quantity, 0),
    updated_at = now()
  WHERE id = p_variant_id;

  RETURN FOUND;
END;
$$;
-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.reserve_product_stock(BIGINT, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.release_product_stock(BIGINT, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_product_stock(BIGINT, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION public.release_product_stock(BIGINT, INTEGER) TO service_role;
