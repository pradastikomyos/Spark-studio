-- Add 'events' and 'fashion' to banner_type enum
ALTER TABLE public.banners 
DROP CONSTRAINT IF EXISTS banners_banner_type_check;

ALTER TABLE public.banners 
ADD CONSTRAINT banners_banner_type_check 
CHECK (banner_type IN ('hero', 'stage', 'promo', 'events', 'fashion'));

-- Update comment
COMMENT ON TABLE public.banners IS 'Stores banner images for hero sliders, stage carousels, events, fashion, and promotional content';
