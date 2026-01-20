import { getTicketStatusBadge } from '../../utils/statusHelpers.tsx';

type PurchasedTicket = {
    id: string;
    ticket_id: string;
    user_id: string;
    purchase_date: string;
    entry_status: 'entered' | 'not_yet' | 'invalid';
    qr_code: string;
    status: 'active' | 'used' | 'cancelled' | 'expired';
    valid_date: string;
    used_at?: string | null;
    users: {
        name: string;
        email: string;
    };
    tickets: {
        name: string;
    };
};

interface PurchasedTicketsTableProps {
    tickets: PurchasedTicket[];
    loading: boolean;
    stats: {
        totalValid: number;
        entered: number;
    };
}

export default function PurchasedTicketsTable({ tickets, loading, stats }: PurchasedTicketsTableProps) {
    const getStatusLabel = (status: string) => {
        const labels = {
            entered: 'Already Entered',
            not_yet: 'Not Yet Entered',
            invalid: 'Invalid',
        };
        return labels[status as keyof typeof labels] || status;
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        });
    };

    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between px-1">
                <h3 className="text-lg font-bold text-neutral-900 dark:text-white">Purchased Tickets</h3>
                <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        Total Valid Tickets: <span className="text-neutral-900 dark:text-white font-bold">{stats.totalValid}</span>
                    </span>
                    <span className="h-4 w-px bg-gray-300 dark:bg-gray-700 mx-2"></span>
                    <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        Entered: <span className="text-primary font-bold">{stats.entered}</span>
                    </span>
                </div>
            </div>

            <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#1a0f0f] shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-white/5">
                                <th className="whitespace-nowrap px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Ticket ID</th>
                                <th className="whitespace-nowrap px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Customer Name</th>
                                <th className="whitespace-nowrap px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Event</th>
                                <th className="whitespace-nowrap px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Purchase Date</th>
                                <th className="whitespace-nowrap px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 text-center">Entry Status</th>
                                <th className="whitespace-nowrap px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-white/5 font-sans">
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                                        Loading tickets...
                                    </td>
                                </tr>
                            ) : tickets.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                                        No tickets found
                                    </td>
                                </tr>
                            ) : (
                                tickets.map((ticket) => (
                                    <tr key={ticket.id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors group">
                                        <td className="whitespace-nowrap px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <span className="material-symbols-outlined text-gray-400 text-lg">confirmation_number</span>
                                                <span className="text-sm font-medium text-primary">{ticket.qr_code || ticket.id.slice(0, 8)}</span>
                                            </div>
                                        </td>
                                        <td className="whitespace-nowrap px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                                                    {ticket.users.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                                                </div>
                                                <div>
                                                    <span className="block text-sm font-semibold text-neutral-900 dark:text-white">{ticket.users.name}</span>
                                                    <span className="block text-xs text-gray-500">{ticket.users.email}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="whitespace-nowrap px-6 py-4 text-sm text-neutral-900 dark:text-white">{ticket.tickets.name}</td>
                                        <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500 dark:text-gray-400">{formatDate(ticket.purchase_date)}</td>
                                        <td className="whitespace-nowrap px-6 py-4 text-center">{getTicketStatusBadge(ticket.entry_status, getStatusLabel(ticket.entry_status))}</td>
                                        <td className="whitespace-nowrap px-6 py-4 text-right">
                                            <button className="text-gray-400 hover:text-primary transition-colors">
                                                <span className="material-symbols-outlined text-[20px]">more_vert</span>
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                <div className="flex items-center justify-between border-t border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-white/5 px-6 py-4">
                    <span className="text-sm text-gray-500 dark:text-gray-400 font-sans">Showing {tickets.length} tickets</span>
                    <div className="flex gap-2">
                        <button className="flex h-8 w-8 items-center justify-center rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-transparent text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 disabled:opacity-50">
                            <span className="material-symbols-outlined text-sm">chevron_left</span>
                        </button>
                        <button className="flex h-8 w-8 items-center justify-center rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-transparent text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5">
                            <span className="material-symbols-outlined text-sm">chevron_right</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
