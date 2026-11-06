import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router } from '@inertiajs/react';
import React, { useState } from 'react';
import CreateAccountantModal from './Partials/CreateAccountantModal';
import InspectUserProfileModal from './Partials/InspectUserProfileModal';

interface UserRole {
    id: number;
    name: string;
}

interface UserItem {
    id: number;
    name: string;
    email: string;
    phone: string | null;
    nrc_number: string | null;
    company_name: string | null;
    avatar_url: string | null;
    is_blacklisted: boolean;
    blacklist_reason: string | null;
    created_at: string;
    roles: UserRole[];
    invoices_count: number;
    payment_slips_count: number;
}

interface PaginatedUsers {
    data: UserItem[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    links: { url: string | null; label: string; active: boolean }[];
}

interface Props {
    users: PaginatedUsers;
    stats: {
        total_users: number;
        senior_accountants: number;
        customers: number;
        blacklisted: number;
    };
    currentTab: string;
    search: string;
}

export default function UsersIndex({ users, stats, currentTab, search }: Props) {
    const [searchTerm, setSearchTerm] = useState(search || '');
    const [createModalOpen, setCreateModalOpen] = useState(false);
    const [inspectUserId, setInspectUserId] = useState<number | null>(null);

    const handleTabChange = (tab: string) => {
        router.get(
            route('admin.users.index'),
            { tab, search: searchTerm },
            { preserveState: true, preserveScroll: true }
        );
    };

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        router.get(
            route('admin.users.index'),
            { tab: currentTab, search: searchTerm },
            { preserveState: true, preserveScroll: true }
        );
    };

