import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { useToast } from '../Toast';
import { StageRow } from '../../hooks/useStages';

interface StageGalleryModalProps {
    isOpen: boolean;
    onClose: () => void;
    stage: StageRow | null;
}

interface GalleryImage {
    id: number;
    stage_id: number;
    image_url: string;
    display_order: number;
    created_at: string;
}

export default function StageGalleryModal({ isOpen, onClose, stage }: StageGalleryModalProps) {
    const { showToast } = useToast();
    const [images, setImages] = useState<GalleryImage[]>([]);
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);

    const fetchImages = useCallback(async () => {
        if (!stage) return;
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('stage_gallery')
                .select('*')
                .eq('stage_id', stage.id)
                .order('display_order', { ascending: true })
                .order('created_at', { ascending: false });

            if (error) throw error;
            setImages(data || []);
        } catch (error) {
            console.error('Error fetching gallery:', error);
            showToast('error', 'Failed to load gallery images');
        } finally {
            setLoading(false);
        }
    }, [stage, showToast]);

    useEffect(() => {
        if (isOpen && stage) {
            fetchImages();
        }
    }, [isOpen, stage, fetchImages]);

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || !e.target.files.length || !stage) return;
        
        try {
            setUploading(true);
            const files = Array.from(e.target.files);
            
            for (const file of files) {
                // Validate
                if (!file.type.startsWith('image/')) continue;
                if (file.size > 5 * 1024 * 1024) { // 5MB limit
                    showToast('error', `File ${file.name} is too large (max 5MB)`);
                    continue;
                }

                const fileExt = file.name.split('.').pop();
                const fileName = `stage-${stage.id}-${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
                const filePath = `${fileName}`; // bucket/filename

                const { error: uploadError } = await supabase.storage
                    .from('stage-gallery')
                    .upload(filePath, file);

                if (uploadError) throw uploadError;

                const { data: { publicUrl } } = supabase.storage
                    .from('stage-gallery')
                    .getPublicUrl(filePath);

                // Insert into DB
                const { error: dbError } = await supabase
                    .from('stage_gallery')
                    .insert({
                        stage_id: stage.id,
                        image_url: publicUrl,
                        display_order: images.length // Append to end
                    });

                if (dbError) throw dbError;
            }

            showToast('success', 'Images uploaded successfully');
            fetchImages();
        } catch (error) {
            console.error('Error uploading images:', error);
            showToast('error', 'Failed to upload images');
        } finally {
            setUploading(false);
            e.target.value = '';
        }
    };

    const handleDelete = async (image: GalleryImage) => {
        if (!confirm('Are you sure you want to delete this image?')) return;

        try {
            const { error: dbError } = await supabase
                .from('stage_gallery')
                .delete()
                .eq('id', image.id);

            if (dbError) throw dbError;

            // Optional: Delete from storage logic here

            showToast('success', 'Image deleted');
            setImages(prev => prev.filter(img => img.id !== image.id));
        } catch (error) {
            console.error('Error deleting image:', error);
            showToast('error', 'Failed to delete image');
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div 
                className="absolute inset-0 bg-black/60 animate-fade-in" 
                onClick={onClose}
            ></div>
            <div 
                className="relative w-full max-w-4xl rounded-xl bg-white shadow-xl max-h-[90vh] overflow-hidden flex flex-col animate-fade-in-scale" 
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-6 border-b border-gray-200 flex items-center justify-between bg-white z-10">
                    <div>
                        <h3 className="text-xl font-bold text-gray-900">Stage Gallery</h3>
                        <p className="text-sm text-gray-500">Manage photos for {stage?.name}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                        <span className="material-symbols-outlined text-gray-600">close</span>
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 flex-1 overflow-y-auto">
                    {/* Upload Section */}
                    <div className="mb-8 p-6 border-2 border-dashed border-gray-300 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors text-center">
                        <label className="cursor-pointer block">
                            <span className="material-symbols-outlined text-4xl text-gray-400 mb-2">cloud_upload</span>
                            <p className="text-sm text-gray-600 font-medium">Click to upload or drag and drop</p>
                            <p className="text-xs text-gray-400 mt-1">SVG, PNG, JPG or GIF (MAX. 5MB)</p>
                            <input 
                                type="file" 
                                className="hidden" 
                                multiple 
                                accept="image/*"
                                onChange={handleUpload}
                                disabled={uploading}
                            />
                        </label>
                        {uploading && (
                            <div className="mt-4 flex items-center justify-center gap-2 text-primary">
                                <span className="material-symbols-outlined animate-spin">sync</span>
                                <span className="text-sm font-bold">Uploading...</span>
                            </div>
                        )}
                    </div>

                    {/* Gallery Grid */}
                    {loading ? (
                        <div className="flex justify-center py-12">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                        </div>
                    ) : images.length === 0 ? (
                        <div className="text-center py-12">
                            <span className="material-symbols-outlined text-4xl text-gray-300 mb-2">photo_library</span>
                            <p className="text-gray-500">No images yet</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {images.map((img) => (
                                <div key={img.id} className="group relative aspect-square bg-gray-100 rounded-lg overflow-hidden border border-gray-200 shadow-sm hover:shadow-md transition-all">
                                    <img 
                                        src={img.image_url} 
                                        alt="Gallery" 
                                        className="w-full h-full object-cover"
                                    />
                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                                        <button 
                                            onClick={() => handleDelete(img)}
                                            className="p-2 bg-white text-red-600 rounded-full hover:bg-red-50 transition-colors transform scale-90 group-hover:scale-100"
                                            title="Delete Image"
                                        >
                                            <span className="material-symbols-outlined">delete</span>
                                        </button>
                                    </div>
                                    <div className="absolute bottom-2 left-2 right-2 flex justify-between items-end opacity-0 group-hover:opacity-100 transition-opacity">
                                         <span className="bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded backdrop-blur-sm">
                                            #{img.display_order}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
