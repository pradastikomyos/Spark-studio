import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { useToast } from '../Toast';
import { StageRow } from '../../hooks/useStages';
import BrandedLoader from '../BrandedLoader';

interface StageReviewsModalProps {
    isOpen: boolean;
    onClose: () => void;
    stage: StageRow | null;
}

interface Review {
    id: number;
    stage_id: number;
    user_id: string;
    rating: number;
    comment: string | null;
    is_approved: boolean;
    created_at: string;
    user?: {
        name: string;
        email: string;
    };
}

export default function StageReviewsModal({ isOpen, onClose, stage }: StageReviewsModalProps) {
    const { showToast } = useToast();
    const [reviews, setReviews] = useState<Review[]>([]);
    const [loading, setLoading] = useState(false);

    const fetchReviews = useCallback(async () => {
        if (!stage) return;
        try {
            setLoading(true);
            
            // 1. Fetch reviews
            const { data: reviewsData, error: reviewsError } = await supabase
                .from('stage_reviews')
                .select('*')
                .eq('stage_id', stage.id)
                .order('created_at', { ascending: false });

            if (reviewsError) throw reviewsError;

            if (!reviewsData || reviewsData.length === 0) {
                setReviews([]);
                return;
            }

            // 2. Fetch profiles
            const userIds = Array.from(new Set(reviewsData.map(r => r.user_id)));
            const { data: profilesData, error: profilesError } = await supabase
                .from('profiles')
                .select('id, name, email')
                .in('id', userIds);

            if (profilesError) throw profilesError;

            // 3. Map profiles to reviews
            const profilesMap = new Map(profilesData?.map(p => [p.id, p]));
            
            const joinedReviews = reviewsData.map(r => ({
                ...r,
                user: profilesMap.get(r.user_id) || { name: 'Unknown User', email: '-' }
            }));

            setReviews(joinedReviews);

        } catch (error) {
            console.error('Error fetching reviews:', error);
            showToast('error', 'Failed to load reviews');
        } finally {
            setLoading(false);
        }
    }, [stage, showToast]);

    useEffect(() => {
        if (isOpen && stage) {
            fetchReviews();
        }
    }, [isOpen, stage, fetchReviews]);

    const handleDelete = async (id: number) => {
        if (!confirm('Are you sure you want to delete this review?')) return;

        try {
            const { error } = await supabase
                .from('stage_reviews')
                .delete()
                .eq('id', id);

            if (error) throw error;

            showToast('success', 'Review deleted');
            setReviews(prev => prev.filter(r => r.id !== id));
        } catch (error) {
            console.error('Error deleting review:', error);
            showToast('error', 'Failed to delete review');
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
                className="relative w-full max-w-2xl rounded-xl bg-white shadow-xl max-h-[90vh] overflow-hidden flex flex-col animate-fade-in-scale" 
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-6 border-b border-gray-200 flex items-center justify-between bg-white z-10">
                    <div>
                        <h3 className="text-xl font-bold text-gray-900">Stage Reviews</h3>
                        <p className="text-sm text-gray-500">Reviews for {stage?.name}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                        <span className="material-symbols-outlined text-gray-600">close</span>
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 flex-1 overflow-y-auto">
                    {loading ? (
                        <BrandedLoader text="Loading reviews..." size="md" className="py-12" />
                    ) : reviews.length === 0 ? (
                        <div className="text-center py-12">
                            <span className="material-symbols-outlined text-4xl text-gray-300 mb-2">rate_review</span>
                            <p className="text-gray-500">No reviews yet</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {reviews.map((review) => (
                                <div key={review.id} className="p-4 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors bg-white">
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-primary font-bold">
                                                {review.user?.name.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-gray-900">{review.user?.name}</p>
                                                <div className="flex text-yellow-400 text-xs">
                                                    {[1, 2, 3, 4, 5].map((star) => (
                                                        <span key={`${review.id}-star-${star}`} className="material-symbols-outlined text-[16px] leading-none">
                                                            {star <= review.rating ? 'star' : 'star_border'}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs text-gray-500">
                                                {new Date(review.created_at).toLocaleDateString()}
                                            </span>
                                            <button 
                                                onClick={() => handleDelete(review.id)}
                                                className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50"
                                                title="Delete Review"
                                            >
                                                <span className="material-symbols-outlined text-lg">delete</span>
                                            </button>
                                        </div>
                                    </div>
                                    <p className="text-sm text-gray-600 pl-10">
                                        {review.comment || <span className="italic text-gray-400">No comment</span>}
                                    </p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
