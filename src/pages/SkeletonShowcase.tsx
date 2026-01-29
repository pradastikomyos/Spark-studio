/**
 * SkeletonShowcase Component
 * 
 * Development-only page to visually verify skeleton components.
 * This page can be removed after migration is complete.
 * 
 * Access at: /skeleton-showcase
 */

import {
  ProductCardSkeleton,
  TicketCardSkeleton,
  TableRowSkeleton,
  DashboardStatSkeleton,
} from '../components/skeletons';

const SkeletonShowcase = () => {
  return (
    <div className="min-h-screen bg-white dark:bg-background-dark p-8">
      <div className="max-w-7xl mx-auto space-y-12">
        <div>
          <h1 className="text-3xl font-display font-bold text-text-light dark:text-text-dark mb-2">
            Skeleton Components Showcase
          </h1>
          <p className="text-subtext-light dark:text-subtext-dark">
            Visual verification of all skeleton loading states
          </p>
        </div>

        {/* Product Card Skeletons */}
        <section>
          <h2 className="text-2xl font-display font-bold text-text-light dark:text-text-dark mb-4">
            Product Card Skeleton
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            <ProductCardSkeleton />
            <ProductCardSkeleton />
            <ProductCardSkeleton />
            <ProductCardSkeleton />
          </div>
        </section>

        {/* Ticket Card Skeletons */}
        <section>
          <h2 className="text-2xl font-display font-bold text-text-light dark:text-text-dark mb-4">
            Ticket Card Skeleton
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <TicketCardSkeleton />
            <TicketCardSkeleton />
            <TicketCardSkeleton />
          </div>
        </section>

        {/* Dashboard Stat Skeletons */}
        <section>
          <h2 className="text-2xl font-display font-bold text-text-light dark:text-text-dark mb-4">
            Dashboard Stat Skeleton
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <DashboardStatSkeleton />
            <DashboardStatSkeleton />
            <DashboardStatSkeleton />
            <DashboardStatSkeleton />
          </div>
        </section>

        {/* Table Row Skeletons */}
        <section>
          <h2 className="text-2xl font-display font-bold text-text-light dark:text-text-dark mb-4">
            Table Row Skeleton
          </h2>
          <div className="bg-white dark:bg-surface-dark rounded-lg overflow-hidden border border-gray-100 dark:border-white/5">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-surface-darker border-b border-gray-100 dark:border-white/5">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Column 1
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Column 2
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Column 3
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Column 4
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Column 5
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-surface-dark divide-y divide-gray-100 dark:divide-white/5">
                <TableRowSkeleton columns={5} />
                <TableRowSkeleton columns={5} />
                <TableRowSkeleton columns={5} />
                <TableRowSkeleton columns={5} />
              </tbody>
            </table>
          </div>
        </section>

        {/* Different column counts */}
        <section>
          <h2 className="text-2xl font-display font-bold text-text-light dark:text-text-dark mb-4">
            Table Row Skeleton - Different Column Counts
          </h2>
          <div className="space-y-4">
            <div className="bg-white dark:bg-surface-dark rounded-lg overflow-hidden border border-gray-100 dark:border-white/5">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-surface-darker border-b border-gray-100 dark:border-white/5">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      3 Columns
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Column 2
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Column 3
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-surface-dark">
                  <TableRowSkeleton columns={3} />
                  <TableRowSkeleton columns={3} />
                </tbody>
              </table>
            </div>

            <div className="bg-white dark:bg-surface-dark rounded-lg overflow-hidden border border-gray-100 dark:border-white/5">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-surface-darker border-b border-gray-100 dark:border-white/5">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      7 Columns
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Col 2
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Col 3
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Col 4
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Col 5
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Col 6
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Col 7
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-surface-dark">
                  <TableRowSkeleton columns={7} />
                  <TableRowSkeleton columns={7} />
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default SkeletonShowcase;
