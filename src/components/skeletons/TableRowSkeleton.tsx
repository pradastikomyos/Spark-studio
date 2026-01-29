/**
 * TableRowSkeleton Component
 * 
 * Skeleton loading state for table rows in admin pages.
 * Flexible component that adapts to different column counts.
 * 
 * Features:
 * - Configurable number of columns (default: 5)
 * - Matches the structure of admin table rows
 * - Uses Tailwind's animate-pulse for shimmer effect
 * - Supports dark mode with dark: variants
 * 
 * @param columns - Number of columns to render (default: 5)
 */

interface TableRowSkeletonProps {
  columns?: number;
}

const TableRowSkeleton = ({ columns = 5 }: TableRowSkeletonProps) => {
  return (
    <tr className="border-b border-gray-100 dark:border-white/5">
      {Array.from({ length: columns }).map((_, index) => (
        <td key={index} className="px-6 py-4">
          <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
        </td>
      ))}
    </tr>
  );
};

export default TableRowSkeleton;
