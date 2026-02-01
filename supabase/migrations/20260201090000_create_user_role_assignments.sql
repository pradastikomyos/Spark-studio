-- ============================================
-- Migration: Create user_role_assignments
-- Date: 2026-02-01
-- Description:
--   - Add minimal role table to support admin gating from frontend
--   - Allow logged-in users to read their own roles via RLS
-- ============================================

CREATE TABLE IF NOT EXISTS public.user_role_assignments (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS user_role_assignments_user_id_idx
  ON public.user_role_assignments(user_id);

CREATE UNIQUE INDEX IF NOT EXISTS user_role_assignments_user_role_unique
  ON public.user_role_assignments(user_id, role_name);

ALTER TABLE public.user_role_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_role_assignments_select_own" ON public.user_role_assignments;
CREATE POLICY "user_role_assignments_select_own"
  ON public.user_role_assignments
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

