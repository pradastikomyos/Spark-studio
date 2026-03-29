CREATE OR REPLACE FUNCTION public.reserve_ticket_capacity(
  p_ticket_id BIGINT,
  p_date DATE,
  p_time_slot TEXT,
  p_quantity INTEGER
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_quantity IS NULL OR p_quantity <= 0 THEN
    RETURN false;
  END IF;

  WITH target AS (
    SELECT
      ta.id,
      ta.total_capacity,
      ta.reserved_capacity,
      ta.sold_capacity,
      (
        SELECT o.capacity_override
        FROM public.ticket_availability_overrides o
        WHERE o.ticket_id = ta.ticket_id
          AND o.date = ta.date
          AND o.time_slot = ta.time_slot
        LIMIT 1
      ) AS slot_capacity_override,
      (
        SELECT o.is_closed
        FROM public.ticket_availability_overrides o
        WHERE o.ticket_id = ta.ticket_id
          AND o.date = ta.date
          AND o.time_slot = ta.time_slot
        LIMIT 1
      ) AS slot_is_closed,
      (
        SELECT o.capacity_override
        FROM public.ticket_availability_overrides o
        WHERE o.ticket_id = ta.ticket_id
          AND o.date = ta.date
          AND o.time_slot IS NULL
        LIMIT 1
      ) AS day_capacity_override,
      (
        SELECT o.is_closed
        FROM public.ticket_availability_overrides o
        WHERE o.ticket_id = ta.ticket_id
          AND o.date = ta.date
          AND o.time_slot IS NULL
        LIMIT 1
      ) AS day_is_closed
    FROM public.ticket_availabilities ta
    WHERE ta.ticket_id = p_ticket_id
      AND ta.date = p_date
      AND ta.time_slot IS NOT DISTINCT FROM (p_time_slot::TIME)
    FOR UPDATE OF ta
  )
  UPDATE public.ticket_availabilities ta
  SET
    reserved_capacity = ta.reserved_capacity + p_quantity,
    updated_at = NOW()
  FROM target
  WHERE ta.id = target.id
    AND COALESCE(target.slot_is_closed, target.day_is_closed, false) = false
    AND (
      COALESCE(target.slot_capacity_override, target.day_capacity_override, target.total_capacity)
      - target.reserved_capacity
      - target.sold_capacity
    ) >= p_quantity;

  RETURN FOUND;
END;
$$;;
