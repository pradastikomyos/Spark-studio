ALTER TABLE public.glam_page_settings
  ADD COLUMN IF NOT EXISTS section_fonts JSONB NOT NULL DEFAULT '{
    "hero": { "heading": "great_vibes", "body": "nunito_sans" },
    "look": { "heading": "great_vibes", "body": "nunito_sans" },
    "products": { "heading": "cardo", "body": "nunito_sans" }
  }'::jsonb;

ALTER TABLE public.event_page_settings
  ADD COLUMN IF NOT EXISTS section_fonts JSONB NOT NULL DEFAULT '{
    "magic": { "heading": "cardo", "body": "nunito_sans" },
    "experience": { "heading": "cardo", "body": "nunito_sans" }
  }'::jsonb;

ALTER TABLE public.news_page_settings
  ADD COLUMN IF NOT EXISTS section_fonts JSONB NOT NULL DEFAULT '{
    "section_1": { "heading": "cardo", "body": "nunito_sans" },
    "section_2": { "heading": "cardo", "body": "nunito_sans" },
    "section_3": { "heading": "cardo", "body": "nunito_sans" }
  }'::jsonb;

ALTER TABLE public.charm_bar_page_settings
  ADD COLUMN IF NOT EXISTS section_fonts JSONB NOT NULL DEFAULT '{
    "quick_links": { "heading": "cardo", "body": "nunito_sans" },
    "customize": { "heading": "cardo", "body": "nunito_sans" },
    "video_gallery": { "heading": "cardo", "body": "nunito_sans" },
    "how_it_works": { "heading": "cardo", "body": "nunito_sans" }
  }'::jsonb;;
