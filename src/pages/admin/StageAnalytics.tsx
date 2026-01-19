import { useAuth } from '../../contexts/AuthContext';
import AdminLayout from '../../components/AdminLayout';
import { ADMIN_MENU_ITEMS, ADMIN_MENU_SECTIONS } from '../../constants/adminMenu';

const ANALYTICS_DATA = [
    { rank: 1, name: 'Neon Cyberpunk', zone: 'Zone A - Floor 2', traffic: 'High', scans: '1,240', progress: '98%', gradient: 'from-purple-900 to-blue-900' },
    { rank: 2, name: 'Floral Dream', zone: 'Zone B - Floor 1', traffic: 'High', scans: '1,055', progress: '85%', gradient: 'from-pink-900 to-rose-900' },
    { rank: 3, name: 'Industrial Loft', zone: 'Zone A - Floor 1', traffic: 'Med', scans: '890', progress: '72%', gradient: 'from-gray-800 to-gray-600' },
    { rank: 4, name: 'Underwater World', zone: 'Zone C - Floor 1', traffic: 'Med', scans: '754', progress: '65%', gradient: 'from-blue-900 to-cyan-900' },
    { rank: 5, name: 'Golden Hour', zone: 'Zone B - Floor 2', traffic: 'Avg', scans: '620', progress: '50%', gradient: 'from-yellow-900 to-amber-700' },
    { rank: 6, name: 'Jungle Vibes', zone: 'Zone C - Floor 2', traffic: 'Avg', scans: '580', progress: '45%', gradient: 'from-green-900 to-emerald-900' },
    { rank: 7, name: 'Minimalist White', zone: 'Zone A - Floor 1', traffic: 'Low', scans: '450', progress: '38%', gradient: 'from-pink-300 to-rose-300 opacity-20' },
    { rank: 8, name: 'Galaxy Room', zone: 'Zone B - Floor 3', traffic: 'Low', scans: '320', progress: '30%', gradient: 'from-indigo-900 to-purple-900' },
    { rank: 15, name: 'Vintage Library', zone: 'Zone C - Floor 3', traffic: 'Quiet', scans: '112', progress: '10%', gradient: 'from-amber-900 to-amber-950 opacity-40' },
];

