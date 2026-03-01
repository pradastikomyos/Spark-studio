import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

export type BeautyPoster = {
  id: number;
  title: string;
  slug: string;
  description: string | null;
  image_url: string;
  is_active: boolean;
  sort_order: number;
};

async function fetchBeautyPosters(): Promise<BeautyPoster[]> {
  const { data, error } = await supabase
    .from('beauty_posters')
    .select('id, title, slug, description, image_url, is_active, sort_order')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  if (error) throw error;
  return (data ?? []) as BeautyPoster[];
}

export function useBeautyPosters() {
  return useQuery({
    queryKey: ['beauty-posters', 'public'],
    queryFn: fetchBeautyPosters,
    staleTime: 5 * 60 * 1000,
  });
}

