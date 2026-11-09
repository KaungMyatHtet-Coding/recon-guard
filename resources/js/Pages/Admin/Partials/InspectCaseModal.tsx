import React, { useState } from 'react';

export interface SlipEvidence {
    id: number;
    payment_channel: string;
    image_path: string;
    extracted_transaction_id: string | null;
    extracted_amount: string | number | null;
    sender_phone: string | null;
    sender_name: string | null;
    ocr_confidence: number;
    exif_tamper_flag: boolean;
    verification_status: string;
    created_at: string;
}

export interface RecommendationCaseItem {
    id: number;
    recommended_by: number;
    target_user_id: number | null;
    invoice_id: number | null;
    customer_name: string;
    customer_phone: string;
    reason: string;
    status: 'pending' | 'approved' | 'rejected';
    reviewed_by: number | null;
    reviewed_at: string | null;
    created_at: string;
    total_invoices_count?: number;
    total_slips_count?: number;
    recommender?: { id: number; name: string; email: string };
    target_user?: { id: number; name: string; email: string; phone: string | null };
    invoice?: {
        id: number;
        invoice_number: string;
        amount: string | number;
        status: string;
        description: string | null;
        created_at: string;
        payment_slips?: SlipEvidence[];
    };
    reviewer?: { id: number; name: string; email: string };
}

interface Props {
    show: boolean;
    recommendation: RecommendationCaseItem | null;
    onClose: () => void;
    onApprove: (rec: RecommendationCaseItem) => void;
    onDismiss: (rec: RecommendationCaseItem) => void;
}

