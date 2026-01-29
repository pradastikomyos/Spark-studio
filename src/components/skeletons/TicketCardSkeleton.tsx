/**
 * TicketCardSkeleton Component
 * 
 * Skeleton loading state for ticket cards in booking pages.
 * Matches the structure and dimensions of actual ticket cards.
 * 
 * Features:
 * - Matches the layout of TicketCard component
 * - Includes placeholders for date, title, description, and button
 * - Uses Tailwind's animate-pulse for shimmer effect
 * - Supports dark mode with dark: variants
 */

const TicketCardSkeleton = () => {
  return (
    <div className="relative bg-surface-light dark:bg-surface-dark border border-gray-100 dark:border-white/5 p-8">
      {/* Top bar skeleton */}
      <div className="absolute top-0 left-0 w-full h-1 bg-gray-200 dark:bg-gray-800" />
      
      <div className="flex justify-between items-start mb-6">
        {/* Date skeleton */}
        <div className="space-y-2">
          <div className="h-3 bg-gray-200 dark:bg-gray-800 rounded w-12 animate-pulse" />
          <div className="h-10 bg-gray-200 dark:bg-gray-800 rounded w-12 animate-pulse" />
        </div>
        
        {/* Optional "Today" badge skeleton */}
        <div className="h-6 bg-gray-200 dark:bg-gray-800 rounded w-16 animate-pulse" />
      </div>
      
      {/* Title skeleton */}
      <div className="h-7 bg-gray-200 dark:bg-gray-800 rounded w-2/3 mb-2 animate-pulse" />
      
      {/* Description skeleton - 2 lines */}
      <div className="space-y-2 mb-8">
        <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
        <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-4/5 animate-pulse" />
      </div>
      
      {/* Button skeleton */}
      <div className="w-full h-12 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
    </div>
  );
};

export default TicketCardSkeleton;
