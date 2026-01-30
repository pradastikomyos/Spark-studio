import { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import AdminLayout from '../../components/AdminLayout';
import { ADMIN_MENU_ITEMS, ADMIN_MENU_SECTIONS } from '../../constants/adminMenu';
import TableRowSkeleton from '../../components/skeletons/TableRowSkeleton';
import { useToast } from '../../components/Toast';
import { useStageQRCodes, type StageQRCode } from '../../hooks/useStageQRCodes';

const StageBulkQR = () => {
    const { signOut } = useAuth();
    const { showToast } = useToast();
    const [searchQuery, setSearchQuery] = useState('');
    const [downloading, setDownloading] = useState(false);
    const lastToastErrorRef = useRef<string | null>(null);

    const { data, error, isLoading } = useStageQRCodes();
    const stages = data ?? [];

    useEffect(() => {
        if (!error) return;
        const message = error instanceof Error ? error.message : 'Gagal memuat data stage';
        if (lastToastErrorRef.current === message) return;
        lastToastErrorRef.current = message;
        showToast('error', message);
    }, [error, showToast]);

    const generateQRCodeUrl = (stageCode: string) => {
        const scanUrl = `${window.location.origin}/scan/${stageCode}`;
        return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(scanUrl)}`;
    };

    const handleDownloadSingle = async (stage: StageQRCode) => {
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
            window.open(qrUrl, '_blank');
        }
    };

    const handleDownloadAll = async () => {
        setDownloading(true);

        try {
            // Download each QR code sequentially with a small delay
            for (const stage of stages) {
                await handleDownloadSingle(stage);
                await new Promise((resolve) => setTimeout(resolve, 500)); // 500ms delay between downloads
            }
            alert(`Successfully initiated download for ${stages.length} QR codes!`);
        } catch (error) {
            console.error('Error downloading all QRs:', error);
            alert('Error downloading QR codes. Please try again.');
        } finally {
            setDownloading(false);
        }
    };

    const filteredStages = useMemo(
        () =>
            stages.filter(
                (stage) =>
                    stage.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    stage.code.toLowerCase().includes(searchQuery.toLowerCase())
            ),
        [searchQuery, stages]
    );

    // Calculate chart data (max value for scaling)
    const maxScans = useMemo(() => Math.max(...stages.map((s) => s.today_scans), 1), [stages]);

    return (
        <AdminLayout
            menuItems={ADMIN_MENU_ITEMS}
            menuSections={ADMIN_MENU_SECTIONS}
            defaultActiveMenuId="qr-bulk"
            title="Stage QR Bulk Manager"
            onLogout={signOut}
        >
            <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
                {/* Error Message */}
                {error && (
                    <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 flex items-center gap-3">
                        <span className="material-symbols-outlined text-red-500">error</span>
                        <div>
                            <p className="text-sm font-medium text-red-500">Error memuat stage</p>
                            <p className="text-xs text-red-400 mt-1">{error instanceof Error ? error.message : 'Gagal memuat data stage'}</p>
                        </div>
                    </div>
                )}
                {/* Bulk Operations Header */}
                <div className="rounded-xl border border-white/5 bg-surface-dark p-6 flex flex-col md:flex-row justify-between items-center gap-4">
                    <div>
                        <h3 className="text-lg font-bold text-white">Bulk QR Operations</h3>
                        <p className="text-sm text-gray-400">
                            Generate and download QR codes for all studios. Each QR will be downloaded individually.
                        </p>
                    </div>
                    <button
                        onClick={handleDownloadAll}
                        disabled={downloading || isLoading}
                        className="flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-bold text-white hover:bg-red-600 transition-all shadow-lg shadow-red-900/20 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {downloading ? (
                            <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                Downloading...
                            </>
                        ) : (
                            <>
                                <span className="material-symbols-outlined">archive</span>
                                Download All QR Codes ({stages.length})
                            </>
                        )}
                    </button>
                </div>

                {/* Live Performance Chart */}
                <div className="rounded-xl border border-white/5 bg-surface-dark p-6">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-lg font-bold text-white font-display">Stage Performance Overview (Today)</h3>
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-400">Live Data</span>
                            <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></div>
                        </div>
                    </div>
                    {isLoading ? (
                        <div className="relative h-64 w-full rounded border border-white/5 p-4 overflow-hidden">
                            <div className="absolute inset-0 bg-[linear-gradient(to_right,#27272a_1px,transparent_1px),linear-gradient(to_bottom,#27272a_1px,transparent_1px)] bg-[size:40px_40px] opacity-50" />
                            <div className="relative h-full flex items-end justify-between px-2 gap-2">
                                {Array.from({ length: 10 }).map((_, idx) => (
                                    <div
                                        key={`stage-bulk-qr-chart-skel-${idx}`}
                                        className="w-full bg-white/5 rounded-t animate-pulse"
                                        style={{ height: `${20 + (idx % 5) * 12}%` }}
                                    />
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="relative h-64 w-full rounded border border-white/5 p-4 flex items-end justify-between overflow-hidden bg-[linear-gradient(to_right,#27272a_1px,transparent_1px),linear-gradient(to_bottom,#27272a_1px,transparent_1px)] bg-[size:40px_40px]">
                            {/* Y-axis labels */}
                            <div className="absolute left-0 top-0 bottom-8 w-8 flex flex-col justify-between text-[10px] text-gray-500 font-mono text-right pr-2">
                                <span>{maxScans}</span>
                                <span>{Math.round(maxScans * 0.75)}</span>
                                <span>{Math.round(maxScans * 0.5)}</span>
                                <span>{Math.round(maxScans * 0.25)}</span>
                                <span>0</span>
                            </div>

                            {/* Bars */}
                            <div className="absolute left-10 right-0 top-0 bottom-8 flex items-end justify-between px-2 gap-2">
                                {stages.map((stage) => {
                                    const heightPercent = maxScans > 0 ? (stage.today_scans / maxScans) * 100 : 0;
                                    return (
                                        <div
                                            key={stage.id}
                                            className="w-full bg-white/5 hover:bg-primary/20 transition-colors rounded-t relative group cursor-pointer"
                                            style={{ height: `${Math.max(heightPercent, 5)}%` }}
                                            title={`${stage.name}: ${stage.today_scans} scans`}
                                        >
                                            <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] text-white opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                                                {stage.today_scans}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* X-axis labels */}
                            <div className="absolute left-10 right-0 bottom-0 h-6 flex justify-between text-[10px] text-gray-500 font-mono pt-2 px-2">
                                {stages.map((stage) => (
                                    <span key={stage.id} title={stage.name}>
                                        S{stage.id}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Table List */}
                <div className="rounded-xl border border-white/5 bg-surface-dark overflow-hidden">
                    <div className="px-6 py-4 border-b border-white/5 flex justify-between items-center">
                        <h3 className="text-lg font-bold text-white font-display">Stage QR Codes</h3>
                        <div className="flex items-center gap-4">
                            <div className="relative w-64">
                                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
                                    search
                                </span>
                                <input
                                    className="w-full bg-surface-darker border border-white/10 rounded-lg py-1.5 pl-9 pr-4 text-sm text-gray-300 focus:ring-1 focus:ring-primary focus:border-primary placeholder-gray-600"
                                    placeholder="Search stages..."
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                            <div className="text-sm text-gray-400">Total {stages.length} Stages</div>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-gray-400">
                            <thead className="bg-surface-darker text-xs uppercase text-gray-500 font-medium">
                                <tr>
                                    <th className="px-6 py-3">Stage ID</th>
                                    <th className="px-6 py-3">Stage Name</th>
                                    <th className="px-6 py-3">QR Status</th>
                                    <th className="px-6 py-3 text-center">Today's Scans</th>
                                    <th className="px-6 py-3 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {isLoading
                                    ? Array.from({ length: 8 }).map((_, idx) => (
                                        <TableRowSkeleton key={`stage-bulk-qr-skel-${idx}`} columns={5} />
                                    ))
                                    : filteredStages.map((stage) => (
                                        <tr key={stage.id} className="hover:bg-white/5 transition-colors group">
                                            <td className="px-6 py-4 font-medium text-white">#{stage.code}</td>
                                            <td className="px-6 py-4">{stage.name}</td>
                                            <td className="px-6 py-4">
                                                <span
                                                    className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${stage.status === 'active'
                                                            ? 'bg-green-400/10 text-green-400 ring-green-400/20'
                                                            : stage.status === 'maintenance'
                                                                ? 'bg-yellow-400/10 text-yellow-400 ring-yellow-400/20'
                                                                : 'bg-gray-400/10 text-gray-400 ring-gray-400/20'
                                                        }`}
                                                >
                                                    {stage.status.charAt(0).toUpperCase() + stage.status.slice(1)}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-center font-mono">
                                                <span className={stage.today_scans > 0 ? 'text-primary font-bold' : 'text-gray-500'}>
                                                    {stage.today_scans}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <button
                                                    onClick={() => handleDownloadSingle(stage)}
                                                    className="font-medium text-primary hover:text-red-400 inline-flex items-center justify-end gap-1 transition-colors"
                                                >
                                                    <span className="material-symbols-outlined text-lg">download</span>
                                                    Unduh
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
};

export default StageBulkQR;
