import ApplicationLogo from '@/Components/ApplicationLogo';
import Dropdown from '@/Components/Dropdown';
import NavLink from '@/Components/NavLink';
import ResponsiveNavLink from '@/Components/ResponsiveNavLink';
import { Link, usePage } from '@inertiajs/react';
import { PropsWithChildren, ReactNode, useState } from 'react';
import { PageProps } from '@/types';

export default function Authenticated({
    header,
    children,
}: PropsWithChildren<{ header?: ReactNode }>) {
    const { auth, flash } = usePage<PageProps>().props;
    const user = auth.user;
    const userRole = user.roles?.[0] || 'customer';
    const canAccessStudio = userRole === 'admin' || userRole === 'accountant';

    const [showingNavigationDropdown, setShowingNavigationDropdown] =
        useState(false);

    const getRoleBadge = (role: string) => {
        switch (role) {
            case 'admin':
                return (
                    <span className="inline-flex items-center rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-semibold text-purple-800 border border-purple-200">
                        Chief Auditor
                    </span>
                );
            case 'accountant':
                return (
                    <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-800 border border-blue-200">
                        Finance Officer
                    </span>
                );
            default:
                return (
                    <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 border border-emerald-200">
                        Merchant Payer
                    </span>
                );
        }
    };

    return (
        <div className="min-h-screen bg-slate-900 text-slate-100 selection:bg-indigo-500 selection:text-white">
            <nav className="border-b border-slate-800 bg-slate-900/90 backdrop-blur sticky top-0 z-50">
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

                            <div className="hidden space-x-8 sm:-my-px sm:ms-10 sm:flex">
                                <NavLink
                                    href={route('dashboard')}
                                    active={route().current('dashboard')}
                                    className="text-slate-300 hover:text-white"
                                >
                                    Dashboard
                                </NavLink>

                                <NavLink
                                    href={route('invoices.index')}
                                    active={route().current('invoices.*')}
                                    className="text-slate-300 hover:text-white"
                                >
                                    Invoices & Slips
                                </NavLink>

                                {canAccessStudio && (
                                    <NavLink
                                        href={route('bank-statements.index')}
                                        active={route().current('bank-statements.*')}
                                        className="text-slate-300 hover:text-white"
                                    >
                                        Bank Statements
                                    </NavLink>
                                )}

                                {canAccessStudio && (
                                    <NavLink
                                        href={route('reconciliation.index')}
                                        active={route().current('reconciliation.*')}
                                        className="text-slate-300 hover:text-white"
                                    >
                                        3-Way Reconciliation
                                    </NavLink>
                                )}

                                {canAccessStudio && (
                                    <NavLink
                                        href={route('simulation-studio.index')}
                                        active={route().current('simulation-studio.*')}
                                        className="text-slate-300 hover:text-white"
                                    >
                                        <span className="flex items-center gap-1.5">
                                            <span className="h-2 w-2 rounded-full bg-indigo-400"></span>
                                            Simulation Studio
                                        </span>
                                    </NavLink>
                                )}
                            </div>
                        </div>

                        <div className="hidden sm:ms-6 sm:flex sm:items-center sm:space-x-3">
                            <div>{getRoleBadge(userRole)}</div>

                            <div className="relative ms-3">
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

                        <div className="-me-2 flex items-center sm:hidden">
                            <button
                                onClick={() =>
                                    setShowingNavigationDropdown(
                                        (previousState) => !previousState,
                                    )
                                }
                                className="inline-flex items-center justify-center rounded-md p-2 text-slate-400 transition duration-150 ease-in-out hover:bg-slate-800 hover:text-white focus:outline-none"
                            >
                                <svg
                                    className="h-6 w-6"
                                    stroke="currentColor"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        className={
                                            !showingNavigationDropdown
                                                ? 'inline-flex'
                                                : 'hidden'
                                        }
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth="2"
                                        d="M4 6h16M4 12h16M4 18h16"
                                    />
                                    <path
                                        className={
                                            showingNavigationDropdown
                                                ? 'inline-flex'
                                                : 'hidden'
                                        }
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

                <div
                    className={
                        (showingNavigationDropdown ? 'block' : 'hidden') +
                        ' sm:hidden border-b border-slate-800 bg-slate-900'
                    }
                >
                    <div className="space-y-1 pb-3 pt-2">
                        <ResponsiveNavLink
                            href={route('dashboard')}
                            active={route().current('dashboard')}
                            className="text-slate-200"
                        >
                            Dashboard
                        </ResponsiveNavLink>

                        <ResponsiveNavLink
                            href={route('invoices.index')}
                            active={route().current('invoices.*')}
                            className="text-slate-200"
                        >
                            Invoices & Slips
                        </ResponsiveNavLink>

                        {canAccessStudio && (
                            <ResponsiveNavLink
                                href={route('bank-statements.index')}
                                active={route().current('bank-statements.*')}
                                className="text-slate-200"
                            >
                                Bank Statements
                            </ResponsiveNavLink>
                        )}

                        {canAccessStudio && (
                            <ResponsiveNavLink
                                href={route('reconciliation.index')}
                                active={route().current('reconciliation.*')}
                                className="text-slate-200"
                            >
                                3-Way Reconciliation
                            </ResponsiveNavLink>
                        )}

                        {canAccessStudio && (
                            <ResponsiveNavLink
                                href={route('simulation-studio.index')}
                                active={route().current('simulation-studio.*')}
                                className="text-slate-200"
                            >
                                Simulation Studio
                            </ResponsiveNavLink>
                        )}
                    </div>

                    <div className="border-t border-slate-800 pb-1 pt-4">
                        <div className="px-4">
                            <div className="text-base font-medium text-white">
                                {user.name}
                            </div>
                            <div className="text-sm font-medium text-slate-400">
                                {user.email}
                            </div>
                        </div>

                        <div className="mt-3 space-y-1">
                            <ResponsiveNavLink href={route('profile.edit')} className="text-slate-300">
                                Profile
                            </ResponsiveNavLink>
                            <ResponsiveNavLink
                                method="post"
                                href={route('logout')}
                                as="button"
                                className="text-red-400"
                            >
                                Log Out
                            </ResponsiveNavLink>
                        </div>
                    </div>
                </div>
            </nav>

            {/* Flash Alerts */}
            {flash?.success && (
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4">
                    <div className="rounded-lg bg-emerald-950/80 border border-emerald-500/50 p-4 text-emerald-200 text-sm flex items-center justify-between">
                        <span>{flash.success}</span>
                    </div>
                </div>
            )}
            {flash?.error && (
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4">
                    <div className="rounded-lg bg-rose-950/80 border border-rose-500/50 p-4 text-rose-200 text-sm flex items-center justify-between">
                        <span>{flash.error}</span>
                    </div>
                </div>
            )}
            {flash?.warning && (
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4">
                    <div className="rounded-lg bg-amber-950/80 border border-amber-500/50 p-4 text-amber-200 text-sm flex items-center justify-between">
                        <span>{flash.warning}</span>
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
        </div>
    );
}
