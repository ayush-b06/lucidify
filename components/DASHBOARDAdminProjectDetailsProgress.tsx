"use client";

import { useEffect, useState, useRef } from 'react';
import { doc, getDoc, runTransaction, DocumentData } from 'firebase/firestore';
import { queueNotification } from '../utils/notifications';
import { db } from '../firebaseConfig';
import { STAGES, STAGE_DETAILS, defaultMilestones, progressFields, normalizeStage, normalizeProgress, stageProgress } from '@/utils/projectProgress';
import Link from 'next/link';
import Image from 'next/image';
import DashboardAdminSideNav from '@/components/DashboardAdminSideNav';
import DashboardTopBar from './DashboardTopBar';

interface DASHBOARDAdminProjectDetailsProgressProps {
    userId: string;
    projectId: string;
}

const DASHBOARDAdminProjectDetailsProgress = ({ userId, projectId }: DASHBOARDAdminProjectDetailsProgressProps) => {
    const [projectDetails, setProjectDetails] = useState<DocumentData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [saveError, setSaveError] = useState('');
    const [saving, setSaving] = useState(false);
    const [savedMsg, setSavedMsg] = useState(false);

    const baseline = useRef('');
    const savingRef = useRef(false);
    const [attempt, setAttempt] = useState(0);
    const [progressMode, setProgressMode] = useState('manual');

    // Edit state (local, applied on save)
    const [editStage, setEditStage] = useState(1);
    const [editProgress, setEditProgress] = useState(0);
    const [editActivity, setEditActivity] = useState('');
    const [editMilestones, setEditMilestones] = useState<Record<string, boolean[]>>(defaultMilestones());

    useEffect(() => {
        let active = true;
        setLoading(true); setError(null); setSavedMsg(false);
        const fetchProjectDetails = async () => {
            if (!userId || !projectId) return;
            try {
                const projectDocRef = doc(db, 'users', userId, 'projects', projectId);
                const projectDoc = await getDoc(projectDocRef);
                if (!active) return;
                if (projectDoc.exists()) {
                    const data = projectDoc.data();
                    setProjectDetails(data);
                    const fields = progressFields(data);
                    baseline.current = JSON.stringify(fields);
                    setEditStage(fields.status); setEditProgress(fields.progress);
                    setEditActivity(fields.recentActivity); setEditMilestones(fields.stageMilestones);
                    setProgressMode(fields.progressMode);
                } else {
                    setError('Project not found.');
                }
            } catch (err) {
                if (!active) return;
                setError('Failed to fetch project details.');
            } finally {
                if (active) setLoading(false);
            }
        };
        fetchProjectDetails();
        return () => { active = false; };
    }, [userId, projectId, attempt]);

    const draft = { status: editStage, progress: editProgress, recentActivity: editActivity, stageMilestones: editMilestones, progressMode };
    const dirty = !!projectDetails && JSON.stringify(progressFields(draft)) !== baseline.current;
    useEffect(() => { if (dirty) setSavedMsg(false); }, [dirty, editStage, editProgress, editActivity, editMilestones]);
    useEffect(() => {
        if (!dirty) return;
        const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
        window.addEventListener('beforeunload', warn);
        return () => window.removeEventListener('beforeunload', warn);
    }, [dirty]);
    const handleSave = async () => {
        if (!userId || !projectId || savingRef.current || !dirty) return;
        savingRef.current = true; setSaving(true); setSaveError('');
        const updates = progressFields(draft);
        try {
            const projectDocRef = doc(db, 'users', userId, 'projects', projectId);
            const expected = baseline.current;
            await runTransaction(db, async transaction => {
                const snapshot = await transaction.get(projectDocRef);
                if (!snapshot.exists()) throw new Error('This project no longer exists.');
                if (JSON.stringify(progressFields(snapshot.data())) !== expected) throw new Error('Progress changed in another session. Reload the saved version before editing again.');
                transaction.update(projectDocRef, updates);
                queueNotification(transaction, userId, 'Project progress updated', `${STAGES[updates.status - 1].label} — ${updates.progress}% complete.`, 'project_update', projectId, `/dashboard/projects/${projectId}/progress`);
            });
            baseline.current = JSON.stringify(updates);
            setProjectDetails(prev => ({ ...prev, ...updates }));
            setSavedMsg(true);
        } catch (err) {
            setSaveError(err instanceof Error && !('code' in err) ? err.message : 'Could not save progress. Your changes are still here. Please try again.');
        } finally { savingRef.current = false; setSaving(false); }
    };
    const selectStage = (value: number) => {
        const stage = normalizeStage(value);
        setEditStage(stage); setEditProgress(stageProgress(stage, editMilestones)); setProgressMode('automatic'); setSaveError('');
    };
    const setManualProgress = (value: number) => { setEditProgress(normalizeProgress(value)); setProgressMode('manual'); };
    const toggleMilestone = (stageKey: string, index: number) => {
        const next = { ...editMilestones, [stageKey]: editMilestones[stageKey].map((done, i) => i === index ? !done : done) };
        setEditMilestones(next); setEditProgress(stageProgress(editStage, next)); setProgressMode('automatic');
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
                    <div><p role="alert" className="text-red-400 text-[14px]">{error || 'Something went wrong.'}</p><button onClick={() => setAttempt(n => n + 1)} className="underline">Retry</button></div>
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
                <DashboardTopBar title="Progress" />
                {saveError && <div role="alert" className="DashboardNotice">{saveError} {saveError.includes('another session') && <button disabled={saving} onClick={() => { setSaveError(''); setAttempt(n => n + 1); }}>Reload saved version</button>}</div>}

                <p role="status" className="px-6 py-2 text-sm">{saving ? 'Saving progress…' : dirty ? 'Unsaved changes — save to update the client.' : savedMsg ? 'Progress saved. The client is up to date.' : 'Showing saved progress.'} <span className="font-semibold ml-2">Preview: {editProgress}%</span></p>
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
                                    <div role="progressbar" aria-label="Build progress preview" aria-valuemin={0} aria-valuemax={100} aria-valuenow={currentProgress} className="h-[8px] rounded-full bg-white/10">
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
                                    disabled={saving || !dirty}
                                    className="PopupAttentionGradient PopupAttentionShadow px-[20px] py-[9px] rounded-[10px] text-[13px] font-medium disabled:opacity-50"
                                >
                                    {saving ? 'Saving...' : savedMsg ? '✓ Saved' : 'Save Changes'}
                                </button>
                            </div>

                            {/* Stage Selector */}
                            <div className="BlackGradient ContentCardShadow rounded-[20px] px-[22px] py-[20px] flex flex-col gap-[14px]">
                                <div>
                                    <h3 className="text-[14px] font-semibold mb-[4px]">Build Stage</h3>
                                    <p className="text-[11px] opacity-40">Updates the pipeline and progress. Planning 0%, Designing 25%, Developing 50%, Launching 75%, Maintaining 100%.</p>
                                </div>
                                <div className="flex flex-col gap-[8px]">
                                    {STAGES.map(stage => (
                                        <button
                                            key={stage.id}
                                            aria-pressed={editStage === stage.id} disabled={saving} onClick={() => selectStage(stage.id)}
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
                                        <p className="text-[11px] opacity-40">{progressMode === 'automatic' ? 'Calculated from the stage and its milestones.' : 'Manual percentage. Changing a stage or milestone recalculates it.'}</p>
                                    </div>
                                    <div className="text-[28px] font-bold" style={{ color: '#725CF7' }}>{editProgress}%</div>
                                </div>
                                <input
                                    type="range" aria-label="Overall progress" disabled={saving}
                                    min={0}
                                    max={100}
                                    value={editProgress}
                                    onChange={e => setManualProgress(Number(e.target.value))}
                                    className="w-full accent-[#725CF7] h-[4px] rounded-full"
                                />
                                <div className="flex justify-between">
                                    {[0, 25, 50, 75, 100].map(v => (
                                        <button key={v} disabled={saving} onClick={() => setManualProgress(v)}
                                            className={`text-[11px] px-[8px] py-[3px] rounded-[6px] ${editProgress === v ? 'PopupAttentionGradient' : 'opacity-30 hover:opacity-60'}`}>
                                            {v}%
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {progressMode === 'manual' && <button disabled={saving} className="text-sm underline" onClick={() => selectStage(editStage)}>Use stage and milestone progress</button>}
                            {/* Milestones for current stage */}
                            <div className="BlackGradient ContentCardShadow rounded-[20px] px-[22px] py-[20px] flex flex-col gap-[14px]">
                                <div>
                                    <h3 className="text-[14px] font-semibold mb-[2px]">Milestones — Stage {currentStage}</h3>
                                    <p className="text-[11px] opacity-40">Completed milestones advance this stage’s progress. Maintenance tasks do not reduce a completed build.</p>
                                </div>
                                <div className="flex flex-col gap-[8px]">
                                    {stageData.milestones.map((label, i) => {
                                        const done = editMilestones[String(currentStage)]?.[i] || false;
                                        return (
                                            <button
                                                key={i}
                                                role="checkbox" aria-checked={done} disabled={saving} onClick={() => toggleMilestone(String(currentStage), i)}
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
                                <textarea aria-label="Recent activity" disabled={saving}
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
                                disabled={saving || !dirty}
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
