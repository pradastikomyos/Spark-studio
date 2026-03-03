-- After moving objects from bucket `fashion-images` to `dressing-room-images`,
-- rewrite any stored public URLs so they keep working.

UPDATE public.dressing_room_collections
SET cover_image_url = REPLACE(cover_image_url, '/fashion-images/', '/dressing-room-images/')
WHERE cover_image_url IS NOT NULL
  AND cover_image_url LIKE '%/fashion-images/%';

UPDATE public.dressing_room_looks
SET model_image_url = REPLACE(model_image_url, '/fashion-images/', '/dressing-room-images/')
WHERE model_image_url IS NOT NULL
  AND model_image_url LIKE '%/fashion-images/%';

UPDATE public.dressing_room_look_photos
SET image_url = REPLACE(image_url, '/fashion-images/', '/dressing-room-images/')
WHERE image_url IS NOT NULL
  AND image_url LIKE '%/fashion-images/%';
;
