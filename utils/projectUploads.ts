import { collection, deleteDoc, doc, onSnapshot, updateDoc, DocumentData } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { assetLabel } from './projectCategories';

export type UploadKind = 'design' | 'logo' | 'photo' | 'other';

export const UPLOAD_KINDS: { id: UploadKind; label: string; plural: string; icon: string }[] = [
    { id: 'design', label: 'Design', plural: 'Designs', icon: '🎨' },
    { id: 'logo', label: 'Logo', plural: 'Logos', icon: '✦' },
    { id: 'photo', label: 'Photo', plural: 'Photos', icon: '📷' },
    { id: 'other', label: 'Other', plural: 'Other', icon: '📎' },
];

export const kindLabel = (kind: UploadKind) => UPLOAD_KINDS.find(entry => entry.id === kind)?.label ?? 'Other';

/** Where a resource lives, so removing it knows what to write. */
export type ResourceOrigin =
    | { type: 'upload'; docId: string }
    /** Designs saved by the old Sections / Full-Page form. */
    | { type: 'legacy'; path: string; docId: string }
    /** Photos the client attached to their project brief. An empty group means the logo field. */
    | { type: 'brief'; group: string };

export interface ProjectResource {
    id: string;
    url: string;
    title: string;
    fileName: string;
    note: string;
    kind: UploadKind;
    uploadedAt: string;
    uploadedByRole: 'admin' | 'client' | '';
    uploadedBy?: string;
    liked: boolean;
    origin: ResourceOrigin;
    tags: string[];
}

const LEGACY_PATHS = ['section web designs', 'full-page web designs'];
const asKind = (value: unknown): UploadKind => UPLOAD_KINDS.some(entry => entry.id === value) ? value as UploadKind : 'other';
const asText = (value: unknown) => typeof value === 'string' ? value : '';
const asList = (value: unknown) => Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === 'string') : [];

/** Strip the extension so a filename can stand in as a title. */
export function titleFromFileName(fileName: string) {
    return fileName.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim() || fileName;
}

function fromUpload(docId: string, data: DocumentData): ProjectResource {
    const fileName = asText(data.fileName);
    return {
        id: `upload:${docId}`,
        url: asText(data.url),
        title: asText(data.title) || titleFromFileName(fileName) || 'Untitled',
        fileName,
        note: asText(data.note),
        kind: asKind(data.kind),
        uploadedAt: asText(data.uploadedAt),
        uploadedByRole: data.uploadedByRole === 'admin' ? 'admin' : 'client',
        uploadedBy: asText(data.uploadedBy),
        liked: data.liked === true,
        origin: { type: 'upload', docId },
        tags: [],
    };
}

function fromLegacy(path: string, docId: string, data: DocumentData): ProjectResource {
    return {
        id: `legacy:${path}:${docId}`,
        url: asText(data.designURL),
        title: asText(data.designName) || 'Untitled design',
        fileName: '',
        note: asText(data.designDescription),
        kind: 'design',
        uploadedAt: asText(data.dateCreated),
        uploadedByRole: 'admin',
        liked: data.selectedDesign === true,
        origin: { type: 'legacy', path, docId },
        tags: [asText(data.designPage), asText(data.designType)].filter(Boolean),
    };
}

/** Photos and the logo attached to the project brief, shown alongside everything else. */
function fromBrief(project: DocumentData): ProjectResource[] {
    const resources: ProjectResource[] = [];
    const logo = asText(project.logoUrl);
    if (logo) resources.push({
        id: 'brief::logo', url: logo, title: 'Logo', fileName: '', note: '',
        kind: 'logo', uploadedAt: asText(project.dateCreated), uploadedByRole: 'client',
        liked: false, origin: { type: 'brief', group: '' }, tags: ['From the brief'],
    });
    const groups = project.briefAssets && typeof project.briefAssets === 'object' ? project.briefAssets as Record<string, unknown> : {};
    for (const [group, value] of Object.entries(groups)) {
        asList(value).forEach((url, index) => resources.push({
            id: `brief:${group}:${url}`, url, title: `${assetLabel(group)} ${index + 1}`, fileName: '', note: '',
            kind: 'photo', uploadedAt: asText(project.dateCreated), uploadedByRole: 'client',
            liked: false, origin: { type: 'brief', group }, tags: ['From the brief'],
        }));
    }
    return resources;
}

