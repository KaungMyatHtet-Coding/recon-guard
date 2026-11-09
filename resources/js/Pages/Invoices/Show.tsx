import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import ConfirmModal from '@/Components/ConfirmModal';
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import { ChangeEvent, FormEvent, useState } from 'react';
import axios from 'axios';
import { PageProps } from '@/types';
import RecommendBlacklistModal from '@/Components/RecommendBlacklistModal';

interface InvoiceData {
    id: number;
    invoice_number: string;
    customer_name: string;
    customer_phone: string | null;
    description: string | null;
    amount: number;
    expected_channel: string;
    status: string;
    due_date: string | null;
    created_at: string;
}

interface SubmittedSlip {
    id: number;
    channel: string;
    image_url: string;
    image_hash: string;
    transaction_id: string;
    amount: number;
    datetime: string | null;
    sender_phone: string | null;
    sender_name: string | null;
    ocr_confidence: number;
    exif_tamper_flag: boolean;
    exif_metadata: any;
    verification_status: string;
    created_at: string;
}

interface MerchantAccountInfo {
    name: string;
    account_name: string;
    account_number: string;
    color: string;
    guide: string;
}

interface InvoiceShowProps {
    invoice: InvoiceData;
    merchantAccounts: Record<string, MerchantAccountInfo>;
    submittedSlips: SubmittedSlip[];
}

