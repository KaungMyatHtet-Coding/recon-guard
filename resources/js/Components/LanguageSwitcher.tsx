import React from 'react';
import { useLanguage } from '@/Contexts/LanguageContext';

export default function LanguageSwitcher({ className = '' }: { className?: string }) {
    const { language, setLanguage } = useLanguage();

    const activeClass = "bg-[#705CF6] text-white shadow-xs font-bold px-2.5 py-1 text-xs rounded-lg transition-all";
    const inactiveClass = "text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors px-2.5 py-1 text-xs font-semibold rounded-lg";

    return (
        <div
            className={`bg-slate-200/80 dark:bg-slate-800/80 border border-slate-300/80 dark:border-slate-700 p-1 rounded-xl flex items-center gap-1 ${className}`}
            role="group"
            aria-label="Language selector"
        >
            <button
                type="button"
                onClick={() => setLanguage('en')}
                className={language === 'en' ? activeClass : inactiveClass}
            >
                EN
            </button>
            <button
                type="button"
                onClick={() => setLanguage('mm')}
                className={`${language === 'mm' ? activeClass : inactiveClass} font-sans`}
            >
                မြန်မာ
            </button>
        </div>
    );
}
