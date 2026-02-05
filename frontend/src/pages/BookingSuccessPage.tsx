import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import QRCode from 'react-qr-code';
import confetti from 'canvas-confetti';
import { supabase } from '../lib/supabase';
import { getOrderStatusPresentation } from '../utils/midtransStatus';
import { useAuth } from '../contexts/AuthContext';
import BookingSuccessSkeleton from '../components/skeletons/BookingSuccessSkeleton';
import StarSparkleIcon from '../components/StarSparkleIcon';

interface LocationState {
  orderNumber?: string;
  orderId?: number;
  ticketName?: string;
  total?: number;
  date?: string;
  time?: string;
  customerName?: string;
  paymentResult?: unknown;
  isPending?: boolean;
  ticketCode?: string; // For direct ticket view from MyTicketsPage
}

interface PurchasedTicket {
  id: number;
  ticket_code: string;
  valid_date: string;
  time_slot: string | null;
  queue_number: number | null;
  queue_overflow: boolean;
  status: string;
  ticket: {
    name: string;
    type: string;
  };
}

interface PurchasedTicketRow {
  id: number;
  ticket_code: string;
  valid_date: string;
  time_slot: string | null;
  queue_number?: number | null;
  queue_overflow?: boolean | null;
  status: string;
  order_item_id?: number | null;
  tickets?: {
    name: string;
    type: string;
  } | { name: string; type: string }[] | null;
}

interface OrderItem {
  id: number;
  order_id: number;
  quantity?: number | null;
}

interface OrderRow {
  id: number;
  order_number: string;
  status: string;
  expires_at?: string | null;
}

type OrderData = OrderRow & { order_items: OrderItem[] };
type OrderState = OrderData | OrderRow | { status?: string | null; expires_at?: string | null };

