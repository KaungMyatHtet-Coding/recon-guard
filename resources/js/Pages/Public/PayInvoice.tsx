import React, { useState, useRef, useCallback } from 'react';
import { Head } from '@inertiajs/react';
import axios from 'axios';
import { useLanguage } from '@/Contexts/LanguageContext';
import LanguageSwitcher from '@/Components/LanguageSwitcher';
import ThemeToggle from '@/Components/ThemeToggle';

interface InvoiceData {
    id: number;
    invoice_number: string;
    customer_name_masked?: string | null;
    customer_phone_masked?: string | null;
    description: string;
    issued_at: string;
    total_amount: number;
    status: string;
}

interface PageProps {
    invoice: InvoiceData;
}

const CHANNELS = ['KBZPay', 'WavePay', 'CB Pay', 'AYA Pay'] as const;
type Channel = typeof CHANNELS[number];

const CHANNEL_DETAILS: Record<Channel, { account: string; name: string; color: string }> = {
    KBZPay: { account: '09-770001122', name: 'ReconGuard Merchant (KBZ)', color: '#0066CC' },
    WavePay: { account: '09-990001122', name: 'ReconGuard Corporate (Wave)', color: '#FF6600' },
    'CB Pay': { account: '09-880001122', name: 'ReconGuard CB Business', color: '#009933' },
    'AYA Pay': { account: '09-660001122', name: 'ReconGuard AYA Account', color: '#CC0000' },
};

