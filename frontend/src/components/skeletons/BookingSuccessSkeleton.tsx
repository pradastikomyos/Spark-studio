import TicketCardSkeleton from './TicketCardSkeleton';

const BookingSuccessSkeleton = () => {
  return (
    <div className="min-h-screen bg-white">
      <main className="flex-1 flex justify-center py-12 px-4">
        <div className="layout-content-container flex flex-col max-w-[800px] flex-1 animate-pulse">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center p-3 mb-4 rounded-full bg-gray-200 h-16 w-16 mx-auto" />
            <div className="h-10 w-3/4 rounded bg-gray-200 mx-auto mb-4" />
            <div className="space-y-2 max-w-xl mx-auto px-4">
              <div className="h-4 rounded bg-gray-200" />
              <div className="h-4 w-5/6 rounded bg-gray-200 mx-auto" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <TicketCardSkeleton />
            <TicketCardSkeleton />
          </div>
        </div>
      </main>
    </div>
  );
};

export default BookingSuccessSkeleton;
