import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export interface BookingPageSettings {
  id: string;
  journey_title: string;
  journey_description: string;
  reserve_title: string;
  reserve_description: string;
  calendar_title: string;
  time_slots_title: string;
  access_type_title: string;
  all_day_access_label: string;
  all_day_access_helper: string;
  choose_specific_time_label: string;
  empty_slots_message: string;
  booking_summary_title: string;
  ticket_type_label: string;
  date_label: string;
  time_label: string;
  not_selected_label: string;
  all_day_access_value_label: string;
  quantity_label: string;
  max_tickets_label_template: string;
  ticket_price_label: string;
  vat_included_label: string;
  total_label: string;
  proceed_button_label: string;
  secure_checkout_label: string;
  important_info_title: string;
  important_info_items: string[];
}

export const DEFAULT_BOOKING_PAGE_SETTINGS: BookingPageSettings = {
  id: 'default-booking-page-settings',
  journey_title: 'Select Your Journey',
  journey_description: 'Pick a date to see available magical experiences.',
  reserve_title: 'Reserve Your Session',
  reserve_description: 'Secure your spot. Select your preferred date and time to begin your experience.',
  calendar_title: 'Select Date',
  time_slots_title: 'Available Time Slots',
  access_type_title: 'Access Type',
  all_day_access_label: 'All Day Access',
  all_day_access_helper: '(Valid entire day)',
  choose_specific_time_label: 'Or choose specific time',
  empty_slots_message: 'No available time slots for this date',
  booking_summary_title: 'Booking Summary',
  ticket_type_label: 'Ticket Type',
  date_label: 'Date',
  time_label: 'Time',
  not_selected_label: 'Not selected',
  all_day_access_value_label: 'All Day Access',
  quantity_label: 'How Many?',
  max_tickets_label_template: 'Max {count} per booking',
  ticket_price_label: 'Ticket Price',
  vat_included_label: '(VAT included)',
  total_label: 'Total',
  proceed_button_label: 'Proceed to Payment',
  secure_checkout_label: 'Secure Encrypted Checkout',
  important_info_title: 'Important Info',
  important_info_items: [
    'Please arrive 15 minutes before your slot.',
    'Ticket is valid only for selected date and time.',
    'Tiket tidak dapat di-refund atau di-reschedule.',
  ],
};

function normalizeString(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim() !== '' ? value : fallback;
}

function normalizeStringArray(value: unknown, fallback: string[]): string[] {
  if (!Array.isArray(value)) return fallback;

  const parsed = value
    .map((entry) => (typeof entry === 'string' ? entry.trim() : ''))
    .filter(Boolean);

  return parsed.length > 0 ? parsed : fallback;
}

