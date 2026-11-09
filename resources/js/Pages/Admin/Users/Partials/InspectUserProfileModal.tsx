import React, { useEffect, useState } from 'react';
import axios from 'axios';

interface UserData {
    id: number;
    name: string;
    email: string;
    phone: string | null;
    nrc_number: string | null;
    address: string | null;
    emergency_contact: string | null;
    company_name: string | null;
    avatar_url: string | null;
    is_blacklisted: boolean;
    blacklist_reason: string | null;
    roles: string[];
    created_at: string;
}

interface Financials {
    total_invoiced_mmk: number;
    total_paid_mmk: number;
    invoices_count: number;
    slips_count: number;
    flagged_slips: number;
}

interface InvoiceItem {
    id: number;
    invoice_number: string;
    amount: number;
    status: string;
    created_at: string;
}

interface SlipItem {
    id: number;
    payment_channel: string;
    extracted_transaction_id: string | null;
    extracted_amount: number | null;
    verification_status: string;
    ocr_confidence: number;
    exif_tamper_flag: boolean;
    created_at: string;
}

interface AppealItem {
    id: number;
    subject: string;
    status: string;
    admin_response: string | null;
    created_at: string;
}

interface Props {
    userId: number | null;
    show: boolean;
    onClose: () => void;
}

