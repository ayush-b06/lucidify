"use client";
import { useEffect, useRef, useState } from 'react';
import { AttachmentDownloadError, ChatAttachment, ChatTarget, downloadChatAttachment, readableSize, validAttachment } from '@/utils/chatAttachments';
import styles from './Messaging.module.css';
function Attachment({ attachment }: { attachment: ChatAttachment }) {
    const [preview, setPreview] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const root = useRef<HTMLDivElement>(null);
    useEffect(() => {
        if (!/^image\/(png|jpeg|gif|webp|avif)$/.test(attachment.contentType)) return;
        let active = true, objectUrl = '';
        const observer = new IntersectionObserver(entries => {
            if (!entries.some(entry => entry.isIntersecting)) return;
            observer.disconnect();
            downloadChatAttachment(attachment).then(blob => {
                if (!active) return;
                objectUrl = URL.createObjectURL(blob); setPreview(objectUrl);
            }).catch(() => { if (active) setError('Preview unavailable. You can retry the download.'); });
        });
        if (root.current) observer.observe(root.current);
        return () => { active = false; observer.disconnect(); if (objectUrl) URL.revokeObjectURL(objectUrl); };
    }, [attachment.url, attachment.contentType]);
    const download = async () => {
        if (loading) return;
        setLoading(true); setError('');
        try {
            const blob = await downloadChatAttachment(attachment);
            const url = URL.createObjectURL(blob);
            const anchor = document.createElement('a'); anchor.href = url; anchor.download = attachment.name.replace(/[\/\\\u0000-\u001f]/g, '_');
            document.body.appendChild(anchor); anchor.click(); anchor.remove();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
        } catch (error) { setError(error instanceof AttachmentDownloadError ? error.message : 'Couldn’t download this file. Click its name to retry.'); }
        finally { setLoading(false); }
    };
    return <div className={styles.file} ref={root}>
        {preview && <img src={preview} alt={attachment.name} />}
        <button onClick={download} disabled={loading} aria-label={`Download ${attachment.name}`}><span aria-hidden="true">↓</span><span><strong>{attachment.name}</strong><small>{loading ? 'Downloading…' : readableSize(attachment.size)}</small></span></button>
        {error && <p className={styles.fileError} role="alert">{error}</p>}
    </div>;
}
export default function ChatMessageContent({ text, attachments, target }: { text?: string; attachments?: unknown; target: ChatTarget }) {
    const files = Array.isArray(attachments) ? attachments.filter(file => validAttachment(file, target)).slice(0, 5) : [];
    return <div className="min-w-0 whitespace-pre-wrap break-words [overflow-wrap:anywhere]">{text && <p>{text}</p>}{!!files.length && <div className={styles.attachments}>{files.map(file => <Attachment key={file.id} attachment={file} />)}</div>}</div>;
}