export default function InspectCaseModal({
    show,
    recommendation,
    onClose,
    onApprove,
    onDismiss,
}: Props) {
    const [zoomImage, setZoomImage] = useState<string | null>(null);

    if (!show || !recommendation) return null;

    const formatMmk = (amount: number | string | null | undefined) => {
        if (amount === null || amount === undefined) return '0.00';
        const num = typeof amount === 'number' ? amount : parseFloat(amount);
        return isNaN(num) ? '0.00' : num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    const latestSlip = recommendation.invoice?.payment_slips?.[0];

    const getSlipUrl = (path: string) => {
        if (!path) return '';
        if (path.startsWith('http://') || path.startsWith('https://')) return path;
        return path.startsWith('/') ? path : `/storage/${path}`;
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150 overflow-y-auto">
            <div className="w-full max-w-2xl my-8 rounded-3xl bg-white dark:bg-[#161B26] border border-slate-200 dark:border-slate-800 p-6 sm:p-7 shadow-2xl space-y-6 text-left animate-in zoom-in-95 duration-150">
                {/* Header */}
                <div className="flex items-start justify-between gap-4 border-b border-slate-100 dark:border-slate-800/80 pb-4">
                    <div className="flex items-center gap-3">
                        <span className="p-3 rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400 font-bold text-lg border border-purple-500/20">
                            🔍
                        </span>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="text-lg font-black text-slate-900 dark:text-white">
                                    Case Evidence Dossier #{recommendation.id}
                                </h3>
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                    recommendation.status === 'pending'
                                        ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-800'
                                        : recommendation.status === 'approved'
                                        ? 'bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-400 border border-rose-300 dark:border-rose-800'
                                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                                }`}>
                                    {recommendation.status}
                                </span>
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                Four-Eyes Maker-Checker Audit: Verify evidence before enforcing permanent account/phone suspension
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-lg text-sm transition"
                    >
                        ✕
                    </button>
                </div>

                {/* Section 1: Target Customer Summary */}
                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 p-4 space-y-3">
                    <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                        <span>👤</span> Target Customer Profile
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                        <div>
                            <span className="text-slate-400 block text-[10px]">Customer Name</span>
                            <span className="font-bold text-slate-900 dark:text-white truncate block">
                                {recommendation.customer_name}
                            </span>
                        </div>
                        <div>
                            <span className="text-slate-400 block text-[10px]">Phone Number</span>
                            <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                                {recommendation.customer_phone || 'N/A'}
                            </span>
                        </div>
                        <div>
                            <span className="text-slate-400 block text-[10px]">Account Classification</span>
                            <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold mt-0.5 ${
                                recommendation.target_user_id
                                    ? 'bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-400'
                                    : 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400'
                            }`}>
                                {recommendation.target_user_id ? 'Registered User' : 'Walk-in Guest'}
                            </span>
                        </div>
                        <div>
                            <span className="text-slate-400 block text-[10px]">Customer History</span>
                            <span className="font-mono text-slate-700 dark:text-slate-300 font-bold block mt-0.5">
                                {recommendation.total_invoices_count ?? 0} Invoices · {recommendation.total_slips_count ?? 0} Slips
                            </span>
                        </div>
                    </div>
                </div>

                {/* Section 2: Recommending Accountant Accusation */}
                <div className="rounded-2xl border border-rose-200/60 dark:border-rose-900/40 bg-rose-50/30 dark:bg-rose-950/20 p-4 space-y-2">
                    <div className="flex items-center justify-between">
                        <div className="text-[11px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
                            <span>⚖️</span> Senior Accountant Flag Accusation
                        </div>
                        <span className="text-[10px] font-mono text-slate-400">
                            {new Date(recommendation.created_at).toLocaleString()}
                        </span>
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                        Recommended by: <strong className="text-slate-900 dark:text-white">{recommendation.recommender?.name || 'Senior Accountant'}</strong> ({recommendation.recommender?.email || 'N/A'})
                    </div>
                    <div className="mt-2 text-xs text-rose-900 dark:text-rose-200 font-medium bg-rose-50 dark:bg-rose-950/60 p-3 rounded-xl border border-rose-200 dark:border-rose-900/60 leading-relaxed whitespace-pre-wrap">
                        {recommendation.reason}
                    </div>
                </div>

                {/* Section 3: Linked Invoice & Payment Slip Evidence */}
                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 p-4 space-y-3">
                    <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                        <span>🧾</span> Linked Invoice & Forensic Receipt Evidence
                    </div>

                    {recommendation.invoice ? (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs border-b border-slate-200 dark:border-slate-800 pb-3">
                                <div>
                                    <span className="text-slate-400 block text-[10px]">Invoice Number</span>
                                    <span className="font-mono font-bold text-[#705CF6] dark:text-[#A78BFA]">
                                        {recommendation.invoice.invoice_number}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-slate-400 block text-[10px]">Billed Amount</span>
                                    <span className="font-mono font-bold text-slate-900 dark:text-white">
                                        {formatMmk(recommendation.invoice.amount)} MMK
                                    </span>
                                </div>
                                <div>
                                    <span className="text-slate-400 block text-[10px]">Invoice Status</span>
                                    <span className="font-mono font-bold text-slate-700 dark:text-slate-300 uppercase">
                                        {recommendation.invoice.status}
                                    </span>
                                </div>
                            </div>

                            {/* Payment Slip Inspection */}
                            {latestSlip ? (
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                            <span>💳</span> Submitted Receipt Forensics
                                            <span className="text-[10px] uppercase font-mono font-bold text-[#705CF6]">
                                                {latestSlip.payment_channel}
                                            </span>
                                        </div>
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                            latestSlip.exif_tamper_flag || latestSlip.verification_status.includes('fraud') || latestSlip.verification_status.includes('tamper')
                                                ? 'bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400 border border-rose-300 dark:border-rose-800'
                                                : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800'
                                        }`}>
                                            {latestSlip.exif_tamper_flag ? '⚠️ TAMPERED / FORGED' : 'CLEAN / LEGIT'}
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        {/* Slip Thumbnail with zoom */}
                                        <div className="relative group rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-950 flex items-center justify-center max-h-48">
                                            <img
                                                src={getSlipUrl(latestSlip.image_path)}
                                                alt="Receipt Evidence"
                                                className="max-h-48 w-auto object-contain cursor-zoom-in group-hover:scale-105 transition duration-200"
                                                onClick={() => setZoomImage(getSlipUrl(latestSlip.image_path))}
                                            />
                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center pointer-events-none">
                                                <span className="text-white text-xs font-bold bg-black/70 px-2.5 py-1 rounded-lg">
                                                    🔍 Click to Zoom
                                                </span>
                                            </div>
                                        </div>

                                        {/* OCR Extracted Metadata Cards */}
                                        <div className="space-y-2 text-xs">
                                            <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-1">
                                                <div className="text-[10px] text-slate-400">OCR Transaction ID:</div>
                                                <div className="font-mono font-bold text-slate-900 dark:text-white">
                                                    {latestSlip.extracted_transaction_id || 'Not Detected'}
                                                </div>
                                            </div>
                                            <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-1">
                                                <div className="text-[10px] text-slate-400">OCR Extracted Amount:</div>
                                                <div className="font-mono font-bold text-slate-900 dark:text-white">
                                                    {formatMmk(latestSlip.extracted_amount)} MMK
                                                </div>
                                            </div>
                                            <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex justify-between items-center">
                                                <span className="text-[10px] text-slate-400">OCR Confidence:</span>
                                                <span className="font-mono font-bold text-[#705CF6]">
                                                    {latestSlip.ocr_confidence}%
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="p-4 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-center">
                                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                                        No Payment Slip Uploaded Yet
                                    </span>
                                    <p className="text-[11px] text-slate-400 mt-2">
                                        This flag was initiated based on customer behavior or direct invoice dispute.
                                    </p>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="p-4 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-center text-xs text-slate-400">
                            No specific invoice linked to this recommendation.
                        </div>
                    )}
                </div>

                {/* Footer Decisions */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800/80">
                    <button
                        type="button"
                        onClick={onClose}
                        className="w-full sm:w-auto px-4 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition text-center"
                    >
                        Close Dossier
                    </button>

                    {recommendation.status === 'pending' && (
                        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                            <button
                                type="button"
                                onClick={() => onDismiss(recommendation)}
                                className="flex-1 sm:flex-initial px-4 py-2 text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition"
                            >
                                Dismiss Recommendation
                            </button>
                            <button
                                type="button"
                                onClick={() => onApprove(recommendation)}
                                className="flex-1 sm:flex-initial px-4 py-2 text-xs font-bold rounded-xl bg-rose-600 hover:bg-rose-700 text-white transition shadow-sm"
                            >
                                Confirm & Enforce Blacklist
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Lightbox Zoom Modal */}
            {zoomImage && (
                <div
                    className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/90 cursor-zoom-out"
                    onClick={() => setZoomImage(null)}
                >
                    <div className="relative max-w-4xl max-h-[90vh]">
                        <img
                            src={zoomImage}
                            alt="Full Size Slip"
                            className="max-h-[85vh] w-auto rounded-2xl shadow-2xl border border-slate-700"
                        />
                        <button
                            type="button"
                            onClick={() => setZoomImage(null)}
                            className="absolute -top-3 -right-3 h-8 w-8 rounded-full bg-slate-900 border border-slate-700 text-white flex items-center justify-center text-sm font-bold shadow-lg"
                        >
                            ✕
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
