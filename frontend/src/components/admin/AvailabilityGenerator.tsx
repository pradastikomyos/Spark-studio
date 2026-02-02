import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { toLocalDateString } from '../../utils/timezone';

interface AvailabilityGeneratorProps {
    onSuccess?: () => void;
}

export default function AvailabilityGenerator({ onSuccess }: AvailabilityGeneratorProps) {
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [generating, setGenerating] = useState(false);
    const [notification, setNotification] = useState<{
        type: 'success' | 'error';
        message: string;
    } | null>(null);

    const setQuickRange = (days: number) => {
        const today = new Date();
        const end = new Date();
        end.setDate(today.getDate() + days - 1);

        setStartDate(toLocalDateString(today));
        setEndDate(toLocalDateString(end));
    };

    const generateAvailability = async () => {
        if (!startDate || !endDate) {
            setNotification({ type: 'error', message: 'Please select start and end dates' });
            return;
        }

        if (new Date(startDate) > new Date(endDate)) {
            setNotification({ type: 'error', message: 'Start date must be before end date' });
            return;
        }

        setGenerating(true);
        setNotification(null);

        try {
            // Calculate number of days
            const start = new Date(startDate);
            const end = new Date(endDate);
            const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
            const totalSlots = daysDiff * 4; // 4 sessions per day

            // Generate availability using SQL
            const { error } = await supabase.rpc('generate_ticket_availability', {
                p_start_date: startDate,
                p_end_date: endDate,
                p_ticket_id: 1
            });

            if (error) {
                // If the function doesn't exist, fall back to direct insert
                const { error: insertError } = await supabase.from('ticket_availabilities').upsert(
                    Array.from({ length: daysDiff }, (_, i) => {
                        const date = new Date(start);
                        date.setDate(start.getDate() + i);
                        const dateStr = toLocalDateString(date);

                        return ['09:00:00', '12:00:00', '15:00:00', '18:00:00'].map(time => ({
                            ticket_id: 1,
                            date: dateStr,
                            time_slot: time,
                            total_capacity: 100,
                            reserved_capacity: 0,
                            sold_capacity: 0,
                            version: 0,
                            created_at: new Date().toISOString(),
                            updated_at: new Date().toISOString()
                        }));
                    }).flat(),
                    {
                        onConflict: 'ticket_id,date,time_slot',
                        ignoreDuplicates: true
                    }
                );

                if (insertError) throw insertError;
            }

            const { error: ticketUpdateError } = await supabase
                .from('tickets')
                .update({
                    available_from: `${startDate} 00:00:00`,
                    available_until: `${endDate} 00:00:00`,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', 1);

            if (ticketUpdateError) throw ticketUpdateError;

            setNotification({
                type: 'success',
                message: `Successfully generated ${totalSlots} availability slots for ${daysDiff} days`
            });

            // Clear form
            setStartDate('');
            setEndDate('');

            // Call success callback
            if (onSuccess) onSuccess();

            // Auto-hide notification after 5 seconds
            setTimeout(() => setNotification(null), 5000);
        } catch (error) {
            console.error('Error generating availability:', error);
            setNotification({
                type: 'error',
                message: 'Failed to generate availability. Please try again.'
            });
        } finally {
            setGenerating(false);
        }
    };

    return (
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
                <span className="material-symbols-outlined text-primary text-2xl">event_available</span>
                <div>
                    <h3 className="text-lg font-bold text-neutral-900">Generate Availability</h3>
                    <p className="text-sm text-gray-500">Create ticket slots for daily sessions (09:00, 12:00, 15:00, 18:00)</p>
                </div>
            </div>

            {notification && (
                <div
                    className={`rounded-lg border px-4 py-3 text-sm font-medium mb-4 ${notification.type === 'success'
                            ? 'border-green-200 bg-green-50 text-green-800'
                            : 'border-red-200 bg-red-50 text-red-800'
                        }`}
                >
                    {notification.message}
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Start Date
                    </label>
                    <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="block w-full rounded-lg border-gray-200 bg-white py-2.5 px-3 text-sm text-gray-900 focus:border-primary focus:ring-primary"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        End Date
                    </label>
                    <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="block w-full rounded-lg border-gray-200 bg-white py-2.5 px-3 text-sm text-gray-900 focus:border-primary focus:ring-primary"
                    />
                </div>
            </div>

            <div className="flex flex-wrap gap-2 mb-4">
                <button
                    onClick={() => setQuickRange(1)}
                    className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                >
                    Today
                </button>
                <button
                    onClick={() => setQuickRange(7)}
                    className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                >
                    Next 7 Days
                </button>
                <button
                    onClick={() => setQuickRange(30)}
                    className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                >
                    Next 30 Days
                </button>
                <button
                    onClick={() => setQuickRange(60)}
                    className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                >
                    Next 60 Days
                </button>
            </div>

            <button
                onClick={generateAvailability}
                disabled={generating || !startDate || !endDate}
                className="w-full bg-primary hover:bg-primary-dark text-white py-3 rounded-lg font-bold text-sm shadow-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
                {generating ? (
                    <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>Generating...</span>
                    </>
                ) : (
                    <>
                        <span className="material-symbols-outlined text-lg">add_circle</span>
                        <span>Generate Availability</span>
                    </>
                )}
            </button>

            <p className="text-xs text-gray-500 mt-3 text-center">
                Each day will have 4 sessions with 100 tickets each (Total: 400 tickets/day)
            </p>
        </div>
    );
}
