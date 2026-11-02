import { Head, Link } from '@inertiajs/react';
import React from 'react';

interface Props {
    status: number;
    message?: string;
}

export default function ErrorPage({ status, message }: Props) {
    const title = {
        404: 'Resource Not Found',
        403: 'Access Forbidden / Unauthorized',
        500: 'Internal Engine Error',
        503: 'Service Unavailable',
    }[status] || 'An Error Occurred';

    const description = {
        404: 'The page, invoice, or reconciliation record you are searching for does not exist or has been moved.',
        403: message || 'You do not have the required role or security clearance to access this financial resource.',
        500: 'An internal error occurred in the engine. Our system engineers have been alerted.',
        503: 'ReconGuard is temporarily undergoing maintenance or ledger synchronization. Please check back shortly.',
    }[status] || (message || 'An unexpected error occurred.');

    const icon = {
        404: '🔍',
        403: '🛡️',
        500: '⚙️',
        503: '🚧',
    }[status] || '⚠️';

    return (
        <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col items-center justify-center p-4 selection:bg-indigo-500 selection:text-white">
            <Head title={`${status}: ${title} - ReconGuard`} />

            <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-850/80 p-8 backdrop-blur-xl shadow-2xl text-center space-y-5">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-800 border border-slate-700 text-3xl shadow-lg">
                    {icon}
                </div>

                <div className="space-y-1">
                    <span className="font-mono text-xs font-bold text-indigo-400 uppercase tracking-widest">
                        HTTP Status {status}
                    </span>
                    <h1 className="text-xl font-black text-white tracking-tight">
                        {title}
                    </h1>
                    <p className="text-xs text-slate-400 leading-relaxed pt-1">
                        {description}
                    </p>
                </div>

                <div className="pt-4 border-t border-slate-800">
                    <Link
                        href={route('dashboard')}
                        className="inline-flex items-center justify-center gap-2 w-full rounded-xl bg-gradient-to-r from-indigo-500 to-indigo-600 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-indigo-500/20 hover:from-indigo-600 hover:to-indigo-700 transition"
                    >
                        <span>&larr;</span> Return to Safe Dashboard
                    </Link>
                </div>
            </div>
        </div>
    );
}
