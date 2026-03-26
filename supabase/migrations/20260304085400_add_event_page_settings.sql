CREATE TABLE IF NOT EXISTS public.event_page_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hero_images TEXT[] NOT NULL DEFAULT '{}',
  magic_title TEXT NOT NULL DEFAULT 'CAPTURING your MAGIC MOMENT',
  magic_description TEXT NOT NULL DEFAULT 'Hey, I''m Jonny Lou, luxury and destination wedding photographer. I''m a storyteller with a camera, capturing the magic of love in weddings and portraits. More than just wedding photos and portraits, I create lasting memories.',
  magic_button_text TEXT NOT NULL DEFAULT 'LEARN MORE',
  magic_button_link TEXT NOT NULL DEFAULT '#',
  magic_images TEXT[] NOT NULL DEFAULT '{}',
  experience_title TEXT NOT NULL DEFAULT 'CHOOSE your EXPERIENCE',
  experience_images TEXT[] NOT NULL DEFAULT '{}',
  experience_links JSONB NOT NULL DEFAULT '[{"title": "1.", "subtitle": "THE GALLERIES", "link": "/events"}, {"title": "2.", "subtitle": "MY SERVICES", "link": "/events"}, {"title": "3.", "subtitle": "CONTACT ME", "link": "/events"}]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- Insert default row if not exists
INSERT INTO public.event_page_settings (id)
SELECT gen_random_uuid()
WHERE NOT EXISTS (SELECT 1 FROM public.event_page_settings);
-- updated_at trigger
CREATE OR REPLACE FUNCTION public.update_event_page_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trigger_event_page_settings_updated_at ON public.event_page_settings;
CREATE TRIGGER trigger_event_page_settings_updated_at
  BEFORE UPDATE ON public.event_page_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_event_page_settings_updated_at();
-- RLS
ALTER TABLE public.event_page_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read event page settings" ON public.event_page_settings;
CREATE POLICY "Public read event page settings"
  ON public.event_page_settings
  FOR SELECT
  TO public
  USING (true);
DROP POLICY IF EXISTS "Admin full access for event page settings" ON public.event_page_settings;
CREATE POLICY "Admin full access for event page settings"
  ON public.event_page_settings
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
