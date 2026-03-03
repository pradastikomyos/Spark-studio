CREATE TABLE IF NOT EXISTS public.fashion_look_photos (
  id BIGSERIAL PRIMARY KEY,
  look_id BIGINT NOT NULL REFERENCES public.fashion_looks(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  label TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fashion_look_photos_look ON public.fashion_look_photos(look_id, sort_order);

ALTER TABLE public.fashion_look_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fashion_look_photos_public_read"
  ON public.fashion_look_photos FOR SELECT TO public
  USING (
    EXISTS (
      SELECT 1 FROM public.fashion_looks fl
      JOIN public.fashion_collections fc ON fc.id = fl.collection_id
      WHERE fl.id = look_id AND fc.is_active = true
    )
  );

CREATE POLICY "fashion_look_photos_admin_all"
  ON public.fashion_look_photos FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_role_assignments
      WHERE user_id = auth.uid() AND role_name = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_role_assignments
      WHERE user_id = auth.uid() AND role_name = 'admin'
    )
  );
;
