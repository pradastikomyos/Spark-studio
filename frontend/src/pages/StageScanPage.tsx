import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { createQuerySignal } from '../lib/fetchers';

type Stage = {
    id: number;
    code: string;
    name: string;
    description: string | null;
    zone: string | null;
    status: string;
};

const StageScanPage = () => {
    const { stageCode } = useParams<{ stageCode: string }>();
    const navigate = useNavigate();
    const [stage, setStage] = useState<Stage | null>(null);
    const [loading, setLoading] = useState(true);
    const [scanStatus, setScanStatus] = useState<'idle' | 'scanning' | 'success' | 'error'>('idle');
    const [errorMessage, setErrorMessage] = useState('');

    const fetchStageAndRecordScan = useCallback(async () => {
        try {
            setLoading(true);
            setScanStatus('scanning');

            const { signal: timeoutSignal, cleanup } = createQuerySignal(undefined, 10000);
            // Fetch stage info
            const { data: stageData, error: stageError } = await supabase
                .from('stages')
                .select('*')
                .eq('code', stageCode)
                .abortSignal(timeoutSignal)
                .single();

            if (stageError || !stageData) {
                setErrorMessage('Stage not found. Please check the QR code.');
                setScanStatus('error');
                return;
            }

            setStage(stageData);

            // Check if stage is active
            if (stageData.status !== 'active') {
                setErrorMessage(`This stage is currently under ${stageData.status}. Please try another stage.`);
                setScanStatus('error');
                return;
            }

            // Record the scan (anonymous - no auth required for foot traffic tracking)
            const { error: scanError } = await supabase.from('stage_scans').insert({
                stage_id: stageData.id,
                user_agent: navigator.userAgent,
            }).abortSignal(timeoutSignal);

            if (scanError) {
                console.error('Error recording scan:', scanError);
                // Don't show error to user - scan tracking is secondary
            }

            setScanStatus('success');
        } catch (error) {
            if (error instanceof Error && error.name === 'AbortError') {
                setErrorMessage('Request timed out. Please try again.');
            }
            console.error('Error:', error);
            setErrorMessage('Something went wrong. Please try again.');
            setScanStatus('error');
        } finally {
            cleanup();
            setLoading(false);
        }
    }, [stageCode]);

    useEffect(() => {
        if (stageCode) {
            fetchStageAndRecordScan();
        }
    }, [stageCode, fetchStageAndRecordScan]);


    if (loading) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-primary mx-auto mb-4"></div>
                    <p className="text-gray-900 text-lg">Scanning QR Code...</p>
                    <p className="text-gray-600 text-sm mt-2">Please wait</p>
                </div>
            </div>
        );
    }

    if (scanStatus === 'error') {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl border border-gray-200 p-8 max-w-md w-full text-center">
                    <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
                        <span className="material-symbols-outlined text-5xl text-red-500">error</span>
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">Scan Failed</h1>
                    <p className="text-gray-600 mb-6">{errorMessage}</p>
                    <button
                        onClick={() => navigate('/')}
                        className="w-full py-3 px-4 bg-[#ff4b86] text-gray-900 font-bold rounded-lg hover:bg-[#e63d75] transition-colors"
                    >
                        Back to Home
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl border border-gray-200 p-8 max-w-md w-full text-center">
                {/* Success Icon */}
                <div className="w-24 h-24 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
                    <span className="material-symbols-outlined text-6xl text-green-500">check_circle</span>
                </div>

                {/* Welcome Message */}
                <h1 className="text-3xl font-bold text-gray-900 mb-2 font-display">Welcome!</h1>
                <p className="text-gray-600 mb-6">You're entering</p>

                {/* Stage Info */}
                <div className="bg-gray-50 rounded-xl p-6 mb-6 border border-gray-200">
                    <div className="flex items-center justify-center gap-2 mb-2">
                        <span className="material-symbols-outlined text-primary">photo_camera</span>
                        <span className="text-xs font-mono text-gray-500">{stage?.code}</span>
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-1">{stage?.name}</h2>
                    <p className="text-sm text-gray-600">{stage?.zone}</p>
                    {stage?.description && (
                        <p className="text-xs text-gray-500 mt-3 leading-relaxed">{stage.description}</p>
                    )}
                </div>

                {/* Instructions */}
                <div className="bg-primary/10 rounded-xl p-4 mb-6 border border-primary/20">
                    <p className="text-sm text-primary font-medium">
                        🎉 Enjoy your photo session! Feel free to explore all 15 stages with your all-access pass.
                    </p>
                </div>

                {/* Action Buttons */}
                <div className="space-y-3">
                    <button
                        onClick={() => window.location.assign('/on-stage')}
                        className="w-full py-3 px-4 bg-[#ff4b86] text-gray-900 font-bold rounded-lg hover:bg-[#e63d75] transition-colors shadow-lg shadow-red-900/20"
                    >
                        View All Stages
                    </button>
                    <button
                        onClick={() => navigate('/')}
                        className="w-full py-3 px-4 bg-gray-100 text-gray-900 font-medium rounded-lg hover:bg-gray-200 transition-colors border border-gray-200"
                    >
                        Back to Home
                    </button>
                </div>

                {/* Footer */}
                <p className="text-xs text-gray-600 mt-6">
                    Scan recorded at {new Date().toLocaleTimeString('en-US', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit' })}
                </p>
            </div>
        </div>
    );
};

export default StageScanPage;
