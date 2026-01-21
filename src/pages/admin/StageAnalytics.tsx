import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import AdminLayout from '../../components/AdminLayout';
import { ADMIN_MENU_ITEMS, ADMIN_MENU_SECTIONS } from '../../constants/adminMenu';
import { safeCountQuery } from '../../utils/queryHelpers';

type StageAnalyticsData = {
    id: number;
    code: string;
    name: string;
    zone: string | null;
    total_scans: number;
    weekly_scans: number;
    weekly_change: number;
};

const StageAnalytics = () => {
    const { signOut, isAdmin, adminLoading, loading: authLoading } = useAuth();
    const [stages, setStages] = useState<StageAnalyticsData[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [timeFilter, setTimeFilter] = useState<'weekly' | 'monthly' | 'all'>('weekly');
    const isFetchingRef = useRef(false);
    const isMountedRef = useRef(true);

    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
        };
    }, []);

    const setLoadingSafe = (value: boolean) => {
        if (!isMountedRef.current) return;
        setLoading(value);
    };

    const setErrorSafe = (value: string | null) => {
        if (!isMountedRef.current) return;
        setError(value);
    };

    const setStagesSafe = (value: StageAnalyticsData[]) => {
        if (!isMountedRef.current) return;
        setStages(value);
    };

    const fetchAnalyticsData = useCallback(async (force = false) => {
        if (isFetchingRef.current && !force) return;
        
        // Set fetching flag
        isFetchingRef.current = true;
        
        try {
            setLoadingSafe(true);
            setErrorSafe(null);

            // Fetch stages with timeout
            const { data: stagesData, error: stagesError } = await supabase
                .from('stages')
                .select('id, code, name, zone')
                .order('id', { ascending: true })
                .abortSignal(AbortSignal.timeout(10000));

            if (stagesError) throw stagesError;

            // Calculate date ranges
            const now = new Date();
            const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
            const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

            // Fetch scan counts for each stage with proper error handling
            const stagesWithAnalytics: StageAnalyticsData[] = await Promise.all(
                (stagesData || []).map(async (stage) => {
                    try {
                        // Total scans (all time) - with timeout
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

                        // This period scans
                        let periodStart: Date;
                        switch (timeFilter) {
                            case 'weekly':
                                periodStart = weekAgo;
                                break;
                            case 'monthly':
                                periodStart = monthAgo;
                                break;
                            default:
                                periodStart = new Date(0); // All time
                        }

                        const periodScans = await safeCountQuery(
                            async () => {
                                const result = await supabase
                                    .from('stage_scans')
                                    .select('*', { count: 'exact', head: true })
                                    .eq('stage_id', stage.id)
                                    .gte('scanned_at', periodStart.toISOString());
                                return result;
                            },
                            8000
                        );

                        // Previous period scans (for comparison)
                        const prevPeriodScans = await safeCountQuery(
                            async () => {
                                const result = await supabase
                                    .from('stage_scans')
                                    .select('*', { count: 'exact', head: true })
                                    .eq('stage_id', stage.id)
                                    .gte('scanned_at', twoWeeksAgo.toISOString())
                                    .lt('scanned_at', weekAgo.toISOString());
                                return result;
                            },
                            8000
                        );

                        // Calculate change percentage
                        const prev = prevPeriodScans || 0;
                        const current = periodScans || 0;
                        const change = prev > 0 ? Math.round(((current - prev) / prev) * 100) : current > 0 ? 100 : 0;

                        return {
                            ...stage,
                            total_scans: totalScans,
                            weekly_scans: periodScans,
                            weekly_change: change,
                        };
                    } catch (stageError) {
                        // If individual stage query fails, return default values
                        console.error(`Error fetching data for stage ${stage.id}:`, stageError);
                        return {
                            ...stage,
                            total_scans: 0,
                            weekly_scans: 0,
                            weekly_change: 0,
                        };
                    }
                })
            );

            // Sort by weekly scans (descending)
            stagesWithAnalytics.sort((a, b) => b.weekly_scans - a.weekly_scans);

            setStagesSafe(stagesWithAnalytics);
        } catch (error) {
            console.error('Error fetching analytics:', error);
            const errorMessage = error instanceof Error ? error.message : 'Failed to load analytics data';
            setErrorSafe(errorMessage);
            
            // Set empty data on error to prevent stuck state
            setStagesSafe([]);
        } finally {
            // Always reset loading and fetching states
            setLoadingSafe(false);
            isFetchingRef.current = false;
        }
    }, [timeFilter]);

    useEffect(() => {
        if (authLoading || adminLoading) return;
        if (isAdmin) {
            fetchAnalyticsData();
        } else {
            setLoadingSafe(false);
        }
    }, [isAdmin, adminLoading, authLoading, fetchAnalyticsData]);

    // Realtime subscription - separate from fetchAnalyticsData dependency
    useEffect(() => {
        if (!isAdmin || adminLoading || authLoading) return;

        const channel = supabase
            .channel('stage_scans_changes')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'stage_scans' },
                () => {
                    // Use a small delay to debounce rapid changes
                    setTimeout(() => {
                        if (!isFetchingRef.current) {
                            fetchAnalyticsData(true);
                        }
                    }, 500);
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [isAdmin, adminLoading, authLoading, fetchAnalyticsData]);

    const totalFootTraffic = stages.reduce((sum, s) => sum + s.weekly_scans, 0);
    const mostPopular = stages[0];
    const leastVisited = stages[stages.length - 1];

    const getTrafficLevel = (scans: number, maxScans: number) => {
        const ratio = maxScans > 0 ? scans / maxScans : 0;
        if (ratio >= 0.7) return { label: 'High', color: 'text-primary' };
        if (ratio >= 0.4) return { label: 'Med', color: 'text-orange-400' };
        if (ratio >= 0.1) return { label: 'Low', color: 'text-gray-400' };
        return { label: 'Quiet', color: 'text-gray-600' };
    };

    const maxScans = mostPopular?.weekly_scans || 1;

    // Show loading while auth is resolving
    if (authLoading || adminLoading) {
        return (
            <AdminLayout
                menuItems={ADMIN_MENU_ITEMS}
                menuSections={ADMIN_MENU_SECTIONS}
                defaultActiveMenuId="stage-analytics"
                title="Stage Analytics"
                onLogout={signOut}
            >
                <div className="mx-auto flex w-full max-w-7xl flex-col items-center justify-center min-h-[400px]">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    <p className="text-gray-400 mt-4">Checking permissions...</p>
                </div>
            </AdminLayout>
        );
    }

    // Show error if not admin
    if (!isAdmin) {
        return (
            <AdminLayout
                menuItems={ADMIN_MENU_ITEMS}
                menuSections={ADMIN_MENU_SECTIONS}
                defaultActiveMenuId="stage-analytics"
                title="Stage Analytics"
                onLogout={signOut}
            >
                <div className="mx-auto flex w-full max-w-7xl flex-col items-center justify-center min-h-[400px]">
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
            defaultActiveMenuId="stage-analytics"
            title="Stage Analytics"
            onLogout={signOut}
        >
            <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
                {/* Error Message */}
                {error && (
                    <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 flex items-center gap-3">
                        <span className="material-symbols-outlined text-red-500">error</span>
                        <div>
                            <p className="text-sm font-medium text-red-500">Error loading analytics</p>
                            <p className="text-xs text-red-400 mt-1">{error}</p>
                        </div>
                    </div>
                )}
                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="rounded-xl border border-white/5 bg-surface-dark p-6 flex flex-col justify-between relative overflow-hidden group">
                        <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <span className="material-symbols-outlined text-6xl text-primary">trending_up</span>
                        </div>
                        <p className="text-sm text-gray-400 mb-2">Most Popular Stage</p>
                        <div className="flex items-baseline gap-2">
                            <h3 className="text-2xl font-bold text-white">
                                {loading ? '...' : mostPopular?.name || 'N/A'}
                            </h3>
                            {!loading && mostPopular && mostPopular.weekly_change > 0 && (
                                <span className="text-xs text-green-400 flex items-center bg-green-500/10 px-1.5 py-0.5 rounded border border-green-500/20">
                                    <span className="material-symbols-outlined text-xs mr-1">arrow_upward</span>
                                    {mostPopular.weekly_change}%
                                </span>
                            )}
                        </div>
                        <p className="text-xs text-gray-500 mt-2">
                            {loading ? '...' : `${mostPopular?.weekly_scans.toLocaleString() || 0} scans this week`}
                        </p>
                    </div>

                    <div className="rounded-xl border border-white/5 bg-surface-dark p-6 flex flex-col justify-between relative overflow-hidden group">
                        <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <span className="material-symbols-outlined text-6xl text-gray-500">trending_down</span>
                        </div>
                        <p className="text-sm text-gray-400 mb-2">Least Visited</p>
                        <div className="flex items-baseline gap-2">
                            <h3 className="text-2xl font-bold text-white">
                                {loading ? '...' : leastVisited?.name || 'N/A'}
                            </h3>
                            {!loading && leastVisited && leastVisited.weekly_change < 0 && (
                                <span className="text-xs text-red-400 flex items-center bg-red-500/10 px-1.5 py-0.5 rounded border border-red-500/20">
                                    <span className="material-symbols-outlined text-xs mr-1">arrow_downward</span>
                                    {Math.abs(leastVisited.weekly_change)}%
                                </span>
                            )}
                        </div>
                        <p className="text-xs text-gray-500 mt-2">
                            {loading ? '...' : `${leastVisited?.weekly_scans.toLocaleString() || 0} scans this week`}
                        </p>
                    </div>

                    <div className="rounded-xl border border-white/5 bg-surface-dark p-6 flex flex-col justify-between relative overflow-hidden group">
                        <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <span className="material-symbols-outlined text-6xl text-white">groups</span>
                        </div>
                        <p className="text-sm text-gray-400 mb-2">Total Foot Traffic</p>
                        <div className="flex items-baseline gap-2">
                            <h3 className="text-2xl font-bold text-white">
                                {loading ? '...' : totalFootTraffic.toLocaleString()}
                            </h3>
                            <span className="text-xs text-gray-400 ml-1">Total Scans</span>
                        </div>
                        <p className="text-xs text-gray-500 mt-2">Across all {stages.length} stages</p>
                    </div>
                </div>

                {/* Leaderboard Table */}
                <div className="rounded-xl border border-white/5 bg-surface-dark overflow-hidden">
                    <div className="px-6 py-5 border-b border-white/5 flex items-center justify-between">
                        <h3 className="text-lg font-bold text-white font-display">Stage Popularity Leaderboard</h3>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setTimeFilter('weekly')}
                                className={`px-3 py-1 text-xs font-medium rounded transition-colors ${timeFilter === 'weekly'
                                        ? 'text-white bg-primary shadow-lg shadow-red-900/20'
                                        : 'text-gray-400 hover:text-white hover:bg-white/5'
                                    }`}
                            >
                                Weekly
                            </button>
                            <button
                                onClick={() => setTimeFilter('monthly')}
                                className={`px-3 py-1 text-xs font-medium rounded transition-colors ${timeFilter === 'monthly'
                                        ? 'text-white bg-primary shadow-lg shadow-red-900/20'
                                        : 'text-gray-400 hover:text-white hover:bg-white/5'
                                    }`}
                            >
                                Monthly
                            </button>
                            <button
                                onClick={() => setTimeFilter('all')}
                                className={`px-3 py-1 text-xs font-medium rounded transition-colors ${timeFilter === 'all'
                                        ? 'text-white bg-primary shadow-lg shadow-red-900/20'
                                        : 'text-gray-400 hover:text-white hover:bg-white/5'
                                    }`}
                            >
                                All Time
                            </button>
                        </div>
                    </div>

                    {loading ? (
                        <div className="flex items-center justify-center h-64">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm text-gray-400">
                                <thead className="bg-surface-darker text-xs uppercase text-gray-500">
                                    <tr>
                                        <th className="px-6 py-4 font-semibold w-16 text-center">Rank</th>
                                        <th className="px-6 py-4 font-semibold">Stage Name</th>
                                        <th className="px-6 py-4 font-semibold w-1/3">Traffic Volume</th>
                                        <th className="px-6 py-4 font-semibold text-right">Scans</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {stages.map((stage, index) => {
                                        const traffic = getTrafficLevel(stage.weekly_scans, maxScans);
                                        const progressWidth = maxScans > 0 ? (stage.weekly_scans / maxScans) * 100 : 0;

                                        return (
                                            <tr key={stage.id} className="hover:bg-white/[0.02] transition-colors group">
                                                <td className="px-6 py-4 text-center">
                                                    <div
                                                        className={`inline-flex h-8 w-8 items-center justify-center rounded-full font-bold border ${index === 0
                                                                ? 'bg-primary/20 text-primary border-primary/30'
                                                                : 'bg-surface-darker text-gray-300 border-white/10'
                                                            }`}
                                                    >
                                                        {index + 1}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div>
                                                        <p className="font-bold text-white text-base">{stage.name}</p>
                                                        <p className="text-xs text-gray-500">{stage.zone || 'No zone'}</p>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-full bg-surface-darker rounded-full h-2 overflow-hidden border border-white/5">
                                                            <div
                                                                className="bg-gradient-to-r from-primary to-orange-500 h-2 rounded-full transition-all"
                                                                style={{ width: `${progressWidth}%` }}
                                                            ></div>
                                                        </div>
                                                        <span className={`text-xs font-bold ${traffic.color}`}>{traffic.label}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-right font-mono text-white">
                                                    {stage.weekly_scans.toLocaleString()}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}

                    <div className="px-6 py-4 border-t border-white/5 bg-surface-darker flex items-center justify-between">
                        <p className="text-sm text-gray-500">Showing {stages.length} stages</p>
                        <button
                            onClick={() => fetchAnalyticsData(true)}
                            disabled={loading}
                            className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <span className="material-symbols-outlined text-lg">refresh</span>
                            Refresh Data
                        </button>
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
};

export default StageAnalytics;
