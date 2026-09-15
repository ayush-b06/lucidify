"use client";

import React, { useEffect, useRef, useState } from 'react';
import { collection, doc, writeBatch } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { useDialog } from '@/hooks/useDialog';
import { useTheme } from '@/context/themeContext';
import { queueAdminNotification, queueNotification } from '@/utils/notifications';
import {
    MAX_FILES_PER_UPLOAD, MAX_UPLOAD_BYTES, UPLOAD_KINDS, UploadKind,
    titleFromFileName, uploadResourceFile,
} from '@/utils/projectUploads';

interface UploadResourceDialogProps {
    isVisible: boolean;
    onClose: () => void;
    userId: string;
    projectId: string;
    projectName: string;
    isAdmin: boolean;
}

interface Staged {
    file: File;
    preview: string;
}

const UploadResourceDialog = ({ isVisible, onClose, userId, projectId, projectName, isAdmin }: UploadResourceDialogProps) => {
    const { theme } = useTheme();
    const isDark = theme === 'dark';

    const [staged, setStaged] = useState<Staged[]>([]);
    const [kind, setKind] = useState<UploadKind>(isAdmin ? 'design' : 'photo');
    const [title, setTitle] = useState('');
    const [note, setNote] = useState('');
    const [busy, setBusy] = useState(false);
    const [done, setDone] = useState(0);
    const [error, setError] = useState('');
    const inFlight = useRef(false);
    const fileInput = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isVisible) return;
        setStaged([]); setTitle(''); setNote(''); setError(''); setDone(0);
        setKind(isAdmin ? 'design' : 'photo');
    }, [isVisible, isAdmin]);

    // Object URLs are revoked together whenever the staged list changes.
    useEffect(() => () => staged.forEach(entry => URL.revokeObjectURL(entry.preview)), [staged]);

    const addFiles = (list: FileList | null) => {
        if (!list?.length) return;
        const chosen = Array.from(list);
        if (chosen.some(file => !file.type.startsWith('image/'))) { setError('Images only — JPG, PNG, GIF, WebP, or SVG.'); return; }
        const tooBig = chosen.find(file => file.size > MAX_UPLOAD_BYTES);
        if (tooBig) { setError(`“${tooBig.name}” is over 10 MB. Try a smaller version.`); return; }
        if (staged.length + chosen.length > MAX_FILES_PER_UPLOAD) { setError(`Up to ${MAX_FILES_PER_UPLOAD} files at a time.`); return; }
        setError('');
        setStaged(current => [...current, ...chosen.map(file => ({ file, preview: URL.createObjectURL(file) }))]);
    };

    const removeStaged = (index: number) => setStaged(current => {
        URL.revokeObjectURL(current[index].preview);
        return current.filter((_, i) => i !== index);
    });

    const submit = async (event: React.FormEvent) => {
        event.preventDefault();
        if (inFlight.current || !staged.length) return;
        inFlight.current = true; setBusy(true); setError(''); setDone(0);
        try {
            const folder = `users/${userId}/projects/${projectId}/uploads`;
            const uploaded: { url: string; file: File }[] = [];
            for (const entry of staged) {
                uploaded.push({ url: await uploadResourceFile(entry.file, folder), file: entry.file });
                setDone(count => count + 1);
            }

            const batch = writeBatch(db);
            const uploadedAt = new Date().toISOString();
            for (const entry of uploaded) {
                batch.set(doc(collection(db, 'users', userId, 'projects', projectId, 'uploads')), {
                    url: entry.url,
                    fileName: entry.file.name,
                    title: (uploaded.length === 1 && title.trim()) || titleFromFileName(entry.file.name),
                    note: note.trim(),
                    kind,
                    uploadedAt,
                    uploadedByRole: isAdmin ? 'admin' : 'client',
                    liked: false,
                });
            }
            const count = uploaded.length;
            const noun = count === 1 ? 'file' : 'files';
            if (isAdmin) {
                queueNotification(batch, userId, count === 1 && kind === 'design' ? 'New design uploaded' : 'New files added',
                    `${count} ${noun} added to ${projectName}.`, 'upload', projectId, `/dashboard/projects/${projectId}/uploads`);
            } else {
                queueAdminNotification(batch, 'Client added files',
                    `${count} ${noun} added to ${projectName}.`, `/dashboard/projects/${projectId}/uploads?userId=${userId}`, 'upload');
            }
            await batch.commit();
            onClose();
        } catch {
            setError('Those files could not be saved. Nothing was lost — please try again.');
        } finally { inFlight.current = false; setBusy(false); }
    };

    const dialogRef = useDialog<HTMLFormElement>(isVisible, onClose, busy);
    if (!isVisible) return null;

    const surface = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)';
    const line = isDark ? '1px solid rgba(255,255,255,0.10)' : '1px solid rgba(0,0,0,0.10)';
    const muted = isDark ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.55)';

    return (
        <div className="fixed inset-0 z-[55] flex items-center justify-center px-4" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }}>
            <form
                ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-label="Add files"
                onSubmit={submit} aria-busy={busy}
                className="DashboardDialog relative w-[min(560px,94vw)] max-h-[90dvh] overflow-y-auto rounded-[24px] BlackGradient ContentCardShadow px-[26px] py-[24px] flex flex-col gap-[18px]"
            >
                <div className="flex items-start justify-between gap-[16px]">
                    <div>
                        <h2 className="text-[19px] font-semibold">Add files</h2>
                        <p className="text-[13px] mt-[3px]" style={{ color: muted }}>
                            Images up to 10 MB. You can pick several at once.
                        </p>
                    </div>
                    <button type="button" onClick={onClose} disabled={busy} aria-label="Close"
                        className="w-[30px] h-[30px] rounded-[9px] flex items-center justify-center flex-shrink-0"
                        style={{ background: surface, color: muted }}>✕</button>
                </div>

                {error && <p role="alert" className="DashboardNotice text-[13px]">{error}</p>}

                {/* File picker */}
                <div>
                    <button
                        type="button" disabled={busy} onClick={() => fileInput.current?.click()}
                        className="w-full rounded-[14px] py-[22px] text-[13px] font-medium flex flex-col items-center gap-[6px]"
                        style={{ background: surface, border: line, borderStyle: 'dashed' }}
                    >
                        <span className="text-[22px]">⬆️</span>
                        <span>{staged.length ? 'Add more files' : 'Choose files'}</span>
                        <span className="text-[11px]" style={{ color: muted }}>JPG, PNG, GIF, WebP, SVG</span>
                    </button>
                    <input
                        ref={fileInput} id="resource-files" type="file" accept="image/*" multiple className="hidden"
                        aria-label="Files to upload" disabled={busy}
                        onChange={event => { addFiles(event.target.files); event.target.value = ''; }}
                    />
                </div>

                {/* Chosen files, by name — this is what the old form never showed */}
                {staged.length > 0 && (
                    <ul className="flex flex-col gap-[8px]" aria-label="Chosen files">
                        {staged.map((entry, index) => (
                            <li key={entry.preview} className="flex items-center gap-[12px] rounded-[12px] px-[12px] py-[10px]" style={{ background: surface }}>
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={entry.preview} alt="" className="w-[42px] h-[42px] rounded-[8px] object-cover flex-shrink-0" />
                                <span className="min-w-0 flex-1">
                                    <span className="block text-[13px] font-medium truncate">{entry.file.name}</span>
                                    <span className="block text-[11px]" style={{ color: muted }}>
                                        {(entry.file.size / 1024 / 1024).toFixed(1)} MB
                                        {busy && index < done ? ' · uploaded' : busy && index === done ? ' · uploading…' : ''}
                                    </span>
                                </span>
                                <button type="button" disabled={busy} onClick={() => removeStaged(index)}
                                    aria-label={`Remove ${entry.file.name}`}
                                    className="w-[26px] h-[26px] rounded-full flex items-center justify-center text-[12px] flex-shrink-0"
                                    style={{ background: isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.08)', color: muted }}>✕</button>
                            </li>
                        ))}
                    </ul>
                )}

                {/* Kind */}
                <div>
                    <p className="text-[13px] font-medium mb-[8px]">What is this?</p>
                    <div className="flex flex-wrap gap-[8px]" role="group" aria-label="Kind of file">
                        {UPLOAD_KINDS.map(entry => (
                            <button
                                key={entry.id} type="button" disabled={busy}
                                aria-pressed={kind === entry.id} onClick={() => setKind(entry.id)}
                                className={`px-[14px] py-[8px] rounded-[10px] text-[13px] font-medium transition-opacity ${kind === entry.id ? 'PopupAttentionGradient PopupAttentionShadow text-white' : 'hover:opacity-80'}`}
                                // This dialog sits outside .DashboardBackgroundGradient, so the shared
                                // light-mode overrides do not reach it. Colour it explicitly.
                                style={kind === entry.id ? undefined : { background: surface, border: line, color: 'inherit' }}
                            >
                                <span className="mr-[6px]" aria-hidden="true">{entry.icon}</span>{entry.label}
                            </button>
                        ))}
                    </div>
                </div>

                {staged.length === 1 && (
                    <label className="flex flex-col gap-[7px]" htmlFor="resource-title">
                        <span className="text-[13px] font-medium">Name <span style={{ color: muted }}>(optional)</span></span>
                        <input
                            id="resource-title" value={title} maxLength={80} disabled={busy}
                            onChange={event => setTitle(event.target.value)}
                            placeholder={titleFromFileName(staged[0].file.name)}
                            className="w-full rounded-[11px] px-[14px] h-[42px] text-[13px]"
                            style={{ background: surface, border: line, color: 'inherit' }}
                        />
                    </label>
                )}

                <label className="flex flex-col gap-[7px]" htmlFor="resource-note">
                    <span className="text-[13px] font-medium">Note <span style={{ color: muted }}>(optional)</span></span>
                    <textarea
                        id="resource-note" value={note} rows={2} maxLength={500} disabled={busy}
                        onChange={event => setNote(event.target.value)}
                        placeholder={isAdmin ? 'Homepage concept — let me know what you think.' : 'Photos from our last event.'}
                        className="w-full rounded-[11px] px-[14px] py-[11px] text-[13px] resize-none leading-[1.6]"
                        style={{ background: surface, border: line, color: 'inherit' }}
                    />
                </label>

                <button
                    type="submit" disabled={busy || !staged.length}
                    className="w-full h-[48px] rounded-[13px] text-[14px] font-semibold PopupAttentionGradient PopupAttentionShadow disabled:opacity-40"
                >
                    {busy
                        ? `Uploading ${Math.min(done + 1, staged.length)} of ${staged.length}…`
                        : staged.length ? `Add ${staged.length} ${staged.length === 1 ? 'file' : 'files'}` : 'Choose files first'}
                </button>
            </form>
        </div>
    );
};

export default UploadResourceDialog;
