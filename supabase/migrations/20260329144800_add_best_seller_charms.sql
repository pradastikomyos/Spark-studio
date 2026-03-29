-- Migration: Add best_seller_charms to charm_bar_page_settings
ALTER TABLE public.charm_bar_page_settings
ADD COLUMN IF NOT EXISTS best_seller_charms integer[] DEFAULT '{}'::integer[];
