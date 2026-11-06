import ApplicationLogo from '@/Components/ApplicationLogo';
import LanguageSwitcher from '@/Components/LanguageSwitcher';
import ThemeToggle from '@/Components/ThemeToggle';
import UserAvatar from '@/Components/UserAvatar';
import { useLanguage } from '@/Contexts/LanguageContext';
import { Link, router, useForm, usePage } from '@inertiajs/react';
import React, { PropsWithChildren, ReactNode, useState } from 'react';
import { PageProps } from '@/types';

export default function Authenticated({
    header,
    children,
}: PropsWithChildren<{ header?: ReactNode }>) {
    const { auth, flash, notifications = [], unread_notifications_count = 0 } = usePage<PageProps & { notifications?: any[]; unread_notifications_count?: number }>().props;
    const { t } = useLanguage();
    const user = auth.user;
    const userRole = user.roles?.[0] || 'customer';
    const canAccessStudio = userRole === 'admin' || userRole === 'accountant';

    const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
    const [showNotificationDropdown, setShowNotificationDropdown] = useState(false);
    const [showAppealModal, setShowAppealModal] = useState(false);
    const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('reconguard_sidebar_collapsed') === 'true';
        }
        return false;
    });

    const toggleSidebar = () => {
        setSidebarCollapsed(prev => {
            const next = !prev;
            if (typeof window !== 'undefined') {
                localStorage.setItem('reconguard_sidebar_collapsed', String(next));
            }
            return next;
        });
    };

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

    const getNavClass = (isActive: boolean, isMobile = false) => {
        const isCollapsedDesktop = !isMobile && sidebarCollapsed;
        const base = isCollapsedDesktop
            ? "justify-center px-2 py-3 text-base"
            : "px-4 py-3 gap-3 text-sm";

        if (isActive) {
            return `bg-[#705CF6] text-white shadow-sm font-semibold rounded-2xl flex items-center transition-all ${base}`;
        }
        return `text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800/60 font-medium rounded-2xl transition-colors flex items-center ${base}`;
    };

    const renderNavLinks = (isMobile = false) => {
        const onClickHandler = isMobile ? () => setMobileDrawerOpen(false) : undefined;

        if (userRole === 'admin') {
            return (
                <div className="space-y-1.5">
                    {/* Chief Auditor Navigation */}
                    <Link
                        href={route('admin.dashboard')}
                        onClick={onClickHandler}
                        className={getNavClass(Boolean(route().current('admin.dashboard') || route().current('admin.gate')), isMobile)}
                        title={t('nav.governance_dashboard', 'Governance Dashboard')}
                    >
                        <span className="text-base shrink-0">🛡️</span>
                        {(!sidebarCollapsed || isMobile) && (
                            <span className="truncate">{t('nav.governance_dashboard', 'Governance Dashboard')}</span>
                        )}
                    </Link>

                    <Link
                        href={route('admin.users.index')}
                        onClick={onClickHandler}
                        className={getNavClass(Boolean(route().current('admin.users.*')), isMobile)}
                        title={t('nav.staff_users', 'Staff & User Management')}
                    >
                        <span className="text-base shrink-0">👥</span>
                        {(!sidebarCollapsed || isMobile) && (
                            <span className="truncate">{t('nav.staff_users', 'Staff & User Management')}</span>
                        )}
                    </Link>

                    <Link
                        href={route('admin.blacklist.index')}
                        onClick={onClickHandler}
                        className={getNavClass(Boolean(route().current('admin.blacklist.*')), isMobile)}
                        title={t('nav.fraud_blacklist', 'Fraud & Blacklist Center')}
                    >
                        <span className="text-base shrink-0">🚨</span>
                        {(!sidebarCollapsed || isMobile) && (
                            <span className="truncate">{t('nav.fraud_blacklist', 'Fraud & Blacklist Center')}</span>
                        )}
                    </Link>

                    <Link
                        href={route('admin.rollbacks.index')}
                        onClick={onClickHandler}
                        className={getNavClass(Boolean(route().current('admin.rollbacks.*')), isMobile)}
                        title={t('nav.pending_rollbacks', 'Pending Rollbacks Queue')}
                    >
                        <span className="text-base shrink-0">⏳</span>
                        {(!sidebarCollapsed || isMobile) && (
                            <span className="truncate">{t('nav.pending_rollbacks', 'Pending Rollbacks Queue')}</span>
                        )}
                    </Link>

                    <Link
                        href={route('admin.audit-report')}
                        onClick={onClickHandler}
                        className={getNavClass(Boolean(route().current('admin.audit-report')), isMobile)}
                        title={t('nav.official_audit_report', 'Official PDF Audit Report')}
                    >
                        <span className="text-base shrink-0">📋</span>
                        {(!sidebarCollapsed || isMobile) && (
                            <span className="truncate">{t('nav.official_audit_report', 'Official PDF Audit Report')}</span>
                        )}
                    </Link>

                    <Link
                        href={route('profile.edit')}
                        onClick={onClickHandler}
                        className={getNavClass(Boolean(route().current('profile.edit')), isMobile)}
                        title={t('nav.profile', 'Profile Settings')}
                    >
                        <span className="text-base shrink-0">👤</span>
                        {(!sidebarCollapsed || isMobile) && (
                            <span className="truncate">{t('nav.profile', 'Profile Settings')}</span>
                        )}
                    </Link>
                </div>
            );
        }

        if (userRole === 'accountant') {
            return (
                <div className="space-y-1.5">
                    {/* Senior Accountant Navigation */}
                    <Link
                        href={route('dashboard')}
                        onClick={onClickHandler}
                        className={getNavClass(Boolean(route().current('dashboard')), isMobile)}
                        title={t('nav.dashboard', 'Dashboard')}
                    >
                        <span className="text-base shrink-0">📊</span>
                        {(!sidebarCollapsed || isMobile) && (
                            <span className="truncate">{t('nav.dashboard', 'Dashboard')}</span>
                        )}
                    </Link>

                    <Link
                        href={route('invoices.index')}
                        onClick={onClickHandler}
                        className={getNavClass(Boolean(route().current('invoices.*')), isMobile)}
                        title={t('nav.invoices', 'Invoices & Slips')}
                    >
                        <span className="text-base shrink-0">📄</span>
                        {(!sidebarCollapsed || isMobile) && (
                            <span className="truncate">{t('nav.invoices', 'Invoices & Slips')}</span>
                        )}
                    </Link>

                    <Link
                        href={route('bank-statements.index')}
                        onClick={onClickHandler}
                        className={getNavClass(Boolean(route().current('bank-statements.*')), isMobile)}
                        title={t('nav.statements', 'Bank Statements')}
                    >
                        <span className="text-base shrink-0">🏦</span>
                        {(!sidebarCollapsed || isMobile) && (
                            <span className="truncate">{t('nav.statements', 'Bank Statements')}</span>
                        )}
                    </Link>

                    <Link
                        href={route('reconciliation.index')}
                        onClick={onClickHandler}
                        className={getNavClass(Boolean(route().current('reconciliation.*')), isMobile)}
                        title={t('nav.reconciliation', '3-Way Reconciliation')}
                    >
                        <span className="text-base shrink-0">⚖️</span>
                        {(!sidebarCollapsed || isMobile) && (
                            <span className="truncate">{t('nav.reconciliation', '3-Way Reconciliation')}</span>
                        )}
                    </Link>

                    <Link
                        href={route('admin.audit-report')}
                        onClick={onClickHandler}
                        className={getNavClass(Boolean(route().current('admin.audit-report')), isMobile)}
                        title={t('nav.audit_report', 'Audit Report')}
                    >
                        <span className="text-base shrink-0">📋</span>
                        {(!sidebarCollapsed || isMobile) && (
                            <span className="truncate">{t('nav.audit_report', 'Audit Report')}</span>
                        )}
                    </Link>

                    <Link
                        href={route('profile.edit')}
                        onClick={onClickHandler}
                        className={getNavClass(Boolean(route().current('profile.edit')), isMobile)}
                        title={t('nav.profile', 'Profile Settings')}
                    >
                        <span className="text-base shrink-0">👤</span>
                        {(!sidebarCollapsed || isMobile) && (
                            <span className="truncate">{t('nav.profile', 'Profile Settings')}</span>
                        )}
                    </Link>

                    <div className="pt-3 border-t border-slate-200/80 dark:border-slate-800/80 my-2">
                        <Link
                            href={route('simulation-studio.index')}
                            onClick={onClickHandler}
                            className={getNavClass(Boolean(route().current('simulation-studio.*')), isMobile)}
                            title={t('nav.simulation_lab', 'Demo Simulation Lab')}
                        >
                            <span className="text-base shrink-0">🧪</span>
                            {(!sidebarCollapsed || isMobile) && (
                                <span className="truncate">{t('nav.simulation_lab', 'Demo Simulation Lab')}</span>
                            )}
                        </Link>
                    </div>
                </div>
            );
        }

        // Customer Navigation
        return (
            <div className="space-y-1.5">
                <Link
                    href={route('dashboard')}
                    onClick={onClickHandler}
                    className={getNavClass(Boolean(route().current('dashboard')), isMobile)}
                    title={t('nav.dashboard', 'Dashboard')}
                >
                    <span className="text-base shrink-0">📊</span>
                    {(!sidebarCollapsed || isMobile) && (
                        <span className="truncate">{t('nav.dashboard', 'Dashboard')}</span>
                    )}
                </Link>

                <Link
                    href={route('invoices.index')}
                    onClick={onClickHandler}
                    className={getNavClass(Boolean(route().current('invoices.*')), isMobile)}
                    title={t('nav.my_invoices', 'My Invoices')}
                >
                    <span className="text-base shrink-0">📄</span>
                    {(!sidebarCollapsed || isMobile) && (
                        <span className="truncate">{t('nav.my_invoices', 'My Invoices')}</span>
                    )}
                </Link>

                <Link
                    href={route('profile.edit')}
                    onClick={onClickHandler}
                    className={getNavClass(Boolean(route().current('profile.edit')), isMobile)}
                    title={t('nav.profile', 'Profile Settings')}
                >
                    <span className="text-base shrink-0">👤</span>
                    {(!sidebarCollapsed || isMobile) && (
                        <span className="truncate">{t('nav.profile', 'Profile Settings')}</span>
                    )}
                </Link>
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0B0D14] text-slate-900 dark:text-[#F8FAFC] flex transition-colors duration-200 font-sans">
            {/* Desktop Left Slim/Expanded Vertical Sidebar (w-64 <-> w-20) */}
            <aside className={`hidden md:flex ${sidebarCollapsed ? 'md:w-20' : 'md:w-64'} md:flex-col md:shrink-0 bg-white dark:bg-[#161B26] border-r border-slate-200/80 dark:border-slate-800/80 h-screen sticky top-0 z-30 transition-all duration-300 shadow-sm relative`}>
                {/* Collapsible Sidebar Toggle Button on Upper Right Border */}
                <button
                    type="button"
                    onClick={toggleSidebar}
                    className="absolute -right-3 top-6 z-40 h-6 w-6 rounded-full bg-white dark:bg-[#161B26] border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white shadow-md flex items-center justify-center transition-all hover:scale-110 focus:outline-none"
                    title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                    aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                >
                    <svg
                        className={`w-3.5 h-3.5 transition-transform duration-200 ${sidebarCollapsed ? 'rotate-180' : ''}`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" />
                    </svg>
                </button>

                {/* Official Brand Logo & Header */}
                <div className={`p-5 border-b border-slate-200/80 dark:border-slate-800/80 flex ${sidebarCollapsed ? 'justify-center' : 'items-center'}`}>
                    <Link href="/" className="flex items-center gap-3" title="ReconGuard">
                        <ApplicationLogo size={sidebarCollapsed ? "sm" : "md"} />
                        {!sidebarCollapsed && (
                            <div>
                                <div className="font-extrabold text-lg tracking-tight text-slate-900 dark:text-white leading-tight">
                                    Recon<span className="text-[#705CF6]">Guard</span>
                                </div>
                                <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                    FinTech Reconciliation
                                </div>
                            </div>
                        )}
                    </Link>
                </div>

                {/* Vertical Navigation Links */}
                <div className="flex-1 overflow-y-auto px-3.5 py-4 space-y-1">
                    {!sidebarCollapsed && (
                        <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                            Main Navigation
                        </div>
                    )}
                    {renderNavLinks(false)}
                </div>

                {/* Bottom Controls (Return to Home, Theme, Language, Logout) */}
                <div className={`p-3.5 border-t border-slate-200/80 dark:border-slate-800/80 bg-slate-50/50 dark:bg-[#161B26]/50 ${sidebarCollapsed ? 'flex flex-col items-center gap-3' : 'space-y-3'}`}>
                    {/* Dedicated Return to Home Page / Public Portal */}
                    <Link
                        href="/"
                        className={`flex items-center ${sidebarCollapsed ? 'justify-center p-2.5' : 'gap-2.5 px-3.5 py-2.5'} rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#161B26] text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/80 text-xs font-semibold transition-all shadow-sm`}
                        title="Public Portal / ပင်မစာမျက်နှာသို့"
                    >
                        <span className="text-base shrink-0">🏠</span>
                        {!sidebarCollapsed && (
                            <span className="truncate">Public Portal / ပင်မစာမျက်နှာသို့</span>
                        )}
                    </Link>

                    {sidebarCollapsed ? (
                        <>
                            <ThemeToggle />
                            <LanguageSwitcher />
                            <Link
                                href={route('logout')}
                                method="post"
                                as="button"
                                className="p-2 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                                title={t('nav.logout', 'Log Out')}
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                </svg>
                            </Link>
                        </>
                    ) : (
                        <div className="flex items-center justify-between px-1">
                            <div className="flex items-center gap-2">
                                <ThemeToggle />
                                <LanguageSwitcher />
                            </div>
                            <Link
                                href={route('logout')}
                                method="post"
                                as="button"
                                className="p-2 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                                title={t('nav.logout', 'Log Out')}
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                </svg>
                            </Link>
                        </div>
                    )}
                </div>
            </aside>

            {/* Mobile Slide-Out Drawer Navigation */}
            {mobileDrawerOpen && (
                <div className="fixed inset-0 z-50 flex md:hidden">
                    <div
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
                        onClick={() => setMobileDrawerOpen(false)}
                    />
                    <div className="relative flex flex-col w-72 max-w-xs bg-white dark:bg-[#161B26] border-r border-slate-200 dark:border-slate-800 p-5 shadow-2xl z-10 h-full">
                        <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
                            <Link href="/" className="flex items-center gap-2.5">
                                <ApplicationLogo size="sm" />
                                <div>
                                    <div className="font-extrabold text-base text-slate-900 dark:text-white leading-tight">
                                        Recon<span className="text-[#705CF6]">Guard</span>
                                    </div>
                                    <div className="text-[9px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                        FinTech Reconciliation
                                    </div>
                                </div>
                            </Link>
                            <button
                                type="button"
                                onClick={() => setMobileDrawerOpen(false)}
                                className="p-1 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto py-3 space-y-1">
                            {renderNavLinks(true)}
                        </div>

                        <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
                            {/* Return to Home in Mobile Drawer */}
                            <Link
                                href="/"
                                className="flex items-center gap-2.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white text-xs font-semibold shadow-sm"
                            >
                                <span className="text-base shrink-0">🏠</span>
                                <span className="truncate">Public Portal / ပင်မစာမျက်နှာသို့</span>
                            </Link>

                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <ThemeToggle />
                                    <LanguageSwitcher />
                                </div>
                                <Link
                                    href={route('logout')}
                                    method="post"
                                    as="button"
                                    className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                                    title={t('nav.logout', 'Log Out')}
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                    </svg>
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Main Application Canvas */}
            <div className="flex-1 flex flex-col min-w-0 min-h-screen">
                {/* Persistent Red Security Warning Banner for Blacklisted Accounts */}
                {user.is_blacklisted && (
                    <aside aria-label="Account restriction banner" className="bg-gradient-to-r from-red-950 via-red-900 to-rose-950 border-b border-red-700/80 px-4 py-3 text-white text-xs shadow-2xl relative z-40">
                        <div className="mx-auto max-w-7xl flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                            <div className="flex items-start gap-3">
                                <div className="h-8 w-8 rounded-xl bg-red-600/30 border border-red-500/50 flex items-center justify-center shrink-0 text-base shadow-sm">
                                    ⛔
                                </div>
                                <div>
                                    <div className="font-bold flex flex-wrap items-center gap-2 text-red-100">
                                        <span>{t('banner.account_restricted', 'Account Restricted by Compliance & Fraud Prevention')}</span>
                                        <span className="px-2 py-0.5 rounded text-[10px] bg-red-950 border border-red-500 text-red-300 font-mono font-bold tracking-wider">
                                            {t('banner.slip_blocked', 'SLIP UPLOADS BLOCKED')}
                                        </span>
                                    </div>
                                    <p className="text-[11px] text-red-200/90 mt-0.5">
                                        Audit Reason: <strong className="text-white">{user.blacklist_reason || 'Suspicious payment slip activity or altered receipts detected.'}</strong>
                                    </p>
                                </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-3 text-[11px]">
                                <div className="text-red-200 hidden sm:block">
                                    {t('banner.hotline', 'Hotline')}: <strong className="font-mono text-white">09-770001122</strong> • {t('banner.email', 'Email')}: <strong className="font-mono text-white">disputes@reconguard.test</strong>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setShowAppealModal(true)}
                                    className="rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold px-3.5 py-1.5 shadow-lg shadow-red-950/40 transition text-xs whitespace-nowrap"
                                >
                                    {t('banner.contact_support', 'Contact Customer Service / Submit Appeal →')}
                                </button>
                            </div>
                        </div>
                    </aside>
                )}

                {/* Top Greeting Bar */}
                <header className="sticky top-0 z-20 bg-white/80 dark:bg-[#161B26]/80 backdrop-blur border-b border-slate-200/80 dark:border-slate-800/80 px-4 sm:px-6 lg:px-8 py-3.5 transition-colors">
                    <div className="flex items-center justify-between gap-4">
                        {/* Left: Mobile Toggle & Greeting */}
                        <div className="flex items-center gap-3 min-w-0">
                            <button
                                type="button"
                                onClick={() => setMobileDrawerOpen(true)}
                                className="md:hidden p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                                title="Open navigation"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                                </svg>
                            </button>

                            <div className="min-w-0">
                                <h1 className="text-lg sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight truncate">
                                    Welcome back, <span className="text-[#705CF6]">{user.name}</span>!
                                </h1>
                                <p className="text-xs text-slate-500 dark:text-slate-400 hidden sm:block">
                                    Real-time automated reconciliation & fraud monitoring
                                </p>
                            </div>
                        </div>

                        {/* Right: Notification Bell & Clean User Avatar Header */}
                        <div className="flex items-center gap-3 shrink-0">
                            {/* Notification Bell Dropdown */}
                            <div className="relative">
                                <button
                                    type="button"
                                    onClick={() => setShowNotificationDropdown(!showNotificationDropdown)}
                                    className="relative rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#1E2536] p-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800 transition shadow-sm"
                                    title="Account & Compliance Notifications"
                                >
                                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                                    </svg>
                                    {unread_notifications_count > 0 && (
                                        <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-black text-white ring-2 ring-white dark:ring-[#161B26] animate-pulse">
                                            {unread_notifications_count}
                                        </span>
                                    )}
                                </button>

                                {showNotificationDropdown && (
                                    <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#161B26] p-4 shadow-2xl z-50 space-y-3">
                                        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
                                            <div className="flex items-center gap-1.5 font-bold text-xs text-slate-900 dark:text-white">
                                                <span>🔔</span> {t('general.notifications', 'Account Notifications')}
                                            </div>
                                            {unread_notifications_count > 0 && (
                                                <button
                                                    type="button"
                                                    onClick={handleMarkAllRead}
                                                    className="text-[11px] text-[#705CF6] hover:underline font-semibold"
                                                >
                                                    {t('action.mark_all_read', 'Mark all as read')}
                                                </button>
                                            )}
                                        </div>

                                        <div className="max-h-64 overflow-y-auto space-y-2">
                                            {notifications.length === 0 ? (
                                                <p className="text-center text-xs text-slate-500 py-6">
                                                    {t('general.no_notifications', 'No notifications yet.')}
                                                </p>
                                            ) : (
                                                notifications.map((n: any) => (
                                                    <div
                                                        key={n.id}
                                                        className={`p-3 rounded-xl border text-xs transition ${
                                                            n.type === 'security_restriction'
                                                                ? 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800/60 text-red-800 dark:text-red-200'
                                                                : n.type === 'account_restored'
                                                                ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-200'
                                                                : 'bg-slate-50 dark:bg-slate-850 border-slate-200 dark:border-slate-700/60 text-slate-700 dark:text-slate-300'
                                                        }`}
                                                    >
                                                        <div className="flex items-center justify-between font-bold">
                                                            <span>{n.title}</span>
                                                            {!n.read_at && (
                                                                <span className="h-2 w-2 rounded-full bg-[#705CF6]"></span>
                                                            )}
                                                        </div>
                                                        <p className="text-[11px] mt-1 leading-relaxed">{n.message}</p>
                                                        <span className="text-[10px] text-slate-400 block mt-1.5 font-mono">
                                                            {new Date(n.created_at).toLocaleDateString()}
                                                        </span>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Clean User Avatar & Identity (Static Display, No Redundant Dropdown) */}
                            <div className="inline-flex items-center gap-2.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#1E2536] p-1.5 sm:px-3 sm:py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 shadow-sm">
                                <UserAvatar user={user} size="sm" />
                                <span className="hidden sm:inline font-bold text-slate-900 dark:text-white truncate max-w-[130px]">
                                    {user.name}
                                </span>
                            </div>
                        </div>
                    </div>
                </header>

                {/* Optional Dynamic Header Section */}
                {header && (
                    <div className="border-b border-slate-200/80 dark:border-slate-800/80 bg-white/50 dark:bg-[#161B26]/50 px-4 sm:px-6 lg:px-8 py-4 transition-colors">
                        <div className="max-w-7xl mx-auto">
                            {header}
                        </div>
                    </div>
                )}

                {/* Flash Messages */}
                {flash?.success && (
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4 w-full">
                        <div className="rounded-2xl bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-500/50 p-4 text-emerald-800 dark:text-emerald-200 text-xs sm:text-sm flex items-center justify-between shadow-sm">
                            <span className="flex items-center gap-2">✓ {flash.success}</span>
                        </div>
                    </div>
                )}
                {flash?.error && (
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4 w-full">
                        <div className="rounded-2xl bg-rose-50 dark:bg-rose-950/80 border border-rose-300 dark:border-rose-500/50 p-4 text-rose-800 dark:text-rose-200 text-xs sm:text-sm flex items-center justify-between shadow-sm">
                            <span className="flex items-center gap-2">⚠️ {flash.error}</span>
                        </div>
                    </div>
                )}

                {/* Main Dynamic Content Area */}
                <main className="flex-1 pb-20 md:pb-8 w-full">
                    {children}
                </main>
            </div>

            {/* Mobile Bottom Navigation Bar (md:hidden) */}
            <nav
                aria-label="Mobile Quick Navigation"
                className="fixed bottom-0 inset-x-0 z-30 bg-white/95 dark:bg-[#161B26]/95 backdrop-blur border-t border-slate-200 dark:border-slate-800 md:hidden shadow-lg transition-colors duration-200"
            >
                <div className="grid grid-cols-4 h-16 max-w-md mx-auto">
                    <Link
                        href={userRole === 'admin' ? route('admin.dashboard') : route('dashboard')}
                        className={`flex flex-col items-center justify-center text-[10px] font-semibold transition py-1 ${
                            route().current('dashboard') || route().current('admin.dashboard')
                                ? 'text-[#705CF6] font-bold'
                                : 'text-slate-500 dark:text-slate-400'
                        }`}
                    >
                        <span className="text-base">📊</span>
                        <span className="truncate max-w-[62px]">{t('nav.dashboard', 'Dashboard')}</span>
                    </Link>

                    <Link
                        href={route('invoices.index')}
                        className={`flex flex-col items-center justify-center text-[10px] font-semibold transition py-1 ${
                            route().current('invoices.*')
                                ? 'text-[#705CF6] font-bold'
                                : 'text-slate-500 dark:text-slate-400'
                        }`}
                    >
                        <span className="text-base">📄</span>
                        <span className="truncate max-w-[62px]">{t('nav.invoices', 'Invoices')}</span>
                    </Link>

                    {canAccessStudio ? (
                        <Link
                            href={route('reconciliation.index')}
                            className={`flex flex-col items-center justify-center text-[10px] font-semibold transition py-1 ${
                                route().current('reconciliation.*')
                                    ? 'text-[#705CF6] font-bold'
                                    : 'text-slate-500 dark:text-slate-400'
                            }`}
                        >
                            <span className="text-base">⚖️</span>
                            <span className="truncate max-w-[62px]">{t('nav.reconciliation', 'Reconcile')}</span>
                        </Link>
                    ) : (
                        <Link
                            href={route('profile.edit')}
                            className={`flex flex-col items-center justify-center text-[10px] font-semibold transition py-1 ${
                                route().current('profile.edit')
                                    ? 'text-[#705CF6] font-bold'
                                    : 'text-slate-500 dark:text-slate-400'
                            }`}
                        >
                            <span className="text-base">👤</span>
                            <span className="truncate max-w-[62px]">{t('nav.profile', 'Profile')}</span>
                        </Link>
                    )}

                    <Link
                        href={route('profile.edit')}
                        className={`flex flex-col items-center justify-center text-[10px] font-semibold transition py-1 ${
                            route().current('profile.edit')
                                ? 'text-[#705CF6] font-bold'
                                : 'text-slate-500 dark:text-slate-400'
                        }`}
                    >
                        <span className="text-base">⚙️</span>
                        <span className="truncate max-w-[62px]">{t('nav.profile', 'Settings')}</span>
                    </Link>
                </div>
            </nav>

            {/* Customer Support Compliance Appeal Modal */}
            {showAppealModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
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
