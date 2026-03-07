"use client";

import { useTheme } from './ThemeProvider';
import { Moon, Sun } from 'lucide-react';

export function ThemeToggle() {
    const { theme, toggleTheme } = useTheme();

    return (
        <button
            onClick={toggleTheme}
            className="relative h-9 w-9 rounded-lg border border-[var(--border-default)] bg-[var(--bg-panel)] flex items-center justify-center hover:bg-[var(--bg-hover)] transition-all group"
            aria-label="Toggle theme"
        >
            <Sun
                size={16}
                className="absolute transition-all duration-300 text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]"
                style={{
                    opacity: theme === 'light' ? 1 : 0,
                    transform: theme === 'light' ? 'rotate(0deg) scale(1)' : 'rotate(90deg) scale(0)'
                }}
            />
            <Moon
                size={16}
                className="absolute transition-all duration-300 text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]"
                style={{
                    opacity: theme === 'dark' ? 1 : 0,
                    transform: theme === 'dark' ? 'rotate(0deg) scale(1)' : 'rotate(-90deg) scale(0)'
                }}
            />
        </button>
    );
}
