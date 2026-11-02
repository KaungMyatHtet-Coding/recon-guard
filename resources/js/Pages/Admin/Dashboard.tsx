import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import React, { useState } from 'react';

interface KPIs {
    total_processed_volume: number;
    formatted_processed_volume: string;
    auto_recon_success_rate: number;
    total_fraud_prevented: number;
    formatted_fraud_prevented: string;
    unresolved_suspense_count: number;
    unresolved_suspense_volume: number;
    formatted_suspense_volume: string;
}

interface DonutStats {
    exact: number;
    fee_adjusted: number;
    fuzzy: number;
    fraud: number;
    total: number;
}

interface ChannelItem {
    channel: string;
    volume: number;
    formatted_volume: string;
    tx_count: number;
    matched_count: number;
}

interface BlacklistedUser {
    id: number;
    name: string;
    email: string;
    phone: string | null;
    is_blacklisted: boolean;
    blacklist_reason: string | null;
    updated_at: string;
    payment_slips_count: number;
}

interface FraudMatch {
    id: number;
    match_type: string;
    confidence_score: string | number;
    invoice_amount: string | number | null;
    slip_amount: string | number | null;
    bank_amount: string | number | null;
    variance_amount: string | number;
    notes: string | null;
    status: string;
    created_at: string;
    invoice?: {
        id: number;
        invoice_number: string;
        customer_name: string;
        customer_phone: string;
        customer?: {
            id: number;
            name: string;
            is_blacklisted: boolean;
        };
    };
    payment_slip?: {
        id: number;
        extracted_transaction_id: string;
        payment_channel: string;
        user_id: number;
    };
    bank_transaction?: {
        id: number;
        bank_transaction_id: string;
    };
}

interface CustomerOption {
    id: number;
    name: string;
    email: string;
    phone: string | null;
    is_blacklisted: boolean;
    blacklist_reason: string | null;
}

interface SupportAppealItem {
    id: number;
    user_id: number;
    subject: string;
    message: string;
    contact_phone: string | null;
    status: string;
    admin_response: string | null;
    created_at: string;
    user?: {
        id: number;
        name: string;
        email: string;
        phone: string | null;
    };
}

interface Props {
    kpis: KPIs;
    donutStats: DonutStats;
    channelStats: Record<string, ChannelItem>;
    blacklistedUsers: BlacklistedUser[];
    recentFraudMatches: FraudMatch[];
    customers: CustomerOption[];
    appeals?: SupportAppealItem[];
}

