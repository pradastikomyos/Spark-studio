-- ============================================
-- Migration: Events Schedule Storage Bucket + Cleanup Metadata
-- Date: 2026-02-28
-- Description: Separate storage bucket for events schedule images + track bucket per row
-- ============================================

-- Track which bucket stores the image (future-proofing for migrations/cleanup)
ALTER TABLE public.events_schedule_items
  ADD COLUMN IF NOT EXISTS image_bucket TEXT;
-- Best-effort backfill for any early data that used the banners bucket
UPDATE public.events_schedule_items
SET image_bucket = 'banners'
WHERE image_bucket IS NULL
  AND image_url ILIKE '%/storage/v1/object/public/banners/%';
UPDATE public.events_schedule_items
SET image_bucket = 'events-schedule'
WHERE image_bucket IS NULL;
ALTER TABLE public.events_schedule_items
  ALTER COLUMN image_bucket SET DEFAULT 'events-schedule';
-- Storage bucket (public so images can be embedded without signed URLs)
INSERT INTO storage.buckets (id, name, public)
VALUES ('events-schedule', 'events-schedule', true)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  public = EXCLUDED.public;
-- Storage RLS policies for this bucket
DROP POLICY IF EXISTS "Public can view events schedule images" ON storage.objects;
CREATE POLICY "Public can view events schedule images"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'events-schedule');
DROP POLICY IF EXISTS "Admins can upload events schedule images" ON storage.objects;
CREATE POLICY "Admins can upload events schedule images"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'events-schedule' AND public.is_admin());
DROP POLICY IF EXISTS "Admins can update events schedule images" ON storage.objects;
CREATE POLICY "Admins can update events schedule images"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'events-schedule' AND public.is_admin())
  WITH CHECK (bucket_id = 'events-schedule' AND public.is_admin());
DROP POLICY IF EXISTS "Admins can delete events schedule images" ON storage.objects;
CREATE POLICY "Admins can delete events schedule images"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'events-schedule' AND public.is_admin());
