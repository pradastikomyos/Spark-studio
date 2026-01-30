import { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import AdminLayout from '../../components/AdminLayout';
import { ADMIN_MENU_ITEMS, ADMIN_MENU_SECTIONS } from '../../constants/adminMenu';
import { useStageAnalytics, type StageAnalyticsTimeFilter } from '../../hooks/useStageAnalytics';
import DashboardStatSkeleton from '../../components/skeletons/DashboardStatSkeleton';
import TableRowSkeleton from '../../components/skeletons/TableRowSkeleton';
import { useToast } from '../../components/Toast';

const TAB_RETURN_EVENT = 'tab-returned-from-idle';

const StageAnalytics = () => {
    const { signOut, isAdmin } = useAuth();
    const { showToast } = useToast();
    const [timeFilter, setTimeFilter] = useState<StageAnalyticsTimeFilter>('weekly');
    const lastToastErrorRef = useRef<string | null>(null);

    const { data, error, isLoading, isValidating, mutate, periodLabel } = useStageAnalytics(timeFilter, {
        enabled: isAdmin,
    });

    const stages = data ?? [];

    useEffect(() => {
        if (typeof window === 'undefined') return;
        const handleTabReturn = () => {
            mutate();
        };
        window.addEventListener(TAB_RETURN_EVENT, handleTabReturn);
        return () => {
            window.removeEventListener(TAB_RETURN_EVENT, handleTabReturn);
        };
    }, [mutate]);

    useEffect(() => {
        if (!error) return;
        const message = error instanceof Error ? error.message : 'Failed to load analytics data';
        if (lastToastErrorRef.current === message) return;
        lastToastErrorRef.current = message;
        showToast('error', message);
    }, [error, showToast]);

    const totalFootTraffic = useMemo(() => stages.reduce((sum, s) => sum + s.period_scans, 0), [stages]);
    const mostPopular = stages[0];
    const leastVisited = stages[stages.length - 1];
    const scansLabel = timeFilter === 'all' ? 'scans (all time)' : `scans this ${periodLabel}`;

    const getTrafficLevel = (scans: number, maxScans: number) => {
        const ratio = maxScans > 0 ? scans / maxScans : 0;
        if (ratio >= 0.7) return { label: 'High', color: 'text-primary' };
        if (ratio >= 0.4) return { label: 'Med', color: 'text-orange-400' };
        if (ratio >= 0.1) return { label: 'Low', color: 'text-gray-400' };
        return { label: 'Quiet', color: 'text-gray-600' };
    };

    const maxScans = mostPopular?.period_scans || 1;

    // Show error if not admin (this shouldn't happen due to ProtectedRoute, but just in case)
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
                            <p className="text-xs text-red-400 mt-1">{error instanceof Error ? error.message : 'Failed to load analytics data'}</p>
                        </div>
                    </div>
                )}
                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {isLoading ? (
                        Array.from({ length: 3 }).map((_, index) => <DashboardStatSkeleton key={`stage-analytics-stat-${index}`} />)
                    ) : (
                        <>
                            <div className="rounded-xl border border-white/5 bg-surface-dark p-6 flex flex-col justify-between relative overflow-hidden group">
                                <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                    <span className="material-symbols-outlined text-6xl text-primary">trending_up</span>
                                </div>
                                <p className="text-sm text-gray-400 mb-2">Most Popular Stage</p>
                                <div className="flex items-baseline gap-2">
                                    <h3 className="text-2xl font-bold text-white">{mostPopular?.name || 'N/A'}</h3>
                                    {mostPopular && mostPopular.period_change > 0 && (
                                        <span className="text-xs text-green-400 flex items-center bg-green-500/10 px-1.5 py-0.5 rounded border border-green-500/20">
                                            <span className="material-symbols-outlined text-xs mr-1">arrow_upward</span>
                                            {mostPopular.period_change}%
                                        </span>
                                    )}
                                </div>
                                <p className="text-xs text-gray-500 mt-2">
                                    {(mostPopular?.period_scans || 0).toLocaleString()} {scansLabel}
                                </p>
                            </div>

                            <div className="rounded-xl border border-white/5 bg-surface-dark p-6 flex flex-col justify-between relative overflow-hidden group">
                                <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                    <span className="material-symbols-outlined text-6xl text-gray-500">trending_down</span>
                                </div>
                                <p className="text-sm text-gray-400 mb-2">Least Visited</p>
                                <div className="flex items-baseline gap-2">
                                    <h3 className="text-2xl font-bold text-white">{leastVisited?.name || 'N/A'}</h3>
                                    {leastVisited && leastVisited.period_change < 0 && (
                                        <span className="text-xs text-red-400 flex items-center bg-red-500/10 px-1.5 py-0.5 rounded border border-red-500/20">
                                            <span className="material-symbols-outlined text-xs mr-1">arrow_downward</span>
                                            {Math.abs(leastVisited.period_change)}%
                                        </span>
                                    )}
                                </div>
                                <p className="text-xs text-gray-500 mt-2">
                                    {(leastVisited?.period_scans || 0).toLocaleString()} {scansLabel}
                                </p>
                            </div>

                            <div className="rounded-xl border border-white/5 bg-surface-dark p-6 flex flex-col justify-between relative overflow-hidden group">
                                <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                    <span className="material-symbols-outlined text-6xl text-white">groups</span>
                                </div>
                                <p className="text-sm text-gray-400 mb-2">Total Foot Traffic</p>
                                <div className="flex items-baseline gap-2">
                                    <h3 className="text-2xl font-bold text-white">{totalFootTraffic.toLocaleString()}</h3>
                                    <span className="text-xs text-gray-400 ml-1">Total Scans</span>
                                </div>
                                <p className="text-xs text-gray-500 mt-2">Across all {stages.length} stages</p>
                            </div>
                        </>
                    )}
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
                                {isLoading
                                    ? Array.from({ length: 8 }).map((_, idx) => (
                                        <TableRowSkeleton key={`stage-analytics-skel-${idx}`} columns={4} />
                                    ))
                                    : stages.map((stage, index) => {
                                        const traffic = getTrafficLevel(stage.period_scans, maxScans);
                                        const progressWidth = maxScans > 0 ? (stage.period_scans / maxScans) * 100 : 0;

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
                                                    {stage.period_scans.toLocaleString()}
                                                </td>
                                            </tr>
                                        );
                                    })}
                            </tbody>
                        </table>
                    </div>

                    <div className="px-6 py-4 border-t border-white/5 bg-surface-darker flex items-center justify-between">
                        <p className="text-sm text-gray-500">Showing {stages.length} stages</p>
                        <button
                            onClick={() => mutate()}
                            disabled={isValidating}
                            className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <span className={`material-symbols-outlined text-lg ${isValidating ? 'animate-spin' : ''}`}>{isValidating ? 'progress_activity' : 'refresh'}</span>
                            Refresh Data
                        </button>
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
};

export default StageAnalytics;
