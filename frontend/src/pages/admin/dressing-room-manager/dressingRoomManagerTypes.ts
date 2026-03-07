export interface DressingRoomCollection {
  id: number;
  title: string;
  slug: string;
  description: string | null;
  cover_image_url: string | null;
  is_active: boolean;
  sort_order: number;
}

export interface DressingRoomLookPhoto {
  id: number;
  look_id: number;
  image_url: string;
  label: string | null;
  sort_order: number;
}

export interface DressingRoomLookItem {
  id: number;
  look_id: number;
  product_variant_id: number;
  label: string | null;
  sort_order: number;
  resolved_image_url: string | null;
  product_variant: {
    id: number;
    name: string;
    sku: string;
    price: number | null;
    product: {
      id: number;
      name: string;
      slug: string;
      image_url: string | null;
    } | null;
  } | null;
}

export interface DressingRoomLook {
  id: number;
  collection_id: number;
  look_number: number;
  model_image_url: string;
  model_name: string | null;
  sort_order: number;
  photos: DressingRoomLookPhoto[];
  items: DressingRoomLookItem[];
}

export interface ProductVariantOption {
  id: number;
  name: string;
  sku: string;
  price: number | null;
  product_name: string;
  product_id: number;
}

export type DressingRoomView = 'list' | 'editor';

export type PendingUpload =
  | { kind: 'add-photo'; lookId: number }
  | { kind: 'replace-photo'; lookId: number; photoId: number; previousUrl: string };
