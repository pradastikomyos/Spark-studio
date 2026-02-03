-- Simple fix for "400 Bad Request" on Banners
-- Run this in Supabase SQL Editor

-- 1. Remove the old restriction
ALTER TABLE public.banners DROP CONSTRAINT IF EXISTS banners_banner_type_check;

-- 2. Update your existing banners
-- (Safe to run even if you have no fashion/beauty banners)
UPDATE public.banners SET banner_type = 'shop' WHERE banner_type = 'fashion' OR banner_type = 'beauty';

-- 3. Add the new restriction including 'shop'
ALTER TABLE public.banners ADD CONSTRAINT banners_banner_type_check 
CHECK (banner_type IN ('hero', 'stage', 'promo', 'events', 'shop'));
