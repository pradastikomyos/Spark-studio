import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import BeautyPosterManager from './BeautyPosterManager';

const updateSettingsMock = vi.fn().mockResolvedValue(undefined);

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
    section_fonts: {
      hero: { heading: 'great_vibes', body: 'nunito_sans' },
      look: { heading: 'great_vibes', body: 'nunito_sans' },
      products: { heading: 'cardo', body: 'nunito_sans' },
    },
  },
  useGlamPageSettings: () => ({
    settings: null,
    isLoading: false,
    updateSettings: updateSettingsMock,
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

  it('saves section font choices in the glam page payload', async () => {
    const user = userEvent.setup();
    updateSettingsMock.mockClear();

    render(<BeautyPosterManager />);

    const selects = screen.getAllByRole('combobox');
    await user.selectOptions(selects[0], 'cardo');
    await user.selectOptions(selects[1], 'cardo');
    await user.click(screen.getByText('Save GLAM page'));

    await waitFor(() => {
      expect(updateSettingsMock).toHaveBeenCalledWith(
        expect.objectContaining({
          section_fonts: expect.objectContaining({
            hero: { heading: 'cardo', body: 'cardo' },
            look: { heading: 'great_vibes', body: 'nunito_sans' },
            products: { heading: 'cardo', body: 'nunito_sans' },
          }),
        })
      );
    });
  });
});
