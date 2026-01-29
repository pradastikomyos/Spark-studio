/**
 * DashboardStatSkeleton Component
 * 
 * Skeleton loading state for dashboard stat cards.
 * Matches the structure and dimensions of actual stat cards in the admin dashboard.
 * 
 * Features:
 * - Matches the layout of Dashboard stat cards
 * - Includes placeholders for label and value
 * - Uses Tailwind's animate-pulse for shimmer effect
 * - Supports dark mode with dark: variants
 * - Matches the rounded-xl border style from Dashboard.tsx
 */

const DashboardStatSkeleton = () => {
  return (
    <div className="rounded-xl border border-white/5 bg-surface-dark p-5">
      <div className="space-y-3">
        {/* Label skeleton */}
        <div className="h-4 bg-gray-700 dark:bg-gray-800 rounded w-3/4 animate-pulse" />
        
        {/* Value skeleton - larger to match the 3xl font size */}
        <div className="h-9 bg-gray-700 dark:bg-gray-800 rounded w-1/2 animate-pulse" />
      </div>
    </div>
  );
};

export default DashboardStatSkeleton;
