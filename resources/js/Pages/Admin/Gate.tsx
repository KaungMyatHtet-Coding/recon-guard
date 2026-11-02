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
                <h2 className="text-xl font-bold leading-tight text-white flex items-center gap-2">
                    <span className="text-purple-400">🛡️</span> Chief Auditor Security Verification Gate
                </h2>
            }
        >
            <Head title="Security Passcode Gate - ReconGuard" />

            <div className="flex min-h-[70vh] items-center justify-center py-10 px-4">
                <div className="w-full max-w-md rounded-3xl border border-purple-500/30 bg-slate-850/80 p-8 backdrop-blur-xl shadow-2xl shadow-purple-950/40 text-center relative overflow-hidden">
                    {/* Background glow circle */}
                    <div className="absolute -top-16 -right-16 h-36 w-36 rounded-full bg-purple-600/20 blur-2xl pointer-events-none"></div>
                    <div className="absolute -bottom-16 -left-16 h-36 w-36 rounded-full bg-indigo-600/20 blur-2xl pointer-events-none"></div>

                    {/* Shield Icon */}
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-500 text-3xl shadow-lg shadow-purple-500/30">
                        🔒
                    </div>

                    <h3 className="mt-4 text-xl font-black tracking-tight text-white">
                        Chief Auditor Passcode Required
                    </h3>
                    <p className="mt-2 text-xs text-slate-400 leading-relaxed">
                        To access the Executive Governance Suite, Fraud Blacklist controls, and System Parameters, please authenticate with your secondary administrative security passcode.
                    </p>

                    <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                        <div className="text-left">
                            <label className="block text-xs font-semibold text-slate-300 mb-1">
                                Administrative Security PIN / Passcode
                            </label>
                            <div className="relative">
                                <input
                                    type={showPasscode ? 'text' : 'password'}
                                    autoFocus
                                    placeholder="Enter secondary passcode..."
                                    value={data.passcode}
                                    onChange={(e) => setData('passcode', e.target.value)}
                                    className="w-full rounded-xl border border-slate-700 bg-slate-900/90 px-4 py-3 text-center text-lg font-mono tracking-widest text-white placeholder-slate-600 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 shadow-inner"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPasscode(!showPasscode)}
                                    className="absolute right-3 top-3.5 text-xs text-slate-500 hover:text-slate-300"
                                >
                                    {showPasscode ? 'Hide' : 'Show'}
                                </button>
                            </div>
                            {errors.passcode && (
                                <p className="mt-1 text-xs font-medium text-red-400 text-center">
                                    {errors.passcode}
                                </p>
                            )}
                        </div>

                        {/* Demo Quick-Fill Helper */}
                        <div className="rounded-xl border border-purple-900/40 bg-purple-950/20 p-3 text-xs text-purple-300 flex items-center justify-between">
                            <span className="text-[11px]">Default Demo Passcode:</span>
                            <button
                                type="button"
                                onClick={() => setData('passcode', 'admin1234')}
                                className="font-mono font-bold text-xs bg-purple-900/60 hover:bg-purple-800 text-white px-2 py-0.5 rounded border border-purple-700 transition"
                            >
                                admin1234
                            </button>
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
        </AuthenticatedLayout>
    );
}
