import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import React, { useState } from 'react';

interface InvoiceData {
    id: number;
    invoice_number: string;
    customer_name: string;
    customer_phone: string;
    description: string;
    amount: string | number;
    expected_channel: string;
    status: string;
    customer?: {
        id: number;
        name: string;
        email: string;
    };
}

interface PaymentSlipData {
    id: number;
    payment_channel: string;
    image_path: string;
    image_hash: string;
    extracted_transaction_id: string;
    extracted_amount: string | number;
    extracted_datetime: string | null;
    sender_phone: string | null;
    sender_name: string | null;
    ocr_confidence: number;
    exif_tamper_flag: boolean;
    exif_metadata: Record<string, any> | null;
    verification_status: string;
}

interface BankTxData {
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
    batch?: {
        id: number;
        original_filename: string;
    };
}

interface MatchRecord {
    id: number;
    invoice_id: number | null;
    payment_slip_id: number | null;
    bank_transaction_id: number | null;
    reconciled_by: number | null;
    match_type: string;
    confidence_score: string | number;
    invoice_amount: string | number | null;
    slip_amount: string | number | null;
    bank_amount: string | number | null;
    variance_amount: string | number;
    notes: string | null;
    status: string;
    created_at: string;
    invoice?: InvoiceData | null;
    payment_slip?: PaymentSlipData | null;
    bank_transaction?: BankTxData | null;
    auditor?: {
        id: number;
        name: string;
        email: string;
    } | null;
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
    metrics: {
        total_invoices: number;
        reconciled_invoices: number;
        reconciliation_rate: number;
        auto_approved_volume: number;
        formatted_auto_approved_volume: string;
        pending_reviews_count: number;
        fraud_alerts_count: number;
        suspense_txns_count: number;
        suspense_volume: number;
        formatted_suspense_volume: string;
    };
    matches: PaginatedData<MatchRecord>;
    suspenseItems: PaginatedData<BankTxData>;
    filters: {
        tab: string;
        channel: string;
        search: string;
    };
}

