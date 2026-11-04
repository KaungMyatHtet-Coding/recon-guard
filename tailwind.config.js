import defaultTheme from 'tailwindcss/defaultTheme';
import forms from '@tailwindcss/forms';

/** @type {import('tailwindcss').Config} */
export default {
    darkMode: 'class',
    content: [
        './vendor/laravel/framework/src/Illuminate/Pagination/resources/views/*.blade.php',
        './storage/framework/views/*.php',
        './resources/views/**/*.blade.php',
        './resources/js/**/*.tsx',
    ],

    theme: {
        extend: {
            fontFamily: {
                sans: ['Figtree', 'Noto Sans Myanmar', 'Padauk', ...defaultTheme.fontFamily.sans],
            },
            colors: {
                finset: {
                    purple: '#705CF6',
                    lavender: '#8C7CFF',
                    lightbg: '#EBEBF8',
                    darkbg: '#0B0D14',
                    darksurface: '#161B26',
                },
                darkbg: '#0B0D14',
                darksurface: '#161B26',
                lightbg: '#EBEBF8',
                lightsurface: '#FFFFFF',
                'slate-850': '#161B26',
            },
        },
    },

    plugins: [forms],
};
