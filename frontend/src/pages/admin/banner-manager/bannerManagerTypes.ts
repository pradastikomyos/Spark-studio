import type { Dispatch, SetStateAction, ChangeEvent, FormEvent } from 'react';

export type BannerType = 'hero' | 'stage' | 'promo' | 'events' | 'shop' | 'process' | 'spark-map';

export type Banner = {
  id: number;
  title: string;
  subtitle: string | null;
  image_url: string;
  title_image_url: string | null;
  link_url: string | null;
  banner_type: BannerType;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type BannerFormData = {
  title: string;
  subtitle: string;
  image_url: string;
  title_image_url: string;
  link_url: string;
  banner_type: BannerType;
  display_order: number;
  is_active: boolean;
};

export type BannerGroups = Record<BannerType, Banner[]>;

export type BannerManagerController = {
  banners: Banner[];
  loading: boolean;
  showForm: boolean;
  editingBanner: Banner | null;
  uploading: boolean;
  uploadingTitle: boolean;
  saving: boolean;
  formData: BannerFormData;
  stageBannersOrder: Banner[];
  hasUnsavedChanges: boolean;
  applyingOrder: boolean;
  groupedBanners: BannerGroups;
  setFormData: Dispatch<SetStateAction<BannerFormData>>;
  openCreateForm: () => void;
  closeForm: () => void;
  handleImageUpload: (event: ChangeEvent<HTMLInputElement>) => Promise<void>;
  handleTitleImageUpload: (event: ChangeEvent<HTMLInputElement>) => Promise<void>;
  handleSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  handleEdit: (banner: Banner) => void;
  handleDelete: (id: number) => Promise<void>;
  handleToggleActive: (banner: Banner) => Promise<void>;
  handleStageOrderChange: (orderedIds: number[]) => void;
  handleApplyOrder: () => Promise<void>;
  handleCancelOrder: () => void;
};
