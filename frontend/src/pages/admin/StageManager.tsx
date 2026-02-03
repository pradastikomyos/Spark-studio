import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import * as QRCode from 'qrcode';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { queryKeys } from '../../lib/queryKeys';
import AdminLayout from '../../components/AdminLayout';
import { ADMIN_MENU_ITEMS, ADMIN_MENU_SECTIONS } from '../../constants/adminMenu';
import { toLocalDateString } from '../../utils/formatters';
import { useStages, type StageWithStats } from '../../hooks/useStages';

const TAB_RETURN_EVENT = 'tab-returned-from-idle';

const StageManager = () => {
    const { signOut, isAdmin } = useAuth();
    const queryClient = useQueryClient();
    const { data: stages = [], error: stagesError, isLoading, refetch } = useStages({ enabled: isAdmin });
    const [searchQuery, setSearchQuery] = useState('');
    const [qrByStageId, setQrByStageId] = useState<Record<number, string>>({});
    const [zoomedStage, setZoomedStage] = useState<StageWithStats | null>(null);
    const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

    const errorMessage = useMemo(() => {
        if (!stagesError) return null;
        if (stagesError instanceof Error) return stagesError.message;
        return String(stagesError);
    }, [stagesError]);

    const setupRealtimeChannel = useCallback(() => {
        const todayStart = toLocalDateString(new Date()) + 'T00:00:00';
        const todayStartTime = new Date(todayStart).getTime();

        if (channelRef.current) {
            supabase.removeChannel(channelRef.current);
            channelRef.current = null;
        }

        channelRef.current = supabase
            .channel('stage_scans_changes_manager')
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'stage_scans' },
                (payload) => {
                    const record = (payload as { new?: { stage_id?: number; scanned_at?: string | null } }).new;
                    const stageId = record?.stage_id;
                    if (!stageId) return;

                    const scannedAt = record?.scanned_at ? new Date(record.scanned_at).getTime() : null;

                    queryClient.setQueryData<StageWithStats[]>(queryKeys.stages(), (current) => {
                        const prev = current || [];
                        return prev.map((stage) => {
                            if (stage.id !== stageId) return stage;
                            const nextToday =
                                scannedAt != null && scannedAt >= todayStartTime
                                    ? stage.today_scans + 1
                                    : stage.today_scans;
                            return { ...stage, total_scans: stage.total_scans + 1, today_scans: nextToday };
                        });
                    });
                }
            )
            .subscribe();
    }, [queryClient]);

    useEffect(() => {
        if (!isAdmin) return;
        setupRealtimeChannel();

        return () => {
            if (channelRef.current) {
                supabase.removeChannel(channelRef.current);
                channelRef.current = null;
            }
        };
    }, [isAdmin, setupRealtimeChannel]);

    useEffect(() => {
        if (!isAdmin) return;
        if (typeof window === 'undefined') return;

        const handleTabReturn = () => {
            refetch();
            setupRealtimeChannel();
        };

        window.addEventListener(TAB_RETURN_EVENT, handleTabReturn);
        return () => {
            window.removeEventListener(TAB_RETURN_EVENT, handleTabReturn);
        };
    }, [isAdmin, refetch, setupRealtimeChannel]);

    useEffect(() => {
        let cancelled = false;

        const generateMissing = async () => {
            const missing = stages.filter((s) => !qrByStageId[s.id]);
            if (missing.length === 0) return;

            const entries = await Promise.all(
                missing.map(async (stage) => {
                    const baseUrl = import.meta.env.VITE_APP_URL || window.location.origin;
                    const scanUrl = `${baseUrl}/scan/${stage.code}`;
                    const dataUrl = await QRCode.toDataURL(scanUrl, { width: 300, margin: 1 });
                    return [stage.id, dataUrl] as const;
                })
            );

            if (cancelled) return;

            setQrByStageId((prev) => {
                const next: Record<number, string> = { ...prev };
                for (const [id, dataUrl] of entries) {
                    next[id] = dataUrl;
                }
                return next;
            });
        };

        generateMissing();

        return () => {
            cancelled = true;
        };
    }, [stages, qrByStageId]);

    const handleDownloadQR = async (stage: StageWithStats) => {
        const existing = qrByStageId[stage.id];
        const baseUrl = import.meta.env.VITE_APP_URL || window.location.origin;
        const dataUrl = existing ?? (await QRCode.toDataURL(`${baseUrl}/scan/${stage.code}`, { width: 300, margin: 1 }));

        if (!existing) {
            setQrByStageId((prev) => ({ ...prev, [stage.id]: dataUrl }));
        }

        try {
            const response = await fetch(dataUrl);
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
        }
    };

    const filteredStages = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();
        if (!query) return stages;
        return stages.filter(
            (stage) =>
                stage.name.toLowerCase().includes(query) ||
                stage.code.toLowerCase().includes(query)
        );
    }, [stages, searchQuery]);

    const activeStagesCount = useMemo(() => stages.filter((s) => s.status === 'active').length, [stages]);

    // Show error if not admin
    if (!isAdmin && !isLoading) {
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
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
                        <p className="text-gray-600">You need admin privileges to view this page.</p>
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
            {errorMessage && (
                <div className="mb-6 rounded-xl border border-red-500/20 bg-red-500/10 p-4 flex items-center gap-3">
                    <span className="material-symbols-outlined text-red-500">error</span>
                    <div>
                        <p className="text-sm font-medium text-red-500">Error loading stages</p>
                        <p className="text-xs text-red-400 mt-1">{errorMessage}</p>
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
                            className="w-full bg-white border border-gray-200 rounded-lg py-1.5 pl-9 pr-4 text-sm text-gray-700 focus:ring-1 focus:ring-primary focus:border-primary placeholder-gray-400"
                            placeholder="Search stages..."
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <button className="flex items-center gap-2 rounded-lg bg-[#ff4b86] px-4 py-2 text-sm font-bold text-white hover:bg-[#ff6a9a] transition-colors shadow-md">
                        <span className="material-symbols-outlined text-lg">add</span>
                        New Stage
                    </button>
                </div>
            </div>

            {/* Stage Grid */}
            {isLoading ? (
                <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
                    {filteredStages.map((stage) => (
                        <div
                            key={stage.id}
                            className="group relative flex flex-col rounded-xl border border-gray-200 bg-white p-4 transition-all hover:border-primary/30 hover:bg-gray-100"
                        >
                            {/* Header */}
                            <div className="mb-4 flex items-center justify-between">
                                <h3 className="font-bold text-gray-900 truncate pr-2">
                                    Stage {stage.id}: {stage.name}
                                </h3>
                                <span
                                    className={`flex h-6 w-6 items-center justify-center rounded text-xs font-bold ${stage.status === 'active'
                                        ? 'bg-green-50 text-green-400'
                                        : stage.status === 'maintenance'
                                            ? 'bg-yellow-500/20 text-yellow-400'
                                            : 'bg-gray-500/20 text-gray-600'
                                        }`}
                                >
                                    {String(stage.id).padStart(2, '0')}
                                </span>
                            </div>

                            {/* QR Code */}
                            <div 
                                className="mb-4 flex-1 flex flex-col items-center justify-center rounded-lg bg-white p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                                onClick={() => setZoomedStage(stage)}
                            >
                                {qrByStageId[stage.id] ? (
                                    <img
                                        alt={`QR Code for ${stage.name}`}
                                        className="h-32 w-32 object-contain"
                                        src={qrByStageId[stage.id]}
                                    />
                                ) : (
                                    <div className="flex h-32 w-32 items-center justify-center">
                                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                                    </div>
                                )}
                                <p className="mt-2 text-[10px] font-mono text-gray-500">{stage.code}</p>
                            </div>

                            {/* Stats */}
                            <div className="mb-4 grid grid-cols-2 gap-2">
                                <div className="rounded bg-gray-50 border border-gray-200 p-2 text-center">
                                    <p className="text-[10px] uppercase tracking-wider text-gray-500">Total Scans</p>
                                    <p className="text-lg font-bold text-gray-900">
                                        {stage.total_scans.toLocaleString()}
                                    </p>
                                </div>
                                <div className="rounded bg-gray-50 border border-gray-200 p-2 text-center">
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
                                className="flex w-full items-center justify-center gap-2 rounded bg-[#ff4b86] py-2 text-sm font-bold text-white hover:bg-[#ff6a9a] transition-colors shadow-md"
                            >
                                <span className="material-symbols-outlined text-lg">download</span>
                                Unduh
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* Empty State */}
            {!isLoading && filteredStages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-64 text-center">
                    <span className="material-symbols-outlined text-6xl text-gray-600 mb-4">search_off</span>
                    <p className="text-gray-600">No stages found matching "{searchQuery}"</p>
                </div>
            )}

            {/* QR Code Zoom Modal */}
            {zoomedStage && (
                <div 
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200"
                    onClick={() => setZoomedStage(null)}
                >
                    {/* Close Button - Top Right */}
                    <button
                        onClick={() => setZoomedStage(null)}
                        className="absolute top-4 right-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors backdrop-blur-sm"
                        aria-label="Close"
                    >
                        <span className="material-symbols-outlined text-2xl">close</span>
                    </button>

                    {/* Modal Content */}
                    <div 
                        className="relative max-w-lg w-full bg-white rounded-2xl shadow-2xl p-6 md:p-8 animate-in zoom-in-95 duration-200"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="mb-6 text-center">
                            <h3 className="text-2xl font-bold text-gray-900 mb-1">
                                {zoomedStage.name}
                            </h3>
                            <p className="text-sm text-gray-500 font-mono">{zoomedStage.code}</p>
                        </div>

                        {/* QR Code - Large */}
                        <div className="flex justify-center mb-6">
                            {qrByStageId[zoomedStage.id] ? (
                                <img
                                    alt={`QR Code for ${zoomedStage.name}`}
                                    className="w-full max-w-sm h-auto object-contain"
                                    src={qrByStageId[zoomedStage.id]}
                                />
                            ) : (
                                <div className="flex h-64 w-64 items-center justify-center">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                                </div>
                            )}
                        </div>

                        {/* Stats */}
                        <div className="grid grid-cols-2 gap-4 mb-6">
                            <div className="rounded-lg bg-gray-50 border border-gray-200 p-4 text-center">
                                <p className="text-xs uppercase tracking-wider text-gray-500 mb-1">Total Scans</p>
                                <p className="text-2xl font-bold text-gray-900">
                                    {zoomedStage.total_scans.toLocaleString()}
                                </p>
                            </div>
                            <div className="rounded-lg bg-gray-50 border border-gray-200 p-4 text-center">
                                <p className="text-xs uppercase tracking-wider text-gray-500 mb-1">Today</p>
                                <p className={`text-2xl font-bold ${zoomedStage.today_scans > 0 ? 'text-primary' : 'text-green-500'}`}>
                                    {zoomedStage.today_scans}
                                </p>
                            </div>
                        </div>

                        {/* Download Button */}
                        <button
                            onClick={() => handleDownloadQR(zoomedStage)}
                            className="w-full flex items-center justify-center gap-2 rounded-lg bg-[#ff4b86] px-6 py-3 text-base font-bold text-white hover:bg-[#ff6a9a] transition-colors shadow-md"
                        >
                            <span className="material-symbols-outlined text-xl">download</span>
                            Download QR Code
                        </button>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
};

export default StageManager;
