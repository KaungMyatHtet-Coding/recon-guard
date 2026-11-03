import React from 'react';
import { useTheme } from '@/Contexts/ThemeContext';

export default function ThemeToggle({ className = '' }: { className?: string }) {
    const { theme, toggleTheme, isDark } = useTheme();

    return (
        <button
            type="button"
            onClick={toggleTheme}
            title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            aria-label={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            className={`relative inline-flex items-center justify-center rounded-xl border p-2 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 ${
                isDark
                    ? 'border-slate-700 bg-slate-800/80 text-amber-400 hover:bg-slate-700 hover:text-amber-300'
                    : 'border-slate-300 bg-white text-indigo-600 hover:bg-slate-100 hover:text-indigo-700 shadow-sm'
            } ${className}`}
        >
            {isDark ? (
                // Sun Icon (shown when in dark mode to switch to light)
                <svg className="h-4 w-4 transition-transform duration-200 rotate-0 hover:rotate-45" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
                    />
                </svg>
            ) : (
                // Moon Icon (shown when in light mode to switch to dark)
                <svg className="h-4 w-4 transition-transform duration-200 -rotate-12 hover:rotate-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
                    />
                </svg>
            )}
        </button>
    );
}
