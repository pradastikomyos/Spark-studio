-- Rename Fashion Lookbook feature to Dressing Room.
-- This keeps data intact while changing table names + storage bucket.

-- 1) Storage bucket: fashion-images -> dressing-room-images
INSERT INTO storage.buckets (id, name, public)
VALUES ('dressing-room-images', 'dressing-room-images', true)
ON CONFLICT (id) DO NOTHING;

UPDATE storage.objects
SET bucket_id = 'dressing-room-images'
WHERE bucket_id = 'fashion-images';

-- NOTE: Supabase Storage blocks direct bucket deletion via SQL triggers.
-- Keep the legacy bucket record but make it private so it doesn't show up as usable.
UPDATE storage.buckets
SET public = false
WHERE id = 'fashion-images';

DROP POLICY IF EXISTS "fashion_images_public_read" ON storage.objects;
DROP POLICY IF EXISTS "fashion_images_admin_insert" ON storage.objects;
DROP POLICY IF EXISTS "fashion_images_admin_update" ON storage.objects;
DROP POLICY IF EXISTS "fashion_images_admin_delete" ON storage.objects;

CREATE POLICY "dressing_room_images_public_read"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'dressing-room-images');

CREATE POLICY "dressing_room_images_admin_insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'dressing-room-images'
    AND EXISTS (
      SELECT 1 FROM public.user_role_assignments
      WHERE user_id = auth.uid() AND role_name = 'admin'
    )
  );

CREATE POLICY "dressing_room_images_admin_update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'dressing-room-images'
    AND EXISTS (
      SELECT 1 FROM public.user_role_assignments
      WHERE user_id = auth.uid() AND role_name = 'admin'
    )
  );

CREATE POLICY "dressing_room_images_admin_delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'dressing-room-images'
    AND EXISTS (
      SELECT 1 FROM public.user_role_assignments
      WHERE user_id = auth.uid() AND role_name = 'admin'
    )
  );

-- 2) Tables
ALTER TABLE IF EXISTS public.fashion_collections RENAME TO dressing_room_collections;
ALTER TABLE IF EXISTS public.fashion_looks RENAME TO dressing_room_looks;
ALTER TABLE IF EXISTS public.fashion_look_items RENAME TO dressing_room_look_items;
ALTER TABLE IF EXISTS public.fashion_look_photos RENAME TO dressing_room_look_photos;

-- 3) Indexes
ALTER INDEX IF EXISTS public.idx_fashion_collections_active RENAME TO idx_dressing_room_collections_active;
ALTER INDEX IF EXISTS public.idx_fashion_collections_slug RENAME TO idx_dressing_room_collections_slug;
ALTER INDEX IF EXISTS public.idx_fashion_looks_collection RENAME TO idx_dressing_room_looks_collection;
ALTER INDEX IF EXISTS public.idx_fashion_look_items_look RENAME TO idx_dressing_room_look_items_look;
ALTER INDEX IF EXISTS public.idx_fashion_look_photos_look RENAME TO idx_dressing_room_look_photos_look;

-- 4) Policies (rename only; definitions remain valid after table renames)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='dressing_room_collections' AND policyname='fashion_collections_public_read') THEN
    EXECUTE 'ALTER POLICY "fashion_collections_public_read" ON public.dressing_room_collections RENAME TO "dressing_room_collections_public_read"';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='dressing_room_collections' AND policyname='fashion_collections_admin_all') THEN
    EXECUTE 'ALTER POLICY "fashion_collections_admin_all" ON public.dressing_room_collections RENAME TO "dressing_room_collections_admin_all"';
  END IF;

  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='dressing_room_looks' AND policyname='fashion_looks_public_read') THEN
    EXECUTE 'ALTER POLICY "fashion_looks_public_read" ON public.dressing_room_looks RENAME TO "dressing_room_looks_public_read"';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='dressing_room_looks' AND policyname='fashion_looks_admin_all') THEN
    EXECUTE 'ALTER POLICY "fashion_looks_admin_all" ON public.dressing_room_looks RENAME TO "dressing_room_looks_admin_all"';
  END IF;

  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='dressing_room_look_items' AND policyname='fashion_look_items_public_read') THEN
    EXECUTE 'ALTER POLICY "fashion_look_items_public_read" ON public.dressing_room_look_items RENAME TO "dressing_room_look_items_public_read"';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='dressing_room_look_items' AND policyname='fashion_look_items_admin_all') THEN
    EXECUTE 'ALTER POLICY "fashion_look_items_admin_all" ON public.dressing_room_look_items RENAME TO "dressing_room_look_items_admin_all"';
  END IF;

  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='dressing_room_look_photos' AND policyname='fashion_look_photos_public_read') THEN
    EXECUTE 'ALTER POLICY "fashion_look_photos_public_read" ON public.dressing_room_look_photos RENAME TO "dressing_room_look_photos_public_read"';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='dressing_room_look_photos' AND policyname='fashion_look_photos_admin_all') THEN
    EXECUTE 'ALTER POLICY "fashion_look_photos_admin_all" ON public.dressing_room_look_photos RENAME TO "dressing_room_look_photos_admin_all"';
  END IF;
END $$;
;
