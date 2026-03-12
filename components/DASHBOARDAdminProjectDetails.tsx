"use client";

import { useEffect, useState } from 'react';
import { collection, getDocs, doc, getDoc, updateDoc } from 'firebase/firestore';
import { writeNotification } from '../utils/notifications';
import { db } from '../firebaseConfig';
import Link from 'next/link';
import Image from 'next/image';
import DashboardAdminSideNav from '@/components/DashboardAdminSideNav';
import NotificationBell from '@/components/NotificationBell';

interface DASHBOARDAdminProjectDetailsProps {
    userId: string;
    projectId: string;
}

interface ProjectDetails {
    projectName?: string;
    dueDate?: string;
    dateCreated?: string;
    projectDescription?: string;
    logoAttachment?: string;
    status?: number;
    paymentStatus?: string;
    progress?: number;
    websiteDesignStatus?: string;
    weeksPaid?: number;
    paymentPlan?: number;
    paymentAmount?: number;
    paymentStartDate?: string;
    [key: string]: any;
}

const statusLabels: Record<number, string> = {
    1: 'Planning',
    2: 'Designing',
    3: 'Developing',
    4: 'Launching',
    5: 'Maintaining',
};

const planLabels: Record<number, string> = {
    1: '100% upfront',
    2: '2-week',
    3: '3-week',
    4: '4-week',
    5: '5-week',
};

const planButtonLabels = ['Upfront', '2-week', '3-week', '4-week', '5-week'];

