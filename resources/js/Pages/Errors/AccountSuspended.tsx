import { Head, Link, useForm, usePage } from '@inertiajs/react';
import React from 'react';

interface Props {
    blacklist_reason: string;
    hotline: string;
    email: string;
}

export default function AccountSuspended({ blacklist_reason, hotline, email }: Props) {
    const page = usePage();
    const flash = (page.props as any).flash || {};

    const { data, setData, post, processing, errors, reset, recentlySuccessful } = useForm({
        subject: 'Account Restriction Review Appeal',
        contact_phone: '',
        message: '',
    });

    const handleSubmitAppeal = (e: React.FormEvent) => {
        e.preventDefault();
        post(route('support.appeals.store'), {
            onSuccess: () => reset('message'),
        });
    };

    return (
        <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col items-center justify-center p-4 sm:p-6 selection:bg-red-500 selection:text-white">
            <Head title="Account Suspended - ReconGuard Compliance" />

            <div className="w-full max-w-2xl space-y-6">
                {/* Flash Messages */}
                {flash.success && (
                    <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/40 p-4 text-sm text-emerald-200 flex items-center gap-3 shadow-lg">
                        <span className="text-emerald-400 text-lg">✓</span>
                        <span>{flash.success}</span>
                    </div>
                )}

                {/* Main Suspension Card */}
                <div className="rounded-3xl border border-red-800/60 bg-slate-850/90 p-8 backdrop-blur-xl shadow-2xl shadow-red-950/30 relative overflow-hidden">
                    <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 border-b border-slate-800 pb-6 text-center sm:text-left">
                        <div className="h-16 w-16 shrink-0 rounded-2xl bg-red-950/80 border border-red-700/60 flex items-center justify-center text-3xl shadow-lg shadow-red-950/50">
                            ⛔
                        </div>
                        <div>
                            <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-red-950 text-red-400 border border-red-800 mb-1">
                                Compliance & Security Restriction
                            </span>
                            <h1 className="text-xl font-black text-white tracking-tight">
                                Account Privileges Temporarily Suspended
                            </h1>
                            <p className="text-xs text-slate-400 mt-1">
                                Your payment submission privileges have been blocked in accordance with FinTech fraud prevention guidelines.
                            </p>
                        </div>
                    </div>

                    {/* Suspension Reason Box */}
                    <div className="my-6 rounded-2xl border border-red-900/40 bg-red-950/20 p-4 space-y-1">
                        <div className="text-[11px] font-bold text-red-400 uppercase tracking-wider">
                            Restriction Audit Reason:
                        </div>
                        <p className="text-xs text-red-200 font-medium leading-relaxed">
                            {blacklist_reason}
                        </p>
                    </div>

                    {/* Customer Support Contact Info */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs border-b border-slate-800 pb-6 mb-6">
                        <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-3">
                            <span className="text-slate-400 block text-[11px]">Dispute Hotline:</span>
                            <span className="text-white font-mono font-bold">{hotline}</span>
                            <span className="text-slate-500 block text-[10px] mt-0.5">Mon - Sat (9:00 AM - 6:00 PM MMT)</span>
                        </div>
                        <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-3">
                            <span className="text-slate-400 block text-[11px]">Compliance Support Email:</span>
                            <span className="text-indigo-300 font-mono font-bold">{email}</span>
                            <span className="text-slate-500 block text-[10px] mt-0.5">Official Ticket Resolution Desk</span>
                        </div>
                    </div>

                    {/* Embedded Appeal Form */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                                <span>📝</span> Submit Compliance Appeal Ticket
                            </h2>
                            <span className="text-[11px] text-slate-400">Directly routed to Chief Auditor</span>
                        </div>

                        {recentlySuccessful ? (
                            <div className="rounded-xl border border-emerald-500/40 bg-emerald-950/30 p-4 text-xs text-emerald-200 text-center">
                                ✓ Your appeal has been submitted to the Chief Auditor desk. You will be notified when your review is completed.
                            </div>
                        ) : (
                            <form onSubmit={handleSubmitAppeal} className="space-y-3">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                                        Appeal Subject
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={data.subject}
                                        onChange={(e) => setData('subject', e.target.value)}
                                        className="w-full rounded-xl border border-slate-700 bg-slate-900 p-2.5 text-xs text-white placeholder-slate-500 focus:border-red-500 focus:ring-1 focus:ring-red-500"
                                    />
                                    {errors.subject && <p className="text-xs text-red-400 mt-1">{errors.subject}</p>}
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                                        Contact Phone (for verification callbacks)
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="e.g. 09123456789"
                                        value={data.contact_phone}
                                        onChange={(e) => setData('contact_phone', e.target.value)}
                                        className="w-full rounded-xl border border-slate-700 bg-slate-900 p-2.5 text-xs text-white placeholder-slate-500 focus:border-red-500 focus:ring-1 focus:ring-red-500 font-mono"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                                        Explanation & Transaction Context
                                    </label>
                                    <textarea
                                        rows={3}
                                        required
                                        placeholder="Please provide details regarding your payment receipt, official bank reference, or circumstances around this dispute..."
                                        value={data.message}
                                        onChange={(e) => setData('message', e.target.value)}
                                        className="w-full rounded-xl border border-slate-700 bg-slate-900 p-3 text-xs text-white placeholder-slate-500 focus:border-red-500 focus:ring-1 focus:ring-red-500"
                                    />
                                    {errors.message && <p className="text-xs text-red-400 mt-1">{errors.message}</p>}
                                </div>

                                <div className="flex items-center justify-between pt-2">
                                    <Link
                                        href={route('dashboard')}
                                        className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-white"
                                    >
                                        &larr; Return to Dashboard
                                    </Link>

                                    <button
                                        type="submit"
                                        disabled={processing}
                                        className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-red-600/30 hover:from-red-500 hover:to-rose-500 transition disabled:opacity-50"
                                    >
                                        {processing ? 'Submitting Appeal...' : 'Submit Compliance Appeal →'}
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