    const getRoleBadge = (roles: UserRole[]) => {
        const roleNames = roles.map((r) => r.name);
        if (roleNames.includes('admin')) {
            return (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-100 text-[#705CF6] dark:bg-purple-950/80 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                    🛡️ Chief Auditor
                </span>
            );
        }
        if (roleNames.includes('accountant')) {
            return (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-100 text-indigo-700 dark:bg-indigo-950/80 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                    👨‍💼 Senior Accountant
                </span>
            );
        }
        return (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                🏢 Registered Customer
            </span>
        );
    };

    return (
        <AuthenticatedLayout
            header={
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="p-1.5 rounded-xl bg-purple-500/10 text-[#705CF6] font-bold text-sm">
                                👥
                            </span>
                            <h2 className="text-xl font-bold leading-tight text-slate-900 dark:text-white">
                                Staff & User Management
                            </h2>
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 dark:bg-purple-950 text-[#705CF6] dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                                Chief Auditor Portal
                            </span>
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                            Governance authority over accounting staff, registered merchant clients, mandatory KYC records, and access status
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => setCreateModalOpen(true)}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#705CF6] hover:bg-[#5a48e0] text-white text-xs font-bold transition shadow-xs"
                        >
                            <span>+</span>
                            <span>Add Senior Accountant</span>
                        </button>
                    </div>
                </div>
            }
        >
            <Head title="Staff & User Management - Chief Auditor Governance" />

            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-6">
                {/* 4 Summary Stat Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#161B26] p-4 shadow-sm">
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider mb-1">
                            Total Accounts
                        </div>
                        <div className="text-2xl font-black text-slate-900 dark:text-white">
                            {stats.total_users}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">Across all roles</div>
                    </div>

                    <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#161B26] p-4 shadow-sm">
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider mb-1">
                            Senior Accountants
                        </div>
                        <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400">
                            {stats.senior_accountants}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">Operational finance staff</div>
                    </div>

                    <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#161B26] p-4 shadow-sm">
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider mb-1">
                            Registered Customers
                        </div>
                        <div className="text-2xl font-black text-[#705CF6]">
                            {stats.customers}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">Verified merchant clients</div>
                    </div>

                    <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#161B26] p-4 shadow-sm">
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider mb-1">
                            Blacklisted
                        </div>
                        <div className="text-2xl font-black text-rose-600 dark:text-rose-400">
                            {stats.blacklisted}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">Suspended for fraud</div>
                    </div>
                </div>

                {/* Main Card with Tabs & Search */}
                <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#161B26] p-6 shadow-sm space-y-5">
                    {/* Filter Tabs & Search Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800/80 pb-4">
                        {/* Tabs */}
                        <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-x-auto text-xs">
                            {[
                                { key: 'all', label: 'All Accounts', count: stats.total_users },
                                { key: 'accountants', label: 'Senior Accountants', count: stats.senior_accountants },
                                { key: 'customers', label: 'Registered Customers', count: stats.customers },
                                { key: 'blacklisted', label: 'Blacklisted', count: stats.blacklisted },
                            ].map((tab) => (
                                <button
                                    key={tab.key}
                                    type="button"
                                    onClick={() => handleTabChange(tab.key)}
                                    className={`px-3 py-1.5 rounded-xl font-bold transition whitespace-nowrap ${
                                        currentTab === tab.key
                                            ? 'bg-white dark:bg-[#161B26] text-slate-900 dark:text-white shadow-xs'
                                            : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                                    }`}
                                >
                                    <span>{tab.label}</span>
                                    <span className="ml-1.5 px-1.5 py-0.2 rounded-md bg-slate-200/60 dark:bg-slate-800 text-[10px] font-mono">
                                        {tab.count}
                                    </span>
                                </button>
                            ))}
                        </div>

                        {/* Search Bar */}
                        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Search by name, phone, NRC, email..."
                                className="w-64 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:border-[#705CF6] focus:ring-1 focus:ring-[#705CF6]"
                            />
                            <button
                                type="submit"
                                className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 transition"
                            >
                                Search
                            </button>
                        </form>
                    </div>

                    {/* Users Table */}
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                            <thead className="bg-slate-50 dark:bg-slate-900/80 text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800 uppercase tracking-wider font-semibold">
                                <tr>
                                    <th className="px-3 py-2 text-xs w-14">ID</th>
                                    <th className="px-3 py-2 text-xs">User / Entity</th>
                                    <th className="px-3 py-2 text-xs">Role & Status</th>
                                    <th className="px-3 py-2 text-xs">Phone & NRC</th>
                                    <th className="px-3 py-2 text-xs text-center">Activity</th>
                                    <th className="px-3 py-2 text-xs text-right whitespace-nowrap">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                                {users.data.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-3 py-8 text-center text-slate-500">
                                            No user accounts match the current filter or search criteria.
                                        </td>
                                    </tr>
                                ) : (
                                    users.data.map((u) => (
                                        <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                                            <td className="px-3 py-2 font-mono font-semibold text-slate-500">
                                                #{u.id}
                                            </td>

                                            <td className="px-3 py-2">
                                                <div className="flex items-center gap-2.5">
                                                    {u.avatar_url ? (
                                                        <img
                                                            src={u.avatar_url}
                                                            alt={u.name}
                                                            className="w-8 h-8 rounded-xl object-cover border border-slate-200 dark:border-slate-700 shrink-0"
                                                        />
                                                    ) : (
                                                        <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800 flex items-center justify-center font-bold text-xs text-[#705CF6] shrink-0">
                                                            {u.name.slice(0, 2).toUpperCase()}
                                                        </div>
                                                    )}
                                                    <div className="truncate max-w-[200px]">
                                                        <div className="font-bold text-slate-900 dark:text-white truncate">
                                                            {u.name}
                                                        </div>
                                                        <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                                                            {u.email}
                                                        </div>
                                                        {u.company_name && (
                                                            <div className="text-[10px] text-slate-400 font-semibold truncate">
                                                                🏢 {u.company_name}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>

                                            <td className="px-3 py-2">
                                                <div className="space-y-1">
                                                    <div>{getRoleBadge(u.roles)}</div>
                                                    {u.is_blacklisted && (
                                                        <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700 dark:bg-rose-950/80 dark:text-rose-300 border border-rose-300 dark:border-rose-800">
                                                            🚨 Blacklisted
                                                        </span>
                                                    )}
                                                </div>
                                            </td>

                                            <td className="px-3 py-2 font-mono text-slate-700 dark:text-slate-300">
                                                <div>{u.phone || 'N/A'}</div>
                                                <div className="text-[10px] text-slate-400">
                                                    {u.nrc_number || 'NRC Not Registered'}
                                                </div>
                                            </td>

                                            <td className="px-3 py-2 text-center text-xs font-mono">
                                                <div className="inline-flex items-center gap-2 px-2 py-1 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[11px]">
                                                    <span title="Invoices Billed">📄 {u.invoices_count}</span>
                                                    <span>·</span>
                                                    <span title="Payment Slips Submitted">🧾 {u.payment_slips_count}</span>
                                                </div>
                                            </td>

                                            <td className="px-3 py-2 text-right whitespace-nowrap">
                                                <button
                                                    type="button"
                                                    onClick={() => setInspectUserId(u.id)}
                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white transition shadow-2xs"
                                                >
                                                    <span>🔍</span>
                                                    <span>Inspect Financial Profile</span>
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {users.links && users.links.length > 3 && (
                        <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800/80 pt-4 text-xs">
                            <span className="text-slate-500">
                                Showing {users.data.length} of {users.total} accounts
                            </span>
                            <div className="flex items-center gap-1">
                                {users.links.map((link, idx) => (
                                    <Link
                                        key={idx}
                                        href={link.url || '#'}
                                        dangerouslySetInnerHTML={{ __html: link.label }}
                                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                                            link.active
                                                ? 'bg-[#705CF6] text-white shadow-xs'
                                                : link.url
                                                ? 'border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                                                : 'text-slate-400 cursor-not-allowed opacity-50'
                                        }`}
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Add Accountant Modal */}
            <CreateAccountantModal
                show={createModalOpen}
                onClose={() => setCreateModalOpen(false)}
            />

            {/* Inspect User Financial Profile Modal */}
            <InspectUserProfileModal
                userId={inspectUserId}
                show={Boolean(inspectUserId)}
                onClose={() => setInspectUserId(null)}
            />
        </AuthenticatedLayout>
    );
}