export default function InspectUserProfileModal({ userId, show, onClose }: Props) {
    const [loading, setLoading] = useState(false);
    const [user, setUser] = useState<UserData | null>(null);
    const [financials, setFinancials] = useState<Financials | null>(null);
    const [invoices, setInvoices] = useState<InvoiceItem[]>([]);
    const [slips, setSlips] = useState<SlipItem[]>([]);
    const [appeals, setAppeals] = useState<AppealItem[]>([]);
    const [activeTab, setActiveTab] = useState<'kyc' | 'financials' | 'appeals'>('kyc');

    useEffect(() => {
        if (show && userId) {
            setLoading(true);
            axios.get(`/admin/users/${userId}`)
                .then((res) => {
                    setUser(res.data.user);
                    setFinancials(res.data.financials);
                    setInvoices(res.data.invoices || []);
                    setSlips(res.data.paymentSlips || []);
                    setAppeals(res.data.appeals || []);
                })
                .catch((err) => {
                    console.error('Failed to load user financial dossier:', err);
                })
                .finally(() => {
                    setLoading(false);
                });
        } else {
            setUser(null);
            setFinancials(null);
        }
    }, [show, userId]);

    if (!show) return null;

    const formatMmk = (amount: number) => {
        return Number(amount).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 }) + ' MMK';
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
            <div className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-3xl bg-white dark:bg-[#161B26] border border-slate-200 dark:border-slate-800 shadow-2xl animate-in fade-in zoom-in-95 duration-150 overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 p-5 shrink-0">
                    <div className="flex items-center gap-3">
                        {user?.avatar_url ? (
                            <img
                                src={user.avatar_url}
                                alt={user.name}
                                className="w-10 h-10 rounded-2xl object-cover border border-slate-200 dark:border-slate-700"
                            />
                        ) : (
                            <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center font-bold text-sm text-[#705CF6]">
                                {user ? user.name.slice(0, 2).toUpperCase() : '👤'}
                            </div>
                        )}
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                                    {user?.name || 'Loading Financial Dossier...'}
                                </h3>
                                {user?.is_blacklisted && (
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800">
                                        🚨 Blacklisted
                                    </span>
                                )}
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                {user?.email} · {user?.roles?.join(', ').toUpperCase() || 'USER'}
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-slate-400 hover:text-slate-600 dark:hover:text-white text-sm p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                    >
                        ✕
                    </button>
                </div>

                {/* Navigation Tabs */}
                <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 px-6 pt-3 shrink-0">
                    <button
                        type="button"
                        onClick={() => setActiveTab('kyc')}
                        className={`pb-2.5 text-xs font-bold transition border-b-2 ${
                            activeTab === 'kyc'
                                ? 'border-[#705CF6] text-[#705CF6]'
                                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                        }`}
                    >
                        🪪 Mandatory KYC & Profile
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab('financials')}
                        className={`pb-2.5 text-xs font-bold transition border-b-2 ${
                            activeTab === 'financials'
                                ? 'border-[#705CF6] text-[#705CF6]'
                                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                        }`}
                    >
                        💰 Financials & Slips ({invoices.length} Inv / {slips.length} Slips)
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab('appeals')}
                        className={`pb-2.5 text-xs font-bold transition border-b-2 ${
                            activeTab === 'appeals'
                                ? 'border-[#705CF6] text-[#705CF6]'
                                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                        }`}
                    >
                        ⚖️ Appeals & Disputes ({appeals.length})
                    </button>
                </div>

                {/* Body Content */}
                <div className="p-6 overflow-y-auto space-y-4 text-xs flex-1">
                    {loading ? (
                        <div className="py-12 text-center text-slate-400">
                            <div className="animate-spin text-2xl mb-2">⏳</div>
                            Loading financial profile and KYC metadata...
                        </div>
                    ) : user ? (
                        <>
                            {/* TAB 1: KYC & Identity Dossier */}
                            {activeTab === 'kyc' && (
                                <div className="space-y-4">
                                    {/* Blacklist banner if applicable */}
                                    {user.is_blacklisted && (
                                        <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 space-y-1">
                                            <div className="font-bold flex items-center gap-1.5">
                                                <span>🚨</span> Account Restricted by Compliance Desk
                                            </div>
                                            <p className="text-[11px] leading-relaxed">
                                                Reason: {user.blacklist_reason || 'Flagged for fraudulent activities or slip tampering.'}
                                            </p>
                                        </div>
                                    )}

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
                                            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase">
                                                National ID / NRC
                                            </span>
                                            <div className="font-mono font-bold text-slate-900 dark:text-white text-sm">
                                                {user.nrc_number || 'Not Registered'}
                                            </div>
                                        </div>

                                        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
                                            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase">
                                                Contact Phone Number
                                            </span>
                                            <div className="font-mono font-bold text-slate-900 dark:text-white text-sm">
                                                {user.phone || 'N/A'}
                                            </div>
                                        </div>

                                        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
                                            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase">
                                                Corporate / Company Entity
                                            </span>
                                            <div className="font-bold text-slate-900 dark:text-white text-sm">
                                                {user.company_name || 'Individual Merchant'}
                                            </div>
                                        </div>

                                        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
                                            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase">
                                                Emergency Contact
                                            </span>
                                            <div className="font-mono font-bold text-slate-900 dark:text-white text-sm">
                                                {user.emergency_contact || 'None Recorded'}
                                            </div>
                                        </div>
                                    </div>

                                    {/* KYC Document Verification Status */}
                                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
                                                KYC Document Verification Status
                                            </span>
                                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                                                {user.nrc_number ? '✓ Level 2 Verified' : 'Level 1 Basic'}
                                            </span>
                                        </div>
                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                                            <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-1">
                                                <div className="text-base">🪪</div>
                                                <div className="font-semibold text-slate-800 dark:text-slate-200 text-[11px]">NRC Front</div>
                                                <span className="inline-block px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400">
                                                    {user.nrc_number ? '✓ On File' : 'Pending'}
                                                </span>
                                            </div>
                                            <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-1">
                                                <div className="text-base">📄</div>
                                                <div className="font-semibold text-slate-800 dark:text-slate-200 text-[11px]">NRC Back</div>
                                                <span className="inline-block px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400">
                                                    {user.nrc_number ? '✓ On File' : 'Pending'}
                                                </span>
                                            </div>
                                            <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-1">
                                                <div className="text-base">🛂</div>
                                                <div className="font-semibold text-slate-800 dark:text-slate-200 text-[11px]">Passport</div>
                                                <span className="inline-block px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                                                    Optional
                                                </span>
                                            </div>
                                            <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-1">
                                                <div className="text-base">🤳</div>
                                                <div className="font-semibold text-slate-800 dark:text-slate-200 text-[11px]">Liveness Selfie</div>
                                                <span className="inline-block px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400">
                                                    ✓ Matched
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1">
                                        <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase">
                                            Registered Physical Address
                                        </span>
                                        <p className="text-slate-700 dark:text-slate-300 leading-relaxed font-sans">
                                            {user.address || 'No physical address registered in compliance profile.'}
                                        </p>
                                    </div>

                                    <div className="flex justify-between items-center text-xs text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
                                        <span>User ID: #{user.id}</span>
                                        <span>Joined: {user.created_at}</span>
                                    </div>
                                </div>
                            )}

                            {/* TAB 2: Financials & Slips */}
                            {activeTab === 'financials' && (
                                <div className="space-y-4">
                                    {/* Volume summary cards */}
                                    {financials && (
                                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                                                <div className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase">Total Billed</div>
                                                <div className="font-mono font-bold text-slate-900 dark:text-white mt-0.5">
                                                    {formatMmk(financials.total_invoiced_mmk)}
                                                </div>
                                            </div>
                                            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                                                <div className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase">Verified Payments</div>
                                                <div className="font-mono font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                                                    {formatMmk(financials.total_paid_mmk)}
                                                </div>
                                            </div>
                                            <div className="col-span-2 sm:col-span-1 p-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                                                <div className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase">Fraud Interceptions</div>
                                                <div className="font-mono font-bold text-rose-600 dark:text-rose-400 mt-0.5">
                                                    {financials.flagged_slips} Flagged
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Recent Slips */}
                                    <div className="space-y-2">
                                        <h4 className="font-bold text-slate-900 dark:text-white text-xs">
                                            Recent Payment Slips & OCR Extractions
                                        </h4>
                                        {slips.length === 0 ? (
                                            <p className="text-slate-500 text-xs italic p-3 rounded-xl bg-slate-50 dark:bg-slate-900">
                                                No payment slips submitted by this user.
                                            </p>
                                        ) : (
                                            <div className="divide-y divide-slate-100 dark:divide-slate-800 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                                                {slips.map((s) => (
                                                    <div key={s.id} className="p-3 bg-white dark:bg-slate-900 flex items-center justify-between gap-3 text-xs">
                                                        <div>
                                                            <div className="flex items-center gap-2">
                                                                <span className="font-mono font-bold text-slate-900 dark:text-white">
                                                                    {s.extracted_transaction_id || `SLIP #${s.id}`}
                                                                </span>
                                                                <span className="font-bold uppercase text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[#705CF6]">
                                                                    {s.payment_channel}
                                                                </span>
                                                            </div>
                                                            <div className="text-[11px] text-slate-500 mt-0.5">
                                                                Submitted: {s.created_at} · OCR Score: {s.ocr_confidence}%
                                                            </div>
                                                        </div>
                                                        <div className="text-right">
                                                            <div className="font-mono font-bold text-[#705CF6]">
                                                                {s.extracted_amount ? Number(s.extracted_amount).toLocaleString() + ' MMK' : 'N/A'}
                                                            </div>
                                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                                                s.verification_status === 'matched' || s.verification_status === 'verified_clean'
                                                                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                                                                    : s.verification_status.includes('fraud')
                                                                    ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                                                                    : 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                                                            }`}>
                                                                {s.verification_status}
                                                            </span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* TAB 3: Appeals & Disputes */}
                            {activeTab === 'appeals' && (
                                <div className="space-y-3">
                                    <h4 className="font-bold text-slate-900 dark:text-white text-xs">
                                        Submitted Dispute & Compliance Appeals
                                    </h4>
                                    {appeals.length === 0 ? (
                                        <p className="text-slate-500 text-xs italic p-4 rounded-xl bg-slate-50 dark:bg-slate-900 text-center">
                                            No compliance appeals or dispute tickets logged for this account.
                                        </p>
                                    ) : (
                                        <div className="space-y-2">
                                            {appeals.map((a) => (
                                                <div key={a.id} className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1.5">
                                                    <div className="flex items-center justify-between">
                                                        <span className="font-bold text-slate-900 dark:text-white">
                                                            {a.subject}
                                                        </span>
                                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                                            a.status === 'resolved'
                                                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                                                                : 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                                                        }`}>
                                                            {a.status.toUpperCase()}
                                                        </span>
                                                    </div>
                                                    {a.admin_response && (
                                                        <p className="text-[11px] text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-800/60 p-2 rounded-xl border border-slate-200 dark:border-slate-700">
                                                            <strong>Auditor Response:</strong> {a.admin_response}
                                                        </p>
                                                    )}
                                                    <div className="text-[10px] text-slate-400">
                                                        Submitted: {a.created_at}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </>
                    ) : null}
                </div>

                {/* Footer */}
                <div className="border-t border-slate-100 dark:border-slate-800 p-4 flex justify-end shrink-0">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 transition"
                    >
                        Close Dossier
                    </button>
                </div>
            </div>
        </div>
    );
}
