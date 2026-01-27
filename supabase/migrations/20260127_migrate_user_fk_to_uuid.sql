-- ============================================
-- Migration: User FK to UUID
-- Date: 2026-01-27
-- Description: Migrate all user_id foreign keys from bigint to UUID
-- ============================================

-- PHASE 2.1: Create mapping table
-- ============================================

CREATE TABLE IF NOT EXISTS public.user_id_mapping (
  old_id BIGINT PRIMARY KEY,
  new_id UUID NOT NULL REFERENCES auth.users(id),
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Populate mapping from public.users → auth.users
INSERT INTO public.user_id_mapping (old_id, new_id, email)
SELECT 
  pu.id as old_id,
  au.id as new_id,
  au.email
FROM public.users pu
INNER JOIN auth.users au ON pu.email = au.email
ON CONFLICT (old_id) DO NOTHING;

-- Verify mapping
DO $$
DECLARE
  mapping_count INT;
  users_count INT;
BEGIN
  SELECT COUNT(*) INTO mapping_count FROM public.user_id_mapping;
  SELECT COUNT(*) INTO users_count FROM public.users;
  
  IF mapping_count != users_count THEN
    RAISE EXCEPTION 'Mapping incomplete: % mapped out of % users', mapping_count, users_count;
  END IF;
  
  RAISE NOTICE 'Mapping complete: % users mapped', mapping_count;
END $$;


-- PHASE 2.2: Migrate orders.user_id
-- ============================================

-- Add new UUID column
ALTER TABLE orders ADD COLUMN IF NOT EXISTS user_id_new UUID;

-- Populate with mapped UUIDs
UPDATE orders o
SET user_id_new = m.new_id
FROM public.user_id_mapping m
WHERE o.user_id = m.old_id;

-- Verify no NULLs
DO $$
DECLARE
  null_count INT;
BEGIN
  SELECT COUNT(*) INTO null_count FROM orders WHERE user_id_new IS NULL;
  
  IF null_count > 0 THEN
    RAISE EXCEPTION 'Found % orders with NULL user_id_new', null_count;
  END IF;
  
  RAISE NOTICE 'All orders.user_id mapped successfully';
END $$;

-- Drop old FK constraint
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_user_id_foreign;

-- Drop old column
ALTER TABLE orders DROP COLUMN IF EXISTS user_id;

-- Rename new column
ALTER TABLE orders RENAME COLUMN user_id_new TO user_id;

-- Add FK constraint to auth.users
ALTER TABLE orders
  ADD CONSTRAINT orders_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Create index
CREATE INDEX IF NOT EXISTS orders_user_id_idx ON orders(user_id);


-- PHASE 2.3: Migrate order_products.user_id
-- ============================================

ALTER TABLE order_products ADD COLUMN IF NOT EXISTS user_id_new UUID;

UPDATE order_products op
SET user_id_new = m.new_id
FROM public.user_id_mapping m
WHERE op.user_id = m.old_id;

DO $$
DECLARE
  null_count INT;
BEGIN
  SELECT COUNT(*) INTO null_count FROM order_products WHERE user_id_new IS NULL;
  IF null_count > 0 THEN
    RAISE EXCEPTION 'Found % order_products with NULL user_id_new', null_count;
  END IF;
  RAISE NOTICE 'All order_products.user_id mapped successfully';
END $$;

ALTER TABLE order_products DROP CONSTRAINT IF EXISTS order_products_user_id_foreign;
ALTER TABLE order_products DROP COLUMN IF EXISTS user_id;
ALTER TABLE order_products RENAME COLUMN user_id_new TO user_id;

ALTER TABLE order_products
  ADD CONSTRAINT order_products_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS order_products_user_id_idx ON order_products(user_id);


-- PHASE 2.4: Migrate purchased_tickets.user_id
-- ============================================

ALTER TABLE purchased_tickets ADD COLUMN IF NOT EXISTS user_id_new UUID;

UPDATE purchased_tickets pt
SET user_id_new = m.new_id
FROM public.user_id_mapping m
WHERE pt.user_id = m.old_id;

DO $$
DECLARE
  null_count INT;
BEGIN
  SELECT COUNT(*) INTO null_count FROM purchased_tickets WHERE user_id_new IS NULL;
  IF null_count > 0 THEN
    RAISE EXCEPTION 'Found % purchased_tickets with NULL user_id_new', null_count;
  END IF;
  RAISE NOTICE 'All purchased_tickets.user_id mapped successfully';
END $$;

ALTER TABLE purchased_tickets DROP CONSTRAINT IF EXISTS purchased_tickets_user_id_foreign;
ALTER TABLE purchased_tickets DROP COLUMN IF EXISTS user_id;
ALTER TABLE purchased_tickets RENAME COLUMN user_id_new TO user_id;

ALTER TABLE purchased_tickets
  ADD CONSTRAINT purchased_tickets_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS purchased_tickets_user_id_idx ON purchased_tickets(user_id);


-- PHASE 2.5: Migrate reservations.user_id
-- ============================================

ALTER TABLE reservations ADD COLUMN IF NOT EXISTS user_id_new UUID;

UPDATE reservations r
SET user_id_new = m.new_id
FROM public.user_id_mapping m
WHERE r.user_id = m.old_id;

DO $$
DECLARE
  null_count INT;
BEGIN
  SELECT COUNT(*) INTO null_count FROM reservations WHERE user_id_new IS NULL;
  IF null_count > 0 THEN
    RAISE EXCEPTION 'Found % reservations with NULL user_id_new', null_count;
  END IF;
  RAISE NOTICE 'All reservations.user_id mapped successfully';
END $$;

ALTER TABLE reservations DROP CONSTRAINT IF EXISTS reservations_user_id_foreign;
ALTER TABLE reservations DROP COLUMN IF EXISTS user_id;
ALTER TABLE reservations RENAME COLUMN user_id_new TO user_id;

ALTER TABLE reservations
  ADD CONSTRAINT reservations_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS reservations_user_id_idx ON reservations(user_id);


-- PHASE 2.6: Migrate user_addresses.user_id
-- ============================================

ALTER TABLE user_addresses ADD COLUMN IF NOT EXISTS user_id_new UUID;

UPDATE user_addresses ua
SET user_id_new = m.new_id
FROM public.user_id_mapping m
WHERE ua.user_id = m.old_id;

DO $$
DECLARE
  null_count INT;
BEGIN
  SELECT COUNT(*) INTO null_count FROM user_addresses WHERE user_id_new IS NULL;
  IF null_count > 0 THEN
    RAISE EXCEPTION 'Found % user_addresses with NULL user_id_new', null_count;
  END IF;
  RAISE NOTICE 'All user_addresses.user_id mapped successfully';
END $$;

ALTER TABLE user_addresses DROP CONSTRAINT IF EXISTS user_addresses_user_id_foreign;
ALTER TABLE user_addresses DROP COLUMN IF EXISTS user_id;
ALTER TABLE user_addresses RENAME COLUMN user_id_new TO user_id;

ALTER TABLE user_addresses
  ADD CONSTRAINT user_addresses_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS user_addresses_user_id_idx ON user_addresses(user_id);


-- PHASE 2.7: Migrate shipping_voucher_usage.user_id
-- ============================================

ALTER TABLE shipping_voucher_usage ADD COLUMN IF NOT EXISTS user_id_new UUID;

UPDATE shipping_voucher_usage svu
SET user_id_new = m.new_id
FROM public.user_id_mapping m
WHERE svu.user_id = m.old_id;

DO $$
DECLARE
  null_count INT;
BEGIN
  SELECT COUNT(*) INTO null_count FROM shipping_voucher_usage WHERE user_id_new IS NULL;
  IF null_count > 0 THEN
    RAISE EXCEPTION 'Found % shipping_voucher_usage with NULL user_id_new', null_count;
  END IF;
  RAISE NOTICE 'All shipping_voucher_usage.user_id mapped successfully';
END $$;

ALTER TABLE shipping_voucher_usage DROP CONSTRAINT IF EXISTS shipping_voucher_usage_user_id_foreign;
ALTER TABLE shipping_voucher_usage DROP COLUMN IF EXISTS user_id;
ALTER TABLE shipping_voucher_usage RENAME COLUMN user_id_new TO user_id;

ALTER TABLE shipping_voucher_usage
  ADD CONSTRAINT shipping_voucher_usage_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS shipping_voucher_usage_user_id_idx ON shipping_voucher_usage(user_id);


-- PHASE 2.8: Migrate product_reviews.user_id
-- ============================================

ALTER TABLE product_reviews ADD COLUMN IF NOT EXISTS user_id_new UUID;

UPDATE product_reviews pr
SET user_id_new = m.new_id
FROM public.user_id_mapping m
WHERE pr.user_id = m.old_id;

DO $$
DECLARE
  null_count INT;
BEGIN
  SELECT COUNT(*) INTO null_count FROM product_reviews WHERE user_id_new IS NULL;
  IF null_count > 0 THEN
    RAISE EXCEPTION 'Found % product_reviews with NULL user_id_new', null_count;
  END IF;
  RAISE NOTICE 'All product_reviews.user_id mapped successfully';
END $$;

ALTER TABLE product_reviews DROP CONSTRAINT IF EXISTS product_reviews_user_id_foreign;
ALTER TABLE product_reviews DROP COLUMN IF EXISTS user_id;
ALTER TABLE product_reviews RENAME COLUMN user_id_new TO user_id;

ALTER TABLE product_reviews
  ADD CONSTRAINT product_reviews_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS product_reviews_user_id_idx ON product_reviews(user_id);


-- PHASE 2.9: Migrate ticket_reviews.user_id
-- ============================================

ALTER TABLE ticket_reviews ADD COLUMN IF NOT EXISTS user_id_new UUID;

UPDATE ticket_reviews tr
SET user_id_new = m.new_id
FROM public.user_id_mapping m
WHERE tr.user_id = m.old_id;

DO $$
DECLARE
  null_count INT;
BEGIN
  SELECT COUNT(*) INTO null_count FROM ticket_reviews WHERE user_id_new IS NULL;
  IF null_count > 0 THEN
    RAISE EXCEPTION 'Found % ticket_reviews with NULL user_id_new', null_count;
  END IF;
  RAISE NOTICE 'All ticket_reviews.user_id mapped successfully';
END $$;

ALTER TABLE ticket_reviews DROP CONSTRAINT IF EXISTS ticket_reviews_user_id_foreign;
ALTER TABLE ticket_reviews DROP COLUMN IF EXISTS user_id;
ALTER TABLE ticket_reviews RENAME COLUMN user_id_new TO user_id;

ALTER TABLE ticket_reviews
  ADD CONSTRAINT ticket_reviews_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS ticket_reviews_user_id_idx ON ticket_reviews(user_id);


-- PHASE 2.10: Migrate order_products.picked_up_by
-- ============================================
-- Note: This is also a user_id FK but with different column name

ALTER TABLE order_products ADD COLUMN IF NOT EXISTS picked_up_by_new UUID;

UPDATE order_products op
SET picked_up_by_new = m.new_id
FROM public.user_id_mapping m
WHERE op.picked_up_by = m.old_id;

-- Allow NULLs here (not all orders are picked up yet)
ALTER TABLE order_products DROP CONSTRAINT IF EXISTS order_products_picked_up_by_fkey;
ALTER TABLE order_products DROP COLUMN IF EXISTS picked_up_by;
ALTER TABLE order_products RENAME COLUMN picked_up_by_new TO picked_up_by;

ALTER TABLE order_products
  ADD CONSTRAINT order_products_picked_up_by_fkey
  FOREIGN KEY (picked_up_by) REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS order_products_picked_up_by_idx ON order_products(picked_up_by);


-- PHASE 2.11: Final verification
-- ============================================

DO $$
DECLARE
  orphaned_count INT;
BEGIN
  -- Check for orphaned orders
  SELECT COUNT(*) INTO orphaned_count
  FROM orders o
  LEFT JOIN auth.users au ON o.user_id = au.id
  WHERE au.id IS NULL;
  
  IF orphaned_count > 0 THEN
    RAISE EXCEPTION 'Found % orphaned orders', orphaned_count;
  END IF;
  
  -- Check for orphaned purchased_tickets
  SELECT COUNT(*) INTO orphaned_count
  FROM purchased_tickets pt
  LEFT JOIN auth.users au ON pt.user_id = au.id
  WHERE au.id IS NULL;
  
  IF orphaned_count > 0 THEN
    RAISE EXCEPTION 'Found % orphaned purchased_tickets', orphaned_count;
  END IF;
  
  RAISE NOTICE 'Migration verification passed: No orphaned records';
END $$;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'UUID Migration Phase 2 COMPLETED';
  RAISE NOTICE 'All user_id columns migrated to UUID';
  RAISE NOTICE 'All FK constraints point to auth.users.id';
  RAISE NOTICE '========================================';
END $$;
