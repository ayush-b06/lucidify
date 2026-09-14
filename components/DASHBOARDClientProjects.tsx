"use client";

import { useState } from 'react';
import { deleteDoc, doc } from 'firebase/firestore';
import { useClientProjects } from '@/hooks/useClientProjects';
import { projectState, projectProgress, projectHref, projectNextStep, projectStateLabels, ProjectState } from '@/utils/projectWorkflow';
import { db } from '../firebaseConfig';
import { useAuth } from '@/context/authContext';
import DashboardClientSideNav from './DashboardClientSideNav';
import Image from 'next/image';
import Link from 'next/link';
import CreateProjectPopup from './CreateProjectPopup';
import DashboardTopBar from './DashboardTopBar';
import { useTheme } from '@/context/themeContext';

const STATUS_CONFIG: Record<number, { color: string; bg: string; border: string; label: string }> = {
    1: { color: '#a89cff', bg: 'rgba(114,92,247,0.12)', border: 'rgba(114,92,247,0.25)', label: 'Planning' },
    2: { color: '#fbbf24', bg: 'rgba(251,191,36,0.12)', border: 'rgba(251,191,36,0.25)', label: 'Designing' },
    3: { color: '#60a5fa', bg: 'rgba(96,165,250,0.12)', border: 'rgba(96,165,250,0.25)', label: 'Developing' },
    4: { color: '#4ade80', bg: 'rgba(74,222,128,0.12)', border: 'rgba(74,222,128,0.25)', label: 'Launching' },
    5: { color: '#60a5fa', bg: 'rgba(96,165,250,0.12)', border: 'rgba(96,165,250,0.25)', label: 'Maintaining' },
};

