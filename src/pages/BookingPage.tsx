import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

interface LocationState {
  ticketType?: string;
  ticketPrice?: number;
}

export default function BookingPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as LocationState;

  const [selectedDate, setSelectedDate] = useState<number>(5);
  const [selectedTime, setSelectedTime] = useState<string>('01:00 PM');
  const [currentMonth] = useState('October 2023');

  // Mock data - bisa diganti dengan data real nanti
  const ticketType = state?.ticketType || 'Professional Editorial Portrait';
  const sessionFee = state?.ticketPrice || 250;
  const studioRental = 100;
  const vat = (sessionFee + studioRental) * 0.1;
  const total = sessionFee + studioRental + vat;

  const timeSlots = {
    morning: ['09:00 AM', '10:30 AM'],
    afternoon: ['01:00 PM', '02:30 PM', '04:00 PM'],
    evening: ['05:30 PM', '07:00 PM']
  };

  const handleProceedToPayment = () => {
    navigate('/payment', {
      state: {
        ticketType,
        sessionFee,
        date: `Sat, Oct ${selectedDate}, 2023`,
        time: selectedTime
      }
    });
  };

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark">
      <main className="flex-1 max-w-[1200px] mx-auto w-full px-10 py-10">
        {/* Progress Bar */}
        <div className="mb-10">
          <div className="flex flex-col gap-3">
            <div className="flex gap-6 justify-between items-end">
              <p className="text-primary text-sm font-bold uppercase tracking-widest">Step 1: Selection</p>
              <p className="text-sm font-normal opacity-70">33% Complete</p>
            </div>
            <div className="rounded-full bg-[#e8cece] dark:bg-[#3d2424] overflow-hidden">
              <div className="h-1.5 rounded-full bg-primary" style={{ width: '33%' }}></div>
            </div>
          </div>
        </div>

        {/* Page Heading */}
        <div className="mb-12">
          <h1 className="text-5xl font-black leading-tight tracking-[-0.033em] mb-4">Reserve Your Session</h1>
          <p className="text-[#9c4949] dark:text-[#d19a9a] text-lg max-w-2xl font-normal leading-normal">
            Secure your spot at our premium studio. Select your preferred date and time to begin your high-end professional photography experience.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Left Column: Calendar & Time */}
          <div className="lg:col-span-2 flex flex-col gap-10">
            {/* Calendar Section */}
            <div className="bg-white dark:bg-[#1a0c0c] rounded-xl shadow-sm border border-[#f4e7e7] dark:border-[#3d2424] p-8">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-xl font-bold">Select Date</h3>
                <div className="flex items-center gap-4">
                  <button className="size-10 flex items-center justify-center rounded-full hover:bg-background-light dark:hover:bg-background-dark text-primary border border-primary/10">
                    <span className="material-symbols-outlined">chevron_left</span>
                  </button>
                  <p className="text-lg font-bold min-w-32 text-center uppercase tracking-tighter">{currentMonth}</p>
                  <button className="size-10 flex items-center justify-center rounded-full hover:bg-background-light dark:hover:bg-background-dark text-primary border border-primary/10">
                    <span className="material-symbols-outlined">chevron_right</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-7 gap-2">
                {/* Weekdays */}
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                  <div key={day} className="text-primary text-xs font-black uppercase flex h-10 items-center justify-center opacity-40">
                    {day}
                  </div>
                ))}

                {/* Empty cells for calendar start */}
                <div className="h-14 w-full"></div>
                <div className="h-14 w-full"></div>
                <div className="h-14 w-full"></div>

                {/* Calendar Days */}
                {Array.from({ length: 18 }, (_, i) => i + 1).map((day) => {
                  const isDisabled = day === 16 || day === 17;
                  const isSelected = day === selectedDate;
                  
                  return (
                    <button
                      key={day}
                      onClick={() => !isDisabled && setSelectedDate(day)}
                      disabled={isDisabled}
                      className={`h-14 w-full text-sm font-medium rounded-lg flex items-center justify-center transition-all
                        ${isSelected ? 'bg-primary text-white font-bold shadow-lg shadow-primary/20' : ''}
                        ${isDisabled ? 'opacity-20 cursor-not-allowed' : 'hover:bg-primary/5'}
                      `}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Time Slots Selection */}
            <div className="bg-white dark:bg-[#1a0c0c] rounded-xl shadow-sm border border-[#f4e7e7] dark:border-[#3d2424] p-8">
              <h3 className="text-xl font-bold mb-6">Available Time Slots</h3>
              <div className="space-y-6">
                {Object.entries(timeSlots).map(([period, slots]) => (
                  <div key={period}>
                    <p className="text-xs font-black uppercase tracking-widest text-primary/60 mb-4">
                      {period} Sessions
                    </p>
                    <div className="flex flex-wrap gap-3">
                      {slots.map((time) => {
                        const isSelected = time === selectedTime;
                        return (
                          <button
                            key={time}
                            onClick={() => setSelectedTime(time)}
                            className={`px-6 py-3 rounded-lg text-sm font-medium transition-all
                              ${isSelected 
                                ? 'border-2 border-primary bg-primary/5 text-primary font-bold' 
                                : 'border border-[#e8cece] dark:border-[#3d2424] hover:border-primary'
                              }
                            `}
                          >
                            {time}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Summary & Payment */}
          <div className="flex flex-col gap-6">
            <div className="bg-white dark:bg-[#1a0c0c] rounded-xl shadow-xl border border-[#f4e7e7] dark:border-[#3d2424] p-8 sticky top-28 overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-bl-full pointer-events-none"></div>
              
              <h3 className="text-2xl font-black mb-8 border-b border-background-light dark:border-background-dark pb-4 italic">
                Booking Summary
              </h3>

              <div className="space-y-6 mb-8">
                <div className="flex items-start gap-4">
                  <span className="material-symbols-outlined text-primary">photo_camera</span>
                  <div>
                    <p className="text-sm font-bold uppercase tracking-tighter opacity-60">Session Type</p>
                    <p className="font-display font-medium">{ticketType}</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <span className="material-symbols-outlined text-primary">event</span>
                  <div>
                    <p className="text-sm font-bold uppercase tracking-tighter opacity-60">Date</p>
                    <p className="font-display font-medium">Thursday, Oct {selectedDate}th, 2023</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <span className="material-symbols-outlined text-primary">schedule</span>
                  <div>
                    <p className="text-sm font-bold uppercase tracking-tighter opacity-60">Time</p>
                    <p className="font-display font-medium">{selectedTime} (90 mins)</p>
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-background-light dark:border-background-dark space-y-4">
                <div className="flex justify-between text-sm">
                  <span>Session Fee</span>
                  <span className="font-bold">${sessionFee.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Studio Rental</span>
                  <span className="font-bold">${studioRental.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>VAT (10%)</span>
                  <span className="font-bold">${vat.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xl font-black pt-4 border-t border-dashed border-[#e8cece] dark:border-[#3d2424]">
                  <span className="uppercase tracking-tighter">Total</span>
                  <span className="text-primary">${total.toFixed(2)}</span>
                </div>
              </div>

              <button 
                onClick={handleProceedToPayment}
                className="w-full mt-8 bg-primary hover:bg-primary/90 text-white py-5 rounded-lg font-black uppercase tracking-widest text-sm shadow-xl shadow-primary/30 transition-all active:scale-95"
              >
                Proceed to Payment
              </button>

              <p className="text-[10px] text-center mt-6 opacity-50 font-sans uppercase tracking-widest">
                Secure Encrypted Checkout
              </p>
            </div>

            {/* Additional Info Card */}
            <div className="bg-primary/5 rounded-xl p-6 border border-primary/10">
              <div className="flex gap-4 items-center mb-3">
                <span className="material-symbols-outlined text-primary">info</span>
                <h4 className="font-bold text-sm uppercase tracking-widest">Important Info</h4>
              </div>
              <ul className="text-xs space-y-2 font-sans opacity-80 leading-relaxed">
                <li>• Please arrive 15 minutes before your slot.</li>
                <li>• Cancellation required 48 hours in advance.</li>
                <li>• All raw files included in package.</li>
              </ul>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
