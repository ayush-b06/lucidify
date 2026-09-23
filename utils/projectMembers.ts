import { doc, runTransaction, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '@/firebaseConfig';

export const sharedProjectKey = (ownerId: string, projectId: string) => `${ownerId}_${projectId}`;

export async function addProjectMember(ownerId: string, projectId: string, uid: string) {
    const actor = auth.currentUser;
    if (!actor) throw new Error('Sign in to add a client.');
    if (uid === ownerId) return;
    await runTransaction(db, async transaction => {
        const project = doc(db, 'users', ownerId, 'projects', projectId);
        const member = doc(project, 'members', uid);
        const [source, profile, existing] = await Promise.all([
            transaction.get(project), transaction.get(doc(db, 'userDirectory', uid)), transaction.get(member),
        ]);
        if (!source.exists() || !profile.exists()) throw new Error('Project or member is unavailable.');
        if (existing.exists()) return;
        const data = { ownerId, projectId, addedBy: actor.uid, addedAt: serverTimestamp() };
        transaction.set(member, data);
        transaction.set(doc(db, 'users', uid, 'sharedProjects', sharedProjectKey(ownerId, projectId)), data);
    });
}
