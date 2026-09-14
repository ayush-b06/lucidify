"use client";

import Image from 'next/image';
import Link from 'next/link';
import NotificationBell from './NotificationBell';
import { useTheme } from '@/context/themeContext';

interface DashboardTopBarProps {
    title: string;
}

const DashboardTopBar = ({ title }: DashboardTopBarProps) => {
    const { theme, toggleTheme } = useTheme();
    const isDark = theme === 'dark';

    return (
        <>
            <div className="absolute BottomGradientBorder left-0 top-[103px] w-full" />
            <div className="flex items-center justify-between px-[20px] sm:px-[50px] py-6 flex-shrink-0">
                <div className="hidden xl:block font-semibold text-[15px]">{title}</div>
                <div className="inline-flex items-center gap-3">
                    {/* Theme toggle — styled to match the mode you're switching TO */}
                    <button
                        onClick={toggleTheme}
                        aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
                        className="DashboardThemeToggle flex items-center gap-[8px] px-[14px] h-[40px] rounded-[12px] hover:opacity-80 transition-opacity"
                        style={{
                            background: isDark ? 'rgba(255,255,255,0.95)' : 'rgba(22,22,30,0.92)',
                            border: isDark ? '1px solid rgba(0,0,0,0.10)' : '1px solid rgba(255,255,255,0.14)',
                            boxShadow: isDark
                                ? '0 2px 8px rgba(0,0,0,0.10), inset 0 1px 0 rgba(255,255,255,1)'
                                : '0 2px 8px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.08)',
                        }}
                    >
                        {isDark ? (
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                                <circle cx="12" cy="12" r="4" stroke="#111111" strokeWidth="1.6" />
                                <path d="M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" stroke="#111111" strokeWidth="1.6" strokeLinecap="round" />
                            </svg>
                        ) : (
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        )}
                        <span
                            className="text-[12px] font-medium tracking-[1px] hidden sm:block"
                            style={{ color: isDark ? 'rgba(0,0,0,0.75)' : 'rgba(255,255,255,0.85)' }}
                        >
                            {isDark ? 'LIGHT' : 'DARK'}
                        </span>
                    </button>

                    <div className="w-[1px] h-[30px] bg-white/10 hidden xl:block mx-[8px]" />

                    <span className="hidden xl:block"><NotificationBell /></span>

                    <Link href="/dashboard/settings" className="hidden sm:flex w-[129px] h-[55px] items-center justify-center gap-2.5 rounded-[15px] BlackGradient ContentCardShadow">
                        <div className="font-light text-sm">Settings</div>
                        <div className="w-[30px]">
                            <Image src={isDark ? "/Settings Icon.png" : "/Black Settings Icon.png"} alt="Settings" width={64} height={64} style={{ width: "100%", height: "auto" }} sizes="150px" />
                        </div>
                    </Link>
                </div>
            </div>
        </>
    );
};

export default DashboardTopBar;
