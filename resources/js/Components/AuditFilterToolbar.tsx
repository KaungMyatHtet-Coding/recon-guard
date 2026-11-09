import React, { useState } from 'react';

export interface StatusOption {
    value: string;
    label: string;
    badgeColor?: string;
}

export interface FilterState {
    tab?: string;
    status?: string;
    channel?: string;
    search?: string;
    date_scope?: string;
    start_date?: string | null;
    end_date?: string | null;
    single_date?: string | null;
}

export interface AuditFilterToolbarProps {
    filters: FilterState;
    onFilterChange: (newFilters: Partial<FilterState>) => void;
    statusOptions?: StatusOption[];
    channelOptions?: { value: string; label: string }[];
    searchPlaceholder?: string;
    totalRecords?: number;
    scopeSummary?: string;
    isDefaultScope?: boolean;
    className?: string;
}

export default function AuditFilterToolbar({
    filters,
    onFilterChange,
    statusOptions,
    channelOptions,
    searchPlaceholder = 'Search by Customer Name, Phone, Invoice #, or Bank TxID...',
    totalRecords,
    scopeSummary,
    isDefaultScope = false,
    className = '',
}: AuditFilterToolbarProps) {
    const [searchTerm, setSearchTerm] = useState(filters.search || '');
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [pickerMode, setPickerMode] = useState<'range' | 'single'>('range');
    const [startDate, setStartDate] = useState(filters.start_date || '');
    const [endDate, setEndDate] = useState(filters.end_date || '');
    const [singleDate, setSingleDate] = useState(filters.single_date || '');

    const activeScope = filters.date_scope || 'this_month';

    const handleScopeChange = (scope: 'today' | 'this_week' | 'this_month' | 'all') => {
        onFilterChange({
            date_scope: scope,
            start_date: null,
            end_date: null,
            single_date: null,
        });
        setStartDate('');
        setEndDate('');
        setSingleDate('');
        setShowDatePicker(false);
    };

    const handleApplyCustomDates = (e: React.FormEvent) => {
        e.preventDefault();
        if (pickerMode === 'single') {
            if (singleDate) {
                onFilterChange({
                    date_scope: 'custom',
                    single_date: singleDate,
                    start_date: null,
                    end_date: null,
                });
            }
        } else {
            if (startDate || endDate) {
                onFilterChange({
                    date_scope: 'custom',
                    start_date: startDate || null,
                    end_date: endDate || null,
                    single_date: null,
                });
            }
        }
        setShowDatePicker(false);
    };

    const handleResetToDefault = () => {
        setSearchTerm('');
        setStartDate('');
        setEndDate('');
        setSingleDate('');
        setShowDatePicker(false);
        onFilterChange({
            date_scope: 'this_month',
            start_date: null,
            end_date: null,
            single_date: null,
            search: '',
            tab: 'all',
            status: 'all',
            channel: 'all',
        });
    };

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onFilterChange({ search: searchTerm.trim() });
    };

    return (
        <div className={`space-y-3.5 ${className}`}>
            {/* Top Toolbar: Unified Search & Date Preset Pills */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3.5">
                {/* Unified Search Input */}
                <form onSubmit={handleSearchSubmit} className="flex-1 relative">
                    <div className="relative">
                        <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                            🔍
                        </span>
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder={searchPlaceholder}
                            className="w-full pl-9 pr-20 py-2 rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:border-[#705CF6] focus:ring-1 focus:ring-[#705CF6] transition shadow-xs"
                        />
                        <button
                            type="submit"
                            className="absolute inset-y-1 right-1 px-3 bg-[#705CF6] hover:bg-[#5a48e0] text-white rounded-xl text-[11px] font-bold transition"
                        >
                            Search
                        </button>
                    </div>
                </form>

                {/* Date Scoping Preset Pills + Interactive Calendar Toggle */}
                <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shrink-0 text-xs">
                    <button
                        type="button"
                        onClick={() => handleScopeChange('today')}
                        className={`px-3 py-1.5 rounded-xl font-bold transition ${
                            activeScope === 'today'
                                ? 'bg-white dark:bg-[#161B26] text-slate-900 dark:text-white shadow-xs'
                                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                        }`}
                    >
                        Today
                    </button>
                    <button
                        type="button"
                        onClick={() => handleScopeChange('this_week')}
                        className={`px-3 py-1.5 rounded-xl font-bold transition ${
                            activeScope === 'this_week'
                                ? 'bg-white dark:bg-[#161B26] text-slate-900 dark:text-white shadow-xs'
                                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                        }`}
                    >
                        This Week
                    </button>
                    <button
                        type="button"
                        onClick={() => handleScopeChange('this_month')}
                        className={`px-3 py-1.5 rounded-xl font-bold transition ${
                            activeScope === 'this_month'
                                ? 'bg-white dark:bg-[#161B26] text-[#705CF6] dark:text-[#8d7df8] shadow-xs'
                                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                        }`}
                    >
                        This Month <span className="text-[10px] opacity-70">(Default)</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => handleScopeChange('all')}
                        className={`px-3 py-1.5 rounded-xl font-bold transition ${
                            activeScope === 'all'
                                ? 'bg-white dark:bg-[#161B26] text-slate-900 dark:text-white shadow-xs'
                                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                        }`}
                    >
                        All Time
                    </button>

                    {/* Interactive Calendar Popover Button */}
                    <button
                        type="button"
                        onClick={() => setShowDatePicker(!showDatePicker)}
                        className={`px-3 py-1.5 rounded-xl font-bold transition flex items-center gap-1.5 ${
                            activeScope === 'custom' || showDatePicker
                                ? 'bg-[#705CF6] text-white shadow-xs'
                                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800'
                        }`}
                        title="Select a specific date or custom date range"
                    >
                        <span>📅</span>
                        <span>{activeScope === 'custom' ? 'Custom Date' : 'Calendar'}</span>
                    </button>
                </div>
            </div>

            {/* Interactive Calendar Dropdown / Popover Drawer */}
            {showDatePicker && (
                <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl space-y-3 animate-in fade-in zoom-in-95 duration-100">
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-900 dark:text-white">
                                Interactive Calendar Date Picker
                            </span>
                            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg text-[10px]">
                                <button
                                    type="button"
                                    onClick={() => setPickerMode('range')}
                                    className={`px-2 py-0.5 rounded-md font-semibold ${
                                        pickerMode === 'range' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs' : 'text-slate-500'
                                    }`}
                                >
                                    Date Range
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setPickerMode('single')}
                                    className={`px-2 py-0.5 rounded-md font-semibold ${
                                        pickerMode === 'single' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs' : 'text-slate-500'
                                    }`}
                                >
                                    Single Date
                                </button>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={() => setShowDatePicker(false)}
                            className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-white"
                        >
                            ✕
                        </button>
                    </div>

                    <form onSubmit={handleApplyCustomDates} className="space-y-3">
                        {pickerMode === 'single' ? (
                            <div>
                                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                                    Select Specific Date
                                </label>
                                <input
                                    type="date"
                                    value={singleDate}
                                    onChange={(e) => setSingleDate(e.target.value)}
                                    className="w-full sm:w-64 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 text-xs text-slate-900 dark:text-white"
                                />
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                                        Start Date (From)
                                    </label>
                                    <input
                                        type="date"
                                        value={startDate}
                                        onChange={(e) => setStartDate(e.target.value)}
                                        className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 text-xs text-slate-900 dark:text-white"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                                        End Date (Until)
                                    </label>
                                    <input
                                        type="date"
                                        value={endDate}
                                        onChange={(e) => setEndDate(e.target.value)}
                                        className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 text-xs text-slate-900 dark:text-white"
                                    />
                                </div>
                            </div>
                        )}

                        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                            <button
                                type="button"
                                onClick={() => setShowDatePicker(false)}
                                className="px-3 py-1.5 rounded-xl text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="px-4 py-1.5 rounded-xl bg-[#705CF6] hover:bg-[#5a48e0] text-white text-xs font-bold transition shadow-xs"
                            >
                                Apply Custom Date Filter
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Second Row: Status Classification Pills & Channel Filter (Optional) */}
            {(statusOptions || channelOptions) && (
                <div className="flex flex-wrap items-center justify-between gap-2.5 pt-1">
                    {/* Status Options */}
                    {statusOptions && (
                        <div className="flex flex-wrap items-center gap-1.5 text-xs">
                            <span className="text-[11px] font-bold text-slate-400 mr-1 uppercase tracking-wider">
                                Status:
                            </span>
                            {statusOptions.map((st) => {
                                const isActive = (filters.tab || filters.status || 'all') === st.value;
                                return (
                                    <button
                                        key={st.value}
                                        type="button"
                                        onClick={() => onFilterChange({ tab: st.value, status: st.value })}
                                        className={`px-2.5 py-1 rounded-xl text-xs font-semibold transition ${
                                            isActive
                                                ? 'bg-[#705CF6] text-white shadow-2xs'
                                                : 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                                        }`}
                                    >
                                        {st.label}
                                    </button>
                                );
                            })}
                        </div>
                    )}

                    {/* Channel Options */}
                    {channelOptions && (
                        <div className="flex items-center gap-1.5 text-xs">
                            <span className="text-[11px] font-bold text-slate-400 mr-1 uppercase tracking-wider">
                                Channel:
                            </span>
                            <select
                                value={filters.channel || 'all'}
                                onChange={(e) => onFilterChange({ channel: e.target.value })}
                                className="rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-1 text-xs text-slate-900 dark:text-white"
                            >
                                {channelOptions.map((ch) => (
                                    <option key={ch.value} value={ch.value}>
                                        {ch.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}
                </div>
            )}

            {/* Active Date Scope Summary Banner */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-3.5 py-2 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80 text-xs">
                <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-emerald-500 font-bold">●</span>
                    <span className="text-slate-700 dark:text-slate-300">
                        Showing records for:{' '}
                        <span className="font-bold text-slate-900 dark:text-white">
                            {scopeSummary || (activeScope === 'this_month' ? 'This Month' : activeScope)}
                        </span>
                        {totalRecords !== undefined && (
                            <span className="text-slate-500 dark:text-slate-400 font-mono ml-1.5">
                                • {totalRecords} records found
                            </span>
                        )}
                    </span>
                </div>

                {(!isDefaultScope || filters.search || (filters.tab && filters.tab !== 'all')) && (
                    <button
                        type="button"
                        onClick={handleResetToDefault}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#705CF6] hover:underline"
                    >
                        <span>↺</span>
                        <span>Reset to This Month Default</span>
                    </button>
                )}
            </div>
        </div>
    );
}
