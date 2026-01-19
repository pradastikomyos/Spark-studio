import { useAuth } from '../../contexts/AuthContext';
import AdminLayout from '../../components/AdminLayout';
import { ADMIN_MENU_ITEMS, ADMIN_MENU_SECTIONS } from '../../constants/adminMenu';

const BULK_STAGES = [
    { id: 'STG-001', name: 'Main Hall Stage', status: 'Active' },
    { id: 'STG-002', name: 'Portrait Studio A', status: 'Active' },
    { id: 'STG-003', name: 'Portrait Studio B', status: 'Active' },
    { id: 'STG-004', name: 'Family Set 1', status: 'Active' },
    { id: 'STG-005', name: 'Family Set 2', status: 'Active' },
    { id: 'STG-006', name: 'Neon Cyber Zone', status: 'Active' },
    { id: 'STG-007', name: 'Vintage Lounge', status: 'Maintenance' },
    { id: 'STG-008', name: 'Green Screen Room', status: 'Active' },
    { id: 'STG-009', name: 'Product Showcase', status: 'Active' },
    { id: 'STG-010', name: 'Outdoor Garden', status: 'Active' },
    { id: 'STG-011', name: 'Wedding Set', status: 'Active' },
    { id: 'STG-012', name: 'Abstract Art Corner', status: 'Active' },
    { id: 'STG-013', name: 'Retro Diner', status: 'Active' },
    { id: 'STG-014', name: 'Minimalist White', status: 'Active' },
    { id: 'STG-015', name: 'VIP Lounge', status: 'Active' },
];

const PERFORMANCE_DATA = [
    { label: 'S1', height: '40%', value: 80 },
    { label: 'S2', height: '65%', value: 130 },
    { label: 'S3', height: '30%', value: 60 },
    { label: 'S4', height: '85%', value: 170 },
    { label: 'S5', height: '50%', value: 100 },
    { label: 'S6', height: '45%', value: 90 },
    { label: 'S7', height: '70%', value: 140 },
    { label: 'S8', height: '25%', value: 50 },
    { label: 'S9', height: '55%', value: 110 },
    { label: 'S10', height: '90%', value: 180 },
    { label: 'S11', height: '35%', value: 70 },
    { label: 'S12', height: '60%', value: 120 },
    { label: 'S13', height: '40%', value: 80 },
    { label: 'S14', height: '75%', value: 150 },
    { label: 'S15', height: '20%', value: 40 },
];

const StageBulkQR = () => {
    const { signOut } = useAuth();

    return (
        <AdminLayout
            menuItems={ADMIN_MENU_ITEMS}
            menuSections={ADMIN_MENU_SECTIONS}
            defaultActiveMenuId="qr-bulk"
            title="Stage QR Bulk Manager"
            onLogout={signOut}
        >
            <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
                {/* Bulk Operations Header */}
                <div className="rounded-xl border border-white/5 bg-surface-dark p-6 flex flex-col md:flex-row justify-between items-center gap-4">
                    <div>
                        <h3 className="text-lg font-bold text-white">Bulk QR Operations</h3>
                        <p className="text-sm text-gray-400">Generate and download QR codes for all studios in a single archive.</p>
                    </div>
                    <button className="flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-bold text-white hover:bg-red-600 transition-all shadow-lg shadow-red-900/20">
                        <span className="material-symbols-outlined">archive</span>
                        Download All QR Codes (ZIP)
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
                    <div className="relative h-64 w-full rounded border border-white/5 p-4 flex items-end justify-between overflow-hidden bg-[linear-gradient(to_right,#27272a_1px,transparent_1px),linear-gradient(to_bottom,#27272a_1px,transparent_1px)] bg-[size:40px_40px]">
                        <div className="absolute left-0 top-0 bottom-8 w-8 flex flex-col justify-between text-[10px] text-gray-500 font-mono text-right pr-2">
                            <span>200</span>
                            <span>150</span>
                            <span>100</span>
                            <span>50</span>
                            <span>0</span>
                        </div>
                        <div className="absolute left-10 right-0 top-0 bottom-8 flex items-end justify-between px-2 gap-2">
                            {PERFORMANCE_DATA.map((item, idx) => (
                                <div
                                    key={idx}
                                    className="w-full bg-white/5 hover:bg-primary/20 transition-colors rounded-t relative group"
                                    style={{ height: item.height }}
                                >
                                    <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] text-white opacity-0 group-hover:opacity-100 transition-opacity">
                                        {item.value}
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="absolute left-10 right-0 bottom-0 h-6 flex justify-between text-[10px] text-gray-500 font-mono pt-2 px-2">
                            {PERFORMANCE_DATA.map((item, idx) => (
                                <span key={idx}>{item.label}</span>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Table List */}
                <div className="rounded-xl border border-white/5 bg-surface-dark overflow-hidden">
                    <div className="px-6 py-4 border-b border-white/5 flex justify-between items-center">
                        <h3 className="text-lg font-bold text-white font-display">Stage QR Codes</h3>
                        <div className="text-sm text-gray-400">Total 15 Stages</div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-gray-400">
                            <thead className="bg-surface-darker text-xs uppercase text-gray-500 font-medium">
                                <tr>
                                    <th className="px-6 py-3">Stage ID</th>
                                    <th className="px-6 py-3">Stage Name</th>
                                    <th className="px-6 py-3">QR Status</th>
                                    <th className="px-6 py-3 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {BULK_STAGES.map((stage) => (
                                    <tr key={stage.id} className="hover:bg-white/5 transition-colors group">
                                        <td className="px-6 py-4 font-medium text-white">#{stage.id}</td>
                                        <td className="px-6 py-4">{stage.name}</td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${stage.status === 'Active'
                                                    ? 'bg-green-400/10 text-green-400 ring-green-400/20'
                                                    : 'bg-yellow-400/10 text-yellow-400 ring-yellow-400/20'
                                                }`}>
                                                {stage.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button className="font-medium text-primary hover:text-red-400 inline-flex items-center justify-end gap-1">
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
