import { useState, useEffect } from 'react';
import { type StageRow } from '../../hooks/useStages';

type StageFormData = {
    name: string;
    code: string;
    description: string;
    status: StageRow['status'];
    max_occupancy: number;
    zone: string;
};

type StageFormModalProps = {
    isOpen: boolean;
    onClose: () => void;
    initialData: Partial<StageRow> | null;
    onSubmit: (data: Omit<StageRow, 'id' | 'created_at' | 'updated_at' | 'qr_code_url'>) => Promise<void>;
    isSubmitting: boolean;
};

export default function StageFormModal({
    isOpen,
    onClose,
    initialData,
    onSubmit,
    isSubmitting,
}: StageFormModalProps) {
    const [formData, setFormData] = useState<StageFormData>({
        name: '',
        code: '',
        description: '',
        status: 'active' as const,
        max_occupancy: 0,
        zone: '',
    });

    useEffect(() => {
        if (initialData) {
            setFormData({
                name: initialData.name || '',
                code: initialData.code || '',
                description: initialData.description || '',
                status: initialData.status || 'active',
                max_occupancy: initialData.max_occupancy || 0,
                zone: initialData.zone || '',
            });
        } else {
            setFormData({
                name: '',
                code: '',
                description: '',
                status: 'active',
                max_occupancy: 0,
                zone: '',
            });
        }
    }, [initialData, isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        await onSubmit({
            ...formData,
            status: formData.status as 'active' | 'maintenance' | 'inactive',
        });
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl overflow-hidden animate-fade-in-up">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                    <h3 className="font-display text-xl font-bold text-gray-900">
                        {initialData ? 'Edit Stage' : 'New Stage'}
                    </h3>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-500 transition-colors"
                    >
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-1">
                                Stage Name
                            </label>
                            <input
                                type="text"
                                required
                                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 text-gray-900 focus:ring-2 focus:ring-[#ff4b86]/20 focus:border-[#ff4b86] transition-all"
                                placeholder="e.g. Boxing Ring"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-1">
                                    Stage Code
                                </label>
                                <input
                                    type="text"
                                    required
                                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 text-gray-900 focus:ring-2 focus:ring-[#ff4b86]/20 focus:border-[#ff4b86] transition-all font-mono text-sm"
                                    placeholder="e.g. STG-001-BOX"
                                    value={formData.code}
                                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-1">
                                    Zone / Location
                                </label>
                                <input
                                    type="text"
                                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 text-gray-900 focus:ring-2 focus:ring-[#ff4b86]/20 focus:border-[#ff4b86] transition-all"
                                    placeholder="e.g. Zone A - Floor 2"
                                    value={formData.zone}
                                    onChange={(e) => setFormData({ ...formData, zone: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-1">
                                    Status
                                </label>
                                <select
                                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 text-gray-900 focus:ring-2 focus:ring-[#ff4b86]/20 focus:border-[#ff4b86] transition-all"
                                    value={formData.status}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            status: e.target.value as StageRow['status'],
                                        })
                                    }
                                >
                                    <option value="active">Active</option>
                                    <option value="maintenance">Maintenance</option>
                                    <option value="inactive">Inactive</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-1">
                                    Max Occupancy
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 text-gray-900 focus:ring-2 focus:ring-[#ff4b86]/20 focus:border-[#ff4b86] transition-all"
                                    value={formData.max_occupancy}
                                    onChange={(e) => setFormData({ ...formData, max_occupancy: parseInt(e.target.value) || 0 })}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-1">
                                Description
                            </label>
                            <textarea
                                rows={3}
                                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 text-gray-900 focus:ring-2 focus:ring-[#ff4b86]/20 focus:border-[#ff4b86] transition-all resize-none"
                                placeholder="Describe the stage atmosphere..."
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="pt-4 flex items-center justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-6 py-2.5 rounded-xl text-sm font-bold text-gray-500 hover:bg-gray-100 transition-colors uppercase tracking-wider"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="px-6 py-2.5 rounded-xl bg-[#ff4b86] text-white text-sm font-bold hover:bg-[#ff6a9a] transition-colors shadow-lg shadow-pink-200 uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            {isSubmitting && <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>}
                            {initialData ? 'Save Changes' : 'Create Stage'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
