import React, { useRef, useState } from 'react';
import { usePage, router } from '@inertiajs/react';
import { PageProps } from '@/types';
import UserAvatar from '@/Components/UserAvatar';
import ConfirmModal from '@/Components/ConfirmModal';

export default function UpdateProfileAvatarForm({ className = '' }: { className?: string }) {
    const { auth } = usePage<PageProps>().props;
    const user = auth.user;

    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [processing, setProcessing] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!['image/jpeg', 'image/png', 'image/webp', 'image/jpg'].includes(file.type)) {
            setErrorMessage('Invalid file type. Only JPG, PNG, and WebP images are allowed.');
            return;
        }

        if (file.size > 2 * 1024 * 1024) {
            setErrorMessage('Image file is too large. Maximum size is 2MB.');
            return;
        }

        setErrorMessage(null);
        setSelectedFile(file);
        setPreviewUrl(URL.createObjectURL(file));
    };

    const handleUpload = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedFile) return;

        setProcessing(true);
        setErrorMessage(null);
        setSuccessMessage(null);

        const formData = new FormData();
        formData.append('avatar', selectedFile);

        router.post(route('profile.avatar.update'), formData, {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => {
                setProcessing(false);
                setSelectedFile(null);
                setPreviewUrl(null);
                setSuccessMessage('Profile photo updated successfully!');
                setTimeout(() => setSuccessMessage(null), 4000);
            },
            onError: (errors) => {
                setProcessing(false);
                setErrorMessage(errors.avatar || 'Failed to upload avatar. Please try again.');
            },
        });
    };

    const handleRemoveAvatar = () => {
        setShowRemoveConfirm(true);
    };

    const confirmRemoveAvatar = () => {
        setShowRemoveConfirm(false);
        setProcessing(true);
        router.delete(route('profile.avatar.destroy'), {
            preserveScroll: true,
            onSuccess: () => {
                setProcessing(false);
                setSelectedFile(null);
                setPreviewUrl(null);
                setSuccessMessage('Profile photo removed.');
                setTimeout(() => setSuccessMessage(null), 4000);
            },
            onError: () => {
                setProcessing(false);
                setErrorMessage('Failed to remove profile photo.');
            },
        });
    };

    return (
        <section className={className}>
            <header className="mb-5">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <span>🖼️</span> Profile Photo & Avatar
                </h3>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                    Upload an executive profile picture or photo ID for visual audit verification across all reconciliation ledgers.
                </p>
            </header>

            {errorMessage && (
                <div className="mb-4 rounded-xl bg-red-500/10 border border-red-500/30 p-3 text-xs text-red-600 dark:text-red-400 font-medium">
                    ⚠️ {errorMessage}
                </div>
            )}

            {successMessage && (
                <div className="mb-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-3 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                    ✓ {successMessage}
                </div>
            )}

            <div className="flex flex-col sm:flex-row items-center gap-6">
                {/* Avatar Preview */}
                <div className="relative group shrink-0">
                    {previewUrl ? (
                        <img
                            src={previewUrl}
                            alt="Preview"
                            className="w-24 h-24 rounded-full object-cover ring-4 ring-[#705CF6]/30 shadow-lg"
                        />
                    ) : (
                        <UserAvatar user={user} size="xl" className="ring-4 ring-slate-200 dark:ring-slate-800" />
                    )}

                    {previewUrl && (
                        <span className="absolute -bottom-1 -right-1 bg-[#705CF6] text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow">
                            Preview
                        </span>
                    )}
                </div>

                {/* Upload Actions */}
                <div className="flex-1 w-full space-y-3">
                    <input
                        type="file"
                        ref={fileInputRef}
                        accept="image/jpeg,image/png,image/webp,image/jpg"
                        onChange={handleFileSelect}
                        className="hidden"
                    />

                    <div className="flex flex-wrap items-center gap-3">
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={processing}
                            className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 transition-colors shadow-sm disabled:opacity-50"
                        >
                            Choose Photo (JPG, PNG, WebP)
                        </button>

                        {selectedFile && (
                            <button
                                type="button"
                                onClick={handleUpload}
                                disabled={processing}
                                className="px-4 py-2 text-xs font-semibold rounded-xl bg-[#705CF6] hover:bg-[#604ce4] text-white shadow-sm transition-all disabled:opacity-50 flex items-center gap-1.5"
                            >
                                {processing ? 'Uploading...' : 'Save Avatar'}
                            </button>
                        )}

                        {(user.avatar_path || previewUrl) && (
                            <button
                                type="button"
                                onClick={previewUrl ? () => { setSelectedFile(null); setPreviewUrl(null); } : handleRemoveAvatar}
                                disabled={processing}
                                className="px-3 py-2 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 transition-colors"
                            >
                                {previewUrl ? 'Cancel Preview' : 'Remove Photo'}
                            </button>
                        )}
                    </div>

                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Square images recommended. Maximum upload size: 2.0 MB.
                    </p>
                </div>
            </div>

            {/* Remove Avatar ConfirmModal */}
            <ConfirmModal
                show={showRemoveConfirm}
                title="Remove Profile Photo?"
                variant="danger"
                confirmText="Remove Photo"
                cancelText="Cancel"
                description={
                    <p>
                        Are you sure you want to remove your profile photo? Your account will revert to the default initial avatar.
                    </p>
                }
                loading={processing}
                onClose={() => setShowRemoveConfirm(false)}
                onConfirm={confirmRemoveAvatar}
            />
        </section>
    );
}