const DASHBOARDAdminProjectDetails = ({ userId, projectId }: DASHBOARDAdminProjectDetailsProps) => {
    const [projectDetails, setProjectDetails] = useState<ProjectDetails | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [newPaymentAmount, setNewPaymentAmount] = useState<string | null>(null);
    const [designCount, setDesignCount] = useState(0);

    useEffect(() => {
        const fetchProjectDetails = async () => {
            if (!userId || !projectId) return;

            try {
                const projectDocRef = doc(db, 'users', userId, 'projects', projectId);
                const projectDoc = await getDoc(projectDocRef);

                if (projectDoc.exists()) {
                    setProjectDetails(projectDoc.data() as ProjectDetails);
                } else {
                    setError('Project not found.');
                }

                const sectionSnap = await getDocs(collection(db, 'users', userId, 'projects', projectId, 'section web designs'));
                const fullSnap = await getDocs(collection(db, 'users', userId, 'projects', projectId, 'full-page web designs'));
                const totalDesigns = sectionSnap.size + fullSnap.size;
                setDesignCount(totalDesigns);
            } catch (err) {
                setError('Failed to fetch project details.');
            } finally {
                setLoading(false);
            }
        };

        fetchProjectDetails();
    }, [userId, projectId]);

    const {
        projectName,
        dueDate,
        dateCreated,
        projectDescription,
        logoAttachment,
        status,
        paymentStatus,
        progress,
        weeksPaid,
        paymentPlan,
        paymentAmount,
        paymentStartDate,
    } = projectDetails || {};

    const handlePaymentAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setNewPaymentAmount(e.target.value);
    };

    const handlePaymentAmountSubmit = async (e: React.MouseEvent<HTMLButtonElement>) => {
        e.preventDefault();
        if (!userId || !projectId) return;

        try {
            const projectDocRef = doc(db, 'users', userId, 'projects', projectId);
            const amount = parseFloat(newPaymentAmount || '0');
            await updateDoc(projectDocRef, { paymentAmount: amount });
            writeNotification(
                userId,
                'Payment amount updated',
                `Your project payment has been set to $${amount.toFixed(2)}.`,
                'payment',
                projectId,
                `/dashboard/projects/${projectId}?projectId=${projectId}&userId=${userId}`,
            );
            setNewPaymentAmount(null);
            window.location.reload();
        } catch (error) {
            alert('Failed to update payment amount');
        }
    };

    const handlePaymentPlanUpdate = async (newPaymentPlan: number) => {
        if (!userId || !projectId) return;

        try {
            const projectDocRef = doc(db, 'users', userId, 'projects', projectId);
            await updateDoc(projectDocRef, { paymentPlan: newPaymentPlan });
            setProjectDetails((prev) => ({ ...prev, paymentPlan: newPaymentPlan }));
            writeNotification(
                userId,
                'Payment plan updated',
                `Your payment plan was changed to ${planLabels[newPaymentPlan] || 'a new plan'}.`,
                'payment',
                projectId,
                `/dashboard/projects/${projectId}?projectId=${projectId}&userId=${userId}`,
            );
        } catch (err) {
            // silently handle error
        }
    };

    const handleStartPayment = async () => {
        if (!userId || !projectId) return;

        try {
            const projectDocRef = doc(db, 'users', userId, 'projects', projectId);
            await updateDoc(projectDocRef, { paymentStatus: 'On Time' });
            setProjectDetails((prev) => ({ ...prev, paymentStatus: 'On Time' }));
            writeNotification(
                userId,
                'Payment started',
                'Your payment schedule has been activated. Your first payment is now due.',
                'payment',
                projectId,
                `/dashboard/projects/${projectId}?projectId=${projectId}&userId=${userId}`,
            );
        } catch (err) {
            // silently handle error
        }
    };

    if (loading) return (
        <div className="flex flex-col xl:flex-row h-screen DashboardBackgroundGradient overflow-hidden">
            <DashboardAdminSideNav highlight="projects" />
            <div className="flex-1 flex items-center justify-center pt-[60px] xl:pt-0">
                <p className="opacity-40 font-light text-[14px]">Loading project...</p>
            </div>
        </div>
    );

    if (error) return (
        <div className="flex flex-col xl:flex-row h-screen DashboardBackgroundGradient overflow-hidden">
            <DashboardAdminSideNav highlight="projects" />
            <div className="flex-1 flex items-center justify-center pt-[60px] xl:pt-0">
                <p className="opacity-40 font-light text-[14px]">{error}</p>
            </div>
        </div>
    );

    // Safe math
    const safeWeeksPaid = weeksPaid || 0;
    const safePaymentAmount = paymentAmount || 0;
    const safePaymentPlan = paymentPlan || 1;
    const amountPaid = safeWeeksPaid * safePaymentAmount;
    const totalPayment = safePaymentPlan * safePaymentAmount;
    const remainingPayment = totalPayment - amountPaid;
    const paymentProgress = totalPayment > 0 ? amountPaid / totalPayment : 0;
    const strokeDashOffset = 450 - paymentProgress * 450;

    const statusLabel = status ? (statusLabels[status] || 'Unknown') : 'Unknown';
    const planLabel = paymentPlan ? (planLabels[paymentPlan] || 'Unknown') : 'Unknown';

    return (
        <div className="flex flex-col xl:flex-row h-screen DashboardBackgroundGradient overflow-hidden">
            {/* Left Sidebar */}
            <DashboardAdminSideNav highlight="projects" />

            {/* Right Side */}
            <div className="flex-1 flex flex-col pt-[60px] xl:pt-0 min-h-0 overflow-hidden">
                <div className="absolute BottomGradientBorder left-0 top-[103px] w-full" />

                {/* Top Bar */}
                <div className="flex-shrink-0 flex items-center justify-between px-[20px] sm:px-[50px] py-6">
                    <div className="inline-flex items-center gap-[5px] min-w-0">
                        <div className="inline-flex items-center gap-[5px] opacity-40 flex-shrink-0">
                            <div className="w-[15px]">
                                <Image
                                    src="/Home Icon.png"
                                    alt="Home Icon"
                                    layout="responsive"
                                    width={0}
                                    height={0}
                                />
                            </div>
                            <div className="font-light text-sm">Admin</div>
                        </div>
                        <div className="inline-flex items-center gap-[5px] min-w-0">
                            <div className="font-light text-sm flex-shrink-0">/ Projects /</div>
                            <div className="font-light text-sm truncate max-w-[120px] sm:max-w-none">{projectName}</div>
                        </div>
                    </div>
                    <div className="inline-flex items-center gap-4 flex-shrink-0">
                        <NotificationBell />
                        <Link
                            href="/dashboard/settings"
                            className="hidden sm:flex w-[129px] h-[55px] items-center justify-center gap-2.5 px-0 py-[15px] rounded-[15px] BlackGradient ContentCardShadow"
                        >
                            <div className="font-light text-sm">Settings</div>
                            <div className="w-[30px]">
                                <Image
                                    src="/Settings Icon.png"
                                    alt="Settings Icon"
                                    layout="responsive"
                                    width={0}
                                    height={0}
                                />
                            </div>
                        </Link>
                    </div>
                </div>

                {/* Scrollable Area */}
                <div className="flex-1 overflow-y-auto px-[20px] sm:px-[50px] pt-[30px] pb-[40px]">

                    {/* Tab Nav */}
                    <div className="flex items-center gap-[20px] sm:gap-[30px] mb-[30px] overflow-x-auto pb-[4px]">
                        <Link
                            href={`/dashboard/projects/${projectId}?projectId=${projectId}&userId=${userId}`}
                            className="font-normal text-base whitespace-nowrap border-b-2 border-[#725CF7] pb-[2px]"
                        >
                            Overview
                        </Link>
                        <Link
                            href={`/dashboard/projects/${projectId}/progress?projectId=${projectId}&userId=${userId}`}
                            className="text-[#ffffff66] text-sm sm:text-base hover:text-white whitespace-nowrap"
                        >
                            Progress
                        </Link>
                        <Link
                            href={`/dashboard/projects/${projectId}/uploads?projectId=${projectId}&userId=${userId}`}
                            className="text-[#ffffff66] text-sm sm:text-base hover:text-white whitespace-nowrap"
                        >
                            Uploads
                        </Link>
                        <div className="opacity-40 cursor-not-allowed text-[#ffffff66] text-sm sm:text-base whitespace-nowrap">
                            Analytics
                        </div>
                    </div>

                    {/* Main Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-[20px]">

                        {/* LEFT COLUMN */}
                        <div className="flex flex-col gap-[20px]">

                            {/* CARD 1 — Project Hero */}
                            <div className="BlackGradient ContentCardShadow rounded-[20px] px-[28px] py-[24px]">
                                {/* Header row */}
                                <div className="flex items-start justify-between gap-[16px]">
                                    <div className="min-w-0">
                                        <h1 className="text-[22px] font-semibold leading-snug">{projectName}</h1>
                                        <p className="text-[13px] opacity-60 mt-[6px] leading-relaxed">{projectDescription}</p>
                                    </div>
                                    <div className="w-[44px] h-[44px] flex-shrink-0">
                                        {logoAttachment ? (
                                            <Image
                                                src={logoAttachment}
                                                alt="Project Logo"
                                                width={44}
                                                height={44}
                                                className="rounded-full object-cover w-full h-full"
                                            />
                                        ) : (
                                            <Image
                                                src="/Lucidify Umbrella.png"
                                                alt="Lucidify Logo"
                                                layout="responsive"
                                                width={0}
                                                height={0}
                                            />
                                        )}
                                    </div>
                                </div>

                                {/* Divider */}
                                <div className="h-[1px] bg-white/[0.08] my-[20px]" />

                                {/* Progress section */}
                                <div>
                                    <p className="opacity-50 text-[12px] mb-[8px]">Build Progress</p>
                                    <div className="flex items-center gap-[12px]">
                                        <div className="inline-flex items-center gap-[6px] px-[12px] py-[5px] rounded-full bg-[#725CF7]/20 border border-[#725CF7]/30 text-[#a89cff] text-[12px] font-medium flex-shrink-0">
                                            {statusLabel}
                                        </div>
                                        <div className="flex-1 h-[6px] rounded-full bg-white/10 overflow-hidden">
                                            <div
                                                className="h-full PopupAttentionGradient rounded-full"
                                                style={{ width: `${progress || 0}%` }}
                                            />
                                        </div>
                                        <span className="text-[13px] font-semibold opacity-80 flex-shrink-0">{progress || 0}%</span>
                                    </div>
                                </div>

                                {/* Info row */}
                                <div className="flex flex-col sm:flex-row gap-[16px] sm:gap-[0px] mt-[20px]">
                                    <div className="flex-1 sm:border-r border-white/10 sm:pr-[16px]">
                                        <p className="text-[11px] opacity-40 uppercase tracking-wider">Due Date</p>
                                        <p className="text-[15px] font-medium mt-[4px]">{dueDate || '—'}</p>
                                    </div>
                                    <div className="flex-1 sm:border-r border-white/10 sm:px-[16px]">
                                        <p className="text-[11px] opacity-40 uppercase tracking-wider">Payment Status</p>
                                        <div className="mt-[4px]">
                                            <div
                                                className={`inline-flex justify-center items-center rounded-full ${paymentStatus === 'Overdue' ? 'ErrorGradient' : paymentStatus === 'Not Started' ? 'PendingGradient' : 'CorrectGradient'}`}
                                            >
                                                <span className="text-[12px] font-semibold px-[12px] py-[4px]">
                                                    {paymentStatus === 'Overdue' ? 'Overdue!' : paymentStatus === 'Not Started' ? 'Not Started' : 'On Time'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex-1 sm:pl-[16px]">
                                        <p className="text-[11px] opacity-40 uppercase tracking-wider">Created</p>
                                        <p className="text-[15px] font-medium mt-[4px]">{dateCreated || '—'}</p>
                                    </div>
                                </div>

                                {/* Divider */}
                                <div className="h-[1px] bg-white/[0.08] my-[20px]" />

                                {/* Quick links */}
                                <div className="flex gap-[12px]">
                                    <Link
                                        href={`/dashboard/projects/${projectId}/progress?projectId=${projectId}&userId=${userId}`}
                                        className="flex-1 flex items-center justify-between BlackWithLightGradient ContentCardShadow px-[16px] py-[12px] rounded-[12px] hover:opacity-90 transition-opacity"
                                    >
                                        <span className="text-[13px] font-medium">View Progress</span>
                                        <span className="text-[14px] opacity-60">→</span>
                                    </Link>
                                    <Link
                                        href={`/dashboard/projects/${projectId}/uploads?projectId=${projectId}&userId=${userId}`}
                                        className="flex-1 flex items-center justify-between BlackWithLightGradient ContentCardShadow px-[16px] py-[12px] rounded-[12px] hover:opacity-90 transition-opacity"
                                    >
                                        <span className="text-[13px] font-medium">View Designs</span>
                                        <span className="text-[12px] opacity-50">{designCount} uploaded</span>
                                    </Link>
                                </div>
                            </div>

                            {/* CARD 2 — Stats Grid */}
                            <div className="grid grid-cols-2 gap-[12px]">
                                <div className="BlackWithLightGradient ContentCardShadow rounded-[16px] px-[20px] py-[16px]">
                                    <p className="text-[11px] opacity-40 uppercase tracking-wider">Current Stage</p>
                                    <p className="text-[15px] font-medium mt-[6px]">{statusLabel}</p>
                                </div>
                                <div className="BlackWithLightGradient ContentCardShadow rounded-[16px] px-[20px] py-[16px]">
                                    <p className="text-[11px] opacity-40 uppercase tracking-wider">Progress</p>
                                    <p className="text-[15px] font-medium mt-[6px]">{progress || 0}% complete</p>
                                </div>
                                <div className="BlackWithLightGradient ContentCardShadow rounded-[16px] px-[20px] py-[16px]">
                                    <p className="text-[11px] opacity-40 uppercase tracking-wider">Designs</p>
                                    <p className="text-[15px] font-medium mt-[6px]">{designCount} uploaded</p>
                                </div>
                                <div className="BlackWithLightGradient ContentCardShadow rounded-[16px] px-[20px] py-[16px]">
                                    <p className="text-[11px] opacity-40 uppercase tracking-wider">Payment Plan</p>
                                    <p className="text-[15px] font-medium mt-[6px]">{planLabel}</p>
                                </div>
                            </div>
                        </div>

                        {/* RIGHT COLUMN */}
                        <div className="flex flex-col gap-[20px]">

                            {/* PAYMENT CARD */}
                            <div className="BlackGradient ContentCardShadow rounded-[20px] px-[28px] py-[24px] flex flex-col gap-[24px]">

                                {/* Header */}
                                <div className="flex items-center justify-between">
                                    <h2 className="text-[18px] font-semibold">Payment Progress</h2>
                                    <div
                                        className={`inline-flex justify-center items-center rounded-full ${paymentStatus === 'Overdue' ? 'ErrorGradient' : paymentStatus === 'Not Started' ? 'PendingGradient' : 'CorrectGradient'}`}
                                    >
                                        <span className="text-[12px] font-semibold px-[12px] py-[4px]">
                                            {paymentStatus === 'Overdue' ? 'Overdue!' : paymentStatus === 'Not Started' ? 'Not Started' : 'On Time'}
                                        </span>
                                    </div>
                                </div>

                                {/* SVG Ring */}
                                <div className="flex flex-col items-center gap-[20px]">
                                    <div className="skill">
                                        <div className="outer">
                                            <div className="inner">
                                                <h2 style={{ fontSize: '24px', fontWeight: 'bold' }}>${amountPaid}</h2>
                                                <p style={{ fontSize: '12px', opacity: 0.4 }}>of ${totalPayment}</p>
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

                                {/* Payment details grid */}
                                <div className="grid grid-cols-2 gap-y-[16px] gap-x-[20px] w-full">
                                    <div>
                                        <p className="text-[11px] opacity-40 uppercase tracking-wider">Per installment</p>
                                        <p className="text-[14px] font-medium mt-[4px]">${safePaymentAmount}</p>
                                    </div>
                                    <div>
                                        <p className="text-[11px] opacity-40 uppercase tracking-wider">Total paid</p>
                                        <p className="text-[14px] font-medium mt-[4px]">${amountPaid}</p>
                                    </div>
                                    <div>
                                        <p className="text-[11px] opacity-40 uppercase tracking-wider">Remaining</p>
                                        <p className="text-[14px] font-medium mt-[4px]">${remainingPayment}</p>
                                    </div>
                                    <div>
                                        <p className="text-[11px] opacity-40 uppercase tracking-wider">Start date</p>
                                        <p className="text-[14px] font-medium mt-[4px]">{paymentStartDate || 'Not set'}</p>
                                    </div>
                                </div>

                                {/* Payment dots */}
                                {safePaymentPlan > 0 && (
                                    <div>
                                        <p className="text-[13px] opacity-60 mb-[10px]">Installments</p>
                                        <div className="flex gap-[5px]">
                                            {Array.from({ length: safePaymentPlan }, (_, i) => (
                                                <div
                                                    key={i}
                                                    className={`${safeWeeksPaid > i ? 'opacity-100' : 'opacity-40'} w-[17px] h-[17px] PopupAttentionGradient rounded-[4px]`}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Plan label */}
                                <p className="text-center text-[13px] opacity-50">{planLabel}</p>

                            </div>
                        </div>

                    </div>

                    {/* ADMIN CONTROLS CARD — full width below grid */}
                    <div className="BlackGradient ContentCardShadow rounded-[20px] px-[28px] py-[24px] mt-[20px]">
                        <div className="flex flex-col gap-[4px]">
                            <h2 className="text-[16px] font-semibold">Admin Controls</h2>
                            <p className="opacity-50 text-[12px]">Manage payment settings for this project</p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-[16px] mt-[16px]">

                            {/* CONTROL 1 — Payment Plan */}
                            <div className="flex flex-col gap-[10px]">
                                <p className="text-[12px] opacity-60">Payment Plan</p>
                                <div className="flex flex-wrap gap-[6px]">
                                    {planButtonLabels.map((label, idx) => {
                                        const planNum = idx + 1;
                                        return (
                                            <button
                                                key={planNum}
                                                type="button"
                                                onClick={() => handlePaymentPlanUpdate(planNum)}
                                                className={`px-[14px] py-[8px] rounded-[10px] text-[13px] ${paymentPlan === planNum ? 'PopupAttentionGradient PopupAttentionShadow' : 'BlackWithLightGradient ContentCardShadow opacity-60 hover:opacity-90'}`}
                                            >
                                                {label}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* CONTROL 2 — Payment Amount */}
                            <div className="flex flex-col gap-[10px]">
                                <p className="text-[12px] opacity-60">Payment Amount</p>
                                <div className="flex gap-[8px] items-center">
                                    <div className="flex items-center bg-white/5 border border-white/10 rounded-[10px] px-[14px] py-[9px] flex-1 min-w-0">
                                        <span className={`text-[14px] ${!newPaymentAmount ? 'opacity-60' : ''}`}>$</span>
                                        <input
                                            type="number"
                                            value={newPaymentAmount ?? ''}
                                            onChange={handlePaymentAmountChange}
                                            placeholder="750"
                                            className="flex-1 bg-transparent text-[14px] text-white placeholder-white/40 outline-none ml-[4px] min-w-0"
                                        />
                                    </div>
                                    <button
                                        onClick={handlePaymentAmountSubmit}
                                        disabled={!newPaymentAmount}
                                        className={`PopupAttentionGradient PopupAttentionShadow px-[16px] py-[9px] rounded-[10px] text-[13px] flex-shrink-0 ${!newPaymentAmount ? 'opacity-70 cursor-not-allowed' : ''}`}
                                    >
                                        Set
                                    </button>
                                </div>
                                <p className="text-[12px] opacity-50">Current: ${safePaymentAmount}</p>
                            </div>

                            {/* CONTROL 3 — Payment Status */}
                            <div className="flex flex-col gap-[10px]">
                                <p className="text-[12px] opacity-60">Payment Status</p>
                                {paymentStatus !== 'On Time' ? (
                                    <button
                                        onClick={handleStartPayment}
                                        className="PopupAttentionGradient PopupAttentionShadow w-full py-[10px] rounded-[10px] text-[13px] font-medium"
                                    >
                                        Start Payment
                                    </button>
                                ) : (
                                    <div className="inline-flex items-center">
                                        <div className="CorrectGradient inline-flex justify-center items-center rounded-full">
                                            <span className="text-[12px] font-semibold px-[12px] py-[4px]">Payment active</span>
                                        </div>
                                    </div>
                                )}
                            </div>

                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default DASHBOARDAdminProjectDetails;
