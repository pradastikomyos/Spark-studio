ALTER TABLE public.glam_page_settings
ADD COLUMN IF NOT EXISTS look_star_links JSONB NOT NULL DEFAULT '[
  {"slot":"pink-rush","product_id":null},
  {"slot":"silver-blink","product_id":null},
  {"slot":"bronze","product_id":null},
  {"slot":"aura-pop","product_id":null}
]'::jsonb;;