function normalizeSettings(data: Record<string, unknown>): BookingPageSettings {
  return {
    id: normalizeString(data.id, DEFAULT_BOOKING_PAGE_SETTINGS.id),
    journey_title: normalizeString(data.journey_title, DEFAULT_BOOKING_PAGE_SETTINGS.journey_title),
    journey_description: normalizeString(data.journey_description, DEFAULT_BOOKING_PAGE_SETTINGS.journey_description),
    reserve_title: normalizeString(data.reserve_title, DEFAULT_BOOKING_PAGE_SETTINGS.reserve_title),
    reserve_description: normalizeString(data.reserve_description, DEFAULT_BOOKING_PAGE_SETTINGS.reserve_description),
    calendar_title: normalizeString(data.calendar_title, DEFAULT_BOOKING_PAGE_SETTINGS.calendar_title),
    time_slots_title: normalizeString(data.time_slots_title, DEFAULT_BOOKING_PAGE_SETTINGS.time_slots_title),
    access_type_title: normalizeString(data.access_type_title, DEFAULT_BOOKING_PAGE_SETTINGS.access_type_title),
    all_day_access_label: normalizeString(data.all_day_access_label, DEFAULT_BOOKING_PAGE_SETTINGS.all_day_access_label),
    all_day_access_helper: normalizeString(data.all_day_access_helper, DEFAULT_BOOKING_PAGE_SETTINGS.all_day_access_helper),
    choose_specific_time_label: normalizeString(
      data.choose_specific_time_label,
      DEFAULT_BOOKING_PAGE_SETTINGS.choose_specific_time_label
    ),
    empty_slots_message: normalizeString(data.empty_slots_message, DEFAULT_BOOKING_PAGE_SETTINGS.empty_slots_message),
    booking_summary_title: normalizeString(data.booking_summary_title, DEFAULT_BOOKING_PAGE_SETTINGS.booking_summary_title),
    ticket_type_label: normalizeString(data.ticket_type_label, DEFAULT_BOOKING_PAGE_SETTINGS.ticket_type_label),
    date_label: normalizeString(data.date_label, DEFAULT_BOOKING_PAGE_SETTINGS.date_label),
    time_label: normalizeString(data.time_label, DEFAULT_BOOKING_PAGE_SETTINGS.time_label),
    not_selected_label: normalizeString(data.not_selected_label, DEFAULT_BOOKING_PAGE_SETTINGS.not_selected_label),
    all_day_access_value_label: normalizeString(
      data.all_day_access_value_label,
      DEFAULT_BOOKING_PAGE_SETTINGS.all_day_access_value_label
    ),
    quantity_label: normalizeString(data.quantity_label, DEFAULT_BOOKING_PAGE_SETTINGS.quantity_label),
    max_tickets_label_template: normalizeString(
      data.max_tickets_label_template,
      DEFAULT_BOOKING_PAGE_SETTINGS.max_tickets_label_template
    ),
    ticket_price_label: normalizeString(data.ticket_price_label, DEFAULT_BOOKING_PAGE_SETTINGS.ticket_price_label),
    vat_included_label: normalizeString(data.vat_included_label, DEFAULT_BOOKING_PAGE_SETTINGS.vat_included_label),
    total_label: normalizeString(data.total_label, DEFAULT_BOOKING_PAGE_SETTINGS.total_label),
    proceed_button_label: normalizeString(data.proceed_button_label, DEFAULT_BOOKING_PAGE_SETTINGS.proceed_button_label),
    secure_checkout_label: normalizeString(
      data.secure_checkout_label,
      DEFAULT_BOOKING_PAGE_SETTINGS.secure_checkout_label
    ),
    important_info_title: normalizeString(data.important_info_title, DEFAULT_BOOKING_PAGE_SETTINGS.important_info_title),
    important_info_items: normalizeStringArray(data.important_info_items, DEFAULT_BOOKING_PAGE_SETTINGS.important_info_items),
  };
}

export function useBookingPageSettings() {
  const [settings, setSettings] = useState<BookingPageSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchSettings = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('booking_page_settings')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(1)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          setSettings(null);
        } else {
          throw error;
        }
      } else {
        setSettings(normalizeSettings(data as Record<string, unknown>));
      }
    } catch (err: unknown) {
      console.error('Error fetching booking page settings:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch booking page settings'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void fetchSettings();
  }, []);

  const updateSettings = async (updates: Partial<BookingPageSettings>) => {
    try {
      setIsLoading(true);
      setError(null);

      if (!settings?.id || settings.id === DEFAULT_BOOKING_PAGE_SETTINGS.id) {
        const { data: newData, error: insertError } = await supabase
          .from('booking_page_settings')
          .insert([updates])
          .select()
          .single();

        if (insertError) throw insertError;
        const normalized = normalizeSettings(newData as Record<string, unknown>);
        setSettings(normalized);
        return normalized;
      }

      const { data, error } = await supabase
        .from('booking_page_settings')
        .update(updates)
        .eq('id', settings.id)
        .select()
        .single();

      if (error) throw error;
      const normalized = normalizeSettings(data as Record<string, unknown>);
      setSettings(normalized);
      return normalized;
    } catch (err: unknown) {
      console.error('Error updating booking page settings:', err);
      setError(err instanceof Error ? err : new Error('Failed to update booking page settings'));
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    settings,
    isLoading,
    error,
    updateSettings,
    refetch: fetchSettings,
  };
}
