import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import React, { useRef, useState } from 'react';

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
    batch?: {
        id: number;
        original_filename: string;
    };
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
        total_batches: number;
        total_volume_mmk: number;
        formatted_volume_mmk: string;
        channels_covered: number;
        unreconciled_txns: number;
        channel_counts: Record<string, { payment_channel: string; count: number; total: number }>;
    };
    batches: PaginatedData<BatchItem>;
    transactions: PaginatedData<BankTxItem>;
    filters: {
        channel: string;
        status: string;
        search: string;
    };
}

export default function Index({ metrics, batches, transactions, filters }: Props) {
    const page = usePage();
    const flash = (page.props as any).flash || {};
    const isAdmin = (page.props as any).auth?.user?.roles?.includes('admin');

    const [selectedChannel, setSelectedChannel] = useState<string>(filters.channel || 'all');
    const [selectedStatus, setSelectedStatus] = useState<string>(filters.status || 'all');
    const [searchTerm, setSearchTerm] = useState<string>(filters.search || '');
    const [dragActive, setDragActive] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [uploadChannel, setUploadChannel] = useState<string>('auto');
    const [inspectPayloadTx, setInspectPayloadTx] = useState<BankTxItem | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);

    const { data, setData, post, processing, errors, reset, progress } = useForm({
        statement_file: null as File | null,
        payment_channel: 'auto',
    });

    const handleFileChange = (file: File | null) => {
        setSelectedFile(file);
        setData('statement_file', file);
    };

    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setDragActive(true);
        } else if (e.type === 'dragleave') {
            setDragActive(false);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFileChange(e.dataTransfer.files[0]);
        }
    };

    const handleUploadSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!data.statement_file) return;

        post(route('bank-statements.upload'), {
            onSuccess: () => {
                reset();
                setSelectedFile(null);
                if (fileInputRef.current) fileInputRef.current.value = '';
            },
        });
    };

    const handleFilterSubmit = (channelVal?: string, statusVal?: string, searchVal?: string) => {
        const query: Record<string, string> = {};
        const ch = channelVal !== undefined ? channelVal : selectedChannel;
        const st = statusVal !== undefined ? statusVal : selectedStatus;
        const q = searchVal !== undefined ? searchVal : searchTerm;

        if (ch && ch !== 'all') query.channel = ch;
        if (st && st !== 'all') query.status = st;
        if (q && q.trim()) query.search = q.trim();

        router.get(route('bank-statements.index'), query, {
            preserveState: true,
            preserveScroll: true,
        });
    };

    const handleDeleteBatch = (batch: BatchItem) => {
        if (confirm(`Are you sure you want to permanently purge batch "${batch.original_filename}"? This will delete all its ${batch.total_records} transactions.`)) {
            router.delete(route('bank-statements.destroy', batch.id), {
                preserveScroll: true,
            });
        }
    };

    const handleRequestRollback = (batch: BatchItem) => {
        const reason = prompt(`Enter reason for requesting rollback of "${batch.original_filename}":`, 'Incorrect statement file / Duplicate batch uploaded');
        if (reason && reason.trim()) {
            router.post(route('bank-statements.request-rollback', batch.id), {
                reason: reason.trim(),
            }, {
                preserveScroll: true,
            });
        }
    };

    const getChannelBadge = (ch: string, compact = false) => {
        const sizeClass = compact ? 'text-[10px] px-2 py-0.5' : 'text-xs px-2.5 py-0.5';
        switch (ch?.toLowerCase()) {
            case 'kbzpay':
                return (
                    <span className={`inline-flex items-center gap-1 rounded-full font-bold bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/80 dark:text-blue-300 dark:border-blue-800 ${sizeClass}`}>
                        <span className="h-1.5 w-1.5 rounded-full bg-blue-600 dark:bg-blue-400"></span>
                        KBZPay
                    </span>
                );
            case 'wavepay':
                return (
                    <span className={`inline-flex items-center gap-1 rounded-full font-bold bg-amber-50 text-amber-800 border border-amber-200 dark:bg-amber-950/80 dark:text-amber-300 dark:border-amber-800 ${sizeClass}`}>
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-500 dark:bg-amber-400"></span>
                        WavePay
                    </span>
                );
            case 'cbpay':
                return (
                    <span className={`inline-flex items-center gap-1 rounded-full font-bold bg-red-50 text-red-700 border border-red-200 dark:bg-red-950/80 dark:text-red-300 dark:border-red-800 ${sizeClass}`}>
                        <span className="h-1.5 w-1.5 rounded-full bg-red-600 dark:bg-red-400"></span>
                        CB Pay
                    </span>
                );
            case 'ayapay':
                return (
                    <span className={`inline-flex items-center gap-1 rounded-full font-bold bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-950/80 dark:text-purple-300 dark:border-purple-800 ${sizeClass}`}>
                        <span className="h-1.5 w-1.5 rounded-full bg-purple-600 dark:bg-purple-400"></span>
                        AYA Pay
                    </span>
                );
            default:
                return (
                    <span className={`inline-flex items-center gap-1 rounded-full font-bold bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 ${sizeClass}`}>
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

    const formatMmk = (amount: string | number) => {
        const num = typeof amount === 'number' ? amount : parseFloat(amount);
        return isNaN(num) ? '0.00' : num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    return (
        <AuthenticatedLayout
            header={
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                        <h2 className="text-xl font-bold leading-tight text-slate-900 dark:text-white flex items-center gap-2">
                            <span>🏦</span> Multi-Bank Statement Ingestion & Unified Ledger
                        </h2>
                        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                            Adapter & Strategy Pattern normalization across KBZPay, WavePay, CB Pay, and AYA Pay CSV exports.
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <Link
                            href={route('simulation-studio.index')}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-purple-200 dark:border-purple-800/60 bg-purple-50 dark:bg-purple-950/40 px-3 py-1.5 text-xs font-semibold text-[#705CF6] dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/40 transition shadow-sm"
                        >
                            <span>⚡</span> Generate Synthetic CSVs in Studio &rarr;
                        </Link>
                    </div>
                </div>
            }
        >
            <Head title="Bank Statements & Unified Ledger" />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-6">
                {/* KPI Overview Cards (FinSet Elevated Style) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                    <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#161B26] p-5 shadow-sm">
                        <div className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Statement Batches</div>
                        <div className="text-2xl font-black text-slate-900 dark:text-white mt-2">{metrics.total_batches}</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">Uploaded & parsed files</div>
                    </div>
                    <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#161B26] p-5 shadow-sm">
                        <div className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Total Settled Volume</div>
                        <div className="text-2xl font-black text-[#705CF6] dark:text-[#8C7CFF] mt-2 font-mono">{metrics.formatted_volume_mmk} <span className="text-xs text-slate-500 font-normal">MMK</span></div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">Cumulative credit ledger</div>
                    </div>
                    <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#161B26] p-5 shadow-sm">
                        <div className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Active Channels</div>
                        <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-2">{metrics.channels_covered} <span className="text-xs text-slate-500 font-normal">/ 4</span></div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">KBZPay, Wave, CB, AYA</div>
                    </div>
                    <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#161B26] p-5 shadow-sm">
                        <div className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Unreconciled Transactions</div>
                        <div className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-2">{metrics.unreconciled_txns}</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">Pending 3-way match engine</div>
                    </div>
                </div>

                {/* CSV Ingestion & Bank Adapter Box */}
                <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#161B26] p-6 shadow-sm">
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
                        <div>
                            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                                Ingest Bank Statement CSV
                            </h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                Dedicated adapters extract transaction IDs, gross amounts, charges/commissions, net settlement, and narrative references.
                            </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                            <span className="text-slate-400 font-medium">Adapters Ready:</span>
                            <span className="px-2.5 py-1 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-300 border border-blue-200 dark:border-blue-800/60 font-mono text-[11px] font-bold">KBZPay</span>
                            <span className="px-2.5 py-1 rounded-xl bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60 font-mono text-[11px] font-bold">WavePay</span>
                            <span className="px-2.5 py-1 rounded-xl bg-rose-50 dark:bg-rose-950 text-rose-600 dark:text-rose-300 border border-rose-200 dark:border-rose-800/60 font-mono text-[11px] font-bold">CB Pay</span>
                            <span className="px-2.5 py-1 rounded-xl bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-300 border border-red-200 dark:border-red-800/60 font-mono text-[11px] font-bold">AYA Pay</span>
                        </div>
                    </div>

                    <form onSubmit={handleUploadSubmit} className="mt-5 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {/* Channel Selector */}
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                    Statement Provider Channel
                                </label>
                                <select
                                    value={data.payment_channel}
                                    onChange={(e) => {
                                        setData('payment_channel', e.target.value);
                                        setUploadChannel(e.target.value);
                                    }}
                                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3 py-2 text-sm text-slate-900 dark:text-slate-200 focus:border-[#705CF6] focus:ring-1 focus:ring-[#705CF6]"
                                >
                                    <option value="auto">✨ Auto-Detect Channel (Inspect CSV Headers)</option>
                                    <option value="kbzpay">KBZPay (Merchant Statement CSV)</option>
                                    <option value="wavepay">WavePay (Merchant Settlement CSV)</option>
                                    <option value="cbpay">CB Pay (Corporate Account CSV)</option>
                                    <option value="ayapay">AYA Pay (Merchant Report CSV)</option>
                                </select>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                                    Auto-detect reads the first row to determine column signature automatically.
                                </p>
                            </div>

                            {/* Drag and Drop Zone */}
                            <div className="md:col-span-2">
                                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                    Bank Statement CSV File (.csv, .txt)
                                </label>
                                <div
                                    onDragEnter={handleDrag}
                                    onDragLeave={handleDrag}
                                    onDragOver={handleDrag}
                                    onDrop={handleDrop}
                                    onClick={() => fileInputRef.current?.click()}
                                    className={`relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed px-4 py-4 text-center cursor-pointer transition ${
                                        dragActive
                                            ? 'border-[#705CF6] bg-purple-500/10'
                                            : selectedFile
                                            ? 'border-emerald-500/60 bg-emerald-50 dark:bg-emerald-950/20'
                                            : 'border-slate-300 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-900/50 hover:border-slate-400 dark:hover:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-900'
                                    }`}
                                >
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept=".csv,.txt"
                                        className="hidden"
                                        onChange={(e) => {
                                            if (e.target.files && e.target.files[0]) {
                                                handleFileChange(e.target.files[0]);
                                            }
                                        }}
                                    />
                                    {selectedFile ? (
                                        <div className="flex items-center gap-3">
                                            <span className="text-2xl text-emerald-500 dark:text-emerald-400">📄</span>
                                            <div className="text-left">
                                                <div className="text-xs font-bold text-slate-900 dark:text-white truncate max-w-md">
                                                    {selectedFile.name}
                                                </div>
                                                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                                                    {(selectedFile.size / 1024).toFixed(1)} KB • Click or drop to change
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="space-y-1">
                                            <div className="text-xs text-slate-700 dark:text-slate-300 font-medium">
                                                Drag & drop bank statement CSV here, or <span className="text-[#705CF6] dark:text-indigo-400 underline font-semibold">browse</span>
                                            </div>
                                            <div className="text-[11px] text-slate-500 dark:text-slate-400">
                                                Supports standard Myanmar bank export schemas up to 10MB
                                            </div>
                                        </div>
                                    )}
                                </div>
                                {errors.statement_file && (
                                    <p className="text-xs text-red-400 mt-1 font-medium">{errors.statement_file}</p>
                                )}
                                {errors.payment_channel && (
                                    <p className="text-xs text-red-400 mt-1 font-medium">{errors.payment_channel}</p>
                                )}
                            </div>
                        </div>

                        {progress && (
                            <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                                <div
                                    className="bg-indigo-500 h-1.5 rounded-full transition-all duration-300"
                                    style={{ width: `${progress.percentage}%` }}
                                ></div>
                            </div>
                        )}

                        <div className="flex items-center justify-between pt-2">
                            <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                                <span className="text-indigo-400">💡</span> Need test files? Use{' '}
                                <Link href={route('simulation-studio.index')} className="text-indigo-300 hover:underline">
                                    Simulation Studio
                                </Link>{' '}
                                to generate realistic datasets and download statements.
                            </div>
                            <button
                                type="submit"
                                disabled={!selectedFile || processing}
                                className={`inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs font-bold text-white transition shadow-lg ${
                                    !selectedFile || processing
                                        ? 'bg-slate-700 opacity-60 cursor-not-allowed'
                                        : 'bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 shadow-indigo-500/20'
                                }`}
                            >
                                {processing ? (
                                    <>
                                        <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24" fill="none">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                                        </svg>
                                        Parsing & Normalizing...
                                    </>
                                ) : (
                                    <>
                                        <span>⚡</span> Ingest & Process Statement
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </div>

                {/* Batches History Table */}
                <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#161B26] p-6 shadow-sm">
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-4 mb-4">
                        <div>
                            <h3 className="text-base font-bold text-slate-900 dark:text-white">Uploaded Statement Batches</h3>
                            <p className="text-xs text-slate-600 dark:text-slate-400">Statement archives processed by the ingestion engine</p>
                        </div>
                        <span className="text-xs text-slate-600 dark:text-slate-400 font-mono">
                            {batches.total} batch{batches.total === 1 ? '' : 'es'}
                        </span>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                            <thead className="bg-slate-50 dark:bg-slate-900/80 text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800 uppercase tracking-wider font-semibold">
                                <tr>
                                    <th className="px-4 py-3">Batch ID</th>
                                    <th className="px-4 py-3">Channel</th>
                                    <th className="px-4 py-3">Original Filename</th>
                                    <th className="px-4 py-3">Statement Date</th>
                                    <th className="px-4 py-3 text-right">Transactions</th>
                                    <th className="px-4 py-3 text-right">Total Credit (MMK)</th>
                                    <th className="px-4 py-3">Uploaded By</th>
                                    <th className="px-4 py-3 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                                {batches.data.length === 0 ? (
                                    <tr>
                                        <td colSpan={8} className="px-4 py-8 text-center text-slate-500">
                                            No bank statement batches uploaded yet. Ingest your first statement CSV above!
                                        </td>
                                    </tr>
                                ) : (
                                    batches.data.map((b) => (
                                        <tr key={b.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                                            <td className="px-4 py-3 font-mono font-semibold text-slate-700 dark:text-slate-300">
                                                #{b.id}
                                            </td>
                                            <td className="px-4 py-3">
                                                {getChannelBadge(b.payment_channel)}
                                            </td>
                                            <td className="px-4 py-3 font-medium text-slate-900 dark:text-white max-w-xs truncate" title={b.original_filename}>
                                                {b.original_filename}
                                            </td>
                                            <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                                                {b.statement_date}
                                            </td>
                                            <td className="px-4 py-3 text-right font-mono font-bold text-slate-900 dark:text-slate-200">
                                                {b.total_records}
                                            </td>
                                            <td className="px-4 py-3 text-right font-mono font-bold text-[#705CF6] dark:text-indigo-400">
                                                {formatMmk(b.total_credit_amount)}
                                            </td>
                                            <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                                                {b.uploader?.name || 'System / Auto'}
                                            </td>
                                            <td className="px-4 py-3 text-right space-x-2 whitespace-nowrap">
                                                <Link
                                                    href={route('bank-statements.show', b.id)}
                                                    className="inline-flex items-center gap-1 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white transition"
                                                >
                                                    Inspect
                                                </Link>
                                                {isAdmin ? (
                                                    <button
                                                        onClick={() => handleDeleteBatch(b)}
                                                        className={`inline-flex items-center gap-1 rounded-xl border px-2 py-1 text-xs font-semibold transition ${
                                                            b.rollback_requested
                                                                ? 'border-red-600 bg-red-600 text-white hover:bg-red-700 shadow-sm'
                                                                : 'border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/60 hover:text-red-700 dark:hover:text-red-200'
                                                        }`}
                                                        title={b.rollback_requested ? `Purge Batch (Requested by ${b.rollback_requester?.name || 'Accountant'}: ${b.rollback_reason})` : 'Permanently purge batch and its transactions'}
                                                    >
                                                        {b.rollback_requested ? '⚠️ Purge Requested' : 'Purge'}
                                                    </button>
                                                ) : (
                                                    b.rollback_requested ? (
                                                        <span
                                                            className="inline-flex items-center gap-1 rounded-xl border border-amber-300 dark:border-amber-800/80 bg-amber-50 dark:bg-amber-950/60 px-2 py-1 text-[11px] font-semibold text-amber-700 dark:text-amber-300"
                                                            title={`Rollback requested: ${b.rollback_reason}`}
                                                        >
                                                            ⏳ Rollback Pending
                                                        </span>
                                                    ) : (
                                                        <button
                                                            onClick={() => handleRequestRollback(b)}
                                                            className="inline-flex items-center gap-1 rounded-xl border border-amber-300 dark:border-amber-900/60 bg-amber-50 dark:bg-amber-950/40 px-2 py-1 text-xs font-semibold text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/60 transition"
                                                            title="Submit a rollback request for Chief Auditor approval"
                                                        >
                                                            Request Rollback
                                                        </button>
                                                    )
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Batches Pagination */}
                    {batches.links && batches.links.length > 3 && (
                        <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800/80 pt-4 mt-4 text-xs">
                            <span className="text-slate-600 dark:text-slate-400">
                                Page {batches.current_page} of {batches.last_page} ({batches.total} batches)
                            </span>
                            <div className="flex items-center gap-1">
                                {batches.links.map((link, i) => (
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

                {/* Unified Bank Transaction Ledger */}
                <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#161B26] p-6 shadow-sm space-y-4">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-100 dark:border-slate-800/80 pb-4">
                        <div>
                            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <span>📜</span> Unified Bank Transaction Ledger
                            </h3>
                            <p className="text-xs text-slate-600 dark:text-slate-400">
                                All normalized transactions across KBZPay, WavePay, CB Pay, and AYA Pay ready for 3-way matching
                            </p>
                        </div>
                        <div className="text-xs text-slate-600 dark:text-slate-400 font-mono">
                            {transactions.total} records found
                        </div>
                    </div>

                    {/* Filter & Search Bar */}
                    <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
                        {/* Channel Filter Tabs */}
                        <div className="flex flex-wrap items-center gap-1 w-full md:w-auto">
                            {[
                                { id: 'all', label: 'All Channels' },
                                { id: 'kbzpay', label: 'KBZPay' },
                                { id: 'wavepay', label: 'WavePay' },
                                { id: 'cbpay', label: 'CB Pay' },
                                { id: 'ayapay', label: 'AYA Pay' },
                            ].map((tab) => (
                                <button
                                    key={tab.id}
                                    type="button"
                                    onClick={() => {
                                        setSelectedChannel(tab.id);
                                        handleFilterSubmit(tab.id, selectedStatus, searchTerm);
                                    }}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                                        selectedChannel === tab.id
                                            ? 'bg-[#705CF6] text-white shadow-sm'
                                            : 'bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200 border border-slate-200 dark:border-slate-800'
                                    }`}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>

                        {/* Search & Status Filters */}
                        <div className="flex items-center gap-2 w-full md:w-auto">
                            <select
                                value={selectedStatus}
                                onChange={(e) => {
                                    setSelectedStatus(e.target.value);
                                    handleFilterSubmit(selectedChannel, e.target.value, searchTerm);
                                }}
                                className="rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs text-slate-900 dark:text-slate-200 focus:border-[#705CF6] focus:ring-1 focus:ring-[#705CF6]"
                            >
                                <option value="all">All Statuses</option>
                                <option value="unmatched">Unmatched</option>
                                <option value="matched">Matched (100%)</option>
                                <option value="fuzzy_matched">Fuzzy Matched</option>
                                <option value="suspense">Suspense / Direct</option>
                                <option value="disputed">Disputed</option>
                            </select>

                            <div className="relative flex-1 md:w-64">
                                <input
                                    type="text"
                                    placeholder="Search Txn ID, Phone, Name..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            handleFilterSubmit(selectedChannel, selectedStatus, searchTerm);
                                        }
                                    }}
                                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs text-slate-900 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:border-[#705CF6] focus:ring-1 focus:ring-[#705CF6]"
                                />
                                {searchTerm && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setSearchTerm('');
                                            handleFilterSubmit(selectedChannel, selectedStatus, '');
                                        }}
                                        className="absolute right-2.5 top-2 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                                    >
                                        ✕
                                    </button>
                                )}
                            </div>

                            <button
                                type="button"
                                onClick={() => handleFilterSubmit(selectedChannel, selectedStatus, searchTerm)}
                                className="rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
                            >
                                Filter
                            </button>
                        </div>
                    </div>

                    {/* Ledger Table */}
                    <div className="overflow-x-auto">
                        <table className="w-full table-auto text-left text-xs">
                            <thead className="bg-slate-50 dark:bg-slate-900/80 text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800 uppercase tracking-wider font-semibold">
                                <tr>
                                    <th className="px-3 py-2.5">Channel</th>
                                    <th className="px-3 py-2.5">Bank Transaction ID</th>
                                    <th className="px-3 py-2.5">Datetime</th>
                                    <th className="px-3 py-2.5">Sender Details</th>
                                    <th className="px-3 py-2.5 text-right">Gross (MMK)</th>
                                    <th className="px-3 py-2.5 text-right">Fee (MMK)</th>
                                    <th className="px-3 py-2.5 text-right">Net Settled (MMK)</th>
                                    <th className="px-3 py-2.5">Reference / Narrative</th>
                                    <th className="px-3 py-2.5">Status</th>
                                    <th className="px-3 py-2.5 text-center">Payload</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                                {transactions.data.length === 0 ? (
                                    <tr>
                                        <td colSpan={10} className="px-4 py-8 text-center text-slate-500">
                                            No bank transactions matched your filters.
                                        </td>
                                    </tr>
                                ) : (
                                    transactions.data.map((tx) => (
                                        <tr key={tx.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                                            <td className="px-3 py-2.5">
                                                {getChannelBadge(tx.payment_channel, true)}
                                            </td>
                                            <td className="px-3 py-2.5 font-mono text-[11px] font-bold text-slate-900 dark:text-slate-200 tracking-tight select-all">
                                                {tx.bank_transaction_id}
                                            </td>
                                            <td className="px-3 py-2.5 text-xs text-slate-600 dark:text-slate-400 whitespace-nowrap">
                                                {tx.transaction_datetime}
                                            </td>
                                            <td className="px-3 py-2.5">
                                                <div className="font-semibold text-slate-900 dark:text-slate-200 text-xs">{tx.sender_name || 'N/A'}</div>
                                                <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">{tx.sender_phone || 'N/A'}</div>
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

                    {/* Transactions Pagination */}
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
                                        preserveState
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
