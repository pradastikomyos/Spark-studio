export type Category = {
  id: number;
  name: string;
  slug: string;
  is_active: boolean;
  parent_id: number | null;
  created_at: string | null;
  updated_at: string | null;
};

export type CategoryDraft = {
  id?: number;
  name: string;
  slug: string;
  is_active: boolean;
  parent_id: number | null;
};

export type CategoryManagerProps = {
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
};