const StageAnalytics = () => {
    const { signOut } = useAuth();

    return (
        <AdminLayout
            menuItems={ADMIN_MENU_ITEMS}
            menuSections={ADMIN_MENU_SECTIONS}
            defaultActiveMenuId="stage-analytics"
            title="Stage Analytics"
            onLogout={signOut}
            headerActions={
                <div className="flex items-center gap-4">
                    <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-white/10 bg-surface-dark text-sm text-gray-300 hover:text-white hover:border-white/20 transition-colors">
                        <span className="material-symbols-outlined text-base">file_download</span>
                        Export Data
                    </button>
                </div>
            }
        >
            <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="rounded-xl border border-white/5 bg-surface-dark p-6 flex flex-col justify-between relative overflow-hidden group">
                        <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <span className="material-symbols-outlined text-6xl text-primary">trending_up</span>
                        </div>
                        <p className="text-sm text-gray-400 mb-2">Most Popular Stage</p>
                        <div className="flex items-baseline gap-2">
                            <h3 className="text-2xl font-bold text-white">Neon Cyberpunk</h3>
                            <span className="text-xs text-green-400 flex items-center bg-green-500/10 px-1.5 py-0.5 rounded border border-green-500/20">
                                <span className="material-symbols-outlined text-xs mr-1">arrow_upward</span> 12%
                            </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-2">1,240 scans this week</p>
                    </div>

                    <div className="rounded-xl border border-white/5 bg-surface-dark p-6 flex flex-col justify-between relative overflow-hidden group">
                        <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <span className="material-symbols-outlined text-6xl text-gray-500">trending_down</span>
                        </div>
                        <p className="text-sm text-gray-400 mb-2">Least Visited</p>
                        <div className="flex items-baseline gap-2">
                            <h3 className="text-2xl font-bold text-white">Vintage Library</h3>
                            <span className="text-xs text-red-400 flex items-center bg-red-500/10 px-1.5 py-0.5 rounded border border-red-500/20">
                                <span className="material-symbols-outlined text-xs mr-1">arrow_downward</span> 5%
                            </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-2">112 scans this week</p>
                    </div>

                    <div className="rounded-xl border border-white/5 bg-surface-dark p-6 flex flex-col justify-between relative overflow-hidden group">
                        <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <span className="material-symbols-outlined text-6xl text-white">groups</span>
                        </div>
                        <p className="text-sm text-gray-400 mb-2">Total Foot Traffic</p>
                        <div className="flex items-baseline gap-2">
                            <h3 className="text-2xl font-bold text-white">8,492</h3>
                            <span className="text-xs text-gray-400 ml-1">Total Scans</span>
                        </div>
                        <p className="text-xs text-gray-500 mt-2">Across all 15 stages</p>
                    </div>
                </div>

                {/* Leaderboard Table */}
                <div className="rounded-xl border border-white/5 bg-surface-dark overflow-hidden">
                    <div className="px-6 py-5 border-b border-white/5 flex items-center justify-between">
                        <h3 className="text-lg font-bold text-white font-display">Stage Popularity Leaderboard</h3>
                        <div className="flex gap-2">
                            <button className="px-3 py-1 text-xs font-medium text-white bg-primary rounded shadow-lg shadow-red-900/20">Weekly</button>
                            <button className="px-3 py-1 text-xs font-medium text-gray-400 hover:text-white hover:bg-white/5 rounded transition-colors">Monthly</button>
                            <button className="px-3 py-1 text-xs font-medium text-gray-400 hover:text-white hover:bg-white/5 rounded transition-colors">All Time</button>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-gray-400">
                            <thead className="bg-surface-darker text-xs uppercase text-gray-500">
                                <tr>
                                    <th className="px-6 py-4 font-semibold w-16 text-center">Rank</th>
                                    <th className="px-6 py-4 font-semibold">Stage Name</th>
                                    <th className="px-6 py-4 font-semibold text-center">QR Code</th>
                                    <th className="px-6 py-4 font-semibold w-1/3">Traffic Volume</th>
                                    <th className="px-6 py-4 font-semibold text-right">Scans</th>
                                    <th className="px-6 py-4 font-semibold text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {ANALYTICS_DATA.map((stage) => (
                                    <tr key={stage.rank} className="hover:bg-white/[0.02] transition-colors group">
                                        <td className="px-6 py-4 text-center">
                                            <div className={`inline-flex h-8 w-8 items-center justify-center rounded-full font-bold border ${stage.rank === 1 ? 'bg-primary/20 text-primary border-primary/30' : 'bg-surface-darker text-gray-300 border-white/10'}`}>
                                                {stage.rank}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="h-10 w-16 bg-gray-800 rounded overflow-hidden">
                                                    <div className={`w-full h-full bg-gradient-to-br ${stage.gradient}`}></div>
                                                </div>
                                                <div>
                                                    <p className="font-bold text-white text-base">{stage.name}</p>
                                                    <p className="text-xs text-gray-500">{stage.zone}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className="material-symbols-outlined text-2xl text-white bg-white/5 p-1 rounded cursor-pointer hover:bg-white/10">qr_code_2</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-full bg-surface-darker rounded-full h-2 overflow-hidden border border-white/5">
                                                    <div
                                                        className={`h-2 rounded-full ${stage.traffic === 'High' ? 'bg-gradient-to-r from-primary to-orange-500' : 'bg-gradient-to-r from-gray-600 to-gray-500'}`}
                                                        style={{ width: stage.progress }}
                                                    ></div>
                                                </div>
                                                <span className={`text-xs font-bold ${stage.traffic === 'High' ? 'text-primary' : 'text-gray-400'}`}>{stage.traffic}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right font-mono text-white">{stage.scans}</td>
                                        <td className="px-6 py-4 text-right">
                                            <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-white/5 border border-white/10 text-xs font-bold text-white hover:bg-primary hover:border-primary transition-all shadow-sm">
                                                <span className="material-symbols-outlined text-sm">download</span>
                                                Unduh
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div className="px-6 py-4 border-t border-white/5 bg-surface-darker flex items-center justify-between">
                        <p className="text-sm text-gray-500">Showing {ANALYTICS_DATA.length} of 15 stages</p>
                        <div className="flex gap-2">
                            <button className="p-1 rounded bg-white/5 text-gray-400 hover:text-white disabled:opacity-50">
                                <span className="material-symbols-outlined text-lg">chevron_left</span>
                            </button>
                            <button className="p-1 rounded bg-white/5 text-gray-400 hover:text-white">
                                <span className="material-symbols-outlined text-lg">chevron_right</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
};

export default StageAnalytics;