const formatDate = (iso?: string) => {
    if (!iso || iso === 'N/A') return null;
    const date = new Date(/^\d{4}-\d{2}-\d{2}$/.test(iso) ? `${iso}T12:00:00` : iso);
    return Number.isNaN(date.getTime()) ? null : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const DASHBOARDClientProjects = () => {
    const { theme } = useTheme();
    const isDark = theme === 'dark';

    const { projects, loading, error, retry } = useClientProjects();
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState<ProjectState | 'all'>('all');
    const [actionError, setActionError] = useState('');
    const visibleProjects = projects.filter(project =>
        (filter === 'all' || projectState(project) === filter) &&
        `${project.projectName} ${project.projectDescription || ''}`.toLowerCase().includes(search.trim().toLowerCase())
    );
    const [isCreateProjectPopupOpen, setIsCreateProjectPopupOpen] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const toggleCreateProjectPopup = () => setIsCreateProjectPopupOpen(p => !p);

    const { user } = useAuth();

    const handleDeleteProject = async (uid: string) => {
        if (!user) return;
        if (!window.confirm('Are you sure you want to cancel this project?')) return;
        setDeletingId(uid);
        setActionError('');
        try {
            await deleteDoc(doc(db, 'users', user.uid, 'projects', uid));
        } catch { setActionError('We couldn’t cancel the project. Please try again.'); }
        finally { setDeletingId(null); }
    };

    // Theme tokens
    const textColor = isDark ? '#ffffff' : '#111111';
    const mutedColor = isDark ? 'rgba(255,255,255,0.40)' : 'rgba(0,0,0,0.40)';
    const cardBg = isDark ? 'linear-gradient(145deg, #141416 0%, #0f0f11 100%)' : 'rgba(255,255,255,0.88)';
    const cardBorder = isDark ? '1px solid rgba(255,255,255,0.07)' : '1px solid rgba(0,0,0,0.07)';
    const trackBg = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';

    return (
        <div className="flex flex-col xl:flex-row h-screen DashboardBackgroundGradient overflow-hidden">
            <CreateProjectPopup
                closeCreatProjectPopup={toggleCreateProjectPopup}
                isVisible={isCreateProjectPopupOpen}
            />

            <DashboardClientSideNav highlight="projects" />

            <div className="flex-1 flex flex-col pt-[60px] xl:pt-0 min-h-0 overflow-hidden">
                <DashboardTopBar title="Projects" />

                <div className="flex-1 overflow-y-auto px-[20px] sm:px-[50px] pt-[30px] pb-[40px]">

                    {/* Header + toolbar */}
                    <div className="flex items-end justify-between mb-[28px]">
                        <div>
                            <h1 className="font-semibold text-[26px]">Projects</h1>
                            <p className="text-[14px] mt-[3px] opacity-50">View and manage your projects.</p>
                        </div>
                        <button
                            onClick={toggleCreateProjectPopup}
                            className="flex items-center gap-[8px] px-[18px] h-[42px] rounded-[12px] ContentCardShadow AddProjectGradient text-white text-[14px] font-medium transition-opacity hover:opacity-85 active:scale-[0.98]"
                        >
                            <span className="text-[16px] leading-none">+</span>
                            New project
                        </button>
                    </div>

                    <div className="flex flex-wrap gap-3 mb-5">
                        <input aria-label="Search projects" placeholder="Search projects..." value={search} onChange={event => setSearch(event.target.value)} className="BlackWithLightGradient rounded-xl px-4 py-3 flex-1 min-w-0" />
                        <select aria-label="Filter projects" value={filter} onChange={event => setFilter(event.target.value as ProjectState | 'all')} className="BlackWithLightGradient rounded-xl px-4 py-3">
                            <option value="all">All projects ({projects.length})</option>
                            {Object.entries(projectStateLabels).map(([state, label]) => <option key={state} value={state}>{label} ({projects.filter(project => projectState(project) === state).length})</option>)}
                        </select>
                    </div>
                    {actionError && <p role="alert" className="mb-4">{actionError}</p>}
                    {/* States */}
                    {error ? (
                        <div role="alert" className="BlackGradient rounded-xl p-6"><p>{error}</p><button onClick={retry} className="underline mt-3">Try again</button></div>
                    ) : loading ? (
                        <div className="flex flex-col gap-[12px]">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="h-[100px] rounded-[16px] animate-pulse"
                                    style={{ background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)' }} />
                            ))}
                        </div>
                    ) : projects.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-[70px] gap-[14px] rounded-[20px]"
                            style={{ background: cardBg, border: cardBorder }}>
                            <div className="text-[44px] opacity-20">📂</div>
                            <p className="text-[15px] font-medium opacity-40">No projects yet</p>
                            <p className="text-[13px] opacity-30 mb-[4px]">Click &quot;New project&quot; above to get started.</p>
                            <button
                                onClick={toggleCreateProjectPopup}
                                className="mt-[4px] px-[20px] h-[40px] rounded-[12px] text-[13px] font-medium text-white transition-opacity hover:opacity-85"
                                style={{ background: 'linear-gradient(135deg, #5240c9, #7255e0)', boxShadow: '0 4px 16px rgba(82,56,200,0.35)' }}
                            >
                                Create your first project
                            </button>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-[12px]">
                            {visibleProjects.length === 0 && <div className="BlackGradient rounded-xl p-6"><p>No projects match your search.</p><button className="underline mt-3" onClick={() => { setSearch(''); setFilter('all'); }}>Clear filters</button></div>}
                            {visibleProjects.map((project) => {
                                const statusCfg = STATUS_CONFIG[project.status ?? 1] || STATUS_CONFIG[1];
                                const logoSrc = project.logoUrl || project.logoAttachment || '/Lucidify Umbrella.png';
                                const progressNum = projectProgress(project.progress);
                                const state = projectState(project);
                                const isSetupIncomplete = state === 'setup';
                                const isPending = state === 'pending';
                                const isApproved = state === 'approved';

                                const cardHref = isSetupIncomplete || isApproved ? projectHref(project) : null;

                                const cardStyle = {
                                    background: cardBg,
                                    border: cardBorder,
                                    boxShadow: isDark ? '0 2px 16px rgba(0,0,0,0.35)' : '0 2px 16px rgba(0,0,0,0.07)',
                                    opacity: isPending ? 0.65 : 1,
                                };

                                const innerContent = (
                                    <>
                                        {/* Setup incomplete: accent top bar */}
                                        {isSetupIncomplete && (
                                            <div className="h-[3px] w-full"
                                                style={{ background: 'linear-gradient(to right, #5240c9, #7255e0)' }} />
                                        )}

                                        {/* Card content */}
                                        <div className="px-[22px] py-[20px]">
                                            <div className="flex items-center gap-[16px]">

                                                {/* Logo */}
                                                <div className="relative w-[46px] h-[46px] flex-shrink-0 rounded-[12px] overflow-hidden"
                                                    style={{ background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)', border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.08)' }}>
                                                    <Image src={logoSrc} alt="Logo" layout="fill" objectFit="contain" />
                                                </div>

                                                {/* Name + meta */}
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-[10px] flex-wrap">
                                                        <p className="font-semibold text-[15px] truncate">{project.projectName}</p>

                                                        {/* State chips */}
                                                        {isSetupIncomplete && (
                                                            <span className="flex items-center gap-[5px] px-[8px] py-[3px] rounded-[6px] text-[11px] font-medium flex-shrink-0"
                                                                style={{ background: 'rgba(114,85,224,0.15)', color: '#a89cff', border: '1px solid rgba(114,85,224,0.25)' }}>
                                                                Setup needed
                                                            </span>
                                                        )}
                                                        {isPending && (
                                                            <span className="flex items-center gap-[5px] px-[8px] py-[3px] rounded-[6px] text-[11px] font-medium flex-shrink-0"
                                                                style={{ background: 'rgba(251,191,36,0.12)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.25)' }}>
                                                                Pending approval
                                                            </span>
                                                        )}
                                                        {state === 'declined' && <span className="text-[12px] text-red-400">Declined</span>}
                                                        {isApproved && (
                                                            <span className="flex items-center gap-[5px] px-[8px] py-[3px] rounded-[6px] text-[11px] font-medium flex-shrink-0"
                                                                style={{ background: statusCfg.bg, color: statusCfg.color, border: `1px solid ${statusCfg.border}` }}>
                                                                {statusCfg.label}
                                                            </span>
                                                        )}
                                                    </div>

                                                    {/* Sub-row */}
                                                    <div className="flex items-center gap-[16px] mt-[5px] flex-wrap">
                                                        {project.dateCreated && (
                                                            <span className="text-[12px]" style={{ color: mutedColor }}>
                                                                Created {formatDate(project.dateCreated)}
                                                            </span>
                                                        )}
                                                        {project.recentActivity && project.recentActivity !== 'N/A' && (
                                                            <span className="text-[12px] truncate max-w-[200px]" style={{ color: mutedColor }}>
                                                                {project.recentActivity}
                                                            </span>
                                                        )}
                                                        {project.dueDate && (
                                                            <span className="text-[12px]" style={{ color: mutedColor }}>
                                                                Due {formatDate(project.dueDate) ?? project.dueDate}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Right: progress (desktop only) + cancel */}
                                                <div className="hidden sm:flex items-center gap-[20px] flex-shrink-0">
                                                    {isApproved && (
                                                        <div className="flex flex-col gap-[6px] w-[120px]">
                                                            <div className="flex items-center justify-between">
                                                                <span className="text-[11px]" style={{ color: mutedColor }}>Progress</span>
                                                                <span className="text-[11px] font-medium" style={{ color: textColor }}>{progressNum}%</span>
                                                            </div>
                                                            <div className="h-[5px] rounded-full overflow-hidden" style={{ background: trackBg }}>
                                                                <div className="h-full rounded-full transition-all duration-700"
                                                                    style={{ width: `${progressNum}%`, background: 'linear-gradient(to right, #5240c9, #7255e0)' }} />
                                                            </div>
                                                        </div>
                                                    )}

                                                    {isPending && (
                                                        <button
                                                            onClick={() => handleDeleteProject(project.uid)}
                                                            disabled={deletingId === project.uid}
                                                            className="px-[14px] h-[34px] rounded-[10px] text-[12px] font-medium transition-all hover:opacity-80 disabled:opacity-40 flex-shrink-0"
                                                            style={{
                                                                background: isDark ? 'rgba(241,63,94,0.10)' : 'rgba(241,63,94,0.08)',
                                                                color: '#f87171',
                                                                border: '1px solid rgba(241,63,94,0.25)',
                                                            }}
                                                        >
                                                            {deletingId === project.uid ? 'Cancelling...' : 'Cancel'}
                                                        </button>
                                                    )}
                                                </div>
                                            </div>

                                            <p className="text-[13px] mt-3 opacity-70">{projectNextStep(project)}</p>
                                            {(isPending || state === 'declined') && <div className="flex gap-4 mt-3 text-[13px]">
                                                <Link className="underline" href={projectHref(project)}>View submitted brief</Link>
                                                <Link className="underline" href={`/dashboard/messages?projectId=${encodeURIComponent(project.uid)}`}>Ask the team</Link>
                                            </div>}
                                            {/* Mobile: progress bar */}
                                            {isApproved && (
                                                <div className="sm:hidden mt-[14px] flex items-center gap-[10px]">
                                                    <div className="flex-1 h-[5px] rounded-full overflow-hidden" style={{ background: trackBg }}>
                                                        <div className="h-full rounded-full" style={{ width: `${progressNum}%`, background: 'linear-gradient(to right, #5240c9, #7255e0)' }} />
                                                    </div>
                                                    <span className="text-[11px] flex-shrink-0" style={{ color: mutedColor }}>{progressNum}%</span>
                                                </div>
                                            )}

                                            {/* Mobile: cancel button */}
                                            {isPending && (
                                                <div className="sm:hidden mt-[12px]">
                                                    <button
                                                        onClick={() => handleDeleteProject(project.uid)}
                                                        disabled={deletingId === project.uid}
                                                        className="px-[14px] h-[32px] rounded-[10px] text-[12px] font-medium"
                                                        style={{ background: 'rgba(241,63,94,0.10)', color: '#f87171', border: '1px solid rgba(241,63,94,0.25)' }}
                                                    >
                                                        Cancel project
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </>
                                );

                                return cardHref ? (
                                    <Link
                                        key={project.uid}
                                        href={cardHref}
                                        className="block rounded-[16px] overflow-hidden transition-all duration-200 hover:opacity-90 active:scale-[0.995] cursor-pointer"
                                        style={cardStyle}
                                    >
                                        {innerContent}
                                    </Link>
                                ) : (
                                    <div key={project.uid} className="rounded-[16px] overflow-hidden transition-all duration-200" style={cardStyle}>
                                        {innerContent}
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Bottom add button */}
                    {!loading && (
                        <button
                            onClick={toggleCreateProjectPopup}
                            className="flex w-full items-center justify-center gap-[10px] mt-[14px] h-[72px] rounded-[16px] transition-all hover:opacity-80 active:scale-[0.99]"
                            style={{
                                background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)',
                                border: isDark ? '1.5px dashed rgba(255,255,255,0.10)' : '1.5px dashed rgba(0,0,0,0.12)',
                            }}
                        >
                            <span className="text-[20px] leading-none" style={{ color: mutedColor }}>+</span>
                            <span className="text-[14px] font-medium" style={{ color: mutedColor }}>Add a new project</span>
                        </button>
                    )}

                </div>
            </div>
        </div>
    );
};

export default DASHBOARDClientProjects;
