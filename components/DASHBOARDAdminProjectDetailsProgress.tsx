"use client";

import { useEffect, useState } from 'react';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { writeNotification } from '../utils/notifications';
import { db } from '../firebaseConfig';
import Link from 'next/link';
import Image from 'next/image';
import DashboardAdminSideNav from '@/components/DashboardAdminSideNav';
import NotificationBell from '@/components/NotificationBell';

interface DASHBOARDAdminProjectDetailsProgressProps {
    userId: string;
    projectId: string;
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

// Default milestone states (all false)
const defaultMilestones = (): Record<string, boolean[]> => ({
    '1': [false, false, false, false],
    '2': [false, false, false, false],
    '3': [false, false, false, false, false],
    '4': [false, false, false, false, false],
    '5': [false, false, false, false],
});

const DASHBOARDAdminProjectDetailsProgress = ({ userId, projectId }: DASHBOARDAdminProjectDetailsProgressProps) => {
    const [projectDetails, setProjectDetails] = useState<any | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [savedMsg, setSavedMsg] = useState(false);

    // Edit state (local, applied on save)
    const [editStage, setEditStage] = useState(1);
    const [editProgress, setEditProgress] = useState(0);
    const [editActivity, setEditActivity] = useState('');
    const [editMilestones, setEditMilestones] = useState<Record<string, boolean[]>>(defaultMilestones());

    useEffect(() => {
        const fetchProjectDetails = async () => {
            if (!userId || !projectId) return;
            try {
                const projectDocRef = doc(db, 'users', userId, 'projects', projectId);
                const projectDoc = await getDoc(projectDocRef);
                if (projectDoc.exists()) {
                    const data = projectDoc.data();
                    setProjectDetails(data);
                    setEditStage(data.status || 1);
                    setEditProgress(Number(data.progress) || 0);
                    setEditActivity(data.recentActivity || '');
                    // Merge stored milestones with defaults
                    const stored = data.stageMilestones || {};
                    const merged = defaultMilestones();
                    Object.keys(merged).forEach(k => {
                        if (Array.isArray(stored[k]) && stored[k].length === merged[k].length) {
                            merged[k] = stored[k];
                        }
                    });
                    setEditMilestones(merged);
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

    const handleSave = async () => {
        if (!userId || !projectId) return;
        setSaving(true);
        try {
            const projectDocRef = doc(db, 'users', userId, 'projects', projectId);
            await updateDoc(projectDocRef, {
                status: editStage,
                progress: editProgress,
                recentActivity: editActivity,
                stageMilestones: editMilestones,
            });
            setProjectDetails((prev: any) => ({
                ...prev,
                status: editStage,
                progress: editProgress,
                recentActivity: editActivity,
                stageMilestones: editMilestones,
            }));
            const stageLabel = STAGES.find(s => s.id === editStage)?.label || 'a new stage';
            writeNotification(
                userId,
                'Project progress updated',
                `Your project moved to ${stageLabel} — ${editProgress}% complete.`,
                'project_update',
                projectId,
                `/dashboard/projects/${projectId}/progress?projectId=${projectId}&userId=${userId}`,
            );
            setSavedMsg(true);
            setTimeout(() => setSavedMsg(false), 2500);
        } catch (err) {
            console.error('Error saving progress:', err);
        } finally {
            setSaving(false);
        }
    };

    const toggleMilestone = (stageKey: string, index: number) => {
        setEditMilestones(prev => {
            const updated = { ...prev };
            updated[stageKey] = [...updated[stageKey]];
            updated[stageKey][index] = !updated[stageKey][index];
            return updated;
        });
    };

    if (loading) {
        return (
            <div className="flex flex-col xl:flex-row h-screen DashboardBackgroundGradient overflow-hidden">
                <DashboardAdminSideNav highlight="projects" />
                <div className="flex-1 flex items-center justify-center pt-[60px] xl:pt-0">
                    <p className="opacity-40 font-light text-[14px]">Loading project...</p>
                </div>
            </div>
        );
    }

    if (error || !projectDetails) {
        return (
            <div className="flex flex-col xl:flex-row h-screen DashboardBackgroundGradient overflow-hidden">
                <DashboardAdminSideNav highlight="projects" />
                <div className="flex-1 flex items-center justify-center pt-[60px] xl:pt-0">
                    <p className="text-red-400 text-[14px]">{error || 'Something went wrong.'}</p>
                </div>
            </div>
        );
    }

    const { projectName, approval, dueDate, dateCreated, logoAttachment } = projectDetails;

    const currentStage = editStage;
    const currentProgress = editProgress;
    const stageData = STAGE_DETAILS[currentStage] || STAGE_DETAILS[1];
    const stageName = STAGES.find(s => s.id === currentStage)?.label || 'Planning';
    const currentMilestones = editMilestones[String(currentStage)] || [];

    const getApprovalStyle = () => {
        if (approval === 'Approved') return 'text-green-400 bg-green-400/10 px-[12px] py-[4px] rounded-full text-[12px]';
        if (approval === 'Declined') return 'text-red-400 bg-red-400/10 px-[12px] py-[4px] rounded-full text-[12px]';
        return 'text-yellow-400 bg-yellow-400/10 px-[12px] py-[4px] rounded-full text-[12px]';
    };

    return (
        <div className="flex flex-col xl:flex-row h-screen DashboardBackgroundGradient overflow-hidden">
            <DashboardAdminSideNav highlight="projects" />

            <div className="flex-1 flex flex-col pt-[60px] xl:pt-0 min-h-0 overflow-hidden">
                <div className="absolute BottomGradientBorder left-0 top-[103px] w-full" />

                {/* Top Bar */}
                <div className="flex items-center justify-between px-[20px] sm:px-[50px] py-6 flex-shrink-0">
                    <div className="inline-flex items-center gap-[5px]">
                        <div className="inline-flex items-center gap-[5px] opacity-40">
                            <div className="w-[15px]">
                                <Image src="/Home Icon.png" alt="Home Icon" layout="responsive" width={0} height={0} />
                            </div>
                            <div className="font-light text-sm hidden sm:block">Admin</div>
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

                    <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-[20px]">

                        {/* LEFT — Live Preview (what client sees) */}
                        <div className="flex flex-col gap-[20px]">

                            {/* Label */}
                            <div className="flex items-center gap-[10px]">
                                <div className="w-[8px] h-[8px] rounded-full bg-[#725CF7]" />
                                <span className="text-[12px] opacity-50 uppercase tracking-wide">Client view preview</span>
                            </div>

                            {/* Hero Banner */}
                            <div className="BlackGradient ContentCardShadow rounded-[24px] px-[24px] sm:px-[35px] py-[28px]">
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
                                            <h1 className="text-[20px] sm:text-[22px] font-semibold">{projectName}</h1>
                                            <div className="flex items-center gap-[10px] mt-[4px]">
                                                <span className={getApprovalStyle()}>{approval || 'Pending'}</span>
                                                <span className="text-[12px] opacity-40">{dateCreated ? `Started ${dateCreated}` : ''}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-start sm:items-end gap-[4px]">
                                        <div className="text-[13px] opacity-50">Overall Progress</div>
                                        <div className="text-[34px] font-bold" style={{ color: '#725CF7' }}>{currentProgress}%</div>
                                        {dueDate && <div className="text-[12px] opacity-40">Due {dueDate}</div>}
                                    </div>
                                </div>
                                <div className="mt-[20px]">
                                    <div className="h-[8px] rounded-full bg-white/10">
                                        <div className="h-full rounded-full" style={{ width: `${Math.min(currentProgress, 100)}%`, background: 'linear-gradient(to right, #6265f0, #725CF7)', transition: 'width 0.5s ease' }} />
                                    </div>
                                    <div className="flex justify-between mt-[8px]">
                                        <span className="text-[11px] opacity-40">0%</span>
                                        <span className="text-[11px] opacity-40">100%</span>
                                    </div>
                                </div>
                            </div>

                            {/* Pipeline */}
                            <div className="BlackGradient ContentCardShadow rounded-[24px] px-[24px] sm:px-[35px] py-[26px]">
                                <h2 className="text-[16px] font-semibold mb-[22px]">Build Pipeline</h2>
                                <div className="flex items-center overflow-x-auto pb-[4px]">
                                    {STAGES.map((stage, i) => {
                                        const isDone = stage.id < currentStage;
                                        const isCurrent = stage.id === currentStage;
                                        const isFuture = stage.id > currentStage;
                                        return (
                                            <div key={stage.id} className="flex items-center flex-shrink-0">
                                                <div className="flex flex-col items-center gap-[10px]">
                                                    <div className={`w-[44px] h-[44px] rounded-full flex items-center justify-center text-[18px]
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
                                                    `}>{stage.label}</div>
                                                    {isCurrent && <div className="text-[10px] text-[#725CF7] font-medium -mt-[6px]">Current</div>}
                                                </div>
                                                {i < STAGES.length - 1 && (
                                                    <div className={`w-[30px] sm:w-[50px] h-[2px] mx-[4px] sm:mx-[8px] mb-[24px] rounded-full flex-shrink-0 ${stage.id < currentStage ? 'bg-[#725CF7]' : 'bg-white/10'}`} />
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Stage info + Milestones preview */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-[20px]">
                                <div className="BlackGradient ContentCardShadow rounded-[24px] px-[24px] py-[24px] flex flex-col gap-[14px]">
                                    <div className="flex items-center gap-[10px]">
                                        <span className="text-[20px]">{STAGES.find(s => s.id === currentStage)?.icon}</span>
                                        <h2 className="text-[15px] font-semibold">Stage {currentStage}: {stageName}</h2>
                                    </div>
                                    <p className="text-[12px] font-light opacity-50 leading-[1.6]">{stageData.description}</p>
                                    <div className="border-t border-white/5 pt-[14px]">
                                        <p className="text-[11px] opacity-40 uppercase tracking-wide mb-[10px]">Coming Up</p>
                                        {stageData.nextUp.map((item, i) => (
                                            <div key={i} className="flex items-center gap-[8px] mb-[6px]">
                                                <div className="w-[5px] h-[5px] rounded-full flex-shrink-0" style={{ background: '#725CF7' }} />
                                                <span className="text-[12px] opacity-50">{item}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div className="BlackGradient ContentCardShadow rounded-[24px] px-[24px] py-[24px] flex flex-col gap-[12px]">
                                    <div>
                                        <h2 className="text-[15px] font-semibold mb-[4px]">Milestones</h2>
                                        <p className="text-[11px] opacity-40">As client will see them</p>
                                    </div>
                                    {stageData.milestones.map((label, i) => {
                                        const done = currentMilestones[i] || false;
                                        return (
                                            <div key={i} className={`flex items-center gap-[12px] px-[14px] py-[10px] rounded-[10px] ${done ? 'bg-[#725CF7]/10' : 'bg-white/[0.03]'}`}>
                                                <div className={`w-[20px] h-[20px] rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold ${done ? 'PopupAttentionGradient' : 'border border-white/20 opacity-40'}`}>
                                                    {done ? '✓' : ''}
                                                </div>
                                                <span className={`text-[12px] font-light ${done ? 'opacity-90' : 'opacity-40'}`}>{label}</span>
                                            </div>
                                        );
                                    })}
                                    <div className="border-t border-white/5 pt-[10px] flex items-center justify-between">
                                        <span className="text-[11px] opacity-40">{currentMilestones.filter(Boolean).length} of {stageData.milestones.length} done</span>
                                        <div className="w-[70px] h-[3px] rounded-full bg-white/10">
                                            <div className="h-full rounded-full" style={{ width: `${(currentMilestones.filter(Boolean).length / Math.max(stageData.milestones.length, 1)) * 100}%`, background: 'linear-gradient(to right, #6265f0, #725CF7)' }} />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Recent Activity preview */}
                            {editActivity && (
                                <div className="BlackGradient ContentCardShadow rounded-[24px] px-[24px] sm:px-[35px] py-[24px]">
                                    <h2 className="text-[15px] font-semibold mb-[14px]">Recent Activity</h2>
                                    <div className="flex items-start gap-[12px]">
                                        <div className="w-[7px] h-[7px] rounded-full mt-[5px] flex-shrink-0" style={{ background: 'linear-gradient(135deg, #6265f0, #725CF7)' }} />
                                        <p className="text-[13px] font-light opacity-70 leading-[1.7]">{editActivity}</p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* RIGHT — Admin Controls */}
                        <div className="flex flex-col gap-[16px]">

                            {/* Header */}
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-[10px]">
                                    <div className="w-[8px] h-[8px] rounded-full bg-orange-400" />
                                    <span className="text-[12px] opacity-50 uppercase tracking-wide">Admin controls</span>
                                </div>
                                <button
                                    onClick={handleSave}
                                    disabled={saving}
                                    className="PopupAttentionGradient PopupAttentionShadow px-[20px] py-[9px] rounded-[10px] text-[13px] font-medium disabled:opacity-50"
                                >
                                    {saving ? 'Saving...' : savedMsg ? '✓ Saved' : 'Save Changes'}
                                </button>
                            </div>

                            {/* Stage Selector */}
                            <div className="BlackGradient ContentCardShadow rounded-[20px] px-[22px] py-[20px] flex flex-col gap-[14px]">
                                <div>
                                    <h3 className="text-[14px] font-semibold mb-[4px]">Build Stage</h3>
                                    <p className="text-[11px] opacity-40">Sets client&apos;s pipeline view</p>
                                </div>
                                <div className="flex flex-col gap-[8px]">
                                    {STAGES.map(stage => (
                                        <button
                                            key={stage.id}
                                            onClick={() => setEditStage(stage.id)}
                                            className={`flex items-center gap-[12px] px-[16px] py-[11px] rounded-[12px] text-left transition-all
                                                ${editStage === stage.id ? 'PopupAttentionGradient PopupAttentionShadow' : 'BlackWithLightGradient ContentCardShadow hover:bg-white/[0.05]'}
                                            `}
                                        >
                                            <span className="text-[16px]">{stage.icon}</span>
                                            <div className="flex-1">
                                                <div className="text-[13px] font-medium">Stage {stage.id}: {stage.label}</div>
                                                <div className="text-[11px] opacity-50 mt-[1px]">{STAGE_DETAILS[stage.id].headline}</div>
                                            </div>
                                            {editStage === stage.id && <span className="text-[11px] font-semibold opacity-80">Active</span>}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Progress % */}
                            <div className="BlackGradient ContentCardShadow rounded-[20px] px-[22px] py-[20px] flex flex-col gap-[14px]">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h3 className="text-[14px] font-semibold mb-[2px]">Progress</h3>
                                        <p className="text-[11px] opacity-40">Overall % shown to client</p>
                                    </div>
                                    <div className="text-[28px] font-bold" style={{ color: '#725CF7' }}>{editProgress}%</div>
                                </div>
                                <input
                                    type="range"
                                    min={0}
                                    max={100}
                                    value={editProgress}
                                    onChange={e => setEditProgress(Number(e.target.value))}
                                    className="w-full accent-[#725CF7] h-[4px] rounded-full"
                                />
                                <div className="flex justify-between">
                                    {[0, 25, 50, 75, 100].map(v => (
                                        <button key={v} onClick={() => setEditProgress(v)}
                                            className={`text-[11px] px-[8px] py-[3px] rounded-[6px] ${editProgress === v ? 'PopupAttentionGradient' : 'opacity-30 hover:opacity-60'}`}>
                                            {v}%
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Milestones for current stage */}
                            <div className="BlackGradient ContentCardShadow rounded-[20px] px-[22px] py-[20px] flex flex-col gap-[14px]">
                                <div>
                                    <h3 className="text-[14px] font-semibold mb-[2px]">Milestones — Stage {currentStage}</h3>
                                    <p className="text-[11px] opacity-40">Toggle what client sees as completed</p>
                                </div>
                                <div className="flex flex-col gap-[8px]">
                                    {stageData.milestones.map((label, i) => {
                                        const done = editMilestones[String(currentStage)]?.[i] || false;
                                        return (
                                            <button
                                                key={i}
                                                onClick={() => toggleMilestone(String(currentStage), i)}
                                                className={`flex items-center gap-[12px] px-[14px] py-[11px] rounded-[12px] text-left transition-all
                                                    ${done ? 'bg-[#725CF7]/15 ring-1 ring-[#725CF7]/30' : 'BlackWithLightGradient ContentCardShadow hover:bg-white/[0.04]'}
                                                `}
                                            >
                                                <div className={`w-[20px] h-[20px] rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-bold transition-all
                                                    ${done ? 'PopupAttentionGradient' : 'border border-white/20 opacity-40'}
                                                `}>
                                                    {done ? '✓' : ''}
                                                </div>
                                                <span className={`text-[12px] font-light ${done ? 'opacity-90' : 'opacity-50'}`}>{label}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Recent Activity */}
                            <div className="BlackGradient ContentCardShadow rounded-[20px] px-[22px] py-[20px] flex flex-col gap-[12px]">
                                <div>
                                    <h3 className="text-[14px] font-semibold mb-[2px]">Recent Activity</h3>
                                    <p className="text-[11px] opacity-40">Shown at the bottom of the client&apos;s progress page</p>
                                </div>
                                <textarea
                                    value={editActivity}
                                    onChange={e => setEditActivity(e.target.value)}
                                    rows={3}
                                    placeholder="e.g. Homepage design delivered and approved. Moving to development phase..."
                                    className="w-full bg-white/5 border border-white/10 rounded-[12px] px-[14px] py-[12px] text-[13px] font-light opacity-80 placeholder:opacity-30 focus:outline-none focus:ring-1 focus:ring-[#725CF7] resize-none"
                                />
                            </div>

                            {/* Save button (bottom) */}
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="PopupAttentionGradient PopupAttentionShadow w-full py-[13px] rounded-[14px] text-[14px] font-semibold disabled:opacity-50"
                            >
                                {saving ? 'Saving...' : savedMsg ? '✓ Changes Saved!' : 'Save & Push to Client'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DASHBOARDAdminProjectDetailsProgress;
