import LanguageSwitcher from '@/Components/LanguageSwitcher';
import ThemeToggle from '@/Components/ThemeToggle';
import { useLanguage } from '@/Contexts/LanguageContext';
import { Head, Link, router, usePage } from '@inertiajs/react';
import React from 'react';
import AuditFilterToolbar, { FilterState, StatusOption } from '@/Components/AuditFilterToolbar';

interface MatchItem {
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
    };
    payment_slip?: {
        id: number;
        payment_channel: string;
        extracted_transaction_id: string;
    };
    bank_transaction?: {
        id: number;
        bank_transaction_id: string;
        payment_channel: string;
    };
    auditor?: {
        id: number;
        name: string;
    };
}

interface SummaryData {
    total_records: number;
    matched_volume: number;
    formatted_matched_volume: string;
    total_variance_fees: number;
    formatted_variance_fees: string;
    fraud_prevented: number;
    formatted_fraud_prevented: string;
    generation_timestamp: string;
    auditor_name: string;
    auditor_email: string;
    report_ref: string;
    audit_period?: string;
}

interface Props {
    records: MatchItem[];
    can_export_pdf?: boolean;
    summary: SummaryData;
    filters: FilterState;
    scopeSummary?: string;
    isDefaultScope?: boolean;
}

export default function AuditReport({
    records,
    can_export_pdf,
    summary,
    filters = {},
    scopeSummary,
    isDefaultScope = true,
}: Props) {
    const { auth } = usePage().props as any;
    const isAdmin = Boolean(can_export_pdf ?? auth?.user?.roles?.includes('admin'));
    const backUrl = isAdmin ? route('admin.dashboard') : route('reconciliation.index');
    const backLabel = isAdmin ? '← Back to Governance Suite' : '← Back to 3-Way Reconciliation';

    const handleFilterChange = (newFilters: Partial<FilterState>) => {
        const merged = {
            ...filters,
            ...newFilters,
        };
        const query: Record<string, any> = {};
        Object.entries(merged).forEach(([k, v]) => {
            if (v !== null && v !== undefined && v !== '') {
                query[k] = v;
            }
        });
        router.get(route('admin.audit-report'), query, {
            preserveState: true,
            preserveScroll: true,
        });
    };

    const statusOptions: StatusOption[] = [
        { value: 'all', label: 'All Statuses' },
        { value: 'verified', label: 'Verified / Settled' },
        { value: 'pending_review', label: 'Pending Review (Fuzzy)' },
        { value: 'fraud', label: 'Rejected Fraud / Discrepancy' },
    ];

    const channelOptions = [
        { value: 'all', label: 'All Channels' },
        { value: 'kbzpay', label: 'KBZPay' },
        { value: 'wavepay', label: 'WavePay' },
        { value: 'cbpay', label: 'CB Pay' },
        { value: 'ayapay', label: 'AYA Pay' },
        { value: 'cash', label: 'CASH' },
    ];

    const handlePrint = () => {
        window.print();
    };

    const formatMmk = (amount: number | string | null | undefined) => {
        if (amount === null || amount === undefined) return '0.00';
        const num = typeof amount === 'number' ? amount : parseFloat(amount);
        return isNaN(num) ? '0.00' : num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    const { t } = useLanguage();

    return (
        <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0B0F19] text-[#0F172A] dark:text-[#F8FAFC] p-4 sm:p-8 print:bg-white print:text-black print:p-0 transition-colors duration-200 font-sans">
            <Head title={`Official Audit Report - ${summary.report_ref}`} />

            {/* Print Control Toolbar & Modern Unified Filter (Hidden in Print) */}
            <div className="mx-auto max-w-6xl mb-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#1E293B] p-5 backdrop-blur shadow-xl print:hidden space-y-4">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <Link
                            href={backUrl}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white transition"
                        >
                            {backLabel}
                        </Link>
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                            Ref: <strong className="font-mono text-purple-600 dark:text-purple-400">{summary.report_ref}</strong>
                        </span>
                    </div>

                    <div className="flex items-center gap-3">
                        <LanguageSwitcher />
                        <ThemeToggle />

                        {isAdmin ? (
                            <button
                                type="button"
                                onClick={handlePrint}
                                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 px-5 py-2 text-xs font-bold text-white shadow-lg shadow-purple-600/30 hover:from-purple-500 hover:to-indigo-500 transition cursor-pointer"
                            >
                                <span>🖨️</span> {t('action.export_pdf', 'Print / Save as PDF')}
                            </button>
                        ) : (
                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300 text-xs font-medium">
                                <span>🔒</span> Read-Only Preview (Export restricted to Chief Auditor)
                            </div>
                        )}
                    </div>
                </div>

                {/* Unified Interactive Filter Toolbar */}
                <div className="border-t border-slate-200 dark:border-slate-800 pt-3.5">
                    <AuditFilterToolbar
                        filters={filters}
                        onFilterChange={handleFilterChange}
                        statusOptions={statusOptions}
                        channelOptions={channelOptions}
                        searchPlaceholder="Search by Invoice #, Customer Name, Phone, or Bank Txn Ref..."
                        totalRecords={summary.total_records}
                        scopeSummary={scopeSummary || summary.audit_period}
                        isDefaultScope={isDefaultScope}
                    />
                </div>
            </div>

            {/* Official Audit Document Container */}
            <div className="mx-auto max-w-6xl rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-8 sm:p-12 shadow-2xl print:border-none print:shadow-none print:p-6 print:bg-white print:max-w-none transition-colors duration-200">
                {/* Official Header */}
                <div className="flex flex-col sm:flex-row items-start justify-between border-b-2 border-slate-200 dark:border-slate-800 print:border-black pb-6 gap-4">
                    <div>
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-500 p-0.5 shadow-md">
                                <div className="h-full w-full rounded-[10px] bg-slate-900 print:bg-white flex items-center justify-center font-black text-purple-400 print:text-purple-700 text-base">
                                    RG
                                </div>
                            </div>
                            <div>
                                <h1 className="text-xl font-black tracking-tight text-slate-900 dark:text-white print:text-black">
                                    RECONGUARD ENTERPRISE CO., LTD.
                                </h1>
                                <p className="text-xs text-slate-600 dark:text-slate-400 print:text-gray-600">
                                    Multi-Channel Automated Payment Reconciliation & Fraud Detection Engine
                                </p>
                            </div>
                        </div>
                        <div className="mt-3 text-[11px] text-slate-600 dark:text-slate-400 print:text-gray-700 space-y-0.5">
                            <div>Corporate Financial Audit & Compliance Division</div>
                            <div>Yangon Financial Technology Tower, Strand Road, Yangon, Myanmar</div>
                        </div>
                    </div>

                    <div className="text-left sm:text-right text-xs space-y-1">
                        <div className="font-mono text-purple-600 dark:text-purple-400 print:text-purple-700 font-bold text-sm">
                            {summary.report_ref}
                        </div>
                        <div className="text-slate-600 dark:text-slate-400 print:text-gray-600">
                            Audit Period: <strong className="text-slate-900 dark:text-slate-200 print:text-black">{summary.audit_period || scopeSummary || 'This Month'}</strong>
                        </div>
                        <div className="text-slate-600 dark:text-slate-400 print:text-gray-600">
                            Generated: <strong className="text-slate-900 dark:text-slate-200 print:text-black">{summary.generation_timestamp}</strong>
                        </div>
                        <div className="text-slate-600 dark:text-slate-400 print:text-gray-600">
                            Lead Auditor: <strong className="text-slate-900 dark:text-slate-200 print:text-black">{summary.auditor_name}</strong>
                        </div>
                        <div className="text-slate-600 dark:text-slate-400 print:text-gray-600">
                            Classification: <strong className="text-emerald-600 dark:text-emerald-400 print:text-emerald-700 uppercase font-bold">Official Audit Certificate</strong>
                        </div>
                    </div>
                </div>

                {/* Executive Summary Cards / Table */}
                <div className="my-8">
                    <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-400 print:text-gray-600 mb-3">
                        Executive Reconciliation Audit Summary
                    </h2>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 border border-slate-200 dark:border-slate-800 print:border-gray-300 rounded-2xl p-4 bg-slate-50 dark:bg-slate-900/60 print:bg-gray-50">
                        <div>
                            <div className="text-[11px] text-slate-600 dark:text-slate-400 print:text-gray-600 uppercase font-semibold">Total Audited Transactions</div>
                            <div className="text-xl font-black text-slate-900 dark:text-white print:text-black mt-1 font-mono">{summary.total_records}</div>
                        </div>
                        <div>
                            <div className="text-[11px] text-slate-600 dark:text-slate-400 print:text-gray-600 uppercase font-semibold">Verified Settled Volume</div>
                            <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 print:text-emerald-700 mt-1 font-mono">{summary.formatted_matched_volume} <span className="text-xs font-normal text-slate-500 print:text-gray-600">MMK</span></div>
                        </div>
                        <div>
                            <div className="text-[11px] text-slate-600 dark:text-slate-400 print:text-gray-600 uppercase font-semibold">Channel Commission / Fees</div>
                            <div className="text-xl font-black text-amber-600 dark:text-amber-400 print:text-amber-700 mt-1 font-mono">{summary.formatted_variance_fees} <span className="text-xs font-normal text-slate-500 print:text-gray-600">MMK</span></div>
                        </div>
                        <div>
                            <div className="text-[11px] text-slate-600 dark:text-slate-400 print:text-gray-600 uppercase font-semibold">Intercepted Fraud Prevented</div>
                            <div className="text-xl font-black text-red-600 dark:text-red-400 print:text-red-700 mt-1 font-mono">{summary.formatted_fraud_prevented} <span className="text-xs font-normal text-slate-500 print:text-gray-600">MMK</span></div>
                        </div>
                    </div>
                </div>

                {/* Itemized Audit Trail Table */}
                <div className="my-8">
                    <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-400 print:text-gray-600 mb-3">
                        Itemized 3-Way Reconciliation Audit Trail ({records.length} records)
                    </h2>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-[11px] border border-slate-200 dark:border-slate-800 print:border-gray-300">
                            <thead className="bg-slate-50 dark:bg-slate-900 print:bg-gray-100 text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800 print:border-gray-300 uppercase font-bold text-[10px]">
                                <tr>
                                    <th className="px-3 py-2.5">Invoice #</th>
                                    <th className="px-3 py-2.5">Customer</th>
                                    <th className="px-3 py-2.5">Channel</th>
                                    <th className="px-3 py-2.5">Bank Txn Ref</th>
                                    <th className="px-3 py-2.5 text-right">Slip Claimed</th>
                                    <th className="px-3 py-2.5 text-right">Bank Settled</th>
                                    <th className="px-3 py-2.5 text-right">Variance</th>
                                    <th className="px-3 py-2.5">Classification</th>
                                    <th className="px-3 py-2.5">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 print:divide-gray-200">
                                {records.length === 0 ? (
                                    <tr>
                                        <td colSpan={9} className="px-3 py-6 text-center text-slate-500">
                                            No audit records found matching criteria.
                                        </td>
                                    </tr>
                                ) : (
                                    records.map((r) => (
                                        <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/40 print:hover:bg-transparent transition">
                                            <td className="px-3 py-2 font-mono font-bold text-slate-900 dark:text-white print:text-black">
                                                {r.invoice?.invoice_number || 'N/A'}
                                            </td>
                                            <td className="px-3 py-2 text-slate-800 dark:text-slate-300 print:text-gray-800">
                                                {r.invoice?.customer_name || 'N/A'}
                                            </td>
                                            <td className="px-3 py-2 font-mono uppercase font-bold text-slate-600 dark:text-slate-400 print:text-gray-700">
                                                {r.payment_slip?.payment_channel || r.bank_transaction?.payment_channel || '—'}
                                            </td>
                                            <td className="px-3 py-2 break-all font-mono text-[10px] leading-tight min-w-[130px] text-slate-800 dark:text-slate-300 print:text-gray-800">
                                                {r.bank_transaction?.bank_transaction_id || r.payment_slip?.extracted_transaction_id || '—'}
                                            </td>
                                            <td className="px-3 py-2 text-right font-mono text-slate-800 dark:text-slate-200 print:text-black">
                                                {formatMmk(r.slip_amount)}
                                            </td>
                                            <td className="px-3 py-2 text-right font-mono text-slate-900 dark:text-slate-200 print:text-black font-semibold">
                                                {formatMmk(r.bank_amount)}
                                            </td>
                                            <td className="px-3 py-2 text-right font-mono">
                                                {parseFloat(String(r.variance_amount)) > 0 ? (
                                                    <span className="text-red-600 dark:text-red-400 print:text-red-700 font-bold">
                                                        +{formatMmk(r.variance_amount)}
                                                    </span>
                                                ) : (
                                                    <span className="text-slate-500 print:text-gray-400">0.00</span>
                                                )}
                                            </td>
                                            <td className="px-3 py-2 font-medium text-slate-800 dark:text-slate-300 print:text-gray-800">
                                                {r.match_type}
                                            </td>
                                            <td className="px-3 py-2 font-semibold">
                                                <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                                                    r.status === 'auto_approved' || r.status === 'approved_by_accountant'
                                                        ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-400 print:bg-emerald-100 print:text-emerald-800'
                                                        : r.status === 'rejected_fraud'
                                                        ? 'bg-red-100 dark:bg-red-950/80 text-red-800 dark:text-red-400 print:bg-red-100 print:text-red-800'
                                                        : 'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-400 print:bg-amber-100 print:text-amber-800'
                                                }`}>
                                                    {r.status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Audit Certificate Signatures & Seals */}
                <div className="mt-16 pt-8 border-t-2 border-slate-200 dark:border-slate-800 print:border-black grid grid-cols-1 sm:grid-cols-3 gap-8 text-center text-xs">
                    {/* Auditor Signature */}
                    <div className="space-y-3">
                        <div className="h-16 border-b border-dashed border-slate-300 dark:border-slate-700 print:border-gray-400 flex items-end justify-center pb-2">
                            <span className="font-serif italic text-purple-600 dark:text-purple-400 print:text-gray-800 text-sm">
                                {summary.auditor_name}
                            </span>
                        </div>
                        <div className="font-bold text-slate-900 dark:text-white print:text-black">{summary.auditor_name}</div>
                        <div className="text-[11px] text-slate-600 dark:text-slate-400 print:text-gray-600">Chief Financial Auditor</div>
                    </div>

                    {/* Corporate Seal Placeholder */}
                    <div className="flex flex-col items-center justify-center">
                        <div className="h-20 w-20 rounded-full border-2 border-dashed border-purple-500/60 print:border-gray-500 flex items-center justify-center text-[10px] font-bold text-purple-600 dark:text-purple-400 print:text-gray-700 uppercase tracking-widest text-center p-2">
                            Official Audit Seal
                        </div>
                        <div className="text-[10px] text-slate-600 dark:text-slate-400 print:text-gray-500 mt-2">ReconGuard Verification</div>
                    </div>

                    {/* CFO / Comptroller Signature */}
                    <div className="space-y-3">
                        <div className="h-16 border-b border-dashed border-slate-300 dark:border-slate-700 print:border-gray-400 flex items-end justify-center pb-2">
                            <span className="font-serif italic text-indigo-600 dark:text-indigo-400 print:text-gray-800 text-sm">
                                Daw Aye Aye Mar
                            </span>
                        </div>
                        <div className="font-bold text-slate-900 dark:text-white print:text-black">Daw Aye Aye Mar</div>
                        <div className="text-[11px] text-slate-600 dark:text-slate-400 print:text-gray-600">Chief Financial Officer / Comptroller</div>
                    </div>
                </div>

                {/* Disclaimer Footnote */}
                <div className="mt-12 text-center text-[10px] text-slate-600 dark:text-slate-400 print:text-gray-500 border-t border-slate-200 dark:border-slate-800 print:border-gray-200 pt-4">
                    This document is an automated electronic certification produced by ReconGuard Enterprise Engine. Any manual tampering, erasure, or unauthorized duplication invalidates this audit certificate.
                </div>
            </div>
        </div>
    );
}
