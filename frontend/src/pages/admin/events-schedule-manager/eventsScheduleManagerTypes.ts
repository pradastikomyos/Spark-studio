import type { Dispatch, SetStateAction } from 'react';
import type { EventScheduleItem } from '../../../hooks/useEventSchedule';

export type ScheduleFormState = {
  title: string;
  description: string;
  event_date: string;
  time_label: string;
  category: string;
  image_url: string;
  image_path: string;
  image_bucket: string;
  placeholder_icon: string;
  is_coming_soon: boolean;
  button_text: string;
  button_url: string;
  sort_order: number;
  is_active: boolean;
};

export type EventsScheduleManagerController = {
  items: EventScheduleItem[];
  isLoading: boolean;
  error: unknown;
  searchQuery: string;
  editingItem: EventScheduleItem | null;
  form: ScheduleFormState;
  saving: boolean;
  uploading: boolean;
  orderItems: EventScheduleItem[];
  hasUnsavedOrder: boolean;
  applyingOrder: boolean;
  filteredItems: EventScheduleItem[];
  previewItem: EventScheduleItem;
  setSearchQuery: Dispatch<SetStateAction<string>>;
  setForm: Dispatch<SetStateAction<ScheduleFormState>>;
  resetEditor: () => void;
  handleEdit: (item: EventScheduleItem) => void;
  handleSave: () => Promise<void>;
  handleDelete: (item: EventScheduleItem) => Promise<void>;
  handleToggleActive: (item: EventScheduleItem) => Promise<void>;
  handleUploadImageFile: (file: File) => Promise<void>;
  handleOrderChange: (orderedIds: number[]) => void;
  handleApplyOrder: () => Promise<void>;
  handleCancelOrder: () => void;
};
