import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, usePage } from '@inertiajs/react';
import { PageProps } from '@/types';
import React from 'react';

interface ChannelVolumes {
    kbzpay: number;
    wavepay: number;
    cbpay: number;
    ayapay: number;
}

interface Metrics {
    total_invoices: number;
    expected_revenue: number;
    reconciled_volume: number;
    pending_slips: number;
    fraud_alerts: number;
    channel_volumes: ChannelVolumes;
}

interface ReconciliationMatchItem {
    id: number;
    invoice_number: string;
    customer_name: string;
    channel: string;
    slip_tx_id: string;
    match_type: string;
    confidence_score: number;
    invoice_amount: number;
    slip_amount: number;
    bank_amount: number;
    variance_amount: number;
    status: string;
    notes: string | null;
    created_at: string;
}

interface DashboardProps {
    metrics: Metrics;
    recentMatches: ReconciliationMatchItem[];
    userRole: string;
}

export default function Dashboard({
    metrics,
    recentMatches,
    userRole,
}: DashboardProps) {
    const { auth } = usePage<PageProps>().props;

    const formatMMK = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'decimal',
            minimumFractionDigits: 0,
            maximumFractionDigits: 2,
        }).format(amount) + ' MMK';
    };

    const getChannelBadge = (channel: string) => {
        switch (channel.toLowerCase()) {
            case 'kbzpay':
                return (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-xl text-xs font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-300 border border-blue-200 dark:border-blue-800/60 shadow-sm">
                        KBZPay
                    </span>
                );
            case 'wavepay':
                return (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-xl text-xs font-bold bg-amber-50 dark:bg-yellow-950/60 text-amber-600 dark:text-yellow-300 border border-amber-200 dark:border-yellow-800/60 shadow-sm">
                        WavePay
                    </span>
                );
            case 'cbpay':
                return (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-xl text-xs font-bold bg-orange-50 dark:bg-orange-950/60 text-orange-600 dark:text-orange-300 border border-orange-200 dark:border-orange-800/60 shadow-sm">
                        CB Pay
                    </span>
                );
            case 'ayapay':
                return (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-xl text-xs font-bold bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-300 border border-rose-200 dark:border-rose-800/60 shadow-sm">
                        AYA Pay
                    </span>
                );
            default:
                return (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                        {channel}
                    </span>
                );
        }
    };

    const getMatchBadge = (type: string, status: string) => {
        if (status === 'rejected_fraud' || type.includes('fraud')) {
            return (
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-300 border border-red-200 dark:border-red-800/80">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 me-1.5 animate-pulse"></span>
                    Fraud Flagged
                </span>
            );
        }
        if (type === 'exact_match' || status === 'auto_approved') {
            return (
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/80">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 me-1.5"></span>
                    Exact Match
                </span>
            );
        }
        if (type === 'fuzzy_match' || type === 'fee_adjusted_match') {
            return (
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-50 dark:bg-purple-950/50 text-[#705CF6] dark:text-purple-300 border border-purple-200 dark:border-purple-800/80">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#705CF6] me-1.5"></span>
                    Fuzzy Match
                </span>
            );
        }
        return (
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-sky-50 dark:bg-sky-950/50 text-sky-600 dark:text-sky-300 border border-sky-200 dark:border-sky-800/80">
                <span className="w-1.5 h-1.5 rounded-full bg-sky-500 me-1.5"></span>
                Pending Review
            </span>
        );
    };

    const totalChannelVolume = Math.max(
        metrics.channel_volumes.kbzpay +
        metrics.channel_volumes.wavepay +
        metrics.channel_volumes.cbpay +
        metrics.channel_volumes.ayapay,
        1
    );

    const getChannelPercent = (vol: number) => {
        return Math.round((vol / totalChannelVolume) * 100);
    };

    return (
        <AuthenticatedLayout>
            <Head title="Reconciliation Dashboard - ReconGuard" />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-7">
                {/* Dashboard Title & Quick Stats Ribbon */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                            Financial Overview & Settlement Engine
                        </h2>
                        <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-400 mt-1">
                            Autonomous cross-verification: ERP Invoices ↔ OCR Slip Vault ↔ Bank Statements
                        </p>
                    </div>
                </div>

                {/* Primary Financial Metric Cards (FinSet Elevated Style) */}
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                    {/* Expected Revenue */}
                    <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#161B26] p-6 shadow-sm hover:shadow-md transition-all">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-400">
                                Expected Revenue
                            </span>
                            <span className="p-2.5 rounded-2xl bg-[#705CF6]/10 text-[#705CF6]">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </span>
                        </div>
                        <div className="mt-4">
                            <div className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                                {formatMMK(metrics.expected_revenue)}
                            </div>
                            <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-400">
                                <span>Across</span>
                                <strong className="text-[#705CF6] font-semibold">{metrics.total_invoices}</strong>
                                <span>issued invoices</span>
                            </div>
                        </div>
                    </div>

                    {/* Reconciled Volume */}
                    <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#161B26] p-6 shadow-sm hover:shadow-md transition-all">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-400">
                                Reconciled Volume
                            </span>
                            <span className="p-2.5 rounded-2xl bg-emerald-500/10 text-emerald-500">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </span>
                        </div>
                        <div className="mt-4">
                            <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight">
                                {formatMMK(metrics.reconciled_volume)}
                            </div>
                            <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-400">
                                <span className="inline-flex items-center text-emerald-600 dark:text-emerald-400 font-bold">
                                    {metrics.expected_revenue > 0
                                        ? ((metrics.reconciled_volume / metrics.expected_revenue) * 100).toFixed(1) + '%'
                                        : '0%'}
                                </span>
                                <span>verified settlement rate</span>
                            </div>
                        </div>
                    </div>

                    {/* Pending Slips */}
                    <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#161B26] p-6 shadow-sm hover:shadow-md transition-all">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-400">
                                Pending Slips
                            </span>
                            <span className="p-2.5 rounded-2xl bg-sky-500/10 text-sky-500">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </span>
                        </div>
                        <div className="mt-4">
                            <div className="text-2xl font-black text-sky-600 dark:text-sky-400 tracking-tight">
                                {metrics.pending_slips}
                            </div>
                            <div className="mt-2 text-xs text-slate-700 dark:text-slate-400">
                                Awaiting ledger statement match
                            </div>
                        </div>
                    </div>

                    {/* Fraud Alerts */}
                    <div className="rounded-2xl border border-rose-200/80 dark:border-rose-900/40 bg-white dark:bg-[#161B26] p-6 shadow-sm hover:shadow-md transition-all">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">
                                Fraud Alerts
                            </span>
                            <span className="p-2.5 rounded-2xl bg-rose-500/10 text-rose-500">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                            </span>
                        </div>
                        <div className="mt-4">
                            <div className="text-2xl font-black text-rose-600 dark:text-rose-400 tracking-tight">
                                {metrics.fraud_alerts}
                            </div>
                            <div className="mt-2 flex items-center gap-1.5 text-xs text-rose-600 dark:text-rose-400 font-semibold">
                                <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-ping"></span>
                                Requires immediate audit review
                            </div>
                        </div>
                    </div>
                </div>

                {/* Multi-Channel Mobile Wallet Breakdown with Progress Meters */}
                <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#161B26] p-6 shadow-sm">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-5 border-b border-slate-100 dark:border-slate-800/80 gap-2">
                        <div>
                            <h3 className="text-base font-bold text-slate-900 dark:text-white">
                                Channel Settlement Breakdown
                            </h3>
                            <p className="text-xs text-slate-700 dark:text-slate-400 mt-0.5">
                                Reconciled transaction volume distribution across Myanmar mobile payment gateways
                            </p>
                        </div>
                        <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 px-3 py-1 rounded-xl bg-slate-100 dark:bg-[#1E2536]">
                            Total: {formatMMK(totalChannelVolume)}
                        </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mt-6">
                        {/* KBZPay */}
                        <div className="p-4 rounded-2xl bg-slate-50/70 dark:bg-[#1A202C]/60 border border-slate-200/60 dark:border-slate-800 flex flex-col justify-between">
                            <div>
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-blue-600 dark:text-blue-400">KBZPay</span>
                                    <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">{getChannelPercent(metrics.channel_volumes.kbzpay)}%</span>
                                </div>
                                <div className="mt-2 text-lg font-black text-slate-900 dark:text-white">
                                    {formatMMK(metrics.channel_volumes.kbzpay)}
                                </div>
                            </div>
                            <div className="mt-3">
                                <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
                                    <div
                                        className="h-2 rounded-full bg-blue-500"
                                        style={{ width: `${getChannelPercent(metrics.channel_volumes.kbzpay)}%` }}
                                    ></div>
                                </div>
                                <span className="text-[10px] text-slate-400 block mt-1.5 font-medium">Merchant App API</span>
                            </div>
                        </div>

                        {/* WavePay */}
                        <div className="p-4 rounded-2xl bg-slate-50/70 dark:bg-[#1A202C]/60 border border-slate-200/60 dark:border-slate-800 flex flex-col justify-between">
                            <div>
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-amber-600 dark:text-amber-400">WavePay</span>
                                    <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">{getChannelPercent(metrics.channel_volumes.wavepay)}%</span>
                                </div>
                                <div className="mt-2 text-lg font-black text-slate-900 dark:text-white">
                                    {formatMMK(metrics.channel_volumes.wavepay)}
                                </div>
                            </div>
                            <div className="mt-3">
                                <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
                                    <div
                                        className="h-2 rounded-full bg-amber-500"
                                        style={{ width: `${getChannelPercent(metrics.channel_volumes.wavepay)}%` }}
                                    ></div>
                                </div>
                                <span className="text-[10px] text-slate-400 block mt-1.5 font-medium">QR Merchant Portal</span>
                            </div>
                        </div>

                        {/* CB Pay */}
                        <div className="p-4 rounded-2xl bg-slate-50/70 dark:bg-[#1A202C]/60 border border-slate-200/60 dark:border-slate-800 flex flex-col justify-between">
                            <div>
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-orange-600 dark:text-orange-400">CB Pay</span>
                                    <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">{getChannelPercent(metrics.channel_volumes.cbpay)}%</span>
                                </div>
                                <div className="mt-2 text-lg font-black text-slate-900 dark:text-white">
                                    {formatMMK(metrics.channel_volumes.cbpay)}
                                </div>
                            </div>
                            <div className="mt-3">
                                <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
                                    <div
                                        className="h-2 rounded-full bg-orange-500"
                                        style={{ width: `${getChannelPercent(metrics.channel_volumes.cbpay)}%` }}
                                    ></div>
                                </div>
                                <span className="text-[10px] text-slate-400 block mt-1.5 font-medium">Corporate Bank API</span>
                            </div>
                        </div>

                        {/* AYA Pay */}
                        <div className="p-4 rounded-2xl bg-slate-50/70 dark:bg-[#1A202C]/60 border border-slate-200/60 dark:border-slate-800 flex flex-col justify-between">
                            <div>
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-rose-600 dark:text-rose-400">AYA Pay</span>
                                    <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">{getChannelPercent(metrics.channel_volumes.ayapay)}%</span>
                                </div>
                                <div className="mt-2 text-lg font-black text-slate-900 dark:text-white">
                                    {formatMMK(metrics.channel_volumes.ayapay)}
                                </div>
                            </div>
                            <div className="mt-3">
                                <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
                                    <div
                                        className="h-2 rounded-full bg-rose-500"
                                        style={{ width: `${getChannelPercent(metrics.channel_volumes.ayapay)}%` }}
                                    ></div>
                                </div>
                                <span className="text-[10px] text-slate-400 block mt-1.5 font-medium">Merchant Gateway</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Recent Reconciliation Activity Audit Table (FinSet Minimalist Style) */}
                <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#161B26] shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-slate-100 dark:border-slate-800/80 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div>
                            <h3 className="text-base font-bold text-slate-900 dark:text-white">
                                Recent 3-Way Reconciliations & Audit Feed
                            </h3>
                            <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                                Verified cross-match logs between ERP Invoices, customer OCR slips, and bank CSV records
                            </p>
                        </div>
                        <span className="text-xs font-semibold text-slate-700 dark:text-slate-400 bg-slate-100 dark:bg-[#1E2536] px-3 py-1.5 rounded-xl border border-slate-200/60 dark:border-slate-800 w-fit">
                            Showing latest {recentMatches.length} transactions
                        </span>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800 text-left text-sm">
                            <thead className="bg-slate-50 dark:bg-[#1A202C]/60 text-[11px] uppercase tracking-wider text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-800">
                                <tr>
                                    <th scope="col" className="px-6 py-4">Invoice</th>
                                    <th scope="col" className="px-6 py-4">Customer</th>
                                    <th scope="col" className="px-6 py-4">Channel</th>
                                    <th scope="col" className="px-6 py-4">Transaction ID</th>
                                    <th scope="col" className="px-6 py-4">Amounts (Inv / Slip / Bank)</th>
                                    <th scope="col" className="px-6 py-4">Confidence</th>
                                    <th scope="col" className="px-6 py-4">Audit Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 dark:divide-slate-800/80 text-slate-700 dark:text-slate-300">
                                {recentMatches.map((item) => (
                                    <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                                        <td className="whitespace-nowrap px-6 py-4 font-mono font-bold text-[#705CF6]">
                                            {item.invoice_number}
                                        </td>
                                        <td className="whitespace-nowrap px-6 py-4">
                                            <div className="font-semibold text-slate-900 dark:text-white">{item.customer_name}</div>
                                            <div className="text-xs text-slate-500 dark:text-slate-400">{item.created_at}</div>
                                        </td>
                                        <td className="whitespace-nowrap px-6 py-4">
                                            {getChannelBadge(item.channel)}
                                        </td>
                                        <td className="whitespace-nowrap px-6 py-4 font-mono text-xs text-slate-700 dark:text-slate-300">
                                            {item.slip_tx_id}
                                        </td>
                                        <td className="whitespace-nowrap px-6 py-4 text-xs font-mono">
                                            <div>
                                                <span className="text-slate-500 dark:text-slate-400">Inv: </span>
                                                <span className="font-semibold text-slate-900 dark:text-white">{formatMMK(item.invoice_amount)}</span>
                                            </div>
                                            <div>
                                                <span className="text-slate-500 dark:text-slate-400">Slip: </span>
                                                <span className={item.variance_amount > 0 ? 'text-amber-500 font-semibold' : 'text-slate-700 dark:text-slate-300'}>
                                                    {formatMMK(item.slip_amount)}
                                                </span>
                                            </div>
                                            {item.bank_amount > 0 && (
                                                <div>
                                                    <span className="text-slate-500 dark:text-slate-400">Bank: </span>
                                                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{formatMMK(item.bank_amount)}</span>
                                                </div>
                                            )}
                                        </td>
                                        <td className="whitespace-nowrap px-6 py-4">
                                            <div className="flex items-center space-x-2">
                                                <div className="w-16 bg-slate-200 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
                                                    <div
                                                        className={`h-2 rounded-full ${
                                                            item.confidence_score >= 90
                                                                ? 'bg-emerald-500'
                                                                : item.confidence_score >= 70
                                                                ? 'bg-amber-500'
                                                                : 'bg-rose-500'
                                                        }`}
                                                        style={{ width: `${Math.min(item.confidence_score, 100)}%` }}
                                                    ></div>
                                                </div>
                                                <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                                                    {item.confidence_score}%
                                                </span>
                                            </div>
                                        </td>
                                        <td className="whitespace-nowrap px-6 py-4">
                                            {getMatchBadge(item.match_type, item.status)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
