import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router } from '@inertiajs/react';
import React, { useState } from 'react';

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
    blacklistedUsers: BlacklistedUser[];
    recentFraudMatches: FraudMatch[];
    customers: CustomerOption[];
    appeals?: SupportAppealItem[];
}

export default function Blacklist({
    blacklistedUsers,
    recentFraudMatches,
    customers,
    appeals = [],
}: Props) {
    const [activeTab, setActiveTab] = useState<'blacklist' | 'fraud_slips' | 'appeals'>('blacklist');
    const [showAddBlacklistModal, setShowAddBlacklistModal] = useState<boolean>(false);
    const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
    const [blacklistReason, setBlacklistReason] = useState<string>('');

    const handleResolveAppeal = (appeal: SupportAppealItem) => {
        const responseNote = prompt(
            `Resolution response note for ${appeal.user?.name || 'Customer'}:`,
            'Appeal approved by Chief Auditor. User restriction lifted.'
        );
        if (responseNote !== null) {
            router.post(route('admin.appeals.resolve', appeal.id), {
                admin_response: responseNote,
            });
        }
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

    return (
        <AuthenticatedLayout>
            <Head title="Fraud Defense & Blacklist Registry - ReconGuard" />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-7">
                {/* Header & Quick Action */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                        <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                            <span>🚨</span> Fraud Defense & Blacklist Management Center
                        </h2>
                        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                            Enforce account restrictions, review suspicious payment slips, and manage compliance appeals
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={() => setShowAddBlacklistModal(true)}
                            className="inline-flex items-center gap-1.5 rounded-2xl bg-rose-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-rose-700 transition shadow-sm"
                        >
                            <span>+</span> Blacklist Customer
                        </button>
                    </div>
                </div>

                {/* KPI Ribbon */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                    <div className="rounded-2xl border border-rose-200/80 dark:border-rose-900/40 bg-white dark:bg-[#161B26] p-5 shadow-sm">
                        <div className="text-xs font-bold uppercase tracking-wider text-rose-500">
                            Blacklisted Customers
                        </div>
                        <div className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-2 font-mono">
                            {blacklistedUsers.length} <span className="text-xs text-rose-400 font-normal">Accounts</span>
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                            Blocked from uploading slips
                        </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#161B26] p-5 shadow-sm">
                        <div className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                            Intercepted Fraud Slips
                        </div>
                        <div className="text-2xl font-black text-slate-900 dark:text-white mt-2 font-mono">
                            {recentFraudMatches.length} <span className="text-xs text-slate-400 font-normal">Records</span>
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                            Flagged for inflation or tampering
                        </div>
                    </div>

                    <div className="rounded-2xl border border-amber-200/80 dark:border-amber-900/40 bg-white dark:bg-[#161B26] p-5 shadow-sm">
                        <div className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                            Pending Compliance Appeals
                        </div>
                        <div className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-2 font-mono">
                            {appeals.filter((a) => a.status === 'pending').length} <span className="text-xs text-amber-500 font-normal">Active</span>
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                            Awaiting Chief Auditor review
                        </div>
                    </div>
                </div>

                {/* Sub-Navigation Tabs */}
                <div className="flex flex-wrap items-center gap-2 border-b border-slate-200/80 dark:border-slate-800/80 pb-3">
                    <button
                        type="button"
                        onClick={() => setActiveTab('blacklist')}
                        className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all ${
                            activeTab === 'blacklist'
                                ? 'bg-[#705CF6] text-white shadow-sm'
                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/50'
                        }`}
                    >
                        Blacklist Registry ({blacklistedUsers.length})
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab('fraud_slips')}
                        className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all ${
                            activeTab === 'fraud_slips'
                                ? 'bg-[#705CF6] text-white shadow-sm'
                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/50'
                        }`}
                    >
                        Intercepted Fraud Slips ({recentFraudMatches.length})
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab('appeals')}
                        className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                            activeTab === 'appeals'
                                ? 'bg-[#705CF6] text-white shadow-sm'
                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/50'
                        }`}
                    >
                        <span>⚖️</span>
                        Compliance Appeals Queue
                        {appeals.filter((a) => a.status === 'pending').length > 0 && (
                            <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-amber-500 text-black font-extrabold">
                                {appeals.filter((a) => a.status === 'pending').length}
                            </span>
                        )}
                    </button>
                </div>

                {/* Tab 1: Blacklist Registry */}
                {activeTab === 'blacklist' && (
                    <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#161B26] shadow-sm overflow-hidden space-y-0">
                        <div className="p-6 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                            <div>
                                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                    <span className="text-rose-500">⛔</span> Customer Fraud Blacklist Registry
                                </h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                    Enforced via EnsureNotBlacklisted middleware; blocked customers cannot submit slips
                                </p>
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs divide-y divide-slate-100 dark:divide-slate-800/80">
                                <thead className="bg-slate-50/80 dark:bg-[#1A202C]/60 text-slate-500 dark:text-slate-400 uppercase tracking-wider font-bold text-[11px]">
                                    <tr>
                                        <th className="px-6 py-4">Customer Name</th>
                                        <th className="px-6 py-4">Contact</th>
                                        <th className="px-6 py-4">Blacklist Reason</th>
                                        <th className="px-6 py-4">Date Added</th>
                                        <th className="px-6 py-4 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-slate-700 dark:text-slate-300">
                                    {blacklistedUsers.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="px-6 py-8 text-center text-slate-400 font-medium">
                                                No users are currently on the fraud blacklist.
                                            </td>
                                        </tr>
                                    ) : (
                                        blacklistedUsers.map((u) => (
                                            <tr key={u.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                                        <span>{u.name}</span>
                                                        <span className="px-2 py-0.5 rounded-md text-[10px] bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800 font-bold">
                                                            BLOCKED
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-slate-500 dark:text-slate-400">
                                                    <div>{u.email}</div>
                                                    <div className="font-mono text-[11px]">{u.phone || 'N/A'}</div>
                                                </td>
                                                <td className="px-6 py-4 text-rose-600 dark:text-rose-300 font-medium max-w-sm">
                                                    {u.blacklist_reason || 'Administrative restriction'}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-slate-500 dark:text-slate-400">
                                                    {new Date(u.updated_at).toLocaleDateString()}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-right">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRemoveBlacklist(u)}
                                                        className="inline-flex items-center px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
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

                {/* Tab 2: Recent Intercepted Fraud Slips */}
                {activeTab === 'fraud_slips' && (
                    <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#161B26] shadow-sm overflow-hidden space-y-0">
                        <div className="p-6 border-b border-slate-100 dark:border-slate-800/80">
                            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <span className="text-rose-500">🚨</span> Recent Intercepted Fraud Slips
                            </h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                Slips with amount inflation, tampered EXIF data, or duplicate bank transaction references
                            </p>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs divide-y divide-slate-100 dark:divide-slate-800/80">
                                <thead className="bg-slate-50/80 dark:bg-[#1A202C]/60 text-slate-500 dark:text-slate-400 uppercase tracking-wider font-bold text-[11px]">
                                    <tr>
                                        <th className="px-6 py-4">Fraud Type</th>
                                        <th className="px-6 py-4">Payer / Customer</th>
                                        <th className="px-6 py-4">Slip Claimed</th>
                                        <th className="px-6 py-4">Actual Bank Gross</th>
                                        <th className="px-6 py-4 text-right">Variance Prevented</th>
                                        <th className="px-6 py-4">Audit Notes</th>
                                        <th className="px-6 py-4 text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-slate-700 dark:text-slate-300">
                                    {recentFraudMatches.length === 0 ? (
                                        <tr>
                                            <td colSpan={7} className="px-6 py-8 text-center text-slate-400 font-medium">
                                                No fraudulent records detected. All payment receipts verified clean.
                                            </td>
                                        </tr>
                                    ) : (
                                        recentFraudMatches.map((m) => (
                                            <tr key={m.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                                                        {m.match_type}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="font-bold text-slate-900 dark:text-white">{m.invoice?.customer_name || 'N/A'}</div>
                                                    <div className="text-[11px] text-slate-400 font-mono">{m.invoice?.customer_phone || 'N/A'}</div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap font-mono font-bold text-slate-800 dark:text-slate-200">
                                                    {formatMmk(m.slip_amount)} MMK
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap font-mono font-bold text-emerald-600 dark:text-emerald-400">
                                                    {formatMmk(m.bank_amount)} MMK
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-right font-mono font-black text-rose-600 dark:text-rose-400">
                                                    +{formatMmk(m.variance_amount)} MMK
                                                </td>
                                                <td className="px-6 py-4 text-slate-600 dark:text-slate-300 max-w-xs truncate" title={m.notes || ''}>
                                                    {m.notes || '—'}
                                                </td>
                                                <td className="px-6 py-4 text-right whitespace-nowrap">
                                                    {m.invoice?.customer && !m.invoice.customer.is_blacklisted && (
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setSelectedCustomerId(String(m.invoice?.customer?.id));
                                                                setBlacklistReason(`Repeated fraud flag on Match #${m.id}: ${m.notes}`);
                                                                setShowAddBlacklistModal(true);
                                                            }}
                                                            className="inline-flex items-center px-3 py-1.5 rounded-xl text-xs font-bold bg-rose-50 dark:bg-rose-950/80 text-rose-600 dark:text-rose-300 border border-rose-200 dark:border-rose-800 hover:bg-rose-100 transition shadow-sm"
                                                        >
                                                            Add to Blacklist
                                                        </button>
                                                    )}
                                                    {m.invoice?.customer && m.invoice.customer.is_blacklisted && (
                                                        <span className="text-[11px] text-rose-500 font-bold">
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

                {/* Tab 3: Compliance & Support Appeals Queue */}
                {activeTab === 'appeals' && (
                    <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#161B26] shadow-sm overflow-hidden space-y-0">
                        <div className="p-6 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                            <div>
                                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                    <span className="text-amber-500">⚖️</span> Customer Compliance Appeals & Dispute Queue
                                </h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                    Review and resolve account restriction appeals submitted by suspended customers
                                </p>
                            </div>
                            <div className="text-xs font-mono font-semibold text-slate-500 dark:text-slate-400">
                                Total Appeals: <strong className="text-slate-900 dark:text-white">{appeals.length}</strong>
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs divide-y divide-slate-100 dark:divide-slate-800/80">
                                <thead className="bg-slate-50/80 dark:bg-[#1A202C]/60 text-slate-500 dark:text-slate-400 uppercase tracking-wider font-bold text-[11px]">
                                    <tr>
                                        <th className="px-6 py-4">Customer / Contact</th>
                                        <th className="px-6 py-4">Subject & Appeal Message</th>
                                        <th className="px-6 py-4">Date Submitted</th>
                                        <th className="px-6 py-4">Status</th>
                                        <th className="px-6 py-4 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-slate-700 dark:text-slate-300">
                                    {appeals.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="px-6 py-8 text-center text-slate-400 font-medium">
                                                No customer compliance appeals submitted.
                                            </td>
                                        </tr>
                                    ) : (
                                        appeals.map((appeal) => (
                                            <tr key={appeal.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                                                <td className="px-6 py-4 align-top whitespace-nowrap">
                                                    <div className="font-bold text-slate-900 dark:text-white">
                                                        {appeal.user?.name || `Customer #${appeal.user_id}`}
                                                    </div>
                                                    <div className="text-slate-500 dark:text-slate-400 text-[11px]">{appeal.user?.email || 'N/A'}</div>
                                                    <div className="font-mono text-slate-400 text-[11px]">{appeal.user?.phone || ''}</div>
                                                </td>
                                                <td className="px-6 py-4 align-top max-w-md">
                                                    <div className="font-bold text-slate-900 dark:text-white">{appeal.subject}</div>
                                                    <div className="mt-1 text-slate-600 dark:text-slate-300 text-[11px] whitespace-pre-wrap rounded-xl bg-slate-50 dark:bg-slate-900/60 p-3 border border-slate-200/60 dark:border-slate-800">
                                                        {appeal.message}
                                                    </div>
                                                    {appeal.admin_response && (
                                                        <div className="mt-2 text-emerald-700 dark:text-emerald-400 text-[11px] bg-emerald-50 dark:bg-emerald-950/40 p-2.5 rounded-xl border border-emerald-200 dark:border-emerald-900/50">
                                                            <span className="font-bold">Resolution Note:</span> {appeal.admin_response}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 align-top text-slate-500 dark:text-slate-400 font-mono text-[11px] whitespace-nowrap">
                                                    {new Date(appeal.created_at).toLocaleString()}
                                                </td>
                                                <td className="px-6 py-4 align-top whitespace-nowrap">
                                                    {appeal.status === 'pending' ? (
                                                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                                                            ⏳ PENDING REVIEW
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                                                            ✓ RESOLVED
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 align-top text-right whitespace-nowrap">
                                                    {appeal.status === 'pending' ? (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleResolveAppeal(appeal)}
                                                            className="inline-flex items-center px-3.5 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-500 transition shadow-sm"
                                                        >
                                                            Resolve & Lift Ban
                                                        </button>
                                                    ) : (
                                                        <span className="text-[11px] text-slate-400 font-medium">Completed</span>
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

            {/* Add to Blacklist Modal */}
            {showAddBlacklistModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
                    <form
                        onSubmit={handleAddBlacklist}
                        className="w-full max-w-md rounded-3xl border border-slate-200 dark:border-red-800/60 bg-white dark:bg-[#161B26] p-6 shadow-2xl space-y-4"
                    >
                        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                            <h4 className="text-sm font-bold text-rose-600 dark:text-red-400 flex items-center gap-1.5">
                                <span>⛔</span> Add Customer to Fraud Blacklist
                            </h4>
                            <button
                                type="button"
                                onClick={() => setShowAddBlacklistModal(false)}
                                className="text-slate-400 hover:text-slate-900 dark:hover:text-white"
                            >
                                ✕
                            </button>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                Select Customer
                            </label>
                            <select
                                required
                                value={selectedCustomerId}
                                onChange={(e) => setSelectedCustomerId(e.target.value)}
                                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 p-2.5 text-xs text-slate-900 dark:text-white focus:border-rose-500 focus:ring-1 focus:ring-rose-500"
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
                            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                Blacklist Audit Reason
                            </label>
                            <textarea
                                rows={3}
                                required
                                placeholder="e.g. Uploaded Photoshopped payment receipts or duplicate transaction IDs."
                                value={blacklistReason}
                                onChange={(e) => setBlacklistReason(e.target.value)}
                                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 p-3 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:border-rose-500 focus:ring-1 focus:ring-rose-500"
                            />
                        </div>

                        <div className="flex justify-end gap-2 pt-2">
                            <button
                                type="button"
                                onClick={() => setShowAddBlacklistModal(false)}
                                className="rounded-xl border border-slate-200 dark:border-slate-700 px-3.5 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={!selectedCustomerId || !blacklistReason.trim()}
                                className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-700 transition disabled:opacity-50 shadow-sm"
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
