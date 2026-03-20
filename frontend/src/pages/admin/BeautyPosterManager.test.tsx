import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import BeautyPosterManager from './BeautyPosterManager';

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    signOut: vi.fn(),
  }),
}));

vi.mock('../../components/Toast', () => ({
  useToast: () => ({
    showToast: vi.fn(),
  }),
}));

vi.mock('../../components/AdminLayout', () => ({
  default: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock('../../hooks/useGlamPageSettings', () => ({
  DEFAULT_GLAM_PAGE_SETTINGS: {
    hero_title: 'Glam Makeup',
    hero_description: 'Desc',
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
  },
  useGlamPageSettings: () => ({
    settings: null,
    isLoading: false,
    updateSettings: vi.fn().mockResolvedValue(undefined),
  }),
}));

vi.mock('../../hooks/useProducts', () => ({
  useProducts: () => ({
    data: [],
    isLoading: false,
  }),
}));

describe('BeautyPosterManager', () => {
  it('renders glam page cms sections', () => {
    render(<BeautyPosterManager />);

    expect(screen.getByText('Hero Section')).toBeInTheDocument();
    expect(screen.getByText('Get The Look Section')).toBeInTheDocument();
    expect(screen.getByText('Product Section')).toBeInTheDocument();
    expect(screen.getByText('Save GLAM page')).toBeInTheDocument();
  });
});
