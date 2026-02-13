-- ============================================
-- Migration: Enable pg_cron and Schedule Jobs
-- ============================================
-- NOTE: pg_cron must be enabled first in Supabase Dashboard:
-- Database → Extensions → Search "pg_cron" → Enable
-- ============================================

-- Enable pg_net for HTTP requests (typically already enabled)
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
-- Schedule: Expire tickets daily at 00:05 WIB (17:05 UTC)
SELECT cron.schedule(
  'expire-tickets-daily',
  '5 17 * * *',
  $$
  SELECT net.http_post(
    url := 'https://hogzjapnkvsihvvbgcdb.supabase.co/functions/v1/expire-tickets',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);
-- Schedule: Expire product orders daily at 00:10 WIB (17:10 UTC)
SELECT cron.schedule(
  'expire-product-orders-daily',
  '10 17 * * *',
  $$
  SELECT net.http_post(
    url := 'https://hogzjapnkvsihvvbgcdb.supabase.co/functions/v1/expire-product-orders',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);
