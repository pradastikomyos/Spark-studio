-- ============================================
-- Migration: Stage Details (Gallery & Reviews)
-- Date: 2026-02-09
-- Description: Adds gallery and reviews for stages
-- ============================================

-- 1. Create stage_gallery table
CREATE TABLE IF NOT EXISTS public.stage_gallery (
  id BIGSERIAL PRIMARY KEY,
  stage_id BIGINT NOT NULL REFERENCES public.stages(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  display_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
-- Enable RLS
ALTER TABLE public.stage_gallery ENABLE ROW LEVEL SECURITY;
-- Policies
CREATE POLICY "Public read access for stage_gallery" ON public.stage_gallery
  FOR SELECT USING (true);
CREATE POLICY "Admin full access for stage_gallery" ON public.stage_gallery
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
-- Index for performance
CREATE INDEX IF NOT EXISTS idx_stage_gallery_stage_id ON public.stage_gallery(stage_id);
-- 2. Create stage_reviews table
CREATE TABLE IF NOT EXISTS public.stage_reviews (
  id BIGSERIAL PRIMARY KEY,
  stage_id BIGINT NOT NULL REFERENCES public.stages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  is_approved BOOLEAN DEFAULT true, -- Auto-approve by default
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
-- Enable RLS
ALTER TABLE public.stage_reviews ENABLE ROW LEVEL SECURITY;
-- Policies
-- Public can read approved reviews
CREATE POLICY "Public read access for approved stage_reviews" ON public.stage_reviews
  FOR SELECT USING (is_approved = true);
-- Users can see their own reviews (even if not approved yet, though we auto-approve)
CREATE POLICY "Users can view their own reviews" ON public.stage_reviews
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
-- Users can create reviews
CREATE POLICY "Users can create their own reviews" ON public.stage_reviews
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
-- Admins can do everything
CREATE POLICY "Admin full access for stage_reviews" ON public.stage_reviews
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
-- Indexes
CREATE INDEX IF NOT EXISTS idx_stage_reviews_stage_id ON public.stage_reviews(stage_id);
CREATE INDEX IF NOT EXISTS idx_stage_reviews_user_id ON public.stage_reviews(user_id);
-- 3. Create storage bucket for gallery
INSERT INTO storage.buckets (id, name, public) 
VALUES ('stage-gallery', 'stage-gallery', true)
ON CONFLICT (id) DO NOTHING;
-- Storage Policies
-- Note: These policies attach to storage.objects. 
-- We must ensure we don't conflict with existing policies or duplicate them if they are too broad.
-- Assuming standard Supabase pattern where we add specific policies per bucket.

CREATE POLICY "Public Access Stage Gallery" ON storage.objects
  FOR SELECT USING (bucket_id = 'stage-gallery');
CREATE POLICY "Admin Upload Stage Gallery" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'stage-gallery' AND public.is_admin());
CREATE POLICY "Admin Update Stage Gallery" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'stage-gallery' AND public.is_admin());
CREATE POLICY "Admin Delete Stage Gallery" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'stage-gallery' AND public.is_admin());
