ALTER TABLE public.glam_page_settings
ALTER COLUMN look_star_links
SET DEFAULT '[
  {"slot":"pink-rush","product_id":null,"image_url":null},
  {"slot":"silver-blink","product_id":null,"image_url":null},
  {"slot":"bronze","product_id":null,"image_url":null},
  {"slot":"aura-pop","product_id":null,"image_url":null}
]'::jsonb;

UPDATE public.glam_page_settings
SET look_star_links = (
  SELECT jsonb_agg(
    jsonb_build_object(
      'slot', item->>'slot',
      'product_id',
        CASE
          WHEN jsonb_typeof(item->'product_id') = 'number' THEN item->'product_id'
          ELSE to_jsonb(NULL::INTEGER)
        END,
      'image_url',
        CASE
          WHEN jsonb_typeof(item->'image_url') = 'string' THEN item->'image_url'
          ELSE to_jsonb(NULL::TEXT)
        END
    )
    ORDER BY ord
  )
  FROM jsonb_array_elements(look_star_links) WITH ORDINALITY AS star(item, ord)
)
WHERE look_star_links IS NOT NULL;;
