import QRCode from 'react-qr-code';
import type { PurchasedTicket } from './bookingSuccessTypes';
import { formatDate, formatQueueCode, formatTime, getSessionRange } from './bookingSuccessFormatters';

type BookingTicketCardProps = {
  ticket: PurchasedTicket;
  customerName: string;
  onPrint: () => void;
  onEmail: () => void;
};

export function BookingTicketCard(props: BookingTicketCardProps) {
  const { ticket, customerName, onPrint, onEmail } = props;

  return (
    <div className="relative bg-white rounded-xl shadow-2xl overflow-hidden border border-[#f4e7e7]#3d2020] mb-6">
      <div className="h-2 bg-primary"></div>

      <div className="p-8 md:p-12 flex flex-col md:flex-row gap-10">
        <div className="flex flex-col items-center justify-center flex-shrink-0">
          <div className="p-4 bg-white rounded-xl border-4 border-primary/10 shadow-inner">
            <QRCode value={ticket.ticket_code} size={192} level="H" style={{ height: 'auto', maxWidth: '100%', width: '100%' }} />
          </div>
          <p className="mt-4 text-xs font-mono text-[#9c4949] tracking-widest uppercase">{ticket.ticket_code}</p>
        </div>

        <div className="flex-1 space-y-6">
          <div>
            <h2 className="text-2xl font-bold font-display">{ticket.ticket.name}</h2>
            <span
              className={`inline-block mt-2 px-3 py-1 rounded-full text-xs font-bold uppercase ${
                ticket.status === 'active'
                  ? 'bg-green-100 text-green-700'
                  : ticket.status === 'used'
                    ? 'bg-gray-100 text-gray-700'
                    : 'bg-red-100 text-red-700'
              }`}
            >
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
              {ticket.time_slot && <p className="text-xs font-semibold text-[#9c4949] tracking-wide">{getSessionRange(ticket.time_slot) ?? ''}</p>}
            </div>
            {ticket.time_slot && (
              <div className="space-y-1 text-right md:text-left">
                <p className="text-[#9c4949] text-xs font-medium uppercase">Nomor Masuk</p>
                <div className="flex items-baseline justify-end md:justify-start gap-3">
                  <p className="text-3xl font-black font-mono text-[#1c0d0d]">{formatQueueCode(ticket.time_slot, ticket.queue_number) ?? '—'}</p>
                  {ticket.queue_overflow && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-[11px] font-bold uppercase bg-amber-100 text-amber-800">
                      Waitlist
                    </span>
                  )}
                </div>
                <p className="text-[11px] font-semibold text-[#9c4949] tracking-wide">{getSessionRange(ticket.time_slot) ?? ''}</p>
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

      <div className="bg-slate-50 p-6 border-t border-[#f4e7e7]#3d2020] flex flex-wrap items-center justify-between gap-4">
        <div className="flex gap-4">
          <button onClick={onPrint} className="flex items-center gap-2 text-[#9c4949] hover:text-primary transition-colors text-sm font-medium">
            <span className="material-symbols-outlined text-lg">print</span>
            Print
          </button>
          <button onClick={onEmail} className="flex items-center gap-2 text-[#9c4949] hover:text-primary transition-colors text-sm font-medium">
            <span className="material-symbols-outlined text-lg">share</span>
            Email
          </button>
        </div>
        <div className="flex items-center gap-2">
          <span className={`size-2 rounded-full ${ticket.status === 'active' ? 'bg-green-500' : 'bg-gray-400'}`}></span>
          <span className={`text-sm font-bold uppercase ${ticket.status === 'active' ? 'text-green-600' : 'text-gray-600'}`}>
            {ticket.status === 'active' ? 'Valid' : ticket.status}
          </span>
        </div>
      </div>
    </div>
  );
}
