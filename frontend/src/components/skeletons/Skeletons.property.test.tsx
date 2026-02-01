import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import * as fc from 'fast-check';
import ProductCardSkeleton from './ProductCardSkeleton';
import TicketCardSkeleton from './TicketCardSkeleton';
import TableRowSkeleton from './TableRowSkeleton';
import DashboardStatSkeleton from './DashboardStatSkeleton';

describe('Skeleton Components - Property Tests', () => {
  it('ProductCardSkeleton matches expected structure', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 20 }), () => {
        const { container, unmount } = render(<ProductCardSkeleton />);
        const image = container.querySelector('.aspect-\\[3\\/4\\]');
        const title = container.querySelector('.h-6');
        const price = container.querySelector('.h-5');
        expect(image).not.toBeNull();
        expect(title).not.toBeNull();
        expect(price).not.toBeNull();
        unmount();
      }),
      { numRuns: 100 }
    );
  });

  it('TicketCardSkeleton matches expected structure', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 20 }), () => {
        const { container, unmount } = render(<TicketCardSkeleton />);
        const button = container.querySelector('.h-12');
        const title = container.querySelector('.h-7');
        expect(button).not.toBeNull();
        expect(title).not.toBeNull();
        unmount();
      }),
      { numRuns: 100 }
    );
  });

  it('TableRowSkeleton renders correct number of columns', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 12 }), (columns) => {
        const { container, unmount } = render(
          <table>
            <tbody>
              <TableRowSkeleton columns={columns} />
            </tbody>
          </table>
        );
        const cells = container.querySelectorAll('td');
        expect(cells.length).toBe(columns);
        unmount();
      }),
      { numRuns: 100 }
    );
  });

  it('DashboardStatSkeleton matches expected structure', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 20 }), () => {
        const { container, unmount } = render(<DashboardStatSkeleton />);
        const label = container.querySelector('.h-4');
        const value = container.querySelector('.h-9');
        expect(label).not.toBeNull();
        expect(value).not.toBeNull();
        unmount();
      }),
      { numRuns: 100 }
    );
  });
});
