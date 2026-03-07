import type {
  Dispatch,
  MutableRefObject,
  PointerEvent as ReactPointerEvent,
  SetStateAction,
} from 'react';
import type { ProductVariantSearchResult } from '../../../utils/productVariantSearch';

export type BeautyPosterRow = {
  id: number;
  title: string;
  slug: string;
  description: string | null;
  image_url: string;
  is_active: boolean;
  sort_order: number;
};

export type TagDraft = {
  id?: number;
  product_variant_id: number;
  product_id: number;
  product_name: string;
  variant_name: string;
  image_url: string | null;
  label: string | null;
  x_pct: number;
  y_pct: number;
  size_pct: number;
  is_placed: boolean;
  sort_order: number;
};

export type ActiveDragPreview = {
  productName: string;
  name: string;
} | null;

export type BeautyPosterController = {
  loading: boolean;
  saving: boolean;
  posters: BeautyPosterRow[];
  selectedPoster: BeautyPosterRow | null;
  title: string;
  slug: string;
  imageUrl: string;
  isActive: boolean;
  showUrlModal: boolean;
  urlDraft: string;
  tags: TagDraft[];
  productSearch: string;
  searchingProducts: boolean;
  productResults: ProductVariantSearchResult[];
  activeDragPreview: ActiveDragPreview;
  isDraggingAny: boolean;
  sensors: ReturnType<typeof import('@dnd-kit/core').useSensors>;
  canvasRef: MutableRefObject<HTMLDivElement | null>;
  uploadInputRef: MutableRefObject<HTMLInputElement | null>;
  editorTitle: string;
  isDirty: boolean;
  setTitle: Dispatch<SetStateAction<string>>;
  setSlug: Dispatch<SetStateAction<string>>;
  setIsActive: Dispatch<SetStateAction<boolean>>;
  setShowUrlModal: Dispatch<SetStateAction<boolean>>;
  setUrlDraft: Dispatch<SetStateAction<string>>;
  setTags: Dispatch<SetStateAction<TagDraft[]>>;
  openEditor: (poster: BeautyPosterRow | null) => Promise<void>;
  searchProducts: (query: string) => Promise<void>;
  handleUploadImage: (file: File) => Promise<void>;
  handleSelectVariant: (variant: ProductVariantSearchResult) => void;
  onPosterDragEnd: (event: import('@dnd-kit/core').DragEndEvent) => void;
  handleTagPointerDown: (variantId: number, event: ReactPointerEvent<HTMLElement>) => void;
  handleTagPointerMove: (event: ReactPointerEvent<HTMLElement>) => void;
  handleTagPointerUp: (event: ReactPointerEvent<HTMLElement>) => void;
  handleResizePointerDown: (variantId: number, startSizePct: number, event: ReactPointerEvent<HTMLDivElement>) => void;
  handleResizePointerMove: (event: ReactPointerEvent<HTMLDivElement>) => void;
  handleResizePointerUp: (event: ReactPointerEvent<HTMLDivElement>) => void;
  applyChanges: () => Promise<BeautyPosterRow | null>;
  resetEditor: () => Promise<void>;
  handleApplyUrl: () => void;
  handleDragStart: (event: import('@dnd-kit/core').DragStartEvent) => void;
  handleDragComplete: (event: import('@dnd-kit/core').DragEndEvent) => void;
  handleDragCancel: () => void;
};
