import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import BeautyPage from './BeautyPage';

vi.mock('../components/PageTransition', () => ({
  PageTransition: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('../components/ProductQuickViewModal', () => ({
  default: () => null,
}));

vi.mock('../hooks/useGlamPageSettings', () => ({
  DEFAULT_GLAM_PAGE_SETTINGS: {
    hero_title: 'Glam Makeup',
    hero_description: 'Soft glam with a polished finish.',
    hero_image_url: 'https://example.com/hero.jpg',
    look_heading: 'Get The Look',
    look_model_image_url: 'https://example.com/model.jpg',
    product_section_title: 'Charm Bar',
    product_search_placeholder: 'Search products...',
    look_star_links: [
      { slot: 'pink-rush', image_url: null, product_id: null },
      { slot: 'silver-blink', image_url: null, product_id: null },
      { slot: 'bronze', image_url: null, product_id: null },
      { slot: 'aura-pop', image_url: null, product_id: null },
    ],
    section_fonts: {
      hero: { heading: 'great_vibes', body: 'nunito_sans' },
      look: { heading: 'great_vibes', body: 'nunito_sans' },
      products: { heading: 'cardo', body: 'nunito_sans' },
    },
  },
  useGlamPageSettings: () => ({
    settings: {
      hero_title: 'Glam Makeup',
      hero_description: 'Soft glam with a polished finish.',
      hero_image_url: 'https://example.com/hero.jpg',
      look_heading: 'Get The Look',
      look_model_image_url: 'https://example.com/model.jpg',
      product_section_title: 'Charm Bar',
      product_search_placeholder: 'Search products...',
      look_star_links: [
        { slot: 'pink-rush', image_url: null, product_id: null },
        { slot: 'silver-blink', image_url: null, product_id: null },
        { slot: 'bronze', image_url: null, product_id: null },
        { slot: 'aura-pop', image_url: null, product_id: null },
      ],
      section_fonts: {
        hero: { heading: 'great_vibes', body: 'nunito_sans' },
        look: { heading: 'great_vibes', body: 'nunito_sans' },
        products: { heading: 'cardo', body: 'nunito_sans' },
      },
    },
    error: null,
  }),
}));

vi.mock('../hooks/useProducts', () => ({
  useProductSummaries: () => ({
    data: [
      {
        id: 1,
        name: 'Starlit Gloss',
        description: 'A glossy finish.',
        price: 120000,
        image: 'https://example.com/product.jpg',
        placeholder: 'image',
        categorySlug: 'makeup',
      },
    ],
    isLoading: false,
    error: null,
  }),
  useProducts: () => ({
    data: [
      {
        id: 1,
        name: 'Starlit Gloss',
        description: 'A glossy finish.',
        price: 120000,
        image: 'https://example.com/product.jpg',
        placeholder: 'image',
        categorySlug: 'makeup',
      },
    ],
    isLoading: false,
    error: null,
  }),
}));

describe('BeautyPage', () => {
  it('renders cms-managed font choices on glam content', () => {
    render(
      <MemoryRouter>
        <BeautyPage />
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { name: 'Glam Makeup' })).toHaveStyle({
      fontFamily: "'Great Vibes', cursive",
    });
    expect(screen.getByRole('heading', { name: 'Charm Bar' })).toHaveStyle({
      fontFamily: "'Cardo', serif",
    });
    expect(screen.getByText('Starlit Gloss')).toHaveStyle({
      fontFamily: "'Nunito Sans', sans-serif",
    });
  });
});
