
CREATE TABLE IF NOT EXISTS public.fashion_collections (
  id BIGSERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  cover_image_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT false,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fashion_collections_active ON public.fashion_collections(is_active, sort_order);
CREATE INDEX IF NOT EXISTS idx_fashion_collections_slug ON public.fashion_collections(slug);

ALTER TABLE public.fashion_collections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fashion_collections_public_read"
  ON public.fashion_collections FOR SELECT TO public
  USING (is_active = true);

CREATE POLICY "fashion_collections_admin_all"
  ON public.fashion_collections FOR ALL TO authenticated
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

CREATE TABLE IF NOT EXISTS public.fashion_looks (
  id BIGSERIAL PRIMARY KEY,
  collection_id BIGINT NOT NULL REFERENCES public.fashion_collections(id) ON DELETE CASCADE,
  look_number INT NOT NULL,
  model_image_url TEXT NOT NULL,
  model_name TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(collection_id, look_number)
);

CREATE INDEX IF NOT EXISTS idx_fashion_looks_collection ON public.fashion_looks(collection_id, sort_order);

ALTER TABLE public.fashion_looks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fashion_looks_public_read"
  ON public.fashion_looks FOR SELECT TO public
  USING (
    EXISTS (
      SELECT 1 FROM public.fashion_collections fc
      WHERE fc.id = collection_id AND fc.is_active = true
    )
  );

CREATE POLICY "fashion_looks_admin_all"
  ON public.fashion_looks FOR ALL TO authenticated
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

CREATE TABLE IF NOT EXISTS public.fashion_look_items (
  id BIGSERIAL PRIMARY KEY,
  look_id BIGINT NOT NULL REFERENCES public.fashion_looks(id) ON DELETE CASCADE,
  product_variant_id BIGINT NOT NULL REFERENCES public.product_variants(id) ON DELETE CASCADE,
  label TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fashion_look_items_look ON public.fashion_look_items(look_id, sort_order);

ALTER TABLE public.fashion_look_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fashion_look_items_public_read"
  ON public.fashion_look_items FOR SELECT TO public
  USING (
    EXISTS (
      SELECT 1 FROM public.fashion_looks fl
      JOIN public.fashion_collections fc ON fc.id = fl.collection_id
      WHERE fl.id = look_id AND fc.is_active = true
    )
  );

CREATE POLICY "fashion_look_items_admin_all"
  ON public.fashion_look_items FOR ALL TO authenticated
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

INSERT INTO storage.buckets (id, name, public)
VALUES ('fashion-images', 'fashion-images', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "fashion_images_public_read"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'fashion-images');

CREATE POLICY "fashion_images_admin_insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'fashion-images'
    AND EXISTS (
      SELECT 1 FROM public.user_role_assignments
      WHERE user_id = auth.uid() AND role_name = 'admin'
    )
  );

CREATE POLICY "fashion_images_admin_update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'fashion-images'
    AND EXISTS (
      SELECT 1 FROM public.user_role_assignments
      WHERE user_id = auth.uid() AND role_name = 'admin'
    )
  );

CREATE POLICY "fashion_images_admin_delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'fashion-images'
    AND EXISTS (
      SELECT 1 FROM public.user_role_assignments
      WHERE user_id = auth.uid() AND role_name = 'admin'
    )
  );
;
