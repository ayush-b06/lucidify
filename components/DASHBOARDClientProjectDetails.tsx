"use client";

import { useEffect, useState } from 'react';
import { collection, getDocs, doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import Link from 'next/link';
import { projectState, projectStateLabels, projectNextStep } from '@/utils/projectWorkflow';
import Image from 'next/image';
import DashboardClientSideNav from './DashboardClientSideNav';
import DashboardTopBar from './DashboardTopBar';
import { useTheme } from '@/context/themeContext';

interface DASHBOARDClientProjectDetailsProps {
    userId: string;
    projectId: string;
}

interface ProjectDetails {
    projectName?: string;
    approval?: string;
    setupComplete?: boolean;
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

    const [projectDetails, setProjectDetails] = useState<ProjectDetails | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [attempt, setAttempt] = useState(0);
    const [paymentType, setPaymentType] = useState<'week' | 'full'>('week');
    const [designCount, setDesignCount] = useState(0);
    const [autoPayLoading, setAutoPayLoading] = useState(false);

    useEffect(() => {
        setLoading(true);
        setError(null);
        setProjectDetails(null);
        if (!userId || !projectId) return;
        let active = true;
        const unsubscribe = onSnapshot(doc(db, 'users', userId, 'projects', projectId), snapshot => {
            if (snapshot.exists()) { setProjectDetails(snapshot.data() as ProjectDetails); setError(null); }
            else setError('Project not found.');
            setLoading(false);
        }, () => { setError('We couldn’t load your project. Please try again.'); setLoading(false); });
        Promise.all([
            getDocs(collection(db, 'users', userId, 'projects', projectId, 'section web designs')),
            getDocs(collection(db, 'users', userId, 'projects', projectId, 'full-page web designs')),
        ]).then(([sections, pages]) => { if (active) setDesignCount(sections.size + pages.size); }).catch(console.error);
        return () => { active = false; unsubscribe(); };
    }, [userId, projectId, attempt]);

    const {
        projectName, dueDate, dateCreated, projectDescription,
        logoAttachment, logoUrl, status, paymentStatus, progress,
        weeksPaid, paymentPlan, paymentAmount, paymentStartDate, autoPay,
    } = projectDetails || {};

    const handleAutoPayButton = async (newAutoPay: boolean) => {
        if (!userId || !projectId || autoPayLoading) return;
        setAutoPayLoading(true);
        try {
            await updateDoc(doc(db, 'users', userId, 'projects', projectId), { autoPay: newAutoPay });
            setProjectDetails(prev => ({ ...prev, autoPay: newAutoPay }));
        } catch { }
        finally { setAutoPayLoading(false); }
    };

    // Theme tokens
    const textColor = isDark ? '#ffffff' : '#111111';
    const mutedColor = isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.45)';
    const dividerColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';
    const trackBg = isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.10)';
    const subtleBg = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)';
    const subtleBorder = isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.08)';

    // Tab bar
    const tabBase = "px-[14px] h-[34px] flex items-center rounded-[9px] text-[13px] font-medium whitespace-nowrap transition-all";
    const activeTabStyle: React.CSSProperties = {
        background: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.09)',
        color: textColor,
        boxShadow: isDark ? '0 1px 4px rgba(0,0,0,0.3)' : '0 1px 4px rgba(0,0,0,0.08)',
    };
    const inactiveTabStyle: React.CSSProperties = { background: 'transparent', color: mutedColor };
    const disabledTabStyle: React.CSSProperties = { background: 'transparent', color: mutedColor, opacity: 0.35, cursor: 'not-allowed' };
    const tabBarStyle: React.CSSProperties = {
        background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)',
        border: isDark ? '1px solid rgba(255,255,255,0.07)' : '1px solid rgba(0,0,0,0.07)',
        borderRadius: '13px', padding: '3px',
        display: 'inline-flex', alignItems: 'center', gap: '2px',
    };

    if (loading) return (
        <div className="flex flex-col xl:flex-row h-screen DashboardBackgroundGradient overflow-hidden">
            <DashboardClientSideNav highlight="projects" />
            <div className="flex-1 flex items-center justify-center pt-[60px] xl:pt-0">
                <p className="opacity-40 font-light text-[14px]">Loading project...</p>
            </div>
        </div>
    );

    if (error) return (
        <div className="flex flex-col xl:flex-row h-screen DashboardBackgroundGradient overflow-hidden">
            <DashboardClientSideNav highlight="projects" />
            <div className="flex-1 flex items-center justify-center pt-[60px] xl:pt-0">
                <div role="alert"><p>{error}</p><button className="underline mt-3 mr-4" onClick={() => setAttempt(value => value + 1)}>Try again</button><Link className="underline" href="/dashboard/projects">Back to projects</Link></div>
            </div>
        </div>
    );

    if (projectDetails && projectState(projectDetails) !== 'approved') {
        const state = projectState(projectDetails);
        const brief = [
            ['Requested launch', projectDetails.dueDate],
            ['Platform', projectDetails.platform],
            ['Pages', Array.isArray(projectDetails.subpages) ? projectDetails.subpages.join(', ') : undefined],
            ['Budget range', projectDetails.estimatedBudget],
            ['Payment preference', projectDetails.paymentPlan],
            ['Ongoing support', projectDetails.maintenancePlan],
        ];
        return <div className="flex flex-col xl:flex-row h-screen DashboardBackgroundGradient overflow-hidden">
            <DashboardClientSideNav highlight="projects" />
            <div className="flex-1 flex flex-col pt-[60px] xl:pt-0 min-h-0 overflow-hidden">
                <DashboardTopBar title="Project Details" />
                <main className="flex-1 overflow-y-auto px-5 sm:px-[50px] py-[30px]">
                    <Link href="/dashboard/projects" className="text-[13px] underline">Back to projects</Link>
                    <section className="BlackGradient ContentCardShadow rounded-[20px] p-7 mt-5 max-w-[850px]">
                        <h1 className="text-[24px] font-semibold">{projectName}</h1>
                        <p className="mt-3 font-medium">{projectStateLabels[state]}</p>
                        <p className="text-[14px] opacity-70 mt-2">{projectNextStep({ ...projectDetails, uid: projectId, projectName: projectName || 'Project' })}</p>
                        <div className="flex flex-wrap gap-4 mt-5">
                            {state === 'setup' && <Link className="PopupAttentionGradient rounded-xl px-4 py-2" href={`/dashboard/projects/${projectId}/setup`}>Continue setup</Link>}
                            <Link className="underline py-2" href={`/dashboard/messages?projectId=${encodeURIComponent(projectId)}`}>Ask the team about this project</Link>
                        </div>
                        <h2 className="text-[18px] font-semibold mt-8">{state === 'setup' ? 'Your draft brief' : 'Your submitted brief'}</h2>
                        {projectDescription && <p className="whitespace-pre-wrap break-words text-[14px] opacity-70 mt-3">{projectDescription}</p>}
                        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-5 mt-6">
                            {brief.map(([label, value]) => <div key={label}><dt className="text-[12px] opacity-60">{label}</dt><dd className="text-[14px] mt-1 break-words">{value || 'Not specified'}</dd></div>)}
                        </dl>
                    </section>
                </main>
            </div>
        </div>;
    }

    // Payment math
    const safeWeeksPaid = weeksPaid || 0;
    const safePaymentAmount = paymentAmount || 0;
    const numericPaymentPlan = typeof paymentPlan === 'number' ? paymentPlan : 0;
    const safePaymentPlan = numericPaymentPlan;
    const amountPaid = safeWeeksPaid * safePaymentAmount;
    const totalPayment = safePaymentPlan * safePaymentAmount;
    const remainingPayment = totalPayment - amountPaid;
    const paymentProgress = totalPayment > 0 ? amountPaid / totalPayment : 0;
    const strokeDashOffset = 450 - paymentProgress * 450;

    const statusLabel = status ? (statusLabels[status] || 'Planning') : 'Planning';
    const planLabel = typeof paymentPlan === 'string'
        ? paymentPlan
        : (paymentPlan ? (legacyPlanLabels[paymentPlan] || 'Unknown') : '—');

    const logoSrc = logoUrl || logoAttachment;

    // Payment status config
    const psConfig = paymentStatus === 'Overdue'
        ? { bg: 'rgba(241,63,94,0.12)', border: 'rgba(241,63,94,0.30)', text: '#f87171', dot: '#ef4444', label: 'Overdue' }
        : paymentStatus === 'Not Started'
        ? { bg: 'rgba(241,158,63,0.12)', border: 'rgba(241,158,63,0.30)', text: '#fbbf24', dot: '#f59e0b', label: 'Not Started' }
        : { bg: 'rgba(44,173,109,0.12)', border: 'rgba(44,173,109,0.30)', text: '#4ade80', dot: '#22c55e', label: 'On Time' };

    return (
        <div className="flex flex-col xl:flex-row h-screen DashboardBackgroundGradient overflow-hidden">
            <DashboardClientSideNav highlight="projects" />

            <div className="flex-1 flex flex-col pt-[60px] xl:pt-0 min-h-0 overflow-hidden">
                <DashboardTopBar title="Project Details" />

                <div className="flex-1 overflow-y-auto px-[20px] sm:px-[50px] pt-[30px] pb-[40px]">

                    {/* Tab Nav */}
                    <div className="mb-[28px]">
                        <div style={tabBarStyle}>
                            <Link href={`/dashboard/projects/${projectId}?projectId=${projectId}&userId=${userId}`}
                                className={tabBase} style={activeTabStyle}>Overview</Link>
                            <Link href={`/dashboard/projects/${projectId}/progress?projectId=${projectId}&userId=${userId}`}
                                className={tabBase} style={inactiveTabStyle}>Progress</Link>
                            <Link href={`/dashboard/projects/${projectId}/uploads?projectId=${projectId}&userId=${userId}`}
                                className={tabBase} style={inactiveTabStyle}>Uploads</Link>
                            <button disabled className={tabBase} style={disabledTabStyle}>Analytics</button>
                        </div>
                    </div>

                    <Link className="inline-block underline text-[13px] mb-5" href={`/dashboard/messages?projectId=${encodeURIComponent(projectId)}`}>Ask the team about this project</Link>
                    {/* Main Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-[20px]">

                        {/* LEFT */}
                        <div className="flex flex-col gap-[20px]">

                            {/* Hero card */}
                            <div className="BlackGradient ContentCardShadow rounded-[20px] px-[28px] py-[24px]">
                                <div className="flex items-start justify-between gap-[16px]">
                                    <div className="min-w-0">
                                        <h1 className="text-[22px] font-semibold leading-snug">{projectName}</h1>
                                        <p className="text-[13px] mt-[6px] leading-relaxed" style={{ color: mutedColor }}>{projectDescription}</p>
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
                                    <Link href={`/dashboard/projects/${projectId}/progress?projectId=${projectId}&userId=${userId}`}
                                        className="flex-1 flex items-center justify-between px-[16px] py-[13px] rounded-[12px] transition-all hover:opacity-80 active:scale-[0.98]"
                                        style={{ background: subtleBg, border: subtleBorder }}>
                                        <div className="flex items-center gap-[8px]">
                                            <span className="text-[16px]">📈</span>
                                            <span className="text-[13px] font-medium">Progress</span>
                                        </div>
                                        <span className="text-[12px]" style={{ color: mutedColor }}>→</span>
                                    </Link>
                                    <Link href={`/dashboard/projects/${projectId}/uploads?projectId=${projectId}&userId=${userId}`}
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

                                {/* Auto-pay toggle */}
                                <div>
                                    <div className="flex items-center justify-between mb-[12px]">
                                        <div>
                                            <p className="text-[13px] font-medium">Auto-pay</p>
                                            <p className="text-[11px] mt-[2px]" style={{ color: mutedColor }}>
                                                {autoPay ? 'Payments process automatically' : 'Manual payment required'}
                                            </p>
                                        </div>
                                        {/* Toggle switch */}
                                        <button
                                            onClick={() => handleAutoPayButton(!autoPay)}
                                            disabled={autoPayLoading}
                                            className="relative flex-shrink-0 w-[48px] h-[26px] rounded-full transition-all duration-300"
                                            style={{
                                                background: autoPay
                                                    ? 'linear-gradient(135deg, #725CF7, #6265F0)'
                                                    : (isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)'),
                                                boxShadow: autoPay ? '0 2px 10px rgba(114,92,247,0.40)' : 'none',
                                                border: autoPay ? 'none' : subtleBorder,
                                            }}
                                        >
                                            <div
                                                className="absolute top-[3px] w-[20px] h-[20px] rounded-full bg-white transition-all duration-300"
                                                style={{
                                                    left: autoPay ? '25px' : '3px',
                                                    boxShadow: '0 1px 4px rgba(0,0,0,0.25)',
                                                }}
                                            />
                                        </button>
                                    </div>
                                </div>

                                {/* Pay now */}
                                <div className="rounded-[16px] p-[4px]" style={{ background: subtleBg, border: subtleBorder }}>
                                    {/* Week / Full segmented control */}
                                    <div className="flex rounded-[13px] p-[3px] mb-[12px]" style={{ background: isDark ? 'rgba(0,0,0,0.25)' : 'rgba(0,0,0,0.05)' }}>
                                        {(['week', 'full'] as const).map(t => (
                                            <button
                                                key={t}
                                                onClick={() => setPaymentType(t)}
                                                className="flex-1 h-[32px] flex items-center justify-center rounded-[10px] text-[12px] font-medium transition-all"
                                                style={paymentType === t ? {
                                                    background: isDark ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.90)',
                                                    color: textColor,
                                                    boxShadow: isDark ? '0 1px 4px rgba(0,0,0,0.4)' : '0 1px 6px rgba(0,0,0,0.12)',
                                                } : {
                                                    background: 'transparent',
                                                    color: mutedColor,
                                                }}
                                            >
                                                {t === 'week' ? 'This week' : 'Pay in full'}
                                            </button>
                                        ))}
                                    </div>

                                    {/* Amount + button */}
                                    <div className="flex items-center gap-[10px] px-[4px] pb-[4px]">
                                        <div className="flex-1">
                                            <p className="text-[10px] uppercase tracking-wider mb-[2px]" style={{ color: mutedColor }}>Amount</p>
                                            <p className="text-[20px] font-bold" style={{ color: textColor }}>
                                                ${paymentType === 'week' ? safePaymentAmount : remainingPayment}
                                            </p>
                                        </div>
                                        <button
                                            disabled={paymentStatus === 'Not Started'}
                                            className="flex items-center gap-[8px] px-[20px] h-[44px] rounded-[12px] text-white text-[13px] font-semibold transition-all active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed"
                                            style={{
                                                background: paymentStatus === 'Not Started'
                                                    ? (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)')
                                                    : 'linear-gradient(135deg, #725CF7, #6265F0)',
                                                boxShadow: paymentStatus === 'Not Started' ? 'none' : '0 4px 16px rgba(114,92,247,0.40)',
                                                color: paymentStatus === 'Not Started' ? mutedColor : '#ffffff',
                                            }}
                                        >
                                            Pay now
                                        </button>
                                    </div>
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
