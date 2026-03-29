-- ============================================
-- Migration: Harden payment and retention cron jobs
-- ============================================
-- Purpose:
-- - keep webhook-first flows backed by frequent reconciliation
-- - enforce cashier QR and pickup QR expiries close to their business SLA
-- - keep retention cleanup automated

CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

DO $$
DECLARE
  existing_job_id BIGINT;
  job_name TEXT;
BEGIN
  FOREACH job_name IN ARRAY ARRAY[
    'expire-product-orders-daily',
    'expire-product-orders-every-5-minutes',
    'reconcile-midtrans-payments',
    'reconcile-midtrans-payments-every-5-minutes',
    'retention-cleanup-daily',
    'expire-tickets-daily',
    'ensure-ticket-availability-daily'
  ]
  LOOP
    SELECT jobid
    INTO existing_job_id
    FROM cron.job
    WHERE jobname = job_name;

    IF existing_job_id IS NOT NULL THEN
      PERFORM cron.unschedule(existing_job_id);
      existing_job_id := NULL;
    END IF;
  END LOOP;

  PERFORM cron.schedule(
    'reconcile-midtrans-payments-every-5-minutes',
    '*/5 * * * *',
    $cron$
    SELECT net.http_post(
      url := 'https://hogzjapnkvsihvvbgcdb.supabase.co/functions/v1/reconcile-midtrans-payments',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true),
        'Content-Type', 'application/json'
      ),
      body := '{}'::jsonb
    );
    $cron$
  );

  PERFORM cron.schedule(
    'expire-product-orders-every-5-minutes',
    '*/5 * * * *',
    $cron$
    SELECT net.http_post(
      url := 'https://hogzjapnkvsihvvbgcdb.supabase.co/functions/v1/expire-product-orders',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true),
        'Content-Type', 'application/json'
      ),
      body := '{}'::jsonb
    );
    $cron$
  );

  PERFORM cron.schedule(
    'expire-tickets-daily',
    '5 17 * * *',
    $cron$
    SELECT net.http_post(
      url := 'https://hogzjapnkvsihvvbgcdb.supabase.co/functions/v1/expire-tickets',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true),
        'Content-Type', 'application/json'
      ),
      body := '{}'::jsonb
    );
    $cron$
  );

  PERFORM cron.schedule(
    'ensure-ticket-availability-daily',
    '15 17 * * *',
    $cron$SELECT public.ensure_all_ticket_availability_coverage();$cron$
  );

  PERFORM cron.schedule(
    'retention-cleanup-daily',
    '0 18 * * *',
    $cron$
    SELECT net.http_post(
      url := 'https://hogzjapnkvsihvvbgcdb.supabase.co/functions/v1/retention-cleanup',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true),
        'Content-Type', 'application/json'
      ),
      body := '{}'::jsonb
    );
    $cron$
  );
END;
$$;
