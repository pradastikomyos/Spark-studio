-- Beauty poster tagger (public Beauty page + admin WYSIWYG editor)

-- 1) Tables
CREATE TABLE IF NOT EXISTS public.beauty_posters (
  id BIGSERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  image_url TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT false,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_beauty_posters_active ON public.beauty_posters(is_active, sort_order);
CREATE INDEX IF NOT EXISTS idx_beauty_posters_slug ON public.beauty_posters(slug);
ALTER TABLE public.beauty_posters ENABLE ROW LEVEL SECURITY;
CREATE TABLE IF NOT EXISTS public.beauty_poster_tags (
  id BIGSERIAL PRIMARY KEY,
  poster_id BIGINT NOT NULL REFERENCES public.beauty_posters(id) ON DELETE CASCADE,
  product_variant_id BIGINT NOT NULL REFERENCES public.product_variants(id) ON DELETE CASCADE,
  label TEXT,
  x_pct NUMERIC(5,2) NOT NULL,
  y_pct NUMERIC(5,2) NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_beauty_poster_tags_poster ON public.beauty_poster_tags(poster_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_beauty_poster_tags_variant ON public.beauty_poster_tags(product_variant_id);
ALTER TABLE public.beauty_poster_tags ENABLE ROW LEVEL SECURITY;
-- 2) RLS policies
-- Public read: only active posters, and tags belonging to active posters
DROP POLICY IF EXISTS beauty_posters_public_read ON public.beauty_posters;
CREATE POLICY beauty_posters_public_read
  ON public.beauty_posters FOR SELECT TO public
  USING (is_active = true);
DROP POLICY IF EXISTS beauty_posters_admin_all ON public.beauty_posters;
CREATE POLICY beauty_posters_admin_all
  ON public.beauty_posters FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_role_assignments
      WHERE user_id = auth.uid()
        AND role_name IN ('admin', 'super_admin', 'super-admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_role_assignments
      WHERE user_id = auth.uid()
        AND role_name IN ('admin', 'super_admin', 'super-admin')
    )
  );
DROP POLICY IF EXISTS beauty_poster_tags_public_read ON public.beauty_poster_tags;
CREATE POLICY beauty_poster_tags_public_read
  ON public.beauty_poster_tags FOR SELECT TO public
  USING (
    EXISTS (
      SELECT 1 FROM public.beauty_posters bp
      WHERE bp.id = poster_id AND bp.is_active = true
    )
  );
DROP POLICY IF EXISTS beauty_poster_tags_admin_all ON public.beauty_poster_tags;
CREATE POLICY beauty_poster_tags_admin_all
  ON public.beauty_poster_tags FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_role_assignments
      WHERE user_id = auth.uid()
        AND role_name IN ('admin', 'super_admin', 'super-admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_role_assignments
      WHERE user_id = auth.uid()
        AND role_name IN ('admin', 'super_admin', 'super-admin')
    )
  );
-- 3) Storage bucket for optional uploads
INSERT INTO storage.buckets (id, name, public)
VALUES ('beauty-images', 'beauty-images', true)
ON CONFLICT (id) DO NOTHING;
DROP POLICY IF EXISTS beauty_images_public_read ON storage.objects;
CREATE POLICY beauty_images_public_read
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'beauty-images');
DROP POLICY IF EXISTS beauty_images_admin_insert ON storage.objects;
CREATE POLICY beauty_images_admin_insert
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'beauty-images'
    AND EXISTS (
      SELECT 1 FROM public.user_role_assignments
      WHERE user_id = auth.uid()
        AND role_name IN ('admin', 'super_admin', 'super-admin')
    )
  );
DROP POLICY IF EXISTS beauty_images_admin_update ON storage.objects;
CREATE POLICY beauty_images_admin_update
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'beauty-images'
    AND EXISTS (
      SELECT 1 FROM public.user_role_assignments
      WHERE user_id = auth.uid()
        AND role_name IN ('admin', 'super_admin', 'super-admin')
    )
  );
DROP POLICY IF EXISTS beauty_images_admin_delete ON storage.objects;
CREATE POLICY beauty_images_admin_delete
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'beauty-images'
    AND EXISTS (
      SELECT 1 FROM public.user_role_assignments
      WHERE user_id = auth.uid()
        AND role_name IN ('admin', 'super_admin', 'super-admin')
    )
  );
