export interface TicketData {
  month: string;
  day: number;
  dayOfWeek: string;
  isToday?: boolean;
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
