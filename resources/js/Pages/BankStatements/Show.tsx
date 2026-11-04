import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router, usePage } from '@inertiajs/react';
import React, { useState } from 'react';

interface BatchDetail {
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

interface BankTxItem {
    id: number;
    batch_id: number;
    payment_channel: string;
    bank_transaction_id: string;
    transaction_datetime: string;
    sender_phone: string | null;
    sender_name: string | null;
    gross_amount: string | number;
    fee_amount: string | number;
    net_amount: string | number;
    reference_note: string | null;
    match_status: string;
    raw_payload?: Record<string, any>;
}

interface PaginatedData<T> {
    data: T[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    links: { url: string | null; label: string; active: boolean }[];
}

interface Props {
    batch: BatchDetail;
    transactions: PaginatedData<BankTxItem>;
}

export default function Show({ batch, transactions }: Props) {
    const [inspectPayloadTx, setInspectPayloadTx] = useState<BankTxItem | null>(null);

    const formatMmk = (amount: string | number) => {
        const num = typeof amount === 'number' ? amount : parseFloat(amount);
        return isNaN(num) ? '0.00' : num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    const getChannelBadge = (ch: string, compact = false) => {
        const sizeClass = compact ? 'text-[10px] px-2 py-0.5' : 'text-xs px-2.5 py-0.5';
        switch (ch?.toLowerCase()) {
            case 'kbzpay':
                return (
                    <span className={`inline-flex items-center gap-1.5 rounded-full font-bold bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800 ${sizeClass}`}>
                        <span className="h-1.5 w-1.5 rounded-full bg-blue-600 dark:bg-blue-400"></span>
                        KBZPay
                    </span>
                );
            case 'wavepay':
                return (
                    <span className={`inline-flex items-center gap-1.5 rounded-full font-bold bg-amber-50 text-amber-800 border border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800 ${sizeClass}`}>
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-500 dark:bg-amber-400"></span>
                        WavePay
                    </span>
                );
            case 'cbpay':
                return (
                    <span className={`inline-flex items-center gap-1.5 rounded-full font-bold bg-red-50 text-red-700 border border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-800 ${sizeClass}`}>
                        <span className="h-1.5 w-1.5 rounded-full bg-red-600 dark:bg-red-400"></span>
                        CB Pay
                    </span>
                );
            case 'ayapay':
                return (
                    <span className={`inline-flex items-center gap-1.5 rounded-full font-bold bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-950 dark:text-purple-300 dark:border-purple-800 ${sizeClass}`}>
                        <span className="h-1.5 w-1.5 rounded-full bg-purple-600 dark:bg-purple-400"></span>
                        AYA Pay
                    </span>
                );
            default:
                return (
                    <span className={`inline-flex items-center gap-1.5 rounded-full font-bold bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 ${sizeClass}`}>
                        {ch}
                    </span>
                );
        }
    };

    const getMatchStatusBadge = (status: string) => {
        switch (status) {
            case 'matched':
                return (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/80 dark:text-emerald-300 dark:border-emerald-800">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400"></span>
                        Matched (100%)
                    </span>
                );
            case 'fuzzy_matched':
                return (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-sky-50 text-sky-700 border border-sky-200 dark:bg-sky-950/80 dark:text-sky-300 dark:border-sky-800">
                        <span className="h-1.5 w-1.5 rounded-full bg-sky-500 dark:bg-sky-400"></span>
                        Fuzzy Matched
                    </span>
                );
            case 'suspense':
                return (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-orange-50 text-orange-700 border border-orange-200 dark:bg-orange-950/80 dark:text-orange-300 dark:border-orange-800">
                        <span className="h-1.5 w-1.5 rounded-full bg-orange-500 dark:bg-orange-400"></span>
                        Suspense / Direct
                    </span>
                );
            case 'disputed':
                return (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-red-50 text-red-700 border border-red-200 dark:bg-red-950/80 dark:text-red-300 dark:border-red-800">
                        <span className="h-1.5 w-1.5 rounded-full bg-red-500 dark:bg-red-400"></span>
                        Disputed
                    </span>
                );
            default:
                return (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-yellow-50 text-yellow-800 border border-yellow-200 dark:bg-yellow-950/80 dark:text-yellow-300 dark:border-yellow-800">
                        <span className="h-1.5 w-1.5 rounded-full bg-yellow-500 dark:bg-yellow-400"></span>
                        Unmatched
                    </span>
                );
        }
    };

    const page = usePage();
    const isAdmin = (page.props as any).auth?.user?.roles?.includes('admin');

    const handleDeleteBatch = () => {
        if (confirm(`Are you sure you want to permanently purge batch "${batch.original_filename}"? All ${batch.total_records} transactions will be removed.`)) {
            router.delete(route('bank-statements.destroy', batch.id));
        }
    };

    const handleRequestRollback = () => {
        const reason = prompt(`Enter reason for requesting rollback of "${batch.original_filename}":`, 'Incorrect statement file / Duplicate batch uploaded');
        if (reason && reason.trim()) {
            router.post(route('bank-statements.request-rollback', batch.id), {
                reason: reason.trim(),
            });
        }
    };

    return (
        <AuthenticatedLayout
            header={
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <Link
                            href={route('bank-statements.index')}
                            className="inline-flex items-center justify-center h-8 w-8 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white transition"
                            title="Back to Batches"
                        >
                            &larr;
                        </Link>
                        <div>
                            <h2 className="text-xl font-bold leading-tight text-slate-900 dark:text-white flex items-center gap-2">
                                <span>📁</span> Batch #{batch.id}: {batch.original_filename}
                            </h2>
                            <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                                Ingested on {new Date(batch.created_at).toLocaleDateString()} by {batch.uploader?.name || 'System'}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        {getChannelBadge(batch.payment_channel)}
                        {isAdmin ? (
                            <button
                                onClick={handleDeleteBatch}
                                className={`inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
                                    batch.rollback_requested
                                        ? 'border-red-600 bg-red-900/80 text-white hover:bg-red-700 shadow-md'
                                        : 'border-red-900/60 bg-red-950/40 text-red-400 hover:bg-red-900/60 hover:text-red-200'
                                }`}
                            >
                                {batch.rollback_requested ? '⚠️ Approve & Purge Batch' : 'Purge Batch'}
                            </button>
                        ) : (
                            batch.rollback_requested ? (
                                <span className="inline-flex items-center gap-1 rounded-lg border border-amber-800/80 bg-amber-950/60 px-3 py-1.5 text-xs font-semibold text-amber-300">
                                    ⏳ Rollback Pending Approval
                                </span>
                            ) : (
                                <button
                                    onClick={handleRequestRollback}
                                    className="inline-flex items-center gap-1 rounded-lg border border-amber-900/60 bg-amber-950/40 px-3 py-1.5 text-xs font-semibold text-amber-400 hover:bg-amber-900/60 hover:text-amber-200 transition"
                                >
                                    Request Batch Rollback
                                </button>
                            )
                        )}
                    </div>
                </div>
            }
        >
            <Head title={`Batch #${batch.id} - ${batch.original_filename}`} />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-6">
                {/* Rollback Request Banner */}
                {batch.rollback_requested && (
                    <div className="rounded-xl border border-amber-500/40 bg-amber-950/40 p-4 text-xs text-amber-200 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-lg">
                        <div className="flex items-start gap-3">
                            <span className="text-xl">⚠️</span>
                            <div>
                                <h4 className="font-bold text-sm text-amber-300">
                                    Batch Rollback Request Pending Chief Auditor Approval
                                </h4>
                                <p className="mt-1 text-slate-300">
                                    <strong>Justification / Reason:</strong> {batch.rollback_reason}
                                </p>
                                <p className="mt-0.5 text-slate-400">
                                    Requested by {batch.rollback_requester?.name || 'Senior Accountant'} {batch.rollback_requested_at ? `on ${new Date(batch.rollback_requested_at).toLocaleString()}` : ''}
                                </p>
                            </div>
                        </div>
                        {isAdmin && (
                            <button
                                onClick={handleDeleteBatch}
                                className="self-start md:self-auto px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white font-bold text-xs shadow-md transition"
                            >
                                Approve & Purge Batch Now
                            </button>
                        )}
                    </div>
                )}

                {/* Batch Summary Metric Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#161B26] p-5 shadow-sm">
                        <div className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Total Transactions</div>
                        <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">{batch.total_records}</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">Parsed by {batch.payment_channel.toUpperCase()} adapter</div>
                    </div>
                    <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#161B26] p-5 shadow-sm">
                        <div className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Total Settled Volume</div>
                        <div className="text-2xl font-black text-[#705CF6] dark:text-[#8C7CFF] mt-1 font-mono">{formatMmk(batch.total_credit_amount)} <span className="text-xs text-slate-500 font-normal">MMK</span></div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">Gross credited amount</div>
                    </div>
                    <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#161B26] p-5 shadow-sm">
                        <div className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Statement Date</div>
                        <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{batch.statement_date}</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">Bank accounting value date</div>
                    </div>
                    <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#161B26] p-5 shadow-sm">
                        <div className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Ingestion Status</div>
                        <div className="text-2xl font-black text-slate-900 dark:text-white mt-1 uppercase text-sm tracking-wide flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                            {batch.status}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">Normalized into DB ledger</div>
                    </div>
                </div>

                {/* Parsed Transactions Table */}
                <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#161B26] p-6 shadow-sm space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-4">
                        <div>
                            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <span>📋</span> Parsed Bank Statement Transactions
                            </h3>
                            <p className="text-xs text-slate-600 dark:text-slate-400">
                                Normalized row items ready for 3-way reconciliation against customer slips and invoices
                            </p>
                        </div>
                        <span className="text-xs text-slate-600 dark:text-slate-400 font-mono">
                            {transactions.total} rows total
                        </span>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full table-auto text-left text-xs">
                            <thead className="bg-slate-50 dark:bg-slate-900/80 text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800 uppercase tracking-wider font-semibold">
                                <tr>
                                    <th className="px-3 py-2.5">Bank Transaction ID</th>
                                    <th className="px-3 py-2.5">Datetime</th>
                                    <th className="px-3 py-2.5">Sender Name & Phone</th>
                                    <th className="px-3 py-2.5 text-right">Gross (MMK)</th>
                                    <th className="px-3 py-2.5 text-right">Fee (MMK)</th>
                                    <th className="px-3 py-2.5 text-right">Net Settled (MMK)</th>
                                    <th className="px-3 py-2.5">Narrative / Remark</th>
                                    <th className="px-3 py-2.5">Match Status</th>
                                    <th className="px-3 py-2.5 text-center">Payload</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                                {transactions.data.length === 0 ? (
                                    <tr>
                                        <td colSpan={9} className="px-4 py-8 text-center text-slate-500">
                                            No transactions found in this batch.
                                        </td>
                                    </tr>
                                ) : (
                                    transactions.data.map((tx) => (
                                        <tr key={tx.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                                            <td className="px-3 py-2.5 font-mono text-[11px] font-bold text-slate-900 dark:text-slate-200 tracking-tight select-all">
                                                {tx.bank_transaction_id}
                                            </td>
                                            <td className="px-3 py-2.5 text-xs text-slate-600 dark:text-slate-400 whitespace-nowrap">
                                                {tx.transaction_datetime}
                                            </td>
                                            <td className="px-3 py-2.5">
                                                <div className="font-semibold text-slate-900 dark:text-slate-200 text-xs">{tx.sender_name || '—'}</div>
                                                <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">{tx.sender_phone || '—'}</div>
                                            </td>
                                            <td className="px-3 py-2.5 text-right font-mono text-slate-700 dark:text-slate-300">
                                                {formatMmk(tx.gross_amount)}
                                            </td>
                                            <td className="px-3 py-2.5 text-right font-mono text-amber-600 dark:text-amber-400">
                                                {formatMmk(tx.fee_amount)}
                                            </td>
                                            <td className="px-3 py-2.5 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                                                {formatMmk(tx.net_amount)}
                                            </td>
                                            <td className="px-3 py-2.5 text-xs text-slate-600 dark:text-slate-300 truncate max-w-[180px]" title={tx.reference_note || ''}>
                                                {tx.reference_note || '—'}
                                            </td>
                                            <td className="px-3 py-2.5 whitespace-nowrap">
                                                {getMatchStatusBadge(tx.match_status)}
                                            </td>
                                            <td className="px-3 py-2.5 text-center">
                                                <button
                                                    type="button"
                                                    onClick={() => setInspectPayloadTx(tx)}
                                                    className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white border border-slate-300 dark:border-slate-700 transition"
                                                    title="View raw CSV adapter payload"
                                                >
                                                    JSON
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {transactions.links && transactions.links.length > 3 && (
                        <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800/80 pt-4 mt-2 text-xs">
                            <span className="text-slate-600 dark:text-slate-400">
                                Page {transactions.current_page} of {transactions.last_page} ({transactions.total} records)
                            </span>
                            <div className="flex items-center gap-1">
                                {transactions.links.map((link, i) => (
                                    <Link
                                        key={i}
                                        href={link.url || '#'}
                                        preserveScroll
                                        dangerouslySetInnerHTML={{ __html: link.label }}
                                        className={`px-3 py-1 rounded-xl border ${
                                            link.active
                                                ? 'bg-[#705CF6] border-[#705CF6] text-white font-bold'
                                                : link.url
                                                ? 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                                                : 'border-slate-200 dark:border-slate-800 bg-slate-100/50 dark:bg-slate-900/50 text-slate-400 cursor-not-allowed'
                                        }`}
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Raw Payload Modal */}
            {inspectPayloadTx && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                    <div className="relative w-full max-w-xl rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
                            <div className="flex items-center gap-2">
                                <span className="font-mono text-xs font-bold text-indigo-400">
                                    {inspectPayloadTx.bank_transaction_id}
                                </span>
                                <span className="text-xs text-slate-400">Raw Adapter Payload</span>
                            </div>
                            <button
                                onClick={() => setInspectPayloadTx(null)}
                                className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="space-y-3">
                            <div className="text-xs text-slate-400">
                                Original CSV row extracted and normalized by <span className="text-white font-semibold uppercase">{inspectPayloadTx.payment_channel}</span> adapter:
                            </div>
                            <pre className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11px] font-mono text-emerald-300 overflow-x-auto max-h-80">
                                {JSON.stringify(inspectPayloadTx.raw_payload || inspectPayloadTx, null, 2)}
                            </pre>
                        </div>

                        <div className="mt-5 flex justify-end">
                            <button
                                onClick={() => setInspectPayloadTx(null)}
                                className="rounded-xl bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700 hover:text-white transition"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </AuthenticatedLayout>
    );
}
