import { useState, useEffect } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import QRCode from 'react-qr-code';
import { supabase } from '../lib/supabase';
import { getOrderStatusPresentation } from '../utils/midtransStatus';
import { useAuth } from '../contexts/AuthContext';

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
  const [isProcessing, setIsProcessing] = useState(false); // Simplified: just show spinner

  // Get order number from state or URL params
  const orderNumber = state?.orderNumber || searchParams.get('order_id') || '';
  const customerName = state?.customerName || 'Guest';
  const initialIsPending = state?.isPending || false;
  const effectiveStatus: string | null = orderData?.status || (initialIsPending ? 'pending' : null);

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

    // AUTO-POLLING: Smart sync for webhook failures
    // Wait 5s for webhook, then poll sync API every 3s (max 10 times)
    let initialWaitTimer: NodeJS.Timeout | null = null;
    let autoSyncInterval: NodeJS.Timeout | null = null;
    let showButtonTimer: NodeJS.Timeout | null = null;
    
    // Compute status inside effect to avoid stale closures
    const currentStatus = orderData?.status || (initialIsPending ? 'pending' : null);
    
    if (orderNumber && currentStatus === 'pending') {
      console.log('[Auto-Sync] Order pending - Starting smart polling...');
      console.log(`[Auto-Sync] Order: ${orderNumber}, Status: ${currentStatus}`);
      console.log('[Auto-Sync] Waiting 5 seconds for webhook...');
      
      // Show processing state
      setIsProcessing(true);
      
      // Show manual button after 30 seconds
      showButtonTimer = setTimeout(() => {
        console.log('[Auto-Sync] 30 seconds elapsed - Showing manual button');
        setShowManualButton(true);
      }, 30000);
      
      // Wait 5 seconds for webhook to fire
      initialWaitTimer = setTimeout(() => {
        console.log('[Auto-Sync] Webhook timeout - Starting active polling every 3s');
        
        // Track attempts locally to avoid stale closure issues
        let attemptCount = 0;
        
        // Start polling sync API every 3 seconds
        autoSyncInterval = setInterval(async () => {
          attemptCount++;
          console.log(`[Auto-Sync] Attempt ${attemptCount}/10`);
          
          // Check if we've reached max attempts
          if (attemptCount >= 10) {
            console.log('[Auto-Sync] Max attempts reached (10/10) - Showing manual button');
            setShowManualButton(true);
            setIsProcessing(false);
            if (autoSyncInterval) clearInterval(autoSyncInterval);
            return;
          }
          
          // Trigger sync
          await handleSyncStatus(true);
        }, 3000); // 3 seconds
      }, 5000); // 5 seconds initial wait
    }

    return () => {
      if (channel) supabase.removeChannel(channel);
      if (pollInterval) clearInterval(pollInterval);
      if (initialWaitTimer) clearTimeout(initialWaitTimer);
      if (autoSyncInterval) clearInterval(autoSyncInterval);
      if (showButtonTimer) clearTimeout(showButtonTimer);
    };
  }, [orderNumber, state?.ticketCode, orderData?.status, initialIsPending]);

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
        setIsProcessing(false);
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

  const handleDownloadPDF = () => {
    alert('PDF download started!');
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

  const { icon: statusIcon, title: statusTitle, description: statusDescription } =
    getOrderStatusPresentation(effectiveStatus);

  if (loading) {
    return (
      <div className="min-h-screen bg-background-light dark:bg-background-dark flex items-center justify-center">
        <div className="text-center">
          <span className="material-symbols-outlined text-5xl text-primary animate-spin">
            progress_activity
          </span>
          <p className="mt-4 text-gray-500">Loading your tickets...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark">
      <main className="flex-1 flex justify-center py-12 px-4">
        <div className="layout-content-container flex flex-col max-w-[800px] flex-1">
          {/* Celebration Section */}
          <div className="text-center mb-8">
            <div className={`inline-flex items-center justify-center p-3 mb-4 rounded-full ${
              effectiveStatus === 'pending' ? 'bg-yellow-100 text-yellow-600' : 'bg-primary/10 text-primary'
            }`}>
              <span className="material-symbols-outlined text-4xl">
                {statusIcon}
              </span>
            </div>
            <h1 className="text-[#1c0d0d] dark:text-white tracking-tight text-4xl md:text-5xl font-bold leading-tight pb-3 font-display">
              {statusTitle}
            </h1>
            <p className="text-[#9c4949] dark:text-red-200 text-lg font-normal leading-normal max-w-xl mx-auto px-4">
              {statusDescription}
            </p>
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
              <div key={ticket.id} className="relative bg-white dark:bg-background-dark/80 rounded-xl shadow-2xl overflow-hidden border border-[#f4e7e7] dark:border-[#3d2020] mb-6">
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
                    <p className="mt-4 text-xs font-mono text-[#9c4949] dark:text-red-300 tracking-widest uppercase">
                      {ticket.ticket_code}
                    </p>
                  </div>

                  {/* Right Side: Details */}
                  <div className="flex-1 space-y-6">
                    <div>
                      <p className="text-primary text-sm font-bold uppercase tracking-widest mb-1">
                        Official Studio Pass
                      </p>
                      <h2 className="text-2xl font-bold font-display">{ticket.ticket.name}</h2>
                      <span className={`inline-block mt-2 px-3 py-1 rounded-full text-xs font-bold uppercase ${
                        ticket.status === 'active' 
                          ? 'bg-green-100 text-green-700' 
                          : ticket.status === 'used' 
                          ? 'bg-gray-100 text-gray-700'
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {ticket.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 py-6 border-y border-[#f4e7e7] dark:border-[#3d2020]">
                      <div className="space-y-1">
                        <p className="text-[#9c4949] dark:text-red-300 text-xs font-medium uppercase">Customer</p>
                        <p className="text-lg font-bold">{customerName}</p>
                      </div>
                      <div className="space-y-1 text-right md:text-left">
                        <p className="text-[#9c4949] dark:text-red-300 text-xs font-medium uppercase">Session Date</p>
                        <p className="text-lg font-bold">{formatDate(ticket.valid_date)}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[#9c4949] dark:text-red-300 text-xs font-medium uppercase">Time Slot</p>
                        <p className="text-lg font-bold">{formatTime(ticket.time_slot)}</p>
                      </div>
                      <div className="space-y-1 text-right md:text-left">
                        <p className="text-[#9c4949] dark:text-red-300 text-xs font-medium uppercase">Type</p>
                        <p className="text-lg font-bold capitalize">{ticket.ticket.type}</p>
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

                {/* Ticket Footer */}
                <div className="bg-slate-50 dark:bg-black/20 p-6 border-t border-[#f4e7e7] dark:border-[#3d2020] flex flex-wrap items-center justify-between gap-4">
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
                    <span className={`size-2 rounded-full ${
                      ticket.status === 'active' ? 'bg-green-500' : 'bg-gray-400'
                    }`}></span>
                    <span className={`text-sm font-bold uppercase ${
                      ticket.status === 'active' ? 'text-green-600' : 'text-gray-600'
                    }`}>
                      {ticket.status === 'active' ? 'Valid' : ticket.status}
                    </span>
                  </div>
                </div>
              </div>
            ))
          ) : (
            /* Fallback for pending or no tickets */
            <div className="relative bg-white dark:bg-background-dark/80 rounded-xl shadow-2xl overflow-hidden border border-[#f4e7e7] dark:border-[#3d2020]">
              <div className="h-2 bg-primary"></div>
              <div className="p-8 md:p-12 text-center">
                {effectiveStatus === 'pending' ? (
                  <>
                    <span className="material-symbols-outlined text-6xl text-yellow-500 mb-4">hourglass_empty</span>
                    <h2 className="text-xl font-bold mb-2">Waiting for Payment</h2>
                    <p className="text-gray-500">
                      Your tickets will appear here once payment is confirmed.
                    </p>
                    <p className="text-sm text-gray-400 mt-4">
                      Order: {orderNumber}
                    </p>
                    
                    {/* Clean spinner - no countdown, no counter */}
                    {isProcessing && !showManualButton && (
                      <div className="mt-6 flex flex-col items-center gap-3">
                        <div className="flex items-center gap-3">
                          <span className="material-symbols-outlined text-3xl text-primary animate-spin">sync</span>
                          <span className="text-base font-medium text-gray-700 dark:text-gray-300">
                            Confirming your payment...
                          </span>
                        </div>
                        <p className="text-sm text-gray-400">This usually takes a few seconds</p>
                      </div>
                    )}
                    
                    {/* Manual button - only shown after 30 seconds */}
                    {showManualButton && (
                      <div className="mt-6">
                        <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                          <p className="text-sm text-yellow-700 dark:text-yellow-300">
                            <span className="material-symbols-outlined text-base align-middle mr-1">info</span>
                            Payment verification is taking longer than expected. Please check status manually.
                          </p>
                        </div>
                        <button
                          onClick={() => handleSyncStatus(false)}
                          disabled={syncing || autoSyncInProgress}
                          className="h-11 px-5 rounded-xl bg-primary text-white font-bold hover:bg-primary/90 disabled:opacity-60 transition-all"
                        >
                          {syncing || autoSyncInProgress ? 'Checking...' : 'Check Status'}
                        </button>
                        {syncError && (
                          <p className="text-sm text-red-600 mt-3">
                            {syncError}
                          </p>
                        )}
                      </div>
                    )}
                  </>
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

          {/* Action Buttons */}
          {tickets.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-10 px-4">
              <button 
                onClick={handleDownloadPDF}
                className="flex items-center justify-center gap-2 min-w-[180px] h-14 rounded-xl bg-primary text-white font-bold text-lg hover:bg-primary/90 transition-all shadow-xl shadow-primary/30"
              >
                <span className="material-symbols-outlined">download</span>
                Download All Tickets
              </button>
              <button 
                onClick={() => navigate('/my-tickets')}
                className="flex items-center justify-center gap-2 min-w-[180px] h-14 rounded-xl bg-white dark:bg-background-dark border-2 border-primary text-primary font-bold text-lg hover:bg-primary/5 transition-all"
              >
                <span className="material-symbols-outlined">confirmation_number</span>
                View My Tickets
              </button>
            </div>
          )}

          <div className="mt-12 text-center pb-12">
            <button
              onClick={() => navigate('/')}
              className="text-[#9c4949] dark:text-red-300 hover:text-primary transition-colors text-sm underline underline-offset-4"
            >
              Back to Home
            </button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center py-10 text-[#9c4949]/60 text-xs tracking-widest uppercase px-4 border-t border-[#f4e7e7] dark:border-[#3d2020]">
        Spark Photo Studio • Premium Photography Experience
      </footer>
    </div>
  );
}
