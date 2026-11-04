import React from 'react';

interface ApplicationLogoProps extends React.HTMLAttributes<HTMLDivElement> {
    size?: 'sm' | 'md' | 'lg';
}

export default function ApplicationLogo({ size = 'md', className = '', ...props }: ApplicationLogoProps) {
    const sizeClasses = {
        sm: 'h-8 w-8 rounded-xl text-xs',
        md: 'h-9 w-9 rounded-xl text-sm',
        lg: 'h-12 w-12 rounded-2xl text-lg',
    }[size];

    return (
        <div
            className={`inline-flex shrink-0 items-center justify-center bg-gradient-to-tr from-[#705CF6] via-indigo-600 to-[#9D8EFC] text-white font-black shadow-md shadow-[#705CF6]/30 select-none tracking-tight ${sizeClasses} ${className}`}
            {...props}
        >
            RG
        </div>
    );
}
