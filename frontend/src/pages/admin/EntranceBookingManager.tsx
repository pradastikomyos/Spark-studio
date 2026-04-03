import AdminLayout from '../../components/AdminLayout';
import { useToast } from '../../components/Toast';
import { useAuth } from '../../contexts/AuthContext';
import { ADMIN_MENU_ITEMS, ADMIN_MENU_SECTIONS } from '../../constants/adminMenu';
import { useEntranceTicket } from '../../hooks/useEntranceTicket';
import { useTicketBookingSettings } from '../../hooks/useTicketBookingSettings';
import {
  AvailabilityActionsSection,
  CommercialStatusSection,
  OperationalRulesSection,
  OverridesSection,
  TicketIdentitySection,
} from './entrance-booking/EntranceBookingSections';
import { useEntranceAvailabilityActions } from './entrance-booking/useEntranceAvailabilityActions';
import { useEntranceBookingConfigForm } from './entrance-booking/useEntranceBookingConfigForm';
import { useEntranceOverridesManager } from './entrance-booking/useEntranceOverridesManager';

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

  const {
    ticketForm,
    setTicketForm,
    settingsForm,
    setSettingsForm,
    savingConfig,
    hasConfigChanges,
    resetConfigForms,
    handleSaveConfig,
  } = useEntranceBookingConfigForm({
    ticket,
    bookingSettings,
    refetchTicket,
    refetchSettings,
    showToast,
  });
  const {
    overridesLoading,
    overrides,
    overrideForm,
    setOverrideForm,
    savingOverride,
    deletingOverrideId,
    resetOverrideForm,
    handleEditOverride,
    handleSaveOverride,
    handleDeleteOverride,
  } = useEntranceOverridesManager({
    ticketId: ticket?.id,
    showToast,
  });
  const {
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    runningAction,
    actionSummary,
    handleAvailabilityAction,
  } = useEntranceAvailabilityActions({
    ticketId: ticket?.id,
    showToast,
  });

  const loading = ticketLoading || settingsLoading;
  const pageError = ticketError instanceof Error ? ticketError : settingsError instanceof Error ? settingsError : null;

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
        <div className="h-96 animate-pulse rounded-2xl bg-white p-6" />
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
        <TicketIdentitySection ticket={ticket} />
        <CommercialStatusSection ticketForm={ticketForm} setTicketForm={setTicketForm} />
        <OperationalRulesSection
          settingsForm={settingsForm}
          setSettingsForm={setSettingsForm}
          savingConfig={savingConfig}
          hasConfigChanges={hasConfigChanges}
          onResetConfig={resetConfigForms}
          onSaveConfig={() => void handleSaveConfig()}
        />
        <AvailabilityActionsSection
          startDate={startDate}
          endDate={endDate}
          setStartDate={setStartDate}
          setEndDate={setEndDate}
          runningAction={runningAction}
          actionSummary={actionSummary}
          onRunAction={(mode) => void handleAvailabilityAction(mode)}
        />
        <OverridesSection
          overrideForm={overrideForm}
          setOverrideForm={setOverrideForm}
          savingOverride={savingOverride}
          onSaveOverride={() => void handleSaveOverride()}
          onResetOverrideForm={resetOverrideForm}
          overridesLoading={overridesLoading}
          overrides={overrides}
          onEditOverride={handleEditOverride}
          onDeleteOverride={(overrideId) => void handleDeleteOverride(overrideId)}
          deletingOverrideId={deletingOverrideId}
        />
      </div>
    </AdminLayout>
  );
}
