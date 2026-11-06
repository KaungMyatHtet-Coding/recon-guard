import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, usePage } from '@inertiajs/react';
import { useState } from 'react';
import { PageProps } from '@/types';
import CreateInvoiceModal from './Partials/CreateInvoiceModal';
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
    const [copiedInvoiceId, setCopiedInvoiceId] = useState<number | null>(null);

    const handleCopyPaymentLink = (invoiceNumber: string, invoiceId: number) => {
        const link = window.location.origin + '/pay/' + invoiceNumber;
        navigator.clipboard.writeText(link).then(() => {
            setCopiedInvoiceId(invoiceId);
            setTimeout(() => setCopiedInvoiceId(null), 2000);
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
                        <h2 className="text-xl font-bold leading-tight text-slate-900 dark:text-white">
                            Invoices & Slip Payment Portal
                        </h2>
                        <p className="text-xs text-slate-700 dark:text-slate-400 mt-1">
                            Pay invoices via KBZPay, WavePay, CB Pay, or AYA Pay, upload payment slips, and run instant OCR forensics
                        </p>
                    </div>

                    {canCreateInvoice && (
                        <button
                            type="button"
                            onClick={() => setShowCreateModal(true)}
                            className="inline-flex items-center px-3.5 py-2 rounded-xl text-xs font-semibold bg-[#705CF6] hover:bg-[#5f4be3] text-white shadow-sm transition gap-1.5"
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
                <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
                    {tabs.map((tab) => {
                        const active = currentTab === tab.id;
                        return (
                            <Link
                                key={tab.id}
                                href={route('invoices.index', { tab: tab.id })}
                                className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition flex items-center gap-2 ${
                                    active
                                        ? 'bg-[#705CF6] text-white font-semibold shadow-sm'
                                        : 'bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800'
                                }`}
                            >
                                <span>{tab.label}</span>
                                <span className={`px-1.5 py-0.2 rounded-md text-[10px] font-bold ${active ? 'bg-purple-900/60 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'}`}>
                                    {tab.count}
                                </span>
                            </Link>
                        );
                    })}
                </div>

                {/* Invoices List Table */}
                <div className="overflow-hidden rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#161B26] shadow-sm">
                    <div className="w-full overflow-x-auto lg:overflow-x-visible">
                        <table className="w-full table-auto divide-y divide-slate-200 dark:divide-slate-800 text-left text-xs">
                            <thead className="bg-slate-50/80 dark:bg-slate-900/60 text-[11px] uppercase tracking-wider text-slate-700 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
                                <tr>
                                    <th className="px-3 py-2.5">Invoice #</th>
                                    <th className="px-3 py-2.5">Customer & Phone</th>
                                    <th className="px-3 py-2.5">Amount (MMK)</th>
                                    <th className="px-3 py-2.5">Expected Channel</th>
                                    <th className="px-3 py-2.5">Status</th>
                                    <th className="px-3 py-2.5">Slips</th>
                                    <th className="px-3 py-2.5 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                                {invoices.data.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="px-3 py-10 text-center text-slate-500 dark:text-slate-400 text-xs">
                                            No invoices found in this filter view.
                                        </td>
                                    </tr>
                                ) : (
                                    invoices.data.map((inv) => (
                                        <tr key={inv.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                                            <td className="whitespace-nowrap px-3 py-2.5 font-mono font-semibold text-slate-900 dark:text-white">
                                                <Link href={route('invoices.show', inv.id)} className="text-[#705CF6] dark:text-indigo-400 hover:underline">
                                                    {inv.invoice_number}
                                                </Link>
                                            </td>
                                            <td className="px-3 py-2.5">
                                                <div className="font-semibold text-slate-900 dark:text-white truncate max-w-[150px]">{inv.customer_name}</div>
                                                <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">{inv.customer_phone || '09#########'}</div>
                                            </td>
                                            <td className="whitespace-nowrap px-3 py-2.5 font-mono font-semibold text-slate-900 dark:text-white">
                                                {formatMMK(inv.amount)}
                                            </td>
                                            <td className="whitespace-nowrap px-3 py-2.5">
                                                {getChannelBadge(inv.expected_channel)}
                                            </td>
                                            <td className="whitespace-nowrap px-3 py-2.5">
                                                {getStatusBadge(inv.status)}
                                            </td>
                                            <td className="whitespace-nowrap px-3 py-2.5">
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-[11px] font-semibold ${
                                                    inv.payment_slips_count > 0 ? 'bg-sky-50 dark:bg-sky-950 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                                                }`}>
                                                    {inv.payment_slips_count} {inv.payment_slips_count === 1 ? 'Slip' : 'Slips'}
                                                </span>
                                            </td>
                                            <td className="whitespace-nowrap px-3 py-2.5 text-right">
                                                <div className="flex items-center justify-end gap-1.5">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleCopyPaymentLink(inv.invoice_number, inv.id)}
                                                        className="inline-flex items-center px-2.5 py-1 rounded-xl text-xs font-semibold bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 transition"
                                                        title="Copy guest payment link"
                                                    >
                                                        {copiedInvoiceId === inv.id ? (
                                                            <span>✓ Copied!</span>
                                                        ) : (
                                                            <span>📋 Copy Link</span>
                                                        )}
                                                    </button>
                                                    <Link
                                                        href={route('invoices.show', inv.id)}
                                                        className="inline-flex items-center px-2.5 py-1 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition"
                                                    >
                                                        <span>View Details →</span>
                                                    </Link>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {invoices.total > 15 && (
                        <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                            <div>Showing page {invoices.current_page} of {invoices.last_page} ({invoices.total} total)</div>
                            <div className="flex gap-2">
                                {invoices.prev_page_url && (
                                    <Link href={invoices.prev_page_url} className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700">
                                        Previous
                                    </Link>
                                )}
                                {invoices.next_page_url && (
                                    <Link href={invoices.next_page_url} className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700">
                                        Next
                                    </Link>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Create Invoice Modal with Guest & Registered Support */}
            <CreateInvoiceModal
                show={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                customers={customers}
            />
        </AuthenticatedLayout>
    );
}
