import LanguageSwitcher from '@/Components/LanguageSwitcher';
import PrivacyPolicyModal from '@/Components/PrivacyPolicyModal';
import ThemeToggle from '@/Components/ThemeToggle';
import { useLanguage } from '@/Contexts/LanguageContext';
import { PageProps } from '@/types';
import { Head, Link } from '@inertiajs/react';
import { useState } from 'react';

export default function Welcome({
    auth,
}: PageProps<{ laravelVersion?: string; phpVersion?: string }>) {
    const { t, language } = useLanguage();
    const isMm = language === 'mm';
    const [showPrivacyModal, setShowPrivacyModal] = useState(false);

    const bankingChannels = [
        {
            name: 'KBZPay Merchant',
            color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
            badge: 'KBZ QuickPay',
            icon: '🏦',
        },
        {
            name: 'WavePay Corporate',
            color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
            badge: 'Wave Money API',
            icon: '📱',
        },
        {
            name: 'CB Pay Business',
            color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
            badge: 'CB Bank CSV',
            icon: '💳',
        },
        {
            name: 'AYA Pay Enterprise',
            color: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20',
            badge: 'AYA Merchant',
            icon: '🏛️',
        },
        {
            name: 'Cash Settlement',
            color: 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20',
            badge: 'Direct Counter',
            icon: '💵',
        },
    ];

    const howItWorks = [
        {
            step: '01',
            title: isMm ? 'ငွေတောင်းခံလွှာနှင့် QR ထုတ်ပေးခြင်း' : 'Issue Invoice & Share Public Link',
            desc: isMm
                ? 'လုပ်ငန်းမှ ငွေတောင်းခံလွှာ အလိုအလျောက် ထုတ်ယူပြီး ဝယ်ယူသူထံသို့ လုံခြုံသော Public Link နှင့် QR Code ပေးပို့နိုင်ပါသည်။'
                : 'Generate dynamic invoices with customer QR codes and shareable zero-auth secure payment links.',
            icon: '📄',
        },
        {
            step: '02',
            title: isMm ? 'QR စကင်ဖတ်၍ ပြေစာပေးပို့ခြင်း' : 'Customer Scans QR & Uploads Receipt',
            desc: isMm
                ? 'ဝယ်ယူသူသည် KBZPay, WavePay စသည်တို့ဖြင့် ငွေလွှဲပြီး ပြေစာဓာတ်ပုံကို တင်သွင်းသည်နှင့် စက္ကန့်ပိုင်းအတွင်း OCR မှ စစ်ဆေးပေးပါသည်။'
                : 'Customer pays via preferred wallet, uploads slip; real-time client-side OCR verifies transaction details instantly.',
            icon: '📷',
        },
        {
            step: '03',
            title: isMm ? '၃-ဆင့် တိုက်ဆိုင်စစ်ဆေးပြီး စာရင်းပိတ်ခြင်း' : 'Automated 3-Way Triangulation & Settlement',
            desc: isMm
                ? 'ငွေတောင်းခံလွှာ၊ ပြေစာ OCR နှင့် တရားဝင်ဘဏ် CSV စာရင်း ၃ ခုလုံးကို တိုက်စစ်ပြီး ၁၀၀% ကိုက်ညီပါက စာရင်းအလိုအလျောက် ပိတ်ပေးပါသည်။'
                : 'Triangulates Invoice + Slip OCR + Multi-Bank CSV statements with zero discrepancy and Maker-Checker auditing.',
            icon: '⚡',
        },
    ];

    const securityPillars = [
        {
            icon: '🔐',
            title: isMm ? 'SHA-256 ပြေစာလက်ဗွေစနစ်' : 'Cryptographic SHA-256 Fingerprinting',
            desc: isMm
                ? 'တင်သွင်းလာသော ပြေစာတိုင်းကို Cryptographic Hash ဖြင့် လက်ဗွေရယူပြီး ပြေစာအဟောင်း ပြန်လည်အသုံးပြုခြင်းကို ၁၀၀% တားဆီးပါသည်။'
                : 'Zero-cost image hash locks detect duplicate recycled slips across independent customer sessions instantly.',
        },
        {
            icon: '🔍',
            title: isMm ? 'EXIF နှင့် ပုံရိပ်စစ်ဆေးရေး နည်းပညာ' : 'EXIF & Binary Metadata Forensics',
            desc: isMm
                ? 'Photoshop သို့မဟုတ် အခြားဆော့ဖ်ဝဲလ်များဖြင့် ပြင်ဆင်ထားသည့် ဓာတ်ပုံများ၊ ရက်စွဲအတုများကို EXIF စစ်ဆေးမှုဖြင့် ဖမ်းဆီးပါသည်။'
                : 'Inspects header signatures and software manipulation markers to intercept forged or edited payment screenshots.',
        },
        {
            icon: '⚖️',
            title: isMm ? 'Four-Eyes Maker-Checker အုပ်ချုပ်မှု' : 'Four-Eyes Maker-Checker Governance',
            desc: isMm
                ? 'ငွေစာရင်း ပယ်ဖျက်ခြင်းနှင့် အနီးစပ်ဆုံးကိုက်ညီမှု စိစစ်ခြင်းများကို Accountant နှင့် Chief Auditor နှစ်ဦးစလုံး၏ ခွင့်ပြုချက်ဖြင့်သာ ပြုလုပ်နိုင်ပါသည်။'
                : 'Critical ledger rollbacks and fuzzy approvals enforce strict dual authorization with PIN confirmation.',
        },
        {
            icon: '🛡️',
            title: isMm ? 'ကိုယ်ရေးအချက်အလက် ကာကွယ်မှု (PII Masking)' : 'End-to-End PII Masking & Rate Limiting',
            desc: isMm
                ? 'အများသုံး ငွေပေးချေမှု လင့်ခ်များတွင် ဝယ်ယူသူ၏ ဖုန်းနံပါတ်နှင့် အမည်များကို ဖျောက်ထားပြီး Rate-limit ဖြင့် DDoS ကာကွယ်ထားပါသည်။'
                : 'Sensitive phone numbers and personal names are masked on public links, with Layer-1 rate throttling against spam.',
        },
    ];

    const enterpriseCapabilities = [
        {
            icon: '⚡',
            title: isMm ? '၃-ဆင့် စာရင်းတိုက်ဆိုင်စစ်ဆေးမှု' : '3-Way Reconciliation Engine',
            desc: isMm
                ? 'ငွေတောင်းခံလွှာ၊ ပြေစာ OCR နှင့် ဘဏ် CSV စာရင်းများကို အလိုအလျောက် တိုက်ဆိုင်စစ်ဆေးပြီး အတည်ပြုပေးပါသည်။'
                : 'Cross-verifies Invoices, OCR Payment Slips, and Multi-Bank Statement CSVs with confidence scoring.',
        },
        {
            icon: '🚨',
            title: isMm ? 'အမည်ပျက်စာရင်းနှင့် လိမ်လည်မှုကာကွယ်ရေး' : 'Fraud & Blacklist Defense Hub',
            desc: isMm
                ? 'မှတ်ပုံတင်ထားသူများနှင့် Walk-In ဧည့်သည်များပါမကျန် စာရင်းလိမ်လည်မှု ဖြစ်ပွားပါက စနစ်အတွင်း ပိတ်ပင်တားဆီးနိုင်ပါသည်။'
                : 'Integrated 3-layer anti-fraud engine for both registered merchants and guest walk-ins with evidence dossier inspection.',
        },
        {
            icon: '🏦',
            title: isMm ? 'မြန်မာ့ဘဏ်စနစ် ၅ မျိုး ချိတ်ဆက်မှု' : 'Multi-Bank Adapter Strategy',
            desc: isMm
                ? 'KBZPay, WavePay, CB Pay, AYA Pay နှင့် Counter Cash ပုံစံများကို ပေါင်းစည်းစာရင်းတစ်ခုတည်းသို့ ပြောင်းလဲပါသည်။'
                : 'Ingests diverse CSV schemas from KBZPay, WavePay, CB Pay, and AYA Pay into a unified ledger with deduplication.',
        },
        {
            icon: '📊',
            title: isMm ? 'တရားဝင် PDF စာရင်းစစ် အစီရင်ခံစာ' : 'Printable PDF Audit Certificates',
            desc: isMm
                ? 'ပြက္ခဒိန်ရက်စွဲ စိစစ်ချက်၊ ချန်နယ်နှင့် အခြေအနေအလိုက် တရားဝင် စာရင်းစစ် အစီရင်ခံစာများကို PDF ထုတ်ယူနိုင်ပါသည်။'
                : 'Unified calendar scoping, audit filters, and secondary PIN authorization for verifiable financial compliance certificates.',
        },
    ];

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-[#0B0F19] text-slate-900 dark:text-slate-100 selection:bg-indigo-500 selection:text-white transition-colors duration-200 font-sans">
            <Head title="ReconGuard — Enterprise Multi-Channel Payment & Bank Reconciliation Engine" />

            {/* Top Navigation */}
            <header className="border-b border-slate-200 dark:border-slate-800/80 bg-white/95 dark:bg-[#0F1422]/95 backdrop-blur-md sticky top-0 z-40 transition-colors duration-200 shadow-xs">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        <div className="h-10 w-10 rounded-2xl bg-gradient-to-tr from-indigo-500 via-sky-500 to-emerald-400 p-0.5 shadow-lg shadow-indigo-500/20">
                            <div className="h-full w-full rounded-[14px] bg-white dark:bg-[#161B26] flex items-center justify-center font-black text-indigo-600 dark:text-indigo-400 text-sm tracking-tighter">
                                RG
                            </div>
                        </div>
                        <div>
                            <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-slate-900 via-slate-800 to-slate-600 dark:from-white dark:via-slate-100 dark:to-slate-400 bg-clip-text text-transparent">
                                Recon<span className="text-indigo-600 dark:text-indigo-400">Guard</span>
                            </span>
                            <span className="hidden sm:inline-block ml-2 text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 font-semibold">
                                Enterprise v2026.1
                            </span>
                        </div>
                    </div>

                    <div className="flex items-center space-x-2 sm:space-x-3">
                        <LanguageSwitcher />
                        <ThemeToggle />

                        {auth.user ? (
                            <Link
                                href={route('dashboard')}
                                className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-indigo-600/30 hover:bg-indigo-500 transition flex items-center gap-1.5"
                            >
                                <span>{isMm ? 'Dashboard သို့' : 'Dashboard'}</span>
                                <span>→</span>
                            </Link>
                        ) : (
                            <div className="flex items-center space-x-2">
                                <Link
                                    href={route('login')}
                                    className="rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800/80 px-3.5 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                                >
                                    {isMm ? 'အကောင့်ဝင်မည်' : 'Log In'}
                                </Link>
                                <Link
                                    href={route('register')}
                                    className="rounded-xl bg-indigo-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-md shadow-indigo-600/20 hover:bg-indigo-500 transition"
                                >
                                    {isMm ? 'အကောင့်ဖွင့်မည်' : 'Register'}
                                </Link>
                            </div>
                        )}
                    </div>
                </div>
            </header>

            {/* Hero Section */}
            <section className="relative overflow-hidden pt-12 pb-16 sm:pt-20 sm:pb-24">
                <div className="absolute inset-0 -z-10 flex items-center justify-center pointer-events-none">
                    <div className="h-[480px] w-[480px] rounded-full bg-indigo-500/10 dark:bg-indigo-500/15 blur-3xl"></div>
                    <div className="h-[360px] w-[360px] rounded-full bg-sky-500/10 dark:bg-sky-500/10 blur-3xl -ml-32"></div>
                </div>

                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center space-y-6">
                    {/* Top Tag Pill */}
                    <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200 dark:border-indigo-800/60 bg-indigo-50 dark:bg-indigo-950/40 px-4 py-1.5 text-xs font-semibold text-indigo-700 dark:text-indigo-300 shadow-xs">
                        <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                        <span>
                            {isMm
                                ? 'မြန်မာ့ဘဏ္ဍာရေး စနစ်များအတွက် အလိုအလျောက် စာရင်းတိုက်ဆိုင်စစ်ဆေးရေး အင်ဂျင်'
                                : 'Multi-Channel Payment & Bank Ledger Automated Reconciliation'}
                        </span>
                    </div>

                    {/* Headline with Myanmar Line-Height Protection */}
                    <h1
                        className={`text-3xl sm:text-5xl lg:text-6xl font-black text-slate-900 dark:text-white max-w-4xl mx-auto ${
                            isMm
                                ? 'leading-[1.65] md:leading-[1.6] py-1'
                                : 'tracking-tight leading-tight'
                        }`}
                    >
                        {isMm ? (
                            <>
                                ဘဏ်ငွေလွှဲပြေစာများနှင့် စာရင်းများကို{' '}
                                <span className="bg-gradient-to-r from-indigo-600 via-sky-500 to-emerald-500 bg-clip-text text-transparent">
                                    စက္ကန့်ပိုင်းအတွင်း
                                </span>{' '}
                                အလိုအလျောက် တိုက်ဆိုင်စစ်ဆေးပါ
                            </>
                        ) : (
                            <>
                                Automated 3-Way Reconciliation &amp;{' '}
                                <span className="bg-gradient-to-r from-indigo-500 via-sky-500 to-emerald-400 bg-clip-text text-transparent">
                                    Slip Fraud Defense
                                </span>{' '}
                                Platform
                            </>
                        )}
                    </h1>

                    <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed">
                        {isMm
                            ? 'KBZPay, WavePay, CB Pay, AYA Pay နှင့် Counter Cash ငွေလွှဲစာရင်းများကို တိုက်စစ်ပြီး SHA-256 နှင့် EXIF စစ်ဆေးမှုများဖြင့် ပြေစာအတုများကို ဖမ်းဆီးကာ Four-Eyes စာရင်းစစ်အုပ်ချုပ်မှုဖြင့် အချိန်ကုန်သက်သာစေပါသည်။'
                            : 'Cross-verifying Customer Invoices, OCR Payment Slips, and Multi-Bank Statement CSVs. Engineered with Zero-Cost OCR Heuristics, Levenshtein Fuzzy Matching, and Chief Auditor Governance.'}
                    </p>

                    {/* Professional CTA Buttons */}
                    <div className="flex flex-wrap items-center justify-center gap-3 pt-3">
                        {auth.user ? (
                            <Link
                                href={route('dashboard')}
                                className="rounded-2xl bg-indigo-600 px-7 py-3.5 text-sm font-bold text-white shadow-xl shadow-indigo-600/30 hover:bg-indigo-500 transition flex items-center gap-2"
                            >
                                <span>{isMm ? 'စာရင်းစစ် Dashboard သို့ ဝင်ရောက်မည်' : 'Enter Financial Dashboard'}</span>
                                <span>→</span>
                            </Link>
                        ) : (
                            <>
                                <Link
                                    href={route('login')}
                                    className="rounded-2xl bg-indigo-600 px-7 py-3.5 text-sm font-bold text-white shadow-xl shadow-indigo-600/30 hover:bg-indigo-500 transition flex items-center gap-2"
                                >
                                    <span>{isMm ? 'စာရင်းစစ်စနစ်သို့ ဝင်ရောက်မည်' : 'Access Financial Portal'}</span>
                                    <span>→</span>
                                </Link>
                                <Link
                                    href={route('register')}
                                    className="rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800/80 px-6 py-3.5 text-sm font-semibold text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition shadow-xs"
                                >
                                    {isMm ? 'အကောင့်အသစ် ဖွင့်မည်' : 'Create Merchant Account'}
                                </Link>
                            </>
                        )}
                    </div>
                </div>

                {/* 3-Way Triangulation Live Preview Mockup */}
                <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 mt-14">
                    <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white/80 dark:bg-[#161B26]/80 p-5 sm:p-7 shadow-2xl backdrop-blur-sm">
                        <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100 dark:border-slate-800/80">
                            <div className="flex items-center gap-2.5">
                                <span className="h-3 w-3 rounded-full bg-emerald-500 animate-ping"></span>
                                <span className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-white">
                                    {isMm ? 'အလိုအလျောက် ၃-ဆင့် တိုက်ဆိုင်စစ်ဆေးမှု သရုပ်ပြ' : '3-Way Triangulation Live Flow'}
                                </span>
                            </div>
                            <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-500/20">
                                ✓ 100% Exact Match
                            </span>
                        </div>

                        {/* Convergence Diagram */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {/* Card 1: Invoice */}
                            <div className="rounded-2xl p-4 bg-slate-50 dark:bg-[#1E2330] border border-slate-200 dark:border-slate-700/60 space-y-2">
                                <div className="flex items-center justify-between text-xs">
                                    <span className="font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                                        <span>📄</span> {isMm ? '၁။ ငွေတောင်းခံလွှာ' : '1. Commercial Invoice'}
                                    </span>
                                    <span className="font-mono text-[11px] text-slate-500">INV-2026-88412</span>
                                </div>
                                <div className="text-lg font-black text-slate-900 dark:text-white font-mono">
                                    150,000 MMK
                                </div>
                                <div className="text-[11px] text-slate-500 dark:text-slate-400 flex justify-between">
                                    <span>{isMm ? 'ဖောက်သည်:' : 'Client:'} Ko Kaung</span>
                                    <span className="font-mono">0979****887</span>
                                </div>
                            </div>

                            {/* Card 2: OCR Slip */}
                            <div className="rounded-2xl p-4 bg-slate-50 dark:bg-[#1E2330] border border-slate-200 dark:border-slate-700/60 space-y-2">
                                <div className="flex items-center justify-between text-xs">
                                    <span className="font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                                        <span>📸</span> {isMm ? '၂။ ပြေစာ OCR စစ်ဆေးချက်' : '2. Slip OCR Forensics'}
                                    </span>
                                    <span className="font-mono text-[11px] text-emerald-600 dark:text-emerald-400 font-bold">99.2% Authentic</span>
                                </div>
                                <div className="text-lg font-black text-slate-900 dark:text-white font-mono">
                                    150,000 MMK
                                </div>
                                <div className="text-[11px] text-slate-500 dark:text-slate-400 flex justify-between">
                                    <span>KBZPay • TxID:</span>
                                    <span className="font-mono text-slate-700 dark:text-slate-300">01009842817</span>
                                </div>
                            </div>

                            {/* Card 3: Bank CSV */}
                            <div className="rounded-2xl p-4 bg-slate-50 dark:bg-[#1E2330] border border-slate-200 dark:border-slate-700/60 space-y-2">
                                <div className="flex items-center justify-between text-xs">
                                    <span className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                                        <span>🏦</span> {isMm ? '၃။ ဘဏ် Statement CSV' : '3. Bank Ledger CSV'}
                                    </span>
                                    <span className="font-mono text-[11px] text-emerald-600 dark:text-emerald-400 font-bold">KBZ Ingested</span>
                                </div>
                                <div className="text-lg font-black text-slate-900 dark:text-white font-mono">
                                    +150,000 MMK
                                </div>
                                <div className="text-[11px] text-slate-500 dark:text-slate-400 flex justify-between">
                                    <span>Ref:</span>
                                    <span className="font-mono text-slate-700 dark:text-slate-300">01009842817</span>
                                </div>
                            </div>
                        </div>

                        {/* Triangulation Bar */}
                        <div className="mt-4 p-3 rounded-2xl bg-gradient-to-r from-indigo-500/10 via-sky-500/10 to-emerald-500/10 border border-emerald-500/20 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                            <div className="flex items-center gap-2">
                                <span className="p-1.5 rounded-xl bg-emerald-500 text-white font-bold text-xs">✓</span>
                                <span className="font-bold text-slate-800 dark:text-slate-200">
                                    {isMm
                                        ? '၃ ခုလုံး တိုက်ဆိုင်မှု အောင်မြင်သည် — စာရင်းပိတ်သိမ်းပြီး တရားဝင် စာရင်းစစ်မှတ်တမ်း သွင်းပြီးပါပြီ'
                                        : 'Automated 3-Way Triangulation Match — Reconciled into Immutable Audit Ledger'}
                                </span>
                            </div>
                            <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
                                Latency: 0.28s • Maker-Checker Logged
                            </span>
                        </div>
                    </div>
                </div>

                {/* Supported Myanmar Banking Channels Bar */}
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 mt-12">
                    <div className="text-center mb-4">
                        <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                            {isMm ? 'အပြည့်အဝ ပံ့ပိုးပေးထားသော ဘဏ်နှင့် ငွေပေးချေမှု စနစ်များ' : 'Supported Myanmar Banking & Settlement Channels'}
                        </span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                        {bankingChannels.map((channel, i) => (
                            <div
                                key={i}
                                className={`rounded-2xl p-3 border text-center transition flex flex-col items-center justify-center gap-1 ${channel.color}`}
                            >
                                <span className="text-lg">{channel.icon}</span>
                                <span className="text-xs font-bold text-slate-900 dark:text-white">
                                    {channel.name}
                                </span>
                                <span className="text-[10px] font-mono opacity-80">
                                    {channel.badge}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* 3-Step How It Works Section */}
            <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 border-t border-slate-200 dark:border-slate-800">
                <div className="text-center mb-12">
                    <h2 className="text-xs font-bold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
                        {isMm ? 'လည်ပတ်ပုံ အဆင့်ဆင့်' : 'How ReconGuard Operates'}
                    </h2>
                    <p
                        className={`text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-1 ${
                            isMm ? 'leading-[1.65] md:leading-[1.6] py-1' : ''
                        }`}
                    >
                        {isMm ? '၃-ဆင့်ဖြင့် အလွယ်တကူ စာရင်းရှင်းလင်းခြင်း' : 'Three Simple Steps to Flawless Reconciliation'}
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {howItWorks.map((item, i) => (
                        <div
                            key={i}
                            className="relative rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#161B26] p-6 shadow-sm hover:shadow-xl hover:border-indigo-500/50 transition-all duration-200 space-y-4"
                        >
                            <div className="flex items-center justify-between">
                                <span className="text-2xl">{item.icon}</span>
                                <span className="text-xs font-mono font-black text-slate-400 dark:text-slate-600">
                                    STEP {item.step}
                                </span>
                            </div>
                            <h3 className="text-base font-bold text-slate-900 dark:text-white">
                                {item.title}
                            </h3>
                            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                                {item.desc}
                            </p>
                        </div>
                    ))}
                </div>
            </section>

            {/* Why ReconGuard is Trusted: Bank-Grade Security & Reliability */}
            <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 border-t border-slate-200 dark:border-slate-800">
                <div className="text-center mb-12">
                    <h2 className="text-xs font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
                        {isMm ? 'ဘဏ်အဆင့် လုံခြုံရေးနှင့် စိတ်ချရမှု' : 'Bank-Grade Security Architecture'}
                    </h2>
                    <p
                        className={`text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-1 ${
                            isMm ? 'leading-[1.65] md:leading-[1.6] py-1' : ''
                        }`}
                    >
                        {isMm ? 'ReconGuard အား စိတ်ချရမှု အာမခံချက်' : 'Why Financial Teams Trust ReconGuard'}
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {securityPillars.map((sec, i) => (
                        <div
                            key={i}
                            className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#161B26] p-6 shadow-sm flex items-start gap-4 hover:border-emerald-500/40 transition"
                        >
                            <span className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-2xl border border-emerald-500/20 shrink-0">
                                {sec.icon}
                            </span>
                            <div className="space-y-1.5">
                                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                                    {sec.title}
                                </h3>
                                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                                    {sec.desc}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* Enterprise FinTech Capabilities Grid */}
            <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 border-t border-slate-200 dark:border-slate-800">
                <div className="text-center mb-12">
                    <h2 className="text-xs font-bold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
                        {isMm ? 'အဓိက နည်းပညာစနစ်များ' : 'Enterprise Capabilities'}
                    </h2>
                    <p
                        className={`text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-1 ${
                            isMm ? 'leading-[1.65] md:leading-[1.6] py-1' : ''
                        }`}
                    >
                        {isMm ? 'ပြည့်စုံသော ငွေကြေးစီမံခန့်ခွဲမှု စနစ်' : 'Engineered for High-Volume Ledger Operations'}
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {enterpriseCapabilities.map((f, i) => (
                        <div
                            key={i}
                            className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#161B26] p-6 shadow-sm hover:shadow-xl hover:border-indigo-500/50 transition-all duration-200 space-y-3"
                        >
                            <div className="text-3xl">{f.icon}</div>
                            <h3 className="text-base font-bold text-slate-900 dark:text-white">
                                {f.title}
                            </h3>
                            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                                {f.desc}
                            </p>
                        </div>
                    ))}
                </div>
            </section>

            {/* Footer */}
            <footer className="border-t border-slate-200 dark:border-slate-800 py-10 bg-white/50 dark:bg-[#0F1422]/50 text-xs text-slate-500 dark:text-slate-400">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
                    <div>
                        <p className="font-semibold text-slate-700 dark:text-slate-300">
                            ReconGuard FinTech Suite v2026.1
                        </p>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                            Automated 3-Way Triangulation • SHA-256 Forensics • Multi-Bank Settlement
                        </p>
                    </div>

                    <div className="flex items-center gap-4">
                        <button
                            type="button"
                            onClick={() => setShowPrivacyModal(true)}
                            className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold underline hover:opacity-80 transition"
                        >
                            {isMm ? 'လုံခြုံရေးနှင့် ဒေတာစည်းမျဉ်း မူဝါဒ' : 'Privacy Policy & Compliance'}
                        </button>
                        <span>•</span>
                        <span>© 2026 ReconGuard</span>
                    </div>
                </div>
            </footer>

            {/* Privacy Policy Modal */}
            <PrivacyPolicyModal
                show={showPrivacyModal}
                onClose={() => setShowPrivacyModal(false)}
            />
        </div>
    );
}
