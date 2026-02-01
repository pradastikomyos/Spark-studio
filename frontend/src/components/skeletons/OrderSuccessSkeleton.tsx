const OrderSuccessSkeleton = () => {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 animate-pulse">
      <div className="flex flex-col md:flex-row md:items-start gap-8">
        <div className="flex-1">
          <div className="h-7 w-40 rounded bg-gray-200 mb-3" />
          <div className="h-4 w-72 max-w-full rounded bg-gray-200" />
          <div className="mt-6 rounded-xl border border-gray-200 bg-white p-6">
            <div className="h-4 w-56 rounded bg-gray-200 mb-2" />
            <div className="h-3 w-72 max-w-full rounded bg-gray-200 mb-5" />
            <div className="h-11 w-full rounded bg-gray-200" />
          </div>
        </div>
        <div className="w-full md:w-80">
          <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
            <div className="h-4 w-28 rounded bg-gray-200" />
            <div className="h-6 w-40 rounded bg-gray-200" />
            <div className="h-4 w-24 rounded bg-gray-200" />
            <div className="h-8 w-32 rounded bg-gray-200" />
            <div className="h-10 w-full rounded bg-gray-200" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderSuccessSkeleton;
