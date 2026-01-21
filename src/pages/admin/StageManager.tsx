import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import AdminLayout from '../../components/AdminLayout';
import { ADMIN_MENU_ITEMS, ADMIN_MENU_SECTIONS } from '../../constants/adminMenu';
import { toLocalDateString } from '../../utils/formatters';

type Stage = {
    id: number;
    code: string;
    name: string;
    description: string | null;
    zone: string | null;
    max_occupancy: number;
    status: 'active' | 'maintenance' | 'inactive';
    qr_code_url: string | null;
    created_at: string;
    updated_at: string;
};

type StageWithStats = Stage & {
    total_scans: number;
    today_scans: number;
};

const StageManager = () => {
    const { signOut } = useAuth();
    const [stages, setStages] = useState<StageWithStats[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    const fetchStagesWithStats = useCallback(async () => {
        try {
            setLoading(true);

            // Fetch stages
            const { data: stagesData, error: stagesError } = await supabase
                .from('stages')
                .select('*')
                .order('id', { ascending: true });

            if (stagesError) throw stagesError;

            // Fetch scan counts for each stage
            const stagesWithStats: StageWithStats[] = await Promise.all(
                (stagesData || []).map(async (stage) => {
                    // Total scans
                    const { count: totalScans } = await supabase
                        .from('stage_scans')
                        .select('*', { count: 'exact', head: true })
                        .eq('stage_id', stage.id);

                    // Today's scans - use local date to avoid timezone issues
                    const todayStart = toLocalDateString(new Date()) + 'T00:00:00';
                    const { count: todayScans } = await supabase
                        .from('stage_scans')
                        .select('*', { count: 'exact', head: true })
                        .eq('stage_id', stage.id)
                        .gte('scanned_at', todayStart);

                    return {
                        ...stage,
                        total_scans: totalScans || 0,
                        today_scans: todayScans || 0,
                    };
                })
            );

            setStages(stagesWithStats);
        } catch (error) {
            console.error('Error fetching stages:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchStagesWithStats();
    }, [fetchStagesWithStats]);

    useEffect(() => {
        const channel = supabase
            .channel('stage_scans_changes')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'stage_scans' },
                () => {
                    fetchStagesWithStats();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [fetchStagesWithStats]);

    const generateQRCodeUrl = (stageCode: string) => {
        // Generate QR code using a public API (the QR will contain the stage scan URL)
        const scanUrl = `${window.location.origin}/scan/${stageCode}`;
        return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(scanUrl)}`;
    };

    const handleDownloadQR = async (stage: StageWithStats) => {
        const qrUrl = generateQRCodeUrl(stage.code);

        try {
            const response = await fetch(qrUrl);
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `QR-${stage.code}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Error downloading QR:', error);
            // Fallback: open in new tab
            window.open(qrUrl, '_blank');
        }
    };

    const filteredStages = stages.filter(
        (stage) =>
            stage.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            stage.code.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const activeStagesCount = stages.filter((s) => s.status === 'active').length;

    return (
        <AdminLayout
            menuItems={ADMIN_MENU_ITEMS}
            menuSections={ADMIN_MENU_SECTIONS}
            defaultActiveMenuId="stages"
            title="Stage Manager"
            onLogout={signOut}
        >
            {/* Header Actions */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <div className="flex items-center gap-3">
                    <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-bold border border-primary/20">
                        {activeStagesCount} Active Stages
                    </span>
                </div>
                <div className="flex items-center gap-4">
                    <div className="relative w-64">
                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
                            search
                        </span>
                        <input
                            className="w-full bg-surface-dark border border-white/10 rounded-lg py-1.5 pl-9 pr-4 text-sm text-gray-300 focus:ring-1 focus:ring-primary focus:border-primary placeholder-gray-600"
                            placeholder="Search stages..."
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <button className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white hover:bg-red-600 transition-colors shadow-lg shadow-red-900/20">
                        <span className="material-symbols-outlined text-lg">add</span>
                        New Stage
                    </button>
                </div>
            </div>

            {/* Stage Grid */}
            {loading ? (
                <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
                    {filteredStages.map((stage) => (
                        <div
                            key={stage.id}
                            className="group relative flex flex-col rounded-xl border border-white/5 bg-surface-dark p-4 transition-all hover:border-primary/30 hover:bg-surface-darker"
                        >
                            {/* Header */}
                            <div className="mb-4 flex items-center justify-between">
                                <h3 className="font-bold text-white truncate pr-2">
                                    Stage {stage.id}: {stage.name}
                                </h3>
                                <span
                                    className={`flex h-6 w-6 items-center justify-center rounded text-xs font-bold ${stage.status === 'active'
                                            ? 'bg-green-500/20 text-green-400'
                                            : stage.status === 'maintenance'
                                                ? 'bg-yellow-500/20 text-yellow-400'
                                                : 'bg-gray-500/20 text-gray-400'
                                        }`}
                                >
                                    {String(stage.id).padStart(2, '0')}
                                </span>
                            </div>

                            {/* QR Code */}
                            <div className="mb-4 flex-1 flex flex-col items-center justify-center rounded-lg bg-white p-4">
                                <img
                                    alt={`QR Code for ${stage.name}`}
                                    className="h-32 w-32 object-contain"
                                    src={generateQRCodeUrl(stage.code)}
                                />
                                <p className="mt-2 text-[10px] font-mono text-gray-500">{stage.code}</p>
                            </div>

                            {/* Stats */}
                            <div className="mb-4 grid grid-cols-2 gap-2">
                                <div className="rounded bg-surface-darker border border-white/5 p-2 text-center">
                                    <p className="text-[10px] uppercase tracking-wider text-gray-500">Total Scans</p>
                                    <p className="text-lg font-bold text-white">
                                        {stage.total_scans.toLocaleString()}
                                    </p>
                                </div>
                                <div className="rounded bg-surface-darker border border-white/5 p-2 text-center">
                                    <p className="text-[10px] uppercase tracking-wider text-gray-500">Today</p>
                                    <p
                                        className={`text-lg font-bold ${stage.today_scans > 0 ? 'text-primary' : 'text-green-500'
                                            }`}
                                    >
                                        {stage.today_scans}
                                    </p>
                                </div>
                            </div>

                            {/* Download Button */}
                            <button
                                onClick={() => handleDownloadQR(stage)}
                                className="flex w-full items-center justify-center gap-2 rounded bg-primary py-2 text-sm font-bold text-white shadow-lg shadow-red-900/10 transition-colors hover:bg-red-600"
                            >
                                <span className="material-symbols-outlined text-lg">download</span>
                                Unduh
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* Empty State */}
            {!loading && filteredStages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-64 text-center">
                    <span className="material-symbols-outlined text-6xl text-gray-600 mb-4">search_off</span>
                    <p className="text-gray-400">No stages found matching "{searchQuery}"</p>
                </div>
            )}
        </AdminLayout>
    );
};

export default StageManager;
