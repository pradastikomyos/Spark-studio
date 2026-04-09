import { useEffect, useState, type ReactNode } from 'react';
import AdminLayout from '../../components/AdminLayout';
import { useToast } from '../../components/Toast';
import { useAuth } from '../../contexts/AuthContext';
import { ADMIN_MENU_ITEMS, ADMIN_MENU_SECTIONS } from '../../constants/adminMenu';
import {
  DEFAULT_BOOKING_PAGE_SETTINGS,
  useBookingPageSettings,
  type BookingPageSettings,
} from '../../hooks/useBookingPageSettings';

type BookingPageFormState = Omit<BookingPageSettings, 'id'>;

function createDefaultFormState(): BookingPageFormState {
  const { id: _id, ...rest } = DEFAULT_BOOKING_PAGE_SETTINGS;
  void _id;
  return {
    ...rest,
    important_info_items: [...rest.important_info_items],
  };
}

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
    <section className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-5">
      <div className="border-b border-gray-100 pb-3">
        <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
        <p className="mt-1 text-sm text-gray-500">{description}</p>
      </div>
      {children}
    </section>
  );
}

export default function BookingPageManager() {
  const { signOut } = useAuth();
  const { showToast } = useToast();
  const { settings, isLoading, updateSettings } = useBookingPageSettings();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<BookingPageFormState>(createDefaultFormState);

  useEffect(() => {
    if (settings) {
      const { id: _id, ...rest } = settings;
      void _id;
      setForm({
        ...rest,
        important_info_items: [...rest.important_info_items],
      });
      return;
    }

    setForm(createDefaultFormState());
  }, [settings]);

  const setField = <K extends keyof BookingPageFormState>(field: K, value: BookingPageFormState[K]) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const setImportantInfoItem = (index: number, value: string) => {
    setForm((current) => ({
      ...current,
      important_info_items: current.important_info_items.map((item, itemIndex) => (
        itemIndex === index ? value : item
      )),
    }));
  };

  const addImportantInfoItem = () => {
    setForm((current) => ({
      ...current,
      important_info_items: [...current.important_info_items, ''],
    }));
  };

  const removeImportantInfoItem = (index: number) => {
    setForm((current) => ({
      ...current,
      important_info_items: current.important_info_items.filter((_, itemIndex) => itemIndex !== index),
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateSettings({
        ...form,
        important_info_items: form.important_info_items.map((item) => item.trim()).filter(Boolean),
      });
      showToast('success', 'Booking page settings saved successfully');
    } catch (err: unknown) {
      showToast('error', err instanceof Error ? err.message : 'Gagal menyimpan pengaturan booking.');
    } finally {
      setSaving(false);
    }
  };

  const renderInput = (
    label: string,
    field: keyof BookingPageFormState,
    placeholder?: string
  ) => {
    const inputId = `booking-page-${String(field)}`;

    return (
      <div className="space-y-2">
        <label htmlFor={inputId} className="block text-xs font-bold uppercase tracking-widest text-gray-500">{label}</label>
        <input
          id={inputId}
          type="text"
          value={typeof form[field] === 'string' ? form[field] as string : ''}
          onChange={(event) => setField(field, event.target.value as BookingPageFormState[typeof field])}
          placeholder={placeholder}
          className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
        />
      </div>
    );
  };

  const renderTextarea = (
    label: string,
    field: keyof BookingPageFormState,
    rows = 3
  ) => {
    const inputId = `booking-page-${String(field)}`;

    return (
      <div className="space-y-2">
        <label htmlFor={inputId} className="block text-xs font-bold uppercase tracking-widest text-gray-500">{label}</label>
        <textarea
          id={inputId}
          value={typeof form[field] === 'string' ? form[field] as string : ''}
          onChange={(event) => setField(field, event.target.value as BookingPageFormState[typeof field])}
          rows={rows}
          className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
        />
      </div>
    );
  };

  if (isLoading && !settings) {
    return (
      <AdminLayout
        menuItems={ADMIN_MENU_ITEMS}
        menuSections={ADMIN_MENU_SECTIONS}
        defaultActiveMenuId="booking-page"
        title="Booking Page CMS"
        subtitle="Loading..."
        onLogout={signOut}
      >
        <div className="animate-pulse bg-white p-6 rounded-2xl h-96" />
      </AdminLayout>
    );
  }

  return (
    <AdminLayout
      menuItems={ADMIN_MENU_ITEMS}
      menuSections={ADMIN_MENU_SECTIONS}
      defaultActiveMenuId="booking-page"
      title="Booking Page CMS"
      subtitle="Manage journey selection and booking copy"
      onLogout={signOut}
    >
      <div className="space-y-8 pb-20">
        <div className="flex justify-between items-center pb-2 border-b border-gray-100">
          <p className="text-sm text-gray-500">
            Semua teks booking yang sebelumnya hardcoded sekarang bisa diubah dari halaman ini.
          </p>
        </div>

        <SectionCard
          title="Journey Section"
          description="Teks utama yang tampil di halaman pilih tanggal dan slot."
        >
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {renderInput('Journey Title', 'journey_title')}
            {renderInput('Calendar Title', 'calendar_title')}
          </div>
          {renderTextarea('Journey Description', 'journey_description', 4)}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {renderInput('Time Slots Title', 'time_slots_title')}
            {renderInput('Empty Slots Message', 'empty_slots_message')}
          </div>
        </SectionCard>

        <SectionCard
          title="Booking Page Hero"
          description="Heading untuk flow booking versi detail."
        >
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {renderInput('Reserve Title', 'reserve_title')}
            {renderInput('Access Type Title', 'access_type_title')}
          </div>
          {renderTextarea('Reserve Description', 'reserve_description', 4)}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {renderInput('All Day Access Label', 'all_day_access_label')}
            {renderInput('All Day Access Helper', 'all_day_access_helper')}
            {renderInput('Choose Specific Time Label', 'choose_specific_time_label')}
          </div>
        </SectionCard>

        <SectionCard
          title="Booking Summary"
          description="Label yang muncul di kartu ringkasan booking dan checkout."
        >
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {renderInput('Summary Title', 'booking_summary_title')}
            {renderInput('Ticket Type Label', 'ticket_type_label')}
            {renderInput('Date Label', 'date_label')}
            {renderInput('Time Label', 'time_label')}
            {renderInput('Not Selected Label', 'not_selected_label')}
            {renderInput('All Day Value Label', 'all_day_access_value_label')}
            {renderInput('Quantity Label', 'quantity_label')}
            {renderInput('Max Tickets Template', 'max_tickets_label_template', 'Use {count} for the limit')}
            {renderInput('Ticket Price Label', 'ticket_price_label')}
            {renderInput('VAT Included Label', 'vat_included_label')}
            {renderInput('Total Label', 'total_label')}
            {renderInput('Proceed Button Label', 'proceed_button_label')}
            {renderInput('Secure Checkout Label', 'secure_checkout_label')}
          </div>
        </SectionCard>

        <SectionCard
          title="Important Info"
          description="Catatan bawah kartu booking. Admin bisa tambah atau hapus poin."
        >
          {renderInput('Important Info Title', 'important_info_title')}
          <div className="space-y-4">
            {form.important_info_items.map((item, index) => (
              <div key={`important-info-${index}`} className="flex gap-3 items-start">
                <textarea
                  aria-label={`Important Info Item ${index + 1}`}
                  value={item}
                  onChange={(event) => setImportantInfoItem(index, event.target.value)}
                  rows={2}
                  className="flex-1 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
                <button
                  type="button"
                  onClick={() => removeImportantInfoItem(index)}
                  disabled={form.important_info_items.length <= 1}
                  className="mt-1 rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Hapus
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={addImportantInfoItem}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              Tambah Poin
            </button>
          </div>
        </SectionCard>

        <div className="sticky bottom-6 z-10 flex justify-end">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl border border-main-700 bg-main-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-main-600/25 transition hover:bg-main-700 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <span className="material-symbols-outlined text-[18px]">save</span>
            {saving ? 'Saving...' : 'Save booking page'}
          </button>
        </div>
      </div>
    </AdminLayout>
  );
}
