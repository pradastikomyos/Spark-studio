import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { todayWIB, createWIBDate, nowWIB, addMinutes, SESSION_DURATION_MINUTES, formatTimeWIB } from '../utils/timezone';
import { useMyTickets } from '../hooks/useMyTickets';
import TicketCardSkeleton from '../components/skeletons/TicketCardSkeleton';
import { PageTransition } from '../components/PageTransition';
import { useToast } from '../components/Toast';
import { LazyMotion, m } from 'framer-motion';

export default function MyTicketsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showToast } = useToast();
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'upcoming' | 'history'>('upcoming');
  const { data: tickets = [], error, isLoading: loading, isFetching } = useMyTickets(user?.id);

  useEffect(() => {
    if (error) {
      showToast('error', error instanceof Error ? error.message : 'Failed to load tickets');
    }
  }, [error, showToast]);

  // Filter tickets based on active tab - TIMEZONE-SAFE
  const today = todayWIB();

  const upcomingTickets = tickets.filter((ticket) => {
    const ticketDate = createWIBDate(ticket.valid_date);
    return ticketDate >= today && ticket.status === 'active';
  });

  const historyTickets = tickets.filter((ticket) => {
    const ticketDate = createWIBDate(ticket.valid_date);
    return ticketDate < today || ticket.status !== 'active';
  });

  const displayTickets = activeTab === 'upcoming' ? upcomingTickets : historyTickets;

  const formatDate = (dateString: string) => {
    const date = createWIBDate(dateString);
    const month = date.toLocaleDateString('en-US', { month: 'short' });
    const day = date.getDate();
    const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'long' });

    const today = todayWIB();
    const ticketDate = createWIBDate(dateString);
    ticketDate.setHours(0, 0, 0, 0);
    const isToday = ticketDate.getTime() === today.getTime();

    return { month, day, dayOfWeek: isToday ? 'Today' : dayOfWeek, isToday };
  };

  const getStatusLabel = (status: string) => {
    if (status === 'used') return t('myTickets.status.used');
    if (status === 'cancelled') return t('myTickets.status.cancelled');
    if (status === 'expired') return t('myTickets.status.expired');
    return `Status: ${status}`;
  };

  const formatTimeShort = (timeSlot: string | null) => {
    if (!timeSlot) return null;
    return timeSlot.substring(0, 5);
  };

  const getDayPartLabel = (timeSlot: string | null) => {
    const start = formatTimeShort(timeSlot);
    if (!start) return null;
    const hour = Number(start.split(':')[0]);
    if (!Number.isFinite(hour)) return null;
    if (hour >= 5 && hour < 11) return 'PAGI';
    if (hour >= 11 && hour < 15) return 'SIANG';
    if (hour >= 15 && hour < 19) return 'SORE';
    return 'MALAM';
  };

  const getSessionRange = (validDate: string, timeSlot: string | null) => {
    if (!timeSlot) return null;
    const start = createWIBDate(validDate, timeSlot);
    const end = addMinutes(start, SESSION_DURATION_MINUTES);
    return `${formatTimeWIB(start)}-${formatTimeWIB(end)}`;
  };

  const formatQueueCode = (timeSlot: string | null, queueNumber: number | null) => {
    if (!timeSlot || queueNumber == null) return null;
    const label = getDayPartLabel(timeSlot);
    if (!label) return null;
    return `${label}-${String(queueNumber).padStart(3, '0')}`;
  };

  // Check if session has ended (for same-day tickets)
  const isSessionEnded = (validDate: string, timeSlot: string | null): boolean => {
    if (!timeSlot) return false;
    
    const ticketDate = createWIBDate(validDate);
    const today = todayWIB();
    
    // Only check for today's tickets
    if (ticketDate.toDateString() !== today.toDateString()) return false;
    
    const sessionStart = createWIBDate(validDate, timeSlot);
    const sessionEnd = addMinutes(sessionStart, SESSION_DURATION_MINUTES);
    const now = nowWIB();
    
    return now > sessionEnd;
  };

  const handleViewQR = (ticketCode: string) => {
    navigate('/booking-success', { state: { ticketCode } });
  };

  if (loading) {
    return (
      <PageTransition>
        <div className="min-h-screen bg-background-light flex items-center justify-center">
          <div className="max-w-5xl w-full px-8 grid grid-cols-1 md:grid-cols-2 gap-6">
            <TicketCardSkeleton />
            <TicketCardSkeleton />
          </div>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="min-h-screen bg-background-light flex flex-col">
        <main className="flex-grow w-full max-w-[1000px] mx-auto py-8 px-4 md:px-10 mt-24">
        {/* Breadcrumb */}
        <div className="mb-8">
          <div className="w-full flex gap-2 pb-4">
            <button onClick={() => navigate('/')} className="text-rose-700 text-sm font-medium hover:text-primary">
              {t('myTickets.breadcrumb.home')}
            </button>
            <span className="text-rose-700 text-sm">/</span>
            <button className="text-rose-700 text-sm font-medium hover:text-primary">
              {t('myTickets.breadcrumb.dashboard')}
            </button>
            <span className="text-rose-700 text-sm">/</span>
            <span className="text-neutral-950 text-sm font-medium">{t('myTickets.breadcrumb.myTickets')}</span>
          </div>

          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-serif font-bold text-neutral-950 tracking-tight mb-2">
                {t('myTickets.title')}
              </h1>
              <p className="text-gray-600 font-medium">
                {t('myTickets.subtitle')}
              </p>
            </div>

            {/* Tab Switcher */}
            <div className="flex items-center gap-3">
              {isFetching && !loading && (
                <div className="flex items-center gap-1.5 text-xs text-rose-700">
                  <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>
                  {t('myTickets.updating')}
                </div>
              )}
              <div className="flex gap-1 bg-gray-50 p-1 rounded-lg border border-gray-200">
                <button
                  onClick={() => setActiveTab('upcoming')}
                  className={`px-4 py-1.5 text-sm font-bold rounded shadow-sm transition-colors ${activeTab === 'upcoming'
                      ? 'bg-[#ff4b86] text-white'
                      : 'text-gray-600 hover:bg-white:bg-rose-950'
                    }`}
                >
                  {t('myTickets.tabs.upcoming')}
                </button>
                <button
                  onClick={() => setActiveTab('history')}
                  className={`px-4 py-1.5 text-sm font-bold rounded shadow-sm transition-colors ${activeTab === 'history'
                      ? 'bg-[#ff4b86] text-white'
                      : 'text-gray-600 hover:bg-white:bg-rose-950'
                    }`}
                >
                  {t('myTickets.tabs.history')}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Expiry Warning Banner - Only show on Upcoming tab */}
        {activeTab === 'upcoming' && upcomingTickets.length > 0 && (
          <div className="mb-6 rounded-xl border-2 border-amber-200 bg-amber-50 p-4 md:p-5">
            <div className="flex items-start gap-3">
              <span className="material-symbols-outlined text-amber-600 text-2xl flex-shrink-0 mt-0.5">
                info
              </span>
              <div className="flex-1">
                <h3 className="font-bold text-amber-900 text-base mb-1.5">
                  {t('myTickets.expiryWarning.title')}
                </h3>
                <p className="text-sm text-amber-800 leading-relaxed">
                  {t('myTickets.expiryWarning.message')}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Disclaimer - Commercial fine print - LIGHT GREY BACKGROUND */}
        <div className="mb-6 px-4 py-3 bg-gray-100 border border-gray-300 rounded-lg">
          <p className="text-xs text-gray-700 italic leading-relaxed">
            {t('myTickets.disclaimer')}
          </p>
        </div>

        {/* Tickets List */}
        <LazyMotion features={() => import('framer-motion').then((mod) => mod.domAnimation)}>
        <div className="space-y-4">
          {displayTickets.length > 0 ? (
            displayTickets.map((ticket, index) => {
              const { month, day, dayOfWeek, isToday } = formatDate(ticket.valid_date);
              const timeDisplay = formatTimeShort(ticket.time_slot) || 'All Day';
              const sessionRange = getSessionRange(ticket.valid_date, ticket.time_slot);
              const queueCode = formatQueueCode(ticket.time_slot, ticket.queue_number);
              const sessionEnded = isSessionEnded(ticket.valid_date, ticket.time_slot);

              return (
                <m.div
                  key={ticket.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: index * 0.05 }}
                  className={`group bg-white rounded-xl p-6 border border-gray-200 shadow-sm hover:shadow-lg hover:border-primary/20 transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden ${isToday ? 'pl-6 md:pl-6' : 'pl-6 md:pl-6'
                    }`}
                >
                  {/* Today Indicator */}
                  {isToday && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#ff4b86]"></div>
                  )}

                  <div className="flex items-start gap-6 w-full md:w-auto">
                    {/* Date Box - Desktop */}
                    <div className="hidden md:flex flex-col items-center justify-center w-20 h-20 bg-gray-50 rounded-lg border border-gray-200 text-center shrink-0">
                      <span className={`text-xs font-bold uppercase tracking-wide ${isToday ? 'text-primary' : 'text-gray-500'
                        }`}>
                        {month}
                      </span>
                      <span className="text-2xl font-serif font-bold text-neutral-950 leading-none mt-1">
                        {day}
                      </span>
                    </div>

                    {/* Ticket Info */}
                    <div className="flex flex-col justify-center h-full">
                      {/* Meta Info */}
                      <div className="flex items-center flex-wrap gap-3 mb-2">
                        <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-primary">
                          {ticket.ticket.type === 'entrance' ? t('myTickets.entryPass') : t('myTickets.stagePass')}
                        </span>
                        <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                        <span className="text-xs font-medium text-gray-500 font-mono tracking-wide">
                          #{ticket.ticket_code}
                        </span>
                        {ticket.time_slot && (
                          <>
                            <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                            <span
                              className={`inline-flex items-center px-2 py-1 rounded-full text-[11px] font-bold ${
                                ticket.queue_overflow
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-primary/10 text-primary'
                              }`}
                            >
                              {queueCode ?? 'Nomor disiapkan'}
                            </span>
                          </>
                        )}
                        <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                        <span className="text-xs font-bold text-gray-700">
                          {ticket.ticket.name}
                        </span>
                      </div>

                      {/* Date & Time - Mobile */}
                      <div className="md:hidden flex items-center gap-2 mb-1 text-neutral-950 font-serif font-bold text-xl">
                        <span>{month} {day}</span>
                        <span className="text-gray-300">•</span>
                        <span>{timeDisplay}</span>
                      </div>
                      {ticket.time_slot && sessionRange && (
                        <div className="md:hidden text-[11px] font-semibold text-gray-600 tracking-wide mb-1">
                          {sessionRange}
                        </div>
                      )}

                      {/* Date & Time - Desktop */}
                      <div className="hidden md:block">
                        <h3 className="text-xl font-serif font-bold text-neutral-950 mb-1">
                          {dayOfWeek}, {timeDisplay}
                        </h3>
                        {ticket.time_slot && sessionRange && (
                          <div className="text-[11px] font-semibold text-gray-600 tracking-wide -mt-0.5">
                            {sessionRange}
                          </div>
                        )}
                      </div>

                      {/* Description/Location */}
                      {ticket.ticket.description && (
                        <div className="flex items-center gap-1 text-sm text-rose-700">
                          <span className="material-symbols-outlined text-base">location_on</span>
                          <span>{ticket.ticket.description}</span>
                        </div>
                      )}

                      {/* Status Badge */}
                      {ticket.status !== 'active' && (
                        <div className="mt-2">
                          <span className={`inline-block px-2 py-1 text-xs font-bold rounded ${ticket.status === 'used' ? 'bg-green-100 text-green-700' :
                              ticket.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                                'bg-gray-100 text-gray-700'
                            }`}>
                            {getStatusLabel(ticket.status)}
                          </span>
                        </div>
                      )}

                      {/* Session Ended Warning - For active tickets with ended sessions */}
                      {ticket.status === 'active' && sessionEnded && (
                        <div className="mt-2">
                          <span className="inline-block px-2 py-1 text-xs font-bold rounded bg-orange-100 text-orange-700">
                            ⚠️ {t('myTickets.expiryWarning.sessionEnded')}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Action Button */}
                  <div className="w-full md:w-auto flex justify-end">
                    <button
                      onClick={() => handleViewQR(ticket.ticket_code)}
                      className={`w-full md:w-auto text-sm font-bold px-6 py-3 rounded-lg transition-colors flex items-center justify-center gap-2 shadow-sm ${
                        ticket.status === 'active' && !sessionEnded
                          ? 'bg-[#ff4b86] text-white hover:bg-[#e63d75] shadow-primary/20'
                          : 'bg-gray-300 text-gray-600 cursor-not-allowed'
                      }`}
                      disabled={ticket.status !== 'active' || sessionEnded}
                    >
                      <span className="material-symbols-outlined text-lg">qr_code_scanner</span>
                      {ticket.status === 'active' && !sessionEnded ? t('myTickets.viewQR') : t('myTickets.ticketInactive')}
                    </button>
                  </div>
                </m.div>
              );
            })
          ) : (
            <div className="text-center py-16">
              <span className="material-symbols-outlined text-6xl text-gray-300 mb-4">
                {activeTab === 'upcoming' ? 'confirmation_number' : 'history'}
              </span>
              <p className="text-gray-500 text-lg mb-2">
                {activeTab === 'upcoming' ? t('myTickets.empty.upcoming.title') : t('myTickets.empty.history.title')}
              </p>
              <p className="text-gray-400 text-sm">
                {activeTab === 'upcoming'
                  ? t('myTickets.empty.upcoming.subtitle')
                  : t('myTickets.empty.history.subtitle')}
              </p>
            </div>
          )}
        </div>
        </LazyMotion>
        </main>
      </div>
    </PageTransition>
  );
}
