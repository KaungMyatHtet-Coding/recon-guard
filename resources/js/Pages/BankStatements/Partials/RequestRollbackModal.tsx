import React, { FormEvent, useEffect } from 'react';
import { useForm } from '@inertiajs/react';

interface BatchItem {
    id: number;
    payment_channel: string;
    original_filename: string;
    statement_date: string;
    total_records: number;
    total_credit_amount: string | number;
    status: string;
    created_at: string;
    rollback_requested?: boolean;
    rollback_reason?: string | null;
    rollback_requested_at?: string | null;
    uploader?: {
        id: number;
        name: string;
        email: string;
    };
    rollback_requester?: {
        id: number;
        name: string;
        email: string;
    };
}

interface Props {
    show: boolean;
    batch: BatchItem | null;
    onClose: () => void;
}

export default function RequestRollbackModal({ show, batch, onClose }: Props) {
    const { data, setData, post, processing, errors, reset } = useForm({
        reason: 'Incorrect statement file / Duplicate batch uploaded',
    });

    useEffect(() => {
        if (show) {
            setData('reason', 'Incorrect statement file / Duplicate batch uploaded');
        }
    }, [show, batch?.id]);

    if (!show || !batch) return null;

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        if (!data.reason.trim()) return;

        post(route('bank-statements.request-rollback', batch.id), {
            preserveScroll: true,
            onSuccess: () => {
                reset();
                onClose();
            },
        });
    };

    const formatMmk = (amount: string | number) => {
        const num = typeof amount === 'number' ? amount : parseFloat(amount);
        return isNaN(num) ? '0.00' : num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <div className="w-full max-w-lg rounded-3xl bg-white dark:bg-[#161B26] border border-slate-200 dark:border-slate-800 p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
                {/* Modal Header */}
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-3">
                    <div className="flex items-center gap-2.5">
                        <span className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold text-sm">
                            ⚠️
                        </span>
                        <div>
                            <h3 className="text-base font-bold text-slate-900 dark:text-white">
                                Request Statement Batch Rollback
                            </h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                Maker-Checker Governance: Requires Chief Auditor Approval
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-slate-400 hover:text-slate-600 dark:hover:text-white text-sm p-1 rounded-lg"
                    >
                        ✕
                    </button>
                </div>

                {/* Target Batch Info Dossier */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 space-y-2 text-xs">
                    <div className="flex justify-between items-center">
                        <span className="text-slate-500 dark:text-slate-400">Target Statement File:</span>
                        <span className="font-mono font-bold text-slate-900 dark:text-white truncate max-w-[240px]" title={batch.original_filename}>
                            {batch.original_filename}
                        </span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-slate-500 dark:text-slate-400">Channel / Batch ID:</span>
                        <span className="font-bold uppercase text-[#705CF6]">
                            {batch.payment_channel} · #{batch.id}
                        </span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-slate-500 dark:text-slate-400">Uploaded Timestamp:</span>
                        <span className="font-mono text-slate-700 dark:text-slate-300">
                            {batch.created_at}
                        </span>
                    </div>
                    <div className="flex justify-between items-center pt-1 border-t border-slate-200/60 dark:border-slate-800/60">
                        <span className="text-slate-500 dark:text-slate-400">Affected Records & Volume:</span>
                        <span className="font-mono font-bold text-slate-900 dark:text-white">
                            {batch.total_records} txns ({formatMmk(batch.total_credit_amount)} MMK)
                        </span>
                    </div>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                            Mandatory Justification / Reason for Rollback <span className="text-rose-500">*</span>
                        </label>
                        <textarea
                            rows={3}
                            value={data.reason}
                            onChange={(e) => setData('reason', e.target.value)}
                            placeholder="Explain why this statement file must be permanently removed from the ledger..."
                            required
                            className="w-full rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:border-[#705CF6] focus:ring-1 focus:ring-[#705CF6]"
                        />
                        {errors.reason && (
                            <p className="text-[11px] text-rose-500 mt-1">{errors.reason}</p>
                        )}
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                            This reason will be reviewed by the Chief Auditor in the Pending Rollbacks Queue before ledger purge execution.
                        </p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800/80">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={processing || !data.reason.trim()}
                            className="px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition shadow-xs disabled:opacity-50 flex items-center gap-1.5"
                        >
                            <span>⚠️</span>
                            <span>{processing ? 'Submitting...' : 'Submit Rollback Request'}</span>
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
