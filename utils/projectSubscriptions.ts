import { collection, onSnapshot, DocumentData, QueryDocumentSnapshot } from 'firebase/firestore';
import { db } from '@/firebaseConfig';
import { ADMIN_EMAIL } from './notifications';
import { progressFields } from './projectProgress';
export interface ProjectEntry extends DocumentData { uid: string; userId: string; projectName: string; progress: string; status: number; logoAttachment: string | null; }
function projectEntry(snapshot: QueryDocumentSnapshot, userId: string): ProjectEntry {
    const data = snapshot.data(), fields = progressFields(data);
    return { ...data, ...fields, uid: snapshot.id, userId, projectName: data.projectName || 'Unnamed Project', progress: String(fields.progress), approval: data.approval || 'Pending', setupComplete: data.setupComplete !== false, logoAttachment: data.logoUrl || data.logoAttachment || null };
}
export function subscribeUserProjects(uid: string, next: (projects: ProjectEntry[]) => void, error: (error: unknown) => void) {
    return onSnapshot(collection(db, 'users', uid, 'projects'), snapshot => next(snapshot.docs.map(d => projectEntry(d, uid))), error);
}
export interface ClientProjectEntry extends ProjectEntry { clientName: string; clientAvatar?: string; }
export function subscribeAllProjects(next: (projects: ClientProjectEntry[], profiles: Record<string, DocumentData>) => void, error: (error: unknown) => void) {
    const sources = new Map<string, ProjectEntry[]>();
    const stops = new Map<string, () => void>();
    let profiles: Record<string, DocumentData> = {}, active = true;
    const emit = () => { if (active) next([...sources.values()].flat().map(project => ({ ...project, clientName: `${profiles[project.userId]?.firstName || profiles[project.userId]?.displayName || 'Client'} ${profiles[project.userId]?.lastName || ''}`.trim(), clientAvatar: profiles[project.userId]?.selectedAvatar })), profiles); };
    const stopUsers = onSnapshot(collection(db, 'users'), snapshot => {
        profiles = Object.fromEntries(snapshot.docs.filter(d => d.data().email !== ADMIN_EMAIL).map(d => [d.id, d.data()]));
        stops.forEach((stop, uid) => { if (!profiles[uid]) { stop(); stops.delete(uid); sources.delete(uid); } });
        Object.keys(profiles).forEach(uid => {
            if (!stops.has(uid)) stops.set(uid, subscribeUserProjects(uid, projects => { sources.set(uid, projects); emit(); }, error));
        });
        emit();
    }, error);
    return () => { active = false; stopUsers(); stops.forEach(stop => stop()); };
}
