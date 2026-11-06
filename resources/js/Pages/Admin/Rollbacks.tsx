import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router } from '@inertiajs/react';
import React, { useState } from 'react';

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
    pendingBatches: BatchItem[];
    stats: {
        pending_count: number;
        total_affected_credit: number;
        total_affected_records: number;
    };
}

export default function Rollbacks({ pendingBatches, stats }: Props) {
    const [processingId, setProcessingId] = useState<number | null>(null);

    const formatMmk = (amount: string | number) => {
        const num = typeof amount === 'number' ? amount : parseFloat(amount);
        return isNaN(num) ? '0.00' : num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    const handleApprove = (batch: BatchItem) => {
        if (confirm(`MAKER-CHECKER PURGE CONFIRMATION:\n\nAre you sure you want to approve rollback and PERMANENTLY PURGE batch "${batch.original_filename}"?\n\nThis will permanently delete ${batch.total_records} bank transactions (${formatMmk(batch.total_credit_amount)} MMK) from the official ledger.`)) {
            setProcessingId(batch.id);
            router.delete(route('admin.rollbacks.approve', batch.id), {
                preserveScroll: true,
                onFinish: () => setProcessingId(null),
            });
        }
    };

    const handleDismiss = (batch: BatchItem) => {
        if (confirm(`Dismiss rollback request for batch "${batch.original_filename}"?\n\nThe batch will remain active in the ledger.`)) {
            setProcessingId(batch.id);
            router.patch(route('admin.rollbacks.dismiss', batch.id), {}, {
                preserveScroll: true,
                onFinish: () => setProcessingId(null),
            });
        }
    };

    const getChannelBadge = (ch: string) => {
        switch (ch?.toLowerCase()) {
            case 'kbzpay':
                return (
                    <span className="inline-flex items-center gap-1 rounded-full font-bold bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/80 dark:text-blue-300 dark:border-blue-800 text-xs px-2.5 py-0.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-blue-600 dark:bg-blue-400"></span>
                        KBZPay
                    </span>
                );
            case 'wavepay':
                return (
                    <span className="inline-flex items-center gap-1 rounded-full font-bold bg-amber-50 text-amber-800 border border-amber-200 dark:bg-amber-950/80 dark:text-amber-300 dark:border-amber-800 text-xs px-2.5 py-0.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-500 dark:bg-amber-400"></span>
                        WavePay
                    </span>
                );
            case 'cbpay':
                return (
                    <span className="inline-flex items-center gap-1 rounded-full font-bold bg-red-50 text-red-700 border border-red-200 dark:bg-red-950/80 dark:text-red-300 dark:border-red-800 text-xs px-2.5 py-0.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-red-600 dark:bg-red-400"></span>
                        CB Pay
                    </span>
                );
            case 'ayapay':
                return (
                    <span className="inline-flex items-center gap-1 rounded-full font-bold bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-950/80 dark:text-purple-300 dark:border-purple-800 text-xs px-2.5 py-0.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-purple-600 dark:bg-purple-400"></span>
                        AYA Pay
                    </span>
                );
            default:
                return (
                    <span className="inline-flex items-center gap-1 rounded-full font-bold bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 text-xs px-2.5 py-0.5">
                        {ch}
                    </span>
                );
        }
    };

    return (
        <AuthenticatedLayout
            header={
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="p-1.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold text-sm">
                                ⏳
                            </span>
                            <h2 className="text-xl font-bold leading-tight text-slate-900 dark:text-white">
                                Pending Rollbacks Queue
                            </h2>
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700">
                                Maker-Checker Review
                            </span>
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                            Review and authorize batch purge requests submitted by Senior Accountants before permanent ledger deletion
                        </p>
                    </div>

                    <Link
                        href={route('admin.dashboard')}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                    >
                        <span>←</span>
                        <span>Governance Suite</span>
                    </Link>
                </div>
            }
        >
            <Head title="Pending Rollbacks Queue - Chief Auditor Governance" />

            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-6">
                {/* Governance Context Alert */}
                <div className="rounded-2xl border border-amber-200/80 dark:border-amber-800/60 bg-amber-50/70 dark:bg-amber-950/20 p-4 text-xs flex items-start gap-3">
                    <span className="text-base shrink-0">🛡️</span>
                    <div className="space-y-1">
                        <div className="font-bold text-amber-900 dark:text-amber-300">
                            Strict Maker-Checker Separation of Duties
                        </div>
                        <p className="text-amber-800/90 dark:text-amber-400/90 leading-relaxed">
                            Under financial governance protocols, operational accountants can only request a rollback. Only the Chief Auditor has cryptographic authority to approve and permanently purge statement records from the ledger.
                        </p>
                    </div>
                </div>

                {/* Summary Metric Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#161B26] p-5 shadow-sm">
                        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
                            <span>Pending Purge Requests</span>
                            <span className="text-amber-500 font-bold">⏳</span>
                        </div>
                        <div className="text-2xl font-black text-slate-900 dark:text-white">
                            {stats.pending_count}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                            {stats.pending_count > 0 ? 'Awaiting Chief Auditor decision' : 'Queue is currently clear'}
                        </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#161B26] p-5 shadow-sm">
                        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
                            <span>Targeted Credit Volume</span>
                            <span className="text-[#705CF6] font-bold">💳</span>
                        </div>
                        <div className="text-2xl font-black text-[#705CF6] font-mono">
                            {formatMmk(stats.total_affected_credit)} MMK
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                            Total volume subject to rollback
                        </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#161B26] p-5 shadow-sm">
                        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
                            <span>Affected Transaction Rows</span>
                            <span className="text-indigo-400 font-bold">📑</span>
                        </div>
                        <div className="text-2xl font-black text-slate-900 dark:text-white font-mono">
                            {stats.total_affected_records}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                            Total ledger entries in requested batches
                        </div>
                    </div>
                </div>

                {/* Queue Table */}
                <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#161B26] p-6 shadow-sm space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-4">
                        <div>
                            <h3 className="text-base font-bold text-slate-900 dark:text-white">
                                Statement Batches Awaiting Purge Authorization
                            </h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                Authorize permanent deletion or dismiss the request to maintain ledger integrity
                            </p>
                        </div>
                        <span className="text-xs font-mono text-slate-500">
                            {pendingBatches.length} item{pendingBatches.length === 1 ? '' : 's'}
                        </span>
                    </div>

                    {pendingBatches.length === 0 ? (
                        <div className="py-12 text-center space-y-3">
                            <div className="w-16 h-16 mx-auto rounded-3xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-3xl shadow-xs">
                                🛡️
                            </div>
                            <div>
                                <h4 className="text-base font-bold text-slate-900 dark:text-white">
                                    No Pending Rollback Requests
                                </h4>
                                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mt-1 leading-relaxed">
                                    All bank statement ledgers are currently immutable and verified. When Senior Accountants submit rollback requests, they will appear here for your review and execution.
                                </p>
                            </div>
                            <div className="pt-2">
                                <Link
                                    href={route('admin.dashboard')}
                                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
                                >
                                    Return to Governance Dashboard
                                </Link>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {pendingBatches.map((b) => (
                                <div
                                    key={b.id}
                                    className="rounded-2xl border border-amber-200/80 dark:border-amber-900/60 bg-amber-50/30 dark:bg-amber-950/10 p-5 space-y-4 hover:border-amber-300 dark:hover:border-amber-800 transition"
                                >
                                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                                        <div className="space-y-1.5">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="font-mono font-bold text-xs px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                                                    Batch #{b.id}
                                                </span>
                                                {getChannelBadge(b.payment_channel)}
                                                <h4 className="text-sm font-bold text-slate-900 dark:text-white font-mono">
                                                    {b.original_filename}
                                                </h4>
                                            </div>

                                            <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                                                <span>
                                                    Uploaded: <span className="font-mono text-slate-700 dark:text-slate-300">{b.created_at}</span>
                                                </span>
                                                <span>·</span>
                                                <span>
                                                    Records: <span className="font-bold text-slate-900 dark:text-white font-mono">{b.total_records} txns</span>
                                                </span>
                                                <span>·</span>
                                                <span>
                                                    Credit Volume: <span className="font-bold text-[#705CF6] font-mono">{formatMmk(b.total_credit_amount)} MMK</span>
                                                </span>
                                            </div>
                                        </div>

                                        <div className="text-xs sm:text-right shrink-0">
                                            <div className="text-[11px] text-slate-500 dark:text-slate-400">Requested By:</div>
                                            <div className="font-bold text-slate-900 dark:text-white">
                                                {b.rollback_requester?.name || 'Senior Accountant'}
                                            </div>
                                            <div className="text-[11px] font-mono text-slate-500">
                                                {b.rollback_requested_at || 'Recently'}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Justification Box */}
                                    <div className="p-3.5 rounded-xl bg-white dark:bg-[#161B26] border border-amber-200 dark:border-amber-800/80 text-xs space-y-1">
                                        <div className="font-bold text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
                                            <span>📝</span>
                                            <span>Accountant's Mandatory Justification:</span>
                                        </div>
                                        <p className="text-slate-700 dark:text-slate-300 leading-relaxed font-sans">
                                            "{b.rollback_reason || 'No detailed reason provided'}"
                                        </p>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex items-center justify-between pt-2 border-t border-amber-200/60 dark:border-amber-900/40 text-xs">
                                        <Link
                                            href={route('bank-statements.show', b.id)}
                                            className="text-[#705CF6] hover:underline font-semibold"
                                        >
                                            Inspect Statement Records ({b.total_records}) →
                                        </Link>

                                        <div className="flex items-center gap-2">
                                            <button
                                                type="button"
                                                disabled={processingId === b.id}
                                                onClick={() => handleDismiss(b)}
                                                className="px-3.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold transition disabled:opacity-50"
                                            >
                                                Dismiss Request
                                            </button>
                                            <button
                                                type="button"
                                                disabled={processingId === b.id}
                                                onClick={() => handleApprove(b)}
                                                className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold transition shadow-xs disabled:opacity-50 flex items-center gap-1.5"
                                            >
                                                <span>⚠️</span>
                                                <span>{processingId === b.id ? 'Purging Batch...' : 'Approve & Purge Batch'}</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