export default function PayInvoice({ invoice }: PageProps) {
    const { language } = useLanguage();
    const isMm = language === 'mm';

    const [activeChannel, setActiveChannel] = useState<Channel>('KBZPay');
    const [dragOver, setDragOver] = useState(false);
    const [scanning, setScanning] = useState(false);
    const [scanResult, setScanResult] = useState<{
        transaction_id?: string;
        amount?: number;
        phone_number?: string;
        sender_name?: string;
        channel?: string;
        file_hash?: string;
    } | null>(null);
    const [scanError, setScanError] = useState<string | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [slipFile, setSlipFile] = useState<File | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);
    const fileRef = useRef<HTMLInputElement>(null);

    const isReconciled = invoice.status === 'reconciled';

    const handleFile = useCallback(
        async (file: File) => {
            setScanError(null);
            setScanResult(null);
            setSubmitError(null);
            setSlipFile(file);
            setPreviewUrl(URL.createObjectURL(file));
            setScanning(true);

            const formData = new FormData();
            formData.append('slip', file);

            try {
                const res = await axios.post(`/pay/${invoice.invoice_number}/scan`, formData, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                });
                setScanResult(res.data);
            } catch (err: any) {
                setScanError(
                    err.response?.data?.error ??
                    err.response?.data?.message ??
                    (isMm ? 'ပြေစာစစ်ဆေးမှု မအောင်မြင်ပါ။ ပိုမိုကြည်လင်သော ဓာတ်ပုံ တင်သွင်းပါ။' : 'Scan failed. Please try a clearer image.')
                );
                setSlipFile(null);
                setPreviewUrl(null);
            } finally {
                setScanning(false);
            }
        },
        [invoice.invoice_number, isMm],
    );

    const handleDrop = useCallback(
        (e: React.DragEvent) => {
            e.preventDefault();
            setDragOver(false);
            const file = e.dataTransfer.files[0];
            if (file) handleFile(file);
        },
        [handleFile],
    );

    const handleSubmit = async () => {
        if (!slipFile) return;
        setSubmitting(true);
        setSubmitError(null);

        const formData = new FormData();
        formData.append('slip', slipFile);
        formData.append('channel', activeChannel);

        try {
            await axios.post(`/pay/${invoice.invoice_number}/submit-slip`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            setSubmitted(true);
        } catch (err: any) {
            setSubmitError(
                err.response?.data?.error ??
                err.response?.data?.message ??
                (isMm ? 'ပေးပို့မှု မအောင်မြင်ပါ။ ပြန်လည်ကြိုးစားပါ။' : 'Submission failed. Please try again.')
            );
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <>
            <Head title={`${isMm ? 'ငွေပေးချေရန် ငွေတောင်းခံလွှာ' : 'Pay Invoice'} ${invoice.invoice_number}`} />
            <div className="min-h-screen bg-slate-50 dark:bg-[#0D1117] text-slate-900 dark:text-white transition-colors duration-200">
                {/* Header */}
                <header className="bg-white dark:bg-[#161B26] border-b border-slate-200 dark:border-slate-800 px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-[#705CF6] flex items-center justify-center shadow-sm">
                            <span className="text-white font-black text-sm">RG</span>
                        </div>
                        <div>
                            <div className="font-black text-slate-900 dark:text-white text-sm tracking-tight">ReconGuard</div>
                            <div className="text-[10px] text-slate-500 dark:text-slate-400 font-bold tracking-widest uppercase">
                                {isMm ? 'ဘဏ္ဍာရေး စာရင်းကိုက်စနစ်' : 'FinTech Reconciliation'}
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <LanguageSwitcher />
                        <ThemeToggle />
                        <span className="hidden sm:inline-block text-xs font-semibold px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                            🛡️ {isMm ? 'လုံခြုံစိတ်ချရသော ငွေပေးချေမှု ပေါ်တယ်' : 'Secure Payment Portal'}
                        </span>
                    </div>
                </header>

                <main className="max-w-2xl mx-auto px-4 py-8 space-y-6">
                    {/* Invoice Details Card */}
                    <div className="bg-white dark:bg-[#161B26] border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
                        <div className="flex items-start justify-between mb-4">
                            <div>
                                <div className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider mb-1">
                                    {isMm ? 'ငွေတောင်းခံလွှာ အမှတ်' : 'Commercial Invoice'}
                                </div>
                                <div className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                                    {invoice.invoice_number}
                                </div>
                            </div>
                            <span
                                className={`text-xs font-bold px-3 py-1.5 rounded-full ${
                                    isReconciled
                                        ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                                        : invoice.status === 'pending_verification'
                                        ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800'
                                        : 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800'
                                }`}
                            >
                                {isReconciled
                                    ? (isMm ? '✓ ငွေပေးချေမှု အတည်ပြုပြီးပါပြီ' : '✓ Paid & Verified')
                                    : invoice.status === 'pending_verification'
                                    ? (isMm ? '⏳ စစ်ဆေးဆဲ' : '⏳ PENDING VERIFICATION')
                                    : (isMm ? 'ပေးချေရန်ကျန်' : 'UNPAID')}
                            </span>
                        </div>
                        {/* PII Masked Customer Pill */}
                        {(invoice.customer_name_masked || invoice.customer_phone_masked) && (
                            <div className="mb-4 flex flex-wrap items-center gap-2 text-xs">
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 font-mono border border-slate-200 dark:border-slate-700/60">
                                    <span>👤</span>
                                    <span className="font-semibold">{invoice.customer_name_masked || 'Customer'}</span>
                                    {invoice.customer_phone_masked && (
                                        <span className="text-slate-500 dark:text-slate-400">({invoice.customer_phone_masked})</span>
                                    )}
                                </span>
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/50">
                                    🛡️ {isMm ? 'လုံခြုံရေးအရ အချက်အလက်ဖျောက်ထားသည်' : 'PII Masked for Privacy'}
                                </span>
                            </div>
                        )}
                        <div className="text-slate-700 dark:text-slate-300 text-sm mb-4 leading-relaxed">
                            {invoice.description}
                        </div>
                        <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
                            <div>
                                <div className="text-xs text-slate-500 dark:text-slate-400 mb-0.5">
                                    {isMm ? 'ထုတ်ပေးသည့် ရက်စွဲ' : 'Issued Date'}
                                </div>
                                <div className="text-sm font-bold text-slate-700 dark:text-slate-300 font-mono">
                                    {invoice.issued_at}
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="text-xs text-slate-500 dark:text-slate-400 mb-0.5">
                                    {isMm ? 'ပေးချေရန် စုစုပေါင်း ပမာဏ' : 'Total Amount Due'}
                                </div>
                                <div className="text-2xl font-black text-[#705CF6]">
                                    {Number(invoice.total_amount).toLocaleString()} MMK
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Already Reconciled Banner */}
                    {isReconciled && (
                        <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-3xl p-6 text-center space-y-2">
                            <div className="text-4xl">✅</div>
                            <div className="text-lg font-black text-emerald-800 dark:text-emerald-300">
                                {isMm ? 'ငွေပေးချေမှု ပြီးမြောက် အတည်ပြုပြီးပါပြီ' : 'Payment Completed & Verified'}
                            </div>
                            <div className="text-xs text-emerald-700 dark:text-emerald-400 max-w-md mx-auto leading-relaxed">
                                {isMm
                                    ? 'ဤငွေတောင်းခံလွှာအတွက် ငွေလွှဲပြေစာကို ဘဏ်စာရင်းနှင့် တိုက်စစ်ပြီး အတည်ပြုပြီးဖြစ်ပါသည်။ ထပ်မံပေးပို့ရန် မလိုတော့ပါ။'
                                    : 'This invoice has been fully reconciled against the official bank ledger. No further action is required.'}
                            </div>
                        </div>
                    )}

                    {/* Submitted Success Screen */}
                    {submitted && !isReconciled && (
                        <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-3xl p-6 text-center space-y-2">
                            <div className="text-4xl">📤</div>
                            <div className="text-lg font-black text-emerald-800 dark:text-emerald-300">
                                {isMm ? 'ငွေလွှဲပြေစာ ပေးပို့မှု အောင်မြင်ပါသည်' : 'Slip Submitted Successfully'}
                            </div>
                            <div className="text-xs text-emerald-700 dark:text-emerald-400 max-w-md mx-auto leading-relaxed">
                                {isMm
                                    ? 'ကျွန်ုပ်တို့၏ စာရင်းကိုင်အဖွဲ့မှ ငွေလွှဲပြေစာအား ဘဏ်စာရင်းနှင့် တိုက်စစ်စစ်ဆေးပြီး အတည်ပြုပေးပါမည်။'
                                    : 'Our finance team will verify your receipt against the bank ledger shortly. Thank you for your payment.'}
                            </div>
                        </div>
                    )}

                    {/* Payment Channel + Upload (only if not reconciled and not submitted) */}
                    {!isReconciled && !submitted && (
                        <>
                            {/* Payment Channel Tabs */}
                            <div className="bg-white dark:bg-[#161B26] border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                                        {isMm ? '၁။ ငွေပေးချေမည့် ဘဏ် / ဝေါလက် ရွေးချယ်ပါ' : '1. Select Payment Channel'}
                                    </h4>
                                    <span className="text-xs text-slate-500 dark:text-slate-400">
                                        {isMm ? 'တိုက်ရိုက်ပေးချေရန်' : 'Official Channels'}
                                    </span>
                                </div>

                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                    {CHANNELS.map((ch) => (
                                        <button
                                            key={ch}
                                            onClick={() => setActiveChannel(ch)}
                                            className={`text-xs font-bold py-2.5 px-3 rounded-2xl border transition-all flex flex-col items-center gap-1 ${
                                                activeChannel === ch
                                                    ? 'bg-[#705CF6] text-white border-[#705CF6] shadow-sm'
                                                    : 'bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-[#705CF6]'
                                            }`}
                                        >
                                            <span>💳 {ch}</span>
                                        </button>
                                    ))}
                                </div>

                                <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 flex flex-col sm:flex-row items-center gap-5">
                                    {/* QR placeholder */}
                                    <div className="w-32 h-32 shrink-0 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl flex flex-col items-center justify-center p-2 text-center shadow-xs">
                                        <div className="w-16 h-16 rounded-xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-xl mb-1">
                                            📱
                                        </div>
                                        <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300">
                                            {activeChannel} QR
                                        </span>
                                    </div>

                                    <div className="space-y-1.5 text-center sm:text-left flex-1">
                                        <div className="text-[11px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
                                            {isMm ? 'တရားဝင် လက်ခံအကောင့်နံပါတ်' : 'Official Settlement Account'}
                                        </div>
                                        <div className="text-xl font-black text-slate-900 dark:text-white font-mono">
                                            {CHANNEL_DETAILS[activeChannel].account}
                                        </div>
                                        <div className="text-xs font-semibold text-[#705CF6]">
                                            {CHANNEL_DETAILS[activeChannel].name}
                                        </div>
                                        <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed pt-1">
                                            {isMm
                                                ? `ကျေးဇူးပြု၍ အထက်ပါ ${activeChannel} သို့ တိကျသော ပမာဏ (${Number(invoice.total_amount).toLocaleString()} MMK) လွှဲပြောင်းပြီး ပြေစာအား အောက်တွင် တင်သွင်းပါ။`
                                                : `Please transfer the exact amount (${Number(invoice.total_amount).toLocaleString()} MMK) via ${activeChannel} and submit the receipt below.`}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Slip Upload + OCR Scan */}
                            <div className="bg-white dark:bg-[#161B26] border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                                        {isMm ? '၂။ ငွေလွှဲပြေစာ ပုံ တင်သွင်းပါ' : '2. Upload Payment Slip'}
                                    </h4>
                                    <span className="text-xs text-slate-500 dark:text-slate-400">
                                        {isMm ? 'OCR ဖြင့် အလိုအလျောက် စစ်ဆေးမည်' : 'Automated OCR Heuristic Check'}
                                    </span>
                                </div>

                                {/* Dropzone */}
                                <div
                                    onDragOver={(e) => {
                                        e.preventDefault();
                                        setDragOver(true);
                                    }}
                                    onDragLeave={() => setDragOver(false)}
                                    onDrop={handleDrop}
                                    onClick={() => fileRef.current?.click()}
                                    className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
                                        dragOver
                                            ? 'border-[#705CF6] bg-[#705CF6]/5'
                                            : 'border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 hover:border-[#705CF6]'
                                    }`}
                                >
                                    <input
                                        ref={fileRef}
                                        type="file"
                                        accept=".png,.jpg,.jpeg,.webp"
                                        className="hidden"
                                        onChange={(e) => {
                                            const f = e.target.files?.[0];
                                            if (f) handleFile(f);
                                        }}
                                    />
                                    {previewUrl ? (
                                        <div className="space-y-2">
                                            <img
                                                src={previewUrl}
                                                alt="slip preview"
                                                className="max-h-48 mx-auto rounded-xl object-contain shadow-sm border border-slate-200 dark:border-slate-700"
                                            />
                                            <p className="text-xs text-[#705CF6] font-semibold">
                                                {isMm ? 'အခြားပုံ ပြောင်းလဲရွေးချယ်ရန် နှိပ်ပါ' : 'Click to select a different image'}
                                            </p>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="text-4xl mb-2">📸</div>
                                            <div className="text-sm font-bold text-slate-800 dark:text-slate-200">
                                                {isMm
                                                    ? 'ငွေလွှဲပြေစာပုံကို ဤနေရာတွင် ထည့်ပါ သို့မဟုတ် ဖိုင်ရွေးချယ်ပါ'
                                                    : 'Drop your transaction receipt here or click to browse'}
                                            </div>
                                            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                                PNG, JPG, WEBP · {isMm ? 'အများဆုံး 5 MB' : 'Max 5 MB'}
                                            </div>
                                        </>
                                    )}
                                </div>

                                {/* Scanning State */}
                                {scanning && (
                                    <div className="p-4 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 rounded-2xl text-center">
                                        <div className="text-xs text-indigo-700 dark:text-indigo-400 font-bold animate-pulse flex items-center justify-center gap-2">
                                            <span>🔍</span>
                                            <span>{isMm ? 'ငွေလွှဲပြေစာအား OCR စနစ်ဖြင့် စစ်ဆေးနေပါသည်...' : 'Analyzing receipt heuristics and extracting transaction digits...'}</span>
                                        </div>
                                    </div>
                                )}

                                {/* Scan Error */}
                                {scanError && (
                                    <div className="p-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-2xl">
                                        <div className="text-xs text-red-700 dark:text-red-400 font-bold flex items-center gap-2">
                                            <span>⚠</span>
                                            <span>{scanError}</span>
                                        </div>
                                    </div>
                                )}

                                {/* OCR Result Preview */}
                                {scanResult && !scanError && (
                                    <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl space-y-3">
                                        <div className="text-xs font-black text-emerald-800 dark:text-emerald-300 uppercase tracking-wider flex items-center gap-1.5">
                                            <span>✓</span>
                                            <span>{isMm ? 'ပြေစာ အတည်ပြုချက် ရရှိပါသည် — ကျေးဇူးပြု၍ စစ်ဆေးပါ' : 'RECEIPT OCR VERIFIED — PLEASE CONFIRM'}</span>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-xs">
                                            <div className="p-2.5 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-emerald-200/60 dark:border-emerald-800/60">
                                                <div className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase">
                                                    {isMm ? 'ငွေလွှဲ အမှတ် (TxID)' : 'Transaction ID'}
                                                </div>
                                                <div className="font-mono font-bold text-slate-900 dark:text-white mt-0.5 truncate">
                                                    {scanResult.transaction_id || (isMm ? 'တွေ့ရှိ' : 'Detected')}
                                                </div>
                                            </div>

                                            <div className="p-2.5 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-emerald-200/60 dark:border-emerald-800/60">
                                                <div className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase">
                                                    {isMm ? 'ငွေလွှဲ ပမာဏ' : 'Detected Amount'}
                                                </div>
                                                <div className="font-mono font-black text-[#705CF6] mt-0.5">
                                                    {Number(scanResult.amount ?? invoice.total_amount).toLocaleString()} MMK
                                                </div>
                                            </div>

                                            <div className="p-2.5 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-emerald-200/60 dark:border-emerald-800/60">
                                                <div className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase">
                                                    {isMm ? 'လွှဲသူ အမည်' : 'Sender Name'}
                                                </div>
                                                <div className="font-semibold text-slate-900 dark:text-white mt-0.5 truncate">
                                                    {scanResult.sender_name || (isMm ? 'ပြေစာမှ စစ်ဆေးတွေ့ရှိ' : 'Detected in Receipt')}
                                                </div>
                                            </div>

                                            <div className="p-2.5 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-emerald-200/60 dark:border-emerald-800/60">
                                                <div className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase">
                                                    {isMm ? 'လွှဲသူ ဖုန်းနံပါတ်' : 'Sender Phone'}
                                                </div>
                                                <div className="font-mono font-semibold text-slate-900 dark:text-white mt-0.5">
                                                    {scanResult.phone_number || 'N/A'}
                                                </div>
                                            </div>

                                            <div className="sm:col-span-2 p-2.5 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-emerald-200/60 dark:border-emerald-800/60 flex items-center justify-between">
                                                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase">
                                                    {isMm ? 'ငွေပေးချေမှု လမ်းကြောင်း' : 'Detected Channel'}
                                                </span>
                                                <span className="font-bold text-emerald-600 dark:text-emerald-400 uppercase text-xs">
                                                    {scanResult.channel || activeChannel} ✓
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Submit Error */}
                                {submitError && (
                                    <div className="p-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-2xl">
                                        <div className="text-xs text-red-700 dark:text-red-400 font-bold flex items-center gap-2">
                                            <span>⚠</span>
                                            <span>{submitError}</span>
                                        </div>
                                    </div>
                                )}

                                {/* Submit Button */}
                                {scanResult && !scanError && (
                                    <button
                                        onClick={handleSubmit}
                                        disabled={submitting}
                                        className="w-full bg-[#705CF6] hover:bg-[#5a48e0] text-white font-bold py-3.5 rounded-2xl transition-all shadow-sm hover:shadow-md disabled:opacity-50 text-sm"
                                    >
                                        {submitting
                                            ? (isMm ? 'ပေးပို့နေပါသည်...' : 'Submitting to Finance Desk...')
                                            : (isMm ? 'ငွေလွှဲပြေစာ အတည်ပြုပေးပို့မည် →' : 'Confirm & Submit Payment Slip →')}
                                    </button>
                                )}
                            </div>
                        </>
                    )}
                </main>

                <footer className="text-center py-6 text-xs text-slate-400 dark:text-slate-600">
                    © 2026 ReconGuard FinTech Reconciliation · {isMm ? 'လုံခြုံစိတ်ချရသော ဘဏ္ဍာရေး စာရင်းကိုက်စနစ်' : 'Secure Payment Portal'}
                </footer>
            </div>
        </>
    );
}
