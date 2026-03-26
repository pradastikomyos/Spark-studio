import { useEffect, useMemo, useState, type ReactNode } from 'react';
import AdminLayout from '../../components/AdminLayout';
import { useToast } from '../../components/Toast';
import { useAuth } from '../../contexts/AuthContext';
import { ADMIN_MENU_ITEMS, ADMIN_MENU_SECTIONS } from '../../constants/adminMenu';
import { supabase } from '../../lib/supabase';
import { useEntranceTicket } from '../../hooks/useEntranceTicket';
import { useTicketBookingSettings } from '../../hooks/useTicketBookingSettings';

type OverrideRow = {
  id: number;
  date: string;
  time_slot: string | null;
  is_closed: boolean;
  capacity_override: number | null;
  reason: string | null;
};

type TicketFormState = {
  is_active: boolean;
  price: string;
  available_from: string;
  available_until: string;
  time_slots: string;
};

type SettingsFormState = {
  max_tickets_per_booking: string;
  booking_window_days: string;
  auto_generate_days_ahead: string;
  default_slot_capacity: string;
};

type OverrideFormState = {
  id: number | null;
  date: string;
  time_slot: string;
  is_closed: boolean;
  capacity_override: string;
  reason: string;
};

function SectionCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm space-y-5">
      <div className="border-b border-gray-100 pb-3">
        <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
        <p className="mt-1 text-sm text-gray-500">{description}</p>
      </div>
      {children}
    </section>
  );
}

function extractDateOnly(value: string | null | undefined) {
  return String(value ?? '').split('T')[0].split(' ')[0];
}

function normalizeTimeSlotsInput(value: string): string[] {
  return value
    .split(',')
    .map((slot) => slot.trim())
    .filter(Boolean)
    .map((slot) => {
      const normalized = slot.length === 5 ? slot : slot.slice(0, 5);
      if (!/^\d{2}:\d{2}$/.test(normalized)) {
        throw new Error(`Invalid time slot "${slot}". Use HH:MM format.`);
      }
      return normalized;
    });
}

function createEmptyOverrideForm(): OverrideFormState {
  return {
    id: null,
    date: '',
    time_slot: '',
    is_closed: true,
    capacity_override: '',
    reason: '',
  };
}

