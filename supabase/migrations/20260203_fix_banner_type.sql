-- Migration to consolidate 'fashion' and 'beauty' banner types into 'shop'
-- Run this in your Supabase SQL Editor

-- 1. Drop the existing check constraint validation (to allow modifications)
ALTER TABLE public.banners 
DROP CONSTRAINT IF EXISTS banners_banner_type_check;

-- 2. If 'banner_type' is an ENUM, we need to add 'shop'. 
-- We wrap this in a DO block to safely ignore if it's not an ENUM or if 'shop' already exists.
DO $$
BEGIN
    BEGIN
        ALTER TYPE banner_type ADD VALUE 'shop';
    EXCEPTION
        WHEN duplicate_object THEN NULL; -- 'shop' already exists
        WHEN undefined_object THEN NULL; -- banner_type is not an enum
    END;
END $$;

-- 3. Update existing data: Convert 'fashion' and 'beauty' banners to 'shop'
UPDATE public.banners 
SET banner_type = 'shop' 
WHERE banner_type IN ('fashion', 'beauty');

-- 4. Add the new check constraint with the updated allowed values
ALTER TABLE public.banners 
ADD CONSTRAINT banners_banner_type_check 
CHECK (banner_type IN ('hero', 'stage', 'promo', 'events', 'shop'));
