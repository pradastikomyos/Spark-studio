update public.products p
set image_url = src.image_url
from (
  select distinct on (pi.product_id)
    pi.product_id,
    pi.image_url
  from public.product_images pi
  where pi.image_provider = 'imagekit'
  order by pi.product_id, pi.is_primary desc, pi.display_order asc, pi.id asc
) as src
where p.id = src.product_id
  and p.image_url like '%/storage/v1/object/public/product-images/%';
