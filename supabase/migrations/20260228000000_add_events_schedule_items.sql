-- ============================================
-- Migration: Events Schedule Items (Upcoming Schedule)
-- Date: 2026-02-28
-- Description: Add editable schedule items for /events with admin WYSIWYG manager
-- ============================================

-- Table
CREATE TABLE IF NOT EXISTS public.events_schedule_items (
  id BIGSERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  event_date DATE NOT NULL,
  time_label TEXT NOT NULL,
  category TEXT NOT NULL,
  image_url TEXT,
  image_path TEXT,
  placeholder_icon TEXT,
  is_coming_soon BOOLEAN NOT NULL DEFAULT true,
  button_text TEXT NOT NULL DEFAULT 'Register',
  button_url TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
COMMENT ON TABLE public.events_schedule_items IS 'Editable upcoming schedule items for /events page';
-- Indexes
CREATE INDEX IF NOT EXISTS idx_events_schedule_items_active_order
  ON public.events_schedule_items (is_active, sort_order, event_date);
-- updated_at trigger
CREATE OR REPLACE FUNCTION public.update_events_schedule_items_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trigger_events_schedule_items_updated_at ON public.events_schedule_items;
CREATE TRIGGER trigger_events_schedule_items_updated_at
  BEFORE UPDATE ON public.events_schedule_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_events_schedule_items_updated_at();
-- RLS
ALTER TABLE public.events_schedule_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read active events schedule items" ON public.events_schedule_items;
CREATE POLICY "Public read active events schedule items"
  ON public.events_schedule_items
  FOR SELECT
  TO public
  USING (is_active = true);
DROP POLICY IF EXISTS "Admin full access for events schedule items" ON public.events_schedule_items;
CREATE POLICY "Admin full access for events schedule items"
  ON public.events_schedule_items
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
