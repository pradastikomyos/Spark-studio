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
 * - Matches the rounded-xl border style from Dashboard.tsx
 */

const DashboardStatSkeleton = () => {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <div className="space-y-3">
        {/* Label skeleton */}
        <div className="h-4 bg-gray-200 rounded w-3/4 animate-pulse" />
        
        {/* Value skeleton - larger to match the 3xl font size */}
        <div className="h-9 bg-gray-200 rounded w-1/2 animate-pulse" />
      </div>
    </div>
  );
};

export default DashboardStatSkeleton;
