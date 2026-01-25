import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatCurrency } from '../utils/formatters';

interface DayData {
  day: number;
  available: boolean;
  limited?: boolean;
  hasBooking?: boolean;
}

export default function FullCalendarPage() {
  const navigate = useNavigate();

  const [selectedDate, setSelectedDate] = useState<number>(17);
  const [selectedTime, setSelectedTime] = useState<string>('morning');
  const [currentMonth] = useState('January 2024');

  // Mock calendar data
  const calendarDays: (DayData | null)[] = [
    null, // Sunday empty
    null, // Monday empty
    { day: 1, available: true },
    { day: 2, available: true, hasBooking: true },
    { day: 3, available: true },
    { day: 4, available: true, hasBooking: true },
    { day: 5, available: true },
    { day: 6, available: false },
    { day: 7, available: false },
    { day: 8, available: true },
    { day: 9, available: true },
    { day: 10, available: true },
    { day: 11, available: true },
    { day: 12, available: true },
    { day: 13, available: false },
    { day: 14, available: false },
    { day: 15, available: true },
    { day: 16, available: true, limited: true },
    { day: 17, available: true }, // Selected
    { day: 18, available: true },
    { day: 19, available: true },
    { day: 20, available: false },
    { day: 21, available: false },
    { day: 22, available: true },
    { day: 23, available: true },
    { day: 24, available: true },
    { day: 25, available: true },
    { day: 26, available: true },
    { day: 27, available: false },
    { day: 28, available: false },
    { day: 29, available: true },
    { day: 30, available: true },
    { day: 31, available: true },
  ];

  const handleConfirmDate = () => {
    const timeSlots = {
      morning: '09:00 AM - 12:00 PM',
      afternoon: '01:00 PM - 04:00 PM',
      evening: '05:00 PM - 08:00 PM'
    };

    navigate('/booking', {
      state: {
        ticketType: 'All Access Pass',
        ticketPrice: 150,
        date: `Jan ${selectedDate}, 2024`,
        time: timeSlots[selectedTime as keyof typeof timeSlots]
      }
    });
  };

  return (
    <div className="min-h-screen flex flex-col bg-background-light dark:bg-background-dark">
      {/* Decorative Background Element */}
      <div className="fixed top-0 right-0 p-6 pointer-events-none hidden md:block z-0">
        <svg 
          className="opacity-10 dark:opacity-20 text-primary" 
          fill="none" 
          height="120" 
          viewBox="0 0 100 100" 
          width="120" 
          xmlns="http://www.w3.org/2000/svg"
        >
          <path 
            d="M50 0L61 39L100 50L61 61L50 100L39 61L0 50L39 39L50 0Z" 
            fill="currentColor"
          />
        </svg>
      </div>

      <main className="flex-grow container mx-auto px-4 md:px-6 py-8 md:py-12 max-w-7xl relative z-10">
        {/* Header */}
        <header className="mb-8 md:mb-16 relative">
          <div className="max-w-3xl">
            <h1 className="font-display text-4xl md:text-6xl lg:text-7xl text-gray-900 dark:text-white mb-4 md:mb-6 leading-tight">
              Entrance <span className="text-primary italic">Access</span>
            </h1>
            <p className="text-base md:text-lg lg:text-xl text-gray-500 dark:text-gray-400 font-light leading-relaxed max-w-2xl">
              Exclusive access to our professional stages. Secure your session on the full monthly grid below. 
              Limited availability for daily sessions.
            </p>
          </div>
          <button
            onClick={() => navigate('/')}
            className="inline-flex items-center mt-6 md:mt-8 text-sm font-medium text-gray-400 hover:text-primary transition-colors uppercase tracking-widest"
          >
            <span className="material-icons text-base mr-2">arrow_back</span>
            Return to Weekly View
          </button>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 xl:gap-20">
          {/* Calendar Section */}
          <div className="lg:col-span-8">
            {/* Month Header */}
            <div className="flex justify-between items-end mb-8 border-b border-gray-200 dark:border-gray-700 pb-4">
              <div>
                <span className="block text-sm text-primary font-bold tracking-widest uppercase mb-1">
                  Select Date
                </span>
                <h2 className="font-display text-4xl text-gray-900 dark:text-white">
                  {currentMonth}
                </h2>
              </div>
              <div className="flex space-x-4">
                <button className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition text-gray-400 hover:text-gray-900 dark:hover:text-white">
                  <span className="material-icons">chevron_left</span>
                </button>
                <button className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition text-gray-900 dark:text-white">
                  <span className="material-icons">chevron_right</span>
                </button>
              </div>
            </div>

            {/* Weekday Headers */}
            <div className="grid grid-cols-7 mb-4">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                <div key={day} className="text-center text-xs font-bold text-gray-400 uppercase tracking-widest py-2">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 auto-rows-fr gap-y-8 gap-x-2">
              {calendarDays.map((dayData, index) => {
                if (!dayData) {
                  return <div key={index} className="aspect-square"></div>;
                }

                const isSelected = dayData.day === selectedDate;
                const isAvailable = dayData.available;
                const isLimited = dayData.limited;
                const hasBooking = dayData.hasBooking;

                return (
                  <button
                    key={index}
                    onClick={() => isAvailable && setSelectedDate(dayData.day)}
                    disabled={!isAvailable}
                    className={`
                      aspect-square flex flex-col items-center justify-center relative rounded-full transition-all
                      ${isSelected 
                        ? 'bg-primary shadow-lg shadow-red-200 dark:shadow-red-900/20 transform scale-110' 
                        : isAvailable 
                          ? 'hover:bg-gray-50 dark:hover:bg-gray-800/50' 
                          : 'cursor-not-allowed'
                      }
                    `}
                  >
                    <span className={`
                      text-lg font-medium
                      ${isSelected 
                        ? 'text-white font-bold' 
                        : !isAvailable 
                          ? 'text-gray-400 dark:text-gray-600 line-through decoration-gray-300' 
                          : 'text-gray-900 dark:text-white'
                      }
                    `}>
                      {dayData.day}
                    </span>
                    
                    {hasBooking && !isSelected && (
                      <span className={`mt-1 w-1 h-1 rounded-full ${isLimited ? 'bg-primary' : 'bg-gray-300'}`}></span>
                    )}

                    {isSelected && (
                      <span className="absolute -top-1 -right-1 flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Legend */}
            <div className="mt-8 flex items-center space-x-8 text-sm text-gray-500 dark:text-gray-400">
              <div className="flex items-center">
                <div className="w-2 h-2 rounded-full bg-gray-900 dark:bg-white mr-2"></div>
                <span>Available</span>
              </div>
              <div className="flex items-center">
                <div className="w-2 h-2 rounded-full bg-gray-300 dark:bg-gray-700 mr-2"></div>
                <span>Limited</span>
              </div>
              <div className="flex items-center">
                <div className="w-2 h-2 rounded-full bg-primary mr-2"></div>
                <span>Selected</span>
              </div>
            </div>
          </div>

          {/* Sidebar - Booking Summary */}
          <aside className="lg:col-span-4 mt-8 lg:mt-0">
            <div className="lg:sticky lg:top-24 bg-white dark:bg-[#1c0d0d] border border-gray-200 dark:border-gray-800 p-6 md:p-8 shadow-lg rounded-lg">
              {/* Date Info */}
              <div className="border-b border-gray-200 dark:border-gray-800 pb-6 mb-6">
                <span className="block text-xs font-bold text-primary uppercase tracking-widest mb-2">
                  Booking Summary
                </span>
                <h3 className="font-display text-3xl text-gray-900 dark:text-white mb-1">
                  Jan {selectedDate}
                </h3>
                <p className="text-gray-500 dark:text-gray-400 font-light">
                  Wednesday, 2024
                </p>
              </div>

              {/* Pass Info */}
              <div className="mb-8">
                <h4 className="font-display text-xl text-gray-900 dark:text-white mb-2">
                  All Access Pass
                </h4>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 leading-relaxed">
                  Includes lighting equipment &amp; stage props. Full studio access.
                </p>
                <div className="inline-flex items-center px-2.5 py-1 rounded bg-red-50 dark:bg-red-900/30 text-primary text-xs font-semibold tracking-wide uppercase">
                  High Demand
                </div>
              </div>

              {/* Time Slots */}
              <div className="mb-8">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 uppercase tracking-wider text-xs">
                  Available Sessions
                </label>
                <div className="space-y-3">
                  <label className={`
                    flex items-center justify-between p-3 border rounded cursor-pointer transition-colors
                    ${selectedTime === 'morning' 
                      ? 'border-primary bg-red-50/50 dark:bg-red-900/10' 
                      : 'border-gray-200 dark:border-gray-800 hover:border-gray-400 dark:hover:border-gray-500 bg-white dark:bg-[#1c0d0d]'
                    }
                  `}>
                    <span className="flex items-center">
                      <input
                        type="radio"
                        name="time"
                        checked={selectedTime === 'morning'}
                        onChange={() => setSelectedTime('morning')}
                        className="h-4 w-4 text-primary focus:ring-primary border-gray-300"
                      />
                      <span className="ml-3 text-sm font-medium text-gray-900 dark:text-white">
                        09:00 AM - 12:00 PM
                      </span>
                    </span>
                    <span className={`text-xs font-semibold ${selectedTime === 'morning' ? 'text-primary' : 'text-gray-500'}`}>
                      {formatCurrency(150)}
                    </span>
                  </label>

                  <label className={`
                    flex items-center justify-between p-3 border rounded cursor-pointer transition-colors
                    ${selectedTime === 'afternoon' 
                      ? 'border-primary bg-red-50/50 dark:bg-red-900/10' 
                      : 'border-gray-200 dark:border-gray-800 hover:border-gray-400 dark:hover:border-gray-500 bg-white dark:bg-[#1c0d0d]'
                    }
                  `}>
                    <span className="flex items-center">
                      <input
                        type="radio"
                        name="time"
                        checked={selectedTime === 'afternoon'}
                        onChange={() => setSelectedTime('afternoon')}
                        className="h-4 w-4 text-primary focus:ring-primary border-gray-300"
                      />
                      <span className="ml-3 text-sm font-medium text-gray-900 dark:text-white">
                        01:00 PM - 04:00 PM
                      </span>
                    </span>
                    <span className={`text-xs font-semibold ${selectedTime === 'afternoon' ? 'text-primary' : 'text-gray-500'}`}>
                      {formatCurrency(150)}
                    </span>
                  </label>

                  <label className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-800 rounded cursor-not-allowed transition-colors bg-white dark:bg-[#1c0d0d] opacity-50">
                    <span className="flex items-center">
                      <input
                        type="radio"
                        name="time"
                        disabled
                        className="h-4 w-4 text-gray-300 border-gray-200"
                      />
                      <span className="ml-3 text-sm font-medium text-gray-400 line-through">
                        05:00 PM - 08:00 PM
                      </span>
                    </span>
                    <span className="text-xs font-semibold text-gray-400">Sold Out</span>
                  </label>
                </div>
              </div>

              {/* Confirm Button */}
              <button
                onClick={handleConfirmDate}
                className="w-full bg-primary hover:bg-primary-dark text-white font-medium py-4 px-6 shadow-lg shadow-red-500/30 transition-all duration-300 transform hover:-translate-y-0.5 flex items-center justify-center group"
              >
                Confirm Date
                <span className="material-icons ml-2 text-sm group-hover:translate-x-1 transition-transform">
                  arrow_forward
                </span>
              </button>

              <p className="text-center text-xs text-gray-400 mt-4">
                Free cancellation up to 24h before.
              </p>
            </div>
          </aside>
        </div>
      </main>

    </div>
  );
}
