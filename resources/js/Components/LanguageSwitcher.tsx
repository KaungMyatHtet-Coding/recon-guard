import React from 'react';
import { useLanguage } from '@/Contexts/LanguageContext';

export default function LanguageSwitcher({ className = '' }: { className?: string }) {
    const { language, setLanguage } = useLanguage();

    return (
        <div
            className={`inline-flex items-center rounded-xl border border-slate-700 bg-slate-800/80 p-0.5 text-xs shadow-sm dark:border-slate-700 dark:bg-slate-800/80 border-slate-300 bg-slate-100 ${className}`}
            role="group"
            aria-label="Language selector"
        >
            <button
                type="button"
                onClick={() => setLanguage('en')}
                className={`rounded-lg px-2.5 py-1 font-bold transition-all duration-150 ${
                    language === 'en'
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                }`}
            >
                EN
            </button>
            <button
                type="button"
                onClick={() => setLanguage('mm')}
                className={`rounded-lg px-2.5 py-1 font-bold transition-all duration-150 font-sans ${
                    language === 'mm'
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                }`}
            >
                မြန်မာ
            </button>
        </div>
    );
}
