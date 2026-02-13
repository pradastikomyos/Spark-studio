-- Align voucher RLS with source-of-truth role checks
-- Use public.is_admin() (user_role_assignments) instead of raw_user_meta_data

-- Vouchers
DROP POLICY IF EXISTS vouchers_admin_all ON public.vouchers;
CREATE POLICY vouchers_admin_all
  ON public.vouchers
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Voucher usage
DROP POLICY IF EXISTS voucher_usage_admin_all ON public.voucher_usage;
CREATE POLICY voucher_usage_admin_all
  ON public.voucher_usage
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
;
