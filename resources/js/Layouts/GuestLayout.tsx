import LanguageSwitcher from '@/Components/LanguageSwitcher';
import ThemeToggle from '@/Components/ThemeToggle';
import { Link } from '@inertiajs/react';
import { PropsWithChildren } from 'react';

export default function Guest({ children }: PropsWithChildren) {
    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-slate-100 dark:bg-[#121212] p-4 text-slate-900 dark:text-slate-100 transition-colors duration-200 relative selection:bg-indigo-500 selection:text-white">
            {/* Top Right Controls */}
            <div className="absolute top-4 right-4 flex items-center gap-2">
                <LanguageSwitcher />
                <ThemeToggle />
            </div>

            <div className="mb-6 flex flex-col items-center">
                <Link href="/" className="flex items-center space-x-2.5">
                    <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-indigo-500 via-sky-500 to-emerald-400 p-0.5 shadow-xl shadow-indigo-500/20">
                        <div className="h-full w-full rounded-[14px] bg-white dark:bg-[#1C1C22] flex items-center justify-center font-black text-indigo-600 dark:text-indigo-400 text-lg tracking-tighter">
                            RG
                        </div>
                    </div>
                    <span className="font-extrabold text-2xl tracking-tight bg-gradient-to-r from-slate-900 via-slate-800 to-slate-600 dark:from-white dark:via-slate-100 dark:to-slate-400 bg-clip-text text-transparent">
                        Recon<span className="text-indigo-600 dark:text-indigo-400">Guard</span>
                    </span>
                </Link>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 font-medium">
                    Multi-Channel Payment & Bank Slip Reconciliation Engine
                </p>
            </div>

            <div className="w-full sm:max-w-md overflow-hidden rounded-3xl bg-white dark:bg-[#1C1C22] p-6 sm:p-8 shadow-2xl border border-slate-200 dark:border-slate-800">
                {children}
            </div>
        </div>
    );
}
