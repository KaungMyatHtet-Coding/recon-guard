import React from 'react';

interface UserAvatarProps {
    user: {
        name?: string | null;
        avatar_url?: string | null;
        email?: string | null;
    };
    size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
    className?: string;
}

export default function UserAvatar({ user, size = 'md', className = '' }: UserAvatarProps) {
    const sizeClasses = {
        xs: 'w-7 h-7 text-[10px]',
        sm: 'w-8 h-8 text-xs',
        md: 'w-10 h-10 text-sm font-semibold',
        lg: 'w-14 h-14 text-lg font-bold',
        xl: 'w-20 h-20 text-2xl font-bold',
    }[size];

    const getInitials = (name?: string | null) => {
        if (!name) return 'RG';
        const parts = name.trim().split(/\s+/);
        if (parts.length >= 2) {
            return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
        }
        return name.slice(0, 2).toUpperCase();
    };

    if (user.avatar_url) {
        return (
            <img
                src={user.avatar_url}
                alt={user.name || 'User Avatar'}
                className={`rounded-full object-cover ring-2 ring-purple-500/20 shadow-sm shrink-0 ${sizeClasses} ${className}`}
            />
        );
    }

    return (
        <div
            className={`rounded-full bg-gradient-to-tr from-[#705CF6] via-indigo-600 to-[#8C7CFF] text-white flex items-center justify-center font-bold tracking-tight shadow-sm shrink-0 select-none ${sizeClasses} ${className}`}
            title={user.name || 'User'}
        >
            <span>{getInitials(user.name)}</span>
        </div>
    );
}
