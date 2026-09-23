"use client";

import React from 'react';
import { useLiveProject } from '@/hooks/useLiveProject';
import { STAGES, STAGE_DETAILS, nextStage } from '@/utils/projectProgress';
import Image from 'next/image';
import DashboardClientSideNav from '@/components/DashboardClientSideNav';
import DashboardTopBar from './DashboardTopBar';
import ProjectTabs from './ProjectTabs';
import { useTheme } from '@/context/themeContext';

interface DASHBOARDClientProjectDetailsProgressProps {
    userId: string;
    projectId: string;
}

interface ProjectDetails {
    projectName?: string;
    projectDescription?: string;
    progress?: number;
    status?: number;
    approval?: string;
    dueDate?: string;
    dateCreated?: string;
    recentActivity?: string;
    paymentStatus?: string;
    weeksPaid?: number;
    paymentPlan?: number;
    paymentAmount?: number;
    logoAttachment?: string;
    [key: string]: any;
}

const DASHBOARDClientProjectDetailsProgress = ({ userId, projectId }: DASHBOARDClientProjectDetailsProgressProps) => {
    const { projectDetails, loading, error } = useLiveProject<ProjectDetails>(userId, projectId);

    const { theme } = useTheme();
    const isDark = theme === 'dark';
    const textColor = isDark ? '#ffffff' : '#111111';
    const mutedColor = isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.45)';
    const dividerColor = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)';
    const trackBg = isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.10)';
    const cardItemBg = isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)';

    // Loading and error states keep the top bar so the page does not jump when they resolve.
    if (loading || error || !projectDetails) {
        return (
            <div className="flex flex-col xl:flex-row h-screen DashboardBackgroundGradient overflow-hidden">
                <DashboardClientSideNav highlight="projects" />
                <div className="flex-1 flex flex-col pt-[60px] xl:pt-0 min-h-0 overflow-hidden">
                    <DashboardTopBar title="Progress" />
                    <div className="flex-1 flex items-center justify-center px-[20px]">
                        {loading
                            ? <p className="opacity-40 font-light text-[14px]">Loading project...</p>
                            : <p role="alert" className="text-red-400 text-[14px] text-center">{error || 'Something went wrong.'}</p>}
                    </div>
                </div>
            </div>
        );
    }

    const { projectName, progress, status, approval, dueDate, dateCreated, recentActivity, logoAttachment } = projectDetails;

    const currentStage = status || 1;
    const currentProgress = Math.min(100, Math.max(0, Number(progress) || 0));
    const stageData = STAGE_DETAILS[currentStage] || STAGE_DETAILS[1];
    const stageName = STAGES.find(s => s.id === currentStage)?.label || 'Planning';
    const upcoming = nextStage(currentStage);

    const getApprovalStyle = () => {
        if (approval === 'Approved') return 'text-green-400 bg-green-400/10 px-[12px] py-[4px] rounded-full text-[12px]';
        if (approval === 'Declined') return 'text-red-400 bg-red-400/10 px-[12px] py-[4px] rounded-full text-[12px]';
        return 'text-yellow-400 bg-yellow-400/10 px-[12px] py-[4px] rounded-full text-[12px]';
    };

    return (
        <div className="flex flex-col xl:flex-row h-screen DashboardBackgroundGradient overflow-hidden">
            <DashboardClientSideNav highlight="projects" />

            <div className="flex-1 flex flex-col pt-[60px] xl:pt-0 min-h-0 overflow-hidden">
                <DashboardTopBar title="Progress" />

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto px-[20px] sm:px-[50px] pt-[30px] pb-[40px]">
                    <ProjectTabs projectId={projectId} active="progress" userId={userId} />

                    {/* Hero Progress Banner */}
                    <div className="BlackGradient ContentCardShadow rounded-[24px] px-[24px] sm:px-[35px] py-[28px] mb-[20px]">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-[20px]">
                            <div className="flex items-center gap-[16px]">
                                <div className="w-[50px] h-[50px] rounded-[12px] BlackWithLightGradient ContentCardShadow flex items-center justify-center flex-shrink-0 overflow-hidden">
                                    {logoAttachment ? (
                                        <Image src={logoAttachment} alt="Logo" layout="responsive" width={0} height={0} />
                                    ) : (
                                        <span className="text-[20px] opacity-50">📁</span>
                                    )}
                                </div>
                                <div>
                                    <h1 className="text-[20px] sm:text-[24px] font-semibold">{projectName}</h1>
                                    <div className="flex items-center gap-[10px] mt-[4px]">
                                        <span className={getApprovalStyle()}>{approval || 'Pending'}</span>
                                        <span className="text-[12px] opacity-40">{dateCreated ? `Started ${dateCreated}` : ''}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex flex-col items-start sm:items-end gap-[6px]">
                                <div className="text-[13px] opacity-50">Overall Progress</div>
                                <div className="text-[36px] font-bold" style={{ color: '#725CF7' }}>{currentProgress}%</div>
                                {dueDate && <div className="text-[12px] opacity-40">Due {dueDate}</div>}
                            </div>
                        </div>

                        {/* Full progress bar */}
                        <div className="mt-[24px]">
                            <div role="progressbar" aria-label="Build progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={currentProgress} className="h-[8px] rounded-full" style={{ background: trackBg }}>
                                <div
                                    className="h-full rounded-full"
                                    style={{
                                        width: `${Math.min(currentProgress, 100)}%`,
                                        background: 'linear-gradient(to right, #6265f0, #725CF7)',
                                        transition: 'width 1s ease'
                                    }}
                                />
                            </div>
                            <div className="flex justify-between mt-[8px]">
                                <span className="text-[11px] opacity-40">0%</span>
                                <span className="text-[11px] opacity-40">100%</span>
                            </div>
                        </div>
                    </div>

                    {/* Stage Pipeline */}
                    <div className="BlackGradient ContentCardShadow rounded-[24px] px-[24px] sm:px-[35px] py-[28px] mb-[20px]">
                        <h2 className="text-[16px] font-semibold mb-[24px]">Build Pipeline</h2>
                        <div className="flex items-center gap-0 overflow-x-auto pb-[4px]">
                            {STAGES.map((stage, i) => {
                                const isDone = stage.id < currentStage;
                                const isCurrent = stage.id === currentStage;
                                const isFuture = stage.id > currentStage;

                                return (
                                    <div key={stage.id} className="flex items-center flex-shrink-0">
                                        <div className="flex flex-col items-center gap-[10px]">
                                            <div className={`w-[44px] h-[44px] rounded-full flex items-center justify-center text-[18px] transition-all
                                                ${isDone ? 'bg-[#725CF7]/20 ring-2 ring-[#725CF7]' : ''}
                                                ${isCurrent ? 'PopupAttentionGradient PopupAttentionShadow ring-2 ring-white/20' : ''}
                                                ${isFuture ? 'opacity-30' : ''}
                                            `}
                                                style={isFuture ? { background: cardItemBg } : undefined}
                                            >
                                                {isDone ? '✓' : stage.icon}
                                            </div>
                                            <div
                                                className="text-[11px] sm:text-[12px] font-medium whitespace-nowrap"
                                                style={{ color: isCurrent ? textColor : isDone ? '#725CF7' : mutedColor, opacity: isFuture ? 0.3 : 1 }}
                                            >
                                                {stage.label}
                                            </div>
                                            {isCurrent && (
                                                <div className="text-[10px] text-[#725CF7] font-medium -mt-[6px]">Current</div>
                                            )}
                                        </div>
                                        {i < STAGES.length - 1 && (
                                            <div
                                                className="w-[30px] sm:w-[60px] h-[2px] mx-[4px] sm:mx-[8px] mb-[24px] rounded-full flex-shrink-0"
                                                style={{ background: stage.id < currentStage ? '#725CF7' : (isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.10)') }}
                                            />
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* What's happening right now */}
                    <div className="BlackGradient ContentCardShadow rounded-[24px] px-[24px] sm:px-[30px] py-[26px] mb-[20px] flex flex-col gap-[18px]">
                        <div>
                            <div className="flex items-center gap-[10px] mb-[6px]">
                                <span className="text-[20px]">{STAGES.find(s => s.id === currentStage)?.icon}</span>
                                <h2 className="text-[16px] font-semibold">{stageName}</h2>
                            </div>
                            <p className="text-[13px] font-light opacity-60 leading-[1.6]">{stageData.headline}</p>
                        </div>
                        <p className="text-[14px] font-light opacity-60 leading-[1.7] pt-[16px]"
                            style={{ borderTop: `1px solid ${dividerColor}` }}>
                            {stageData.description}
                        </p>
                        <div className="pt-[16px] flex items-center gap-[10px]" style={{ borderTop: `1px solid ${dividerColor}` }}>
                            <span className="text-[11px] opacity-40 uppercase tracking-wide">Up next</span>
                            <span className="text-[13px] font-medium" style={{ color: '#725CF7' }}>
                                {upcoming ? `${upcoming.icon} ${upcoming.label}` : 'Your website is live — we keep it that way'}
                            </span>
                        </div>
                    </div>

                    {/* What This Stage Means / Stage Info Cards */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-[14px] mb-[20px]">
                        {[
                            {
                                label: 'Current Stage',
                                value: stageName,
                                sub: `${currentStage} of 5`,
                                icon: STAGES.find(s => s.id === currentStage)?.icon || '📋',
                            },
                            {
                                label: 'Progress',
                                value: `${currentProgress}%`,
                                sub: currentProgress < 33 ? 'Early stages' : currentProgress < 66 ? 'Well underway' : currentProgress < 100 ? 'Almost there' : 'Complete',
                                icon: '📈',
                            },
                            {
                                label: 'Due Date',
                                value: dueDate || 'TBD',
                                sub: dueDate ? 'Project deadline' : 'Not yet set',
                                icon: '📅',
                            },
                            {
                                label: 'Project Status',
                                value: approval || 'Pending',
                                sub: approval === 'Approved' ? 'Active & running' : approval === 'Declined' ? 'On hold' : 'Awaiting approval',
                                icon: approval === 'Approved' ? '✅' : approval === 'Declined' ? '❌' : '⏳',
                            },
                        ].map((card) => (
                            <div key={card.label} className="BlackGradient ContentCardShadow rounded-[18px] px-[18px] py-[16px] flex flex-col gap-[8px]">
                                <span className="text-[20px]">{card.icon}</span>
                                <p className="text-[11px] opacity-40">{card.label}</p>
                                <p className="text-[16px] sm:text-[18px] font-semibold leading-tight" style={{ color: '#725CF7' }}>{card.value}</p>
                                <p className="text-[11px] opacity-40">{card.sub}</p>
                            </div>
                        ))}
                    </div>

                    {/* Recent Activity */}
                    {recentActivity && (
                        <div className="BlackGradient ContentCardShadow rounded-[24px] px-[24px] sm:px-[35px] py-[26px]">
                            <h2 className="text-[16px] font-semibold mb-[18px]">Recent Activity</h2>
                            <div className="flex items-start gap-[14px]">
                                <div className="w-[8px] h-[8px] rounded-full mt-[5px] flex-shrink-0" style={{ background: 'linear-gradient(135deg, #6265f0, #725CF7)' }} />
                                <p className="text-[14px] font-light opacity-70 leading-[1.7]">{recentActivity}</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DASHBOARDClientProjectDetailsProgress;
