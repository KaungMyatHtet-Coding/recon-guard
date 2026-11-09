import React, { FormEvent } from 'react';

export interface ConfirmModalProps {
    show: boolean;
    title: string;
    description?: React.ReactNode;
    confirmText?: string;
    cancelText?: string;
    variant?: 'danger' | 'warning' | 'primary' | 'success';
    loading?: boolean;
    onClose: () => void;
    onConfirm: () => void;
    promptInput?: {
        label: string;
        value: string;
        onChange: (value: string) => void;
        placeholder?: string;
        required?: boolean;
        rows?: number;
    };
}

export default function ConfirmModal({
    show,
    title,
    description,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    variant = 'primary',
    loading = false,
    onClose,
    onConfirm,
    promptInput,
}: ConfirmModalProps) {
    if (!show) return null;

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        if (loading) return;
        if (promptInput?.required && !promptInput.value.trim()) return;
        onConfirm();
    };

    const variantStyles = {
        danger: {
            icon: '🚨',
            iconBg: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20',
            button: 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-900/20',
        },
        warning: {
            icon: '⚠️',
            iconBg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20',
            button: 'bg-amber-600 hover:bg-amber-700 text-white shadow-amber-900/20',
        },
        primary: {
            icon: '🛡️',
            iconBg: 'bg-[#705CF6]/10 text-[#705CF6] dark:text-[#A78BFA] border border-[#705CF6]/20',
            button: 'bg-[#705CF6] hover:bg-[#5E4CE0] text-white shadow-[#705CF6]/20',
        },
        success: {
            icon: '🔓',
            iconBg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20',
            button: 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-900/20',
        },
    }[variant];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
            <div
                className="w-full max-w-md rounded-3xl bg-white dark:bg-[#161B26] border border-slate-200 dark:border-slate-800 p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150 text-left"
                role="dialog"
                aria-modal="true"
            >
                {/* Header */}
                <div className="flex items-start justify-between gap-3 border-b border-slate-100 dark:border-slate-800/80 pb-3">
                    <div className="flex items-center gap-3">
                        <span className={`p-2.5 rounded-2xl text-base ${variantStyles.iconBg}`}>
                            {variantStyles.icon}
                        </span>
                        <div>
                            <h3 className="text-base font-bold text-slate-900 dark:text-white leading-tight">
                                {title}
                            </h3>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={loading}
                        className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-lg text-sm transition"
                    >
                        ✕
                    </button>
                </div>

                {/* Description */}
                {description && (
                    <div className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                        {description}
                    </div>
                )}

                {/* Optional Prompt Input (Replaces window.prompt) */}
                {promptInput && (
                    <div className="space-y-1.5 pt-1">
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                            {promptInput.label}
                            {promptInput.required && <span className="text-rose-500 ml-0.5">*</span>}
                        </label>
                        <textarea
                            rows={promptInput.rows || 3}
                            value={promptInput.value}
                            onChange={(e) => promptInput.onChange(e.target.value)}
                            placeholder={promptInput.placeholder}
                            required={promptInput.required}
                            className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 p-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:border-[#705CF6] focus:ring-1 focus:ring-[#705CF6] transition"
                        />
                    </div>
                )}

                {/* Action Buttons */}
                <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800/80">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={loading}
                        className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition disabled:opacity-50"
                    >
                        {cancelText}
                    </button>
                    <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={loading || (promptInput?.required ? !promptInput.value.trim() : false)}
                        className={`px-4 py-2 text-xs font-bold rounded-xl transition shadow-sm disabled:opacity-50 ${variantStyles.button}`}
                    >
                        {loading ? 'Processing...' : confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
}
