import { addDoc, collection, getDocs, query, serverTimestamp, where } from 'firebase/firestore';
import { db } from '../firebaseConfig';

export type NotificationType = 'project_update' | 'upload' | 'payment' | 'new_project' | 'message';

export const ADMIN_EMAIL = 'ayush.bhujle@gmail.com';

let cachedAdminUid: string | null = null;

export const getAdminUid = async (): Promise<string | null> => {
    if (cachedAdminUid) return cachedAdminUid;
    try {
        const q = query(collection(db, 'users'), where('email', '==', ADMIN_EMAIL));
        const snap = await getDocs(q);
        if (!snap.empty) {
            cachedAdminUid = snap.docs[0].id;
            return cachedAdminUid;
        }
    } catch (e) {
        console.error('Failed to get admin UID:', e);
    }
    return null;
};

export const writeNotification = async (
    userId: string,
    title: string,
    message: string,
    type: NotificationType,
    projectId?: string,
    link?: string,
) => {
    try {
        await addDoc(collection(db, 'users', userId, 'notifications'), {
            title,
            message,
            type,
            read: false,
            createdAt: serverTimestamp(),
            ...(projectId && { projectId }),
            ...(link && { link }),
        });
    } catch (e) {
        console.error('Failed to write notification:', e);
    }
};

export const writeAdminNotification = async (
    title: string,
    message: string,
    link?: string,
) => {
    const adminUid = await getAdminUid();
    if (!adminUid) return;
    await writeNotification(adminUid, title, message, 'message', undefined, link);
};
