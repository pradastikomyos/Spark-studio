-- ============================================
-- Migration: Fix FK Constraints and RLS Policies
-- Date: 2026-01-28
-- Description: 
--   1. Drop invalid FK constraints (orphaned, foreign_table_name = NULL)
--   2. Recreate proper FK constraints to auth.users(id) with CASCADE
--   3. Clean up duplicate RLS policies on profiles table
--   4. Follow Supabase best practices from official documentation
-- ============================================

-- PHASE 1: Drop Invalid FK Constraints
-- ============================================
-- These constraints exist but are invalid (foreign_table_name = NULL)
-- They were created during manual migration via MCP

DO $$ 
BEGIN
  -- Drop invalid FK on purchased_tickets
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'purchased_tickets_user_id_fkey' 
    AND table_name = 'purchased_tickets'
  ) THEN
    ALTER TABLE purchased_tickets DROP CONSTRAINT purchased_tickets_user_id_fkey;
    RAISE NOTICE 'Dropped invalid FK: purchased_tickets_user_id_fkey';
  END IF;

  -- Drop invalid FK on orders
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'orders_user_id_fkey' 
    AND table_name = 'orders'
  ) THEN
    ALTER TABLE orders DROP CONSTRAINT orders_user_id_fkey;
    RAISE NOTICE 'Dropped invalid FK: orders_user_id_fkey';
  END IF;

  -- Drop invalid FK on order_products (user_id)
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'order_products_user_id_fkey' 
    AND table_name = 'order_products'
  ) THEN
    ALTER TABLE order_products DROP CONSTRAINT order_products_user_id_fkey;
    RAISE NOTICE 'Dropped invalid FK: order_products_user_id_fkey';
  END IF;

  -- Drop invalid FK on order_products (picked_up_by)
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'order_products_picked_up_by_fkey' 
    AND table_name = 'order_products'
  ) THEN
    ALTER TABLE order_products DROP CONSTRAINT order_products_picked_up_by_fkey;
    RAISE NOTICE 'Dropped invalid FK: order_products_picked_up_by_fkey';
  END IF;

  -- Drop invalid FK on reservations
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'reservations_user_id_fkey' 
    AND table_name = 'reservations'
  ) THEN
    ALTER TABLE reservations DROP CONSTRAINT reservations_user_id_fkey;
    RAISE NOTICE 'Dropped invalid FK: reservations_user_id_fkey';
  END IF;
END $$;


-- PHASE 2: Recreate Valid FK Constraints
-- ============================================
-- Following Supabase best practices:
-- - Reference auth.users(id) PRIMARY KEY only (not unique constraints)
-- - Use ON DELETE CASCADE for data integrity
-- - Use ON DELETE SET NULL for optional references

-- purchased_tickets.user_id → auth.users(id)
ALTER TABLE purchased_tickets
  ADD CONSTRAINT purchased_tickets_user_id_fkey
  FOREIGN KEY (user_id) 
  REFERENCES auth.users(id) 
  ON DELETE CASCADE;

-- orders.user_id → auth.users(id)
ALTER TABLE orders
  ADD CONSTRAINT orders_user_id_fkey
  FOREIGN KEY (user_id) 
  REFERENCES auth.users(id) 
  ON DELETE CASCADE;

-- order_products.user_id → auth.users(id)
ALTER TABLE order_products
  ADD CONSTRAINT order_products_user_id_fkey
  FOREIGN KEY (user_id) 
  REFERENCES auth.users(id) 
  ON DELETE CASCADE;

-- order_products.picked_up_by → auth.users(id) (optional, can be NULL)
ALTER TABLE order_products
  ADD CONSTRAINT order_products_picked_up_by_fkey
  FOREIGN KEY (picked_up_by) 
  REFERENCES auth.users(id) 
  ON DELETE SET NULL;

-- reservations.user_id → auth.users(id)
ALTER TABLE reservations
  ADD CONSTRAINT reservations_user_id_fkey
  FOREIGN KEY (user_id) 
  REFERENCES auth.users(id) 
  ON DELETE CASCADE;

-- Create indexes for FK columns (performance best practice)
CREATE INDEX IF NOT EXISTS purchased_tickets_user_id_idx ON purchased_tickets(user_id);
CREATE INDEX IF NOT EXISTS orders_user_id_idx ON orders(user_id);
CREATE INDEX IF NOT EXISTS order_products_user_id_idx ON order_products(user_id);
CREATE INDEX IF NOT EXISTS order_products_picked_up_by_idx ON order_products(picked_up_by);
CREATE INDEX IF NOT EXISTS reservations_user_id_idx ON reservations(user_id);


-- PHASE 3: Clean Up Duplicate RLS Policies
-- ============================================
-- Remove duplicate and overly permissive policies on profiles table

DO $$
BEGIN
  -- Drop duplicate "Users can view own profile" (keep "Users can view their own profile")
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'profiles' 
    AND policyname = 'Users can view own profile'
  ) THEN
    DROP POLICY "Users can view own profile" ON profiles;
    RAISE NOTICE 'Dropped duplicate policy: Users can view own profile';
  END IF;

  -- Drop duplicate "Users can update own profile" (keep "Users can update their own profile")
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'profiles' 
    AND policyname = 'Users can update own profile'
  ) THEN
    DROP POLICY "Users can update own profile" ON profiles;
    RAISE NOTICE 'Dropped duplicate policy: Users can update own profile';
  END IF;

  -- Drop overly permissive policy (keep "Service role has full access" which is more specific)
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'profiles' 
    AND policyname = 'Service role can do anything'
  ) THEN
    DROP POLICY "Service role can do anything" ON profiles;
    RAISE NOTICE 'Dropped overly permissive policy: Service role can do anything';
  END IF;
END $$;


-- PHASE 4: Verification
-- ============================================

DO $$
DECLARE
  orphaned_count INT;
BEGIN
  -- Verify no orphaned records
  SELECT COUNT(*) INTO orphaned_count
  FROM purchased_tickets pt
  LEFT JOIN auth.users au ON pt.user_id = au.id
  WHERE pt.user_id IS NOT NULL AND au.id IS NULL;
  
  IF orphaned_count > 0 THEN
    RAISE WARNING 'Found % orphaned purchased_tickets records', orphaned_count;
  ELSE
    RAISE NOTICE 'No orphaned records found';
  END IF;

  RAISE NOTICE '========================================';
  RAISE NOTICE 'FK Constraints Fix COMPLETED';
  RAISE NOTICE 'All FK constraints now properly reference auth.users(id)';
  RAISE NOTICE 'RLS policies cleaned up';
  RAISE NOTICE 'Following Supabase best practices';
  RAISE NOTICE '========================================';
END $$;
