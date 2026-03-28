CREATE OR REPLACE FUNCTION public.generate_ticket_availability(
  p_start_date DATE,
  p_end_date DATE,
  p_ticket_id BIGINT DEFAULT 1,
  p_total_capacity INTEGER DEFAULT 100
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inserted_count INTEGER := 0;
BEGIN
  IF p_start_date IS NULL OR p_end_date IS NULL THEN
    RAISE EXCEPTION 'Start date and end date are required';
  END IF;

  IF p_start_date > p_end_date THEN
    RAISE EXCEPTION 'Start date must be before or equal to end date';
  END IF;

  IF p_total_capacity <= 0 THEN
    RAISE EXCEPTION 'Total capacity must be greater than zero';
  END IF;

  IF auth.uid() IS NOT NULL AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only admins can generate ticket availability';
  END IF;

  PERFORM 1
  FROM public.tickets
  WHERE id = p_ticket_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Ticket % not found', p_ticket_id;
  END IF;

  WITH days AS (
    SELECT generate_series(p_start_date, p_end_date, INTERVAL '1 day')::DATE AS service_date
  ),
  slots AS (
    SELECT unnest(ARRAY['09:00:00'::TIME, '12:00:00'::TIME, '15:00:00'::TIME, '18:00:00'::TIME]) AS time_slot
  ),
  inserted AS (
    INSERT INTO public.ticket_availabilities (
      ticket_id,
      date,
      time_slot,
      total_capacity,
      reserved_capacity,
      sold_capacity,
      version,
      created_at,
      updated_at
    )
    SELECT
      p_ticket_id,
      days.service_date,
      slots.time_slot,
      p_total_capacity,
      0,
      0,
      0,
      NOW(),
      NOW()
    FROM days
    CROSS JOIN slots
    ON CONFLICT (ticket_id, date, time_slot) DO NOTHING
    RETURNING 1
  )
  SELECT COUNT(*)
  INTO inserted_count
  FROM inserted;

  UPDATE public.tickets
  SET
    available_from = LEAST(COALESCE(available_from::DATE, p_start_date), p_start_date)::TIMESTAMP,
    available_until = GREATEST(COALESCE(available_until::DATE, p_end_date), p_end_date)::TIMESTAMP,
    updated_at = NOW()
  WHERE id = p_ticket_id;

  RETURN inserted_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.generate_ticket_availability(DATE, DATE, BIGINT, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_ticket_availability(DATE, DATE, BIGINT, INTEGER) TO service_role;

CREATE OR REPLACE FUNCTION public.ensure_ticket_availability_coverage(
  p_ticket_id BIGINT DEFAULT 1,
  p_days_ahead INTEGER DEFAULT 60,
  p_total_capacity INTEGER DEFAULT 100
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_end_date DATE;
BEGIN
  IF p_days_ahead <= 0 THEN
    RAISE EXCEPTION 'Days ahead must be greater than zero';
  END IF;

  target_end_date := CURRENT_DATE + p_days_ahead;

  RETURN public.generate_ticket_availability(
    CURRENT_DATE,
    target_end_date,
    p_ticket_id,
    p_total_capacity
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.ensure_ticket_availability_coverage(BIGINT, INTEGER, INTEGER) TO service_role;

DO $$
DECLARE
  existing_job_id BIGINT;
BEGIN
  SELECT jobid
  INTO existing_job_id
  FROM cron.job
  WHERE jobname = 'ensure-ticket-availability-daily';

  IF existing_job_id IS NOT NULL THEN
    PERFORM cron.unschedule(existing_job_id);
  END IF;

  PERFORM cron.schedule(
    'ensure-ticket-availability-daily',
    '15 17 * * *',
    $cron$SELECT public.ensure_ticket_availability_coverage(1, 60, 100);$cron$
  );
END;
$$;

SELECT public.ensure_ticket_availability_coverage(1, 60, 100);;
