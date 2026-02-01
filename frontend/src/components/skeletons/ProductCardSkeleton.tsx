/**
 * ProductCardSkeleton Component
 * 
 * Skeleton loading state for product cards in the shop.
 * Matches the structure and dimensions of actual product cards.
 * 
 * Features:
 * - Matches aspect ratio [3/4] of product images
 * - Includes placeholders for image, title, description, and price
 * - Uses Tailwind's animate-pulse for shimmer effect
 */

const ProductCardSkeleton = () => {
  return (
    <div className="group cursor-default">
      {/* Image skeleton - matches aspect-[3/4] from Shop.tsx */}
      <div className="relative overflow-hidden aspect-[3/4] rounded-sm bg-gray-200 mb-4 animate-pulse" />
      
      <div className="space-y-2">
        {/* Title skeleton */}
        <div className="h-6 bg-gray-200 rounded w-3/4 animate-pulse" />
        
        {/* Description skeleton - 2 lines */}
        <div className="space-y-1">
          <div className="h-3 bg-gray-200 rounded animate-pulse" />
          <div className="h-3 bg-gray-200 rounded w-5/6 animate-pulse" />
        </div>
        
        {/* Price skeleton */}
        <div className="h-5 bg-gray-200 rounded w-1/3 animate-pulse" />
      </div>
    </div>
  );
};

export default ProductCardSkeleton;
