import { collection, doc, serverTimestamp, writeBatch, WriteBatch, DocumentReference, DocumentData, Transaction } from 'firebase/firestore';
import { auth, db } from '../firebaseConfig';

export type NotificationType = 'project_update' | 'upload' | 'payment' | 'new_project' | 'message' | 'account';
export const ADMIN_EMAIL = 'ayush.bhujle@gmail.com';

// Events addressed to the team live under the actor's own profile. A client
// never needs to find the admin's private profile or write into their account.
type EventWriter = { set(ref: DocumentReference<DocumentData>, data: DocumentData): unknown };
export function queueAdminNotification(batch: EventWriter, title: string, message: string, link = '/dashboard/messages', type: NotificationType = 'message', eventId?: string) {
    const user = auth.currentUser;
    if (!user) throw new Error('Sign in before sending a notification.');
    const inbox = collection(db, 'users', user.uid, 'adminNotifications');
    batch.set(eventId ? doc(inbox, eventId) : doc(inbox), {
        title, message, link, type, read: false, createdAt: serverTimestamp(), actorId: user.uid,
    });
}
export function queueNotification(batch: EventWriter, userId: string, title: string, message: string, type: NotificationType, projectId?: string, link?: string, metadata: { conversationId?: string; senderId?: string } = {}) {
    batch.set(doc(collection(db, 'users', userId, 'notifications')), {
        title, message, type, read: false, createdAt: serverTimestamp(), ...metadata,
        ...(projectId && { projectId }), ...(link && { link }),
    });
}
export async function writeNotification(userId: string, title: string, message: string, type: NotificationType, projectId?: string, link?: string) {
    const batch = writeBatch(db);
    queueNotification(batch, userId, title, message, type, projectId, link);
    await batch.commit();
}
export async function writeAdminNotification(title: string, message: string, link?: string) {
    const batch = writeBatch(db);
    queueAdminNotification(batch, title, message, link);
    await batch.commit();
}
export async function updateAndNotify(ref: DocumentReference<DocumentData>, updates: DocumentData, userId: string, title: string, message: string, type: NotificationType, projectId?: string, link?: string) {
    const batch = writeBatch(db);
    batch.update(ref, updates);
    queueNotification(batch, userId, title, message, type, projectId, link);
    await batch.commit();
}
export function dashboardLink(link?: string) {
    if (!link || !/^\/dashboard(?:[/?#]|$)/.test(link) || /[\\\u0000-\u001f]/.test(link)) return null;
    return link;
}
