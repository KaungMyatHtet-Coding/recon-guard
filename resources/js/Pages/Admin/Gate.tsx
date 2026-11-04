import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm } from '@inertiajs/react';
import React, { useState } from 'react';

export default function Gate() {
    const [showPasscode, setShowPasscode] = useState(false);

    const { data, setData, post, processing, errors } = useForm({
        passcode: '',
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post(route('admin.gate.verify'));
    };

    return (
        <AuthenticatedLayout
            header={
                <h2 className="text-xl font-bold leading-tight text-slate-900 dark:text-white flex items-center gap-2">
                    <span className="text-purple-600 dark:text-purple-400">🛡️</span> Chief Auditor Security Verification Gate
                </h2>
            }
        >
            <Head title="Security Passcode Gate - ReconGuard" />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
                <div className="flex min-h-[60vh] items-center justify-center">
                    <div className="w-full max-w-md rounded-3xl border border-slate-200 dark:border-purple-500/30 bg-white dark:bg-[#1E293B] p-8 shadow-2xl dark:shadow-purple-950/40 text-center relative overflow-hidden transition-colors">
                        {/* Background glow circle */}
                        <div className="absolute -top-16 -right-16 h-36 w-36 rounded-full bg-purple-600/10 dark:bg-purple-600/20 blur-2xl pointer-events-none"></div>
                        <div className="absolute -bottom-16 -left-16 h-36 w-36 rounded-full bg-indigo-600/10 dark:bg-indigo-600/20 blur-2xl pointer-events-none"></div>

                        {/* Shield Icon */}
                        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-500 text-3xl shadow-lg shadow-purple-500/30">
                            🔒
                        </div>

                        <h3 className="mt-4 text-xl font-black tracking-tight text-slate-900 dark:text-white">
                            Chief Auditor Passcode Required
                        </h3>
                        <p className="mt-2 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                            To access the Executive Governance Suite, Fraud Blacklist controls, and System Parameters, please authenticate with your secondary administrative security passcode.
                        </p>

                        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                            <div className="text-left">
                                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                    Administrative Security PIN / Passcode
                                </label>
                                <div className="relative">
                                    <input
                                        type={showPasscode ? 'text' : 'password'}
                                        autoFocus
                                        placeholder="Enter secondary passcode..."
                                        value={data.passcode}
                                        onChange={(e) => setData('passcode', e.target.value)}
                                        className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/90 pl-4 pr-12 py-3 text-center text-lg font-mono tracking-widest text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 shadow-inner"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPasscode(!showPasscode)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800 transition focus:outline-none"
                                        title={showPasscode ? 'Hide passcode' : 'Show passcode'}
                                        aria-label={showPasscode ? 'Hide passcode' : 'Show passcode'}
                                    >
                                        {showPasscode ? (
                                            /* Crossed Eye (Eye-off) Icon */
                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                                            </svg>
                                        ) : (
                                            /* Open Eye Icon */
                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                            </svg>
                                        )}
                                    </button>
                                </div>
                                {errors.passcode && (
                                    <p className="mt-1 text-xs font-medium text-red-600 dark:text-red-400 text-center">
                                        {errors.passcode}
                                    </p>
                                )}
                            </div>

                            <button
                                type="submit"
                                disabled={processing || !data.passcode}
                                className="w-full rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 py-3 text-xs font-bold text-white transition hover:from-purple-500 hover:to-indigo-500 shadow-lg shadow-purple-600/30 disabled:opacity-50"
                            >
                                {processing ? 'Verifying Credentials...' : 'Unlock Governance Suite →'}
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
