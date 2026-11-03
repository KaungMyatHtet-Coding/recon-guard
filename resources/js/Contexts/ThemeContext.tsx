import React, { createContext, useContext, useEffect, useState } from 'react';

export type Theme = 'dark' | 'light';

interface ThemeContextType {
    theme: Theme;
    setTheme: (theme: Theme) => void;
    toggleTheme: () => void;
    isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType>({
    theme: 'dark',
    setTheme: () => {},
    toggleTheme: () => {},
    isDark: true,
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [theme, setThemeState] = useState<Theme>('dark');

    useEffect(() => {
        try {
            const saved = localStorage.getItem('reconguard_theme') as Theme;
            if (saved === 'light' || saved === 'dark') {
                setThemeState(saved);
                applyTheme(saved);
            } else {
                applyTheme('dark');
            }
        } catch (e) {
            applyTheme('dark');
        }
    }, []);

    const applyTheme = (t: Theme) => {
        if (typeof document !== 'undefined') {
            if (t === 'dark') {
                document.documentElement.classList.add('dark');
            } else {
                document.documentElement.classList.remove('dark');
            }
        }
    };

    const setTheme = (t: Theme) => {
        setThemeState(t);
        applyTheme(t);
        try {
            localStorage.setItem('reconguard_theme', t);
        } catch (e) {
            // ignore
        }
    };

    const toggleTheme = () => {
        setTheme(theme === 'dark' ? 'light' : 'dark');
    };

    return (
        <ThemeContext.Provider value={{ theme, setTheme, toggleTheme, isDark: theme === 'dark' }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => useContext(ThemeContext);
