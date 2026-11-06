import React, { FormEvent } from 'react';
import { useForm } from '@inertiajs/react';

interface Props {
    show: boolean;
    onClose: () => void;
}

export default function CreateAccountantModal({ show, onClose }: Props) {
    const { data, setData, post, processing, errors, reset } = useForm({
        name: '',
        email: '',
        phone: '',
        nrc_number: '',
        password: '',
    });

    if (!show) return null;

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        post(route('admin.users.store'), {
            onSuccess: () => {
                reset();
                onClose();
            },
        });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <div className="w-full max-w-lg rounded-3xl bg-white dark:bg-[#161B26] border border-slate-200 dark:border-slate-800 p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                    <div className="flex items-center gap-2.5">
                        <span className="p-2 rounded-xl bg-purple-500/10 text-[#705CF6] font-bold text-sm">
                            👨‍💼
                        </span>
                        <div>
                            <h3 className="text-base font-bold text-slate-900 dark:text-white">
                                Add Senior Accountant
                            </h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                Create an authorized finance officer account with operational access
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-slate-400 hover:text-slate-600 dark:hover:text-white text-sm p-1 rounded-lg"
                    >
                        ✕
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
                    <div>
                        <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                            Full Legal Name <span className="text-rose-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={data.name}
                            onChange={(e) => setData('name', e.target.value)}
                            required
                            placeholder="e.g. Daw Su Su Lwin"
                            className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:border-[#705CF6] focus:ring-1 focus:ring-[#705CF6]"
                        />
                        {errors.name && <p className="text-rose-500 mt-1">{errors.name}</p>}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                                Work Email Address <span className="text-rose-500">*</span>
                            </label>
                            <input
                                type="email"
                                value={data.email}
                                onChange={(e) => setData('email', e.target.value)}
                                required
                                placeholder="accountant@company.com"
                                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:border-[#705CF6] focus:ring-1 focus:ring-[#705CF6]"
                            />
                            {errors.email && <p className="text-rose-500 mt-1">{errors.email}</p>}
                        </div>

                        <div>
                            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                                Contact Phone <span className="text-rose-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={data.phone}
                                onChange={(e) => setData('phone', e.target.value)}
                                required
                                placeholder="09450001122"
                                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 font-mono focus:border-[#705CF6] focus:ring-1 focus:ring-[#705CF6]"
                            />
                            {errors.phone && <p className="text-rose-500 mt-1">{errors.phone}</p>}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                                National ID / NRC <span className="text-rose-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={data.nrc_number}
                                onChange={(e) => setData('nrc_number', e.target.value)}
                                required
                                placeholder="12/DAGAMA(N)098765"
                                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 font-mono focus:border-[#705CF6] focus:ring-1 focus:ring-[#705CF6]"
                            />
                            {errors.nrc_number && <p className="text-rose-500 mt-1">{errors.nrc_number}</p>}
                        </div>

                        <div>
                            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                                Temporary Password <span className="text-rose-500">*</span>
                            </label>
                            <input
                                type="password"
                                value={data.password}
                                onChange={(e) => setData('password', e.target.value)}
                                required
                                minLength={8}
                                placeholder="Min. 8 characters"
                                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:border-[#705CF6] focus:ring-1 focus:ring-[#705CF6]"
                            />
                            {errors.password && <p className="text-rose-500 mt-1">{errors.password}</p>}
                        </div>
                    </div>

                    <div className="p-3 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 text-[11px] text-purple-800 dark:text-purple-300 leading-relaxed">
                        💡 <strong>Maker Permissions:</strong> The new Senior Accountant will be granted operational access to Invoices, Bank Statement Uploads, 3-Way Reconciliation, and Simulation Studio.
                    </div>

                    {/* Footer Actions */}
                    <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold transition"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={processing}
                            className="px-4 py-2.5 rounded-xl bg-[#705CF6] hover:bg-[#5a48e0] text-white font-bold transition shadow-xs disabled:opacity-50"
                        >
                            {processing ? 'Creating Accountant...' : 'Create Senior Accountant'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