export default function InvoiceShow({
    invoice,
    merchantAccounts,
    submittedSlips,
}: InvoiceShowProps) {
    const { auth } = usePage<PageProps>().props;
    const isStaff = auth?.user?.roles?.some((r: string) => ['admin', 'accountant'].includes(r));
    const [isSettlingCash, setIsSettlingCash] = useState(false);
    const [flagModalOpen, setFlagModalOpen] = useState(false);

    // Active Channel for QR display and manual upload
    const [activeChannel, setActiveChannel] = useState<'kbzpay' | 'wavepay' | 'cbpay' | 'ayapay'>(
        (invoice.expected_channel !== 'any' && invoice.expected_channel in merchantAccounts)
            ? (invoice.expected_channel as any)
            : 'kbzpay'
    );

    // Copy payment link state
    const [paymentLinkCopied, setPaymentLinkCopied] = useState(false);

    const publicPaymentUrl = typeof window !== 'undefined'
        ? `${window.location.origin}/pay/${invoice.invoice_number}`
        : `/pay/${invoice.invoice_number}`;

    const handleCopyPaymentLink = () => {
        navigator.clipboard.writeText(publicPaymentUrl).then(() => {
            setPaymentLinkCopied(true);
            setTimeout(() => setPaymentLinkCopied(false), 2000);
        });
    };

    const [showCashConfirm, setShowCashConfirm] = useState(false);
    const [uploadError, setUploadError] = useState<string | null>(null);

    const handleSettleCash = () => {
        setShowCashConfirm(true);
    };

    const confirmSettleCash = () => {
        setIsSettlingCash(true);
        router.post(route('invoices.settleCash', invoice.id), {}, {
            preserveScroll: true,
            onFinish: () => {
                setIsSettlingCash(false);
                setShowCashConfirm(false);
            },
        });
    };

    // Toggle override dropzone when slips already exist
    const [showOverrideUploader, setShowOverrideUploader] = useState(false);

    // Selected image file state for manual upload
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);

    // Live OCR Scanning Analysis state
    const [isScanning, setIsScanning] = useState<boolean>(false);
    const [ocrScanResult, setOcrScanResult] = useState<any>(null);

    // Image Modal Lightbox Zoom State
    const [modalImage, setModalImage] = useState<string | null>(null);

    // Final Submission Form
    const { data: submitData, setData: setSubmitData, post: postSubmit, processing: submitProcessing } = useForm({
        slip_file: null as File | null,
        payment_channel: activeChannel,
        extracted_transaction_id: '',
        extracted_amount: invoice.amount.toString(),
        sender_phone: invoice.customer_phone || '',
        sender_name: invoice.customer_name || '',
        ocr_confidence: 95,
        exif_tamper_flag: false,
    });

    const formatMMK = (amount: number) => {
        return new Intl.NumberFormat('my-MM', {
            style: 'decimal',
            minimumFractionDigits: 0,
            maximumFractionDigits: 2,
        }).format(amount) + ' MMK';
    };

    // When file selected, trigger instant live OCR & Forensics Scanner API
    const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;
        const file = e.target.files[0];
        setSelectedFile(file);
        setImagePreviewUrl(URL.createObjectURL(file));

        setSubmitData((prev) => ({
            ...prev,
            slip_file: file,
            payment_channel: activeChannel,
        }));

        // Trigger Live OCR & Forensics Pre-Scan
        setIsScanning(true);
        const formData = new FormData();
        formData.append('slip_file', file);
        formData.append('channel', activeChannel);

        try {
            const resp = await axios.post(route('invoices.analyzeSlip', invoice.id), formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            if (resp.data.success) {
                const a = resp.data.analysis;
                setOcrScanResult(a);

                // Auto-fill form fields from OCR
                setSubmitData((prev) => ({
                    ...prev,
                    payment_channel: a.channel || activeChannel,
                    extracted_transaction_id: a.transaction_id || '',
                    extracted_amount: a.amount?.toString() || invoice.amount.toString(),
                    sender_phone: a.sender_phone || prev.sender_phone,
                    sender_name: a.sender_name || prev.sender_name,
                    ocr_confidence: a.ocr_confidence || 95,
                    exif_tamper_flag: a.exif_tamper_flag || false,
                }));

                if (a.channel && a.channel in merchantAccounts) {
                    setActiveChannel(a.channel);
                }
            }
        } catch (err: any) {
            console.error('Scan error:', err);
        } finally {
            setIsScanning(false);
        }
    };

    const handleSubmitSlip = (e: FormEvent) => {
        e.preventDefault();
        if (!selectedFile) {
            setUploadError('Please select a payment slip image first.');
            return;
        }
        setUploadError(null);

        postSubmit(route('invoices.submitSlip', invoice.id), {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => {
                setSelectedFile(null);
                setImagePreviewUrl(null);
                setOcrScanResult(null);
                setShowOverrideUploader(false);
                setUploadError(null);
            },
        });
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'reconciled':
                return (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
                        ✓ Reconciled
                    </span>
                );
            case 'pending_verification':
                return (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 border border-sky-300 dark:border-sky-700 animate-pulse">
                        ⏳ Pending Verification
                    </span>
                );
            case 'fraud_flagged':
                return (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-700">
                        ⚠️ Fraud Flagged
                    </span>
                );
            case 'discrepancy':
                return (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-700">
                        ⚠ Discrepancy
                    </span>
                );
            default:
                return (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700">
                        Unpaid
                    </span>
                );
        }
    };

    const currentMerchant = merchantAccounts[activeChannel] || merchantAccounts['kbzpay'];
    const hasSubmittedSlips = submittedSlips && submittedSlips.length > 0;
    const latestSlip = hasSubmittedSlips ? submittedSlips[0] : null;

    return (
        <AuthenticatedLayout
            header={
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <Link
                            href={route('invoices.index')}
                            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                            </svg>
                        </Link>
                        <div>
                            <div className="flex items-center gap-2 flex-wrap">
                                <h2 className="text-xl font-bold leading-tight text-slate-900 dark:text-white font-mono">
                                    {invoice.invoice_number}
                                </h2>
                                {getStatusBadge(invoice.status)}
                                <button
                                    type="button"
                                    onClick={handleCopyPaymentLink}
                                    className="inline-flex items-center px-2.5 py-1 rounded-xl text-xs font-semibold bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 transition shadow-xs"
                                    title="Copy guest payment link"
                                >
                                    {paymentLinkCopied ? '✓ Copied!' : '📋 Copy Payment Link'}
                                </button>
                                {isStaff && (
                                    <button
                                        type="button"
                                        onClick={() => setFlagModalOpen(true)}
                                        className="inline-flex items-center px-2.5 py-1 rounded-xl text-xs font-semibold bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/60 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 transition shadow-xs"
                                        title="Flag this customer or submission for Chief Auditor Blacklist review"
                                    >
                                        <span>🚩 Flag for Blacklist</span>
                                    </button>
                                )}
                            </div>
                            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                                Client: <span className="text-slate-900 dark:text-white font-semibold">{invoice.customer_name}</span>
                                {invoice.customer_phone && <span className="font-mono text-slate-500"> ({invoice.customer_phone})</span>}
                                {' · '}Amount Due: <span className="text-[#705CF6] font-mono font-bold">{formatMMK(invoice.amount)}</span>
                            </p>
                        </div>
                    </div>

                    <div className="text-xs text-slate-600 dark:text-slate-400">
                        Due Date: <span className="text-slate-900 dark:text-slate-200 font-semibold">{invoice.due_date || 'Immediate'}</span>
                    </div>
                </div>
            }
        >
            <Head title={`Invoice ${invoice.invoice_number} - ReconGuard`} />

            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-6">
                {/* 2-Column Responsive Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

                    {/* Left Column (5 Cols): Invoice Summary & Settlement Channel Accounts */}
                    <div className="lg:col-span-5 space-y-6">
                        {/* Commercial Invoice Details Card */}
                        <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#161B26] p-6 shadow-sm space-y-4">
                            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                                <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                    Invoice Details
                                </h3>
                                <span className="text-xs font-mono text-slate-400">ID #{invoice.id}</span>
                            </div>

                            <div className="space-y-2 text-xs">
                                <div className="flex justify-between py-1 border-b border-slate-50 dark:border-slate-800/60">
                                    <span className="text-slate-500 dark:text-slate-400">Customer Name:</span>
                                    <span className="font-semibold text-slate-900 dark:text-white">{invoice.customer_name}</span>
                                </div>
                                <div className="flex justify-between py-1 border-b border-slate-50 dark:border-slate-800/60">
                                    <span className="text-slate-500 dark:text-slate-400">Contact Phone:</span>
                                    <span className="font-mono font-semibold text-slate-900 dark:text-white">{invoice.customer_phone || 'None'}</span>
                                </div>
                                <div className="flex justify-between py-1 border-b border-slate-50 dark:border-slate-800/60">
                                    <span className="text-slate-500 dark:text-slate-400">Expected Gateway:</span>
                                    <span className="font-semibold uppercase text-[#705CF6]">{invoice.expected_channel}</span>
                                </div>
                                <div className="flex justify-between py-1 border-b border-slate-50 dark:border-slate-800/60">
                                    <span className="text-slate-500 dark:text-slate-400">Total Billed:</span>
                                    <span className="font-mono font-bold text-base text-slate-900 dark:text-white">{formatMMK(invoice.amount)}</span>
                                </div>
                                {invoice.description && (
                                    <div className="pt-2">
                                        <span className="text-slate-500 dark:text-slate-400 block mb-1">Description:</span>
                                        <p className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 leading-relaxed">
                                            {invoice.description}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Multi-Channel Merchant Gateway Info */}
                        <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#161B26] p-6 shadow-sm space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                    Settlement Account Channels
                                </h3>
                                <span className="text-[10px] px-2 py-0.5 rounded-md font-mono bg-purple-50 dark:bg-purple-950 text-[#705CF6] dark:text-purple-300 font-semibold">
                                    Verified QR
                                </span>
                            </div>

                            {/* Channel Switcher */}
                            <div className="grid grid-cols-4 gap-1.5 p-1 bg-slate-100 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
                                {(['kbzpay', 'wavepay', 'cbpay', 'ayapay'] as const).map((ch) => (
                                    <button
                                        key={ch}
                                        type="button"
                                        onClick={() => {
                                            setActiveChannel(ch);
                                            setSubmitData('payment_channel', ch);
                                        }}
                                        className={`py-1.5 text-xs font-semibold rounded-xl uppercase tracking-wider transition ${
                                            activeChannel === ch
                                                ? 'bg-[#705CF6] text-white shadow-xs'
                                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                                        }`}
                                    >
                                        {ch === 'kbzpay' ? 'KPay' : ch === 'wavepay' ? 'Wave' : ch === 'cbpay' ? 'CB' : 'AYA'}
                                    </button>
                                ))}
                            </div>

                            {/* Active Gateway Box */}
                            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-slate-900 dark:text-white uppercase">{currentMerchant.name}</span>
                                    <span className="text-xs font-bold text-[#705CF6]">Active</span>
                                </div>

                                <div className="text-xs space-y-1.5 text-slate-700 dark:text-slate-300">
                                    <div><span className="text-slate-500 dark:text-slate-400">Payee: </span><span className="font-semibold text-slate-900 dark:text-white">{currentMerchant.account_name}</span></div>
                                    <div><span className="text-slate-500 dark:text-slate-400">Account: </span><span className="font-mono text-[#705CF6] font-semibold">{currentMerchant.account_number}</span></div>
                                </div>

                                <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 text-[11px] text-slate-600 dark:text-slate-400">
                                    💡 {currentMerchant.guide}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Column (7 Cols): Primary Dossier OR Awaiting Payment View */}
                    <div className="lg:col-span-7 space-y-6">

                        {/* CASE A: Invoice already has a submitted slip -> Display Forensics Dossier */}
                        {hasSubmittedSlips && latestSlip ? (
                            <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#161B26] p-6 shadow-sm space-y-6">
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
                                    <div>
                                        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 dark:bg-indigo-950 text-[#705CF6] dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 mb-1">
                                            <span>🧾</span> Submitted Customer Receipt &amp; Forensics Dossier
                                        </div>
                                        <h3 className="text-base font-bold text-slate-900 dark:text-white">
                                            Evidence File: #{latestSlip.transaction_id || `SLIP-${latestSlip.id}`}
                                        </h3>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                            Submitted {latestSlip.created_at} via {latestSlip.channel.toUpperCase()} Gateway
                                        </p>
                                    </div>

                                    {/* Action to toggle re-upload override */}
                                    <button
                                        type="button"
                                        onClick={() => setShowOverrideUploader(!showOverrideUploader)}
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 transition"
                                    >
                                        <span>🔄</span>
                                        <span>{showOverrideUploader ? 'Close Override Form' : 'Replace / Re-upload Slip'}</span>
                                    </button>
                                </div>

                                {/* Primary Receipt Preview & Full Click-to-Zoom Lightbox */}
                                <div className="grid grid-cols-1 sm:grid-cols-12 gap-6 items-start">
                                    {/* Slip Image Card */}
                                    <div className="sm:col-span-5 relative group cursor-pointer" onClick={() => setModalImage(latestSlip.image_url)}>
                                        <div className="rounded-2xl border-2 border-slate-200 dark:border-slate-700 overflow-hidden bg-slate-50 dark:bg-slate-900 relative shadow-md">
                                            <img
                                                src={latestSlip.image_url}
                                                alt="Customer Submitted Receipt"
                                                className="w-full h-64 object-contain transition group-hover:scale-105 duration-200"
                                            />
                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white text-xs font-semibold gap-1.5 backdrop-blur-xs">
                                                <span>🔍 Click to Zoom</span>
                                            </div>
                                        </div>
                                        <p className="text-[11px] text-center text-slate-500 dark:text-slate-400 mt-2 font-mono truncate" title={latestSlip.image_hash}>
                                            SHA-256: {latestSlip.image_hash ? latestSlip.image_hash.substring(0, 16) + '...' : 'Verified'}
                                        </p>
                                    </div>

                                    {/* OCR Extracted Metadata Cards */}
                                    <div className="sm:col-span-7 space-y-3">
                                        {/* Forensics Verdict Banner */}
                                        <div className={`p-4 rounded-2xl border ${
                                            latestSlip.exif_tamper_flag || latestSlip.verification_status === 'tampered_fraud' || latestSlip.verification_status === 'duplicate_fraud'
                                                ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200'
                                                : latestSlip.verification_status === 'matched'
                                                ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
                                                : 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800 text-indigo-800 dark:text-indigo-200'
                                        }`}>
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                                                    {latestSlip.exif_tamper_flag ? (
                                                        <>⚠️ Altered / Tampered Signature Detected</>
                                                    ) : latestSlip.verification_status === 'matched' ? (
                                                        <>✓ Genuine Verified Slip</>
                                                    ) : (
                                                        <>🛡️ Forensics Inspected</>
                                                    )}
                                                </span>
                                                <span className="text-[11px] font-mono px-2 py-0.5 rounded-lg bg-white/80 dark:bg-black/40 font-bold">
                                                    Score: {latestSlip.ocr_confidence}%
                                                </span>
                                            </div>
                                            <p className="text-[11px] leading-relaxed">
                                                {latestSlip.exif_tamper_flag
                                                    ? 'Digital editing software or non-standard EXIF markers identified in file binary.'
                                                    : 'Receipt dimensions, pixel distribution, and channel heuristics match genuine banking app outputs.'}
                                            </p>
                                        </div>

                                        {/* Data Grid */}
                                        <div className="grid grid-cols-2 gap-2 text-xs">
                                            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                                                <div className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase">Detected TxID</div>
                                                <div className="font-mono font-bold text-slate-900 dark:text-white mt-0.5 truncate" title={latestSlip.transaction_id}>
                                                    {latestSlip.transaction_id || 'N/A'}
                                                </div>
                                            </div>

                                            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                                                <div className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase">Extracted Amount</div>
                                                <div className="font-mono font-bold text-[#705CF6] mt-0.5">
                                                    {formatMMK(latestSlip.amount)}
                                                </div>
                                            </div>

                                            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                                                <div className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase">Sender Phone</div>
                                                <div className="font-mono font-semibold text-slate-900 dark:text-white mt-0.5">
                                                    {latestSlip.sender_phone || 'N/A'}
                                                </div>
                                            </div>

                                            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                                                <div className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase">Channel Match</div>
                                                <div className="font-semibold uppercase text-emerald-600 dark:text-emerald-400 mt-0.5">
                                                    {latestSlip.channel} ✓
                                                </div>
                                            </div>
                                        </div>

                                        {/* Reconciliation Shortcut */}
                                        <div className="pt-2">
                                            <Link
                                                href={route('reconciliation.index')}
                                                className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-[#705CF6] hover:bg-[#5f4be3] text-white text-xs font-bold transition shadow-xs"
                                            >
                                                <span>Audit in 3-Way Reconciliation Workbench →</span>
                                            </Link>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            /* CASE B: No slips uploaded yet -> Awaiting Customer Payment */
                            <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#161B26] p-6 shadow-sm space-y-6">
                                <div className="text-center py-6 space-y-3">
                                    <div className="w-16 h-16 mx-auto rounded-3xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-3xl shadow-xs">
                                        ⏳
                                    </div>
                                    <div>
                                        <h3 className="text-base font-bold text-slate-900 dark:text-white">
                                            Awaiting Customer Payment via Guest Portal
                                        </h3>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mt-1 leading-relaxed">
                                            Share the secure public link with your client. They can review invoice items, pay via KBZPay/WavePay/CBP/AYA, and upload their transaction slip directly.
                                        </p>
                                    </div>

                                    {/* Copy Payment Link Box */}
                                    <div className="max-w-md mx-auto p-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
                                        <span className="text-xs font-mono text-slate-700 dark:text-slate-300 truncate">
                                            {publicPaymentUrl}
                                        </span>
                                        <button
                                            type="button"
                                            onClick={handleCopyPaymentLink}
                                            className="shrink-0 px-3 py-1.5 rounded-xl bg-[#705CF6] hover:bg-[#5f4be3] text-white text-xs font-bold transition shadow-xs"
                                        >
                                            {paymentLinkCopied ? '✓ Copied!' : '📋 Copy Link'}
                                        </button>
                                    </div>

                                    {isStaff && invoice.status !== 'reconciled' && (
                                        <div className="pt-2">
                                            <button
                                                type="button"
                                                disabled={isSettlingCash}
                                                onClick={handleSettleCash}
                                                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-xs disabled:opacity-50"
                                            >
                                                <span>💵</span>
                                                <span>{isSettlingCash ? 'Recording Cash...' : 'Record Direct Cash Settlement'}</span>
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Secondary Dropzone: Shown if NO slip uploaded yet, OR if accountant explicitly clicked "Replace/Re-upload" */}
                        {(!hasSubmittedSlips || showOverrideUploader) && (
                            <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#161B26] p-6 shadow-sm space-y-6">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                        <span className="p-1.5 rounded-xl bg-purple-500/10 text-[#705CF6]">
                                            📤
                                        </span>
                                        {hasSubmittedSlips ? 'Override / Re-upload Payment Slip' : 'Upload Slip on Behalf of Customer (Walk-in / Cash)'}
                                    </h3>
                                    {showOverrideUploader && (
                                        <button
                                            type="button"
                                            onClick={() => setShowOverrideUploader(false)}
                                            className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-white"
                                        >
                                            Cancel
                                        </button>
                                    )}
                                </div>

                                {isStaff && invoice.status !== 'reconciled' && (
                                    <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                        <div>
                                            <div className="text-xs font-bold text-emerald-800 dark:text-emerald-200 flex items-center gap-1.5">
                                                <span>💵</span> Direct Counter Cash Payment
                                            </div>
                                            <p className="text-[11px] text-emerald-700 dark:text-emerald-400 mt-0.5">
                                                Received physical MMK cash? Record instant settlement & reconcile ledger immediately.
                                            </p>
                                        </div>
                                        <button
                                            type="button"
                                            disabled={isSettlingCash}
                                            onClick={handleSettleCash}
                                            className="shrink-0 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-xs disabled:opacity-50 flex items-center gap-1.5"
                                        >
                                            <span>💵</span>
                                            <span>{isSettlingCash ? 'Recording...' : 'Record Direct Cash Settlement'}</span>
                                        </button>
                                    </div>
                                )}

                                <form onSubmit={handleSubmitSlip} className="space-y-4">
                                    {uploadError && (
                                        <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-xs text-rose-600 dark:text-rose-400 font-medium">
                                            ⚠️ {uploadError}
                                        </div>
                                    )}
                                    {/* File Picker */}
                                    <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-[#705CF6] rounded-2xl p-6 text-center bg-slate-50/60 dark:bg-slate-900/50 transition cursor-pointer relative">
                                        <input
                                            type="file"
                                            accept="image/png,image/jpeg,image/webp"
                                            onChange={handleFileChange}
                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                        />
                                        <div className="space-y-1.5">
                                            <div className="text-3xl">📸</div>
                                            <div className="text-xs font-semibold text-slate-900 dark:text-white">
                                                {selectedFile ? selectedFile.name : 'Click or drop payment screenshot here'}
                                            </div>
                                            <div className="text-[11px] text-slate-500 dark:text-slate-400">
                                                PNG, JPG, WEBP (Max 5MB)
                                            </div>
                                        </div>
                                    </div>

                                    {/* Live Scanning state */}
                                    {isScanning && (
                                        <div className="p-3 rounded-xl bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-700/60 flex items-center gap-2.5 animate-pulse text-xs text-[#705CF6]">
                                            <span>🔍 Analyzing slip heuristics & running OCR pre-scan...</span>
                                        </div>
                                    )}

                                    {/* Pre-scan feedback */}
                                    {ocrScanResult && (
                                        <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-200 space-y-1">
                                            <div className="font-bold flex items-center gap-1">
                                                <span>✓</span> OCR Extracted TxID: {ocrScanResult.transaction_id || 'Detected'}
                                            </div>
                                            <div className="text-[11px]">
                                                Detected Amount: {ocrScanResult.amount ? Number(ocrScanResult.amount).toLocaleString() + ' MMK' : 'Checking'}
                                            </div>
                                        </div>
                                    )}

                                    {/* Inputs */}
                                    <div className="grid grid-cols-2 gap-3 text-xs">
                                        <div>
                                            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                                Extracted Transaction ID
                                            </label>
                                            <input
                                                type="text"
                                                value={submitData.extracted_transaction_id}
                                                onChange={(e) => setSubmitData('extracted_transaction_id', e.target.value)}
                                                required
                                                placeholder="010020261030994821"
                                                className="w-full rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 font-mono text-xs text-slate-900 dark:text-white"
                                            />
                                        </div>
                                        <div>
                                            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                                Extracted Amount (MMK)
                                            </label>
                                            <input
                                                type="number"
                                                value={submitData.extracted_amount}
                                                onChange={(e) => setSubmitData('extracted_amount', e.target.value)}
                                                required
                                                className="w-full rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 font-mono text-xs text-slate-900 dark:text-white"
                                            />
                                        </div>
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={submitProcessing || !selectedFile}
                                        className="w-full py-2.5 px-4 rounded-xl bg-[#705CF6] hover:bg-[#5f4be3] font-bold text-xs text-white shadow-xs transition disabled:opacity-50"
                                    >
                                        {submitProcessing ? 'Submitting...' : 'Confirm & Save Payment Slip'}
                                    </button>
                                </form>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Modal Image Lightbox Zoom */}
            {modalImage && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-xs cursor-pointer"
                    onClick={() => setModalImage(null)}
                >
                    <div className="relative max-w-lg w-full bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden p-3 shadow-2xl">
                        <img
                            src={modalImage}
                            alt="Receipt Preview"
                            className="w-full h-auto max-h-[80vh] object-contain rounded-2xl bg-white"
                        />
                        <div className="text-center py-2 text-xs text-slate-400">
                            Click anywhere to close full preview
                        </div>
                    </div>
                </div>
            )}
            {/* Recommend Blacklist Modal */}
            <RecommendBlacklistModal
                show={flagModalOpen}
                onClose={() => setFlagModalOpen(false)}
                customerName={invoice.customer_name}
                customerPhone={latestSlip?.sender_phone || invoice.customer_phone || ''}
                targetUserId={(invoice as any).user_id || null}
                invoiceId={invoice.id}
                initialReason={
                    latestSlip
                        ? `Flagged from Invoice #${invoice.invoice_number} (Slip #${latestSlip.transaction_id || latestSlip.id}). Detected fraud or unverified submission.`
                        : `Flagged from Invoice #${invoice.invoice_number}.`
                }
            />

            {/* Direct Counter Cash Settlement ConfirmModal */}
            <ConfirmModal
                show={showCashConfirm}
                title="Confirm Direct Counter Cash Settlement?"
                variant="success"
                confirmText="Confirm Cash Payment"
                cancelText="Cancel"
                description={
                    <div className="space-y-2">
                        <p>
                            Confirm recording direct counter cash settlement of <strong className="font-mono text-emerald-600 dark:text-emerald-400">{formatMMK(invoice.amount)}</strong> for invoice <strong className="text-slate-900 dark:text-white">#{invoice.invoice_number}</strong>?
                        </p>
                        <p className="text-[11px] text-slate-500">
                            This will immediately record the counter cash payment and mark the invoice as fully reconciled.
                        </p>
                    </div>
                }
                loading={isSettlingCash}
                onClose={() => setShowCashConfirm(false)}
                onConfirm={confirmSettleCash}
            />
        </AuthenticatedLayout>
    );
}
