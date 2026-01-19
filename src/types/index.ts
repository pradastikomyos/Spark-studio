export interface TicketData {
  id: number;
  slug: string;
  name: string;
  type: string;
  price: string;
  description: string | null;
  available_from: string;
  available_until: string;
  is_active: boolean;
}

export interface AboutItem {
  icon: string;
  title: string;
  description: string;
}

export interface CollectionItem {
  title: string;
  subtitle: string;
  imageUrl: string;
}
