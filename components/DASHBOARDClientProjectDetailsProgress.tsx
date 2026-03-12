"use client";

import { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import Link from 'next/link';
import Image from 'next/image';
import DashboardClientSideNav from '@/components/DashboardClientSideNav';
import NotificationBell from '@/components/NotificationBell';

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

const STAGES = [
    { id: 1, label: 'Planning', icon: '🗺️' },
    { id: 2, label: 'Designing', icon: '🎨' },
    { id: 3, label: 'Developing', icon: '⚙️' },
    { id: 4, label: 'Launching', icon: '🚀' },
    { id: 5, label: 'Maintaining', icon: '🛡️' },
];

const STAGE_DETAILS: Record<number, {
    headline: string;
    description: string;
    milestones: string[];
    nextUp: string[];
}> = {
    1: {
        headline: 'Laying the foundation',
        description: "We're defining your project's goals, technical requirements, and timeline. This stage sets the direction for everything that follows.",
        milestones: [
            'Kickoff call completed',
            'Project requirements documented',
            'Scope & deliverables agreed',
            'Timeline & milestones set',
        ],
        nextUp: ['Wireframe delivery', 'Brand asset review', 'Design phase kickoff'],
    },
    2: {
        headline: 'Designing your vision',
        description: "Our designers are crafting the visual identity and UI/UX of your website. You'll be reviewing mockups and providing feedback in this phase.",
        milestones: [
            'Brand direction approved',
            'Homepage mockup delivered',
            'Inner pages mockup delivered',
            'Final design revisions approved',
        ],
        nextUp: ['Development handoff', 'Content gathering', 'Development phase kickoff'],
    },
    3: {
        headline: 'Building your website',
        description: "Developers are turning the approved designs into a fully functional website. This includes frontend, backend integrations, and quality testing.",
        milestones: [
            'Development environment set up',
            'Homepage built & responsive',
            'All pages coded & linked',
            'Forms, integrations & CMS set up',
            'Cross-browser & mobile testing',
        ],
        nextUp: ['Client review session', 'Final QA pass', 'Launch preparation'],
    },
    4: {
        headline: 'Preparing for launch',
        description: "Your website is nearly live! We're handling domain configuration, hosting setup, final testing, and performance optimizations before going live.",
        milestones: [
            'Final client review completed',
            'Domain & DNS configured',
            'SSL certificate active',
            'Performance & SEO optimizations',
            'Website live 🎉',
        ],
        nextUp: ['Go-live announcement', 'Analytics setup', 'Handover & training'],
    },
    5: {
        headline: 'Your website is live',
        description: "Congratulations — your website is live and in the world! We're actively monitoring performance, applying updates, and handling any issues that arise.",
        milestones: [
            'Website successfully launched',
            'Google Analytics connected',
            'Uptime monitoring active',
            'Monthly performance report',
        ],
        nextUp: ['Ongoing support & updates', 'SEO growth review', 'Feature enhancements'],
    },
};

const DASHBOARDClientProjectDetailsProgress = ({ userId, projectId }: DASHBOARDClientProjectDetailsProgressProps) => {
    const [projectDetails, setProjectDetails] = useState<ProjectDetails | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

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
            } catch (err) {
                console.error('Error fetching project details:', err);
                setError('Failed to fetch project details.');
            } finally {
                setLoading(false);
            }
        };
        fetchProjectDetails();
    }, [userId, projectId]);

    if (loading) {
        return (
            <div className="flex flex-col xl:flex-row h-screen DashboardBackgroundGradient overflow-hidden">
                <DashboardClientSideNav highlight="projects" />
                <div className="flex-1 flex items-center justify-center pt-[60px] xl:pt-0">
                    <p className="opacity-40 font-light text-[14px]">Loading project...</p>
                </div>
            </div>
        );
    }

    if (error || !projectDetails) {
        return (
            <div className="flex flex-col xl:flex-row h-screen DashboardBackgroundGradient overflow-hidden">
                <DashboardClientSideNav highlight="projects" />
                <div className="flex-1 flex items-center justify-center pt-[60px] xl:pt-0">
                    <p className="text-red-400 text-[14px]">{error || 'Something went wrong.'}</p>
                </div>
            </div>
        );
    }

    const { projectName, progress, status, approval, dueDate, dateCreated, recentActivity, logoAttachment, stageMilestones } = projectDetails;

    const currentStage = status || 1;
    const currentProgress = Number(progress) || 0;
    const stageData = STAGE_DETAILS[currentStage] || STAGE_DETAILS[1];
    const stageName = STAGES.find(s => s.id === currentStage)?.label || 'Planning';
    // Read milestone completion from Firestore (set by admin), fall back to all false
    const currentMilestoneStates: boolean[] = (stageMilestones?.[String(currentStage)] as boolean[] | undefined) || stageData.milestones.map(() => false);

    const getApprovalStyle = () => {
        if (approval === 'Approved') return 'text-green-400 bg-green-400/10 px-[12px] py-[4px] rounded-full text-[12px]';
        if (approval === 'Declined') return 'text-red-400 bg-red-400/10 px-[12px] py-[4px] rounded-full text-[12px]';
        return 'text-yellow-400 bg-yellow-400/10 px-[12px] py-[4px] rounded-full text-[12px]';
    };

    return (
        <div className="flex flex-col xl:flex-row h-screen DashboardBackgroundGradient overflow-hidden">
            <DashboardClientSideNav highlight="projects" />

            <div className="flex-1 flex flex-col pt-[60px] xl:pt-0 min-h-0 overflow-hidden">
                <div className="absolute BottomGradientBorder left-0 top-[103px] w-full" />

                {/* Top Bar */}
                <div className="flex items-center justify-between px-[20px] sm:px-[50px] py-6 flex-shrink-0">
                    <div className="inline-flex items-center gap-[5px]">
                        <div className="inline-flex items-center gap-[5px] opacity-40">
                            <div className="w-[15px]">
                                <Image src="/Home Icon.png" alt="Home Icon" layout="responsive" width={0} height={0} />
                            </div>
                            <div className="font-light text-sm hidden sm:block">Home</div>
                        </div>
                        <div className="font-light text-sm hidden sm:block">/ Projects</div>
                        <div className="font-light text-sm truncate max-w-[140px] sm:max-w-none">/ {projectName}</div>
                    </div>
                    <div className="inline-flex items-center gap-3">
                        <NotificationBell />
                        <Link href="/dashboard/settings" className="hidden sm:flex w-[129px] h-[55px] items-center justify-center gap-2.5 rounded-[15px] BlackGradient ContentCardShadow">
                            <div className="font-light text-sm">Settings</div>
                            <div className="w-[30px]">
                                <Image src="/Settings Icon.png" alt="Settings Icon" layout="responsive" width={0} height={0} />
                            </div>
                        </Link>
                    </div>
                </div>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto px-[20px] sm:px-[50px] pt-[30px] pb-[40px]">
                    {/* Tab Nav */}
                    <div className="flex items-center gap-[20px] sm:gap-[30px] mb-[30px] overflow-x-auto pb-[4px]">
                        <Link href={`/dashboard/projects/${projectId}?projectId=${projectId}&userId=${userId}`}
                            className="font-normal text-[#ffffff66] text-sm sm:text-base whitespace-nowrap hover:text-white">
                            Overview
                        </Link>
                        <Link href={`/dashboard/projects/${projectId}/progress?projectId=${projectId}&userId=${userId}`}
                            className="font-normal text-base whitespace-nowrap border-b-2 border-[#725CF7] pb-[2px]">
                            Progress
                        </Link>
                        <Link href={`/dashboard/projects/${projectId}/uploads?projectId=${projectId}&userId=${userId}`}
                            className="font-normal text-[#ffffff66] text-sm sm:text-base whitespace-nowrap hover:text-white">
                            Uploads
                        </Link>
                        <div className="font-normal text-[#ffffff66] text-sm sm:text-base whitespace-nowrap opacity-40 cursor-not-allowed">Analytics</div>
                    </div>

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
                            <div className="h-[8px] rounded-full bg-white/10">
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
                                                ${isFuture ? 'bg-white/5 opacity-30' : ''}
                                            `}>
                                                {isDone ? '✓' : stage.icon}
                                            </div>
                                            <div className={`text-[11px] sm:text-[12px] font-medium whitespace-nowrap
                                                ${isDone ? 'text-[#725CF7]' : ''}
                                                ${isCurrent ? 'text-white' : ''}
                                                ${isFuture ? 'opacity-30' : ''}
                                            `}>
                                                {stage.label}
                                            </div>
                                            {isCurrent && (
                                                <div className="text-[10px] text-[#725CF7] font-medium -mt-[6px]">Current</div>
                                            )}
                                        </div>
                                        {i < STAGES.length - 1 && (
                                            <div className={`w-[30px] sm:w-[60px] h-[2px] mx-[4px] sm:mx-[8px] mb-[24px] rounded-full flex-shrink-0
                                                ${stage.id < currentStage ? 'bg-[#725CF7]' : 'bg-white/10'}
                                            `} />
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-[20px] mb-[20px]">
                        {/* Current Stage Details */}
                        <div className="BlackGradient ContentCardShadow rounded-[24px] px-[24px] sm:px-[30px] py-[26px] flex flex-col gap-[18px]">
                            <div>
                                <div className="flex items-center gap-[10px] mb-[6px]">
                                    <span className="text-[20px]">{STAGES.find(s => s.id === currentStage)?.icon}</span>
                                    <h2 className="text-[16px] font-semibold">Stage {currentStage}: {stageName}</h2>
                                </div>
                                <p className="text-[13px] font-light opacity-60 leading-[1.6]">{stageData.headline}</p>
                            </div>
                            <p className="text-[13px] font-light opacity-50 leading-[1.7] border-t border-white/5 pt-[16px]">
                                {stageData.description}
                            </p>

                            {/* Next up */}
                            <div className="border-t border-white/5 pt-[16px]">
                                <p className="text-[11px] opacity-40 uppercase tracking-wide mb-[12px]">Coming Up Next</p>
                                <div className="flex flex-col gap-[8px]">
                                    {stageData.nextUp.map((item, i) => (
                                        <div key={i} className="flex items-center gap-[10px]">
                                            <div className="w-[6px] h-[6px] rounded-full flex-shrink-0" style={{ background: 'linear-gradient(135deg, #6265f0, #725CF7)' }} />
                                            <span className="text-[13px] font-light opacity-60">{item}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Milestones */}
                        <div className="BlackGradient ContentCardShadow rounded-[24px] px-[24px] sm:px-[30px] py-[26px] flex flex-col gap-[18px]">
                            <div>
                                <h2 className="text-[16px] font-semibold mb-[6px]">Stage Milestones</h2>
                                <p className="text-[12px] opacity-40">Key deliverables for this phase</p>
                            </div>
                            <div className="flex flex-col gap-[12px]">
                                {stageData.milestones.map((label, i) => {
                                    const done = currentMilestoneStates[i] || false;
                                    return (
                                        <div key={i} className={`flex items-center gap-[14px] px-[16px] py-[12px] rounded-[12px] ${done ? 'bg-[#725CF7]/10' : 'bg-white/[0.03]'}`}>
                                            <div className={`w-[22px] h-[22px] rounded-full flex items-center justify-center flex-shrink-0 text-[11px] font-bold
                                                ${done ? 'PopupAttentionGradient' : 'border border-white/20 opacity-40'}
                                            `}>
                                                {done ? '✓' : ''}
                                            </div>
                                            <span className={`text-[13px] font-light ${done ? 'opacity-90' : 'opacity-40'}`}>{label}</span>
                                            {done && <span className="ml-auto text-[10px] text-[#725CF7] font-medium flex-shrink-0">Done</span>}
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Completion count */}
                            <div className="border-t border-white/5 pt-[14px] flex items-center justify-between">
                                <span className="text-[12px] opacity-40">
                                    {currentMilestoneStates.filter(Boolean).length} of {stageData.milestones.length} completed
                                </span>
                                <div className="w-[80px] h-[4px] rounded-full bg-white/10">
                                    <div
                                        className="h-full rounded-full"
                                        style={{
                                            width: `${(currentMilestoneStates.filter(Boolean).length / Math.max(stageData.milestones.length, 1)) * 100}%`,
                                            background: 'linear-gradient(to right, #6265f0, #725CF7)'
                                        }}
                                    />
                                </div>
                            </div>
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
