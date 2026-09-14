"use client"

import { usePathname } from 'next/navigation';
import { useTheme } from '@/context/themeContext';

const FloatingThemeToggle = () => {
    const { theme, toggleTheme } = useTheme();
    const pathname = usePathname();
    const isDark = theme === 'dark';

    // Dashboard has its own inline toggle in the top bar
    if (pathname?.startsWith('/dashboard') || pathname === '/signup/get-started') return null;

    // Button appearance matches the mode you're switching TO:
    // dark mode → shows "LIGHT" → white button
    // light mode → shows "DARK" → dark button
    const iconStroke = isDark ? '#111111' : 'white';
    const textColor = isDark ? 'rgba(0,0,0,0.75)' : 'rgba(255,255,255,0.85)';
    const bg = isDark ? 'rgba(255,255,255,0.95)' : 'rgba(22,22,30,0.92)';
    const border = isDark ? '1px solid rgba(0,0,0,0.10)' : '1px solid rgba(255,255,255,0.14)';
    const shadow = isDark
        ? '0 4px 20px rgba(0,0,0,0.12), 0 1px 4px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,1)'
        : '0 4px 20px rgba(0,0,0,0.5), 0 1px 4px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.08)';

    return (
        <button
            onClick={toggleTheme}
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            className="fixed bottom-6 right-10 z-50 flex items-center gap-[10px] rounded-full px-[20px] h-[48px]"
            style={{
                background: bg,
                border,
                boxShadow: shadow,
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                transition: 'background 0.3s ease, border 0.3s ease, box-shadow 0.3s ease',
            }}
        >
            {isDark ? (
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="4" stroke={iconStroke} strokeWidth="1.6" />
                    <path d="M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" stroke={iconStroke} strokeWidth="1.6" strokeLinecap="round" />
                </svg>
            ) : (
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
                    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" stroke={iconStroke} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            )}
            <span className="text-[12px] font-medium tracking-[1.5px]" style={{ color: textColor }}>
                {isDark ? 'LIGHT' : 'DARK'}
            </span>
        </button>
    );
};

export default FloatingThemeToggle;
