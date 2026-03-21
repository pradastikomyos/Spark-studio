import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { PageTransition } from '../components/PageTransition';
import { DEFAULT_BOOKING_PAGE_SETTINGS, useBookingPageSettings } from '../hooks/useBookingPageSettings';
import { toLocalDateString } from '../utils/timezone';
import { JourneyCalendarSection } from './journey-selection/JourneyCalendarSection';
import { JourneySummaryCard } from './journey-selection/JourneySummaryCard';
import { JourneyTimeSlotsSection } from './journey-selection/JourneyTimeSlotsSection';
import { useJourneySelectionController } from './journey-selection/useJourneySelectionController';

export default function JourneySelectionPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { settings } = useBookingPageSettings();
  const bookingCopy = settings ?? DEFAULT_BOOKING_PAGE_SETTINGS;
  const {
    ticket,
    loading,
    selectedDate,
    selectedTime,
    calendarDays,
    availableTimeSlots,
    groupedSlots,
    canGoPrevMonth,
    canGoNextMonth,
    monthName,
    setSelectedDate,
    setSelectedTime,
    handlePrevMonth,
    handleNextMonth,
    getMinutesUntilClose,
    getSlotUrgency,
  } = useJourneySelectionController();

  const handleProceedToPayment = () => {
    if (!ticket || !selectedDate) {
      alert('Please select a date');
      return;
    }

    if (!selectedTime) {
      alert('Please select a time slot');
      return;
    }

    if (!user) {
      alert('Please log in to continue');
      navigate('/login', { state: { returnTo: '/journey' } });
      return;
    }

    navigate('/payment', {
      state: {
        ticketId: ticket.id,
        ticketName: ticket.name,
        ticketType: ticket.type,
        price: parseFloat(ticket.price),
        date: toLocalDateString(selectedDate),
        time: selectedTime,
      },
    });
  };

  if (loading || !ticket) {
    return (
      <PageTransition>
        <div className="min-h-screen bg-white flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-main-600"></div>
        </div>
      </PageTransition>
    );
  }
  return (
    <PageTransition>
      <div className="min-h-screen bg-white">
        <main className="max-w-[1200px] mx-auto px-6 py-12">
          {/* Page Heading */}
          <div className="mb-12">
            <h1 className="text-5xl font-black leading-tight tracking-tight mb-4">{bookingCopy.journey_title}</h1>
            <p className="text-gray-600 text-lg">{bookingCopy.journey_description}</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            {/* Left Column: Calendar & Time */}
            <div className="lg:col-span-2 flex flex-col gap-10">
              <JourneyCalendarSection
                monthName={monthName}
                canGoPrevMonth={canGoPrevMonth}
                canGoNextMonth={canGoNextMonth}
                calendarDays={calendarDays}
                selectedDate={selectedDate}
                onPrevMonth={handlePrevMonth}
                onNextMonth={handleNextMonth}
                onSelectDate={(date) => {
                  setSelectedDate(date);
                  setSelectedTime(null);
                }}
              />

              <JourneyTimeSlotsSection
                copy={bookingCopy}
                selectedDate={selectedDate}
                selectedTime={selectedTime}
                availableSlotsCount={availableTimeSlots.length}
                groupedSlots={groupedSlots}
                onSelectTime={setSelectedTime}
                getMinutesUntilClose={getMinutesUntilClose}
                getSlotUrgency={getSlotUrgency}
              />
            </div>

            {/* Right Column: Booking Summary */}
            <div className="flex flex-col gap-6">
              <JourneySummaryCard
                copy={bookingCopy}
                ticket={ticket}
                selectedDate={selectedDate}
                selectedTime={selectedTime}
                onProceed={handleProceedToPayment}
              />
            </div>
          </div>
        </main>
      </div>
    </PageTransition>
  );
}
