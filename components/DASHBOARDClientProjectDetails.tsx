"use client";

import { paymentCount, paidCount, getPaid, getTotalCost, getRemaining } from '@/utils/billing';
import { useEffect, useState } from 'react';
import { collection, getDocs, doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { useLiveProject } from '@/hooks/useLiveProject';
import Link from 'next/link';
import ProjectBrief, { ProjectBriefData } from './ProjectBrief';
import { projectSummary } from '@/utils/projectCategories';
import Image from 'next/image';
import DashboardClientSideNav from './DashboardClientSideNav';
import DashboardTopBar from './DashboardTopBar';
import ProjectTabs from './ProjectTabs';
import { useTheme } from '@/context/themeContext';

interface DASHBOARDClientProjectDetailsProps {
    userId: string;
    projectId: string;
}

interface ProjectDetails extends ProjectBriefData {
    projectName?: string;
    dueDate?: string;
    dateCreated?: string;
    projectDescription?: string;
    logoAttachment?: string;
    logoUrl?: string;
    status?: number;
    paymentStatus?: string;
    progress?: number;
    websiteDesignStatus?: string;
    weeksPaid?: number;
    paymentPlan?: number | string;
    paymentAmount?: number;
    paymentStartDate?: string;
    autoPay?: boolean;
    [key: string]: any;
}

const statusLabels: Record<number, string> = {
    1: 'Planning',
    2: 'Designing',
    3: 'Developing',
    4: 'Launching',
    5: 'Maintaining',
};

const legacyPlanLabels: Record<number, string> = {
    1: '100% upfront',
    2: '2-week',
    3: '3-week',
    4: '4-week',
    5: '5-week',
};

const DASHBOARDClientProjectDetails = ({ userId, projectId }: DASHBOARDClientProjectDetailsProps) => {
    const { theme } = useTheme();
    const isDark = theme === 'dark';

    const { projectDetails, setProjectDetails, loading, error } = useLiveProject<ProjectDetails>(userId, projectId);
    const [designCount, setDesignCount] = useState(0);

    useEffect(() => {
        let active = true;
        Promise.all(['section web designs', 'full-page web designs'].map(name => getDocs(collection(db, 'users', userId, 'projects', projectId, name))))
            .then(results => { if (active) setDesignCount(results.reduce((total, snapshot) => total + snapshot.size, 0)); })
            .catch(() => { if (active) setDesignCount(0); });
        return () => { active = false; };
    }, [userId, projectId]);

    const {
        projectName, dueDate, dateCreated, projectDescription,
        logoAttachment, logoUrl, status, paymentStatus, progress,
        weeksPaid, paymentPlan, paymentAmount, paymentStartDate, autoPay,
    } = projectDetails || {};



    // Theme tokens
    const textColor = isDark ? '#ffffff' : '#111111';
    const mutedColor = isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.45)';
    const dividerColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';
    const trackBg = isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.10)';
    const subtleBg = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)';
    const subtleBorder = isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.08)';

    // Loading and error states keep the top bar so the page does not jump when they resolve.
    if (loading || error) return (
        <div className="flex flex-col xl:flex-row h-screen DashboardBackgroundGradient overflow-hidden">
            <DashboardClientSideNav highlight="projects" />
            <div className="flex-1 flex flex-col pt-[60px] xl:pt-0 min-h-0 overflow-hidden">
                <DashboardTopBar title="Overview" />
                <div className="flex-1 flex items-center justify-center px-[20px]">
                    {loading
                        ? <p className="opacity-40 font-light text-[14px]">Loading project...</p>
                        : <p role="alert" className="text-red-400 text-[14px] text-center">{error}</p>}
                </div>
            </div>
        </div>
    );

    // Payment math
    const safeWeeksPaid = paidCount(projectDetails || {});
    const safePaymentAmount = typeof paymentAmount === 'number' && Number.isFinite(paymentAmount) ? Math.max(0, paymentAmount) : 0;
    const numericPaymentPlan = paymentCount(projectDetails || {});
    const safePaymentPlan = numericPaymentPlan;
    const amountPaid = getPaid(projectDetails || {});
    const totalPayment = getTotalCost(projectDetails || {});
    const remainingPayment = getRemaining(projectDetails || {});
    const paymentProgress = totalPayment > 0 ? amountPaid / totalPayment : 0;
    const strokeDashOffset = 450 - paymentProgress * 450;

    const statusLabel = status ? (statusLabels[status] || 'Planning') : 'Planning';
    const planLabel = typeof paymentPlan === 'string'
        ? paymentPlan
        : (paymentPlan ? (legacyPlanLabels[paymentPlan] || 'Unknown') : '—');

    const logoSrc = logoUrl || logoAttachment;

    // Payment status config
    const psConfig = paymentStatus === 'Paid'
        ? { bg: 'rgba(114,92,247,0.12)', border: 'rgba(114,92,247,0.30)', text: isDark ? '#bcb2ff' : '#5940b5', dot: '#725cf7', label: 'Paid' }
        : paymentStatus === 'Overdue'
        ? { bg: 'rgba(241,63,94,0.12)', border: 'rgba(241,63,94,0.30)', text: isDark ? '#f87171' : '#b32d3a', dot: '#ef4444', label: 'Overdue' }
        : !paymentStatus || paymentStatus === 'Not Started'
        ? { bg: 'rgba(241,158,63,0.12)', border: 'rgba(241,158,63,0.30)', text: isDark ? '#fbbf24' : '#805900', dot: '#f59e0b', label: 'Not Started' }
        : { bg: 'rgba(44,173,109,0.12)', border: 'rgba(44,173,109,0.30)', text: isDark ? '#4ade80' : '#15703f', dot: '#22c55e', label: 'On Time' };

    return (
        <div className="flex flex-col xl:flex-row h-screen DashboardBackgroundGradient overflow-hidden">
            <DashboardClientSideNav highlight="projects" />

            <div className="flex-1 flex flex-col pt-[60px] xl:pt-0 min-h-0 overflow-hidden">
                <DashboardTopBar title="Overview" />

                <div className="flex-1 overflow-y-auto px-[20px] sm:px-[50px] pt-[30px] pb-[40px]">

                    <ProjectTabs projectId={projectId} active="overview" />

                    {projectDetails && <ProjectBrief project={projectDetails} />}
                    {/* Main Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-[20px]">

                        {/* LEFT */}
                        <div className="flex flex-col gap-[20px]">

                            {/* Hero card */}
                            <div className="BlackGradient ContentCardShadow rounded-[20px] px-[28px] py-[24px]">
                                <div className="flex items-start justify-between gap-[16px]">
                                    <div className="min-w-0">
                                        <h1 className="text-[22px] font-semibold leading-snug">{projectName}</h1>
                                        <p className="text-[13px] mt-[6px] leading-relaxed" style={{ color: mutedColor }}>{projectSummary(projectDetails || {})}</p>
                                    </div>
                                    <div className="w-[44px] h-[44px] flex-shrink-0">
                                        {logoSrc
                                            ? <Image src={logoSrc} alt="Logo" width={44} height={44} className="rounded-full object-cover w-full h-full" />
                                            : <Image src="/Lucidify Umbrella.png" alt="Lucidify" layout="responsive" width={0} height={0} />}
                                    </div>
                                </div>

                                <div className="h-[1px] my-[20px]" style={{ background: dividerColor }} />

                                {/* Progress bar */}
                                <div>
                                    <p className="text-[12px] mb-[8px]" style={{ color: mutedColor }}>Build Progress</p>
                                    <div className="flex items-center gap-[12px]">
                                        <div className="inline-flex items-center gap-[6px] px-[12px] py-[5px] rounded-full flex-shrink-0"
                                            style={{ background: 'rgba(114,92,247,0.15)', border: '1px solid rgba(114,92,247,0.25)', color: '#a89cff' }}>
                                            <span className="text-[12px] font-medium">{statusLabel}</span>
                                        </div>
                                        <div className="flex-1 h-[6px] rounded-full overflow-hidden" style={{ background: trackBg }}>
                                            <div className="h-full PopupAttentionGradient rounded-full transition-all duration-700"
                                                style={{ width: `${progress || 0}%` }} />
                                        </div>
                                        <span className="text-[13px] font-semibold flex-shrink-0" style={{ color: mutedColor }}>{progress || 0}%</span>
                                    </div>
                                </div>

                                {/* Info row */}
                                <div className="flex flex-col sm:flex-row gap-[16px] sm:gap-[0px] mt-[20px]">
                                    <div className="flex-1 sm:pr-[16px]" style={{ borderRight: `1px solid ${dividerColor}` }}>
                                        <p className="text-[11px] uppercase tracking-wider" style={{ color: mutedColor }}>Due Date</p>
                                        <p className="text-[15px] font-medium mt-[4px]">{dueDate || '—'}</p>
                                    </div>
                                    <div className="flex-1 sm:px-[16px]" style={{ borderRight: `1px solid ${dividerColor}` }}>
                                        <p className="text-[11px] uppercase tracking-wider" style={{ color: mutedColor }}>Payment Status</p>
                                        <div className="mt-[6px]">
                                            <div className="inline-flex items-center gap-[7px] px-[10px] py-[5px] rounded-[8px]"
                                                style={{ background: psConfig.bg, border: `1px solid ${psConfig.border}` }}>
                                                <div className="w-[6px] h-[6px] rounded-full flex-shrink-0" style={{ background: psConfig.dot }} />
                                                <span className="text-[12px] font-semibold" style={{ color: psConfig.text }}>{psConfig.label}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex-1 sm:pl-[16px]">
                                        <p className="text-[11px] uppercase tracking-wider" style={{ color: mutedColor }}>Created</p>
                                        <p className="text-[15px] font-medium mt-[4px]">{dateCreated || '—'}</p>
                                    </div>
                                </div>

                                <div className="h-[1px] my-[20px]" style={{ background: dividerColor }} />

                                {/* Quick links */}
                                <div className="flex gap-[10px]">
                                    <Link href={`/dashboard/projects/${projectId}/progress`}
                                        className="flex-1 flex items-center justify-between px-[16px] py-[13px] rounded-[12px] transition-all hover:opacity-80 active:scale-[0.98]"
                                        style={{ background: subtleBg, border: subtleBorder }}>
                                        <div className="flex items-center gap-[8px]">
                                            <span className="text-[16px]">📈</span>
                                            <span className="text-[13px] font-medium">Progress</span>
                                        </div>
                                        <span className="text-[12px]" style={{ color: mutedColor }}>→</span>
                                    </Link>
                                    <Link href={`/dashboard/projects/${projectId}/uploads`}
                                        className="flex-1 flex items-center justify-between px-[16px] py-[13px] rounded-[12px] transition-all hover:opacity-80 active:scale-[0.98]"
                                        style={{ background: subtleBg, border: subtleBorder }}>
                                        <div className="flex items-center gap-[8px]">
                                            <span className="text-[16px]">🖼️</span>
                                            <span className="text-[13px] font-medium">Designs</span>
                                        </div>
                                        <span className="text-[12px]" style={{ color: mutedColor }}>{designCount}</span>
                                    </Link>
                                </div>
                            </div>

                            {/* Stats grid */}
                            <div className="grid grid-cols-2 gap-[12px]">
                                {[
                                    { label: 'Current Stage', value: statusLabel, icon: '🗺️' },
                                    { label: 'Progress', value: `${progress || 0}%`, icon: '📈' },
                                    { label: 'Designs', value: `${designCount} uploaded`, icon: '🖼️' },
                                    { label: 'Payment Plan', value: planLabel, icon: '💳' },
                                ].map(card => (
                                    <div key={card.label} className="BlackWithLightGradient ContentCardShadow rounded-[16px] px-[20px] py-[16px]">
                                        <div className="flex items-center gap-[8px] mb-[8px]">
                                            <span className="text-[16px]">{card.icon}</span>
                                            <p className="text-[11px] uppercase tracking-wider" style={{ color: mutedColor }}>{card.label}</p>
                                        </div>
                                        <p className="text-[16px] font-semibold">{card.value}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* RIGHT — Payment card */}
                        <div className="flex flex-col gap-[20px]">
                            <div className="BlackGradient ContentCardShadow rounded-[20px] px-[24px] py-[24px] flex flex-col gap-[22px]">

                                {/* Header */}
                                <div className="flex items-center justify-between">
                                    <h2 className="text-[17px] font-semibold">Payment</h2>
                                    <div className="inline-flex items-center gap-[7px] px-[10px] py-[5px] rounded-[8px]"
                                        style={{ background: psConfig.bg, border: `1px solid ${psConfig.border}` }}>
                                        <div className="w-[6px] h-[6px] rounded-full flex-shrink-0" style={{ background: psConfig.dot }} />
                                        <span className="text-[12px] font-semibold" style={{ color: psConfig.text }}>{psConfig.label}</span>
                                    </div>
                                </div>

                                {/* SVG Ring */}
                                <div className="flex justify-center">
                                    <div className="skill">
                                        <div className="outer">
                                            <div className="inner">
                                                <h2 style={{ fontSize: '22px', fontWeight: 700, color: textColor }}>${amountPaid}</h2>
                                                <p style={{ fontSize: '11px', color: mutedColor }}>of ${totalPayment}</p>
                                            </div>
                                        </div>
                                        <svg xmlns="http://www.w3.org/2000/svg" version="1.1" width="160px" height="160px">
                                            <defs>
                                                <linearGradient id="GradientColor">
                                                    <stop offset="0%" stopColor="#725CF7" />
                                                    <stop offset="100%" stopColor="#6265F0" />
                                                </linearGradient>
                                            </defs>
                                            <circle cx="80" cy="80" r="70" strokeLinecap="round"
                                                style={{ fill: 'none', stroke: 'url(#GradientColor)', strokeWidth: '20px', strokeDasharray: '450', strokeDashoffset: strokeDashOffset, transition: 'stroke-dashoffset 2s linear' }}
                                            />
                                        </svg>
                                    </div>
                                </div>

                                {/* Payment details */}
                                <div className="grid grid-cols-2 gap-[12px]">
                                    {[
                                        { label: 'Per installment', value: `$${safePaymentAmount}` },
                                        { label: 'Total paid', value: `$${amountPaid}` },
                                        { label: 'Remaining', value: `$${remainingPayment}` },
                                        { label: 'Start date', value: paymentStartDate || 'Not set' },
                                    ].map(row => (
                                        <div key={row.label} className="rounded-[12px] px-[14px] py-[12px]"
                                            style={{ background: subtleBg, border: subtleBorder }}>
                                            <p className="text-[10px] uppercase tracking-wider mb-[4px]" style={{ color: mutedColor }}>{row.label}</p>
                                            <p className="text-[14px] font-semibold">{row.value}</p>
                                        </div>
                                    ))}
                                </div>

                                {/* Installment dots */}
                                {safePaymentPlan > 0 && (
                                    <div>
                                        <p className="text-[11px] uppercase tracking-wider mb-[10px]" style={{ color: mutedColor }}>Installments</p>
                                        <div className="flex flex-wrap gap-[6px]">
                                            {Array.from({ length: safePaymentPlan }, (_, i) => (
                                                <div key={i} className="w-[18px] h-[18px] rounded-[5px] transition-all"
                                                    style={{
                                                        background: safeWeeksPaid > i
                                                            ? 'linear-gradient(135deg, #725CF7, #6265F0)'
                                                            : (isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.10)'),
                                                        boxShadow: safeWeeksPaid > i ? '0 2px 8px rgba(114,92,247,0.35)' : 'none',
                                                    }}
                                                />
                                            ))}
                                        </div>
                                        <p className="text-[11px] mt-[8px]" style={{ color: mutedColor }}>{planLabel}</p>
                                    </div>
                                )}

                                <div className="h-[1px]" style={{ background: dividerColor }} />

                                <div className="text-[13px] leading-relaxed">
                                    <p className="font-medium">Payment arrangements</p>
                                    <p style={{ color: mutedColor }}>Contact Lucidify to arrange your payment. This dashboard does not charge your account automatically.</p>
                                    <Link href="/dashboard/messages" className="underline mt-2 inline-block">Ask about billing</Link>
                                </div>



                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DASHBOARDClientProjectDetails;
