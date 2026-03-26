CREATE TABLE IF NOT EXISTS public.glam_page_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hero_title TEXT NOT NULL DEFAULT 'Glam Makeup',
  hero_description TEXT NOT NULL DEFAULT 'Craft a luminous signature look with Spark''s curated glam direction, polished textures, and camera-ready finishing touches for every close-up.',
  hero_image_url TEXT NOT NULL DEFAULT '/images/glam%20page%20assets/VISUAL%201.png',
  look_heading TEXT NOT NULL DEFAULT 'Get The Look',
  look_model_image_url TEXT NOT NULL DEFAULT '/images/glam%20page%20assets/ChatGPT_Image_10_Mar_2026__21.13.39-removebg-preview.png',
  product_section_title TEXT NOT NULL DEFAULT 'Charm Bar',
  product_search_placeholder TEXT NOT NULL DEFAULT 'Search products...',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO public.glam_page_settings (id)
SELECT gen_random_uuid()
WHERE NOT EXISTS (SELECT 1 FROM public.glam_page_settings);

CREATE OR REPLACE FUNCTION public.update_glam_page_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_glam_page_settings_updated_at ON public.glam_page_settings;
CREATE TRIGGER trigger_glam_page_settings_updated_at
  BEFORE UPDATE ON public.glam_page_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_glam_page_settings_updated_at();

ALTER TABLE public.glam_page_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read glam page settings" ON public.glam_page_settings;
CREATE POLICY "Public read glam page settings"
  ON public.glam_page_settings
  FOR SELECT
  TO public
  USING (true);

DROP POLICY IF EXISTS "Admin full access for glam page settings" ON public.glam_page_settings;
CREATE POLICY "Admin full access for glam page settings"
  ON public.glam_page_settings
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());;
