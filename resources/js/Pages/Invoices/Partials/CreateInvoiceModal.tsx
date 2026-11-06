import React, { useState, FormEvent } from 'react';
import { useForm } from '@inertiajs/react';

interface CustomerOption {
    id: number;
    name: string;
    phone: string | null;
    company_name: string | null;
    email: string;
}

interface Props {
    show: boolean;
    onClose: () => void;
    customers: CustomerOption[];
}

export default function CreateInvoiceModal({ show, onClose, customers }: Props) {
    const [customerType, setCustomerType] = useState<'registered' | 'guest'>('registered');

    const { data, setData, post, processing, errors, reset } = useForm({
        customer_type: 'registered',
        user_id: customers[0]?.id ? String(customers[0].id) : '',
        customer_name: '',
        customer_phone: '',
        amount: '',
        expected_channel: 'any',
        description: '',
        due_date: '',
    });

    if (!show) return null;

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        post(route('invoices.store'), {
            onSuccess: () => {
                reset();
                onClose();
            },
        });
    };

    const handleTabChange = (type: 'registered' | 'guest') => {
        setCustomerType(type);
        setData('customer_type', type);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <div className="w-full max-w-lg rounded-3xl bg-white dark:bg-[#161B26] border border-slate-200 dark:border-slate-800 p-6 shadow-2xl space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                    <div className="flex items-center gap-2">
                        <span className="p-2 rounded-xl bg-[#705CF6]/10 text-[#705CF6] font-bold text-sm">
                            🧾
                        </span>
                        <div>
                            <h3 className="text-base font-bold text-slate-900 dark:text-white">
                                Issue New Invoice
                            </h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                Create an invoice for a registered client or a walk-in guest
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-lg"
                    >
                        ✕
                    </button>
                </div>

                {/* Customer Type Selector */}
                <div className="grid grid-cols-2 p-1 bg-slate-100 dark:bg-slate-900 rounded-2xl gap-1">
                    <button
                        type="button"
                        onClick={() => handleTabChange('registered')}
                        className={`py-2 text-xs font-bold rounded-xl transition-all ${
                            customerType === 'registered'
                                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                    >
                        🏢 Registered Client
                    </button>
                    <button
                        type="button"
                        onClick={() => handleTabChange('guest')}
                        className={`py-2 text-xs font-bold rounded-xl transition-all ${
                            customerType === 'guest'
                                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                    >
                        🚶 Guest / Walk-in
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {customerType === 'registered' ? (
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                Target Customer Account <span className="text-red-500">*</span>
                            </label>
                            <select
                                value={data.user_id}
                                onChange={(e) => setData('user_id', e.target.value)}
                                required={customerType === 'registered'}
                                className="w-full rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-sm text-slate-900 dark:text-white focus:border-[#705CF6] focus:ring-1 focus:ring-[#705CF6]"
                            >
                                <option value="" disabled>Select registered client</option>
                                {customers.map((c) => (
                                    <option key={c.id} value={c.id}>
                                        {c.name} {c.company_name ? `(${c.company_name})` : ''} — {c.email}
                                    </option>
                                ))}
                            </select>
                            {errors.user_id && (
                                <p className="text-xs text-red-500 mt-1">{errors.user_id}</p>
                            )}
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                    Guest Name <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={data.customer_name}
                                    onChange={(e) => setData('customer_name', e.target.value)}
                                    required={customerType === 'guest'}
                                    placeholder="e.g. U Thant Zin"
                                    className="w-full rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-sm text-slate-900 dark:text-white focus:border-[#705CF6] focus:ring-1 focus:ring-[#705CF6]"
                                />
                                {errors.customer_name && (
                                    <p className="text-xs text-red-500 mt-1">{errors.customer_name}</p>
                                )}
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                    Customer Phone <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={data.customer_phone}
                                    onChange={(e) => setData('customer_phone', e.target.value)}
                                    required={customerType === 'guest'}
                                    placeholder="09790001234"
                                    className="w-full rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-sm text-slate-900 dark:text-white focus:border-[#705CF6] focus:ring-1 focus:ring-[#705CF6]"
                                />
                                {errors.customer_phone && (
                                    <p className="text-xs text-red-500 mt-1">{errors.customer_phone}</p>
                                )}
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                Amount (MMK) <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="number"
                                value={data.amount}
                                onChange={(e) => setData('amount', e.target.value)}
                                required
                                min="1000"
                                placeholder="250000"
                                className="w-full rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-sm text-slate-900 dark:text-white focus:border-[#705CF6] focus:ring-1 focus:ring-[#705CF6]"
                            />
                            {errors.amount && (
                                <p className="text-xs text-red-500 mt-1">{errors.amount}</p>
                            )}
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                Expected Channel
                            </label>
                            <select
                                value={data.expected_channel}
                                onChange={(e) => setData('expected_channel', e.target.value)}
                                className="w-full rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-sm text-slate-900 dark:text-white focus:border-[#705CF6] focus:ring-1 focus:ring-[#705CF6]"
                            >
                                <option value="any">Any Mobile Wallet / Bank</option>
                                <option value="kbzpay">KBZPay (KPay)</option>
                                <option value="wavepay">WavePay</option>
                                <option value="cbpay">CB Pay</option>
                                <option value="ayapay">AYA Pay</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                            Description / Line Items
                        </label>
                        <input
                            type="text"
                            value={data.description}
                            onChange={(e) => setData('description', e.target.value)}
                            placeholder="e.g. IT Equipment & Cloud Services"
                            className="w-full rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-sm text-slate-900 dark:text-white focus:border-[#705CF6] focus:ring-1 focus:ring-[#705CF6]"
                        />
                        {errors.description && (
                            <p className="text-xs text-red-500 mt-1">{errors.description}</p>
                        )}
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 transition"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={processing}
                            className="px-5 py-2 rounded-xl bg-[#705CF6] hover:bg-[#5f4be3] text-xs font-semibold text-white shadow-sm transition disabled:opacity-50"
                        >
                            {processing ? 'Creating...' : 'Issue Invoice →'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
