import ApplicationLogo from '@/Components/ApplicationLogo';
import Dropdown from '@/Components/Dropdown';
import NavLink from '@/Components/NavLink';
import ResponsiveNavLink from '@/Components/ResponsiveNavLink';
import { Link, router, useForm, usePage } from '@inertiajs/react';
import React, { PropsWithChildren, ReactNode, useState } from 'react';
import { PageProps } from '@/types';

export default function Authenticated({
    header,
    children,
}: PropsWithChildren<{ header?: ReactNode }>) {
    const { auth, flash, notifications = [], unread_notifications_count = 0 } = usePage<PageProps & { notifications?: any[]; unread_notifications_count?: number }>().props;
    const user = auth.user;
    const userRole = user.roles?.[0] || 'customer';
    const canAccessStudio = userRole === 'admin' || userRole === 'accountant';

    const [showingNavigationDropdown, setShowingNavigationDropdown] = useState(false);
    const [showNotificationDropdown, setShowNotificationDropdown] = useState(false);
    const [showAppealModal, setShowAppealModal] = useState(false);

    // Support Appeal Form
    const {
        data: appealData,
        setData: setAppealData,
        post: postAppeal,
        processing: appealProcessing,
        errors: appealErrors,
        reset: resetAppeal,
        recentlySuccessful: appealSuccess,
    } = useForm({
        subject: 'Account Restriction Compliance Appeal',
        contact_phone: user.phone || '',
        message: '',
    });

    const handleMarkAllRead = () => {
        router.post(route('notifications.mark-read'), {}, { preserveScroll: true });
    };

    const handleAppealSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        postAppeal(route('support.appeals.store'), {
            onSuccess: () => {
                resetAppeal('message');
                setTimeout(() => setShowAppealModal(false), 2000);
            },
        });
    };

    const getRoleBadge = (role: string) => {
        switch (role) {
            case 'admin':
                return (
                    <span className="inline-flex items-center rounded-full bg-purple-950/80 px-2.5 py-0.5 text-xs font-semibold text-purple-300 border border-purple-700">
                        Chief Auditor
                    </span>
                );
            case 'accountant':
                return (
                    <span className="inline-flex items-center rounded-full bg-blue-950/80 px-2.5 py-0.5 text-xs font-semibold text-blue-300 border border-blue-700">
                        Finance Officer
                    </span>
                );
            default:
                return (
                    <span className="inline-flex items-center rounded-full bg-emerald-950/80 px-2.5 py-0.5 text-xs font-semibold text-emerald-300 border border-emerald-700">
                        Merchant Payer
                    </span>
                );
        }
    };

    return (
        <div className="min-h-screen bg-slate-900 text-slate-100 selection:bg-indigo-500 selection:text-white">
            {/* Persistent Red Security Warning Banner for Blacklisted Accounts */}
            {user.is_blacklisted && (
                <aside aria-label="Account restriction banner" className="bg-gradient-to-r from-red-950 via-red-900 to-rose-950 border-b border-red-700/80 px-4 py-3 text-white text-xs shadow-2xl relative z-50">
                    <div className="mx-auto max-w-7xl flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                        <div className="flex items-start gap-3">
                            <div className="h-8 w-8 rounded-xl bg-red-600/30 border border-red-500/50 flex items-center justify-center shrink-0 text-base shadow-sm">
                                ⛔
                            </div>
                            <div>
                                <div className="font-bold flex flex-wrap items-center gap-2 text-red-100">
                                    <span>Account Restricted by Compliance & Fraud Prevention</span>
                                    <span className="px-2 py-0.5 rounded text-[10px] bg-red-950 border border-red-500 text-red-300 font-mono font-bold tracking-wider">
                                        SLIP UPLOADS BLOCKED
                                    </span>
                                </div>
                                <p className="text-[11px] text-red-200/90 mt-0.5">
                                    Audit Reason: <strong className="text-white">{user.blacklist_reason || 'Suspicious payment slip activity or altered receipts detected.'}</strong>
                                </p>
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-3 text-[11px]">
                            <div className="text-red-200 hidden sm:block">
                                Hotline: <strong className="font-mono text-white">09-770001122</strong> • Email: <strong className="font-mono text-white">disputes@reconguard.test</strong>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowAppealModal(true)}
                                className="rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold px-3.5 py-1.5 shadow-lg shadow-red-950/40 transition text-xs whitespace-nowrap"
                            >
                                Contact Customer Service / Submit Appeal →
                            </button>
                        </div>
                    </div>
                </aside>
            )}

            {/* Navigation Header */}
            <nav className="border-b border-slate-800 bg-slate-900/95 backdrop-blur sticky top-0 z-40">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <div className="flex h-16 justify-between">
                        <div className="flex">
                            <div className="flex shrink-0 items-center">
                                <Link href="/" className="flex items-center space-x-2">
                                    <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-indigo-500 via-sky-500 to-emerald-400 p-0.5 shadow-lg shadow-indigo-500/20">
                                        <div className="h-full w-full rounded-[10px] bg-slate-900 flex items-center justify-center font-black text-indigo-400 text-sm tracking-tighter">
                                            RG
                                        </div>
                                    </div>
                                    <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
                                        Recon<span className="text-indigo-400">Guard</span>
                                    </span>
                                </Link>
                            </div>

                            <div className="hidden space-x-6 sm:-my-px sm:ms-8 sm:flex">
                                <NavLink
                                    href={route('dashboard')}
                                    active={route().current('dashboard')}
                                >
                                    Dashboard
                                </NavLink>

                                <NavLink
                                    href={route('invoices.index')}
                                    active={route().current('invoices.*')}
                                >
                                    Invoices & Slips
                                </NavLink>

                                {canAccessStudio && (
                                    <NavLink
                                        href={route('bank-statements.index')}
                                        active={route().current('bank-statements.*')}
                                    >
                                        Bank Statements
                                    </NavLink>
                                )}

                                {canAccessStudio && (
                                    <NavLink
                                        href={route('reconciliation.index')}
                                        active={route().current('reconciliation.*')}
                                    >
                                        3-Way Reconciliation
                                    </NavLink>
                                )}

                                {userRole === 'admin' && (
                                    <NavLink
                                        href={route('admin.dashboard')}
                                        active={route().current('admin.dashboard') || route().current('admin.gate')}
                                    >
                                        <span className="flex items-center gap-1.5">
                                            <span className="h-2 w-2 rounded-full bg-purple-400"></span>
                                            Auditor Governance
                                        </span>
                                    </NavLink>
                                )}

                                {canAccessStudio && (
                                    <NavLink
                                        href={route('admin.audit-report')}
                                        active={route().current('admin.audit-report')}
                                    >
                                        Audit Report
                                    </NavLink>
                                )}

                                {canAccessStudio && (
                                    <NavLink
                                        href={route('simulation-studio.index')}
                                        active={route().current('simulation-studio.*')}
                                    >
                                        <span className="flex items-center gap-1.5">
                                            <span className="h-2 w-2 rounded-full bg-indigo-400"></span>
                                            Simulation Studio
                                        </span>
                                    </NavLink>
                                )}
                            </div>
                        </div>

                        {/* Top Right Controls */}
                        <div className="hidden sm:ms-6 sm:flex sm:items-center sm:space-x-3">
                            <div>{getRoleBadge(userRole)}</div>

                            {/* Notification Bell Dropdown */}
                            <div className="relative">
                                <button
                                    type="button"
                                    onClick={() => setShowNotificationDropdown(!showNotificationDropdown)}
                                    className="relative rounded-xl border border-slate-700 bg-slate-800/80 p-2 text-slate-300 hover:bg-slate-700 hover:text-white transition focus:outline-none"
                                    title="Account & Compliance Notifications"
                                >
                                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                                    </svg>
                                    {unread_notifications_count > 0 && (
                                        <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-black text-white ring-2 ring-slate-900 animate-pulse">
                                            {unread_notifications_count}
                                        </span>
                                    )}
                                </button>

                                {showNotificationDropdown && (
                                    <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl border border-slate-700 bg-slate-900 p-4 shadow-2xl z-50 space-y-3">
                                        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                                            <div className="flex items-center gap-1.5 font-bold text-xs text-white">
                                                <span>🔔</span> Account Notifications
                                            </div>
                                            {unread_notifications_count > 0 && (
                                                <button
                                                    type="button"
                                                    onClick={handleMarkAllRead}
                                                    className="text-[11px] text-indigo-400 hover:underline font-semibold"
                                                >
                                                    Mark all as read
                                                </button>
                                            )}
                                        </div>

                                        <div className="max-h-64 overflow-y-auto space-y-2">
                                            {notifications.length === 0 ? (
                                                <p className="text-center text-xs text-slate-500 py-6">
                                                    No account alerts at this time.
                                                </p>
                                            ) : (
                                                notifications.map((n: any) => (
                                                    <div
                                                        key={n.id}
                                                        className={`p-3 rounded-xl border text-xs transition ${
                                                            n.type === 'security_restriction'
                                                                ? 'bg-red-950/40 border-red-800/60 text-red-200'
                                                                : n.type === 'account_restored'
                                                                ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-200'
                                                                : 'bg-slate-800/60 border-slate-700/60 text-slate-300'
                                                        }`}
                                                    >
                                                        <div className="flex items-center justify-between font-bold">
                                                            <span>{n.title}</span>
                                                            {!n.read_at && (
                                                                <span className="h-2 w-2 rounded-full bg-indigo-400"></span>
                                                            )}
                                                        </div>
                                                        <p className="text-[11px] mt-1 leading-relaxed">{n.message}</p>
                                                        <span className="text-[10px] text-slate-400 block mt-1.5">
                                                            {new Date(n.created_at).toLocaleDateString()}
                                                        </span>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* User Profile Dropdown */}
                            <div className="relative ms-1">
                                <Dropdown>
                                    <Dropdown.Trigger>
                                        <span className="inline-flex rounded-md">
                                            <button
                                                type="button"
                                                className="inline-flex items-center rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-1.5 text-sm font-medium leading-4 text-slate-200 transition duration-150 ease-in-out hover:bg-slate-700 hover:text-white focus:outline-none"
                                            >
                                                <div className="text-left me-2">
                                                    <div className="font-semibold text-xs text-white">{user.name}</div>
                                                    <div className="text-[10px] text-slate-400 truncate max-w-[140px]">{user.company_name || user.email}</div>
                                                </div>

                                                <svg
                                                    className="-me-0.5 ms-1 h-4 w-4 text-slate-400"
                                                    xmlns="http://www.w3.org/2000/svg"
                                                    viewBox="0 0 20 20"
                                                    fill="currentColor"
                                                >
                                                    <path
                                                        fillRule="evenodd"
                                                        d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                                                        clipRule="evenodd"
                                                    />
                                                </svg>
                                            </button>
                                        </span>
                                    </Dropdown.Trigger>

                                    <Dropdown.Content contentClasses="py-1 bg-slate-800 border border-slate-700 shadow-xl rounded-lg">
                                        <div className="px-4 py-2 border-b border-slate-700">
                                            <p className="text-xs text-slate-400">Signed in as</p>
                                            <p className="text-xs font-semibold text-slate-200 truncate">{user.email}</p>
                                        </div>
                                        <Dropdown.Link
                                            href={route('profile.edit')}
                                            className="text-slate-300 hover:bg-slate-700 hover:text-white"
                                        >
                                            Profile Settings
                                        </Dropdown.Link>
                                        <Dropdown.Link
                                            href={route('logout')}
                                            method="post"
                                            as="button"
                                            className="text-red-400 hover:bg-slate-700 hover:text-red-300"
                                        >
                                            Log Out
                                        </Dropdown.Link>
                                    </Dropdown.Content>
                                </Dropdown>
                            </div>
                        </div>

                        {/* Mobile Menu Button */}
                        <div className="-me-2 flex items-center sm:hidden gap-2">
                            {unread_notifications_count > 0 && (
                                <button
                                    type="button"
                                    onClick={() => setShowNotificationDropdown(!showNotificationDropdown)}
                                    className="relative rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
                                >
                                    <span className="h-2 w-2 rounded-full bg-red-500 absolute top-1 right-1"></span>
                                    🔔
                                </button>
                            )}
                            <button
                                onClick={() => setShowingNavigationDropdown((prev) => !prev)}
                                className="inline-flex items-center justify-center rounded-md p-2 text-slate-400 transition duration-150 ease-in-out hover:bg-slate-800 hover:text-white focus:outline-none"
                            >
                                <svg className="h-6 w-6" stroke="currentColor" fill="none" viewBox="0 0 24 24">
                                    <path
                                        className={!showingNavigationDropdown ? 'inline-flex' : 'hidden'}
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth="2"
                                        d="M4 6h16M4 12h16M4 18h16"
                                    />
                                    <path
                                        className={showingNavigationDropdown ? 'inline-flex' : 'hidden'}
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth="2"
                                        d="M6 18L18 6M6 6l12 12"
                                    />
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Mobile Navigation Dropdown */}
                <div className={(showingNavigationDropdown ? 'block' : 'hidden') + ' sm:hidden border-b border-slate-800 bg-slate-900'}>
                    <div className="space-y-1 pb-3 pt-2">
                        <ResponsiveNavLink href={route('dashboard')} active={route().current('dashboard')}>
                            Dashboard
                        </ResponsiveNavLink>

                        <ResponsiveNavLink href={route('invoices.index')} active={route().current('invoices.*')}>
                            Invoices & Slips
                        </ResponsiveNavLink>

                        {canAccessStudio && (
                            <ResponsiveNavLink href={route('bank-statements.index')} active={route().current('bank-statements.*')}>
                                Bank Statements
                            </ResponsiveNavLink>
                        )}

                        {canAccessStudio && (
                            <ResponsiveNavLink href={route('reconciliation.index')} active={route().current('reconciliation.*')}>
                                3-Way Reconciliation
                            </ResponsiveNavLink>
                        )}

                        {userRole === 'admin' && (
                            <ResponsiveNavLink href={route('admin.dashboard')} active={route().current('admin.dashboard') || route().current('admin.gate')}>
                                Auditor Governance
                            </ResponsiveNavLink>
                        )}

                        {canAccessStudio && (
                            <ResponsiveNavLink href={route('admin.audit-report')} active={route().current('admin.audit-report')}>
                                Audit Report
                            </ResponsiveNavLink>
                        )}

                        {canAccessStudio && (
                            <ResponsiveNavLink href={route('simulation-studio.index')} active={route().current('simulation-studio.*')}>
                                Simulation Studio
                            </ResponsiveNavLink>
                        )}
                    </div>

                    <div className="border-t border-slate-800 pb-1 pt-4">
                        <div className="px-4">
                            <div className="text-base font-medium text-white">{user.name}</div>
                            <div className="text-sm font-medium text-slate-400">{user.email}</div>
                        </div>

                        <div className="mt-3 space-y-1">
                            <ResponsiveNavLink href={route('profile.edit')} className="text-slate-300">
                                Profile
                            </ResponsiveNavLink>
                            <ResponsiveNavLink method="post" href={route('logout')} as="button" className="text-red-400">
                                Log Out
                            </ResponsiveNavLink>
                        </div>
                    </div>
                </div>
            </nav>

            {/* Flash Alerts */}
            {flash?.success && (
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4">
                    <div className="rounded-xl bg-emerald-950/80 border border-emerald-500/50 p-4 text-emerald-200 text-sm flex items-center justify-between shadow-lg">
                        <span>{flash.success}</span>
                    </div>
                </div>
            )}
            {flash?.error && (
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4">
                    <div className="rounded-xl bg-rose-950/80 border border-rose-500/50 p-4 text-rose-200 text-sm flex items-center justify-between shadow-lg">
                        <span>{flash.error}</span>
                    </div>
                </div>
            )}

            {header && (
                <header className="border-b border-slate-800 bg-slate-900/60">
                    <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
                        {header}
                    </div>
                </header>
            )}

            <main className="py-8">{children}</main>

            {/* Customer Support Compliance Appeal Modal */}
            {showAppealModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
                    <div className="relative w-full max-w-lg rounded-3xl border border-red-800/80 bg-slate-900 p-6 sm:p-8 shadow-2xl space-y-5">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                            <div className="flex items-center gap-2">
                                <span className="text-red-400 text-lg">⛔</span>
                                <h3 className="text-base font-black text-white">Compliance Dispute & Appeal Desk</h3>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowAppealModal(false)}
                                className="text-slate-400 hover:text-white"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="rounded-xl bg-red-950/30 border border-red-900/50 p-3.5 text-xs text-red-200 space-y-1">
                            <span className="font-bold block text-red-300">Account Suspension Reason:</span>
                            <p>{user.blacklist_reason || 'Altered receipt or suspicious payment slip activity detected.'}</p>
                        </div>

                        {appealSuccess ? (
                            <div className="rounded-xl border border-emerald-500/40 bg-emerald-950/30 p-4 text-xs text-emerald-200 text-center">
                                ✓ Your compliance appeal has been submitted to the Chief Auditor. A review decision will be communicated via notification.
                            </div>
                        ) : (
                            <form onSubmit={handleAppealSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                                        Appeal Subject
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={appealData.subject}
                                        onChange={(e) => setAppealData('subject', e.target.value)}
                                        className="w-full rounded-xl border border-slate-700 bg-slate-950 p-2.5 text-xs text-white placeholder-slate-500 focus:border-red-500 focus:ring-1 focus:ring-red-500"
                                    />
                                    {appealErrors.subject && <p className="text-xs text-red-400 mt-1">{appealErrors.subject}</p>}
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                                        Contact Phone (for compliance callbacks)
                                    </label>
                                    <input
                                        type="text"
                                        value={appealData.contact_phone}
                                        onChange={(e) => setAppealData('contact_phone', e.target.value)}
                                        className="w-full rounded-xl border border-slate-700 bg-slate-950 p-2.5 text-xs text-white placeholder-slate-500 focus:border-red-500 focus:ring-1 focus:ring-red-500 font-mono"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                                        Explanation & Proof Details
                                    </label>
                                    <textarea
                                        rows={4}
                                        required
                                        placeholder="Please explain the transaction context, genuine bank confirmation number, or why this restriction was in error..."
                                        value={appealData.message}
                                        onChange={(e) => setAppealData('message', e.target.value)}
                                        className="w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-xs text-white placeholder-slate-500 focus:border-red-500 focus:ring-1 focus:ring-red-500"
                                    />
                                    {appealErrors.message && <p className="text-xs text-red-400 mt-1">{appealErrors.message}</p>}
                                </div>

                                <div className="flex items-center justify-between pt-2">
                                    <button
                                        type="button"
                                        onClick={() => setShowAppealModal(false)}
                                        className="rounded-xl border border-slate-700 px-4 py-2 text-xs font-semibold text-slate-400 hover:bg-slate-800"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={appealProcessing}
                                        className="rounded-xl bg-gradient-to-r from-red-600 to-rose-600 px-5 py-2 text-xs font-bold text-white shadow-lg shadow-red-600/30 hover:from-red-500 hover:to-rose-500 transition disabled:opacity-50"
                                    >
                                        {appealProcessing ? 'Submitting Appeal...' : 'Submit Appeal to Compliance'}
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