export default function EntranceBookingManager() {
  const { signOut } = useAuth();
  const { showToast } = useToast();
  const {
    data: ticket,
    error: ticketError,
    isLoading: ticketLoading,
    refetch: refetchTicket,
  } = useEntranceTicket('admin');
  const {
    data: bookingSettings,
    error: settingsError,
    isLoading: settingsLoading,
    refetch: refetchSettings,
  } = useTicketBookingSettings(ticket?.id ?? null);
  const [ticketForm, setTicketForm] = useState<TicketFormState | null>(null);
  const [settingsForm, setSettingsForm] = useState<SettingsFormState | null>(null);
  const [savingConfig, setSavingConfig] = useState(false);
  const [overridesLoading, setOverridesLoading] = useState(false);
  const [overrides, setOverrides] = useState<OverrideRow[]>([]);
  const [overrideForm, setOverrideForm] = useState<OverrideFormState>(createEmptyOverrideForm);
  const [savingOverride, setSavingOverride] = useState(false);
  const [deletingOverrideId, setDeletingOverrideId] = useState<number | null>(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [runningAction, setRunningAction] = useState<'generate' | 'regenerate' | null>(null);
  const [actionSummary, setActionSummary] = useState<string | null>(null);

  const loading = ticketLoading || settingsLoading;
  const pageError = useMemo(() => {
    const candidate = ticketError || settingsError;
    return candidate instanceof Error ? candidate : null;
  }, [settingsError, ticketError]);

  useEffect(() => {
    if (!ticket) return;
    setTicketForm({
      is_active: ticket.is_active,
      price: ticket.price,
      available_from: extractDateOnly(ticket.available_from),
      available_until: extractDateOnly(ticket.available_until),
      time_slots: ticket.time_slots.join(', '),
    });
  }, [ticket]);

  useEffect(() => {
    if (!bookingSettings) return;
    setSettingsForm({
      max_tickets_per_booking: String(bookingSettings.max_tickets_per_booking),
      booking_window_days: String(bookingSettings.booking_window_days),
      auto_generate_days_ahead: String(bookingSettings.auto_generate_days_ahead),
      default_slot_capacity: String(bookingSettings.default_slot_capacity),
    });
  }, [bookingSettings]);

  useEffect(() => {
    if (!ticket?.id) return;

    const loadOverrides = async () => {
      setOverridesLoading(true);
      const { data, error } = await supabase
        .from('ticket_availability_overrides')
        .select('id, date, time_slot, is_closed, capacity_override, reason')
        .eq('ticket_id', ticket.id)
        .order('date', { ascending: true })
        .order('time_slot', { ascending: true });

      if (error) {
        showToast('error', error.message || 'Failed to load availability overrides');
        setOverridesLoading(false);
        return;
      }

      setOverrides(((data as OverrideRow[] | null) ?? []).map((row) => ({
        ...row,
        reason: row.reason ?? null,
      })));
      setOverridesLoading(false);
    };

    void loadOverrides();
  }, [showToast, ticket?.id]);

  const handleSaveConfig = async () => {
    if (!ticket || !ticketForm || !settingsForm) return;

    if (!ticketForm.available_from || !ticketForm.available_until) {
      showToast('error', 'Available from/until are required');
      return;
    }

    if (ticketForm.available_from > ticketForm.available_until) {
      showToast('error', 'Available from must be before available until');
      return;
    }

    let normalizedTimeSlots: string[];
    try {
      normalizedTimeSlots = normalizeTimeSlotsInput(ticketForm.time_slots);
    } catch (error) {
      showToast('error', error instanceof Error ? error.message : 'Invalid time slots');
      return;
    }

    const price = Number(ticketForm.price);
    if (!Number.isFinite(price) || price < 0) {
      showToast('error', 'Price must be a valid non-negative number');
      return;
    }

    const maxTicketsPerBooking = Number(settingsForm.max_tickets_per_booking);
    const bookingWindowDays = Number(settingsForm.booking_window_days);
    const autoGenerateDaysAhead = Number(settingsForm.auto_generate_days_ahead);
    const defaultSlotCapacity = Number(settingsForm.default_slot_capacity);

    if (
      !Number.isFinite(maxTicketsPerBooking) ||
      !Number.isFinite(bookingWindowDays) ||
      !Number.isFinite(autoGenerateDaysAhead) ||
      !Number.isFinite(defaultSlotCapacity) ||
      maxTicketsPerBooking <= 0 ||
      bookingWindowDays <= 0 ||
      autoGenerateDaysAhead < 0 ||
      defaultSlotCapacity <= 0
    ) {
      showToast('error', 'All operational settings must be valid positive numbers');
      return;
    }

    setSavingConfig(true);
    try {
      const { error: ticketUpdateError } = await supabase
        .from('tickets')
        .update({
          is_active: ticketForm.is_active,
          price,
          available_from: `${ticketForm.available_from} 00:00:00`,
          available_until: `${ticketForm.available_until} 00:00:00`,
          time_slots: normalizedTimeSlots,
          updated_at: new Date().toISOString(),
        })
        .eq('id', ticket.id);

      if (ticketUpdateError) throw ticketUpdateError;

      const { error: settingsUpsertError } = await supabase
        .from('ticket_booking_settings')
        .upsert({
          ticket_id: ticket.id,
          max_tickets_per_booking: maxTicketsPerBooking,
          booking_window_days: bookingWindowDays,
          auto_generate_days_ahead: autoGenerateDaysAhead,
          default_slot_capacity: defaultSlotCapacity,
        });

      if (settingsUpsertError) throw settingsUpsertError;

      await Promise.all([refetchTicket(), refetchSettings()]);
      showToast('success', 'Entrance booking settings saved');
    } catch (error) {
      showToast('error', error instanceof Error ? error.message : 'Failed to save entrance booking settings');
    } finally {
      setSavingConfig(false);
    }
  };

  const resetOverrideForm = () => {
    setOverrideForm(createEmptyOverrideForm());
  };

  const handleEditOverride = (override: OverrideRow) => {
    setOverrideForm({
      id: override.id,
      date: override.date,
      time_slot: override.time_slot ? override.time_slot.slice(0, 5) : '',
      is_closed: override.is_closed,
      capacity_override: override.capacity_override != null ? String(override.capacity_override) : '',
      reason: override.reason ?? '',
    });
  };

  const reloadOverrides = async () => {
    if (!ticket?.id) return;
    setOverridesLoading(true);
    const { data, error } = await supabase
      .from('ticket_availability_overrides')
      .select('id, date, time_slot, is_closed, capacity_override, reason')
      .eq('ticket_id', ticket.id)
      .order('date', { ascending: true })
      .order('time_slot', { ascending: true });

    if (error) {
      showToast('error', error.message || 'Failed to load availability overrides');
      setOverridesLoading(false);
      return;
    }

    setOverrides((data as OverrideRow[] | null) ?? []);
    setOverridesLoading(false);
  };

  const handleSaveOverride = async () => {
    if (!ticket) return;
    if (!overrideForm.date) {
      showToast('error', 'Override date is required');
      return;
    }

    if (!overrideForm.is_closed && !overrideForm.capacity_override) {
      showToast('error', 'Set closed state or provide a capacity override');
      return;
    }

    const capacityOverride = overrideForm.capacity_override ? Number(overrideForm.capacity_override) : null;
    if (capacityOverride != null && (!Number.isFinite(capacityOverride) || capacityOverride <= 0)) {
      showToast('error', 'Capacity override must be a positive number');
      return;
    }

    setSavingOverride(true);
    try {
      const payload = {
        ticket_id: ticket.id,
        date: overrideForm.date,
        time_slot: overrideForm.time_slot ? `${overrideForm.time_slot}:00` : null,
        is_closed: overrideForm.is_closed,
        capacity_override: capacityOverride,
        reason: overrideForm.reason.trim() || null,
      };

      const query = overrideForm.id
        ? supabase.from('ticket_availability_overrides').update(payload).eq('id', overrideForm.id)
        : supabase.from('ticket_availability_overrides').insert(payload);

      const { error } = await query;
      if (error) throw error;

      await reloadOverrides();
      resetOverrideForm();
      showToast('success', overrideForm.id ? 'Override updated' : 'Override created');
    } catch (error) {
      showToast('error', error instanceof Error ? error.message : 'Failed to save override');
    } finally {
      setSavingOverride(false);
    }
  };

  const handleDeleteOverride = async (overrideId: number) => {
    setDeletingOverrideId(overrideId);
    try {
      const { error } = await supabase.from('ticket_availability_overrides').delete().eq('id', overrideId);
      if (error) throw error;
      await reloadOverrides();
      if (overrideForm.id === overrideId) resetOverrideForm();
      showToast('success', 'Override deleted');
    } catch (error) {
      showToast('error', error instanceof Error ? error.message : 'Failed to delete override');
    } finally {
      setDeletingOverrideId(null);
    }
  };

  const handleAvailabilityAction = async (mode: 'generate' | 'regenerate') => {
    if (!ticket) return;
    if (!startDate || !endDate) {
      showToast('error', 'Select a start and end date first');
      return;
    }
    if (startDate > endDate) {
      showToast('error', 'Start date must be before end date');
      return;
    }

    setRunningAction(mode);
    setActionSummary(null);
    try {
      if (mode === 'generate') {
        const { data, error } = await supabase.rpc('generate_ticket_availability', {
          p_start_date: startDate,
          p_end_date: endDate,
          p_ticket_id: ticket.id,
        });

        if (error) throw error;
        const insertedCount = Number(data ?? 0);
        const message =
          insertedCount > 0
            ? `Generated ${insertedCount} new availability rows`
            : 'No new availability rows were needed for that range';
        setActionSummary(message);
        showToast('success', message);
      } else {
        const { data, error } = await supabase.rpc('regenerate_ticket_availability', {
          p_start_date: startDate,
          p_end_date: endDate,
          p_ticket_id: ticket.id,
        });

        if (error) throw error;

        const summary = data as {
          inserted?: number;
          updated?: number;
          deleted?: number;
          skipped_locked?: number;
        } | null;
        const message = `Regenerated range: inserted ${summary?.inserted ?? 0}, updated ${summary?.updated ?? 0}, deleted ${summary?.deleted ?? 0}, skipped ${summary?.skipped_locked ?? 0}`;
        setActionSummary(message);
        showToast('success', message);
      }
    } catch (error) {
      showToast('error', error instanceof Error ? error.message : 'Availability action failed');
    } finally {
      setRunningAction(null);
    }
  };

  if (loading) {
    return (
      <AdminLayout
        menuItems={ADMIN_MENU_ITEMS}
        menuSections={ADMIN_MENU_SECTIONS}
        defaultActiveMenuId="entrance-booking"
        title="Entrance Booking Manager"
        subtitle="Loading..."
        onLogout={signOut}
      >
        <div className="animate-pulse bg-white p-6 rounded-2xl h-96" />
      </AdminLayout>
    );
  }

  if (pageError || !ticket || !ticketForm || !settingsForm) {
    return (
      <AdminLayout
        menuItems={ADMIN_MENU_ITEMS}
        menuSections={ADMIN_MENU_SECTIONS}
        defaultActiveMenuId="entrance-booking"
        title="Entrance Booking Manager"
        subtitle="Operational controls for entrance booking"
        onLogout={signOut}
      >
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
          {pageError?.message || 'Entrance ticket configuration is unavailable.'}
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout
      menuItems={ADMIN_MENU_ITEMS}
      menuSections={ADMIN_MENU_SECTIONS}
      defaultActiveMenuId="entrance-booking"
      title="Entrance Booking Manager"
      subtitle="Operational controls for entrance booking"
      onLogout={signOut}
    >
      <div className="space-y-8 pb-20">
        <SectionCard
          title="Ticket Identity"
          description="The admin UI currently manages the entrance ticket only."
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
              <p className="text-xs font-bold uppercase tracking-widest text-gray-500">Ticket</p>
              <p className="mt-1 text-sm font-semibold text-gray-900">{ticket.name}</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
              <p className="text-xs font-bold uppercase tracking-widest text-gray-500">Slug</p>
              <p className="mt-1 text-sm font-semibold text-gray-900">{ticket.slug}</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
              <p className="text-xs font-bold uppercase tracking-widest text-gray-500">Ticket ID</p>
              <p className="mt-1 text-sm font-semibold text-gray-900">{ticket.id}</p>
            </div>
          </div>
        </SectionCard>

        <SectionCard
          title="Commercial & Status"
          description="Global booking status, public price, sale season bounds, and canonical slot template."
        >
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <label className="space-y-2">
              <span className="block text-xs font-bold uppercase tracking-widest text-gray-500">Ticket Active</span>
              <button
                type="button"
                onClick={() => setTicketForm((current) => current ? { ...current, is_active: !current.is_active } : current)}
                className={`inline-flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold ${
                  ticketForm.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">power_settings_new</span>
                {ticketForm.is_active ? 'Booking enabled' : 'Booking disabled'}
              </button>
            </label>

            <label className="space-y-2">
              <span className="block text-xs font-bold uppercase tracking-widest text-gray-500">Price</span>
              <input
                type="number"
                min="0"
                value={ticketForm.price}
                onChange={(event) => setTicketForm((current) => current ? { ...current, price: event.target.value } : current)}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </label>

            <label className="space-y-2">
              <span className="block text-xs font-bold uppercase tracking-widest text-gray-500">Available From</span>
              <input
                type="date"
                value={ticketForm.available_from}
                onChange={(event) =>
                  setTicketForm((current) => current ? { ...current, available_from: event.target.value } : current)
                }
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </label>

            <label className="space-y-2">
              <span className="block text-xs font-bold uppercase tracking-widest text-gray-500">Available Until</span>
              <input
                type="date"
                value={ticketForm.available_until}
                onChange={(event) =>
                  setTicketForm((current) => current ? { ...current, available_until: event.target.value } : current)
                }
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </label>
          </div>

          <label className="space-y-2 block">
            <span className="block text-xs font-bold uppercase tracking-widest text-gray-500">Time Slots</span>
            <input
              type="text"
              value={ticketForm.time_slots}
              onChange={(event) => setTicketForm((current) => current ? { ...current, time_slots: event.target.value } : current)}
              placeholder="09:00, 12:00, 15:00, 18:00"
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
            <p className="text-xs text-gray-500">Use comma-separated HH:MM values. Regenerate availability after changing slots.</p>
          </label>
        </SectionCard>

        <SectionCard
          title="Operational Rules"
          description="Server-enforced booking rules used by public booking flows and payment creation."
        >
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <label className="space-y-2">
              <span className="block text-xs font-bold uppercase tracking-widest text-gray-500">Max Tickets Per Booking</span>
              <input
                type="number"
                min="1"
                value={settingsForm.max_tickets_per_booking}
                onChange={(event) =>
                  setSettingsForm((current) => current ? { ...current, max_tickets_per_booking: event.target.value } : current)
                }
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </label>

            <label className="space-y-2">
              <span className="block text-xs font-bold uppercase tracking-widest text-gray-500">Booking Window Days</span>
              <input
                type="number"
                min="1"
                value={settingsForm.booking_window_days}
                onChange={(event) =>
                  setSettingsForm((current) => current ? { ...current, booking_window_days: event.target.value } : current)
                }
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </label>

            <label className="space-y-2">
              <span className="block text-xs font-bold uppercase tracking-widest text-gray-500">Auto Generate Days Ahead</span>
              <input
                type="number"
                min="0"
                value={settingsForm.auto_generate_days_ahead}
                onChange={(event) =>
                  setSettingsForm((current) => current ? { ...current, auto_generate_days_ahead: event.target.value } : current)
                }
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </label>

            <label className="space-y-2">
              <span className="block text-xs font-bold uppercase tracking-widest text-gray-500">Default Slot Capacity</span>
              <input
                type="number"
                min="1"
                value={settingsForm.default_slot_capacity}
                onChange={(event) =>
                  setSettingsForm((current) => current ? { ...current, default_slot_capacity: event.target.value } : current)
                }
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </label>
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => void handleSaveConfig()}
              disabled={savingConfig}
              className="inline-flex items-center gap-2 rounded-xl border border-main-700 bg-main-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-main-600/25 transition hover:bg-main-700 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <span className="material-symbols-outlined text-[18px]">save</span>
              {savingConfig ? 'Saving...' : 'Save operational settings'}
            </button>
          </div>
        </SectionCard>

        <SectionCard
          title="Availability Actions"
          description="Generate missing rows or resync an existing range with the latest slot template and default capacity."
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <label className="space-y-2">
              <span className="block text-xs font-bold uppercase tracking-widest text-gray-500">Start Date</span>
              <input
                type="date"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </label>

            <label className="space-y-2">
              <span className="block text-xs font-bold uppercase tracking-widest text-gray-500">End Date</span>
              <input
                type="date"
                value={endDate}
                onChange={(event) => setEndDate(event.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </label>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => void handleAvailabilityAction('generate')}
              disabled={runningAction !== null}
              className="rounded-xl border border-emerald-700 bg-emerald-600 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {runningAction === 'generate' ? 'Generating...' : 'Generate missing availability'}
            </button>
            <button
              type="button"
              onClick={() => void handleAvailabilityAction('regenerate')}
              disabled={runningAction !== null}
              className="rounded-xl border border-amber-700 bg-amber-600 px-5 py-3 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {runningAction === 'regenerate' ? 'Regenerating...' : 'Regenerate selected range'}
            </button>
          </div>

          {actionSummary ? (
            <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
              {actionSummary}
            </div>
          ) : null}
        </SectionCard>

        <SectionCard
          title="Overrides"
          description="Close entire dates, close a specific slot, or override capacity for a single date/slot."
        >
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="space-y-4">
              <label className="space-y-2 block">
                <span className="block text-xs font-bold uppercase tracking-widest text-gray-500">Date</span>
                <input
                  type="date"
                  value={overrideForm.date}
                  onChange={(event) => setOverrideForm((current) => ({ ...current, date: event.target.value }))}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </label>

              <label className="space-y-2 block">
                <span className="block text-xs font-bold uppercase tracking-widest text-gray-500">Time Slot</span>
                <input
                  type="time"
                  value={overrideForm.time_slot}
                  onChange={(event) => setOverrideForm((current) => ({ ...current, time_slot: event.target.value }))}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
                <p className="text-xs text-gray-500">Leave blank to apply the override to every slot on that date.</p>
              </label>

              <label className="flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={overrideForm.is_closed}
                  onChange={(event) => setOverrideForm((current) => ({ ...current, is_closed: event.target.checked }))}
                />
                Close booking for this date or slot
              </label>

              <label className="space-y-2 block">
                <span className="block text-xs font-bold uppercase tracking-widest text-gray-500">Capacity Override</span>
                <input
                  type="number"
                  min="1"
                  value={overrideForm.capacity_override}
                  onChange={(event) => setOverrideForm((current) => ({ ...current, capacity_override: event.target.value }))}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </label>

              <label className="space-y-2 block">
                <span className="block text-xs font-bold uppercase tracking-widest text-gray-500">Reason</span>
                <textarea
                  value={overrideForm.reason}
                  onChange={(event) => setOverrideForm((current) => ({ ...current, reason: event.target.value }))}
                  rows={3}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </label>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => void handleSaveOverride()}
                  disabled={savingOverride}
                  className="rounded-xl border border-main-700 bg-main-600 px-5 py-3 text-sm font-semibold text-white hover:bg-main-700 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {savingOverride ? 'Saving...' : overrideForm.id ? 'Update override' : 'Create override'}
                </button>
                <button
                  type="button"
                  onClick={resetOverrideForm}
                  className="rounded-xl border border-gray-200 px-5 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Reset form
                </button>
              </div>
            </div>

            <div className="space-y-3">
              {overridesLoading ? (
                <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-6 text-sm text-gray-500">
                  Loading overrides...
                </div>
              ) : overrides.length === 0 ? (
                <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-4 py-6 text-sm text-gray-500">
                  No overrides yet.
                </div>
              ) : (
                overrides.map((override) => (
                  <div key={override.id} className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-gray-900">
                          {override.date} {override.time_slot ? `· ${override.time_slot.slice(0, 5)}` : '· All slots'}
                        </p>
                        <p className="mt-1 text-xs text-gray-500">
                          {override.is_closed ? 'Closed' : 'Open'}{override.capacity_override != null ? ` · Capacity ${override.capacity_override}` : ''}
                        </p>
                        {override.reason ? <p className="mt-2 text-sm text-gray-700">{override.reason}</p> : null}
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => handleEditOverride(override)}
                          className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-white"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDeleteOverride(override.id)}
                          disabled={deletingOverrideId === override.id}
                          className="rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-60"
                        >
                          {deletingOverrideId === override.id ? 'Deleting...' : 'Delete'}
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </SectionCard>
      </div>
    </AdminLayout>
  );
}
