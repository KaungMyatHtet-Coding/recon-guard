import { InertiaLinkProps, Link } from '@inertiajs/react';

export default function ResponsiveNavLink({
    active = false,
    className = '',
    children,
    ...props
}: InertiaLinkProps & { active?: boolean }) {
    return (
        <Link
            {...props}
            className={`flex w-full items-start border-l-4 py-2 pe-4 ps-3 text-base font-semibold transition duration-150 ease-in-out focus:outline-none ${
                active
                    ? 'border-indigo-500 bg-indigo-950/40 text-white'
                    : 'border-transparent text-slate-300 hover:border-slate-700 hover:bg-slate-800 hover:text-white'
            } ${className}`}
        >
            {children}
        </Link>
    );
}
