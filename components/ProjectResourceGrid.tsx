"use client";

import React, { useEffect, useState } from 'react';
import { doc, updateDoc, writeBatch } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { useDialog } from '@/hooks/useDialog';
import { useTheme } from '@/context/themeContext';
import { queueAdminNotification } from '@/utils/notifications';
import {
    ProjectResource, UPLOAD_KINDS, UploadKind, kindLabel, removeResource, removalWarning,
} from '@/utils/projectUploads';

interface ProjectResourceGridProps {
    resources: ProjectResource[];
    userId: string;
    projectId: string;
    projectName: string;
    isAdmin: boolean;
}

const formatDate = (value: string) => {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
};

const ProjectResourceGrid = ({ resources, userId, projectId, projectName, isAdmin }: ProjectResourceGridProps) => {
    const { theme } = useTheme();
    const isDark = theme === 'dark';
    const muted = isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.45)';
    const surface = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)';

    const [filter, setFilter] = useState<UploadKind | 'all'>('all');
    const [expanded, setExpanded] = useState<number | null>(null);
    const [pendingRemoval, setPendingRemoval] = useState<ProjectResource | null>(null);
    const [removing, setRemoving] = useState(false);
    const [actionError, setActionError] = useState('');

    const present = UPLOAD_KINDS.filter(entry => resources.some(resource => resource.kind === entry.id));
    const shown = filter === 'all' ? resources : resources.filter(resource => resource.kind === filter);

    // A filter that no longer matches anything would otherwise strand the client on an empty grid.
    useEffect(() => {
        if (filter !== 'all' && !resources.some(resource => resource.kind === filter)) setFilter('all');
    }, [filter, resources]);

    // Arrow keys move through the expanded image, Escape closes it.
    useEffect(() => {
        if (expanded === null) return;
        const onKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape') setExpanded(null);
            if (event.key === 'ArrowRight') setExpanded(current => current === null ? null : (current + 1) % shown.length);
            if (event.key === 'ArrowLeft') setExpanded(current => current === null ? null : (current - 1 + shown.length) % shown.length);
        };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [expanded, shown.length]);

    const toggleLike = async (resource: ProjectResource) => {
        setActionError('');
        const liked = !resource.liked;
        try {
            const base = ['users', userId, 'projects', projectId] as const;
            const ref = resource.origin.type === 'legacy'
                ? doc(db, ...base, resource.origin.path, resource.origin.docId)
                : resource.origin.type === 'upload' ? doc(db, ...base, 'uploads', resource.origin.docId) : null;
            if (!ref) return;
            if (!liked) {
                await updateDoc(ref, resource.origin.type === 'legacy' ? { selectedDesign: false } : { liked: false });
                return;
            }
            const batch = writeBatch(db);
            batch.update(ref, resource.origin.type === 'legacy' ? { selectedDesign: true } : { liked: true });
            queueAdminNotification(batch, 'A design was liked', `${resource.title} was marked as a favourite on ${projectName}.`,
                `/dashboard/projects/${projectId}/uploads?userId=${userId}`, 'upload');
            await batch.commit();
        } catch {
            setActionError('That could not be saved. Please try again.');
        }
    };

    const confirmRemoval = async () => {
        if (!pendingRemoval || removing) return;
        setRemoving(true); setActionError('');
        try {
            await removeResource(userId, projectId, pendingRemoval);
            setPendingRemoval(null);
            setExpanded(null);
        } catch {
            setActionError('That could not be removed. Please try again.');
        } finally { setRemoving(false); }
    };

    const removalRef = useDialog<HTMLDivElement>(!!pendingRemoval, () => setPendingRemoval(null), removing);
    const current = expanded === null ? null : shown[expanded];

    // The client may only remove what they added; Lucidify can tidy anything.
    const canRemove = (resource: ProjectResource) => isAdmin || resource.uploadedByRole === 'client';
    const canLike = (resource: ProjectResource) => !isAdmin && resource.kind === 'design' && resource.origin.type !== 'brief';

    return (
        <>
            {actionError && <p role="alert" className="text-red-400 text-[13px] mb-[14px]">{actionError}</p>}

            {present.length > 1 && (
                <div className="flex flex-wrap items-center gap-[8px] mb-[22px]" role="group" aria-label="Filter files">
                    {[{ id: 'all' as const, label: 'All', count: resources.length },
                    ...present.map(entry => ({ id: entry.id, label: entry.plural, count: resources.filter(r => r.kind === entry.id).length }))]
                        .map(chip => (
                            <button
                                key={chip.id} onClick={() => setFilter(chip.id)} aria-pressed={filter === chip.id}
                                className={`flex items-center gap-[8px] px-[15px] py-[8px] rounded-[10px] text-[13px] font-medium transition-all ${filter === chip.id ? 'PopupAttentionGradient PopupAttentionShadow' : 'BlackWithLightGradient ContentCardShadow opacity-60 hover:opacity-90'}`}
                            >
                                {chip.label}
                                <span className={`text-[11px] px-[7px] py-[1px] rounded-full ${filter === chip.id ? 'bg-white/20' : 'bg-white/10'}`}>{chip.count}</span>
                            </button>
                        ))}
                </div>
            )}

            {shown.length === 0 ? (
                <div className="BlackGradient ContentCardShadow rounded-[24px] flex flex-col items-center justify-center py-[60px] gap-[12px]">
                    <div className="text-[40px] opacity-20">🖼️</div>
                    <p className="text-[15px] font-light opacity-40">Nothing here yet</p>
                    <p className="text-[12px] opacity-30 text-center max-w-[300px]">
                        {isAdmin
                            ? 'Designs and files you add appear here for the client.'
                            : 'Designs from Lucidify, and anything you add yourself, appear here.'}
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-[20px]">
                    {shown.map((resource, index) => (
                        <div key={resource.id} className="BlackGradient ContentCardShadow rounded-[20px] overflow-hidden flex flex-col">
                            <button
                                type="button" onClick={() => setExpanded(index)}
                                aria-label={`Expand ${resource.title}`}
                                className="relative w-full bg-white/5 cursor-zoom-in overflow-hidden block"
                                style={{ paddingBottom: '62%' }}
                            >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={resource.url} alt={resource.title} className="absolute inset-0 w-full h-full object-cover hover:scale-105 transition-transform duration-300" />
                                {resource.liked && (
                                    <span className="absolute top-[10px] left-[10px] bg-[#725CF7] text-white text-[10px] font-semibold px-[10px] py-[4px] rounded-full">♥ Liked</span>
                                )}
                            </button>

                            <div className="px-[18px] py-[16px] flex flex-col gap-[9px] flex-1">
                                <div className="flex items-start justify-between gap-[10px]">
                                    <h3 className="font-semibold text-[15px] leading-tight break-words min-w-0">{resource.title}</h3>
                                    <span className="flex-shrink-0 text-[11px] px-[9px] py-[3px] rounded-full" style={{ background: surface, color: muted }}>
                                        {kindLabel(resource.kind)}
                                    </span>
                                </div>

                                {resource.fileName && (
                                    <p className="text-[11px] font-mono truncate" style={{ color: muted }} title={resource.fileName}>{resource.fileName}</p>
                                )}
                                {resource.note && <p className="text-[12px] font-light opacity-55 leading-[1.5] line-clamp-2">{resource.note}</p>}

                                <div className="flex flex-wrap items-center gap-[6px]">
                                    {resource.tags.map(tag => (
                                        <span key={tag} className="text-[10px] px-[8px] py-[2px] rounded-full" style={{ background: surface, color: muted }}>{tag}</span>
                                    ))}
                                </div>

                                <p className="text-[11px] mt-auto pt-[4px]" style={{ color: muted }}>
                                    {resource.uploadedByRole === 'admin' ? 'Added by Lucidify' : 'Added by you'}
                                    {formatDate(resource.uploadedAt) && ` · ${formatDate(resource.uploadedAt)}`}
                                </p>

                                {(canLike(resource) || canRemove(resource)) && (
                                    <div className="flex items-center gap-[8px] pt-[4px]">
                                        {canLike(resource) && (
                                            <button
                                                onClick={() => toggleLike(resource)} aria-pressed={resource.liked}
                                                className={`flex-1 px-[12px] py-[8px] rounded-[10px] text-[12px] font-medium transition-all ${resource.liked ? 'PopupAttentionGradient PopupAttentionShadow' : 'BlackWithLightGradient ContentCardShadow opacity-70 hover:opacity-100'}`}
                                            >
                                                {resource.liked ? '♥ You like this' : '♡ I like this one'}
                                            </button>
                                        )}
                                        {canRemove(resource) && (
                                            <button
                                                onClick={() => setPendingRemoval(resource)}
                                                aria-label={`Remove ${resource.title}`}
                                                className="px-[12px] py-[8px] rounded-[10px] text-[12px] font-medium BlackWithLightGradient ContentCardShadow opacity-60 hover:opacity-100"
                                            >
                                                Remove
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Expanded image */}
            {current && (
                <div className="fixed inset-0 z-[60] bg-black/85 backdrop-blur-sm flex items-center justify-center p-[20px]" onClick={() => setExpanded(null)}>
                    <div className="relative max-w-[92vw] max-h-[92vh] flex flex-col items-center gap-[12px]" onClick={event => event.stopPropagation()}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={current.url} alt={current.title} className="max-w-full max-h-[78vh] rounded-[16px] object-contain" />
                        <div className="text-center text-white">
                            <p className="text-[14px] font-medium">{current.title}</p>
                            {current.fileName && <p className="text-[12px] opacity-60 font-mono">{current.fileName}</p>}
                            {shown.length > 1 && <p className="text-[11px] opacity-50 mt-[4px]">{expanded! + 1} of {shown.length} · use ← → to move</p>}
                        </div>
                        {shown.length > 1 && (
                            <>
                                <button onClick={() => setExpanded((expanded! - 1 + shown.length) % shown.length)} aria-label="Previous image"
                                    className="absolute left-[-10px] sm:left-[-52px] top-1/2 -translate-y-1/2 w-[40px] h-[40px] rounded-full bg-white/15 text-white text-[18px] hover:bg-white/25">‹</button>
                                <button onClick={() => setExpanded((expanded! + 1) % shown.length)} aria-label="Next image"
                                    className="absolute right-[-10px] sm:right-[-52px] top-1/2 -translate-y-1/2 w-[40px] h-[40px] rounded-full bg-white/15 text-white text-[18px] hover:bg-white/25">›</button>
                            </>
                        )}
                        <button onClick={() => setExpanded(null)} aria-label="Close preview"
                            className="absolute -top-[6px] right-[-6px] sm:right-[-46px] w-[34px] h-[34px] rounded-full bg-white/15 text-white flex items-center justify-center hover:bg-white/25">✕</button>
                    </div>
                </div>
            )}

            {/* Remove confirmation */}
            {pendingRemoval && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center px-4" style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)' }}>
                    <div ref={removalRef} tabIndex={-1} role="alertdialog" aria-modal="true" aria-label="Remove file"
                        className="DashboardDialog w-[min(420px,94vw)] rounded-[22px] BlackGradient ContentCardShadow px-[26px] py-[24px] flex flex-col gap-[16px]">
                        <h2 className="text-[17px] font-semibold">Remove “{pendingRemoval.title}”?</h2>
                        <p className="text-[13px] leading-[1.6]" style={{ color: muted }}>
                            It disappears from this project for everyone. {removalWarning(pendingRemoval)}
                        </p>
                        <div className="flex gap-[10px]">
                            <button onClick={() => setPendingRemoval(null)} disabled={removing}
                                className="flex-1 py-[11px] rounded-[11px] text-[13px] font-medium BlackWithLightGradient ContentCardShadow">
                                Keep it
                            </button>
                            <button onClick={confirmRemoval} disabled={removing}
                                className="flex-1 py-[11px] rounded-[11px] text-[13px] font-semibold text-white disabled:opacity-50"
                                style={{ background: '#d4455c' }}>
                                {removing ? 'Removing…' : 'Remove'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default ProjectResourceGrid;
