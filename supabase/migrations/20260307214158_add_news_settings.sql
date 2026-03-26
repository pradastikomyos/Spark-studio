CREATE TABLE IF NOT EXISTS public.news_page_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Section 1
  section_1_category TEXT NOT NULL DEFAULT 'FASHION',
  section_1_title TEXT NOT NULL DEFAULT 'HOW TO DRESS LIKE A STAR - GIRL?',
  section_1_excerpt TEXT NOT NULL DEFAULT 'FROM FEATHER TOPS TO SAINT LAURENT HAND BAGS.',
  section_1_description TEXT NOT NULL DEFAULT 'They''re the ysl girlies, with black nails and smokey eyes, glitter lovers. Usually spotted in Upper East Side leaving a party or listening to the weeknd. Learn everything about their lifestyle.',
  section_1_author TEXT NOT NULL DEFAULT 'By Amélie Schiffer',
  section_1_image TEXT NOT NULL DEFAULT '',

  -- Section 2
  section_2_title TEXT NOT NULL DEFAULT 'SHE A COLD-HEARTED B!TCH WITH NO SHAME',
  section_2_subtitle1 TEXT NOT NULL DEFAULT 'Escape from LA',
  section_2_subtitle2 TEXT NOT NULL DEFAULT '(THE WEEKEND)',
  section_2_quotes TEXT NOT NULL DEFAULT 'SHE GOT *CHROME .. HEARTS* HANGIN'' FROM HER NECK',
  section_2_image TEXT NOT NULL DEFAULT '',

  -- Section 3
  section_3_title TEXT NOT NULL DEFAULT 'HER ESSENTIALS !',
  section_3_products JSONB NOT NULL DEFAULT '[{"image": "", "brand": "YVES SAINT LAURENT", "name": "ROUGE PUR COUTURE THE SLIM #1966", "price": "$39.00 USD", "link": "#"}, {"image": "", "brand": "TOM FORD", "name": "TOBACCO VANILLE EAU DE PARFUM (50ML)", "price": "$400.00 USD", "link": "#"}]'::jsonb,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- Insert default row if not exists
INSERT INTO public.news_page_settings (id)
SELECT gen_random_uuid()
WHERE NOT EXISTS (SELECT 1 FROM public.news_page_settings);
-- updated_at trigger
CREATE OR REPLACE FUNCTION public.update_news_page_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trigger_news_page_settings_updated_at ON public.news_page_settings;
CREATE TRIGGER trigger_news_page_settings_updated_at
  BEFORE UPDATE ON public.news_page_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_news_page_settings_updated_at();
-- RLS
ALTER TABLE public.news_page_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read news page settings" ON public.news_page_settings;
CREATE POLICY "Public read news page settings"
  ON public.news_page_settings
  FOR SELECT
  TO public
  USING (true);
DROP POLICY IF EXISTS "Admin full access for news page settings" ON public.news_page_settings;
CREATE POLICY "Admin full access for news page settings"
  ON public.news_page_settings
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
