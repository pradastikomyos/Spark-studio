DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'categories'
      AND column_name = 'parent_id'
  ) THEN
    ALTER TABLE public.categories
      ADD COLUMN parent_id BIGINT;
  END IF;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'categories_parent_id_fkey'
  ) THEN
    ALTER TABLE public.categories
      ADD CONSTRAINT categories_parent_id_fkey
      FOREIGN KEY (parent_id) REFERENCES public.categories(id) ON DELETE SET NULL;
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_categories_parent_id ON public.categories(parent_id);
INSERT INTO public.categories (name, slug, is_active, created_at, updated_at, parent_id)
VALUES
  ('Fashion', 'fashion', true, NOW(), NOW(), NULL),
  ('Makeup', 'makeup', true, NOW(), NOW(), NULL),
  ('Aksesoris', 'aksesoris', true, NOW(), NOW(), NULL)
ON CONFLICT (slug) DO NOTHING;
