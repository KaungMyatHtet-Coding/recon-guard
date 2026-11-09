import LanguageSwitcher from '@/Components/LanguageSwitcher';
import ThemeToggle from '@/Components/ThemeToggle';
import { useLanguage } from '@/Contexts/LanguageContext';
import { Link } from '@inertiajs/react';
import { PropsWithChildren } from 'react';

export default function Guest({ children }: PropsWithChildren) {
    const { language } = useLanguage();
    const isMm = language === 'mm';

    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-[#F8FAFC] dark:bg-[#0B0D14] p-4 text-slate-900 dark:text-[#F8FAFC] transition-colors duration-200 relative selection:bg-[#705CF6] selection:text-white">
            {/* Top Left Navigation: Back to Home */}
            <div className="absolute top-4 left-4">
                <Link
                    href="/"
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-white/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 backdrop-blur transition shadow-xs"
                >
                    <span className="text-sm">←</span>
                    <span>{isMm ? 'ပင်မစာမျက်နှာသို့' : 'Back to Home'}</span>
                </Link>
            </div>

            {/* Top Right Controls */}
            <div className="absolute top-4 right-4 flex items-center gap-2">
                <LanguageSwitcher />
                <ThemeToggle />
            </div>

            <div className="mb-6 flex flex-col items-center">
                <Link href="/" className="flex items-center space-x-2.5">
                    <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-[#705CF6] via-indigo-500 to-sky-400 p-0.5 shadow-xl shadow-purple-500/20">
                        <div className="h-full w-full rounded-[14px] bg-white dark:bg-[#161B26] flex items-center justify-center font-black text-[#705CF6] dark:text-purple-400 text-lg tracking-tighter">
                            RG
                        </div>
                    </div>
                    <span className="font-extrabold text-2xl tracking-tight bg-gradient-to-r from-slate-900 via-slate-800 to-slate-600 dark:from-white dark:via-slate-100 dark:to-slate-400 bg-clip-text text-transparent">
                        Recon<span className="text-[#705CF6]">Guard</span>
                    </span>
                </Link>
                <p className="text-xs text-slate-700 dark:text-slate-400 mt-2 font-medium">
                    Multi-Channel Payment & Bank Slip Reconciliation Engine
                </p>
            </div>

            <div className="w-full sm:max-w-md overflow-hidden rounded-3xl bg-white dark:bg-[#161B26] p-6 sm:p-8 shadow-2xl border border-slate-200 dark:border-slate-800">
                {children}
            </div>
        </div>
    );
}
