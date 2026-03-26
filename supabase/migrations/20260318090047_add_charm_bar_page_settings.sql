CREATE TABLE IF NOT EXISTS public.charm_bar_page_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hero_image_url TEXT NOT NULL DEFAULT '/images/Charm%20Bar%20assets/43620168072.png',
  quick_links JSONB NOT NULL DEFAULT '[
    {"title":"ITALIAN BRACELET","description":"Choose your base bracelet in silver, gold, or rose gold.","image_url":"/images/Charm%20Bar%20assets/CHARM%20VISUAL%201.png","href":"/shop"},
    {"title":"BEST-SELLERS","description":"Most-loved charm combinations from the current edit.","image_url":"/images/Charm%20Bar%20assets/CHARM%20VISUAL%203.png","href":"/shop"},
    {"title":"WHAT''S NEW","description":"Fresh arrivals to build the latest bracelet stack.","image_url":"/images/Charm%20Bar%20assets/CHARM%20VISUAL%202.png","href":"/shop"},
    {"title":"GOLDEN CHARMS","description":"Warm metallic accents for a brighter custom look.","image_url":"/images/Charm%20Bar%20assets/CHARM%20VISUAL%203.png","href":"/shop"},
    {"title":"SILVER CHARMS","description":"Classic silver pieces for a cleaner charm story.","image_url":"/images/Charm%20Bar%20assets/CHARM%20VISUAL%202.png","href":"/shop"}
  ]'::jsonb,
  customize_title TEXT NOT NULL DEFAULT 'CUSTOMIZE YOUR BRACELET',
  steps JSONB NOT NULL DEFAULT '[
    {"title":"1 - CHOOSE YOUR BRACELET","body":"Choose your bracelet: silver, gold, or rose gold. A bracelet is made up of 18 links without charms and adapts to your wrist by removing or adding links.","image_url":"/images/Charm%20Bar%20assets/CHARM%20VISUAL%201.png","cta_label":"ITALIAN BRACELET","cta_href":"/shop"},
    {"title":"2 - ADD YOUR CHARMS","body":"Option 1: Start with a blank bracelet and a few charms. Option 2: Choose 16 to 20 charms, depending on your wrist size, for a complete bracelet.","image_url":"/images/Charm%20Bar%20assets/CHARM%20VISUAL%202.png","cta_label":"ALL OUR CHARMS","cta_href":"/shop"},
    {"title":"3 - ASSEMBLE AND WEAR YOUR BRACELET","body":"Secure your charms by replacing the bracelet links. Tip: our tool can help you with assembly for a clean, finished look.","image_url":"/images/Charm%20Bar%20assets/CHARM%20VISUAL%203.png","cta_label":"OUR BEST SELLERS","cta_href":"/shop"}
  ]'::jsonb,
  video_intro_text TEXT NOT NULL DEFAULT 'SEE ONE. CLIP ONE. WEAR ONE.',
  video_cards JSONB NOT NULL DEFAULT '[
    {"title":"DIY CHARM 1","video_url":"/images/Charm%20Bar%20assets/DIY%20CHARM%201.mp4"},
    {"title":"DIY CHARM 2","video_url":"/images/Charm%20Bar%20assets/DIY%20CHARM%202.mp4"},
    {"title":"DIY CHARM 3","video_url":"/images/Charm%20Bar%20assets/DIY%20CHARM%203.mp4"}
  ]'::jsonb,
  how_it_works_title TEXT NOT NULL DEFAULT 'HOW DOES IT WORKS?',
  how_it_works_intro TEXT NOT NULL DEFAULT 'Adding and removing charms is easy.',
  how_it_works_steps JSONB NOT NULL DEFAULT '[
    "Open the individual links using our charm tool.",
    "Select a charm and attach it to the bracelet.",
    "Close the bracelet and wear your new Italian charm bracelet."
  ]'::jsonb,
  how_it_works_video_url TEXT NOT NULL DEFAULT '/images/Charm%20Bar%20assets/DIY%20CHARM%202.mp4',
  how_it_works_cta_label TEXT NOT NULL DEFAULT 'EXPLORE THE COLLECTION',
  how_it_works_cta_href TEXT NOT NULL DEFAULT '/shop',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO public.charm_bar_page_settings (id)
SELECT gen_random_uuid()
WHERE NOT EXISTS (SELECT 1 FROM public.charm_bar_page_settings);

CREATE OR REPLACE FUNCTION public.update_charm_bar_page_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_charm_bar_page_settings_updated_at ON public.charm_bar_page_settings;
CREATE TRIGGER trigger_charm_bar_page_settings_updated_at
  BEFORE UPDATE ON public.charm_bar_page_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_charm_bar_page_settings_updated_at();

ALTER TABLE public.charm_bar_page_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read charm bar page settings" ON public.charm_bar_page_settings;
CREATE POLICY "Public read charm bar page settings"
  ON public.charm_bar_page_settings
  FOR SELECT
  TO public
  USING (true);

DROP POLICY IF EXISTS "Admin full access for charm bar page settings" ON public.charm_bar_page_settings;
CREATE POLICY "Admin full access for charm bar page settings"
  ON public.charm_bar_page_settings
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

INSERT INTO storage.buckets (id, name, public)
VALUES ('charm-bar-assets', 'charm-bar-assets', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public can view charm bar assets" ON storage.objects;
CREATE POLICY "Public can view charm bar assets"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'charm-bar-assets');

DROP POLICY IF EXISTS "Admins can upload charm bar assets" ON storage.objects;
CREATE POLICY "Admins can upload charm bar assets"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'charm-bar-assets' AND public.is_admin());

DROP POLICY IF EXISTS "Admins can update charm bar assets" ON storage.objects;
CREATE POLICY "Admins can update charm bar assets"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'charm-bar-assets' AND public.is_admin())
  WITH CHECK (bucket_id = 'charm-bar-assets' AND public.is_admin());

DROP POLICY IF EXISTS "Admins can delete charm bar assets" ON storage.objects;
CREATE POLICY "Admins can delete charm bar assets"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'charm-bar-assets' AND public.is_admin());;
