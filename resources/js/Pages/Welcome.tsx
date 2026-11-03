import LanguageSwitcher from '@/Components/LanguageSwitcher';
import ThemeToggle from '@/Components/ThemeToggle';
import { useLanguage } from '@/Contexts/LanguageContext';
import { PageProps } from '@/types';
import { Head, Link } from '@inertiajs/react';

export default function Welcome({
    auth,
}: PageProps<{ laravelVersion?: string; phpVersion?: string }>) {
    const { t, language } = useLanguage();

    const features = [
        {
            icon: '⚡',
            title: language === 'mm' ? '၃-ဆင့် စာရင်းတိုက်ဆိုင်စစ်ဆေးမှု' : '3-Way Reconciliation Engine',
            desc: language === 'mm'
                ? 'ငွေတောင်းခံလွှာ၊ ပြေစာ OCR နှင့် ဘဏ် CSV စာရင်းများကို အလိုအလျောက် တိုက်ဆိုင်စစ်ဆေးပြီး အတည်ပြုပေးပါသည်။'
                : 'Cross-verifies Invoices, OCR Payment Slips, and Multi-Bank Statement CSVs with confidence scoring.',
        },
        {
            icon: '🔍',
            title: language === 'mm' ? 'ပြေစာအတုနှင့် လိမ်လည်မှုစစ်ဆေးရေး' : '3-Layer Slip Fraud Detection',
            desc: language === 'mm'
                ? 'SHA-256 ပုံတူစစ်ဆေးခြင်း၊ ပြေစာနံပါတ်ထပ်ခြင်း နှင့် Photoshop ပြင်ဆင်ထားသည့် EXIF အမှတ်အသားများကို ချက်ချင်းဖမ်းဆီးပါသည်။'
                : 'Zero-cost image hash fingerprinting, duplicate transaction ID detection, and EXIF/binary metadata forensics.',
        },
        {
            icon: '🏦',
            title: language === 'mm' ? 'မြန်မာ့ဘဏ်စနစ် ၄ ခု ချိတ်ဆက်မှု' : 'Multi-Bank Adapter Strategy',
            desc: language === 'mm'
                ? 'KBZPay, WavePay, CB Pay နှင့် AYA Pay တို့၏ ကွဲပြားသော CSV ပုံစံများကို ပေါင်းစည်းစာရင်းတစ်ခုတည်းသို့ ပြောင်းလဲပါသည်။'
                : 'Ingests diverse CSV schemas from KBZPay, WavePay, CB Pay, and AYA Pay into a unified ledger with deduplication.',
        },
        {
            icon: '🛡️',
            title: language === 'mm' ? 'စာရင်းစစ်မှူး စီမံခန့်ခွဲမှုနှင့် အစီရင်ခံစာ' : 'Chief Auditor Governance Suite',
            desc: language === 'mm'
                ? 'လုံခြုံရေး PIN ဂိတ်၊ အနီးစပ်ဆုံးကိုက်ညီမှု စိစစ်ခြင်း၊ မသင်္ကာဖွယ်အကောင့်ပိတ်ခြင်း နှင့် တရားဝင် PDF စာရင်းစစ် အစီရင်ခံစာ။'
                : 'Secondary PIN authorization gate, visual analytics charts, customer blacklist controls, and printable official PDF reports.',
        },
    ];

    const demoAccounts = [
        {
            role: language === 'mm' ? 'အကြီးတန်း စာရင်းစစ်မှူး' : 'Chief Auditor (Admin)',
            email: 'admin@reconguard.test',
            pass: 'password',
            gate: 'admin1234',
            badge: 'bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-700',
        },
        {
            role: language === 'mm' ? 'ဘဏ္ဍာရေး အရာရှိ' : 'Senior Accountant',
            email: 'accountant@reconguard.test',
            pass: 'password',
            gate: 'N/A',
            badge: 'bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700',
        },
        {
            role: language === 'mm' ? 'ငွေပေးချေသူ မိတ်ဖက်' : 'Merchant Customer',
            email: 'customer@reconguard.test',
            pass: 'password',
            gate: 'N/A',
            badge: 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700',
        },
    ];

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-[#121212] text-slate-900 dark:text-slate-100 selection:bg-indigo-500 selection:text-white transition-colors duration-200 font-sans">
            <Head title="ReconGuard — Automated Multi-Channel Payment & Bank Reconciliation Engine" />

            {/* Top Navigation */}
            <header className="border-b border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur sticky top-0 z-40 transition-colors duration-200">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                    <div className="flex items-center space-x-2.5">
                        <div className="h-10 w-10 rounded-2xl bg-gradient-to-tr from-indigo-500 via-sky-500 to-emerald-400 p-0.5 shadow-lg shadow-indigo-500/20">
                            <div className="h-full w-full rounded-[14px] bg-white dark:bg-[#1C1C22] flex items-center justify-center font-black text-indigo-600 dark:text-indigo-400 text-sm tracking-tighter">
                                RG
                            </div>
                        </div>
                        <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-slate-900 via-slate-800 to-slate-600 dark:from-white dark:via-slate-100 dark:to-slate-400 bg-clip-text text-transparent">
                            Recon<span className="text-indigo-600 dark:text-indigo-400">Guard</span>
                        </span>
                    </div>

                    <div className="flex items-center space-x-2 sm:space-x-3">
                        <LanguageSwitcher />
                        <ThemeToggle />

                        {auth.user ? (
                            <Link
                                href={route('dashboard')}
                                className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-indigo-600/30 hover:bg-indigo-500 transition"
                            >
                                {t('nav.dashboard', 'Dashboard')} →
                            </Link>
                        ) : (
                            <div className="flex items-center space-x-2">
                                <Link
                                    href={route('login')}
                                    className="rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800/80 px-3.5 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                                >
                                    Log In
                                </Link>
                                <Link
                                    href={route('register')}
                                    className="rounded-xl bg-indigo-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-md shadow-indigo-600/20 hover:bg-indigo-500 transition"
                                >
                                    Register
                                </Link>
                            </div>
                        )}
                    </div>
                </div>
            </header>

            {/* Hero Section */}
            <section className="relative overflow-hidden pt-12 pb-20 sm:pt-20 sm:pb-28">
                <div className="absolute inset-0 -z-10 flex items-center justify-center">
                    <div className="h-96 w-96 rounded-full bg-indigo-500/10 dark:bg-indigo-500/20 blur-3xl"></div>
                    <div className="h-72 w-72 rounded-full bg-sky-500/10 dark:bg-sky-500/15 blur-3xl -ml-20"></div>
                </div>

                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center space-y-6">
                    <div className="inline-flex items-center gap-2 rounded-full border border-indigo-300 dark:border-indigo-800/60 bg-indigo-50 dark:bg-indigo-950/40 px-3.5 py-1 text-xs font-semibold text-indigo-700 dark:text-indigo-300 shadow-sm">
                        <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                        <span>
                            {language === 'mm'
                                ? 'မြန်မာ့ငွေပေးချေမှုစနစ်များအတွက် အလိုအလျောက် စာရင်းတိုက်ဆိုင်စစ်ဆေးရေး အင်ဂျင်'
                                : 'Multi-Channel Payment & Bank Ledger Automated Reconciliation'}
                        </span>
                    </div>

                    <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-slate-900 dark:text-white max-w-4xl mx-auto leading-tight">
                        {language === 'mm' ? (
                            <>
                                ဘဏ်ငွေလွှဲပြေစာများနှင့် စာရင်းများကို{' '}
                                <span className="bg-gradient-to-r from-indigo-600 to-sky-500 bg-clip-text text-transparent">
                                    စက္ကန့်ပိုင်းအတွင်း
                                </span>{' '}
                                တိုက်ဆိုင်စစ်ဆေးပါ
                            </>
                        ) : (
                            <>
                                Automated 3-Way Reconciliation &amp;{' '}
                                <span className="bg-gradient-to-r from-indigo-500 via-sky-500 to-emerald-400 bg-clip-text text-transparent">
                                    Slip Fraud Defense
                                </span>{' '}
                                Engine
                            </>
                        )}
                    </h1>

                    <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed">
                        {language === 'mm'
                            ? 'KBZPay, WavePay, CB Pay နှင့် AYA Pay ဘဏ်စာရင်းများကို တိုက်ဆိုင်စစ်ဆေးပြီး လိမ်လည်ပြင်ဆင်ထားသော ပြေစာအတုများကို ၃ ဆင့်ဖြင့် အလိုအလျောက် ဖမ်းဆီးပေးပါသည်။'
                            : 'Cross-verifying Customer Invoices, OCR Payment Slips, and Multi-Bank Statement CSVs. Engineered with Zero-Cost OCR Heuristics, Levenshtein Fuzzy Matching, and Chief Auditor Governance.'}
                    </p>

                    {/* CTA Buttons */}
                    <div className="flex flex-wrap items-center justify-center gap-3 pt-4">
                        {auth.user ? (
                            <Link
                                href={route('dashboard')}
                                className="rounded-2xl bg-indigo-600 px-6 py-3.5 text-sm font-bold text-white shadow-xl shadow-indigo-600/30 hover:bg-indigo-500 transition"
                            >
                                {t('nav.dashboard', 'Enter Dashboard')} →
                            </Link>
                        ) : (
                            <>
                                <Link
                                    href={route('login')}
                                    className="rounded-2xl bg-indigo-600 px-6 py-3.5 text-sm font-bold text-white shadow-xl shadow-indigo-600/30 hover:bg-indigo-500 transition"
                                >
                                    {language === 'mm' ? 'စနစ်သို့ ဝင်ရောက်မည်' : 'Sign In to Demo Terminal'} →
                                </Link>
                                <Link
                                    href={route('register')}
                                    className="rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800/80 px-6 py-3.5 text-sm font-semibold text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition shadow-sm"
                                >
                                    {language === 'mm' ? 'အကောင့်အသစ် ဖွင့်မည်' : 'Create Free Account'}
                                </Link>
                            </>
                        )}
                    </div>
                </div>
            </section>

            {/* Core Features Grid */}
            <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 border-t border-slate-200 dark:border-slate-800">
                <div className="text-center mb-10">
                    <h2 className="text-xs font-bold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
                        {language === 'mm' ? 'အဓိက နည်းပညာစနစ်များ' : 'Enterprise FinTech Capabilities'}
                    </h2>
                    <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                        {language === 'mm' ? 'ပြည့်စုံသော ငွေကြေးစီမံခန့်ခွဲမှု စနစ်' : 'Architected for High-Volume Ledger Reconciliation'}
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {features.map((f, i) => (
                        <div
                            key={i}
                            className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#1C1C22] p-6 shadow-sm hover:shadow-xl hover:border-indigo-500/50 transition-all duration-200 space-y-3"
                        >
                            <div className="text-3xl">{f.icon}</div>
                            <h3 className="text-base font-bold text-slate-900 dark:text-white">{f.title}</h3>
                            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">{f.desc}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* University Presentation Demo Accounts Box */}
            <section className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-12">
                <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#1C1C22] p-6 sm:p-8 shadow-2xl space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
                        <div>
                            <span className="text-xs font-bold font-mono uppercase text-indigo-600 dark:text-indigo-400 tracking-wider">
                                University Exhibition &amp; Interview Testing
                            </span>
                            <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2 mt-0.5">
                                <span>🔑</span> Pre-Seeded Demonstration Accounts
                            </h3>
                        </div>
                        <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                            Database Seeded with KBZ, Wave, CB, AYA Batches
                        </span>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                            <thead className="bg-slate-100 dark:bg-slate-900/80 text-slate-600 dark:text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-200 dark:border-slate-800">
                                <tr>
                                    <th className="px-4 py-3">Role</th>
                                    <th className="px-4 py-3">Demo Email</th>
                                    <th className="px-4 py-3">Password</th>
                                    <th className="px-4 py-3">Auditor Gate PIN</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-mono">
                                {demoAccounts.map((acc, i) => (
                                    <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                                        <td className="px-4 py-3 font-sans">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${acc.badge}`}>
                                                {acc.role}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-slate-800 dark:text-slate-200 font-bold">{acc.email}</td>
                                        <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{acc.pass}</td>
                                        <td className="px-4 py-3 font-bold text-purple-600 dark:text-purple-400">{acc.gate}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="border-t border-slate-200 dark:border-slate-800 py-8 text-center text-xs text-slate-500 dark:text-slate-400">
                <p>© 2026 ReconGuard FinTech Suite. Built with Laravel 12, React 18 TypeScript, Inertia.js &amp; Tailwind CSS.</p>
            </footer>
        </div>
    );
}
