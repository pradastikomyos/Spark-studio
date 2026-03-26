ALTER TABLE banners DROP CONSTRAINT banners_banner_type_check;
ALTER TABLE banners ADD CONSTRAINT banners_banner_type_check
  CHECK (banner_type::text = ANY (ARRAY['hero','stage','promo','events','shop','process','spark-map']::text[]));;
