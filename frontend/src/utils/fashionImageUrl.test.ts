import { describe, expect, it } from 'vitest';
import { getOptimizedFashionModelUrl, parseFashionStorageObjectPath } from './fashionImageUrl';

describe('fashionImageUrl', () => {
  it('parses object path from public object URL', () => {
    const input = 'https://hogzjapnkvsihvvbgcdb.supabase.co/storage/v1/object/public/fashion-images/1/2/abc.png';
    expect(parseFashionStorageObjectPath(input)).toBe('1/2/abc.png');
  });

  it('parses object path from public render URL', () => {
    const input = 'https://hogzjapnkvsihvvbgcdb.supabase.co/storage/v1/render/image/public/fashion-images/1/2/abc.png?height=800';
    expect(parseFashionStorageObjectPath(input)).toBe('1/2/abc.png');
  });

  it('returns unchanged for non-supabase URLs', () => {
    const input = 'https://images.unsplash.com/photo-1509631179647-0177331693ae?w=800&q=80&auto=format';
    expect(getOptimizedFashionModelUrl(input, { height: 1600 })).toBe(input);
  });

  it('builds render URL with height for fashion-images object URLs', () => {
    const input = 'https://hogzjapnkvsihvvbgcdb.supabase.co/storage/v1/object/public/fashion-images/1/2/abc.png';
    const output = getOptimizedFashionModelUrl(input, { height: 1600 });
    expect(output).toContain('/storage/v1/render/image/public/fashion-images/1/2/abc.png');
    expect(output).toContain('height=1600');
  });
});

