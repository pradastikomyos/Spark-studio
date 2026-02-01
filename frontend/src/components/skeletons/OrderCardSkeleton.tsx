const OrderCardSkeleton = () => {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden animate-pulse">
      <div className="p-6">
        <div className="flex items-start justify-between gap-4 mb-5">
          <div className="flex-1 space-y-3">
            <div className="flex items-center gap-3">
              <div className="h-3 w-14 rounded bg-gray-200" />
              <div className="h-1 w-1 rounded-full bg-gray-200" />
              <div className="h-3 w-28 rounded bg-gray-200" />
            </div>
            <div className="h-5 w-2/5 rounded bg-gray-200" />
            <div className="h-4 w-3/5 rounded bg-gray-200" />
          </div>
          <div className="h-6 w-24 rounded-full bg-gray-200" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="space-y-2">
            <div className="h-3 w-16 rounded bg-gray-200" />
            <div className="h-4 w-24 rounded bg-gray-200" />
          </div>
          <div className="space-y-2">
            <div className="h-3 w-16 rounded bg-gray-200" />
            <div className="h-4 w-20 rounded bg-gray-200" />
          </div>
          <div className="space-y-2">
            <div className="h-3 w-16 rounded bg-gray-200" />
            <div className="h-4 w-28 rounded bg-gray-200" />
          </div>
          <div className="space-y-2">
            <div className="h-3 w-16 rounded bg-gray-200" />
            <div className="h-4 w-24 rounded bg-gray-200" />
          </div>
        </div>
      </div>
      <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
        <div className="h-4 w-32 rounded bg-gray-200" />
        <div className="h-9 w-28 rounded-lg bg-gray-200" />
      </div>
    </div>
  );
};

export default OrderCardSkeleton;
