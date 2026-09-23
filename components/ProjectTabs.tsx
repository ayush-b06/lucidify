"use client";

import React from 'react';
import Link from 'next/link';
import { useTheme } from '@/context/themeContext';

const TABS = [
    { key: 'overview', label: 'Overview', path: '' },
    { key: 'progress', label: 'Progress', path: '/progress' },
    { key: 'uploads', label: 'Uploads', path: '/uploads' },
] as const;

export type ProjectTab = (typeof TABS)[number]['key'];

interface ProjectTabsProps {
    projectId: string;
    active: ProjectTab;
    /** Carry the original owner's id for both admin and shared client views. */
    userId?: string;
}

const ProjectTabs = ({ projectId, active, userId }: ProjectTabsProps) => {
    const { theme } = useTheme();
    const isDark = theme === 'dark';

    const tabBase = "px-[14px] h-[34px] flex items-center rounded-[9px] text-[13px] font-medium whitespace-nowrap transition-all";
    const activeTabStyle: React.CSSProperties = {
        background: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.09)',
        color: isDark ? '#ffffff' : '#111111',
        boxShadow: isDark ? '0 1px 4px rgba(0,0,0,0.3)' : '0 1px 4px rgba(0,0,0,0.08)',
    };
    const inactiveTabStyle: React.CSSProperties = {
        background: 'transparent',
        color: isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.45)',
    };

    return (
        <div className="mb-[28px] overflow-x-auto">
            <nav
                aria-label="Project sections"
                style={{
                    background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)',
                    border: isDark ? '1px solid rgba(255,255,255,0.07)' : '1px solid rgba(0,0,0,0.07)',
                    borderRadius: '13px', padding: '3px',
                    display: 'inline-flex', alignItems: 'center', gap: '2px',
                }}
            >
                {TABS.map(tab => {
                    const isActive = tab.key === active;
                    return (
                        <Link
                            key={tab.key}
                            href={`/dashboard/projects/${projectId}${tab.path}${userId ? `?userId=${userId}` : ''}`}
                            aria-current={isActive ? 'page' : undefined}
                            className={tabBase}
                            style={isActive ? activeTabStyle : inactiveTabStyle}
                        >
                            {tab.label}
                        </Link>
                    );
                })}
            </nav>
        </div>
    );
};

export default ProjectTabs;
