import { useLocation, useNavigate } from 'react-router-dom';

interface LocationState {
  ticketType?: string;
  total?: number;
  date?: string;
  time?: string;
  customerName?: string;
}

export default function BookingSuccessPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as LocationState;

  // Mock data
  const ticketType = state?.ticketType || 'Editorial Loft Session';
  const customerName = state?.customerName || 'Alex Rivera';
  const bookingDate = state?.date || 'Oct 24, 2023';
  const timeSlot = state?.time || '2:00 PM (2 hrs)';
  const bookingId = 'SPK-' + Math.floor(Math.random() * 90000 + 10000) + '-NYC';

  const handlePrint = () => {
    window.print();
  };

  const handleEmail = () => {
    alert('Ticket has been sent to your email!');
  };

  const handleDownloadPDF = () => {
    alert('PDF download started!');
  };

  const handleSaveToGallery = () => {
    alert('Ticket saved to your gallery!');
  };

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark">
      <main className="flex-1 flex justify-center py-12 px-4">
        <div className="layout-content-container flex flex-col max-w-[800px] flex-1">
          {/* Celebration Section */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center p-3 mb-4 rounded-full bg-primary/10 text-primary">
              <span className="material-symbols-outlined text-4xl">check_circle</span>
            </div>
            <h1 className="text-[#1c0d0d] dark:text-white tracking-tight text-4xl md:text-5xl font-bold leading-tight pb-3 font-display">
              Thank You!
            </h1>
            <p className="text-[#9c4949] dark:text-red-200 text-lg font-normal leading-normal max-w-xl mx-auto px-4">
              Your session is locked in. We can't wait to see your vision come to life at Spark Photo Studio.
            </p>
          </div>

          {/* Digital Ticket Card */}
          <div className="relative bg-white dark:bg-background-dark/80 rounded-xl shadow-2xl overflow-hidden border border-[#f4e7e7] dark:border-[#3d2020]">
            {/* Decorative Header */}
            <div className="h-2 bg-primary"></div>

            <div className="p-8 md:p-12 flex flex-col md:flex-row gap-10">
              {/* Left Side: QR Code */}
              <div className="flex flex-col items-center justify-center flex-shrink-0">
                <div className="p-4 bg-white rounded-xl border-4 border-primary/10 shadow-inner">
                  <div className="size-48 bg-white flex items-center justify-center">
                    {/* Mock QR Code */}
                    <div className="w-full h-full bg-slate-100 rounded flex items-center justify-center relative overflow-hidden">
                      <div 
                        className="absolute inset-0 opacity-20" 
                        style={{ 
                          backgroundImage: 'radial-gradient(#f20d0d 1px, transparent 1px)', 
                          backgroundSize: '8px 8px' 
                        }}
                      ></div>
                      <span className="material-symbols-outlined text-primary text-8xl">qr_code_2</span>
                    </div>
                  </div>
                </div>
                <p className="mt-4 text-xs font-mono text-[#9c4949] dark:text-red-300 tracking-widest uppercase">
                  ID: {bookingId}
                </p>
              </div>

              {/* Right Side: Details */}
              <div className="flex-1 space-y-6">
                <div>
                  <p className="text-primary text-sm font-bold uppercase tracking-widest mb-1">
                    Official Studio Pass
                  </p>
                  <h2 className="text-2xl font-bold font-display">{ticketType}</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 py-6 border-y border-[#f4e7e7] dark:border-[#3d2020]">
                  <div className="space-y-1">
                    <p className="text-[#9c4949] dark:text-red-300 text-xs font-medium uppercase">Customer</p>
                    <p className="text-lg font-bold">{customerName}</p>
                  </div>
                  <div className="space-y-1 text-right md:text-left">
                    <p className="text-[#9c4949] dark:text-red-300 text-xs font-medium uppercase">Session Date</p>
                    <p className="text-lg font-bold">{bookingDate}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[#9c4949] dark:text-red-300 text-xs font-medium uppercase">Time Slot</p>
                    <p className="text-lg font-bold">{timeSlot}</p>
                  </div>
                  <div className="space-y-1 text-right md:text-left">
                    <p className="text-[#9c4949] dark:text-red-300 text-xs font-medium uppercase">Studio Location</p>
                    <p className="text-lg font-bold">Studio A</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 bg-primary/5 p-4 rounded-lg border border-primary/10">
                  <span className="material-symbols-outlined text-primary">info</span>
                  <p className="text-sm text-[#1c0d0d] dark:text-red-100">
                    Please present this QR code at the reception. Arrive 15 minutes before your slot.
                  </p>
                </div>
              </div>
            </div>

            {/* Ticket Footer Action Strip */}
            <div className="bg-slate-50 dark:bg-black/20 p-6 border-t border-[#f4e7e7] dark:border-[#3d2020] flex flex-wrap items-center justify-between gap-4">
              <div className="flex gap-4">
                <button 
                  onClick={handlePrint}
                  className="flex items-center gap-2 text-[#9c4949] hover:text-primary transition-colors text-sm font-medium"
                >
                  <span className="material-symbols-outlined text-lg">print</span>
                  Print Receipt
                </button>
                <button 
                  onClick={handleEmail}
                  className="flex items-center gap-2 text-[#9c4949] hover:text-primary transition-colors text-sm font-medium"
                >
                  <span className="material-symbols-outlined text-lg">share</span>
                  Email Ticket
                </button>
              </div>
              <div className="flex items-center gap-2">
                <span className="size-2 bg-green-500 rounded-full"></span>
                <span className="text-sm font-bold text-green-600 uppercase">Confirmed &amp; Paid</span>
              </div>
            </div>
          </div>

          {/* Main Action Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-10 px-4">
            <button 
              onClick={handleDownloadPDF}
              className="flex items-center justify-center gap-2 min-w-[180px] h-14 rounded-xl bg-primary text-white font-bold text-lg hover:bg-primary/90 transition-all shadow-xl shadow-primary/30"
            >
              <span className="material-symbols-outlined">download</span>
              Download PDF
            </button>
            <button 
              onClick={handleSaveToGallery}
              className="flex items-center justify-center gap-2 min-w-[180px] h-14 rounded-xl bg-white dark:bg-background-dark border-2 border-primary text-primary font-bold text-lg hover:bg-primary/5 transition-all"
            >
              <span className="material-symbols-outlined">add_to_photos</span>
              Save to Gallery
            </button>
          </div>

          <div className="mt-12 text-center pb-12">
            <button
              onClick={() => navigate('/')}
              className="text-[#9c4949] dark:text-red-300 hover:text-primary transition-colors text-sm underline underline-offset-4"
            >
              Back to Studio Dashboard
            </button>
          </div>
        </div>
      </main>

      {/* Location Note Footer */}
      <footer className="text-center py-10 text-[#9c4949]/60 text-xs tracking-widest uppercase px-4 border-t border-[#f4e7e7] dark:border-[#3d2020]">
        Spark Photo Studio • 120 Editorial Way, Manhattan NY • (555) 012-3456
      </footer>
    </div>
  );
}