const newestFirst = (a: ProjectResource, b: ProjectResource) => b.uploadedAt.localeCompare(a.uploadedAt);

/**
 * Streams every visual resource on a project — newly uploaded files, designs saved by the old
 * form, and the photos attached to the brief — as one list, newest first.
 */
export function subscribeResources(
    userId: string,
    projectId: string,
    onChange: (resources: ProjectResource[]) => void,
    onError: () => void,
) {
    const base = ['users', userId, 'projects', projectId] as const;
    const buckets = new Map<string, ProjectResource[]>();
    const publish = () => onChange(Array.from(buckets.values()).flat().filter(entry => entry.url).sort(newestFirst));

    const unsubscribes = [
        onSnapshot(collection(db, ...base, 'uploads'), snapshot => {
            buckets.set('uploads', snapshot.docs.map(entry => fromUpload(entry.id, entry.data())));
            publish();
        }, onError),
        ...LEGACY_PATHS.map(path => onSnapshot(collection(db, ...base, path), snapshot => {
            buckets.set(path, snapshot.docs.map(entry => fromLegacy(path, entry.id, entry.data())));
            publish();
        }, onError)),
        onSnapshot(doc(db, ...base), snapshot => {
            buckets.set('brief', snapshot.exists() ? fromBrief(snapshot.data()) : []);
            publish();
        }, onError),
    ];
    return () => unsubscribes.forEach(stop => stop());
}

/**
 * Removes a resource from the dashboard. Uploads go through an unsigned Cloudinary preset,
 * which returns no deletion token, so the stored file itself cannot be destroyed from here —
 * callers must say so before confirming.
 */
export async function removeResource(userId: string, projectId: string, resource: ProjectResource) {
    const base = ['users', userId, 'projects', projectId] as const;
    const origin = resource.origin;
    if (origin.type === 'upload') return deleteDoc(doc(db, ...base, 'uploads', origin.docId));
    if (origin.type === 'legacy') return deleteDoc(doc(db, ...base, origin.path, origin.docId));
    if (!origin.group) return updateDoc(doc(db, ...base), { logoUrl: '' });
    return updateDoc(doc(db, ...base), { [`briefAssets.${origin.group}`]: await remainingBriefUrls(userId, projectId, origin.group, resource.url) });
}

async function remainingBriefUrls(userId: string, projectId: string, group: string, removing: string) {
    const { getDoc } = await import('firebase/firestore');
    const snapshot = await getDoc(doc(db, 'users', userId, 'projects', projectId));
    const groups = snapshot.data()?.briefAssets as Record<string, unknown> | undefined;
    return asList(groups?.[group]).filter(url => url !== removing);
}

/** A brief photo also disappears from the project brief, so the confirmation has to say more. */
export function removalWarning(resource: ProjectResource) {
    return resource.origin.type === 'brief'
        ? 'This also removes it from the project brief. Anyone who already has the file’s link can still open it.'
        : 'Anyone who already has the file’s link can still open it.';
}

export const UPLOAD_PRESET = 'Unsigned Presets';
export const CLOUDINARY_URL = 'https://api.cloudinary.com/v1_1/dldxkfbz4/image/upload';
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
export const MAX_FILES_PER_UPLOAD = 10;

export class ResourceUploadError extends Error {}

export async function uploadResourceFile(file: File, folder: string) {
    const form = new FormData();
    form.append('file', file);
    form.append('upload_preset', UPLOAD_PRESET);
    form.append('folder', folder);
    let response: Response;
    try { response = await fetch(CLOUDINARY_URL, { method: 'POST', body: form }); }
    catch { throw new ResourceUploadError(`“${file.name}” could not reach the image service. Check your connection and retry.`); }
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
        const reason = typeof data.error?.message === 'string' ? data.error.message.slice(0, 300) : `The image service returned error ${response.status}. Please retry.`;
        throw new ResourceUploadError(`“${file.name}” could not be uploaded: ${reason}`);
    }
    if (typeof data.secure_url !== 'string' || !data.secure_url.startsWith('https://')) throw new ResourceUploadError(`The image service did not return a file link for “${file.name}”. Please retry.`);
    return data.secure_url as string;
}