export default function BookingSuccessPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const state = location.state as LocationState;
  const { session } = useAuth();

  const [loading, setLoading] = useState(true);
  const [tickets, setTickets] = useState<PurchasedTicket[]>([]);
  const [orderData, setOrderData] = useState<OrderState | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  // Auto-polling state
  const [showManualButton, setShowManualButton] = useState(false);
  const [autoSyncInProgress, setAutoSyncInProgress] = useState(false);
  const confettiTriggeredRef = useRef(false);

  // Get order number from state or URL params
  const orderNumber = state?.orderNumber || searchParams.get('order_id') || '';
  const customerName = state?.customerName || 'Guest';
  const initialIsPending = state?.isPending || false;
  const effectiveStatus: string | null = orderData?.status || (initialIsPending ? 'pending' : null);

  // Confetti celebration effect
  const triggerConfetti = () => {
    if (confettiTriggeredRef.current) return;
    confettiTriggeredRef.current = true;

    const duration = 3000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 45, spread: 360, ticks: 100, zIndex: 9999, scalar: 1.2 };
    const colors = ['#FFD700', '#C0C0C0', '#FCEabb', '#EFEFEF']; // Gold, Silver, light varieties

    const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

    const interval = window.setInterval(() => {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        clearInterval(interval);
        return;
      }

      const particleCount = 500 * (timeLeft / duration);

      // Left side burst
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
        colors: colors,
        shapes: ['square', 'circle', 'star'],
      });

      // Right side burst
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
        colors: colors,
        shapes: ['square', 'circle', 'star'],
      });
    }, 250);
  };

  useEffect(() => {
    const fetchOrderAndTickets = async () => {
      // Handle direct ticket view (from MyTicketsPage)
      if (state?.ticketCode && !orderNumber) {
        try {
          setLoading(true);
          const { data: purchasedTicket, error: ticketError } = await supabase
            .from('purchased_tickets')
            .select(`
              id,
              ticket_code,
              valid_date,
              time_slot,
              queue_number,
              queue_overflow,
              status,
              order_item_id,
              tickets:ticket_id (
                name,
                type
              )
            `)
            .eq('ticket_code', state.ticketCode)
            .single();

          if (ticketError || !purchasedTicket) {
            console.error('Error fetching ticket:', ticketError);
            setLoading(false);
            return;
          }

          // Transform to match PurchasedTicket interface
          const ticketMeta = Array.isArray(purchasedTicket.tickets)
            ? purchasedTicket.tickets[0]
            : purchasedTicket.tickets;
          const transformedTicket: PurchasedTicket = {
            id: purchasedTicket.id,
            ticket_code: purchasedTicket.ticket_code,
            valid_date: purchasedTicket.valid_date,
            time_slot: purchasedTicket.time_slot,
            queue_number: (purchasedTicket as PurchasedTicketRow).queue_number ?? null,
            queue_overflow: Boolean((purchasedTicket as PurchasedTicketRow).queue_overflow),
            status: purchasedTicket.status,
            ticket: {
              name: ticketMeta?.name || 'Ticket',
              type: ticketMeta?.type || 'entrance',
            },
          };

          setTickets([transformedTicket]);
          setOrderData({ status: 'paid' }); // Set minimal order data for UI
          setLoading(false);
          return;
        } catch (error) {
          console.error('Error:', error);
          setLoading(false);
          return;
        }
      }

      // Handle order-based view (from payment flow)
      if (!orderNumber) {
        setLoading(false);
        return;
      }

      try {
        // Fetch order data (without nested select to avoid stuck query)
        const { data: order, error: orderError } = await supabase
          .from('orders')
          .select('*')
          .eq('order_number', orderNumber)
          .single();

        if (orderError) {
          console.error('Error fetching order:', orderError);
          setLoading(false);
          return;
        }

        // Fetch order items separately
        const { data: orderItems, error: itemsError } = await supabase
          .from('order_items')
          .select('*')
          .eq('order_id', order.id);

        if (itemsError) {
          console.error('Error fetching order items:', itemsError);
        }

        // Combine data
        const orderWithItems: OrderData = {
          ...(order as OrderRow),
          order_items: (orderItems as OrderItem[] | null) || [],
        };

        setOrderData(orderWithItems);

        // Fetch purchased tickets for this order
        const typedOrderItems = (orderItems as OrderItem[] | null) || [];
        if (order?.status === 'paid' && typedOrderItems.length > 0) {
          const { data: purchasedTickets, error: ticketsError } = await supabase
            .from('purchased_tickets')
            .select(`
              id,
              ticket_code,
              valid_date,
              time_slot,
              queue_number,
              queue_overflow,
              status,
              tickets:ticket_id (
                name,
                type
              )
            `)
            .in('order_item_id', typedOrderItems.map((item) => item.id));

          if (ticketsError) {
            console.error('Error fetching tickets:', ticketsError);
          } else {
            const transformedTickets = ((purchasedTickets as PurchasedTicketRow[] | null) || []).map((t) => {
              const ticketMeta = Array.isArray(t.tickets) ? t.tickets[0] : t.tickets;
              return {
                id: t.id,
                ticket_code: t.ticket_code,
                valid_date: t.valid_date,
                time_slot: t.time_slot,
                queue_number: t.queue_number ?? null,
                queue_overflow: Boolean(t.queue_overflow),
                status: t.status,
                ticket: {
                  name: ticketMeta?.name || 'Ticket',
                  type: ticketMeta?.type || 'entrance',
                },
              };
            });
            setTickets(transformedTickets);
          }
        } else {
          setTickets([]);
        }
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchOrderAndTickets();

    const channel = orderNumber
      ? supabase
        .channel(`orders:${orderNumber}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'orders',
            filter: `order_number=eq.${orderNumber}`,
          },
          async (payload) => {
            const next = (payload as unknown as { new?: OrderRow }).new;
            if (next) {
              setOrderData(next);
              if (next.status === 'paid') {
                await fetchOrderAndTickets();
              }
            }
          }
        )
        .subscribe()
      : null;

    // If pending, poll for updates (fallback)
    let pollInterval: NodeJS.Timeout | null = null;
    if (orderNumber) {
      pollInterval = setInterval(async () => {
        const { data: order, error } = await supabase
          .from('orders')
          .select('status, expires_at')
          .eq('order_number', orderNumber)
          .single();

        if (error) {
          return;
        }

        if (order?.expires_at && new Date(order.expires_at) <= new Date() && order?.status === 'pending') {
          setOrderData((prev) => ({ ...(prev || {}), status: 'expired' }));
          if (pollInterval) clearInterval(pollInterval);
          return;
        }

        if (order?.status && order?.status !== 'pending') {
          setOrderData((prev) => ({ ...(prev || {}), status: order.status }));
          if (order.status === 'paid') {
            await fetchOrderAndTickets();
          }
          if (pollInterval) clearInterval(pollInterval);
        }
      }, 5000);
    }

    // AUTO-POLLING: Active Sync (Agresif)
    // Langsung tembak ke Midtrans via Edge Function, jangan tunggu webhook.
    let autoSyncTimeout: NodeJS.Timeout | null = null;
    let showButtonTimer: NodeJS.Timeout | null = null;

    // Compute status inside effect to avoid stale closures
    const currentStatus = orderData?.status || (initialIsPending ? 'pending' : null);

    if (orderNumber && currentStatus === 'pending') {
      console.log(`[Auto-Sync] Order ${orderNumber} is pending. Starting IMMEDIATE sync...`);

      const delaysMs = [0, 5000, 15000, 35000];
      const runAttempt = (attempt: number) => {
        if (attempt >= delaysMs.length) return;
        autoSyncTimeout = setTimeout(async () => {
          await handleSyncStatus(true);
          runAttempt(attempt + 1);
        }, delaysMs[attempt]);
      };

      runAttempt(0);

      showButtonTimer = setTimeout(() => {
        console.log('[Auto-Sync] 8 seconds elapsed - Showing manual button');
        setShowManualButton(true);
      }, 8000);
    }

    return () => {
      if (channel) supabase.removeChannel(channel);
      if (pollInterval) clearInterval(pollInterval);
      if (autoSyncTimeout) clearTimeout(autoSyncTimeout);
      if (showButtonTimer) clearTimeout(showButtonTimer);
    };
  }, [orderNumber, state?.ticketCode, orderData?.status, initialIsPending]);

  // Trigger confetti when tickets appear (paid status)
  useEffect(() => {
    if (tickets.length > 0 && effectiveStatus === 'paid' && !loading) {
      // Small delay to ensure QR code is rendered
      const timer = setTimeout(() => {
        triggerConfetti();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [tickets.length, effectiveStatus, loading]);

  const handleSyncStatus = async (isAutoSync = false) => {
    if (!orderNumber) return;

    // Prevent concurrent auto-sync calls
    if (isAutoSync && autoSyncInProgress) {
      console.log('[Auto-Sync] Skipping - sync already in progress');
      return;
    }

    if (isAutoSync) {
      setAutoSyncInProgress(true);
      console.log('[Auto-Sync] Checking payment status...');
    } else {
      setSyncing(true);
    }

    setSyncError(null);

    try {
      // CRITICAL: Use session from AuthContext (validated), not from supabase.auth.getSession() (localStorage)
      const token = session?.access_token;
      if (!token) {
        setSyncError('Not authenticated');
        return;
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sync-midtrans-status`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ order_number: orderNumber }),
        }
      );

      const data = await response.json().catch(() => null);
      if (!response.ok) {
        const errorMsg = data?.error || 'Failed to sync status';
        setSyncError(errorMsg);
        if (isAutoSync) {
          console.log(`[Auto-Sync] Failed: ${errorMsg}`);
        }
        return;
      }

      setOrderData(data?.order || orderData);

      // If successful and status is paid, stop auto-polling
      if (data?.order?.status === 'paid') {
        setShowManualButton(false);
        if (isAutoSync) {
          console.log('[Auto-Sync] Success - Payment confirmed!');
        }
      } else if (isAutoSync) {
        console.log(`[Auto-Sync] Status still: ${data?.order?.status || 'pending'}`);
      }
    } catch (e: unknown) {
      const errorMsg = e instanceof Error ? e.message : 'Failed to sync status';
      setSyncError(errorMsg);
      if (isAutoSync) {
        console.log(`[Auto-Sync] Error: ${errorMsg}`);
      }
    } finally {
      if (isAutoSync) {
        setAutoSyncInProgress(false);
      } else {
        setSyncing(false);
      }
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleEmail = () => {
    alert('Ticket has been sent to your email!');
  };



  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    const date = new Date(`${dateString}T00:00:00+07:00`);
    return date.toLocaleDateString('en-US', {
      timeZone: 'Asia/Jakarta',
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTime = (timeString: string | null) => {
    if (!timeString) return '-';
    return timeString.substring(0, 5); // HH:MM
  };

  const SESSION_DURATION_MINUTES = 150;

  const parseTimeToMinutes = (timeString: string): number | null => {
    const parts = timeString.split(':');
    if (parts.length < 2) return null;
    const hours = Number(parts[0]);
    const minutes = Number(parts[1]);
    if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
    if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
    return hours * 60 + minutes;
  };

  const minutesToTime = (minutesTotal: number) => {
    const safe = ((minutesTotal % (24 * 60)) + (24 * 60)) % (24 * 60);
    const hours = Math.floor(safe / 60);
    const minutes = safe % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  };

  const getSessionRange = (timeString: string | null) => {
    if (!timeString) return null;
    const startMinutes = parseTimeToMinutes(timeString);
    if (startMinutes == null) return null;
    const endMinutes = startMinutes + SESSION_DURATION_MINUTES;
    return `${minutesToTime(startMinutes)}-${minutesToTime(endMinutes)}`;
  };

  const getDayPartLabel = (timeString: string | null) => {
    if (!timeString) return null;
    const startMinutes = parseTimeToMinutes(timeString);
    if (startMinutes == null) return null;
    const hour = Math.floor(startMinutes / 60);
    if (hour >= 5 && hour < 11) return 'PAGI';
    if (hour >= 11 && hour < 15) return 'SIANG';
    if (hour >= 15 && hour < 19) return 'SORE';
    return 'MALAM';
  };

  const formatQueueCode = (timeString: string | null, queueNumber: number | null) => {
    if (!timeString || queueNumber == null) return null;
    const label = getDayPartLabel(timeString);
    if (!label) return null;
    return `${label}-${String(queueNumber).padStart(3, '0')}`;
  };

  const { icon: statusIcon, title: statusTitle, description: statusDescription } =
    getOrderStatusPresentation(effectiveStatus);

  const showSkeleton = loading && !orderData && tickets.length === 0;

  if (showSkeleton) {
    return <BookingSuccessSkeleton />;
  }

  return (
    <div className="min-h-screen bg-background-light">
      <main className="flex-1 flex justify-center py-12 px-4">
        <div className="layout-content-container flex flex-col max-w-[800px] flex-1">
          {/* Celebration Section */}
          <div className="text-center mb-8">
            {effectiveStatus === 'paid' ? (
              /* Success State - "Ready to Be a Star?" */
              <>
                {/* Status Badge */}
                <p className="text-xs uppercase tracking-widest text-gray-400 font-semibold mb-3">
                  Booking Confirmed
                </p>
                
                {/* Main Headline with Gradient */}
                {/* <h1 className="text-5xl md:text-6xl font-display font-bold mb-4 bg-gradient-to-r from-primary via-rose-500 to-primary bg-[length:200%_auto] animate-gradient bg-clip-text text-transparent leading-tight pb-2">
                  Ready to Be a Star?
                </h1> */}
                {/* Main Headline Image */}
                <div className="flex justify-center mb-2">
                  <img 
                    src="/images/landing/READY%20TO%20BE%20A%20STAR.PNG" 
                    alt="Ready to Be a Star?" 
                    className="h-auto w-full max-w-xl object-contain"
                  />
                </div>
              </>
            ) : (
              /* Other States - Keep Original Design */
              <>
                <div className={`inline-flex items-center justify-center p-3 mb-4 rounded-full ${effectiveStatus === 'pending' ? 'bg-yellow-100 text-yellow-600' : 'bg-primary/10 text-primary'
                  }`}>
                  <span className="material-symbols-outlined text-4xl">
                    {statusIcon}
                  </span>
                </div>
                <h1 className="text-[#1c0d0d] tracking-tight text-4xl md:text-5xl font-bold leading-tight pb-3 font-display">
                  {statusTitle}
                </h1>
                <p className="text-[#9c4949] text-lg font-normal leading-normal max-w-xl mx-auto px-4">
                  {statusDescription}
                </p>
              </>
            )}
          </div>

          {/* Order Info */}
          {orderData && (
            <div className="mb-6 text-center">
              <p className="text-sm text-gray-500">Order Number</p>
              <p className="text-lg font-mono font-bold">{orderNumber}</p>
            </div>
          )}

          {/* Tickets */}
          {tickets.length > 0 ? (
            tickets.map((ticket) => (
              <div key={ticket.id} className="relative bg-white rounded-xl shadow-2xl overflow-hidden border border-[#f4e7e7]#3d2020] mb-6">
                {/* Decorative Header */}
                <div className="h-2 bg-primary"></div>

                <div className="p-8 md:p-12 flex flex-col md:flex-row gap-10">
                  {/* Left Side: QR Code */}
                  <div className="flex flex-col items-center justify-center flex-shrink-0">
                    <div className="p-4 bg-white rounded-xl border-4 border-primary/10 shadow-inner">
                      <QRCode
                        value={ticket.ticket_code}
                        size={192}
                        level="H"
                        style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                      />
                    </div>
                    <p className="mt-4 text-xs font-mono text-[#9c4949] tracking-widest uppercase">
                      {ticket.ticket_code}
                    </p>
                  </div>

                  {/* Right Side: Details */}
                  <div className="flex-1 space-y-6">
                    <div>
                      {/* <p className="text-primary text-sm font-bold uppercase tracking-widest mb-1">
                        Official Studio Pass
                      </p> */}
                      <h2 className="text-2xl font-bold font-display">{ticket.ticket.name}</h2>
                      <span className={`inline-block mt-2 px-3 py-1 rounded-full text-xs font-bold uppercase ${ticket.status === 'active'
                        ? 'bg-green-100 text-green-700'
                        : ticket.status === 'used'
                          ? 'bg-gray-100 text-gray-700'
                          : 'bg-red-100 text-red-700'
                        }`}>
                        {ticket.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 py-6 border-y border-[#f4e7e7]#3d2020]">
                      <div className="space-y-1">
                        <p className="text-[#9c4949] text-xs font-medium uppercase">Customer</p>
                        <p className="text-lg font-bold">{customerName}</p>
                      </div>
                      <div className="space-y-1 text-right md:text-left">
                        <p className="text-[#9c4949] text-xs font-medium uppercase">Session Date</p>
                        <p className="text-lg font-bold">{formatDate(ticket.valid_date)}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[#9c4949] text-xs font-medium uppercase">Time Slot</p>
                        <p className="text-lg font-bold">{formatTime(ticket.time_slot)}</p>
                        {ticket.time_slot && (
                          <p className="text-xs font-semibold text-[#9c4949] tracking-wide">
                            {getSessionRange(ticket.time_slot) ?? ''}
                          </p>
                        )}
                      </div>
                      {ticket.time_slot && (
                        <div className="space-y-1 text-right md:text-left">
                          <p className="text-[#9c4949] text-xs font-medium uppercase">Nomor Masuk</p>
                          <div className="flex items-baseline justify-end md:justify-start gap-3">
                            <p className="text-3xl font-black font-mono text-[#1c0d0d]">
                              {formatQueueCode(ticket.time_slot, ticket.queue_number) ?? '—'}
                            </p>
                            {ticket.queue_overflow && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-[11px] font-bold uppercase bg-amber-100 text-amber-800">
                                Waitlist
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] font-semibold text-[#9c4949] tracking-wide">
                            {getSessionRange(ticket.time_slot) ?? ''}
                          </p>
                        </div>
                      )}
                      <div className="space-y-1 text-right md:text-left">
                        <p className="text-[#9c4949] text-xs font-medium uppercase">Type</p>
                        <p className="text-lg font-bold capitalize">{ticket.ticket.type}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 bg-primary/5 p-4 rounded-lg border border-primary/10">
                      <span className="material-symbols-outlined text-primary">info</span>
                      <p className="text-sm text-[#1c0d0d]">
                        Please present this QR code at the reception. Arrive 15 minutes before your slot. Use your entry number to pick up a paper number at the gate.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Ticket Footer */}
                <div className="bg-slate-50 p-6 border-t border-[#f4e7e7]#3d2020] flex flex-wrap items-center justify-between gap-4">
                  <div className="flex gap-4">
                    <button
                      onClick={handlePrint}
                      className="flex items-center gap-2 text-[#9c4949] hover:text-primary transition-colors text-sm font-medium"
                    >
                      <span className="material-symbols-outlined text-lg">print</span>
                      Print
                    </button>
                    <button
                      onClick={handleEmail}
                      className="flex items-center gap-2 text-[#9c4949] hover:text-primary transition-colors text-sm font-medium"
                    >
                      <span className="material-symbols-outlined text-lg">share</span>
                      Email
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`size-2 rounded-full ${ticket.status === 'active' ? 'bg-green-500' : 'bg-gray-400'
                      }`}></span>
                    <span className={`text-sm font-bold uppercase ${ticket.status === 'active' ? 'text-green-600' : 'text-gray-600'
                      }`}>
                      {ticket.status === 'active' ? 'Valid' : ticket.status}
                    </span>
                  </div>
                </div>
              </div>
            ))
          ) : (
            /* Fallback for pending or no tickets */
            <div className="relative bg-white rounded-xl shadow-2xl overflow-hidden border border-[#f4e7e7]#3d2020]">
              <div className="h-2 bg-primary"></div>
              <div className="p-8 md:p-12 text-center">
                {effectiveStatus === 'pending' ? (
                  <div className="flex flex-col items-center justify-center py-4">
                    {/* Magic/Spark Animation Container */}
                    <div className="relative mb-6">
                      <div className="absolute inset-0 bg-primary/30 blur-2xl rounded-full animate-pulse"></div>
                      <div className="relative bg-white p-5 rounded-full border-2 border-primary/20 shadow-xl shadow-primary/20">
                        <span className="material-symbols-outlined text-5xl text-primary animate-spin" style={{ animationDuration: '2s' }}>
                          auto_awesome
                        </span>
                      </div>
                    </div>

                    {/* Experience Text */}
                    <h2 className="text-2xl font-display font-bold text-neutral-900 mb-2">
                      Summoning Your Pass...
                    </h2>
                    <p className="text-gray-500 font-medium animate-pulse">
                      Finalizing your magical journey to the stage.
                    </p>

                    {/* Technical details hidden/subtle */}
                    <p className="text-xs text-gray-400 mt-8 font-mono">
                      Order Ref: {orderNumber}
                    </p>

                    {/* Manual button - only shown after 20 seconds if still pending */}
                    {showManualButton && (
                      <div className="mt-6 animate-fade-in">
                        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                          <p className="text-sm text-yellow-700">
                            <span className="material-symbols-outlined text-base align-middle mr-1">info</span>
                            Payment verification is taking longer than expected.
                          </p>
                        </div>
                        <button
                          onClick={() => handleSyncStatus(false)}
                          disabled={syncing || autoSyncInProgress}
                          className="h-11 px-5 rounded-xl bg-[#ff4b86] text-white font-bold hover:bg-[#e63d75] disabled:opacity-60 transition-all"
                        >
                          {syncing || autoSyncInProgress ? 'Checking...' : 'Check Status Manually'}
                        </button>
                        {syncError && (
                          <p className="text-sm text-red-600 mt-3">
                            {syncError}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-6xl text-gray-400 mb-4">confirmation_number</span>
                    <h2 className="text-xl font-bold mb-2">No Tickets Found</h2>
                    <p className="text-gray-500">
                      Your tickets may still be processing. Please check back in a moment.
                    </p>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Action Button */}
          {tickets.length > 0 && (
            <div className="flex justify-center mt-10 px-4">
              <button
                onClick={() => navigate('/my-tickets')}
                className="flex items-center justify-center gap-2 min-w-[200px] h-14 rounded-xl bg-[#ff4b86] text-white font-bold text-lg hover:bg-[#e63d75] transition-all shadow-xl shadow-primary/30"
              >
                <span className="material-symbols-outlined">confirmation_number</span>
                View My Tickets
              </button>
            </div>
          )}

          <div className="mt-12 text-center pb-12">
            <button
              onClick={() => navigate('/')}
              className="text-[#9c4949] hover:text-primary transition-colors text-sm underline underline-offset-4"
            >
              Back to Home
            </button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center py-10 text-[#9c4949]/60 text-xs tracking-widest uppercase px-4 border-t border-[#f4e7e7]#3d2020]">
        Spark Stage • Premium Photography Experience
      </footer>
    </div>
  );
}
