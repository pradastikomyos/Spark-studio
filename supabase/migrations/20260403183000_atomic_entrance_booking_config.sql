CREATE OR REPLACE FUNCTION public.save_entrance_booking_config(
  p_ticket_id bigint,
  p_is_active boolean,
  p_price numeric,
  p_available_from date,
  p_available_until date,
  p_time_slots jsonb,
  p_max_tickets_per_booking integer,
  p_booking_window_days integer,
  p_auto_generate_days_ahead integer,
  p_default_slot_capacity integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ticket public.tickets%ROWTYPE;
  v_settings public.ticket_booking_settings%ROWTYPE;
BEGIN
  IF NOT (public.is_admin() OR auth.role() = 'service_role') THEN
    RAISE EXCEPTION 'Only admins can save entrance booking config';
  END IF;

  IF p_ticket_id IS NULL THEN
    RAISE EXCEPTION 'Ticket id is required';
  END IF;

  IF p_available_from IS NULL OR p_available_until IS NULL THEN
    RAISE EXCEPTION 'Available from/until are required';
  END IF;

  IF p_available_from > p_available_until THEN
    RAISE EXCEPTION 'Available from must be before available until';
  END IF;

  IF p_price IS NULL OR p_price < 0 THEN
    RAISE EXCEPTION 'Price must be a valid non-negative number';
  END IF;

  IF p_max_tickets_per_booking IS NULL OR p_max_tickets_per_booking <= 0 THEN
    RAISE EXCEPTION 'Maximum tickets per booking must be greater than zero';
  END IF;

  IF p_booking_window_days IS NULL OR p_booking_window_days <= 0 THEN
    RAISE EXCEPTION 'Booking window days must be greater than zero';
  END IF;

  IF p_auto_generate_days_ahead IS NULL OR p_auto_generate_days_ahead < 0 THEN
    RAISE EXCEPTION 'Auto-generate days ahead must be zero or greater';
  END IF;

  IF p_default_slot_capacity IS NULL OR p_default_slot_capacity <= 0 THEN
    RAISE EXCEPTION 'Default slot capacity must be greater than zero';
  END IF;

  UPDATE public.tickets
  SET
    is_active = COALESCE(p_is_active, is_active),
    price = p_price,
    available_from = (p_available_from::timestamp),
    available_until = (p_available_until::timestamp),
    time_slots = COALESCE(p_time_slots, '[]'::jsonb)::json,
    updated_at = NOW()
  WHERE id = p_ticket_id
  RETURNING * INTO v_ticket;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Ticket % not found', p_ticket_id;
  END IF;

  INSERT INTO public.ticket_booking_settings (
    ticket_id,
    max_tickets_per_booking,
    booking_window_days,
    auto_generate_days_ahead,
    default_slot_capacity
  )
  VALUES (
    p_ticket_id,
    p_max_tickets_per_booking,
    p_booking_window_days,
    p_auto_generate_days_ahead,
    p_default_slot_capacity
  )
  ON CONFLICT (ticket_id) DO UPDATE
    SET
      max_tickets_per_booking = EXCLUDED.max_tickets_per_booking,
      booking_window_days = EXCLUDED.booking_window_days,
      auto_generate_days_ahead = EXCLUDED.auto_generate_days_ahead,
      default_slot_capacity = EXCLUDED.default_slot_capacity,
      updated_at = NOW()
  RETURNING * INTO v_settings;

  RETURN jsonb_build_object(
    'ticket_id', v_ticket.id,
    'ticket', to_jsonb(v_ticket),
    'settings', to_jsonb(v_settings),
    'saved', true
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.save_entrance_booking_config(
  bigint,
  boolean,
  numeric,
  date,
  date,
  jsonb,
  integer,
  integer,
  integer,
  integer
) TO authenticated, service_role;
