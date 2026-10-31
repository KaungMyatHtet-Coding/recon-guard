import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router } from '@inertiajs/react';
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
    uploader?: {
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

    const getChannelBadge = (ch: string) => {
        switch (ch?.toLowerCase()) {
            case 'kbzpay':
                return (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-950 text-blue-300 border border-blue-800">
                        <span className="h-2 w-2 rounded-full bg-blue-400"></span>
                        KBZPay Merchant Statement
                    </span>
                );
            case 'wavepay':
                return (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-950 text-amber-300 border border-amber-800">
                        <span className="h-2 w-2 rounded-full bg-amber-400"></span>
                        WavePay Settlement CSV
                    </span>
                );
            case 'cbpay':
                return (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-950 text-rose-300 border border-rose-800">
                        <span className="h-2 w-2 rounded-full bg-rose-400"></span>
                        CB Pay Corporate Statement
                    </span>
                );
            case 'ayapay':
                return (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-950 text-red-300 border border-red-800">
                        <span className="h-2 w-2 rounded-full bg-red-400"></span>
                        AYA Pay Merchant Report
                    </span>
                );
            default:
                return (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-800 text-slate-300 border border-slate-700">
                        {ch}
                    </span>
                );
        }
    };

    const getMatchStatusBadge = (status: string) => {
        switch (status) {
            case 'matched':
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-semibold bg-emerald-950/80 text-emerald-300 border border-emerald-800">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
                        Matched
                    </span>
                );
            case 'fuzzy_matched':
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-semibold bg-sky-950/80 text-sky-300 border border-sky-800">
                        <span className="h-1.5 w-1.5 rounded-full bg-sky-400"></span>
                        Fuzzy Matched
                    </span>
                );
            case 'suspense':
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-semibold bg-orange-950/80 text-orange-300 border border-orange-800">
                        <span className="h-1.5 w-1.5 rounded-full bg-orange-400"></span>
                        Suspense
                    </span>
                );
            case 'disputed':
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-semibold bg-red-950/80 text-red-300 border border-red-800">
                        <span className="h-1.5 w-1.5 rounded-full bg-red-400"></span>
                        Disputed
                    </span>
                );
            default:
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-semibold bg-yellow-950/80 text-yellow-300 border border-yellow-800">
                        <span className="h-1.5 w-1.5 rounded-full bg-yellow-400"></span>
                        Unmatched
                    </span>
                );
        }
    };

    const handleDeleteBatch = () => {
        if (confirm(`Are you sure you want to delete batch "${batch.original_filename}"? All ${batch.total_records} transactions will be removed.`)) {
            router.delete(route('bank-statements.destroy', batch.id));
        }
    };

    return (
        <AuthenticatedLayout
            header={
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <Link
                            href={route('bank-statements.index')}
                            className="inline-flex items-center justify-center h-8 w-8 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white transition"
                            title="Back to Batches"
                        >
                            &larr;
                        </Link>
                        <div>
                            <h2 className="text-xl font-bold leading-tight text-white flex items-center gap-2">
                                <span>📁</span> Batch #{batch.id}: {batch.original_filename}
                            </h2>
                            <p className="text-xs text-slate-400 mt-0.5">
                                Ingested on {new Date(batch.created_at).toLocaleDateString()} by {batch.uploader?.name || 'System'}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        {getChannelBadge(batch.payment_channel)}
                        <button
                            onClick={handleDeleteBatch}
                            className="inline-flex items-center gap-1 rounded-lg border border-red-900/60 bg-red-950/40 px-3 py-1.5 text-xs font-semibold text-red-400 hover:bg-red-900/60 hover:text-red-200 transition"
                        >
                            Rollback Batch
                        </button>
                    </div>
                </div>
            }
        >
            <Head title={`Batch #${batch.id} - ${batch.original_filename}`} />

            <div className="py-6 space-y-6">
                {/* Batch Summary Metric Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="rounded-xl border border-slate-800 bg-slate-850/60 p-4 backdrop-blur shadow-sm">
                        <div className="text-xs font-medium text-slate-400 uppercase tracking-wider">Total Transactions</div>
                        <div className="text-2xl font-black text-white mt-1">{batch.total_records}</div>
                        <div className="text-xs text-slate-500 mt-1">Parsed by {batch.payment_channel.toUpperCase()} adapter</div>
                    </div>
                    <div className="rounded-xl border border-slate-800 bg-slate-850/60 p-4 backdrop-blur shadow-sm">
                        <div className="text-xs font-medium text-slate-400 uppercase tracking-wider">Total Settled Volume</div>
                        <div className="text-2xl font-black text-indigo-400 mt-1">{formatMmk(batch.total_credit_amount)} <span className="text-xs text-slate-400 font-normal">MMK</span></div>
                        <div className="text-xs text-slate-500 mt-1">Gross credited amount</div>
                    </div>
                    <div className="rounded-xl border border-slate-800 bg-slate-850/60 p-4 backdrop-blur shadow-sm">
                        <div className="text-xs font-medium text-slate-400 uppercase tracking-wider">Statement Date</div>
                        <div className="text-2xl font-black text-emerald-400 mt-1">{batch.statement_date}</div>
                        <div className="text-xs text-slate-500 mt-1">Bank accounting value date</div>
                    </div>
                    <div className="rounded-xl border border-slate-800 bg-slate-850/60 p-4 backdrop-blur shadow-sm">
                        <div className="text-xs font-medium text-slate-400 uppercase tracking-wider">Ingestion Status</div>
                        <div className="text-2xl font-black text-slate-200 mt-1 uppercase text-sm tracking-wide flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full bg-emerald-400"></span>
                            {batch.status}
                        </div>
                        <div className="text-xs text-slate-500 mt-1">Normalized into DB ledger</div>
                    </div>
                </div>

                {/* Parsed Transactions Table */}
                <div className="rounded-2xl border border-slate-800 bg-slate-850/60 p-6 backdrop-blur shadow-xl space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                        <div>
                            <h3 className="text-base font-bold text-white flex items-center gap-2">
                                <span>📋</span> Parsed Bank Statement Transactions
                            </h3>
                            <p className="text-xs text-slate-400">
                                Normalized row items ready for 3-way reconciliation against customer slips and invoices
                            </p>
                        </div>
                        <span className="text-xs text-slate-400 font-mono">
                            {transactions.total} rows total
                        </span>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                            <thead className="bg-slate-900/80 text-slate-400 border-b border-slate-800 uppercase tracking-wider font-semibold">
                                <tr>
                                    <th className="px-4 py-3">Bank Transaction ID</th>
                                    <th className="px-4 py-3">Datetime</th>
                                    <th className="px-4 py-3">Sender Name & Phone</th>
                                    <th className="px-4 py-3 text-right">Gross (MMK)</th>
                                    <th className="px-4 py-3 text-right">Fee (MMK)</th>
                                    <th className="px-4 py-3 text-right">Net Settled (MMK)</th>
                                    <th className="px-4 py-3">Narrative / Remark</th>
                                    <th className="px-4 py-3">Match Status</th>
                                    <th className="px-4 py-3 text-center">Payload</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800">
                                {transactions.data.length === 0 ? (
                                    <tr>
                                        <td colSpan={9} className="px-4 py-8 text-center text-slate-500">
                                            No transactions found in this batch.
                                        </td>
                                    </tr>
                                ) : (
                                    transactions.data.map((tx) => (
                                        <tr key={tx.id} className="hover:bg-slate-800/40 transition">
                                            <td className="px-4 py-3 font-mono font-bold text-slate-200">
                                                {tx.bank_transaction_id}
                                            </td>
                                            <td className="px-4 py-3 text-slate-400 whitespace-nowrap">
                                                {tx.transaction_datetime}
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="font-semibold text-slate-200">{tx.sender_name || '—'}</div>
                                                <div className="text-[11px] text-slate-400 font-mono">{tx.sender_phone || '—'}</div>
                                            </td>
                                            <td className="px-4 py-3 text-right font-mono text-slate-300">
                                                {formatMmk(tx.gross_amount)}
                                            </td>
                                            <td className="px-4 py-3 text-right font-mono text-amber-400">
                                                {formatMmk(tx.fee_amount)}
                                            </td>
                                            <td className="px-4 py-3 text-right font-mono font-bold text-emerald-400">
                                                {formatMmk(tx.net_amount)}
                                            </td>
                                            <td className="px-4 py-3 text-slate-300 max-w-xs truncate" title={tx.reference_note || ''}>
                                                {tx.reference_note || '—'}
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap">
                                                {getMatchStatusBadge(tx.match_status)}
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <button
                                                    type="button"
                                                    onClick={() => setInspectPayloadTx(tx)}
                                                    className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white border border-slate-700"
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
                        <div className="flex items-center justify-between border-t border-slate-800 pt-4 mt-2 text-xs">
                            <span className="text-slate-400">
                                Page {transactions.current_page} of {transactions.last_page} ({transactions.total} records)
                            </span>
                            <div className="flex items-center gap-1">
                                {transactions.links.map((link, i) => (
                                    <Link
                                        key={i}
                                        href={link.url || '#'}
                                        preserveScroll
                                        dangerouslySetInnerHTML={{ __html: link.label }}
                                        className={`px-3 py-1 rounded-lg border ${
                                            link.active
                                                ? 'bg-indigo-600 border-indigo-500 text-white font-bold'
                                                : link.url
                                                ? 'border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800'
                                                : 'border-slate-800 bg-slate-900/50 text-slate-600 cursor-not-allowed'
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
