import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import AdminLayout from '../../components/AdminLayout';
import { ADMIN_MENU_ITEMS, ADMIN_MENU_SECTIONS } from '../../constants/adminMenu';
import { safeCountQuery } from '../../utils/queryHelpers';

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
    const { signOut, isAdmin } = useAuth();
    const [stages, setStages] = useState<StageWithStats[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [error, setError] = useState<string | null>(null);
    const isFetchingRef = useRef(false);

    const fetchStagesWithStats = useCallback(async (force = false) => {
        if (isFetchingRef.current && !force) return;
        
        // Set fetching flag
        isFetchingRef.current = true;
        
        try {
            setLoading(true);
            setError(null);

            // Fetch stages with timeout
            const { data: stagesData, error: stagesError } = await supabase
                .from('stages')
                .select('*')
                .order('id', { ascending: true })
                .abortSignal(AbortSignal.timeout(10000));

            if (stagesError) throw stagesError;

            // Fetch scan counts for each stage with proper error handling
            const stagesWithStats: StageWithStats[] = await Promise.all(
                (stagesData || []).map(async (stage) => {
                    try {
                        // Total scans - with timeout
                        const totalScans = await safeCountQuery(
                            async () => {
                                const result = await supabase
                                    .from('stage_scans')
                                    .select('*', { count: 'exact', head: true })
                                    .eq('stage_id', stage.id);
                                return result;
                            },
                            8000 // 8 second timeout
                        );

                        // Today's scans - use CURRENT_DATE for timezone-aware comparison
                        const todayScans = await safeCountQuery(
                            async () => {
                                const result = await supabase
                                    .from('stage_scans')
                                    .select('*', { count: 'exact', head: true })
                                    .eq('stage_id', stage.id)
                                    .gte('scanned_at', new Date().toISOString().split('T')[0]);
                                return result;
                            },
                            8000
                        );

                        return {
                            ...stage,
                            total_scans: totalScans,
                            today_scans: todayScans,
                        };
                    } catch (stageError) {
                        // If individual stage query fails, return default values
                        console.error(`Error fetching stats for stage ${stage.id}:`, stageError);
                        return {
                            ...stage,
                            total_scans: 0,
                            today_scans: 0,
                        };
                    }
                })
            );

            setStages(stagesWithStats);
        } catch (error) {
            console.error('Error fetching stages:', error);
            const errorMessage = error instanceof Error ? error.message : 'Failed to load stages';
            setError(errorMessage);
            
            // Set empty data on error to prevent stuck state
            setStages([]);
        } finally {
            // Always reset loading and fetching states
            setLoading(false);
            isFetchingRef.current = false;
        }
    }, []);

    useEffect(() => {
        if (isAdmin) {
            fetchStagesWithStats();
        }
    }, [isAdmin, fetchStagesWithStats]);

    useEffect(() => {
        if (!isAdmin) return;

        const channel = supabase
            .channel('stage_scans_changes_manager')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'stage_scans' },
                () => {
                    setTimeout(() => {
                        if (!isFetchingRef.current) {
                            fetchStagesWithStats(true);
                        }
                    }, 500);
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [isAdmin, fetchStagesWithStats]);

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

    // Show error if not admin
    if (!isAdmin && !loading) {
        return (
            <AdminLayout
                menuItems={ADMIN_MENU_ITEMS}
                menuSections={ADMIN_MENU_SECTIONS}
                defaultActiveMenuId="stages"
                title="Stage Manager"
                onLogout={signOut}
            >
                <div className="flex flex-col items-center justify-center min-h-[400px]">
                    <div className="text-center">
                        <span className="material-symbols-outlined text-6xl text-red-500 mb-4">block</span>
                        <h2 className="text-2xl font-bold text-white mb-2">Access Denied</h2>
                        <p className="text-gray-400">You need admin privileges to view this page.</p>
                    </div>
                </div>
            </AdminLayout>
        );
    }

    return (
        <AdminLayout
            menuItems={ADMIN_MENU_ITEMS}
            menuSections={ADMIN_MENU_SECTIONS}
            defaultActiveMenuId="stages"
            title="Stage Manager"
            onLogout={signOut}
        >
            {/* Error Message */}
            {error && (
                <div className="mb-6 rounded-xl border border-red-500/20 bg-red-500/10 p-4 flex items-center gap-3">
                    <span className="material-symbols-outlined text-red-500">error</span>
                    <div>
                        <p className="text-sm font-medium text-red-500">Error loading stages</p>
                        <p className="text-xs text-red-400 mt-1">{error}</p>
                    </div>
                </div>
            )}

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
