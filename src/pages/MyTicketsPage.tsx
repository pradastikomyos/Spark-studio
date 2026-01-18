import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface Ticket {
  id: string;
  month: string;
  day: number;
  dayOfWeek: string;
  time: string;
  type: string;
  category: string;
  location: string;
  isToday?: boolean;
}

export default function MyTicketsPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'upcoming' | 'history'>('upcoming');

  const upcomingTickets: Ticket[] = [
    {
      id: 'SPK-88291',
      month: 'Oct',
      day: 24,
      dayOfWeek: 'Today',
      time: '14:00 - 16:00',
      type: 'Entry Pass',
      category: 'Premium Studio',
      location: 'Downtown Arts District, Suite 400',
      isToday: true
    },
    {
      id: 'SPK-99382',
      month: 'Nov',
      day: 2,
      dayOfWeek: 'Saturday',
      time: '10:00 - 12:00',
      type: 'Entry Pass',
      category: 'Portrait Session',
      location: 'Uptown Studio Loft, Room B'
    },
    {
      id: 'SPK-22109',
      month: 'Nov',
      day: 15,
      dayOfWeek: 'Friday',
      time: '15:00 - 16:00',
      type: 'Entry Pass',
      category: 'Headshot Express',
      location: 'Downtown Arts District, Suite 400'
    }
  ];

  const handleViewQR = (ticketId: string) => {
    navigate('/booking-success', { state: { ticketId } });
  };

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark flex flex-col">
      <main className="flex-grow w-full max-w-[1000px] mx-auto py-8 px-4 md:px-10 mt-24">
        {/* Breadcrumb */}
        <div className="mb-8">
          <div className="w-full flex gap-2 pb-4">
            <button onClick={() => navigate('/')} className="text-[#9c4949] dark:text-primary/70 text-sm font-medium hover:text-primary">
              Home
            </button>
            <span className="text-[#9c4949] text-sm">/</span>
            <button className="text-[#9c4949] dark:text-primary/70 text-sm font-medium hover:text-primary">
              Dashboard
            </button>
            <span className="text-[#9c4949] text-sm">/</span>
            <span className="text-[#1c0d0d] dark:text-white text-sm font-medium">My Tickets</span>
          </div>

          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-serif font-bold text-[#1c0d0d] dark:text-white tracking-tight mb-2">
                My Tickets
              </h1>
              <p className="text-[#5c4a4a] dark:text-[#a89898] font-medium">
                Manage and access your upcoming photo sessions
              </p>
            </div>

            {/* Tab Switcher */}
            <div className="flex gap-1 bg-white dark:bg-[#1c0d0d] p-1 rounded-lg border border-[#f4e7e7] dark:border-[#331a1a]">
              <button
                onClick={() => setActiveTab('upcoming')}
                className={`px-4 py-1.5 text-sm font-bold rounded shadow-sm transition-colors ${
                  activeTab === 'upcoming'
                    ? 'bg-primary text-white'
                    : 'text-[#9c4949] hover:bg-background-light dark:hover:bg-[#2a1616]'
                }`}
              >
                Upcoming
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`px-4 py-1.5 text-sm font-bold rounded shadow-sm transition-colors ${
                  activeTab === 'history'
                    ? 'bg-primary text-white'
                    : 'text-[#9c4949] hover:bg-background-light dark:hover:bg-[#2a1616]'
                }`}
              >
                History
              </button>
            </div>
          </div>
        </div>

        {/* Tickets List */}
        <div className="space-y-4">
          {activeTab === 'upcoming' ? (
            upcomingTickets.map((ticket) => (
              <div
                key={ticket.id}
                className={`group bg-white dark:bg-[#1c0d0d] rounded-xl p-6 border border-[#f4e7e7] dark:border-[#331a1a] shadow-sm hover:shadow-lg hover:border-primary/20 transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden ${
                  ticket.isToday ? 'pl-6 md:pl-6' : 'pl-6 md:pl-6'
                }`}
              >
                {/* Today Indicator */}
                {ticket.isToday && (
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary"></div>
                )}

                <div className="flex items-start gap-6 w-full md:w-auto">
                  {/* Date Box - Desktop */}
                  <div className="hidden md:flex flex-col items-center justify-center w-20 h-20 bg-background-light dark:bg-[#2a1616] rounded-lg border border-[#f4e7e7] dark:border-[#331a1a] text-center shrink-0">
                    <span className={`text-xs font-bold uppercase tracking-wide ${
                      ticket.isToday ? 'text-primary' : 'text-gray-500'
                    }`}>
                      {ticket.month}
                    </span>
                    <span className="text-2xl font-serif font-bold text-[#1c0d0d] dark:text-white leading-none mt-1">
                      {ticket.day}
                    </span>
                  </div>

                  {/* Ticket Info */}
                  <div className="flex flex-col justify-center h-full">
                    {/* Meta Info */}
                    <div className="flex items-center flex-wrap gap-3 mb-2">
                      <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-primary">
                        {ticket.type}
                      </span>
                      <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                      <span className="text-xs font-medium text-gray-500 font-mono tracking-wide">
                        #{ticket.id}
                      </span>
                      <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                      <span className="text-xs font-bold text-gray-700 dark:text-gray-300">
                        {ticket.category}
                      </span>
                    </div>

                    {/* Date & Time - Mobile */}
                    <div className="md:hidden flex items-center gap-2 mb-1 text-[#1c0d0d] dark:text-white font-serif font-bold text-xl">
                      <span>{ticket.month} {ticket.day}</span>
                      <span className="text-gray-300">•</span>
                      <span>{ticket.time}</span>
                    </div>

                    {/* Date & Time - Desktop */}
                    <div className="hidden md:block">
                      <h3 className="text-xl font-serif font-bold text-[#1c0d0d] dark:text-white mb-1">
                        {ticket.dayOfWeek}, {ticket.time}
                      </h3>
                    </div>

                    {/* Location */}
                    <div className="flex items-center gap-1 text-sm text-[#9c4949]">
                      <span className="material-symbols-outlined text-base">location_on</span>
                      <span>{ticket.location}</span>
                    </div>
                  </div>
                </div>

                {/* Action Button */}
                <div className="w-full md:w-auto flex justify-end">
                  <button
                    onClick={() => handleViewQR(ticket.id)}
                    className="w-full md:w-auto bg-primary text-white text-sm font-bold px-6 py-3 rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center gap-2 shadow-sm shadow-primary/20"
                  >
                    <span className="material-symbols-outlined text-lg">qr_code_scanner</span>
                    View QR
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-16">
              <span className="material-symbols-outlined text-6xl text-gray-300 dark:text-gray-700 mb-4">
                history
              </span>
              <p className="text-gray-500 dark:text-gray-400 text-lg">No ticket history yet</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
