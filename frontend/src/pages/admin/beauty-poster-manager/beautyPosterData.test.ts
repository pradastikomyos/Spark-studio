import { describe, expect, it } from 'vitest';
import { createBeautyPosterSnapshot } from './beautyPosterData';

describe('beautyPosterData', () => {
  it('normalizes labels and ordering in snapshots', () => {
    const snapshot = createBeautyPosterSnapshot({
      posterId: 1,
      title: ' Poster ',
      slug: ' poster-slug ',
      imageUrl: ' https://example.com/image.jpg ',
      isActive: true,
      tags: [
        {
          product_variant_id: 2,
          product_id: 2,
          product_name: 'B',
          variant_name: 'B',
          image_url: null,
          label: '  ',
          x_pct: 10,
          y_pct: 20,
          size_pct: 6,
          is_placed: true,
          sort_order: 2,
        },
        {
          product_variant_id: 1,
          product_id: 1,
          product_name: 'A',
          variant_name: 'A',
          image_url: null,
          label: ' Label ',
          x_pct: 15,
          y_pct: 25,
          size_pct: 7,
          is_placed: true,
          sort_order: 1,
        },
      ],
    });

    expect(snapshot).toContain('"posterId":1');
    expect(snapshot).toContain('"title":"Poster"');
    expect(snapshot).toContain('"label":"Label"');
    expect(snapshot).toContain('"label":null');
  });
});
