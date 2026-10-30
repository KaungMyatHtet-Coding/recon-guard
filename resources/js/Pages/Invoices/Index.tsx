import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, useForm, usePage } from '@inertiajs/react';
import { FormEvent, useState } from 'react';
import { PageProps } from '@/types';

interface InvoiceListItem {
    id: number;
    invoice_number: string;
    customer_name: string;
    customer_phone: string | null;
    amount: number;
    expected_channel: string;
    status: string;
    due_date: string | null;
    created_at: string;
    payment_slips_count: number;
}

interface InvoicesIndexProps {
    invoices: {
        data: InvoiceListItem[];
        current_page: number;
        last_page: number;
        next_page_url: string | null;
        prev_page_url: string | null;
        total: number;
    };
    stats: {
        total: number;
        unpaid: number;
        pending: number;
        reconciled: number;
        flagged: number;
    };
    currentTab: string;
    customers: Array<{
        id: number;
        name: string;
        phone: string | null;
        company_name: string | null;
        email: string;
    }>;
    canCreateInvoice: boolean;
}

export default function InvoicesIndex({
    invoices,
    stats,
    currentTab,
    customers,
    canCreateInvoice,
}: InvoicesIndexProps) {
    const { auth } = usePage<PageProps>().props;
    const [showCreateModal, setShowCreateModal] = useState<boolean>(false);

    const { data: createData, setData: setCreateData, post: postCreate, processing: createProcessing, reset: resetCreate } = useForm({
        user_id: customers[0]?.id || '',
        amount: '',
        expected_channel: 'any',
        description: '',
        due_date: '',
    });

    const handleCreateInvoice = (e: FormEvent) => {
        e.preventDefault();
        postCreate(route('invoices.store'), {
            onSuccess: () => {
                setShowCreateModal(false);
                resetCreate();
            },
        });
    };

    const formatMMK = (amount: number) => {
        return new Intl.NumberFormat('my-MM', {
            style: 'decimal',
            minimumFractionDigits: 0,
            maximumFractionDigits: 2,
        }).format(amount) + ' MMK';
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'reconciled':
                return (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-950 text-emerald-300 border border-emerald-700/60">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 me-1.5"></span>
                        Reconciled
                    </span>
                );
            case 'pending_verification':
                return (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-950 text-sky-300 border border-sky-700/60">
                        <span className="w-1.5 h-1.5 rounded-full bg-sky-400 me-1.5 animate-pulse"></span>
                        Pending Verification
                    </span>
                );
            case 'fraud_flagged':
                return (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-950 text-rose-300 border border-rose-700/60">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-400 me-1.5 animate-ping"></span>
                        Fraud Flagged
                    </span>
                );
            case 'discrepancy':
                return (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-950 text-amber-300 border border-amber-700/60">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 me-1.5"></span>
                        Discrepancy
                    </span>
                );
            default:
                return (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                        Unpaid
                    </span>
                );
        }
    };

    const getChannelBadge = (ch: string) => {
        switch (ch.toLowerCase()) {
            case 'kbzpay':
                return <span className="text-xs px-2 py-0.5 rounded font-mono bg-blue-950 text-blue-300 border border-blue-800">KBZPay</span>;
            case 'wavepay':
                return <span className="text-xs px-2 py-0.5 rounded font-mono bg-yellow-950 text-yellow-300 border border-yellow-800">WavePay</span>;
            case 'cbpay':
                return <span className="text-xs px-2 py-0.5 rounded font-mono bg-orange-950 text-orange-300 border border-orange-800">CB Pay</span>;
            case 'ayapay':
                return <span className="text-xs px-2 py-0.5 rounded font-mono bg-red-950 text-red-300 border border-red-800">AYA Pay</span>;
            default:
                return <span className="text-xs px-2 py-0.5 rounded font-mono bg-slate-800 text-slate-300 border border-slate-700">Any Channel</span>;
        }
    };

    const tabs = [
        { id: 'all', label: 'All Invoices', count: stats.total },
        { id: 'unpaid', label: 'Unpaid', count: stats.unpaid },
        { id: 'pending', label: 'Pending Verification', count: stats.pending },
        { id: 'reconciled', label: 'Reconciled', count: stats.reconciled },
        { id: 'flagged', label: 'Fraud / Discrepancy', count: stats.flagged },
    ];

    return (
        <AuthenticatedLayout
            header={
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h2 className="text-xl font-bold leading-tight text-white flex items-center space-x-2">
                            <span>Invoices & Slip Payment Portal</span>
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-indigo-950 text-indigo-300 border border-indigo-700">
                                Phase 3 Portal
                            </span>
                        </h2>
                        <p className="text-xs text-slate-400 mt-1">
                            Pay invoices via KBZPay, WavePay, CB Pay, or AYA Pay, upload payment slips, and run instant OCR forensics
                        </p>
                    </div>

                    {canCreateInvoice && (
                        <button
                            type="button"
                            onClick={() => setShowCreateModal(true)}
                            className="inline-flex items-center px-3.5 py-2 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/20 transition gap-1.5"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                            </svg>
                            Create Demo Invoice
                        </button>
                    )}
                </div>
            }
        >
            <Head title="Invoices & Payment Slips - ReconGuard" />

            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-6">
                {/* Filter Tabs */}
                <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 pb-3">
                    {tabs.map((tab) => {
                        const active = currentTab === tab.id;
                        return (
                            <Link
                                key={tab.id}
                                href={route('invoices.index', { tab: tab.id })}
                                className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-2 ${
                                    active
                                        ? 'bg-indigo-600 text-white font-semibold shadow-md shadow-indigo-600/30'
                                        : 'bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-800'
                                }`}
                            >
                                <span>{tab.label}</span>
                                <span className={`px-1.5 py-0.2 rounded text-[10px] ${active ? 'bg-indigo-800 text-indigo-200' : 'bg-slate-700 text-slate-300'}`}>
                                    {tab.count}
                                </span>
                            </Link>
                        );
                    })}
                </div>

                {/* Invoices List Table */}
                <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-800/40 backdrop-blur">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-800 text-left text-sm">
                            <thead className="bg-slate-900/60 text-xs uppercase tracking-wider text-slate-400 font-semibold">
                                <tr>
                                    <th className="px-6 py-3.5">Invoice #</th>
                                    <th className="px-6 py-3.5">Customer & Phone</th>
                                    <th className="px-6 py-3.5">Amount (MMK)</th>
                                    <th className="px-6 py-3.5">Expected Channel</th>
                                    <th className="px-6 py-3.5">Status</th>
                                    <th className="px-6 py-3.5">Slips Uploaded</th>
                                    <th className="px-6 py-3.5 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800 text-slate-300">
                                {invoices.data.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="px-6 py-12 text-center text-slate-500 text-sm">
                                            No invoices found in this filter view.
                                        </td>
                                    </tr>
                                ) : (
                                    invoices.data.map((inv) => (
                                        <tr key={inv.id} className="hover:bg-slate-800/50 transition">
                                            <td className="whitespace-nowrap px-6 py-4 font-mono font-bold text-indigo-300">
                                                <Link href={route('invoices.show', inv.id)} className="hover:underline">
                                                    {inv.invoice_number}
                                                </Link>
                                            </td>
                                            <td className="whitespace-nowrap px-6 py-4">
                                                <div className="font-medium text-white">{inv.customer_name}</div>
                                                <div className="text-xs text-slate-400">{inv.customer_phone || '09#########'}</div>
                                            </td>
                                            <td className="whitespace-nowrap px-6 py-4 font-mono font-semibold text-white">
                                                {formatMMK(inv.amount)}
                                            </td>
                                            <td className="whitespace-nowrap px-6 py-4">
                                                {getChannelBadge(inv.expected_channel)}
                                            </td>
                                            <td className="whitespace-nowrap px-6 py-4">
                                                {getStatusBadge(inv.status)}
                                            </td>
                                            <td className="whitespace-nowrap px-6 py-4">
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${
                                                    inv.payment_slips_count > 0 ? 'bg-sky-950 text-sky-300 border border-sky-800' : 'bg-slate-800 text-slate-500'
                                                }`}>
                                                    {inv.payment_slips_count} {inv.payment_slips_count === 1 ? 'Slip' : 'Slips'}
                                                </span>
                                            </td>
                                            <td className="whitespace-nowrap px-6 py-4 text-right">
                                                <Link
                                                    href={route('invoices.show', inv.id)}
                                                    className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-700 hover:bg-slate-600 text-white border border-slate-600 transition gap-1"
                                                >
                                                    <span>View / Upload Slip</span>
                                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                                                    </svg>
                                                </Link>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {invoices.total > 15 && (
                        <div className="p-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
                            <div>Showing page {invoices.current_page} of {invoices.last_page} ({invoices.total} total)</div>
                            <div className="flex gap-2">
                                {invoices.prev_page_url && (
                                    <Link href={invoices.prev_page_url} className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200">
                                        Previous
                                    </Link>
                                )}
                                {invoices.next_page_url && (
                                    <Link href={invoices.next_page_url} className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200">
                                        Next
                                    </Link>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Create Invoice Modal (For Admin & Accountant) */}
            {showCreateModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <div className="w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl space-y-4">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                            <h3 className="text-base font-bold text-white flex items-center gap-2">
                                <span className="p-1 rounded bg-indigo-500/10 text-indigo-400">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                </span>
                                Issue New Commercial Invoice
                            </h3>
                            <button
                                type="button"
                                onClick={() => setShowCreateModal(false)}
                                className="text-slate-400 hover:text-white"
                            >
                                ✕
                            </button>
                        </div>

                        <form onSubmit={handleCreateInvoice} className="space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-slate-300 mb-1">
                                    Target Customer Account
                                </label>
                                <select
                                    value={createData.user_id}
                                    onChange={(e) => setCreateData('user_id', e.target.value)}
                                    required
                                    className="w-full rounded-lg bg-slate-800 border border-slate-700 text-sm text-white"
                                >
                                    {customers.map((c) => (
                                        <option key={c.id} value={c.id}>
                                            {c.name} {c.company_name ? `(${c.company_name})` : ''} — {c.email}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-medium text-slate-300 mb-1">
                                        Amount (MMK)
                                    </label>
                                    <input
                                        type="number"
                                        value={createData.amount}
                                        onChange={(e) => setCreateData('amount', e.target.value)}
                                        required
                                        placeholder="250000"
                                        className="w-full rounded-lg bg-slate-800 border border-slate-700 text-sm text-white"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-medium text-slate-300 mb-1">
                                        Expected Channel
                                    </label>
                                    <select
                                        value={createData.expected_channel}
                                        onChange={(e) => setCreateData('expected_channel', e.target.value)}
                                        className="w-full rounded-lg bg-slate-800 border border-slate-700 text-sm text-white"
                                    >
                                        <option value="any">Any Mobile Wallet / Bank</option>
                                        <option value="kbzpay">KBZPay (KPay)</option>
                                        <option value="wavepay">WavePay</option>
                                        <option value="cbpay">CB Pay</option>
                                        <option value="ayapay">AYA Pay</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-slate-300 mb-1">
                                    Description / Line Items
                                </label>
                                <input
                                    type="text"
                                    value={createData.description}
                                    onChange={(e) => setCreateData('description', e.target.value)}
                                    placeholder="Quarterly Server Hardware Deposit"
                                    className="w-full rounded-lg bg-slate-800 border border-slate-700 text-sm text-white"
                                />
                            </div>

                            <div className="flex items-center justify-end gap-3 pt-3">
                                <button
                                    type="button"
                                    onClick={() => setShowCreateModal(false)}
                                    className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={createProcessing}
                                    className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white shadow-md shadow-indigo-600/30 transition disabled:opacity-50"
                                >
                                    {createProcessing ? 'Creating...' : 'Issue Invoice'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AuthenticatedLayout>
    );
}
