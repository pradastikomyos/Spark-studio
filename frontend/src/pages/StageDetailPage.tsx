import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/Toast';

interface Stage {
    id: number;
    code: string;
    name: string;
    description: string | null;
    zone: string | null;
    status: string;
}

interface GalleryImage {
    id: number;
    image_url: string;
    display_order: number;
}

interface Review {
    id: number;
    user_id: string;
    rating: number;
    comment: string | null;
    created_at: string;
    user?: {
        name: string;
    };
}

const StageDetailPage = () => {
    const { stageCode } = useParams<{ stageCode: string }>();
    const { user } = useAuth();
    const { showToast } = useToast();
    const queryClient = useQueryClient();

    const [isReviewFormOpen, setIsReviewFormOpen] = useState(false);
    const [rating, setRating] = useState(5);
    const [comment, setComment] = useState('');

    // Fetch Stage Data
    const { data: stage, isLoading: stageLoading, error: stageError } = useQuery({
        queryKey: ['stage', stageCode],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('stages')
                .select('*')
                .eq('code', stageCode)
                .single();
            if (error) throw error;
            return data as Stage;
        },
        enabled: !!stageCode,
    });

    // Fetch Gallery
    const { data: gallery = [], isLoading: galleryLoading } = useQuery({
        queryKey: ['stage-gallery', stage?.id],
        queryFn: async () => {
            if (!stage?.id) return [];
            const { data, error } = await supabase
                .from('stage_gallery')
                .select('*')
                .eq('stage_id', stage.id)
                .order('display_order', { ascending: true })
                .order('created_at', { ascending: false });
            if (error) throw error;
            return data as GalleryImage[];
        },
        enabled: !!stage?.id,
    });

    // Fetch Reviews
    const { data: reviews = [], isLoading: reviewsLoading } = useQuery({
        queryKey: ['stage-reviews', stage?.id],
        queryFn: async () => {
            if (!stage?.id) return [];
            
            // Fetch reviews
            const { data: reviewsData, error: reviewsError } = await supabase
                .from('stage_reviews')
                .select('*')
                .eq('stage_id', stage.id)
                .eq('is_approved', true) // Only approved reviews
                .order('created_at', { ascending: false });
            
            if (reviewsError) throw reviewsError;
            if (!reviewsData.length) return [];

            // Fetch profiles
            const userIds = Array.from(new Set(reviewsData.map(r => r.user_id)));
            const { data: profilesData } = await supabase
                .from('profiles')
                .select('id, name')
                .in('id', userIds);

             const profilesMap = new Map(profilesData?.map(p => [p.id, p]));
            
            return reviewsData.map(r => ({
                ...r,
                user: profilesMap.get(r.user_id) || { name: 'Spark User' }
            })) as Review[];
        },
        enabled: !!stage?.id,
    });

    // Submit Review Mutation
    const submitReviewMutation = useMutation({
        mutationFn: async () => {
            if (!user) throw new Error('You must be logged in to review.');
            if (!stage) throw new Error('Stage not found.');

            const { error } = await supabase.from('stage_reviews').insert({
                stage_id: stage.id,
                user_id: user.id,
                rating,
                comment,
                is_approved: true // Auto-approve
            });

            if (error) throw error;
        },
        onSuccess: () => {
            showToast('success', 'Review submitted successfully!');
            setIsReviewFormOpen(false);
            setRating(5);
            setComment('');
            queryClient.invalidateQueries({ queryKey: ['stage-reviews', stage?.id] });
        },
        onError: (error) => {
            showToast('error', error instanceof Error ? error.message : 'Failed to submit review');
        }
    });

    const handleSubmitReview = (e: React.FormEvent) => {
        e.preventDefault();
        submitReviewMutation.mutate();
    };

    if (stageLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (stageError || !stage) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
                <span className="material-symbols-outlined text-6xl text-gray-400 mb-4">search_off</span>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">Stage Not Found</h1>
                <p className="text-gray-600 mb-6">The stage you are looking for does not exist.</p>
                <Link to="/on-stage" className="px-6 py-2 bg-primary text-white rounded-lg font-bold hover:bg-primary-dark transition-colors">
                    Back to Stages
                </Link>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#fff1f6] pb-20 font-sans">
            {/* Hero Section */}
            <div className="relative h-[40vh] min-h-[400px] overflow-hidden">
                {/* Background Image/Gradient */}
                <div className="absolute inset-0 bg-gradient-to-r from-[#ff94b8] to-[#ff4b86]"></div>
                <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1492684223066-81342ee5ff30?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center opacity-40 mix-blend-screen"></div>
                <div className="absolute inset-0 bg-black/20"></div>
                
                <div className="absolute inset-0 flex flex-col justify-end pb-16 px-4 md:px-8 max-w-7xl mx-auto z-10">
                    <Link to="/on-stage" className="inline-flex items-center text-white/90 hover:text-white mb-6 transition-colors font-bold tracking-wide">
                        <span className="material-symbols-outlined mr-1">arrow_back</span>
                        Back to All Stages
                    </Link>
                    <h1 className="text-5xl md:text-7xl font-bold mb-4 text-white drop-shadow-lg font-serif tracking-tight">{stage.name}</h1>
                    {stage.description && (
                        <p className="text-xl md:text-2xl text-white/90 max-w-2xl font-light drop-shadow-md">
                            {stage.description}
                        </p>
                    )}
                    <div className="flex items-center gap-4 mt-6">
                        <span className="bg-white/20 backdrop-blur-md px-4 py-1.5 rounded-full text-sm font-bold text-white border border-white/30 shadow-sm">
                            Zone: {stage.zone || 'General'}
                        </span>
                        <span className="bg-white/20 backdrop-blur-md px-4 py-1.5 rounded-full text-sm font-bold text-white border border-white/30 shadow-sm">
                            Code: {stage.code}
                        </span>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 md:px-8 -mt-10 relative z-20 space-y-16">
                
                {/* Gallery Section */}
                <section>
                    <div className="bg-white p-6 rounded-2xl shadow-xl border border-[#ffe1ec] mb-8">
                        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3 mb-6 font-serif">
                            <span className="material-symbols-outlined text-[#ff4b86] text-3xl">photo_library</span>
                            Stage Gallery
                        </h2>

                        {galleryLoading ? (
                            <div className="flex justify-center py-12">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#ff4b86]"></div>
                            </div>
                        ) : gallery.length === 0 ? (
                            <div className="text-center py-16 bg-[#fff1f6] rounded-xl border-2 border-dashed border-[#ffc3d9]">
                                <span className="material-symbols-outlined text-4xl text-[#ff94b8] mb-2">image_not_supported</span>
                                <p className="text-[#cc2f64] font-medium">No photos available for this stage yet.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {gallery.map((img) => (
                                    <div key={img.id} className="group relative">
                                        <div className="aspect-[4/3] bg-gray-100 rounded-xl overflow-hidden shadow-lg border border-gray-100 transition-all duration-300 hover:shadow-2xl hover:-translate-y-1">
                                            <img 
                                                src={img.image_url} 
                                                alt={`Gallery ${stage.name}`} 
                                                className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700 ease-out"
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </section>

                {/* Reviews Section */}
                <section className="max-w-4xl mx-auto">
                    <div className="bg-white rounded-2xl shadow-xl border border-[#ffe1ec] overflow-hidden">
                        <div className="p-6 md:p-8 bg-gradient-to-r from-[#fff1f6] to-white border-b border-[#ffe1ec]">
                            <div className="flex items-center justify-between flex-wrap gap-4">
                                <h2 className="text-3xl font-bold text-gray-900 flex items-center gap-3 font-serif">
                                    <span className="material-symbols-outlined text-yellow-400 text-3xl">star</span>
                                    Star Reviews
                                </h2>
                                {!isReviewFormOpen && (
                                    <button 
                                        onClick={() => setIsReviewFormOpen(true)}
                                        className="bg-[#ff4b86] text-white px-8 py-3 rounded-full font-bold hover:bg-[#ff6a9a] transition-all transform hover:-translate-y-1 shadow-lg hover:shadow-[#ffb3d0] flex items-center gap-2"
                                    >
                                        <span className="material-symbols-outlined">edit</span>
                                        Write a Review
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="p-6 md:p-8">
                            {/* Review Form */}
                            {isReviewFormOpen && (
                                <div className="bg-[#fff1f6] p-6 rounded-2xl border border-[#ffc3d9] mb-8 animate-fade-in-up">
                                    <h3 className="text-xl font-bold text-[#a32550] mb-4">Share your experience</h3>
                                    {user ? (
                                        <form onSubmit={handleSubmitReview}>
                                            <div className="mb-6">
                                                <label className="block text-sm font-bold text-[#cc2f64] mb-2 uppercase tracking-wide">Rating</label>
                                                <div className="flex gap-2">
                                                    {[1, 2, 3, 4, 5].map((star) => (
                                                        <button
                                                            key={star}
                                                            type="button"
                                                            onClick={() => setRating(star)}
                                                            className={`text-4xl transition-all hover:scale-110 focus:outline-none ${star <= rating ? 'text-yellow-400 drop-shadow-sm' : 'text-gray-300 hover:text-yellow-200'}`}
                                                        >
                                                            ★
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                            <div className="mb-6">
                                                <label className="block text-sm font-bold text-[#cc2f64] mb-2 uppercase tracking-wide">Your Review</label>
                                                <textarea
                                                    value={comment}
                                                    onChange={(e) => setComment(e.target.value)}
                                                    className="w-full rounded-xl border border-[#ffc3d9] p-4 h-32 focus:ring-2 focus:ring-[#ff4b86] focus:border-transparent text-gray-700 bg-white placeholder-gray-400 resize-none shadow-inner"
                                                    placeholder="What did you think about this stage?"
                                                    required
                                                ></textarea>
                                            </div>
                                            <div className="flex gap-3">
                                                <button
                                                    type="submit"
                                                    disabled={submitReviewMutation.isPending}
                                                    className="flex-1 bg-[#ff4b86] text-white px-6 py-3 rounded-xl font-bold hover:bg-[#ff6a9a] transition-colors disabled:opacity-50 shadow-md"
                                                >
                                                    {submitReviewMutation.isPending ? 'Submitting...' : 'Submit Review'}
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setIsReviewFormOpen(false)}
                                                    className="px-6 py-3 rounded-xl font-bold text-[#cc2f64] hover:bg-[#ffe1ec] transition-colors"
                                                >
                                                    Cancel
                                                </button>
                                            </div>
                                        </form>
                                    ) : (
                                        <div className="text-center py-8">
                                            <span className="material-symbols-outlined text-4xl text-[#ff94b8] mb-2">lock</span>
                                            <p className="text-[#a32550] mb-6 font-medium">Please log in to write a review.</p>
                                            <div className="flex justify-center gap-4">
                                                <Link to="/login" className="bg-[#ff4b86] text-white px-8 py-3 rounded-full font-bold hover:bg-[#ff6a9a] shadow-lg transition-transform hover:scale-105">
                                                    Log In
                                                </Link>
                                                <button 
                                                    onClick={() => setIsReviewFormOpen(false)}
                                                    className="px-6 py-3 rounded-full font-bold text-gray-500 hover:bg-gray-100 transition-colors"
                                                >
                                                    Cancel
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Reviews List */}
                            {reviewsLoading ? (
                                <div className="flex justify-center py-8">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#ff4b86]"></div>
                                </div>
                            ) : reviews.length === 0 ? (
                                <div className="text-center py-12">
                                    <div className="inline-block p-4 rounded-full bg-[#fff1f6] mb-4">
                                        <span className="material-symbols-outlined text-4xl text-[#ff94b8]">stars</span>
                                    </div>
                                    <p className="text-gray-500 font-medium">No reviews yet. Be the first to review!</p>
                                </div>
                            ) : (
                                <div className="grid gap-6">
                                    {reviews.map((review) => (
                                        <div key={review.id} className="group bg-white rounded-xl border border-gray-100 p-6 hover:shadow-lg transition-shadow duration-300">
                                            <div className="flex items-start gap-4 mb-4">

                                                <div className="flex-1">
                                                    <div className="flex justify-between items-start">
                                                        <h4 className="font-bold text-gray-900 text-lg">{review.user?.name}</h4>
                                                        <span className="text-xs text-gray-400 font-medium bg-gray-50 px-2 py-1 rounded-full border border-gray-100">
                                                            {new Date(review.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                                                        </span>
                                                    </div>
                                                    <div className="flex text-yellow-400 text-lg mt-1">
                                                        {[1, 2, 3, 4, 5].map((star) => (
                                                            <span key={`${review.id}-star-${star}`} className="drop-shadow-sm">
                                                                {star <= review.rating ? '★' : '☆'}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="mt-2">
                                                <p className="text-gray-600 leading-relaxed italic">
                                                    "{review.comment}"
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
};

export default StageDetailPage;
