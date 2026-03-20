-- Migration: add_spark_map_banner_type
-- Added 'spark-map' to the allowed check constraint for the banners table

ALTER TABLE public.banners DROP CONSTRAINT banners_banner_type_check;

ALTER TABLE public.banners ADD CONSTRAINT banners_banner_type_check
  CHECK ((banner_type::text = ANY ((ARRAY[
    'hero'::character varying, 
    'stage'::character varying, 
    'promo'::character varying, 
    'events'::character varying, 
    'shop'::character varying, 
    'process'::character varying, 
    'spark-map'::character varying
  ])::text[])));
