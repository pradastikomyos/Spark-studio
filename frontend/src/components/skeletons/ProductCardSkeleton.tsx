/**
 * ProductCardSkeleton Component
 * 
 * Skeleton loading state for product cards in the shop.
 * Matches the structure and dimensions of actual product cards.
 * 
 * Features:
 * - Matches aspect ratio square of product images
 * - Includes placeholders for image, title, description, and price
 * - Uses Tailwind's animate-pulse for shimmer effect
 */

const ProductCardSkeleton = () => {
  return (
    <div className="rounded-xl border-2 border-gray-100 bg-white overflow-hidden">
      {/* Image skeleton - matches aspect-square from Shop.tsx */}
      <div className="relative overflow-hidden aspect-square bg-gray-200 animate-pulse" />

      <div className="p-3 space-y-2">
        <div className="h-4 bg-gray-200 rounded w-3/4 animate-pulse" />
        <div className="space-y-1">
          <div className="h-3 bg-gray-200 rounded animate-pulse" />
          <div className="h-3 bg-gray-200 rounded w-5/6 animate-pulse" />
        </div>
        <div className="h-5 bg-gray-200 rounded w-1/3 animate-pulse" />
      </div>
    </div>
  );
};

export default ProductCardSkeleton;
