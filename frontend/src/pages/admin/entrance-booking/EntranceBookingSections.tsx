import type { Dispatch, ReactNode, SetStateAction } from 'react';
import type { EntranceTicket } from '../../../hooks/useEntranceTicket';
import { RupiahPriceInput } from '../../../components/RupiahPriceInput';
import type {
  AvailabilityActionMode,
  OverrideFormState,
  OverrideRow,
  SettingsFormState,
  TicketFormState,
} from './entranceBookingTypes';

export function SectionCard({
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

export function TicketIdentitySection({ ticket }: { ticket: EntranceTicket }) {
  return (
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
  );
}

export function CommercialStatusSection({
  ticketForm,
  setTicketForm,
}: {
  ticketForm: TicketFormState;
  setTicketForm: Dispatch<SetStateAction<TicketFormState | null>>;
}) {
  return (
    <SectionCard
      title="Commercial & Status"
      description="Global booking status, public price, sale season bounds, and canonical slot template."
    >
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <label className="space-y-2">
          <span className="block text-xs font-bold uppercase tracking-widest text-gray-500">Ticket Active</span>
          <button
            type="button"
            onClick={() => setTicketForm((current) => (current ? { ...current, is_active: !current.is_active } : current))}
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
          <RupiahPriceInput
            value={ticketForm.price}
            onChange={(raw) =>
              setTicketForm((current) => (current ? { ...current, price: raw } : current))
            }
            placeholder="50.000"
            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          />
          <p className="text-xs text-gray-500">Use whole rupiah only (e.g. 50000 or 50.000).</p>
        </label>

        <label className="space-y-2">
          <span className="block text-xs font-bold uppercase tracking-widest text-gray-500">Available From</span>
          <input
            type="date"
            value={ticketForm.available_from}
            onChange={(event) =>
              setTicketForm((current) => (current ? { ...current, available_from: event.target.value } : current))
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
              setTicketForm((current) => (current ? { ...current, available_until: event.target.value } : current))
            }
            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          />
        </label>
      </div>

      <label className="block space-y-2">
        <span className="block text-xs font-bold uppercase tracking-widest text-gray-500">Time Slots</span>
        <input
          type="text"
          value={ticketForm.time_slots}
          onChange={(event) => setTicketForm((current) => (current ? { ...current, time_slots: event.target.value } : current))}
          placeholder="09:00, 12:00, 15:00, 18:00"
          className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
        />
        <p className="text-xs text-gray-500">Use comma-separated HH:MM values. Regenerate availability after changing slots.</p>
      </label>
    </SectionCard>
  );
}

export function OperationalRulesSection({
  settingsForm,
  setSettingsForm,
  savingConfig,
  hasConfigChanges,
  onResetConfig,
  onSaveConfig,
}: {
  settingsForm: SettingsFormState;
  setSettingsForm: Dispatch<SetStateAction<SettingsFormState | null>>;
  savingConfig: boolean;
  hasConfigChanges: boolean;
  onResetConfig: () => void;
  onSaveConfig: () => void;
}) {
  return (
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
              setSettingsForm((current) => (current ? { ...current, max_tickets_per_booking: event.target.value } : current))
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
              setSettingsForm((current) => (current ? { ...current, booking_window_days: event.target.value } : current))
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
              setSettingsForm((current) => (current ? { ...current, auto_generate_days_ahead: event.target.value } : current))
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
              setSettingsForm((current) => (current ? { ...current, default_slot_capacity: event.target.value } : current))
            }
            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          />
        </label>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-gray-500">
          {hasConfigChanges ? 'Unsaved changes include the commercial section above.' : 'No unsaved config changes.'}
        </p>
        <button
          type="button"
          onClick={onResetConfig}
          disabled={savingConfig || !hasConfigChanges}
          className="rounded-xl border border-gray-200 px-5 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Reset changes
        </button>
        <button
          type="button"
          onClick={onSaveConfig}
          disabled={savingConfig || !hasConfigChanges}
          className="inline-flex items-center gap-2 rounded-xl border border-main-700 bg-main-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-main-600/25 transition hover:bg-main-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <span className="material-symbols-outlined text-[18px]">save</span>
          {savingConfig ? 'Saving...' : 'Save operational settings'}
        </button>
      </div>
    </SectionCard>
  );
}

export function AvailabilityActionsSection({
  startDate,
  endDate,
  setStartDate,
  setEndDate,
  runningAction,
  actionSummary,
  onRunAction,
}: {
  startDate: string;
  endDate: string;
  setStartDate: Dispatch<SetStateAction<string>>;
  setEndDate: Dispatch<SetStateAction<string>>;
  runningAction: AvailabilityActionMode | null;
  actionSummary: string | null;
  onRunAction: (mode: AvailabilityActionMode) => void;
}) {
  return (
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
          onClick={() => onRunAction('generate')}
          disabled={runningAction !== null}
          className="rounded-xl border border-emerald-700 bg-emerald-600 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {runningAction === 'generate' ? 'Generating...' : 'Generate missing availability'}
        </button>
        <button
          type="button"
          onClick={() => onRunAction('regenerate')}
          disabled={runningAction !== null}
          className="rounded-xl border border-amber-700 bg-amber-600 px-5 py-3 text-sm font-semibold text-white hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-60"
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
  );
}

export function OverridesSection({
  overrideForm,
  setOverrideForm,
  savingOverride,
  onSaveOverride,
  onResetOverrideForm,
  overridesLoading,
  overrides,
  onEditOverride,
  onDeleteOverride,
  deletingOverrideId,
}: {
  overrideForm: OverrideFormState;
  setOverrideForm: Dispatch<SetStateAction<OverrideFormState>>;
  savingOverride: boolean;
  onSaveOverride: () => void;
  onResetOverrideForm: () => void;
  overridesLoading: boolean;
  overrides: OverrideRow[];
  onEditOverride: (override: OverrideRow) => void;
  onDeleteOverride: (overrideId: number) => void;
  deletingOverrideId: number | null;
}) {
  return (
    <SectionCard
      title="Overrides"
      description="Close entire dates, close a specific slot, or override capacity for a single date/slot."
    >
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <label className="block space-y-2">
            <span className="block text-xs font-bold uppercase tracking-widest text-gray-500">Date</span>
            <input
              type="date"
              value={overrideForm.date}
              onChange={(event) => setOverrideForm((current) => ({ ...current, date: event.target.value }))}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </label>

          <label className="block space-y-2">
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

          <label className="block space-y-2">
            <span className="block text-xs font-bold uppercase tracking-widest text-gray-500">Capacity Override</span>
            <input
              type="number"
              min="1"
              value={overrideForm.capacity_override}
              onChange={(event) => setOverrideForm((current) => ({ ...current, capacity_override: event.target.value }))}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </label>

          <label className="block space-y-2">
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
              onClick={onSaveOverride}
              disabled={savingOverride}
              className="rounded-xl border border-main-700 bg-main-600 px-5 py-3 text-sm font-semibold text-white hover:bg-main-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {savingOverride ? 'Saving...' : overrideForm.id ? 'Update override' : 'Create override'}
            </button>
            <button
              type="button"
              onClick={onResetOverrideForm}
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
                      {override.is_closed ? 'Closed' : 'Open'}
                      {override.capacity_override != null ? ` · Capacity ${override.capacity_override}` : ''}
                    </p>
                    {override.reason ? <p className="mt-2 text-sm text-gray-700">{override.reason}</p> : null}
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => onEditOverride(override)}
                      className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-white"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteOverride(override.id)}
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
  );
}
