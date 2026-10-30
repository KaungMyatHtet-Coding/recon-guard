import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, useForm, usePage } from '@inertiajs/react';
import { ChangeEvent, FormEvent, useState } from 'react';
import axios from 'axios';
import { PageProps } from '@/types';

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

    // Active Channel for QR display and upload
    const [activeChannel, setActiveChannel] = useState<'kbzpay' | 'wavepay' | 'cbpay' | 'ayapay'>(
        (invoice.expected_channel !== 'any' && invoice.expected_channel in merchantAccounts)
            ? (invoice.expected_channel as any)
            : 'kbzpay'
    );

    // Selected image file state
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);

    // Live OCR Scanning Analysis state
    const [isScanning, setIsScanning] = useState<boolean>(false);
    const [ocrScanResult, setOcrScanResult] = useState<any>(null);

    // Image Modal Preview State
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
            alert('Please select a payment slip image first.');
            return;
        }

        postSubmit(route('invoices.submitSlip', invoice.id), {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => {
                setSelectedFile(null);
                setImagePreviewUrl(null);
                setOcrScanResult(null);
            },
        });
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'reconciled':
                return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-950 text-emerald-300 border border-emerald-700">Reconciled</span>;
            case 'pending_verification':
                return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-950 text-sky-300 border border-sky-700 animate-pulse">Pending Verification</span>;
            case 'fraud_flagged':
                return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-950 text-rose-300 border border-rose-700 animate-ping">Fraud Flagged</span>;
            case 'discrepancy':
                return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-950 text-amber-300 border border-amber-700">Discrepancy</span>;
            default:
                return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700">Unpaid</span>;
        }
    };

    const currentMerchant = merchantAccounts[activeChannel] || merchantAccounts['kbzpay'];

    return (
        <AuthenticatedLayout
            header={
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <Link
                            href={route('invoices.index')}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                            </svg>
                        </Link>
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="text-xl font-bold leading-tight text-white font-mono">
                                    {invoice.invoice_number}
                                </h2>
                                {getStatusBadge(invoice.status)}
                            </div>
                            <p className="text-xs text-slate-400 mt-0.5">
                                Issued for <span className="text-white font-medium">{invoice.customer_name}</span> · Amount: <span className="text-emerald-400 font-mono font-bold">{formatMMK(invoice.amount)}</span>
                            </p>
                        </div>
                    </div>

                    <div className="text-xs text-slate-400">
                        Due Date: <span className="text-slate-200">{invoice.due_date || 'Immediate'}</span>
                    </div>
                </div>
            }
        >
            <Head title={`Invoice ${invoice.invoice_number} - ReconGuard`} />

            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-8">
                {/* 2-Column Grid: Left: Payment Instructions & Submitted Slips | Right: Upload Slip & Live OCR Scanner */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Left Column (5 Cols) */}
                    <div className="lg:col-span-5 space-y-6">
                        {/* Multi-Channel Merchant Payment Guide */}
                        <div className="rounded-xl border border-slate-800 bg-slate-800/40 p-5 backdrop-blur">
                            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                                Step 1: Select Channel & Pay Invoice
                            </h3>

                            {/* Channel Tabs */}
                            <div className="grid grid-cols-4 gap-1.5 p-1 bg-slate-900 rounded-lg border border-slate-800 mb-4">
                                {(['kbzpay', 'wavepay', 'cbpay', 'ayapay'] as const).map((ch) => (
                                    <button
                                        key={ch}
                                        type="button"
                                        onClick={() => {
                                            setActiveChannel(ch);
                                            setSubmitData('payment_channel', ch);
                                        }}
                                        className={`py-1.5 text-xs font-semibold rounded uppercase tracking-wider transition ${
                                            activeChannel === ch
                                                ? 'bg-indigo-600 text-white shadow-md'
                                                : 'text-slate-400 hover:text-white'
                                        }`}
                                    >
                                        {ch === 'kbzpay' ? 'KPay' : ch === 'wavepay' ? 'Wave' : ch === 'cbpay' ? 'CB' : 'AYA'}
                                    </button>
                                ))}
                            </div>

                            {/* Merchant Details Box */}
                            <div className="p-4 rounded-lg bg-slate-900/80 border border-slate-800 space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-white uppercase">{currentMerchant.name}</span>
                                    <span className="text-[10px] px-2 py-0.5 rounded font-mono bg-indigo-950 text-indigo-300 border border-indigo-800">
                                        Verified Gateway
                                    </span>
                                </div>

                                <div className="text-xs space-y-1.5 text-slate-300">
                                    <div><span className="text-slate-500">Payee: </span><span className="font-semibold text-white">{currentMerchant.account_name}</span></div>
                                    <div><span className="text-slate-500">Account / Shop: </span><span className="font-mono text-indigo-300 font-semibold">{currentMerchant.account_number}</span></div>
                                    <div><span className="text-slate-500">Amount Due: </span><span className="font-mono font-bold text-emerald-400">{formatMMK(invoice.amount)}</span></div>
                                </div>

                                <div className="p-2.5 rounded bg-slate-800/60 border border-slate-700/60 text-[11px] text-slate-400">
                                    💡 {currentMerchant.guide}
                                </div>
                            </div>
                        </div>

                        {/* Submitted Payment Slips History */}
                        <div className="rounded-xl border border-slate-800 bg-slate-800/40 p-5 backdrop-blur space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                                    Submitted Slips ({submittedSlips.length})
                                </h3>
                                <span className="text-[11px] text-slate-500">Audit Records</span>
                            </div>

                            {submittedSlips.length === 0 ? (
                                <div className="text-center py-6 text-xs text-slate-500">
                                    No payment slips uploaded for this invoice yet.
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {submittedSlips.map((slip) => (
                                        <div
                                            key={slip.id}
                                            className="p-3.5 rounded-lg bg-slate-900/90 border border-slate-800 hover:border-slate-700 transition space-y-2"
                                        >
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs font-bold uppercase text-indigo-300">{slip.channel}</span>
                                                    <span className="text-[11px] font-mono text-slate-400">#{slip.transaction_id}</span>
                                                </div>
                                                <span className={`text-[10px] px-2 py-0.5 rounded font-semibold uppercase ${
                                                    slip.verification_status === 'matched' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                                                    : slip.verification_status === 'tampered_fraud' || slip.verification_status === 'duplicate_fraud'
                                                    ? 'bg-rose-950 text-rose-300 border border-rose-800'
                                                    : 'bg-sky-950 text-sky-300 border border-sky-800'
                                                }`}>
                                                    {slip.verification_status}
                                                </span>
                                            </div>

                                            <div className="flex items-center justify-between text-xs">
                                                <span className="text-slate-400">Claimed Amount:</span>
                                                <span className="font-mono font-semibold text-white">{formatMMK(slip.amount)}</span>
                                            </div>

                                            <div className="flex items-center justify-between text-xs">
                                                <span className="text-slate-400">Forensics:</span>
                                                {slip.exif_tamper_flag ? (
                                                    <span className="text-rose-400 font-semibold flex items-center gap-1">
                                                        ⚠️ Photoshop/Tampered Detected
                                                    </span>
                                                ) : (
                                                    <span className="text-emerald-400 font-medium">Clean Original</span>
                                                )}
                                            </div>

                                            <div className="pt-2 flex items-center justify-between border-t border-slate-800/80 text-[11px]">
                                                <span className="text-slate-500">{slip.created_at}</span>
                                                <button
                                                    type="button"
                                                    onClick={() => setModalImage(slip.image_url)}
                                                    className="text-indigo-400 hover:underline flex items-center gap-1"
                                                >
                                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                    </svg>
                                                    View Receipt Image
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right Column (7 Cols): Upload Payment Slip & Live OCR Forensics Scanner */}
                    <div className="lg:col-span-7 space-y-6">
                        <div className="rounded-xl border border-slate-800 bg-slate-800/40 p-6 backdrop-blur space-y-6">
                            <div>
                                <h3 className="text-base font-bold text-white flex items-center gap-2">
                                    <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                        </svg>
                                    </span>
                                    Step 2: Upload Payment Slip & Live OCR Forensics Scanner
                                </h3>
                                <p className="text-xs text-slate-400 mt-1">
                                    Drop your payment screenshot here. The automated OCR engine extracts receipt fields and inspects EXIF binary tampering signatures in real time.
                                </p>
                            </div>

                            <form onSubmit={handleSubmitSlip} className="space-y-6">
                                {/* Drag & Drop File Picker */}
                                <div className="border-2 border-dashed border-slate-700 hover:border-indigo-500 rounded-xl p-6 text-center bg-slate-900/50 transition cursor-pointer relative">
                                    <input
                                        type="file"
                                        accept="image/png,image/jpeg,image/webp"
                                        onChange={handleFileChange}
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                    />
                                    <div className="space-y-2">
                                        <div className="mx-auto w-12 h-12 rounded-full bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
                                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                            </svg>
                                        </div>
                                        <div className="text-sm font-semibold text-white">
                                            {selectedFile ? selectedFile.name : 'Click or drag & drop payment screenshot here'}
                                        </div>
                                        <div className="text-xs text-slate-400">
                                            Supports PNG, JPG, JPEG, WEBP (Max 5MB)
                                        </div>
                                    </div>
                                </div>

                                {/* Live OCR Scanner Feedback & Status */}
                                {isScanning && (
                                    <div className="p-4 rounded-lg bg-indigo-950/60 border border-indigo-700/60 flex items-center gap-3 animate-pulse">
                                        <svg className="animate-spin h-5 w-5 text-indigo-400" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                                        </svg>
                                        <div>
                                            <div className="text-xs font-bold text-white">Analyzing Slip Image & Running Forensics...</div>
                                            <div className="text-[11px] text-indigo-300">Extracting Transaction ID, amount, and inspecting EXIF metadata signatures</div>
                                        </div>
                                    </div>
                                )}

                                {/* Forensics & OCR Inspection Banner */}
                                {ocrScanResult && (
                                    <div className={`p-4 rounded-lg border space-y-3 ${
                                        ocrScanResult.exif_tamper_flag || ocrScanResult.fraud_checks?.transaction_reused
                                            ? 'bg-rose-950/70 border-rose-700/80 text-rose-200'
                                            : 'bg-emerald-950/70 border-emerald-700/80 text-emerald-200'
                                    }`}>
                                        <div className="flex items-center justify-between">
                                            <div className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                                                {ocrScanResult.exif_tamper_flag ? (
                                                    <>
                                                        <span className="h-2 w-2 rounded-full bg-rose-400 animate-ping"></span>
                                                        ⚠️ Fraud / Tamper Marker Identified!
                                                    </>
                                                ) : (
                                                    <>
                                                        <span className="h-2 w-2 rounded-full bg-emerald-400"></span>
                                                        ✓ Genuine Original Slip Verified
                                                    </>
                                                )}
                                            </div>
                                            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-black/40">
                                                OCR Confidence: {ocrScanResult.ocr_confidence}%
                                            </span>
                                        </div>

                                        {/* Forensics Warnings */}
                                        {ocrScanResult.forensic_warnings?.length > 0 && (
                                            <ul className="text-xs space-y-1 text-rose-300 list-disc list-inside">
                                                {ocrScanResult.forensic_warnings.map((w: string, i: number) => (
                                                    <li key={i}>{w}</li>
                                                ))}
                                            </ul>
                                        )}

                                        {ocrScanResult.fraud_checks?.reasons?.length > 0 && (
                                            <ul className="text-xs space-y-1 text-rose-300 list-disc list-inside">
                                                {ocrScanResult.fraud_checks.reasons.map((r: string, i: number) => (
                                                    <li key={i}>{r}</li>
                                                ))}
                                            </ul>
                                        )}
                                    </div>
                                )}

                                {/* Auto-populated Form Inputs */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-medium text-slate-300 mb-1">
                                            Extracted Transaction ID
                                        </label>
                                        <input
                                            type="text"
                                            value={submitData.extracted_transaction_id}
                                            onChange={(e) => setSubmitData('extracted_transaction_id', e.target.value)}
                                            required
                                            placeholder="010020261030994821"
                                            className="w-full rounded-lg bg-slate-900 border border-slate-700 font-mono text-sm text-white"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-medium text-slate-300 mb-1">
                                            Extracted Amount (MMK)
                                        </label>
                                        <input
                                            type="number"
                                            value={submitData.extracted_amount}
                                            onChange={(e) => setSubmitData('extracted_amount', e.target.value)}
                                            required
                                            className="w-full rounded-lg bg-slate-900 border border-slate-700 font-mono text-sm text-white"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-medium text-slate-300 mb-1">
                                            Sender Phone Number
                                        </label>
                                        <input
                                            type="text"
                                            value={submitData.sender_phone}
                                            onChange={(e) => setSubmitData('sender_phone', e.target.value)}
                                            placeholder="09960111222"
                                            className="w-full rounded-lg bg-slate-900 border border-slate-700 text-sm text-white"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-medium text-slate-300 mb-1">
                                            Payment Channel
                                        </label>
                                        <select
                                            value={submitData.payment_channel}
                                            onChange={(e) => setSubmitData('payment_channel', e.target.value as any)}
                                            className="w-full rounded-lg bg-slate-900 border border-slate-700 text-sm text-white"
                                        >
                                            <option value="kbzpay">KBZPay</option>
                                            <option value="wavepay">WavePay</option>
                                            <option value="cbpay">CB Pay</option>
                                            <option value="ayapay">AYA Pay</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="pt-3">
                                    <button
                                        type="submit"
                                        disabled={submitProcessing || !selectedFile}
                                        className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-sky-500 hover:opacity-95 font-bold text-sm text-white shadow-xl shadow-indigo-600/30 transition disabled:opacity-50 flex items-center justify-center gap-2"
                                    >
                                        {submitProcessing ? (
                                            <>
                                                <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                                                </svg>
                                                Submitting Slip to Reconciliation Queue...
                                            </>
                                        ) : (
                                            <>
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                                Confirm & Submit Payment Slip
                                            </>
                                        )}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </div>

            {/* Modal Image Zoom */}
            {modalImage && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm cursor-pointer"
                    onClick={() => setModalImage(null)}
                >
                    <div className="relative max-w-lg w-full bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden p-2">
                        <img
                            src={modalImage}
                            alt="Receipt Preview"
                            className="w-full h-auto max-h-[85vh] object-contain rounded-xl bg-white"
                        />
                        <div className="text-center py-2 text-xs text-slate-400">Click anywhere to close</div>
                    </div>
                </div>
            )}
        </AuthenticatedLayout>
    );
}
