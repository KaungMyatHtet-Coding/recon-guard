import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { PageProps } from '@/types';
import { Head } from '@inertiajs/react';
import UpdatePasswordForm from './Partials/UpdatePasswordForm';
import UpdateProfileInformationForm from './Partials/UpdateProfileInformationForm';
import UpdateProfileAvatarForm from './Partials/UpdateProfileAvatarForm';

export default function Edit({
    mustVerifyEmail,
    status,
}: PageProps<{ mustVerifyEmail: boolean; status?: string }>) {
    return (
        <AuthenticatedLayout
            header={
                <h2 className="text-xl font-bold leading-tight text-slate-900 dark:text-white flex items-center gap-2">
                    <span>👤</span> Profile Security & Financial Actor Settings
                </h2>
            }
        >
            <Head title="Profile - ReconGuard" />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-6">
                {/* Profile Photo Uploader */}
                <div className="bg-white dark:bg-[#161B26] p-6 shadow-sm border border-slate-200/80 dark:border-slate-800/80 sm:rounded-2xl sm:p-8">
                    <UpdateProfileAvatarForm className="max-w-2xl" />
                </div>

                <div className="bg-white dark:bg-[#161B26] p-6 shadow-sm border border-slate-200/80 dark:border-slate-800/80 sm:rounded-2xl sm:p-8">
                    <UpdateProfileInformationForm
                        mustVerifyEmail={mustVerifyEmail}
                        status={status}
                        className="max-w-2xl"
                    />
                </div>

                <div className="bg-white dark:bg-[#161B26] p-6 shadow-sm border border-slate-200/80 dark:border-slate-800/80 sm:rounded-2xl sm:p-8">
                    <UpdatePasswordForm className="max-w-2xl" />
                </div>

                {/* Financial Actor Audit Immutability Notice */}
                <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 dark:bg-amber-950/20 p-6 text-xs text-amber-800 dark:text-amber-300">
                    <div className="flex items-start gap-3">
                        <span className="text-xl">🛡️</span>
                        <div>
                            <h4 className="font-bold text-sm text-amber-900 dark:text-amber-200">
                                Financial Actor Audit Trail Protected
                            </h4>
                            <p className="mt-1 leading-relaxed text-amber-800/90 dark:text-amber-300/80">
                                In accordance with FinTech compliance and banking audit trail regulations, financial actors cannot self-delete user accounts or alter historical transaction logs. All profile identity records are permanently linked to ledger reconciliations.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