export default function Dashboard({
    kpis,
    donutStats,
    channelStats,
    blacklistedUsers,
    recentFraudMatches,
    customers,
    appeals = [],
}: Props) {
    const page = usePage();
    const flash = (page.props as any).flash || {};

    const [activeTab, setActiveTab] = useState<'overview' | 'blacklist' | 'appeals'>('overview');
    const [showPasscodeModal, setShowPasscodeModal] = useState<boolean>(false);
    const [showAddBlacklistModal, setShowAddBlacklistModal] = useState<boolean>(false);
    const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
    const [blacklistReason, setBlacklistReason] = useState<string>('');

    const handleResolveAppeal = (appeal: SupportAppealItem) => {
        const responseNote = prompt(`Resolution response note for ${appeal.user?.name || 'Customer'}:`, 'Appeal approved by Chief Auditor. User restriction lifted.');
        if (responseNote !== null) {
            router.post(route('admin.appeals.resolve', appeal.id), {
                admin_response: responseNote,
            });
        }
    };

    // Passcode change form
    const {
        data: passcodeData,
        setData: setPasscodeData,
        patch: patchPasscode,
        processing: passcodeProcessing,
        errors: passcodeErrors,
        reset: resetPasscode,
    } = useForm({
        current_passcode: '',
        new_passcode: '',
    });

    const handlePasscodeSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        patchPasscode(route('admin.passcode.update'), {
            onSuccess: () => {
                setShowPasscodeModal(false);
                resetPasscode();
            },
        });
    };

    const handleAddBlacklist = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedCustomerId) return;

        router.post(
            route('admin.blacklist.toggle', selectedCustomerId),
            {
                is_blacklisted: true,
                reason: blacklistReason || 'Flagged for fraudulent payment attempts or tampered receipts.',
            },
            {
                onSuccess: () => {
                    setShowAddBlacklistModal(false);
                    setSelectedCustomerId('');
                    setBlacklistReason('');
                },
            }
        );
    };

    const handleRemoveBlacklist = (user: BlacklistedUser | { id: number; name: string }) => {
        if (confirm(`Remove ${user.name} from the fraud blacklist?`)) {
            router.post(route('admin.blacklist.toggle', user.id), {
                is_blacklisted: false,
            });
        }
    };

    const formatMmk = (amount: number | string | null | undefined) => {
        if (amount === null || amount === undefined) return '0.00';
        const num = typeof amount === 'number' ? amount : parseFloat(amount);
        return isNaN(num) ? '0.00' : num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    // Calculate maximum volume for bar chart normalization
    const maxVolume = Math.max(
        ...Object.values(channelStats).map((c) => c.volume),
        1
    );

    // Donut percentages
    const totalDonut = Math.max(donutStats.total, 1);
    const exactPct = Math.round((donutStats.exact / totalDonut) * 100);
    const feePct = Math.round((donutStats.fee_adjusted / totalDonut) * 100);
    const fuzzyPct = Math.round((donutStats.fuzzy / totalDonut) * 100);
    const fraudPct = Math.round((donutStats.fraud / totalDonut) * 100);

    return (
        <AuthenticatedLayout
            header={
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                        <h2 className="text-xl font-bold leading-tight text-white flex items-center gap-2">
                            <span className="text-purple-400">🛡️</span> Chief Auditor Governance Suite
                        </h2>
                        <p className="text-xs text-slate-400 mt-1">
                            Enterprise financial governance, multi-channel fraud defense, and executive analytics
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        <Link
                            href={route('admin.audit-report')}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-500/40 bg-indigo-500/10 px-3.5 py-2 text-xs font-semibold text-indigo-300 hover:bg-indigo-500/20 transition shadow-sm"
                        >
                            <span>📄</span> Official PDF Audit Report
                        </Link>

                        <button
                            type="button"
                            onClick={() => setShowPasscodeModal(true)}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-purple-500/40 bg-purple-500/10 px-3.5 py-2 text-xs font-semibold text-purple-300 hover:bg-purple-500/20 transition shadow-sm"
                        >
                            <span>🔑</span> Update Security Passcode
                        </button>
                    </div>
                </div>
            }
        >
            <Head title="Auditor Governance & Executive Analytics" />

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

                {/* Financial Health KPIs */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Total Processed Volume */}
                    <div className="rounded-2xl border border-slate-800 bg-slate-850/60 p-5 backdrop-blur shadow-sm relative overflow-hidden">
                        <div className="text-xs font-medium text-slate-400 uppercase tracking-wider">Total Processed Volume</div>
                        <div className="text-2xl font-black text-indigo-400 mt-2 font-mono">
                            {kpis.formatted_processed_volume} <span className="text-xs text-slate-400 font-normal">MMK</span>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-2">Cumulative bank ledger credits</div>
                    </div>

                    {/* Auto-Reconciliation Success Rate */}
                    <div className="rounded-2xl border border-slate-800 bg-slate-850/60 p-5 backdrop-blur shadow-sm relative overflow-hidden">
                        <div className="text-xs font-medium text-slate-400 uppercase tracking-wider">Reconciliation Success Rate</div>
                        <div className="text-2xl font-black text-emerald-400 mt-2">
                            {kpis.auto_recon_success_rate}%
                        </div>
                        <div className="w-full bg-slate-800 rounded-full h-1.5 mt-3">
                            <div
                                className="bg-gradient-to-r from-emerald-500 to-teal-400 h-1.5 rounded-full"
                                style={{ width: `${Math.min(100, kpis.auto_recon_success_rate)}%` }}
                            ></div>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-2">Automated 3-way match efficiency</div>
                    </div>

                    {/* Total Fraud Prevented */}
                    <div className="rounded-2xl border border-red-900/30 bg-red-950/20 p-5 backdrop-blur shadow-sm relative overflow-hidden">
                        <div className="text-xs font-medium text-red-400 uppercase tracking-wider">Total Fraud Prevented</div>
                        <div className="text-2xl font-black text-red-400 mt-2 font-mono">
                            {kpis.formatted_fraud_prevented} <span className="text-xs text-slate-400 font-normal">MMK</span>
                        </div>
                        <div className="text-[11px] text-red-300/70 mt-2">Intercepted forged slip inflation</div>
                    </div>

                    {/* Unresolved Suspense Accounts */}
                    <div className="rounded-2xl border border-orange-900/30 bg-orange-950/20 p-5 backdrop-blur shadow-sm relative overflow-hidden">
                        <div className="text-xs font-medium text-orange-400 uppercase tracking-wider">Unresolved Suspense</div>
                        <div className="text-2xl font-black text-orange-400 mt-2 font-mono">
                            {kpis.unresolved_suspense_count} <span className="text-xs text-slate-400 font-normal">Deposits</span>
                        </div>
                        <div className="text-[11px] text-orange-300/70 mt-2">
                            {kpis.formatted_suspense_volume} MMK unclaimed
                        </div>
                    </div>
                </div>

                {/* Visual Analytics Grid: Donut + Bar Chart */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Donut Chart: Reconciliation Breakdown */}
                    <div className="rounded-2xl border border-slate-800 bg-slate-850/60 p-6 backdrop-blur shadow-xl space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                            <div>
                                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                                    <span>🍩</span> Reconciliation Status Breakdown
                                </h3>
                                <p className="text-xs text-slate-400">Proportional classification across all audited transactions</p>
                            </div>
                            <span className="text-xs font-mono text-slate-400">
                                {donutStats.total} Total Matches
                            </span>
                        </div>

                        <div className="flex flex-col sm:flex-row items-center justify-around gap-6 pt-2">
                            {/* SVG Donut */}
                            <div className="relative flex items-center justify-center">
                                <svg className="h-44 w-44 transform -rotate-90" viewBox="0 0 100 100">
                                    {/* Background Circle */}
                                    <circle
                                        cx="50"
                                        cy="50"
                                        r="38"
                                        fill="transparent"
                                        stroke="#1e293b"
                                        strokeWidth="14"
                                    />
                                    {/* Exact (Emerald) */}
                                    <circle
                                        cx="50"
                                        cy="50"
                                        r="38"
                                        fill="transparent"
                                        stroke="#10b981"
                                        strokeWidth="14"
                                        strokeDasharray={`${(exactPct * 238.76) / 100} 238.76`}
                                        strokeDashoffset="0"
                                    />
                                    {/* Fee-Adjusted (Indigo) */}
                                    <circle
                                        cx="50"
                                        cy="50"
                                        r="38"
                                        fill="transparent"
                                        stroke="#6366f1"
                                        strokeWidth="14"
                                        strokeDasharray={`${(feePct * 238.76) / 100} 238.76`}
                                        strokeDashoffset={`-${(exactPct * 238.76) / 100}`}
                                    />
                                    {/* Fuzzy (Sky) */}
                                    <circle
                                        cx="50"
                                        cy="50"
                                        r="38"
                                        fill="transparent"
                                        stroke="#0ea5e9"
                                        strokeWidth="14"
                                        strokeDasharray={`${(fuzzyPct * 238.76) / 100} 238.76`}
                                        strokeDashoffset={`-${((exactPct + feePct) * 238.76) / 100}`}
                                    />
                                    {/* Fraud (Red) */}
                                    <circle
                                        cx="50"
                                        cy="50"
                                        r="38"
                                        fill="transparent"
                                        stroke="#ef4444"
                                        strokeWidth="14"
                                        strokeDasharray={`${(fraudPct * 238.76) / 100} 238.76`}
                                        strokeDashoffset={`-${((exactPct + feePct + fuzzyPct) * 238.76) / 100}`}
                                    />
                                </svg>

                                <div className="absolute text-center">
                                    <div className="text-xl font-black text-white">{exactPct + feePct}%</div>
                                    <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Settled</div>
                                </div>
                            </div>

                            {/* Legend */}
                            <div className="space-y-2.5 text-xs w-full sm:w-auto">
                                <div className="flex items-center justify-between gap-4">
                                    <span className="flex items-center gap-2">
                                        <span className="h-3 w-3 rounded-md bg-emerald-500"></span>
                                        <span className="text-slate-300">Exact Matches</span>
                                    </span>
                                    <span className="font-mono font-bold text-white">{donutStats.exact} ({exactPct}%)</span>
                                </div>
                                <div className="flex items-center justify-between gap-4">
                                    <span className="flex items-center gap-2">
                                        <span className="h-3 w-3 rounded-md bg-indigo-500"></span>
                                        <span className="text-slate-300">Fee-Adjusted</span>
                                    </span>
                                    <span className="font-mono font-bold text-white">{donutStats.fee_adjusted} ({feePct}%)</span>
                                </div>
                                <div className="flex items-center justify-between gap-4">
                                    <span className="flex items-center gap-2">
                                        <span className="h-3 w-3 rounded-md bg-sky-500"></span>
                                        <span className="text-slate-300">Fuzzy Reviews</span>
                                    </span>
                                    <span className="font-mono font-bold text-white">{donutStats.fuzzy} ({fuzzyPct}%)</span>
                                </div>
                                <div className="flex items-center justify-between gap-4">
                                    <span className="flex items-center gap-2">
                                        <span className="h-3 w-3 rounded-md bg-red-500"></span>
                                        <span className="text-slate-300">Fraud Flagged</span>
                                    </span>
                                    <span className="font-mono font-bold text-red-400">{donutStats.fraud} ({fraudPct}%)</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Bar Chart: Channel Performance */}
                    <div className="rounded-2xl border border-slate-800 bg-slate-850/60 p-6 backdrop-blur shadow-xl space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                            <div>
                                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                                    <span>📊</span> Channel Settlement Distribution
                                </h3>
                                <p className="text-xs text-slate-400">Total volume and transactions across Myanmar providers</p>
                            </div>
                            <span className="text-xs text-slate-500">Normalized MMK</span>
                        </div>

                        <div className="space-y-4 pt-1">
                            {Object.entries(channelStats).map(([key, item]) => {
                                const pct = Math.round((item.volume / maxVolume) * 100);
                                const channelColors: Record<string, { bar: string; text: string; bg: string }> = {
                                    kbzpay: { bar: 'bg-blue-500', text: 'text-blue-400', bg: 'bg-blue-950/40' },
                                    wavepay: { bar: 'bg-amber-500', text: 'text-amber-400', bg: 'bg-amber-950/40' },
                                    cbpay: { bar: 'bg-rose-500', text: 'text-rose-400', bg: 'bg-rose-950/40' },
                                    ayapay: { bar: 'bg-red-500', text: 'text-red-400', bg: 'bg-red-950/40' },
                                };
                                const colors = channelColors[key] || { bar: 'bg-slate-500', text: 'text-slate-400', bg: 'bg-slate-900' };

                                return (
                                    <div key={key} className="space-y-1">
                                        <div className="flex items-center justify-between text-xs">
                                            <span className={`font-bold font-mono uppercase ${colors.text}`}>
                                                {key}
                                            </span>
                                            <span className="text-slate-300 font-mono">
                                                {item.formatted_volume} MMK{' '}
                                                <span className="text-slate-500 text-[11px]">({item.tx_count} txns)</span>
                                            </span>
                                        </div>
                                        <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden p-0.5">
                                            <div
                                                className={`${colors.bar} h-2 rounded-full transition-all duration-500`}
                                                style={{ width: `${Math.max(5, pct)}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Sub-Navigation Tabs */}
                <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
                    <button
                        type="button"
                        onClick={() => setActiveTab('overview')}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                            activeTab === 'overview'
                                ? 'bg-purple-600 text-white shadow'
                                : 'text-slate-400 hover:text-white'
                        }`}
                    >
                        Recent Fraud Interceptions ({recentFraudMatches.length})
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab('blacklist')}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                            activeTab === 'blacklist'
                                ? 'bg-purple-600 text-white shadow'
                                : 'text-slate-400 hover:text-white'
                        }`}
                    >
                        Fraud Blacklist Registry ({blacklistedUsers.length})
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab('appeals')}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                            activeTab === 'appeals'
                                ? 'bg-purple-600 text-white shadow'
                                : 'text-slate-400 hover:text-white'
                        }`}
                    >
                        <span>⚖️</span>
                        Compliance Appeals
                        {appeals.filter((a) => a.status === 'pending').length > 0 && (
                            <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-amber-500 text-black font-extrabold">
                                {appeals.filter((a) => a.status === 'pending').length}
                            </span>
                        )}
                    </button>
                </div>

                {/* Tab 1: Recent Fraud Interceptions */}
                {activeTab === 'overview' && (
                    <div className="rounded-2xl border border-slate-800 bg-slate-850/60 p-6 backdrop-blur shadow-xl space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                            <div>
                                <h3 className="text-base font-bold text-white flex items-center gap-2">
                                    <span className="text-red-400">🚨</span> High-Risk Fraud & Discrepancy Detections
                                </h3>
                                <p className="text-xs text-slate-400">
                                    Intercepted payment slips exhibiting amount inflation, EXIF tampering, or duplicate transaction IDs
                                </p>
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs">
                                <thead className="bg-slate-900/80 text-slate-400 border-b border-slate-800 uppercase tracking-wider font-semibold">
                                    <tr>
                                        <th className="px-4 py-3">Fraud Type</th>
                                        <th className="px-4 py-3">Payer / Customer</th>
                                        <th className="px-4 py-3">Slip Claimed MMK</th>
                                        <th className="px-4 py-3">Actual Bank Gross</th>
                                        <th className="px-4 py-3 text-right">Variance Prevented</th>
                                        <th className="px-4 py-3">Audit Notes</th>
                                        <th className="px-4 py-3 text-right">Governance Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800">
                                    {recentFraudMatches.length === 0 ? (
                                        <tr>
                                            <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                                                No fraudulent records detected. All receipts clean.
                                            </td>
                                        </tr>
                                    ) : (
                                        recentFraudMatches.map((m) => (
                                            <tr key={m.id} className="hover:bg-slate-800/40 transition">
                                                <td className="px-4 py-3">
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-950 text-red-300 border border-red-800">
                                                        {m.match_type}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="font-bold text-white">{m.invoice?.customer_name || 'N/A'}</div>
                                                    <div className="text-[11px] text-slate-400 font-mono">{m.invoice?.customer_phone || 'N/A'}</div>
                                                </td>
                                                <td className="px-4 py-3 font-mono font-bold text-slate-200">
                                                    {formatMmk(m.slip_amount)} MMK
                                                </td>
                                                <td className="px-4 py-3 font-mono text-emerald-400">
                                                    {formatMmk(m.bank_amount)} MMK
                                                </td>
                                                <td className="px-4 py-3 text-right font-mono font-black text-red-400">
                                                    +{formatMmk(m.variance_amount)} MMK
                                                </td>
                                                <td className="px-4 py-3 text-slate-300 max-w-xs truncate" title={m.notes || ''}>
                                                    {m.notes || '—'}
                                                </td>
                                                <td className="px-4 py-3 text-right whitespace-nowrap">
                                                    {m.invoice?.customer && !m.invoice.customer.is_blacklisted && (
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setSelectedCustomerId(String(m.invoice?.customer?.id));
                                                                setBlacklistReason(`Repeated fraud flag on Match #${m.id}: ${m.notes}`);
                                                                setShowAddBlacklistModal(true);
                                                            }}
                                                            className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-red-950/80 text-red-300 border border-red-800 hover:bg-red-900/60 transition"
                                                        >
                                                            Add to Blacklist
                                                        </button>
                                                    )}
                                                    {m.invoice?.customer && m.invoice.customer.is_blacklisted && (
                                                        <span className="text-[11px] text-red-400 font-semibold">
                                                            Already Blacklisted
                                                        </span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Tab 2: Blacklist Registry */}
                {activeTab === 'blacklist' && (
                    <div className="rounded-2xl border border-slate-800 bg-slate-850/60 p-6 backdrop-blur shadow-xl space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                            <div>
                                <h3 className="text-base font-bold text-white flex items-center gap-2">
                                    <span className="text-purple-400">⛔</span> Customer Fraud Blacklist Registry
                                </h3>
                                <p className="text-xs text-slate-400">
                                    Blacklisted customers are blocked by system middleware from uploading payment slips
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={() => setShowAddBlacklistModal(true)}
                                className="inline-flex items-center gap-1.5 rounded-xl bg-red-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-red-700 transition shadow-lg shadow-red-600/20"
                            >
                                <span>+</span> Blacklist Customer
                            </button>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs">
                                <thead className="bg-slate-900/80 text-slate-400 border-b border-slate-800 uppercase tracking-wider font-semibold">
                                    <tr>
                                        <th className="px-4 py-3">Customer Name</th>
                                        <th className="px-4 py-3">Contact</th>
                                        <th className="px-4 py-3">Blacklist Reason</th>
                                        <th className="px-4 py-3">Date Added</th>
                                        <th className="px-4 py-3 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800">
                                    {blacklistedUsers.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                                                No users are currently on the fraud blacklist.
                                            </td>
                                        </tr>
                                    ) : (
                                        blacklistedUsers.map((u) => (
                                            <tr key={u.id} className="hover:bg-slate-800/40 transition">
                                                <td className="px-4 py-3">
                                                    <div className="font-bold text-white flex items-center gap-1.5">
                                                        <span>{u.name}</span>
                                                        <span className="px-1.5 py-0.5 rounded text-[10px] bg-red-950 text-red-400 border border-red-800 font-bold">
                                                            BLOCKED
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-slate-400">
                                                    <div>{u.email}</div>
                                                    <div className="font-mono text-[11px]">{u.phone || 'N/A'}</div>
                                                </td>
                                                <td className="px-4 py-3 text-red-300 font-medium max-w-sm">
                                                    {u.blacklist_reason || 'Administrative restriction'}
                                                </td>
                                                <td className="px-4 py-3 text-slate-400">
                                                    {new Date(u.updated_at).toLocaleDateString()}
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRemoveBlacklist(u)}
                                                        className="inline-flex items-center px-3 py-1 rounded-lg text-xs font-semibold bg-slate-800 text-slate-200 border border-slate-700 hover:bg-slate-700 hover:text-white transition"
                                                    >
                                                        Clear & Unblock
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Tab 3: Compliance & Support Appeals */}
                {activeTab === 'appeals' && (
                    <div className="rounded-2xl border border-slate-800 bg-slate-850/60 p-6 backdrop-blur shadow-xl space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                            <div>
                                <h3 className="text-base font-bold text-white flex items-center gap-2">
                                    <span className="text-amber-400">⚖️</span> Customer Compliance Appeals & Dispute Queue
                                </h3>
                                <p className="text-xs text-slate-400">
                                    Review and resolve account restriction appeals submitted by suspended customers
                                </p>
                            </div>
                            <div className="text-xs font-mono text-slate-400">
                                Total Appeals: <span className="font-bold text-white">{appeals.length}</span>
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs">
                                <thead className="bg-slate-900/80 text-slate-400 border-b border-slate-800 uppercase tracking-wider font-semibold">
                                    <tr>
                                        <th className="px-4 py-3">Customer / Contact</th>
                                        <th className="px-4 py-3">Subject & Appeal Message</th>
                                        <th className="px-4 py-3">Date Submitted</th>
                                        <th className="px-4 py-3">Status</th>
                                        <th className="px-4 py-3 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800">
                                    {appeals.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                                                No customer compliance appeals submitted.
                                            </td>
                                        </tr>
                                    ) : (
                                        appeals.map((appeal) => (
                                            <tr key={appeal.id} className="hover:bg-slate-800/40 transition">
                                                <td className="px-4 py-3 align-top">
                                                    <div className="font-bold text-white">
                                                        {appeal.user?.name || `Customer #${appeal.user_id}`}
                                                    </div>
                                                    <div className="text-slate-400 text-[11px]">{appeal.user?.email || 'N/A'}</div>
                                                    <div className="font-mono text-slate-500 text-[11px]">{appeal.user?.phone || ''}</div>
                                                </td>
                                                <td className="px-4 py-3 align-top max-w-md">
                                                    <div className="font-semibold text-slate-200">{appeal.subject}</div>
                                                    <div className="mt-1 text-slate-300 text-[11px] whitespace-pre-wrap rounded-lg bg-slate-900/60 p-2.5 border border-slate-800">
                                                        {appeal.message}
                                                    </div>
                                                    {appeal.admin_response && (
                                                        <div className="mt-2 text-emerald-400 text-[11px] bg-emerald-950/40 p-2 rounded border border-emerald-900/50">
                                                            <span className="font-bold">Resolution Note:</span> {appeal.admin_response}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 align-top text-slate-400 font-mono text-[11px]">
                                                    {new Date(appeal.created_at).toLocaleString()}
                                                </td>
                                                <td className="px-4 py-3 align-top">
                                                    {appeal.status === 'pending' ? (
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-950 text-amber-400 border border-amber-800">
                                                            ⏳ PENDING REVIEW
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-800">
                                                            ✓ RESOLVED
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 align-top text-right">
                                                    {appeal.status === 'pending' ? (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleResolveAppeal(appeal)}
                                                            className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-500 transition shadow-sm"
                                                        >
                                                            Resolve & Lift Ban
                                                        </button>
                                                    ) : (
                                                        <span className="text-[11px] text-slate-500 font-medium">Completed</span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>

            {/* Passcode Update Modal */}
            {showPasscodeModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                    <form
                        onSubmit={handlePasscodeSubmit}
                        className="w-full max-w-md rounded-2xl border border-purple-800/60 bg-slate-900 p-6 shadow-2xl space-y-4"
                    >
                        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                            <h4 className="text-sm font-bold text-purple-300 flex items-center gap-1.5">
                                <span>🔑</span> Update Chief Auditor Passcode
                            </h4>
                            <button
                                type="button"
                                onClick={() => setShowPasscodeModal(false)}
                                className="text-slate-400 hover:text-white"
                            >
                                ✕
                            </button>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-300 mb-1">
                                Current Passcode
                            </label>
                            <input
                                type="password"
                                required
                                value={passcodeData.current_passcode}
                                onChange={(e) => setPasscodeData('current_passcode', e.target.value)}
                                className="w-full rounded-xl border border-slate-700 bg-slate-950 p-2.5 text-xs text-white focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                            />
                            {passcodeErrors.current_passcode && (
                                <p className="text-xs text-red-400 mt-1">{passcodeErrors.current_passcode}</p>
                            )}
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-300 mb-1">
                                New Passcode (Min: 6 characters)
                            </label>
                            <input
                                type="password"
                                required
                                value={passcodeData.new_passcode}
                                onChange={(e) => setPasscodeData('new_passcode', e.target.value)}
                                className="w-full rounded-xl border border-slate-700 bg-slate-950 p-2.5 text-xs text-white focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                            />
                            {passcodeErrors.new_passcode && (
                                <p className="text-xs text-red-400 mt-1">{passcodeErrors.new_passcode}</p>
                            )}
                        </div>

                        <div className="flex justify-end gap-2 pt-2">
                            <button
                                type="button"
                                onClick={() => setShowPasscodeModal(false)}
                                className="rounded-xl border border-slate-700 px-3 py-1.5 text-xs text-slate-400 hover:bg-slate-800"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={passcodeProcessing}
                                className="rounded-xl bg-purple-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-purple-700 transition"
                            >
                                {passcodeProcessing ? 'Saving...' : 'Update Passcode'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Add to Blacklist Modal */}
            {showAddBlacklistModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4">
                    <form
                        onSubmit={handleAddBlacklist}
                        className="w-full max-w-md rounded-2xl border border-red-800/60 bg-slate-900 p-6 shadow-2xl space-y-4"
                    >
                        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                            <h4 className="text-sm font-bold text-red-400 flex items-center gap-1.5">
                                <span>⛔</span> Add Customer to Fraud Blacklist
                            </h4>
                            <button
                                type="button"
                                onClick={() => setShowAddBlacklistModal(false)}
                                className="text-slate-400 hover:text-white"
                            >
                                ✕
                            </button>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-300 mb-1">
                                Select Customer
                            </label>
                            <select
                                required
                                value={selectedCustomerId}
                                onChange={(e) => setSelectedCustomerId(e.target.value)}
                                className="w-full rounded-xl border border-slate-700 bg-slate-950 p-2.5 text-xs text-white focus:border-red-500 focus:ring-1 focus:ring-red-500"
                            >
                                <option value="">-- Select Customer Account --</option>
                                {customers.map((c) => (
                                    <option key={c.id} value={c.id} disabled={c.is_blacklisted}>
                                        {c.name} ({c.email}) {c.is_blacklisted ? '[Already Blacklisted]' : ''}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-300 mb-1">
                                Blacklist Audit Reason
                            </label>
                            <textarea
                                rows={3}
                                required
                                placeholder="e.g. Uploaded Photoshopped payment receipts or duplicate transaction IDs."
                                value={blacklistReason}
                                onChange={(e) => setBlacklistReason(e.target.value)}
                                className="w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-xs text-slate-200 placeholder-slate-500 focus:border-red-500 focus:ring-1 focus:ring-red-500"
                            />
                        </div>

                        <div className="flex justify-end gap-2 pt-2">
                            <button
                                type="button"
                                onClick={() => setShowAddBlacklistModal(false)}
                                className="rounded-xl border border-slate-700 px-3 py-1.5 text-xs text-slate-400 hover:bg-slate-800"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={!selectedCustomerId || !blacklistReason.trim()}
                                className="rounded-xl bg-red-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-red-700 transition disabled:opacity-50"
                            >
                                Confirm Blacklist
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </AuthenticatedLayout>
    );
}
