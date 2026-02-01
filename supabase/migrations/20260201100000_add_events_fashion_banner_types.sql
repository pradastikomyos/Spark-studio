-- Add 'events', 'fashion', and 'beauty' to banner_type enum
-- Note: Remote DB already has these values, this migration ensures consistency
ALTER TABLE public.banners 
DROP CONSTRAINT IF EXISTS banners_banner_type_check;

ALTER TABLE public.banners 
ADD CONSTRAINT banners_banner_type_check 
CHECK (banner_type IN ('hero', 'stage', 'promo', 'events', 'fashion', 'beauty'));

-- Update comment
COMMENT ON TABLE public.banners IS 'Stores banner images for hero sliders, stage carousels, events, fashion, beauty, and promotional content';
