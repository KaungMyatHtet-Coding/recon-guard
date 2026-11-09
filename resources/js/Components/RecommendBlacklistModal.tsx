import React from 'react';
import { useForm } from '@inertiajs/react';

interface RecommendBlacklistModalProps {
    show: boolean;
    onClose: () => void;
    customerName?: string;
    customerPhone?: string;
    targetUserId?: number | null;
    invoiceId?: number | null;
    initialReason?: string;
}

export default function RecommendBlacklistModal({
    show,
    onClose,
    customerName = '',
    customerPhone = '',
    targetUserId = null,
    invoiceId = null,
    initialReason = '',
}: RecommendBlacklistModalProps) {
    const { data, setData, post, processing, errors, reset } = useForm({
        customer_name: customerName,
        customer_phone: customerPhone,
        target_user_id: targetUserId,
        invoice_id: invoiceId,
        reason: initialReason,
    });

    // Update state when modal opens or props change
    React.useEffect(() => {
        if (show) {
            setData({
                customer_name: customerName,
                customer_phone: customerPhone,
                target_user_id: targetUserId,
                invoice_id: invoiceId,
                reason: initialReason || data.reason,
            });
        }
    }, [show, customerName, customerPhone, targetUserId, invoiceId]);

    if (!show) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post(route('reconciliation.recommend-blacklist'), {
            preserveScroll: true,
            onSuccess: () => {
                reset();
                onClose();
            },
        });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
            <div className="relative w-full max-w-lg rounded-2xl border border-rose-200 dark:border-rose-900/50 bg-white dark:bg-[#161B26] p-6 shadow-2xl transition-all">
                {/* Header */}
                <div className="flex items-start justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-800 flex items-center justify-center text-rose-600 dark:text-rose-400 text-lg">
                            🚩
                        </div>
                        <div>
                            <h3 className="text-base font-bold text-slate-900 dark:text-white">
                                Flag for Blacklist (Four-Eyes Engine)
                            </h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                Submit a recommendation for Chief Auditor review and enforcement
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition"
                    >
                        ✕
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="mt-4 space-y-4">
                    <div className="rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 p-3 text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
                        <strong>🛡️ Four-Eyes Policy:</strong> Submitting this flag routes the recommendation directly to the Chief Auditor's authorization queue. Once approved, the target phone number and user account will be immediately barred from public invoice payments and slip submissions.
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                            Customer Name <span className="text-rose-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={data.customer_name}
                            onChange={(e) => setData('customer_name', e.target.value)}
                            required
                            placeholder="e.g. Daw Aye Aye Win or Guest"
                            className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:border-rose-500 focus:ring-1 focus:ring-rose-500"
                        />
                        {errors.customer_name && (
                            <p className="text-[11px] text-rose-500 mt-1">{errors.customer_name}</p>
                        )}
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                            Customer Phone / Mobile Wallet <span className="text-rose-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={data.customer_phone}
                            onChange={(e) => setData('customer_phone', e.target.value)}
                            required
                            placeholder="e.g. 09123456789"
                            className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-mono text-slate-900 dark:text-slate-100 focus:border-rose-500 focus:ring-1 focus:ring-rose-500"
                        />
                        {errors.customer_phone && (
                            <p className="text-[11px] text-rose-500 mt-1">{errors.customer_phone}</p>
                        )}
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                            Audit Justification & Forensic Evidence <span className="text-rose-500">*</span>
                        </label>
                        <textarea
                            rows={3}
                            value={data.reason}
                            onChange={(e) => setData('reason', e.target.value)}
                            required
                            placeholder="Provide details on the forgery, duplicate TxID reuse, photoshopped slip metadata, or unverified claims..."
                            className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:border-rose-500 focus:ring-1 focus:ring-rose-500"
                        />
                        {errors.reason && (
                            <p className="text-[11px] text-rose-500 mt-1">{errors.reason}</p>
                        )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 rounded-xl text-xs font-medium bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={processing}
                            className="px-4 py-2 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white shadow-sm transition disabled:opacity-50 flex items-center gap-1.5"
                        >
                            {processing ? (
                                <span>Submitting...</span>
                            ) : (
                                <>
                                    <span>🚩 Submit to Chief Auditor</span>
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
