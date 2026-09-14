import { auth } from '@/firebaseConfig';
export const MAX_FILE_BYTES = 10 * 1024 * 1024;
export const MAX_ATTACHMENTS = 5;
export const CLOUDINARY_CLOUD = 'dldxkfbz4';
export const CLOUDINARY_PRESET = 'Unsigned Presets';
export interface ChatTarget { conversationId: string; ownerId: string; type: 'lucidify' | 'direct'; admin?: boolean; otherUserId?: string; senderName?: string; }
export interface ChatAttachment { id: string; name: string; size: number; contentType: string; path: string; url: string; }
export interface PendingAttachment { id: string; file: File; uploaded?: ChatAttachment; }
export interface AttachmentUpload { cancel: () => void; }
export function attachmentPrefix(target: ChatTarget) {
    return target.type === 'direct' ? `chatAttachments/direct/${target.conversationId}/` : `chatAttachments/support/${target.ownerId}/${target.conversationId}/`;
}
export const chatKey = (target: ChatTarget) => `${target.type}:${target.ownerId}:${target.conversationId}`;
export function readableSize(bytes: number) { return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`; }
export function validAttachmentUrl(value: unknown): value is string {
    if (typeof value !== 'string') return false;
    try {
        const url = new URL(value);
        return url.origin === 'https://res.cloudinary.com' && !url.username && !url.password && new RegExp(`^/${CLOUDINARY_CLOUD}/(?:image|raw)/upload/`).test(url.pathname);
    } catch { return false; }
}
export function validAttachment(value: unknown, target: ChatTarget): value is ChatAttachment {
    if (!value || typeof value !== 'object') return false;
    const file = value as ChatAttachment;
    return typeof file.id === 'string' && typeof file.name === 'string' && file.name.length <= 255 && typeof file.path === 'string' && file.path.startsWith(attachmentPrefix(target)) && file.path.split('/').length === (target.type === 'direct' ? 5 : 6) && Number.isFinite(file.size) && file.size > 0 && file.size <= MAX_FILE_BYTES && typeof file.contentType === 'string' && validAttachmentUrl(file.url);
}
export function uploadChatAttachment(target: ChatTarget, pending: PendingAttachment, progress: (percentage: number) => void, onTask: (task: AttachmentUpload) => void): Promise<ChatAttachment> {
    const user = auth.currentUser;
    if (!user) return Promise.reject(new Error('Sign in to attach a file.'));
    const path = `${attachmentPrefix(target)}${user.uid}/${pending.id}`;
    const { file } = pending;
    // Documents and other files stay unchanged. Only safe raster images use image delivery.
    const resource = /^image\/(png|jpeg|gif|webp|avif)$/.test(file.type) ? 'image' : 'raw';
    const form = new FormData();
    form.append('file', file); form.append('upload_preset', CLOUDINARY_PRESET); form.append('folder', path);
    return new Promise((resolve, reject) => {
        const request = new XMLHttpRequest();
        request.open('POST', `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/${resource}/upload`);
        request.timeout = 120000;
        request.upload.onprogress = event => { if (event.lengthComputable) progress(Math.round(100 * event.loaded / event.total)); };
        request.onerror = () => reject(new Error('The upload connection was interrupted.'));
        request.ontimeout = () => reject(new Error('The upload timed out.'));
        request.onabort = () => reject(new Error('Upload cancelled.'));
        request.onload = () => {
            try {
                const data = JSON.parse(request.responseText);
                if (request.status < 200 || request.status >= 300 || !validAttachmentUrl(data.secure_url)) throw new Error('Upload failed.');
                resolve({ id: pending.id, path, url: data.secure_url, name: file.name.slice(0, 255), size: file.size, contentType: file.type || 'application/octet-stream' });
            } catch { reject(new Error('Could not upload this file. Please try again.')); }
        };
        onTask({ cancel: () => request.abort() }); request.send(form);
    });
}
export class AttachmentDownloadError extends Error {}
export async function downloadChatAttachment(attachment: ChatAttachment): Promise<Blob> {
    if (!validAttachmentUrl(attachment.url)) throw new Error('Invalid attachment URL.');
    const response = await fetch(attachment.url, { credentials: 'omit', referrerPolicy: 'no-referrer', signal: AbortSignal.timeout(60000) });
    if ((response.status === 401 || response.status === 403) && /\.(pdf|zip)$/i.test(attachment.name)) throw new AttachmentDownloadError('PDF and ZIP downloads are currently blocked. Ask Lucidify to enable them, then retry.');
    if (!response.ok) throw new Error('Could not download the attachment.');
    if (Number(response.headers.get('content-length')) > MAX_FILE_BYTES) throw new Error('File exceeds download limit.');
    const blob = await response.blob();
    if (blob.size > MAX_FILE_BYTES) throw new Error('File exceeds download limit.');
    return blob;
}
