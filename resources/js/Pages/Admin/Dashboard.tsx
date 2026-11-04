import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, useForm, usePage } from '@inertiajs/react';
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

interface Props {
    kpis: KPIs;
    donutStats: DonutStats;
    channelStats: Record<string, ChannelItem>;
}

export default function Dashboard({
    kpis,
    donutStats,
    channelStats,
}: Props) {
    const page = usePage();
    const flash = (page.props as any).flash || {};

    const [showPasscodeModal, setShowPasscodeModal] = useState<boolean>(false);
    const [hoveredChannel, setHoveredChannel] = useState<string | null>(null);

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

    const channelMeta: Record<string, { label: string; barBg: string; textColor: string; badge: string }> = {
        kbzpay: { label: 'KBZPay', barBg: 'bg-gradient-to-t from-blue-700 to-blue-500', textColor: 'text-blue-600 dark:text-blue-400', badge: 'bg-blue-50 dark:bg-blue-950/60 border-blue-200 dark:border-blue-800' },
        wavepay: { label: 'WavePay', barBg: 'bg-gradient-to-t from-amber-600 to-yellow-400', textColor: 'text-amber-600 dark:text-amber-400', badge: 'bg-amber-50 dark:bg-amber-950/60 border-amber-200 dark:border-amber-800' },
        cbpay: { label: 'CB Pay', barBg: 'bg-gradient-to-t from-red-700 to-red-500', textColor: 'text-red-600 dark:text-red-400', badge: 'bg-red-50 dark:bg-red-950/60 border-red-200 dark:border-red-800' },
        ayapay: { label: 'AYA Pay', barBg: 'bg-gradient-to-t from-purple-700 to-purple-500', textColor: 'text-purple-600 dark:text-purple-400', badge: 'bg-purple-50 dark:bg-purple-950/60 border-purple-200 dark:border-purple-800' },
    };

    return (
        <AuthenticatedLayout>
            <Head title="Auditor Governance & Executive Analytics - ReconGuard" />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-7">
                {/* Title & Governance Action Bar */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                        <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                            <span>🛡️</span> Chief Auditor Governance Suite
                        </h2>
                        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                            Enterprise financial governance, multi-channel settlement efficiency, and executive analytics
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5">
                        <Link
                            href={route('admin.blacklist.index')}
                            className="inline-flex items-center gap-1.5 rounded-2xl border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/40 px-4 py-2 text-xs font-bold text-rose-600 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/40 transition shadow-sm"
                        >
                            <span>🚨</span> Fraud Blacklist Center
                        </Link>

                        <Link
                            href={route('admin.audit-report')}
                            className="inline-flex items-center gap-1.5 rounded-2xl border border-indigo-200 dark:border-indigo-800/60 bg-indigo-50 dark:bg-indigo-950/40 px-4 py-2 text-xs font-bold text-[#705CF6] dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition shadow-sm"
                        >
                            <span>📄</span> Official PDF Audit Report
                        </Link>

                        <button
                            type="button"
                            onClick={() => setShowPasscodeModal(true)}
                            className="inline-flex items-center gap-1.5 rounded-2xl border border-[#705CF6]/30 bg-[#705CF6]/10 px-4 py-2 text-xs font-bold text-[#705CF6] dark:text-purple-300 hover:bg-[#705CF6]/20 transition shadow-sm"
                        >
                            <span>🔑</span> Update Passcode
                        </button>
                    </div>
                </div>

                {/* Financial Health KPIs (FinSet Style) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                    {/* Total Processed Volume */}
                    <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#161B26] p-6 shadow-sm hover:shadow-md transition-all">
                        <div className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                            Total Processed Volume
                        </div>
                        <div className="text-2xl font-black text-[#705CF6] dark:text-[#8C7CFF] mt-3 font-mono tracking-tight">
                            {kpis.formatted_processed_volume} <span className="text-xs text-slate-500 font-normal">MMK</span>
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 font-medium">
                            Cumulative bank ledger credits
                        </div>
                    </div>

                    {/* Auto-Reconciliation Success Rate */}
                    <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#161B26] p-6 shadow-sm hover:shadow-md transition-all">
                        <div className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                            Reconciliation Success Rate
                        </div>
                        <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-3 tracking-tight">
                            {kpis.auto_recon_success_rate}%
                        </div>
                        <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 mt-3 overflow-hidden">
                            <div
                                className="bg-emerald-500 h-2 rounded-full transition-all duration-500"
                                style={{ width: `${Math.min(100, kpis.auto_recon_success_rate)}%` }}
                            ></div>
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 font-medium">
                            Automated 3-way match efficiency
                        </div>
                    </div>

                    {/* Total Fraud Prevented */}
                    <div className="rounded-2xl border border-rose-200/80 dark:border-rose-900/40 bg-white dark:bg-[#161B26] p-6 shadow-sm hover:shadow-md transition-all">
                        <div className="text-xs font-bold text-rose-500 dark:text-rose-400 uppercase tracking-wider">
                            Total Fraud Prevented
                        </div>
                        <div className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-3 font-mono tracking-tight">
                            {kpis.formatted_fraud_prevented} <span className="text-xs text-rose-400/80 font-normal">MMK</span>
                        </div>
                        <div className="text-[11px] text-rose-600/80 dark:text-rose-300/70 mt-2 font-medium">
                            Intercepted forged slip inflation
                        </div>
                    </div>

                    {/* Unresolved Suspense Accounts */}
                    <div className="rounded-2xl border border-amber-200/80 dark:border-amber-900/40 bg-white dark:bg-[#161B26] p-6 shadow-sm hover:shadow-md transition-all">
                        <div className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                            Unresolved Suspense
                        </div>
                        <div className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-3 font-mono tracking-tight">
                            {kpis.unresolved_suspense_count} <span className="text-xs text-amber-500 font-normal">Deposits</span>
                        </div>
                        <div className="text-[11px] text-amber-600/80 dark:text-amber-300/70 mt-2 font-medium">
                            {kpis.formatted_suspense_volume} MMK unclaimed
                        </div>
                    </div>
                </div>

                {/* Visual Analytics Grid: Donut + Vertical Bar Chart */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Donut Chart: Reconciliation Breakdown */}
                    <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#161B26] p-6 shadow-sm space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-3">
                            <div>
                                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                    <span>🍩</span> Reconciliation Status Breakdown
                                </h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400">Proportional classification across all audited transactions</p>
                            </div>
                            <span className="text-xs font-mono font-bold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-[#1E2536] px-2.5 py-1 rounded-xl">
                                {donutStats.total} Matches
                            </span>
                        </div>

                        <div className="flex flex-col sm:flex-row items-center justify-around gap-6 pt-2">
                            {/* SVG Donut */}
                            <div className="relative flex items-center justify-center">
                                <svg className="h-44 w-44 transform -rotate-90" viewBox="0 0 100 100">
                                    <circle
                                        cx="50"
                                        cy="50"
                                        r="38"
                                        fill="transparent"
                                        className="stroke-slate-100 dark:stroke-slate-800"
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
                                    {/* Fee-Adjusted (FinSet Purple) */}
                                    <circle
                                        cx="50"
                                        cy="50"
                                        r="38"
                                        fill="transparent"
                                        stroke="#705CF6"
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
                                    <div className="text-xl font-black text-slate-900 dark:text-white">{exactPct + feePct}%</div>
                                    <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Settled</div>
                                </div>
                            </div>

                            {/* Legend */}
                            <div className="space-y-2.5 text-xs w-full sm:w-auto">
                                <div className="flex items-center justify-between gap-4">
                                    <span className="flex items-center gap-2">
                                        <span className="h-3 w-3 rounded-md bg-emerald-500"></span>
                                        <span className="text-slate-600 dark:text-slate-300 font-medium">Exact Matches</span>
                                    </span>
                                    <span className="font-mono font-bold text-slate-900 dark:text-white">{donutStats.exact} ({exactPct}%)</span>
                                </div>
                                <div className="flex items-center justify-between gap-4">
                                    <span className="flex items-center gap-2">
                                        <span className="h-3 w-3 rounded-md bg-[#705CF6]"></span>
                                        <span className="text-slate-600 dark:text-slate-300 font-medium">Fee-Adjusted</span>
                                    </span>
                                    <span className="font-mono font-bold text-slate-900 dark:text-white">{donutStats.fee_adjusted} ({feePct}%)</span>
                                </div>
                                <div className="flex items-center justify-between gap-4">
                                    <span className="flex items-center gap-2">
                                        <span className="h-3 w-3 rounded-md bg-sky-500"></span>
                                        <span className="text-slate-600 dark:text-slate-300 font-medium">Fuzzy Reviews</span>
                                    </span>
                                    <span className="font-mono font-bold text-slate-900 dark:text-white">{donutStats.fuzzy} ({fuzzyPct}%)</span>
                                </div>
                                <div className="flex items-center justify-between gap-4">
                                    <span className="flex items-center gap-2">
                                        <span className="h-3 w-3 rounded-md bg-rose-500"></span>
                                        <span className="text-slate-600 dark:text-slate-300 font-medium">Fraud Flagged</span>
                                    </span>
                                    <span className="font-mono font-bold text-rose-600 dark:text-rose-400">{donutStats.fraud} ({fraudPct}%)</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Vertical Bar Chart: Channel Settlement Distribution */}
                    <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#161B26] p-6 shadow-sm space-y-4 flex flex-col justify-between">
                        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-3">
                            <div>
                                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                    <span>📊</span> Channel Settlement Distribution
                                </h3>
                                <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                                    Total MMK settlement volume and transaction breakdown collected across Myanmar's 4 major banking channels.
                                </p>
                            </div>
                            <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">Normalized MMK</span>
                        </div>

                        {/* Responsive Vertical Bar Chart Canvas */}
                        <div className="relative pt-6 pb-2">
                            {/* Gridlines */}
                            <div className="absolute inset-x-0 top-6 bottom-16 flex flex-col justify-between pointer-events-none opacity-40">
                                <div className="border-b border-dashed border-slate-200 dark:border-slate-800 w-full"></div>
                                <div className="border-b border-dashed border-slate-200 dark:border-slate-800 w-full"></div>
                                <div className="border-b border-dashed border-slate-200 dark:border-slate-800 w-full"></div>
                            </div>

                            {/* Bars Grid */}
                            <div className="grid grid-cols-4 gap-3 sm:gap-6 h-56 items-end relative z-10 px-2">
                                {Object.entries(channelStats).map(([key, item]) => {
                                    const pct = Math.round((item.volume / maxVolume) * 100);
                                    const meta = channelMeta[key] || {
                                        label: key.toUpperCase(),
                                        barBg: 'bg-gradient-to-t from-slate-600 to-slate-400',
                                        textColor: 'text-slate-600',
                                        badge: 'bg-slate-100',
                                    };
                                    const isHovered = hoveredChannel === key;

                                    return (
                                        <div
                                            key={key}
                                            className="flex flex-col items-center h-full justify-end group cursor-pointer"
                                            onMouseEnter={() => setHoveredChannel(key)}
                                            onMouseLeave={() => setHoveredChannel(null)}
                                        >
                                            {/* Top Value Label / Tooltip */}
                                            <div className="mb-2 text-center transition-all duration-200">
                                                <span className="text-[10px] sm:text-[11px] font-mono font-bold text-slate-700 dark:text-slate-300 block truncate max-w-[85px]">
                                                    {item.volume >= 1000000
                                                        ? (item.volume / 1000000).toFixed(1) + 'M'
                                                        : item.volume >= 1000
                                                        ? (item.volume / 1000).toFixed(0) + 'k'
                                                        : item.volume}
                                                </span>
                                            </div>

                                            {/* The Vertical Bar */}
                                            <div className="w-full max-w-[48px] bg-slate-100 dark:bg-slate-800/80 rounded-2xl h-36 flex items-end p-1 relative shadow-inner">
                                                <div
                                                    className={`w-full rounded-xl ${meta.barBg} transition-all duration-500 shadow-md group-hover:scale-[1.03] group-hover:brightness-110 relative`}
                                                    style={{ height: `${Math.max(10, pct)}%` }}
                                                >
                                                    {/* Tooltip on Hover */}
                                                    {isHovered && (
                                                        <div className="absolute -top-24 left-1/2 -translate-x-1/2 z-30 whitespace-nowrap rounded-xl bg-slate-900 text-white px-3 py-2 text-[10px] font-semibold shadow-2xl border border-slate-700 pointer-events-none">
                                                            <div className="font-bold text-[#705CF6] text-xs">{meta.label}</div>
                                                            <div className="font-mono">{formatMmk(item.volume)} MMK</div>
                                                            <div className="text-slate-300">{item.tx_count} txns ({item.matched_count} matched)</div>
                                                            <div className="text-[9px] text-slate-400 mt-1 border-t border-slate-800 pt-1 font-sans">
                                                                Total MMK settlement across 4 major channels
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Channel Bottom Label */}
                                            <div className="mt-3 text-center">
                                                <div className={`text-xs font-black ${meta.textColor} tracking-tight`}>
                                                    {meta.label}
                                                </div>
                                                <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                                                    {item.tx_count} txns
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Passcode Update Modal */}
            {showPasscodeModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
                    <form
                        onSubmit={handlePasscodeSubmit}
                        className="w-full max-w-md rounded-3xl border border-slate-200 dark:border-purple-800/60 bg-white dark:bg-[#161B26] p-6 shadow-2xl space-y-4"
                    >
                        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                            <h4 className="text-sm font-bold text-slate-900 dark:text-purple-300 flex items-center gap-1.5">
                                <span>🔑</span> Update Chief Auditor Passcode
                            </h4>
                            <button
                                type="button"
                                onClick={() => setShowPasscodeModal(false)}
                                className="text-slate-400 hover:text-slate-900 dark:hover:text-white"
                            >
                                ✕
                            </button>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                Current Passcode
                            </label>
                            <input
                                type="password"
                                required
                                value={passcodeData.current_passcode}
                                onChange={(e) => setPasscodeData('current_passcode', e.target.value)}
                                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 p-2.5 text-xs text-slate-900 dark:text-white focus:border-[#705CF6] focus:ring-1 focus:ring-[#705CF6]"
                            />
                            {passcodeErrors.current_passcode && (
                                <p className="text-xs text-rose-500 mt-1">{passcodeErrors.current_passcode}</p>
                            )}
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                New Passcode (Min: 6 characters)
                            </label>
                            <input
                                type="password"
                                required
                                value={passcodeData.new_passcode}
                                onChange={(e) => setPasscodeData('new_passcode', e.target.value)}
                                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 p-2.5 text-xs text-slate-900 dark:text-white focus:border-[#705CF6] focus:ring-1 focus:ring-[#705CF6]"
                            />
                            {passcodeErrors.new_passcode && (
                                <p className="text-xs text-rose-500 mt-1">{passcodeErrors.new_passcode}</p>
                            )}
                        </div>

                        <div className="flex justify-end gap-2 pt-2">
                            <button
                                type="button"
                                onClick={() => setShowPasscodeModal(false)}
                                className="rounded-xl border border-slate-200 dark:border-slate-700 px-3.5 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={passcodeProcessing}
                                className="rounded-xl bg-[#705CF6] px-4 py-2 text-xs font-bold text-white hover:bg-[#604ce4] transition shadow-sm"
                            >
                                {passcodeProcessing ? 'Saving...' : 'Update Passcode'}
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </AuthenticatedLayout>
    );
}
