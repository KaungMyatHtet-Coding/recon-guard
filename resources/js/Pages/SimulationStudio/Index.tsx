import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import { FormEvent, useState } from 'react';
import axios from 'axios';
import { PageProps } from '@/types';

interface InvoiceItem {
    id: number;
    invoice_number: string;
    customer_name: string;
    customer_phone: string | null;
    amount: number;
    expected_channel: string;
    status: string;
}

interface BatchItem {
    id: number;
    payment_channel: string;
    original_filename: string;
    statement_date: string;
    total_records: number;
    total_credit_amount: number;
    status: string;
    uploader?: {
        name: string;
    };
}

interface SimulationStudioProps {
    invoices: InvoiceItem[];
    recentBatches: BatchItem[];
    counts: {
        invoices: number;
        slips: number;
        bank_txns: number;
        batches: number;
        matches: number;
    };
}

export default function SimulationStudio({
    invoices,
    recentBatches,
    counts,
}: SimulationStudioProps) {
    const { auth } = usePage<PageProps>().props;

    // Bulk Generator Form State
    const { data: bulkData, setData: setBulkData, post: postBulk, processing: bulkProcessing } = useForm({
        size: 50,
        channel: 'all',
    });

    // Mock Slip Generator Lab State
    const [selectedInvoiceId, setSelectedInvoiceId] = useState<number>(invoices[0]?.id || 0);
    const [channel, setChannel] = useState<'kbzpay' | 'wavepay' | 'cbpay' | 'ayapay'>('kbzpay');
    const [mode, setMode] = useState<'legit' | 'tampered_amount' | 'duplicate_id'>('legit');
    const [tamperedAmount, setTamperedAmount] = useState<string>('500000');
    const [duplicateTxnId, setDuplicateTxnId] = useState<string>('010020261028984210');
    const [previewLoading, setPreviewLoading] = useState<boolean>(false);
    const [previewData, setPreviewData] = useState<{
        preview_url: string;
        txn_id: string;
        amount: number;
        channel: string;
        mode: string;
        image_hash: string;
        metadata: any;
    } | null>(null);

    // Reset Demo Modal State
    const [showResetModal, setShowResetModal] = useState<boolean>(false);
    const [resetProcessing, setResetProcessing] = useState<boolean>(false);

    const handleBulkGenerate = (e: FormEvent) => {
        e.preventDefault();
        postBulk(route('simulation-studio.generate-bulk'), {
            preserveScroll: true,
        });
    };

    const handleGeneratePreview = async () => {
        if (!selectedInvoiceId) return;
        setPreviewLoading(true);
        try {
            const resp = await axios.post(route('simulation-studio.preview-slip'), {
                invoice_id: selectedInvoiceId,
                channel: channel,
                mode: mode,
                tampered_amount: mode === 'tampered_amount' ? parseFloat(tamperedAmount) : null,
                duplicate_txn_id: mode === 'duplicate_id' ? duplicateTxnId : null,
            });
            if (resp.data.success) {
                setPreviewData(resp.data);
            }
        } catch (err: any) {
            alert('Failed to generate preview: ' + (err.response?.data?.message || err.message));
        } finally {
            setPreviewLoading(false);
        }
    };

    const handle1ClickInject = () => {
        if (!selectedInvoiceId) return;
        const currentTxnId = previewData?.txn_id || (channel === 'kbzpay' ? '0100' + Date.now() : 'TXN' + Date.now());
        const currentAmount = previewData?.amount || (invoices.find(i => i.id === selectedInvoiceId)?.amount || 100000);

        router.post(
            route('simulation-studio.inject-slip'),
            {
                invoice_id: selectedInvoiceId,
                channel: channel,
                mode: mode,
                txn_id: currentTxnId,
                slip_amount: currentAmount,
            },
            {
                preserveScroll: true,
            }
        );
    };

    const handleConfirmReset = () => {
        setResetProcessing(true);
        router.post(
            route('simulation-studio.reset-demo'),
            {},
            {
                onFinish: () => {
                    setResetProcessing(false);
                    setShowResetModal(false);
                },
            }
        );
    };

    const formatMMK = (amount: number) => {
        return new Intl.NumberFormat('my-MM', {
            style: 'decimal',
            minimumFractionDigits: 0,
            maximumFractionDigits: 2,
        }).format(amount) + ' MMK';
    };

    return (
        <AuthenticatedLayout
            header={
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h2 className="text-xl font-bold leading-tight text-white flex items-center space-x-2">
                            <span>Synthetic Dataset & Mock Slip Simulation Studio</span>
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-purple-950 text-purple-300 border border-purple-700">
                                Phase 2 Studio
                            </span>
                        </h2>
                        <p className="text-xs text-slate-400 mt-1">
                            Generate thousands of realistic Myanmar transactions, download native bank CSVs, and simulate Photoshopped fraud slips
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={() => setShowResetModal(true)}
                            className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-950/80 hover:bg-rose-900 text-rose-300 border border-rose-700 transition"
                        >
                            <svg className="w-4 h-4 me-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            Reset Demo Environment
                        </button>
                    </div>
                </div>
            }
        >
            <Head title="Simulation Studio - ReconGuard" />

            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-8">
                {/* System Telemetry Stats */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                    <div className="p-3 rounded-lg bg-slate-800/60 border border-slate-700/60 text-center">
                        <div className="text-xs text-slate-400">Total Invoices</div>
                        <div className="text-lg font-bold text-white mt-1">{counts.invoices}</div>
                    </div>
                    <div className="p-3 rounded-lg bg-slate-800/60 border border-slate-700/60 text-center">
                        <div className="text-xs text-slate-400">Payment Slips</div>
                        <div className="text-lg font-bold text-sky-400 mt-1">{counts.slips}</div>
                    </div>
                    <div className="p-3 rounded-lg bg-slate-800/60 border border-slate-700/60 text-center">
                        <div className="text-xs text-slate-400">Bank Rows</div>
                        <div className="text-lg font-bold text-emerald-400 mt-1">{counts.bank_txns}</div>
                    </div>
                    <div className="p-3 rounded-lg bg-slate-800/60 border border-slate-700/60 text-center">
                        <div className="text-xs text-slate-400">Statement Batches</div>
                        <div className="text-lg font-bold text-amber-400 mt-1">{counts.batches}</div>
                    </div>
                    <div className="p-3 rounded-lg bg-slate-800/60 border border-slate-700/60 text-center col-span-2 sm:col-span-1">
                        <div className="text-xs text-slate-400">Reconciliations</div>
                        <div className="text-lg font-bold text-indigo-400 mt-1">{counts.matches}</div>
                    </div>
                </div>

                {/* Panel A: Bulk Dataset & Bank CSV Generator */}
                <div className="rounded-xl border border-slate-800 bg-slate-800/40 p-6 backdrop-blur">
                    <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-slate-800 gap-4">
                        <div>
                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                <span className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                                    </svg>
                                </span>
                                Panel A: Bulk Dataset & Official Bank CSV Generator
                            </h3>
                            <p className="text-xs text-slate-400 mt-1">
                                Inject large-scale synthetic test batches with controlled anomalies (80% Exact, 8% Fee, 5% Fuzzy, 4% Fraud, 3% Suspense)
                            </p>
                        </div>

                        {/* Direct Channel CSV Download Quick Actions */}
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs text-slate-400 me-1">Export CSVs:</span>
                            <a
                                href={route('simulation-studio.download-csv', { channel: 'kbzpay' })}
                                className="px-2.5 py-1 text-xs font-semibold rounded bg-blue-950 text-blue-300 hover:bg-blue-900 border border-blue-700/60 transition"
                            >
                                ↓ KBZPay.csv
                            </a>
                            <a
                                href={route('simulation-studio.download-csv', { channel: 'wavepay' })}
                                className="px-2.5 py-1 text-xs font-semibold rounded bg-yellow-950 text-yellow-300 hover:bg-yellow-900 border border-yellow-700/60 transition"
                            >
                                ↓ WavePay.csv
                            </a>
                            <a
                                href={route('simulation-studio.download-csv', { channel: 'cbpay' })}
                                className="px-2.5 py-1 text-xs font-semibold rounded bg-orange-950 text-orange-300 hover:bg-orange-900 border border-orange-700/60 transition"
                            >
                                ↓ CBPay.csv
                            </a>
                            <a
                                href={route('simulation-studio.download-csv', { channel: 'ayapay' })}
                                className="px-2.5 py-1 text-xs font-semibold rounded bg-red-950 text-red-300 hover:bg-red-900 border border-red-700/60 transition"
                            >
                                ↓ AYAPay.csv
                            </a>
                        </div>
                    </div>

                    <form onSubmit={handleBulkGenerate} className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
                        <div>
                            <label className="block text-xs font-medium text-slate-300 mb-1.5">
                                Batch Dataset Size
                            </label>
                            <select
                                value={bulkData.size}
                                onChange={(e) => setBulkData('size', parseInt(e.target.value))}
                                className="w-full rounded-lg bg-slate-900 border border-slate-700 text-sm text-white focus:border-indigo-500 focus:ring-indigo-500"
                            >
                                <option value={50}>50 Transactions (Quick Test)</option>
                                <option value={200}>200 Transactions (Balanced Demo)</option>
                                <option value={500}>500 Transactions (Auditor Stress Test)</option>
                                <option value={1000}>1,000 Transactions (Full University Showcase)</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-slate-300 mb-1.5">
                                Target Channel
                            </label>
                            <select
                                value={bulkData.channel}
                                onChange={(e) => setBulkData('channel', e.target.value)}
                                className="w-full rounded-lg bg-slate-900 border border-slate-700 text-sm text-white focus:border-indigo-500 focus:ring-indigo-500"
                            >
                                <option value="all">All 4 Channels (KBZPay, Wave, CB, AYA)</option>
                                <option value="kbzpay">KBZPay Only</option>
                                <option value="wavepay">WavePay Only</option>
                                <option value="cbpay">CB Pay Only</option>
                                <option value="ayapay">AYA Pay Only</option>
                            </select>
                        </div>

                        <div>
                            <button
                                type="submit"
                                disabled={bulkProcessing}
                                className="w-full py-2.5 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-500 font-semibold text-sm text-white shadow-lg shadow-indigo-600/30 transition disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {bulkProcessing ? (
                                    <>
                                        <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                                        </svg>
                                        Generating Dataset...
                                    </>
                                ) : (
                                    <>
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                                        </svg>
                                        Generate Bulk Invoices, Slips & CSVs
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </div>

                {/* Panel B: Interactive Mock Slip Forgery & Legit Receipt Lab */}
                <div className="rounded-xl border border-slate-800 bg-slate-800/40 p-6 backdrop-blur">
                    <div className="pb-4 border-b border-slate-800">
                        <h3 className="text-lg font-bold text-white flex items-center gap-2">
                            <span className="p-1.5 rounded-lg bg-purple-500/10 text-purple-400">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                            </span>
                            Panel B: Interactive Mock Slip Forgery & Legit Receipt Lab
                        </h3>
                        <p className="text-xs text-slate-400 mt-1">
                            Simulate genuine receipts or forged payment slips (Photoshop inflated amount, duplicate TXN ID) and test fraud detection
                        </p>
                    </div>

                    <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
                        {/* Configuration Controls */}
                        <div className="lg:col-span-6 space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-slate-300 mb-1">
                                    Select Unpaid / Pending Invoice
                                </label>
                                <select
                                    value={selectedInvoiceId}
                                    onChange={(e) => setSelectedInvoiceId(parseInt(e.target.value))}
                                    className="w-full rounded-lg bg-slate-900 border border-slate-700 text-sm text-white focus:border-indigo-500 focus:ring-indigo-500"
                                >
                                    {invoices.map((inv) => (
                                        <option key={inv.id} value={inv.id}>
                                            {inv.invoice_number} — {inv.customer_name} ({formatMMK(inv.amount)}) [{inv.expected_channel}]
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-medium text-slate-300 mb-1">
                                        Wallet Channel Style
                                    </label>
                                    <select
                                        value={channel}
                                        onChange={(e) => setChannel(e.target.value as any)}
                                        className="w-full rounded-lg bg-slate-900 border border-slate-700 text-sm text-white focus:border-indigo-500 focus:ring-indigo-500"
                                    >
                                        <option value="kbzpay">KBZPay (KPay)</option>
                                        <option value="wavepay">WavePay</option>
                                        <option value="cbpay">CB Pay</option>
                                        <option value="ayapay">AYA Pay</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-medium text-slate-300 mb-1">
                                        Simulation Mode
                                    </label>
                                    <select
                                        value={mode}
                                        onChange={(e) => setMode(e.target.value as any)}
                                        className="w-full rounded-lg bg-slate-900 border border-slate-700 text-sm text-white focus:border-indigo-500 focus:ring-indigo-500"
                                    >
                                        <option value="legit">Legit Genuine Slip</option>
                                        <option value="tampered_amount">Tampered Amount (Photoshop Simulation)</option>
                                        <option value="duplicate_id">Duplicate Transaction ID Fraud</option>
                                    </select>
                                </div>
                            </div>

                            {/* Conditional Mode Inputs */}
                            {mode === 'tampered_amount' && (
                                <div className="p-3.5 rounded-lg bg-rose-950/40 border border-rose-800/60 space-y-2">
                                    <div className="text-xs font-semibold text-rose-300 flex items-center gap-1.5">
                                        <svg className="w-4 h-4 text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                        </svg>
                                        Tampered Slip Configuration
                                    </div>
                                    <label className="block text-[11px] text-slate-400">
                                        Inflated Amount Claimed on Slip (Bank row will actually record only 5,000 MMK):
                                    </label>
                                    <input
                                        type="number"
                                        value={tamperedAmount}
                                        onChange={(e) => setTamperedAmount(e.target.value)}
                                        className="w-full rounded-lg bg-slate-900 border border-slate-700 text-sm text-white"
                                        placeholder="500000"
                                    />
                                    <p className="text-[10px] text-rose-400/90">
                                        Injects simulated EXIF metadata: "Software: Adobe Photoshop 25.0 (Windows)" and lowers OCR confidence.
                                    </p>
                                </div>
                            )}

                            {mode === 'duplicate_id' && (
                                <div className="p-3.5 rounded-lg bg-amber-950/40 border border-amber-800/60 space-y-2">
                                    <div className="text-xs font-semibold text-amber-300 flex items-center gap-1.5">
                                        <svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                        </svg>
                                        Duplicate Transaction ID Configuration
                                    </div>
                                    <label className="block text-[11px] text-slate-400">
                                        Reuse Existing Transaction ID:
                                    </label>
                                    <input
                                        type="text"
                                        value={duplicateTxnId}
                                        onChange={(e) => setDuplicateTxnId(e.target.value)}
                                        className="w-full rounded-lg bg-slate-900 border border-slate-700 text-sm text-white"
                                        placeholder="KP-20261028-984210"
                                    />
                                </div>
                            )}

                            {/* Actions */}
                            <div className="pt-2 flex flex-col sm:flex-row gap-3">
                                <button
                                    type="button"
                                    onClick={handleGeneratePreview}
                                    disabled={previewLoading}
                                    className="flex-1 py-2 px-4 rounded-lg bg-slate-700 hover:bg-slate-600 font-semibold text-xs text-white border border-slate-600 transition flex items-center justify-center gap-1.5"
                                >
                                    {previewLoading ? 'Rendering PNG...' : 'Render Live Slip Preview'}
                                </button>

                                <button
                                    type="button"
                                    onClick={handle1ClickInject}
                                    className="flex-1 py-2 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-500 font-semibold text-xs text-white shadow-md shadow-emerald-600/20 transition flex items-center justify-center gap-1.5"
                                >
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                    </svg>
                                    1-Click Inject Slip & Bank Row
                                </button>
                            </div>
                        </div>

                        {/* Live Receipt Screenshot Preview Pane */}
                        <div className="lg:col-span-6 flex flex-col items-center justify-center p-4 rounded-xl bg-slate-900/80 border border-slate-800">
                            {previewData ? (
                                <div className="space-y-3 w-full max-w-sm flex flex-col items-center">
                                    <div className="relative rounded-lg overflow-hidden border border-slate-700 shadow-2xl">
                                        <img
                                            src={previewData.preview_url}
                                            alt="Mock Slip Preview"
                                            className="w-full h-auto max-h-[420px] object-contain bg-white"
                                        />
                                    </div>

                                    <div className="flex items-center gap-2 w-full">
                                        <a
                                            href={previewData.preview_url}
                                            download={`mock_slip_${previewData.channel}_${previewData.mode}.png`}
                                            className="flex-1 text-center py-1.5 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white transition"
                                        >
                                            Download Slip PNG
                                        </a>
                                        <span className="text-[10px] font-mono text-slate-400 truncate max-w-[150px]">
                                            Hash: {previewData.image_hash.substring(0, 12)}...
                                        </span>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-12 text-slate-500 space-y-2">
                                    <svg className="w-12 h-12 mx-auto text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                    <div className="text-xs font-medium text-slate-400">No Slip Rendered Yet</div>
                                    <div className="text-[11px]">Click "Render Live Slip Preview" to generate high-resolution wallet receipt</div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Panel C: Bank Statement Batch Archive */}
                <div className="rounded-xl border border-slate-800 bg-slate-800/40 p-6 backdrop-blur">
                    <h3 className="text-base font-semibold text-white mb-4">
                        Recent Bank Statement Batches & Download Portal
                    </h3>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-800 text-left text-sm">
                            <thead className="bg-slate-900/60 text-xs uppercase tracking-wider text-slate-400 font-semibold">
                                <tr>
                                    <th className="px-6 py-3">Channel</th>
                                    <th className="px-6 py-3">Filename</th>
                                    <th className="px-6 py-3">Date</th>
                                    <th className="px-6 py-3">Records</th>
                                    <th className="px-6 py-3">Total Credit (MMK)</th>
                                    <th className="px-6 py-3">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800 text-slate-300">
                                {recentBatches.map((batch) => (
                                    <tr key={batch.id} className="hover:bg-slate-800/50">
                                        <td className="px-6 py-3.5 uppercase font-semibold text-xs text-indigo-300">
                                            {batch.payment_channel}
                                        </td>
                                        <td className="px-6 py-3.5 font-mono text-xs text-slate-300">
                                            {batch.original_filename}
                                        </td>
                                        <td className="px-6 py-3.5 text-xs text-slate-400">
                                            {batch.statement_date}
                                        </td>
                                        <td className="px-6 py-3.5 text-xs font-semibold text-white">
                                            {batch.total_records}
                                        </td>
                                        <td className="px-6 py-3.5 text-xs font-mono text-emerald-400">
                                            {formatMMK(batch.total_credit_amount)}
                                        </td>
                                        <td className="px-6 py-3.5">
                                            <a
                                                href={route('simulation-studio.download-csv', {
                                                    channel: batch.payment_channel,
                                                    batch_id: batch.id,
                                                })}
                                                className="inline-flex items-center text-xs font-medium text-indigo-400 hover:text-indigo-300 gap-1"
                                            >
                                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                                </svg>
                                                Download CSV
                                            </a>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Custom Tailwind Confirmation Modal for Reset Demo */}
            {showResetModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
                    <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl space-y-4">
                        <div className="flex items-center gap-3 text-rose-400">
                            <span className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/30">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                            </span>
                            <div>
                                <h3 className="font-bold text-base text-white">Reset Demo Environment</h3>
                                <p className="text-xs text-slate-400">University Showcase Clean Reset</p>
                            </div>
                        </div>

                        <p className="text-sm text-slate-300 leading-relaxed">
                            Are you sure you want to re-seed the environment? This will wipe generated test batches and restore the pristine initial 15 demo invoices and 4 demo accounts.
                        </p>

                        <div className="flex items-center justify-end gap-3 pt-3">
                            <button
                                type="button"
                                onClick={() => setShowResetModal(false)}
                                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 transition"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleConfirmReset}
                                disabled={resetProcessing}
                                className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-xs font-semibold text-white shadow-lg shadow-rose-600/30 transition disabled:opacity-50"
                            >
                                {resetProcessing ? 'Resetting...' : 'Yes, Reset Environment'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </AuthenticatedLayout>
    );
}
