CREATE TABLE IF NOT EXISTS public.booking_page_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  journey_title TEXT NOT NULL DEFAULT 'Select Your Journey',
  journey_description TEXT NOT NULL DEFAULT 'Pick a date to see available magical experiences.',
  reserve_title TEXT NOT NULL DEFAULT 'Reserve Your Session',
  reserve_description TEXT NOT NULL DEFAULT 'Secure your spot. Select your preferred date and time to begin your experience.',
  calendar_title TEXT NOT NULL DEFAULT 'Select Date',
  time_slots_title TEXT NOT NULL DEFAULT 'Available Time Slots',
  access_type_title TEXT NOT NULL DEFAULT 'Access Type',
  all_day_access_label TEXT NOT NULL DEFAULT 'All Day Access',
  all_day_access_helper TEXT NOT NULL DEFAULT '(Valid entire day)',
  choose_specific_time_label TEXT NOT NULL DEFAULT 'Or choose specific time',
  empty_slots_message TEXT NOT NULL DEFAULT 'No available time slots for this date',
  booking_summary_title TEXT NOT NULL DEFAULT 'Booking Summary',
  ticket_type_label TEXT NOT NULL DEFAULT 'Ticket Type',
  date_label TEXT NOT NULL DEFAULT 'Date',
  time_label TEXT NOT NULL DEFAULT 'Time',
  not_selected_label TEXT NOT NULL DEFAULT 'Not selected',
  all_day_access_value_label TEXT NOT NULL DEFAULT 'All Day Access',
  quantity_label TEXT NOT NULL DEFAULT 'How Many?',
  max_tickets_label_template TEXT NOT NULL DEFAULT 'Max {count} per booking',
  ticket_price_label TEXT NOT NULL DEFAULT 'Ticket Price',
  vat_included_label TEXT NOT NULL DEFAULT '(VAT included)',
  total_label TEXT NOT NULL DEFAULT 'Total',
  proceed_button_label TEXT NOT NULL DEFAULT 'Proceed to Payment',
  secure_checkout_label TEXT NOT NULL DEFAULT 'Secure Encrypted Checkout',
  important_info_title TEXT NOT NULL DEFAULT 'Important Info',
  important_info_items JSONB NOT NULL DEFAULT '[
    "Please arrive 15 minutes before your slot.",
    "Ticket is valid only for selected date and time.",
    "Tiket tidak dapat di-refund atau di-reschedule."
  ]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO public.booking_page_settings (id)
SELECT gen_random_uuid()
WHERE NOT EXISTS (SELECT 1 FROM public.booking_page_settings);

CREATE OR REPLACE FUNCTION public.update_booking_page_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_booking_page_settings_updated_at ON public.booking_page_settings;
CREATE TRIGGER trigger_booking_page_settings_updated_at
  BEFORE UPDATE ON public.booking_page_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_booking_page_settings_updated_at();

ALTER TABLE public.booking_page_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read booking page settings" ON public.booking_page_settings;
CREATE POLICY "Public read booking page settings"
  ON public.booking_page_settings
  FOR SELECT
  TO public
  USING (true);

DROP POLICY IF EXISTS "Admin full access for booking page settings" ON public.booking_page_settings;
CREATE POLICY "Admin full access for booking page settings"
  ON public.booking_page_settings
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());;
