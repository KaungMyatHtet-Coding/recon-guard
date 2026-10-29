import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, usePage } from '@inertiajs/react';
import { PageProps } from '@/types';

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
        return new Intl.NumberFormat('my-MM', {
            style: 'decimal',
            minimumFractionDigits: 0,
            maximumFractionDigits: 2,
        }).format(amount) + ' MMK';
    };

    const getChannelBadge = (channel: string) => {
        switch (channel.toLowerCase()) {
            case 'kbzpay':
                return (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-blue-950 text-blue-300 border border-blue-700/60">
                        KBZPay
                    </span>
                );
            case 'wavepay':
                return (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-yellow-950 text-yellow-300 border border-yellow-700/60">
                        WavePay
                    </span>
                );
            case 'cbpay':
                return (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-orange-950 text-orange-300 border border-orange-700/60">
                        CB Pay
                    </span>
                );
            case 'ayapay':
                return (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-red-950 text-red-300 border border-red-700/60">
                        AYA Pay
                    </span>
                );
            default:
                return (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                        {channel}
                    </span>
                );
        }
    };

    const getMatchBadge = (type: string, status: string) => {
        if (status === 'rejected_fraud' || type.includes('fraud')) {
            return (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-900/60 text-red-300 border border-red-600/80">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-400 me-1.5 animate-pulse"></span>
                    Fraud Flagged
                </span>
            );
        }
        if (type === 'exact_match' || status === 'auto_approved') {
            return (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-900/60 text-emerald-300 border border-emerald-600/80">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 me-1.5"></span>
                    Exact Match
                </span>
            );
        }
        if (type === 'fuzzy_match' || type === 'fee_adjusted_match') {
            return (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-900/60 text-amber-300 border border-amber-600/80">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 me-1.5"></span>
                    Fuzzy Match
                </span>
            );
        }
        return (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-sky-900/60 text-sky-300 border border-sky-600/80">
                <span className="w-1.5 h-1.5 rounded-full bg-sky-400 me-1.5"></span>
                Pending Review
            </span>
        );
    };

    return (
        <AuthenticatedLayout
            header={
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h2 className="text-xl font-bold leading-tight text-white flex items-center space-x-2">
                            <span>Reconciliation & Fraud Monitoring</span>
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-indigo-950 text-indigo-300 border border-indigo-700">
                                Phase 1 Engine
                            </span>
                        </h2>
                        <p className="text-xs text-slate-400 mt-1">
                            3-Way Automated Match: Invoice ↔ Customer Slip OCR ↔ Bank Statement CSV
                        </p>
                    </div>
                    <div className="flex items-center space-x-3 text-xs text-slate-400">
                        <span className="inline-flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping"></span>
                            Live MySQL 8.0 Engine
                        </span>
                    </div>
                </div>
            }
        >
            <Head title="Reconciliation Dashboard - ReconGuard" />

            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-6">
                {/* Primary Financial Metric Cards */}
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                    {/* Expected Revenue */}
                    <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-800/60 p-5 shadow-sm backdrop-blur transition hover:border-slate-700">
                        <div className="flex items-center justify-between">
                            <dt className="truncate text-xs font-medium uppercase tracking-wider text-slate-400">
                                Expected Revenue
                            </dt>
                            <span className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </span>
                        </div>
                        <dd className="mt-3">
                            <div className="text-2xl font-black text-white">
                                {formatMMK(metrics.expected_revenue)}
                            </div>
                            <div className="text-xs text-slate-400 mt-1">
                                Across <span className="text-indigo-400 font-semibold">{metrics.total_invoices}</span> issued invoices
                            </div>
                        </dd>
                    </div>

                    {/* Reconciled & Verified */}
                    <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-800/60 p-5 shadow-sm backdrop-blur transition hover:border-slate-700">
                        <div className="flex items-center justify-between">
                            <dt className="truncate text-xs font-medium uppercase tracking-wider text-slate-400">
                                Reconciled Volume
                            </dt>
                            <span className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </span>
                        </div>
                        <dd className="mt-3">
                            <div className="text-2xl font-black text-emerald-400">
                                {formatMMK(metrics.reconciled_volume)}
                            </div>
                            <div className="text-xs text-slate-400 mt-1">
                                {metrics.expected_revenue > 0
                                    ? ((metrics.reconciled_volume / metrics.expected_revenue) * 100).toFixed(1) + '% verified settlement rate'
                                    : '0% rate'}
                            </div>
                        </dd>
                    </div>

                    {/* Pending Slips */}
                    <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-800/60 p-5 shadow-sm backdrop-blur transition hover:border-slate-700">
                        <div className="flex items-center justify-between">
                            <dt className="truncate text-xs font-medium uppercase tracking-wider text-slate-400">
                                Pending Slips
                            </dt>
                            <span className="p-2 rounded-lg bg-sky-500/10 text-sky-400">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </span>
                        </div>
                        <dd className="mt-3">
                            <div className="text-2xl font-black text-sky-400">
                                {metrics.pending_slips}
                            </div>
                            <div className="text-xs text-slate-400 mt-1">
                                Uploaded slips awaiting bank statement match
                            </div>
                        </dd>
                    </div>

                    {/* Fraud & Discrepancies */}
                    <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-800/60 p-5 shadow-sm backdrop-blur transition hover:border-slate-700">
                        <div className="flex items-center justify-between">
                            <dt className="truncate text-xs font-medium uppercase tracking-wider text-slate-400">
                                Fraud & Tamper Alerts
                            </dt>
                            <span className="p-2 rounded-lg bg-rose-500/10 text-rose-400">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                            </span>
                        </div>
                        <dd className="mt-3">
                            <div className="text-2xl font-black text-rose-400">
                                {metrics.fraud_alerts}
                            </div>
                            <div className="text-xs text-rose-300/80 mt-1 flex items-center gap-1">
                                <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-ping"></span>
                                Requires immediate audit review
                            </div>
                        </dd>
                    </div>
                </div>

                {/* Multi-Channel Breakdown Card */}
                <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-800/40 p-6 backdrop-blur">
                    <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wider mb-4 flex items-center justify-between">
                        <span>Multi-Channel Mobile Wallet & Bank Settlement Breakdown</span>
                        <span className="text-xs font-normal text-slate-400">Myanmar Mobile Payments</span>
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {/* KBZPay */}
                        <div className="p-4 rounded-lg bg-slate-900/60 border border-blue-900/40 flex flex-col justify-between">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-semibold text-blue-400">KBZPay (KPay)</span>
                                <span className="text-[10px] bg-blue-950 text-blue-300 px-1.5 py-0.5 rounded border border-blue-800/50">Merchant App</span>
                            </div>
                            <div className="mt-3 text-lg font-bold text-white">
                                {formatMMK(metrics.channel_volumes.kbzpay)}
                            </div>
                            <div className="text-[11px] text-slate-400 mt-1">Reconciled Settlement</div>
                        </div>

                        {/* WavePay */}
                        <div className="p-4 rounded-lg bg-slate-900/60 border border-yellow-900/40 flex flex-col justify-between">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-semibold text-yellow-400">WavePay / WaveMoney</span>
                                <span className="text-[10px] bg-yellow-950 text-yellow-300 px-1.5 py-0.5 rounded border border-yellow-800/50">QR Portal</span>
                            </div>
                            <div className="mt-3 text-lg font-bold text-white">
                                {formatMMK(metrics.channel_volumes.wavepay)}
                            </div>
                            <div className="text-[11px] text-slate-400 mt-1">Reconciled Settlement</div>
                        </div>

                        {/* CB Pay */}
                        <div className="p-4 rounded-lg bg-slate-900/60 border border-orange-900/40 flex flex-col justify-between">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-semibold text-orange-400">CB Pay (CB Bank)</span>
                                <span className="text-[10px] bg-orange-950 text-orange-300 px-1.5 py-0.5 rounded border border-orange-800/50">Corporate API</span>
                            </div>
                            <div className="mt-3 text-lg font-bold text-white">
                                {formatMMK(metrics.channel_volumes.cbpay)}
                            </div>
                            <div className="text-[11px] text-slate-400 mt-1">Reconciled Settlement</div>
                        </div>

                        {/* AYA Pay */}
                        <div className="p-4 rounded-lg bg-slate-900/60 border border-red-900/40 flex flex-col justify-between">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-semibold text-red-400">AYA Pay (AYA Bank)</span>
                                <span className="text-[10px] bg-red-950 text-red-300 px-1.5 py-0.5 rounded border border-red-800/50">Merchant Gateway</span>
                            </div>
                            <div className="mt-3 text-lg font-bold text-white">
                                {formatMMK(metrics.channel_volumes.ayapay)}
                            </div>
                            <div className="text-[11px] text-slate-400 mt-1">Reconciled Settlement</div>
                        </div>
                    </div>
                </div>

                {/* Recent Reconciliation Activity Audit Table */}
                <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-800/40 backdrop-blur">
                    <div className="p-6 border-b border-slate-800 flex items-center justify-between">
                        <div>
                            <h3 className="text-base font-semibold text-white">
                                Recent 3-Way Reconciliations & Audit Feed
                            </h3>
                            <p className="text-xs text-slate-400 mt-0.5">
                                Real-time verification log matching Invoices against customer OCR slips and bank CSV entries
                            </p>
                        </div>
                        <span className="text-xs text-slate-400 bg-slate-800 px-2.5 py-1 rounded-md border border-slate-700">
                            Showing last {recentMatches.length} transactions
                        </span>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-800 text-left text-sm">
                            <thead className="bg-slate-900/60 text-xs uppercase tracking-wider text-slate-400 font-semibold">
                                <tr>
                                    <th scope="col" className="px-6 py-3.5">Invoice</th>
                                    <th scope="col" className="px-6 py-3.5">Customer</th>
                                    <th scope="col" className="px-6 py-3.5">Channel</th>
                                    <th scope="col" className="px-6 py-3.5">Transaction ID</th>
                                    <th scope="col" className="px-6 py-3.5">Amounts (Inv / Slip / Bank)</th>
                                    <th scope="col" className="px-6 py-3.5">Confidence</th>
                                    <th scope="col" className="px-6 py-3.5">Audit Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800 text-slate-300">
                                {recentMatches.map((item) => (
                                    <tr key={item.id} className="hover:bg-slate-800/50 transition">
                                        <td className="whitespace-nowrap px-6 py-4 font-mono font-medium text-indigo-300">
                                            {item.invoice_number}
                                        </td>
                                        <td className="whitespace-nowrap px-6 py-4">
                                            <div className="font-medium text-white">{item.customer_name}</div>
                                            <div className="text-xs text-slate-400">{item.created_at}</div>
                                        </td>
                                        <td className="whitespace-nowrap px-6 py-4">
                                            {getChannelBadge(item.channel)}
                                        </td>
                                        <td className="whitespace-nowrap px-6 py-4 font-mono text-xs text-slate-300">
                                            {item.slip_tx_id}
                                        </td>
                                        <td className="whitespace-nowrap px-6 py-4 text-xs font-mono">
                                            <div>
                                                <span className="text-slate-400">Inv: </span>
                                                <span className="text-white font-semibold">{formatMMK(item.invoice_amount)}</span>
                                            </div>
                                            <div>
                                                <span className="text-slate-400">Slip: </span>
                                                <span className={item.variance_amount > 0 ? 'text-amber-400' : 'text-slate-300'}>
                                                    {formatMMK(item.slip_amount)}
                                                </span>
                                            </div>
                                            {item.bank_amount > 0 && (
                                                <div>
                                                    <span className="text-slate-400">Bank: </span>
                                                    <span className="text-emerald-400">{formatMMK(item.bank_amount)}</span>
                                                </div>
                                            )}
                                        </td>
                                        <td className="whitespace-nowrap px-6 py-4">
                                            <div className="flex items-center space-x-2">
                                                <div className="w-16 bg-slate-700 rounded-full h-1.5 overflow-hidden">
                                                    <div
                                                        className={`h-1.5 rounded-full ${
                                                            item.confidence_score >= 90
                                                                ? 'bg-emerald-400'
                                                                : item.confidence_score >= 70
                                                                ? 'bg-amber-400'
                                                                : 'bg-rose-500'
                                                        }`}
                                                        style={{ width: `${Math.min(item.confidence_score, 100)}%` }}
                                                    ></div>
                                                </div>
                                                <span className="text-xs font-semibold text-slate-200">
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
