REVOKE ALL ON FUNCTION public.validate_entrance_ticket_scan(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.validate_entrance_ticket_scan(TEXT) FROM anon;
REVOKE ALL ON FUNCTION public.validate_entrance_ticket_scan(TEXT) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.validate_entrance_ticket_scan(TEXT) TO service_role;