export default function Index({ metrics, matches, suspenseItems, filters }: Props) {
    const page = usePage();
    const flash = (page.props as any).flash || {};

    const [currentTab, setCurrentTab] = useState<string>(filters.tab || 'all');
    const [currentChannel, setCurrentChannel] = useState<string>(filters.channel || 'all');
    const [searchTerm, setSearchTerm] = useState<string>(filters.search || '');
    const [runChannel, setRunChannel] = useState<string>('all');
    const [isRunning, setIsRunning] = useState<boolean>(false);

    // Modal state for 3-Way Comparison
    const [activeCompareMatch, setActiveCompareMatch] = useState<MatchRecord | null>(null);

    // Rejection prompt state
    const [rejectingMatch, setRejectingMatch] = useState<MatchRecord | null>(null);
    const [rejectReason, setRejectReason] = useState<string>('');
    const [approveNote, setApproveNote] = useState<string>('');

    const handleFilterSubmit = (tabVal?: string, chVal?: string, searchVal?: string) => {
        const query: Record<string, string> = {};
        const t = tabVal !== undefined ? tabVal : currentTab;
        const c = chVal !== undefined ? chVal : currentChannel;
        const s = searchVal !== undefined ? searchVal : searchTerm;

        if (t && t !== 'all') query.tab = t;
        if (c && c !== 'all') query.channel = c;
        if (s && s.trim()) query.search = s.trim();

        router.get(route('reconciliation.index'), query, {
            preserveState: true,
            preserveScroll: true,
        });
    };

    const handleRunReconciliation = () => {
        setIsRunning(true);
        router.post(
            route('reconciliation.run'),
            { payment_channel: runChannel },
            {
                onFinish: () => setIsRunning(false),
            }
        );
    };

    const handleApproveMatch = (match: MatchRecord) => {
        router.patch(
            route('reconciliation.approve', match.id),
            { notes: approveNote },
            {
                onSuccess: () => {
                    setActiveCompareMatch(null);
                    setApproveNote('');
                },
            }
        );
    };

    const handleRejectMatch = (e: React.FormEvent) => {
        e.preventDefault();
        if (!rejectingMatch || !rejectReason.trim()) return;

        router.patch(
            route('reconciliation.reject', rejectingMatch.id),
            { reason: rejectReason.trim() },
            {
                onSuccess: () => {
                    setRejectingMatch(null);
                    setActiveCompareMatch(null);
                    setRejectReason('');
                },
            }
        );
    };

    const formatMmk = (amount: string | number | null | undefined) => {
        if (amount === null || amount === undefined) return '0.00';
        const num = typeof amount === 'number' ? amount : parseFloat(amount);
        return isNaN(num) ? '0.00' : num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    const getMatchBadge = (matchType: string) => {
        switch (matchType) {
            case 'exact_match':
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-950/80 text-emerald-300 border border-emerald-800">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
                        Exact 100% Match
                    </span>
                );
            case 'fee_adjusted_match':
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-950/80 text-indigo-300 border border-indigo-800">
                        <span className="h-1.5 w-1.5 rounded-full bg-indigo-400"></span>
                        Fee-Adjusted Gateway
                    </span>
                );
            case 'fuzzy_match':
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-sky-950/80 text-sky-300 border border-sky-800">
                        <span className="h-1.5 w-1.5 rounded-full bg-sky-400"></span>
                        Fuzzy Match (Review)
                    </span>
                );
            case 'amount_mismatch_fraud':
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-950/80 text-red-300 border border-red-800 animate-pulse">
                        <span className="h-1.5 w-1.5 rounded-full bg-red-500"></span>
                        Amount Inflation Fraud
                    </span>
                );
            case 'fake_slip_fraud':
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-950/80 text-red-300 border border-red-800 animate-pulse">
                        <span className="h-1.5 w-1.5 rounded-full bg-red-500"></span>
                        Forged / Tampered Slip
                    </span>
                );
            case 'duplicate_id_fraud':
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-orange-950/80 text-orange-300 border border-orange-800">
                        <span className="h-1.5 w-1.5 rounded-full bg-orange-500"></span>
                        Reused Duplicate ID
                    </span>
                );
            default:
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-800 text-slate-300 border border-slate-700">
                        {matchType}
                    </span>
                );
        }
    };

    const getStatusPill = (status: string) => {
        switch (status) {
            case 'auto_approved':
                return (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-950/80 text-emerald-400 border border-emerald-800/80">
                        ✓ Auto-Approved
                    </span>
                );
            case 'approved_by_accountant':
                return (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-950/80 text-blue-400 border border-blue-800/80">
                        ✓ Accountant Approved
                    </span>
                );
            case 'pending_review':
                return (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-950/80 text-amber-400 border border-amber-800/80 animate-pulse">
                        ⏳ Needs Review
                    </span>
                );
            case 'rejected_fraud':
                return (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-red-950/80 text-red-400 border border-red-800/80">
                        ✕ Rejected Fraud
                    </span>
                );
            default:
                return (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                        {status}
                    </span>
                );
        }
    };

    const getChannelTag = (ch?: string) => {
        if (!ch) return null;
        switch (ch.toLowerCase()) {
            case 'kbzpay':
                return <span className="font-bold text-blue-400 font-mono text-xs">KBZPay</span>;
            case 'wavepay':
                return <span className="font-bold text-amber-400 font-mono text-xs">WavePay</span>;
            case 'cbpay':
                return <span className="font-bold text-rose-400 font-mono text-xs">CB Pay</span>;
            case 'ayapay':
                return <span className="font-bold text-red-400 font-mono text-xs">AYA Pay</span>;
            default:
                return <span className="font-bold text-slate-300 font-mono text-xs">{ch}</span>;
        }
    };

    return (
        <AuthenticatedLayout
            header={
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                        <h2 className="text-xl font-bold leading-tight text-white flex items-center gap-2">
                            <span>⚖️</span> 3-Way Reconciliation & Fraud Resolution Workbench
                        </h2>
                        <p className="text-xs text-slate-400 mt-1">
                            Triangulates Invoices ↔ Slip OCR Extracted Receipts ↔ Bank Statement CSV Ledgers
                        </p>
                    </div>

                    {/* Action Bar */}
                    <div className="flex items-center gap-3">
                        <select
                            value={runChannel}
                            onChange={(e) => setRunChannel(e.target.value)}
                            className="rounded-xl border border-slate-700 bg-slate-800/80 px-3 py-1.5 text-xs text-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                        >
                            <option value="all">⚡ All Myanmar Channels</option>
                            <option value="kbzpay">KBZPay Only</option>
                            <option value="wavepay">WavePay Only</option>
                            <option value="cbpay">CB Pay Only</option>
                            <option value="ayapay">AYA Pay Only</option>
                        </select>

                        <button
                            type="button"
                            onClick={handleRunReconciliation}
                            disabled={isRunning}
                            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold text-white transition shadow-lg ${
                                isRunning
                                    ? 'bg-indigo-700 opacity-60 cursor-not-allowed'
                                    : 'bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 shadow-indigo-500/20'
                            }`}
                        >
                            {isRunning ? (
                                <>
                                    <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24" fill="none">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                                    </svg>
                                    Reconciling...
                                </>
                            ) : (
                                <>
                                    <span>⚙️</span> Run 3-Way Auto-Reconciliation
                                </>
                            )}
                        </button>
                    </div>
                </div>
            }
        >
            <Head title="3-Way Reconciliation Workbench" />

            <div className="py-6 space-y-6">
                {/* Flash Messages */}
                {flash.success && (
                    <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/40 p-4 text-sm text-emerald-200 flex items-start justify-between shadow-lg backdrop-blur">
                        <div className="flex items-center gap-2">
                            <span className="text-emerald-400 text-lg">✓</span>
                            <span>{flash.success}</span>
                        </div>
                    </div>
                )}
                {flash.error && (
                    <div className="rounded-xl border border-red-500/30 bg-red-950/40 p-4 text-sm text-red-200 flex items-start justify-between shadow-lg backdrop-blur">
                        <div className="flex items-center gap-2">
                            <span className="text-red-400 text-lg">⚠️</span>
                            <span>{flash.error}</span>
                        </div>
                    </div>
                )}

                {/* Top Financial Summary Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                    {/* Rate */}
                    <div className="rounded-xl border border-slate-800 bg-slate-850/60 p-4 backdrop-blur shadow-sm">
                        <div className="text-xs font-medium text-slate-400 uppercase tracking-wider">Reconciliation Rate</div>
                        <div className="text-2xl font-black text-emerald-400 mt-1">
                            {metrics.reconciliation_rate}%
                        </div>
                        <div className="w-full bg-slate-800 rounded-full h-1.5 mt-2">
                            <div
                                className="bg-emerald-500 h-1.5 rounded-full"
                                style={{ width: `${Math.min(100, metrics.reconciliation_rate)}%` }}
                            ></div>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-1">
                            {metrics.reconciled_invoices} of {metrics.total_invoices} invoices settled
                        </div>
                    </div>

                    {/* Auto-Approved Volume */}
                    <div className="rounded-xl border border-slate-800 bg-slate-850/60 p-4 backdrop-blur shadow-sm">
                        <div className="text-xs font-medium text-slate-400 uppercase tracking-wider">Reconciled Volume</div>
                        <div className="text-2xl font-black text-indigo-400 mt-1">
                            {metrics.formatted_auto_approved_volume} <span className="text-xs text-slate-400 font-normal">MMK</span>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-2">Verified bank settlements</div>
                    </div>

                    {/* Pending Fuzzy Reviews */}
                    <div className="rounded-xl border border-slate-800 bg-slate-850/60 p-4 backdrop-blur shadow-sm">
                        <div className="text-xs font-medium text-slate-400 uppercase tracking-wider">Fuzzy Reviews Needed</div>
                        <div className={`text-2xl font-black mt-1 ${metrics.pending_reviews_count > 0 ? 'text-amber-400' : 'text-slate-300'}`}>
                            {metrics.pending_reviews_count}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-2">OCR typo candidate matches</div>
                    </div>

                    {/* Fraud Alerts Caught */}
                    <div className="rounded-xl border border-slate-800 bg-slate-850/60 p-4 backdrop-blur shadow-sm">
                        <div className="text-xs font-medium text-slate-400 uppercase tracking-wider">Fraud Alerts Caught</div>
                        <div className={`text-2xl font-black mt-1 ${metrics.fraud_alerts_count > 0 ? 'text-red-400' : 'text-slate-300'}`}>
                            {metrics.fraud_alerts_count}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-2">Tampered & duplicate slips</div>
                    </div>

                    {/* Suspense Balance */}
                    <div className="rounded-xl border border-slate-800 bg-slate-850/60 p-4 backdrop-blur shadow-sm">
                        <div className="text-xs font-medium text-slate-400 uppercase tracking-wider">Suspense Ledger</div>
                        <div className="text-2xl font-black text-orange-400 mt-1">
                            {metrics.formatted_suspense_volume} <span className="text-xs text-slate-400 font-normal">MMK</span>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-2">
                            {metrics.suspense_txns_count} unclaimed bank receipts
                        </div>
                    </div>
                </div>

                {/* Audit Feed & Workbench */}
                <div className="rounded-2xl border border-slate-800 bg-slate-850/60 p-6 backdrop-blur shadow-xl space-y-4">
                    {/* Filter Tabs */}
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-slate-800 pb-4">
                        <div className="flex flex-wrap items-center gap-1.5">
                            {[
                                { id: 'all', label: 'All Audit Records' },
                                { id: 'exact', label: 'Exact & Fee-Adjusted' },
                                { id: 'pending_review', label: `Fuzzy Review Needed (${metrics.pending_reviews_count})` },
                                { id: 'fraud', label: `Fraud & Discrepancies (${metrics.fraud_alerts_count})` },
                                { id: 'suspense', label: `Suspense Ledger (${metrics.suspense_txns_count})` },
                            ].map((tab) => (
                                <button
                                    key={tab.id}
                                    type="button"
                                    onClick={() => {
                                        setCurrentTab(tab.id);
                                        handleFilterSubmit(tab.id, currentChannel, searchTerm);
                                    }}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                                        currentTab === tab.id
                                            ? 'bg-indigo-600 text-white shadow'
                                            : 'bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-slate-200 border border-slate-800'
                                    }`}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>

                        {/* Search & Channel Filters */}
                        <div className="flex items-center gap-2">
                            <select
                                value={currentChannel}
                                onChange={(e) => {
                                    setCurrentChannel(e.target.value);
                                    handleFilterSubmit(currentTab, e.target.value, searchTerm);
                                }}
                                className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                            >
                                <option value="all">All Channels</option>
                                <option value="kbzpay">KBZPay</option>
                                <option value="wavepay">WavePay</option>
                                <option value="cbpay">CB Pay</option>
                                <option value="ayapay">AYA Pay</option>
                            </select>

                            <div className="relative w-48 sm:w-60">
                                <input
                                    type="text"
                                    placeholder="Search Invoice #, Txn ID, Phone..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            handleFilterSubmit(currentTab, currentChannel, searchTerm);
                                        }
                                    }}
                                    className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                                />
                                {searchTerm && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setSearchTerm('');
                                            handleFilterSubmit(currentTab, currentChannel, '');
                                        }}
                                        className="absolute right-2.5 top-2 text-xs text-slate-500 hover:text-slate-300"
                                    >
                                        ✕
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Standard Matches Table or Suspense Ledger */}
                    {currentTab === 'suspense' ? (
                        // Suspense Ledger View
                        <div className="space-y-4">
                            <div className="p-3 rounded-xl bg-orange-950/20 border border-orange-800/40 text-xs text-orange-200 flex items-center justify-between">
                                <div>
                                    <span className="font-bold">⚠️ Suspense Bank Ledger:</span> Bank transactions that have cleared in official bank statements but have no corresponding customer invoice/slip uploaded.
                                </div>
                                <span className="font-mono text-orange-400 font-bold">{suspenseItems.total} Unclaimed Deposits</span>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs">
                                    <thead className="bg-slate-900/80 text-slate-400 border-b border-slate-800 uppercase tracking-wider font-semibold">
                                        <tr>
                                            <th className="px-4 py-3">Channel</th>
                                            <th className="px-4 py-3">Bank Transaction ID</th>
                                            <th className="px-4 py-3">Value Datetime</th>
                                            <th className="px-4 py-3">Sender Details</th>
                                            <th className="px-4 py-3 text-right">Gross MMK</th>
                                            <th className="px-4 py-3 text-right">Fee MMK</th>
                                            <th className="px-4 py-3 text-right">Net MMK</th>
                                            <th className="px-4 py-3">Narrative</th>
                                            <th className="px-4 py-3">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-800">
                                        {suspenseItems.data.length === 0 ? (
                                            <tr>
                                                <td colSpan={9} className="px-4 py-8 text-center text-slate-500">
                                                    No suspense transactions found.
                                                </td>
                                            </tr>
                                        ) : (
                                            suspenseItems.data.map((item) => (
                                                <tr key={item.id} className="hover:bg-slate-800/40 transition">
                                                    <td className="px-4 py-3">{getChannelTag(item.payment_channel)}</td>
                                                    <td className="px-4 py-3 font-mono font-bold text-slate-200">{item.bank_transaction_id}</td>
                                                    <td className="px-4 py-3 text-slate-400">{item.transaction_datetime}</td>
                                                    <td className="px-4 py-3">
                                                        <div className="text-slate-200 font-semibold">{item.sender_name || '—'}</div>
                                                        <div className="text-[11px] text-slate-400 font-mono">{item.sender_phone || '—'}</div>
                                                    </td>
                                                    <td className="px-4 py-3 text-right font-mono text-slate-200">{formatMmk(item.gross_amount)}</td>
                                                    <td className="px-4 py-3 text-right font-mono text-amber-400">{formatMmk(item.fee_amount)}</td>
                                                    <td className="px-4 py-3 text-right font-mono font-bold text-emerald-400">{formatMmk(item.net_amount)}</td>
                                                    <td className="px-4 py-3 text-slate-300 max-w-xs truncate">{item.reference_note || '—'}</td>
                                                    <td className="px-4 py-3">
                                                        <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-orange-950 text-orange-400 border border-orange-800">
                                                            Suspense
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ) : (
                        // Standard Reconciliation Matches Table
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs">
                                <thead className="bg-slate-900/80 text-slate-400 border-b border-slate-800 uppercase tracking-wider font-semibold">
                                    <tr>
                                        <th className="px-4 py-3">Match Type</th>
                                        <th className="px-4 py-3">Invoice Details</th>
                                        <th className="px-4 py-3">Slip OCR Data</th>
                                        <th className="px-4 py-3">Bank Statement Row</th>
                                        <th className="px-4 py-3 text-right">Variance</th>
                                        <th className="px-4 py-3">Status</th>
                                        <th className="px-4 py-3 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800">
                                    {matches.data.length === 0 ? (
                                        <tr>
                                            <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                                                No reconciliation audit matches found. Click "Run 3-Way Auto-Reconciliation" above!
                                            </td>
                                        </tr>
                                    ) : (
                                        matches.data.map((m) => (
                                            <tr key={m.id} className="hover:bg-slate-800/40 transition">
                                                {/* Match Type */}
                                                <td className="px-4 py-3">
                                                    <div className="space-y-1">
                                                        {getMatchBadge(m.match_type)}
                                                        <div className="text-[11px] text-slate-400 font-mono">
                                                            Confidence: {m.confidence_score}%
                                                        </div>
                                                    </div>
                                                </td>

                                                {/* Invoice Details */}
                                                <td className="px-4 py-3">
                                                    {m.invoice ? (
                                                        <div>
                                                            <div className="font-bold text-white flex items-center gap-1.5">
                                                                <span>{m.invoice.invoice_number}</span>
                                                                {getChannelTag(m.invoice.expected_channel)}
                                                            </div>
                                                            <div className="text-[11px] text-slate-300 font-medium">{m.invoice.customer_name}</div>
                                                            <div className="text-[11px] text-indigo-400 font-mono font-bold">
                                                                {formatMmk(m.invoice.amount)} MMK
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <span className="text-slate-500 italic">No Invoice Linked</span>
                                                    )}
                                                </td>

                                                {/* Slip OCR Data */}
                                                <td className="px-4 py-3">
                                                    {m.payment_slip ? (
                                                        <div>
                                                            <div className="font-mono text-slate-200 font-semibold truncate max-w-[140px]" title={m.payment_slip.extracted_transaction_id}>
                                                                {m.payment_slip.extracted_transaction_id || 'No ID Extracted'}
                                                            </div>
                                                            <div className="text-[11px] text-emerald-400 font-mono">
                                                                {formatMmk(m.payment_slip.extracted_amount)} MMK
                                                            </div>
                                                            {m.payment_slip.exif_tamper_flag && (
                                                                <span className="inline-block mt-0.5 px-1.5 py-0.2 rounded bg-red-950 text-red-400 text-[10px] font-bold border border-red-800">
                                                                    ⚠️ Tampered
                                                                </span>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <span className="text-slate-500 italic">No Slip</span>
                                                    )}
                                                </td>

                                                {/* Bank Statement Row */}
                                                <td className="px-4 py-3">
                                                    {m.bank_transaction ? (
                                                        <div>
                                                            <div className="font-mono text-slate-200 font-semibold truncate max-w-[140px]" title={m.bank_transaction.bank_transaction_id}>
                                                                {m.bank_transaction.bank_transaction_id}
                                                            </div>
                                                            <div className="text-[11px] text-slate-300">
                                                                Gross: <span className="font-mono text-emerald-400">{formatMmk(m.bank_transaction.gross_amount)} MMK</span>
                                                            </div>
                                                            {parseFloat(String(m.bank_transaction.fee_amount)) > 0 && (
                                                                <div className="text-[10px] text-amber-400 font-mono">
                                                                    Fee: -{formatMmk(m.bank_transaction.fee_amount)} MMK
                                                                </div>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <span className="text-slate-500 italic">No Bank Record</span>
                                                    )}
                                                </td>

                                                {/* Variance */}
                                                <td className="px-4 py-3 text-right">
                                                    {parseFloat(String(m.variance_amount)) > 0 ? (
                                                        <span className="font-mono font-bold text-red-400">
                                                            +{formatMmk(m.variance_amount)} MMK
                                                        </span>
                                                    ) : (
                                                        <span className="font-mono text-slate-500">0.00</span>
                                                    )}
                                                </td>

                                                {/* Status */}
                                                <td className="px-4 py-3">
                                                    {getStatusPill(m.status)}
                                                </td>

                                                {/* Actions */}
                                                <td className="px-4 py-3 text-right space-x-2 whitespace-nowrap">
                                                    <button
                                                        type="button"
                                                        onClick={() => setActiveCompareMatch(m)}
                                                        className="inline-flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1 text-xs font-semibold text-slate-200 hover:bg-slate-700 hover:text-white transition shadow-sm"
                                                    >
                                                        <span>🔍</span> Compare 3-Way
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Pagination */}
                    {matches.links && matches.links.length > 3 && currentTab !== 'suspense' && (
                        <div className="flex items-center justify-between border-t border-slate-800 pt-4 mt-2 text-xs">
                            <span className="text-slate-400">
                                Page {matches.current_page} of {matches.last_page} ({matches.total} records)
                            </span>
                            <div className="flex items-center gap-1">
                                {matches.links.map((link, i) => (
                                    <Link
                                        key={i}
                                        href={link.url || '#'}
                                        preserveScroll
                                        preserveState
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

            {/* 3-Way Comparison Modal */}
            {activeCompareMatch && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto">
                    <div className="relative w-full max-w-4xl rounded-3xl border border-slate-700 bg-slate-900 p-6 shadow-2xl my-8">
                        {/* Modal Header */}
                        <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-5">
                            <div>
                                <div className="flex items-center gap-2">
                                    <h3 className="text-lg font-black text-white">3-Way Reconciliation Triangulator</h3>
                                    {getMatchBadge(activeCompareMatch.match_type)}
                                </div>
                                <p className="text-xs text-slate-400 mt-0.5">
                                    Cross-verifying Invoice, Customer Uploaded Slip, and Official Bank Statement
                                </p>
                            </div>
                            <button
                                onClick={() => setActiveCompareMatch(null)}
                                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition"
                            >
                                ✕
                            </button>
                        </div>

                        {/* Triangulation 3-Column Layout */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {/* Column 1: Invoice */}
                            <div className="rounded-2xl border border-slate-800 bg-slate-850/70 p-4 space-y-3">
                                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                                    <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">
                                        1. Issued Invoice
                                    </span>
                                    <span className="text-[11px] font-mono text-slate-400">
                                        {activeCompareMatch.invoice?.invoice_number || 'N/A'}
                                    </span>
                                </div>

                                <div className="space-y-2 text-xs">
                                    <div>
                                        <span className="text-slate-500">Customer:</span>
                                        <div className="font-semibold text-white">{activeCompareMatch.invoice?.customer_name || 'N/A'}</div>
                                        <div className="text-slate-400 font-mono text-[11px]">{activeCompareMatch.invoice?.customer_phone || 'N/A'}</div>
                                    </div>

                                    <div>
                                        <span className="text-slate-500">Expected Channel:</span>
                                        <div>{getChannelTag(activeCompareMatch.invoice?.expected_channel)}</div>
                                    </div>

                                    <div>
                                        <span className="text-slate-500">Invoice Amount:</span>
                                        <div className="text-lg font-black text-indigo-400 font-mono">
                                            {formatMmk(activeCompareMatch.invoice?.amount)} MMK
                                        </div>
                                    </div>

                                    <div>
                                        <span className="text-slate-500">Description:</span>
                                        <div className="text-slate-300 text-[11px]">{activeCompareMatch.invoice?.description || 'N/A'}</div>
                                    </div>
                                </div>
                            </div>

                            {/* Column 2: Payment Slip (OCR) */}
                            <div className="rounded-2xl border border-slate-800 bg-slate-850/70 p-4 space-y-3">
                                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                                    <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                                        2. Slip OCR Scanner
                                    </span>
                                    {getChannelTag(activeCompareMatch.payment_slip?.payment_channel)}
                                </div>

                                <div className="space-y-2 text-xs">
                                    <div>
                                        <span className="text-slate-500">Extracted Txn ID:</span>
                                        <div className="font-mono font-bold text-slate-100 break-all">
                                            {activeCompareMatch.payment_slip?.extracted_transaction_id || 'N/A'}
                                        </div>
                                    </div>

                                    <div>
                                        <span className="text-slate-500">Extracted Amount:</span>
                                        <div className="text-lg font-black text-emerald-400 font-mono">
                                            {formatMmk(activeCompareMatch.payment_slip?.extracted_amount)} MMK
                                        </div>
                                    </div>

                                    <div>
                                        <span className="text-slate-500">Sender Details:</span>
                                        <div className="font-semibold text-white">{activeCompareMatch.payment_slip?.sender_name || 'N/A'}</div>
                                        <div className="text-slate-400 font-mono text-[11px]">{activeCompareMatch.payment_slip?.sender_phone || 'N/A'}</div>
                                    </div>

                                    <div>
                                        <span className="text-slate-500">Forensic Tamper Check:</span>
                                        {activeCompareMatch.payment_slip?.exif_tamper_flag ? (
                                            <div className="text-red-400 font-bold flex items-center gap-1 mt-0.5">
                                                <span>⚠️</span> Tampering Signatures Found
                                            </div>
                                        ) : (
                                            <div className="text-emerald-400 font-semibold flex items-center gap-1 mt-0.5">
                                                <span>✓</span> File Headers Clean
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Column 3: Bank Transaction */}
                            <div className="rounded-2xl border border-slate-800 bg-slate-850/70 p-4 space-y-3">
                                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                                    <span className="text-xs font-bold text-sky-400 uppercase tracking-wider">
                                        3. Official Bank CSV
                                    </span>
                                    {getChannelTag(activeCompareMatch.bank_transaction?.payment_channel)}
                                </div>

                                <div className="space-y-2 text-xs">
                                    <div>
                                        <span className="text-slate-500">Bank Txn ID:</span>
                                        <div className="font-mono font-bold text-slate-100 break-all">
                                            {activeCompareMatch.bank_transaction?.bank_transaction_id || 'No Bank Record Found'}
                                        </div>
                                    </div>

                                    <div>
                                        <span className="text-slate-500">Credited Gross MMK:</span>
                                        <div className="text-lg font-black text-sky-400 font-mono">
                                            {formatMmk(activeCompareMatch.bank_transaction?.gross_amount)} MMK
                                        </div>
                                    </div>

                                    <div>
                                        <span className="text-slate-500">Fee & Net Settlement:</span>
                                        <div className="text-slate-300 font-mono text-[11px]">
                                            Fee: <span className="text-amber-400">{formatMmk(activeCompareMatch.bank_transaction?.fee_amount)} MMK</span> • Net: <span className="text-emerald-400">{formatMmk(activeCompareMatch.bank_transaction?.net_amount)} MMK</span>
                                        </div>
                                    </div>

                                    <div>
                                        <span className="text-slate-500">Payer Details & Ref:</span>
                                        <div className="font-semibold text-white">{activeCompareMatch.bank_transaction?.sender_name || 'N/A'}</div>
                                        <div className="text-slate-400 font-mono text-[11px] truncate">{activeCompareMatch.bank_transaction?.reference_note || '—'}</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Audit Diagnostic & Variance Bar */}
                        <div className="mt-5 rounded-2xl border border-slate-800 bg-slate-950 p-4 space-y-2">
                            <div className="flex items-center justify-between text-xs">
                                <span className="text-slate-400 font-semibold">Engine Audit Diagnostic:</span>
                                <div className="flex items-center gap-2">
                                    <span className="text-slate-400">Status:</span>
                                    {getStatusPill(activeCompareMatch.status)}
                                </div>
                            </div>
                            <div className="text-xs text-slate-300 leading-relaxed font-mono">
                                {activeCompareMatch.notes || 'No specific discrepancy flags.'}
                            </div>
                            {parseFloat(String(activeCompareMatch.variance_amount)) > 0 && (
                                <div className="text-xs font-bold text-red-400 font-mono pt-1">
                                    Discrepancy / Variance Amount: {formatMmk(activeCompareMatch.variance_amount)} MMK
                                </div>
                            )}
                        </div>

                        {/* Modal Action Footer */}
                        <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-800 pt-4">
                            <div className="text-xs text-slate-400">
                                Match ID: <span className="font-mono text-slate-200">#{activeCompareMatch.id}</span>
                            </div>

                            <div className="flex items-center gap-3">
                                <button
                                    type="button"
                                    onClick={() => setActiveCompareMatch(null)}
                                    className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-700 hover:text-white transition"
                                >
                                    Close
                                </button>

                                {activeCompareMatch.status === 'pending_review' && (
                                    <>
                                        <button
                                            type="button"
                                            onClick={() => setRejectingMatch(activeCompareMatch)}
                                            className="rounded-xl border border-red-900/60 bg-red-950/60 px-4 py-2 text-xs font-bold text-red-300 hover:bg-red-900/80 hover:text-white transition"
                                        >
                                            Flag as Discrepancy / Fraud
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => handleApproveMatch(activeCompareMatch)}
                                            className="rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 px-4 py-2 text-xs font-bold text-white hover:from-emerald-600 hover:to-emerald-700 transition shadow-lg shadow-emerald-500/20"
                                        >
                                            ✓ Approve Match
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Rejection Reason Modal */}
            {rejectingMatch && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4">
                    <form onSubmit={handleRejectMatch} className="w-full max-w-md rounded-2xl border border-red-800/60 bg-slate-900 p-6 shadow-2xl space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                            <h4 className="text-sm font-bold text-red-400 flex items-center gap-1.5">
                                <span>⚠️</span> Reject & Flag Discrepancy
                            </h4>
                            <button
                                type="button"
                                onClick={() => setRejectingMatch(null)}
                                className="text-slate-400 hover:text-white"
                            >
                                ✕
                            </button>
                        </div>

                        <p className="text-xs text-slate-300">
                            Provide the mandatory audit reason for rejecting match #{rejectingMatch.id}:
                        </p>

                        <textarea
                            rows={3}
                            required
                            placeholder="e.g. OCR misread phone belongs to another branch, or slip timestamp is outside acceptable cutoff window."
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                            className="w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-xs text-slate-200 placeholder-slate-500 focus:border-red-500 focus:ring-1 focus:ring-red-500"
                        />

                        <div className="flex justify-end gap-2 pt-2">
                            <button
                                type="button"
                                onClick={() => setRejectingMatch(null)}
                                className="rounded-xl border border-slate-700 px-3 py-1.5 text-xs text-slate-400 hover:bg-slate-800"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={!rejectReason.trim()}
                                className="rounded-xl bg-red-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-red-700 transition disabled:opacity-50"
                            >
                                Confirm Rejection
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </AuthenticatedLayout>
    );
}
