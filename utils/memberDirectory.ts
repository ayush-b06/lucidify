import { doc, getDoc, setDoc, WriteBatch } from 'firebase/firestore';
import { db } from '@/firebaseConfig';
import { directoryProfile, MemberName } from './memberNames';
export function queueDirectoryProfile(batch: WriteBatch, uid: string, profile: MemberName) {
    batch.set(doc(db, 'userDirectory', uid), directoryProfile(profile));
}
export async function ensureDirectoryProfile(uid: string, profile: MemberName) {
    const ref = doc(db, 'userDirectory', uid);
    const existing = await getDoc(ref);
    const next = directoryProfile(profile);
    if (!Object.entries(next).every(([key, value]) => JSON.stringify(existing.data()?.[key]) === JSON.stringify(value))) await setDoc(ref, next);
}
