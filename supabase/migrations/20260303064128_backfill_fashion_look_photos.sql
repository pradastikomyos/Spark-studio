INSERT INTO public.fashion_look_photos (look_id, image_url, sort_order)
SELECT fl.id, fl.model_image_url, 0
FROM public.fashion_looks fl
WHERE fl.model_image_url IS NOT NULL
  AND fl.model_image_url <> ''
  AND NOT EXISTS (
    SELECT 1 FROM public.fashion_look_photos p
    WHERE p.look_id = fl.id
  );
;
