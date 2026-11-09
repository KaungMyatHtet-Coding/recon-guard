import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import ConfirmModal from '@/Components/ConfirmModal';
import InspectCaseModal, { RecommendationCaseItem } from './Partials/InspectCaseModal';
import { Head, Link, router } from '@inertiajs/react';
import React, { useState } from 'react';

interface BlacklistedUser {
    id: number;
    user_id?: number | null;
    name: string;
    email: string;
    phone: string | null;
    type?: 'Registered' | 'Walk-in Guest';
    is_blacklisted: boolean;
    blacklist_reason: string | null;
    created_at?: string;
    updated_at: string;
    payment_slips_count: number;
    blacklisted_by_name?: string;
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
    user_id: number | null;
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

interface BlacklistRecommendationItem extends RecommendationCaseItem {}

interface Props {
    blacklistedUsers: BlacklistedUser[];
    recentFraudMatches: FraudMatch[];
    customers: CustomerOption[];
    appeals?: SupportAppealItem[];
    recommendations?: BlacklistRecommendationItem[];
}

export default function Blacklist({
    blacklistedUsers,
    recentFraudMatches,
    customers,
    appeals = [],
    recommendations = [],
}: Props) {
    const [activeTab, setActiveTab] = useState<'blacklist' | 'fraud_slips' | 'appeals' | 'recommendations'>('blacklist');

    // Inspect Case & Evidence Dossier Modal State
    const [inspectCase, setInspectCase] = useState<RecommendationCaseItem | null>(null);

    // Reusable ConfirmModal State
    const [confirmModal, setConfirmModal] = useState<{
        show: boolean;
        title: string;
        description?: React.ReactNode;
        confirmText?: string;
        cancelText?: string;
        variant?: 'danger' | 'warning' | 'primary' | 'success';
        onConfirm: () => void;
        promptInput?: {
            label: string;
            value: string;
            onChange: (val: string) => void;
            placeholder?: string;
            required?: boolean;
        };
    }>({
        show: false,
        title: '',
        onConfirm: () => {},
    });

    const pendingRecommendationsCount = recommendations.filter((r) => r.status === 'pending').length;

    // Approve Recommendation under Four-Eyes Governance
    const handleApproveRecommendation = (rec: RecommendationCaseItem | BlacklistRecommendationItem) => {
        setConfirmModal({
            show: true,
            title: 'Approve & Enforce Fraud Blacklist?',
            variant: 'danger',
            confirmText: 'Confirm & Enforce Blacklist',
            cancelText: 'Cancel',
            description: (
                <div className="space-y-2">
                    <p>
                        Confirm enforcement of fraud blacklist for <strong className="text-slate-900 dark:text-white">"{rec.customer_name}"</strong> ({rec.customer_phone || 'No phone'}) under Four-Eyes Maker-Checker governance?
                    </p>
                    <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-xs text-rose-800 dark:text-rose-300">
                        <strong>Accountant Reason:</strong> {rec.reason}
                    </div>
                    <p className="text-[11px] text-slate-500">
                        This customer and phone number will be immediately restricted from accessing the payment portal.
                    </p>
                </div>
            ),
            onConfirm: () => {
                setConfirmModal((prev) => ({ ...prev, show: false }));
                setInspectCase(null);
                router.patch(route('admin.blacklist-recommendations.approve', rec.id), {}, { preserveScroll: true });
            },
        });
    };

    // Dismiss Recommendation
    const handleDismissRecommendation = (rec: RecommendationCaseItem | BlacklistRecommendationItem) => {
        setConfirmModal({
            show: true,
            title: 'Dismiss Blacklist Recommendation?',
            variant: 'warning',
            confirmText: 'Dismiss Recommendation',
            cancelText: 'Keep in Queue',
            description: (
                <div className="space-y-2">
                    <p>
                        Are you sure you want to dismiss the blacklist recommendation for <strong className="text-slate-900 dark:text-white">"{rec.customer_name}"</strong>?
                    </p>
                    <p className="text-[11px] text-slate-500">
                        The recommendation will be archived as dismissed and no payment restrictions will be placed on this customer.
                    </p>
                </div>
            ),
            onConfirm: () => {
                setConfirmModal((prev) => ({ ...prev, show: false }));
                setInspectCase(null);
                router.patch(route('admin.blacklist-recommendations.dismiss', rec.id), {}, { preserveScroll: true });
            },
        });
    };

    // Resolve Customer Appeal with Custom Prompt Input
    const handleResolveAppeal = (appeal: SupportAppealItem) => {
        const initialNote = 'Appeal approved by Chief Auditor. User restriction lifted.';
        setConfirmModal({
            show: true,
            title: `Resolve Appeal #${appeal.id}?`,
            variant: 'success',
            confirmText: 'Resolve & Lift Ban',
            cancelText: 'Cancel',
            description: (
                <p>
                    Resolving this appeal will unblock <strong className="text-slate-900 dark:text-white">{appeal.user?.name || appeal.contact_phone || 'Customer'}</strong> and restore their account privileges.
                </p>
            ),
            promptInput: {
                label: 'Resolution Audit Note (Visible to Customer & Audit Trail)',
                value: initialNote,
                placeholder: 'Enter resolution note...',
                required: true,
                onChange: (val: string) => {
                    setConfirmModal((prev) => ({
                        ...prev,
                        promptInput: prev.promptInput ? { ...prev.promptInput, value: val } : undefined,
                    }));
                },
            },
            onConfirm: () => {
                const note = confirmModal.promptInput?.value || initialNote;
                setConfirmModal((prev) => ({ ...prev, show: false }));
                router.post(route('admin.appeals.resolve', appeal.id), {
                    admin_response: note,
                }, { preserveScroll: true });
            },
        });
    };

    // Unblock / Lift Restriction on Blacklist Registry Entry
    const handleUnblock = (entry: BlacklistedUser) => {
        setConfirmModal({
            show: true,
            title: 'Unblock Customer / Lift Restriction?',
            variant: 'success',
            confirmText: 'Unblock Customer',
            cancelText: 'Cancel',
            description: (
                <div className="space-y-2">
                    <p>
                        Are you sure you want to lift fraud restrictions for <strong className="text-slate-900 dark:text-white">{entry.name}</strong> ({entry.phone || 'No phone'})?
                    </p>
                    <p className="text-[11px] text-slate-500">
                        This will remove the entry from the Blacklist Registry, dismiss any pending recommendations, and restore payment submission privileges immediately.
                    </p>
                </div>
            ),
            onConfirm: () => {
                setConfirmModal((prev) => ({ ...prev, show: false }));
                router.delete(route('admin.blacklist.unblock', entry.id), {
                    preserveScroll: true,
                });
            },
        });
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
                {/* Header (Cleaned: Manual +Blacklist Customer button removed under strict Four-Eyes governance) */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                        <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                            <span>🚨</span> Fraud Defense & Blacklist Management Center
                        </h2>
                        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                            Enforce account restrictions, review suspicious payment slips, and manage compliance appeals
                        </p>
                    </div>
                </div>

                {/* KPI Ribbon */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                    <div className="rounded-2xl border border-rose-200/80 dark:border-rose-900/40 bg-white dark:bg-[#161B26] p-5 shadow-sm">
                        <div className="text-xs font-bold uppercase tracking-wider text-rose-500">
                            Blacklisted Customers
                        </div>
                        <div className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-2 font-mono">
                            {blacklistedUsers.length} <span className="text-xs text-rose-400 font-normal">Restricted</span>
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                            Users & Walk-in Guests blocked
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

                    <div className="rounded-2xl border border-purple-200/80 dark:border-purple-900/40 bg-white dark:bg-[#161B26] p-5 shadow-sm">
                        <div className="text-xs font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">
                            Staff Flag Queue
                        </div>
                        <div className="text-2xl font-black text-purple-600 dark:text-purple-400 mt-2 font-mono">
                            {pendingRecommendationsCount} <span className="text-xs text-purple-500 font-normal">Pending</span>
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                            Four-Eyes blacklist requests
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
                    <button
                        type="button"
                        onClick={() => setActiveTab('recommendations')}
                        className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                            activeTab === 'recommendations'
                                ? 'bg-[#705CF6] text-white shadow-sm'
                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/50'
                        }`}
                    >
                        <span>🛡️</span>
                        Staff Recommendations Queue
                        {pendingRecommendationsCount > 0 && (
                            <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-rose-500 text-white font-extrabold animate-pulse">
                                {pendingRecommendationsCount}
                            </span>
                        )}
                    </button>
                </div>

                {/* Tab 1: Unified Blacklist Registry (Registered Users & Walk-in Guests) */}
                {activeTab === 'blacklist' && (
                    <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#161B26] shadow-sm overflow-hidden space-y-0">
                        <div className="p-6 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                            <div>
                                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                    <span className="text-rose-500">⛔</span> Customer & Guest Fraud Blacklist Registry
                                </h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                    Enforced via EnsureNotBlacklisted & Public Payment Shield; blocked customers cannot submit payment slips
                                </p>
                            </div>
                            <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800">
                                {blacklistedUsers.length} Active Restrictions
                            </span>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs divide-y divide-slate-100 dark:divide-slate-800/80">
                                <thead className="bg-slate-50/80 dark:bg-[#1A202C]/60 text-slate-500 dark:text-slate-400 uppercase tracking-wider font-bold text-[11px]">
                                    <tr>
                                        <th className="px-6 py-4">Customer Name & Type</th>
                                        <th className="px-6 py-4">Contact Phone & Email</th>
                                        <th className="px-6 py-4">Blacklist Reason</th>
                                        <th className="px-6 py-4">Enforced Date & Officer</th>
                                        <th className="px-6 py-4 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-slate-700 dark:text-slate-300">
                                    {blacklistedUsers.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="px-6 py-8 text-center text-slate-400 font-medium">
                                                No users or guests are currently on the fraud blacklist.
                                            </td>
                                        </tr>
                                    ) : (
                                        blacklistedUsers.map((u) => (
                                            <tr key={u.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                                        <span>{u.name}</span>
                                                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                                            u.type === 'Registered'
                                                                ? 'bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-400'
                                                                : 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400'
                                                        }`}>
                                                            {u.type || (u.user_id ? 'Registered' : 'Walk-in Guest')}
                                                        </span>
                                                        <span className="px-2 py-0.5 rounded-md text-[10px] bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800 font-bold">
                                                            BLOCKED
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-slate-500 dark:text-slate-400">
                                                    <div className="font-mono text-slate-800 dark:text-slate-200 font-bold">
                                                        {u.phone || 'No Phone Recorded'}
                                                    </div>
                                                    <div className="text-[11px] text-slate-400">{u.email}</div>
                                                </td>
                                                <td className="px-6 py-4 text-rose-600 dark:text-rose-300 font-medium max-w-sm">
                                                    {u.blacklist_reason || 'Administrative restriction'}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-slate-500 dark:text-slate-400">
                                                    <div>{new Date(u.created_at || u.updated_at).toLocaleDateString()}</div>
                                                    <div className="text-[10px] text-slate-400">by {u.blacklisted_by_name || 'Chief Auditor'}</div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-right">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleUnblock(u)}
                                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 transition shadow-xs"
                                                    >
                                                        <span>🔓</span> Unblock / Lift Restriction
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
                                        <th className="px-6 py-4 text-right">Status</th>
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
                                                    <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800">
                                                        INTERCEPTED
                                                    </span>
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
                                                        {appeal.user?.name || `Customer #${appeal.user_id || 'Guest'}`}
                                                    </div>
                                                    <div className="text-slate-500 dark:text-slate-400 text-[11px]">{appeal.user?.email || 'Walk-in Guest'}</div>
                                                    <div className="font-mono text-slate-400 text-[11px]">{appeal.contact_phone || appeal.user?.phone || ''}</div>
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

                {/* Tab 4: Staff Recommendations Queue */}
                {activeTab === 'recommendations' && (
                    <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#161B26] shadow-sm overflow-hidden space-y-0">
                        <div className="p-6 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                            <div>
                                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                    <span className="text-purple-500">🛡️</span> Four-Eyes Staff Blacklist Recommendations
                                </h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                    Submitted by Senior Accountants during reconciliation or invoice review; requires Chief Auditor approval to enforce
                                </p>
                            </div>
                            <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-purple-50 dark:bg-purple-950/60 text-[#705CF6] dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                                {pendingRecommendationsCount} Awaiting Decision
                            </span>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs divide-y divide-slate-100 dark:divide-slate-800/80">
                                <thead className="bg-slate-50/80 dark:bg-[#1A202C]/60 text-slate-500 dark:text-slate-400 uppercase tracking-wider font-bold text-[11px]">
                                    <tr>
                                        <th className="px-6 py-4">Recommender</th>
                                        <th className="px-6 py-4">Target Customer & Phone</th>
                                        <th className="px-6 py-4">Linked Invoice</th>
                                        <th className="px-6 py-4">Evidence & Reason</th>
                                        <th className="px-6 py-4">Status</th>
                                        <th className="px-6 py-4">Submitted Date</th>
                                        <th className="px-6 py-4 text-right">Four-Eyes Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-slate-700 dark:text-slate-300">
                                    {recommendations.length === 0 ? (
                                        <tr>
                                            <td colSpan={7} className="px-6 py-8 text-center text-slate-400 font-medium">
                                                No staff blacklist recommendations in queue.
                                            </td>
                                        </tr>
                                    ) : (
                                        recommendations.map((rec) => (
                                            <tr key={rec.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                                                <td className="px-6 py-4 align-top whitespace-nowrap">
                                                    <div className="font-bold text-slate-900 dark:text-white">
                                                        {rec.recommender?.name || 'Senior Accountant'}
                                                    </div>
                                                    <div className="text-[11px] text-slate-500 dark:text-slate-400">
                                                        {rec.recommender?.email}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 align-top whitespace-nowrap">
                                                    <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                                                        <span>{rec.customer_name}</span>
                                                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                                            rec.target_user_id
                                                                ? 'bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-400'
                                                                : 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400'
                                                        }`}>
                                                            {rec.target_user_id ? 'Registered' : 'Walk-in Guest'}
                                                        </span>
                                                    </div>
                                                    <div className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
                                                        {rec.customer_phone || 'No phone'}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 align-top whitespace-nowrap">
                                                    {rec.invoice ? (
                                                        <span className="font-mono font-bold text-[#705CF6] dark:text-indigo-400">
                                                            {rec.invoice.invoice_number}
                                                        </span>
                                                    ) : (
                                                        <span className="text-slate-400 italic">—</span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 align-top text-slate-700 dark:text-slate-300 max-w-xs leading-relaxed">
                                                    {rec.reason}
                                                </td>
                                                <td className="px-6 py-4 align-top whitespace-nowrap">
                                                    {rec.status === 'pending' ? (
                                                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 dark:bg-amber-950/80 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                                                            ⏳ PENDING
                                                        </span>
                                                    ) : rec.status === 'approved' ? (
                                                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-50 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800">
                                                            ⛔ ENFORCED
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-300 dark:border-slate-700">
                                                            ✕ DISMISSED
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 align-top whitespace-nowrap text-slate-500 dark:text-slate-400">
                                                    {new Date(rec.created_at).toLocaleDateString()}
                                                </td>
                                                <td className="px-6 py-4 align-top text-right whitespace-nowrap">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={() => setInspectCase(rec)}
                                                            className="px-2.5 py-1 rounded-xl text-xs font-bold bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/70 dark:hover:bg-purple-900/80 text-[#705CF6] dark:text-purple-300 border border-purple-200 dark:border-purple-800 transition shadow-xs flex items-center gap-1"
                                                        >
                                                            <span>🔍</span> Inspect Case
                                                        </button>

                                                        {rec.status === 'pending' && (
                                                            <>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleDismissRecommendation(rec)}
                                                                    className="px-2.5 py-1 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition"
                                                                >
                                                                    Dismiss
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleApproveRecommendation(rec)}
                                                                    className="px-2.5 py-1 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white transition shadow-sm"
                                                                >
                                                                    Approve & Enforce
                                                                </button>
                                                            </>
                                                        )}
                                                    </div>
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

            {/* Inspect Case & Evidence Dossier Modal */}
            <InspectCaseModal
                show={!!inspectCase}
                recommendation={inspectCase}
                onClose={() => setInspectCase(null)}
                onApprove={handleApproveRecommendation}
                onDismiss={handleDismissRecommendation}
            />

            {/* Global FinSet ConfirmModal (Replaces native browser window.confirm & prompt) */}
            <ConfirmModal
                show={confirmModal.show}
                title={confirmModal.title}
                description={confirmModal.description}
                confirmText={confirmModal.confirmText}
                cancelText={confirmModal.cancelText}
                variant={confirmModal.variant}
                promptInput={confirmModal.promptInput}
                onClose={() => setConfirmModal((prev) => ({ ...prev, show: false }))}
                onConfirm={confirmModal.onConfirm}
            />
        </AuthenticatedLayout>
    );
}
