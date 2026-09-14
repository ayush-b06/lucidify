"use client";
import { RefObject, useEffect, useRef, useState } from 'react';
import { ChatTarget, PendingAttachment, MAX_ATTACHMENTS, MAX_FILE_BYTES, chatKey, readableSize, AttachmentUpload, uploadChatAttachment } from '@/utils/chatAttachments';
import { sendChatMessage } from '@/utils/conversations';
import styles from './Messaging.module.css';

interface Draft { text: string; files: PendingAttachment[]; messageId: string; error: string; }
const emptyDraft = (): Draft => ({ text: '', files: [], messageId: crypto.randomUUID(), error: '' });
function FilePreview({ file }: { file: File }) {
    const [url, setUrl] = useState('');
    useEffect(() => {
        if (!/^image\/(png|jpeg|gif|webp|avif)$/.test(file.type)) return;
        const url = URL.createObjectURL(file); setUrl(url);
        return () => URL.revokeObjectURL(url);
    }, [file]);
    return url ? <img src={url} alt="" /> : null;
}
export default function ChatComposer({ target, dropTarget, placeholder = 'Write a message...', onSent }: { target: ChatTarget | null; dropTarget: RefObject<HTMLDivElement>; placeholder?: string; onSent?: (key: string) => void; }) {
    const drafts = useRef<Record<string, Draft>>({});
    const [, render] = useState(0);
    const [sendingKey, setSendingKey] = useState('');
    const [progress, setProgress] = useState('');
    const [dragging, setDragging] = useState(false);
    const input = useRef<HTMLInputElement>(null);
    const task = useRef<AttachmentUpload | null>(null);
    const inFlight = useRef(false);
    const cancelled = useRef(false);
    const alive = useRef(true);
    const key = target ? chatKey(target) : '';
    const draft = drafts.current[key] || { text: '', files: [], messageId: '', error: '' };
    const busy = sendingKey === key && !!key;
    const change = (key: string, update: (draft: Draft) => Draft) => {
        drafts.current[key] = update(drafts.current[key] || emptyDraft());
        if (alive.current) render(value => value + 1);
    };
    useEffect(() => { alive.current = true; return () => { alive.current = false; cancelled.current = true; task.current?.cancel(); }; }, []);
    const addFiles = (files: File[]) => {
        if (!key || busy) return;
        change(key, current => {
            const accepted = [...current.files]; const errors: string[] = [];
            for (const file of files) {
                if (!file.size || file.size > MAX_FILE_BYTES) { errors.push(`${file.name}: choose a file between 1 byte and 10 MB.`); continue; }
                if (accepted.some(item => item.file.name === file.name && item.file.size === file.size && item.file.lastModified === file.lastModified)) continue;
                if (accepted.length >= MAX_ATTACHMENTS) { errors.push('Attach up to 5 files per message.'); break; }
                accepted.push({ id: crypto.randomUUID(), file });
            }
            return { ...current, files: accepted, error: errors.join(' ') };
        });
    };
    useEffect(() => {
        setDragging(false);
        const element = dropTarget.current;
        if (!element || !key) return;
        const over = (event: DragEvent) => { if (event.dataTransfer?.types.includes('Files')) { event.preventDefault(); event.dataTransfer.dropEffect = busy ? 'none' : 'copy'; setDragging(!busy); } };
        const leave = (event: DragEvent) => { if (!element.contains(event.relatedTarget as Node)) setDragging(false); };
        const drop = (event: DragEvent) => {
            if (!event.dataTransfer?.types.includes('Files')) return;
            event.preventDefault(); event.stopPropagation(); setDragging(false);
            const files = Array.from(event.dataTransfer.files);
            if (files.length) addFiles(files);
            else change(key, current => ({ ...current, error: 'Drop individual files here, rather than a folder.' }));
        };
        element.addEventListener('dragover', over); element.addEventListener('dragleave', leave); element.addEventListener('drop', drop);
        return () => { element.removeEventListener('dragover', over); element.removeEventListener('dragleave', leave); element.removeEventListener('drop', drop); };
    // Draft values are read from the ref so drops never use an old attachment list.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [key, busy, dropTarget]);
    useEffect(() => {
        const element = dropTarget.current;
        element?.classList.toggle(styles.drop, dragging);
        return () => element?.classList.remove(styles.drop);
    }, [dragging, dropTarget]);

    const send = async () => {
        if (!target || inFlight.current) return;
        const snapshot = drafts.current[key];
        if (!snapshot || (!snapshot.text.trim() && !snapshot.files.length)) return;
        inFlight.current = true; cancelled.current = false; setSendingKey(key);
        change(key, current => ({ ...current, error: '' }));
        try {
            const attachments = [];
            for (let index = 0; index < snapshot.files.length; index++) {
                if (cancelled.current) throw new Error('Cancelled');
                const file = snapshot.files[index];
                const attachment = file.uploaded || await uploadChatAttachment(target, file, percentage => {
                    if (alive.current) setProgress(`Uploading ${index + 1} of ${snapshot.files.length} · ${percentage}%`);
                }, upload => { task.current = upload; });
                attachments.push(attachment);
                change(key, current => ({ ...current, files: current.files.map(item => item.id === file.id ? { ...item, uploaded: attachment } : item) }));
            }
            task.current = null;
            if (cancelled.current) throw new Error('Cancelled');
            if (alive.current) setProgress('Sending…');
            await sendChatMessage({ ...target, text: snapshot.text, attachments, messageId: snapshot.messageId });
            change(key, () => emptyDraft());
            onSent?.(key);
        } catch {
            change(key, current => ({ ...current, error: cancelled.current ? 'Upload cancelled. Your draft and files are still here.' : 'Message wasn’t sent. Your draft and files are still here — try again.' }));
        } finally {
            inFlight.current = false; task.current = null;
            if (alive.current) { setSendingKey(''); setProgress(''); }
        }
    };
    const remove = (id: string) => {
        if (busy) return;
        change(key, current => ({ ...current, files: current.files.filter(item => item.id !== id), error: '' }));
    };
    return <div className={styles.composer} aria-label="Message composer">
        {dragging && <p className={styles.dropHint}>Drop files to attach them. Review before sending.</p>}
        {draft.error && <p role="alert" className={styles.error}>{draft.error}</p>}
        {!!draft.files.length && <div className={styles.drafts} aria-label="Attachments ready to send">{draft.files.map(item => <div className={styles.draft} key={item.id}>
            <FilePreview file={item.file} /><span className={styles.draftName}><strong>{item.file.name}</strong><small>{readableSize(item.file.size)}</small></span><button aria-label={`Remove ${item.file.name}`} disabled={busy} onClick={() => remove(item.id)}>×</button>
        </div>)}</div>}
        {busy && <div className={styles.progress} role="status"><span>{progress || 'Preparing…'}</span>{progress.startsWith('Uploading') && <button onClick={() => { cancelled.current = true; task.current?.cancel(); }}>Cancel upload</button>}</div>}
        <input ref={input} type="file" multiple hidden aria-label="Attach files" onChange={event => { addFiles(Array.from(event.target.files || [])); event.target.value = ''; }} disabled={!target || busy} />
        <div className={styles.inputRow}>
            <button className={styles.icon} type="button" aria-label="Add attachments" title="Attach up to 5 files, 10 MB each" disabled={!target || busy} onClick={() => input.current?.click()}><svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="m8 13 7-7a3 3 0 0 1 4 4L9 20a5 5 0 0 1-7-7L13 2a7 7 0 0 1 10 10L12 23" transform="translate(1 0) scale(.85)" /></svg></button>
            <textarea aria-label="Message" rows={1} maxLength={10000} placeholder={target ? placeholder : 'Select a chat to send a message'} value={draft.text} disabled={!target || busy} onChange={event => change(key, current => ({ ...current, text: event.target.value }))} onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); void send(); } }} />
            <button className={`${styles.icon} ${styles.send}`} aria-label="Send message" disabled={!target || !!sendingKey || (!draft.text.trim() && !draft.files.length)} onClick={send}><svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="m3 3 19 9-19 9 4-9-4-9ZM7 12h15" /></svg></button>
        </div>
        <p className={styles.hint}>Up to 5 files · 10 MB each · Shift + Enter for a new line</p>
        {!!draft.files.length && <p className={styles.hint}>Anyone with a file’s link can open it.</p>}
    </div>;
}
