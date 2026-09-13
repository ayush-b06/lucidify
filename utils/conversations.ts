import { collection, doc, onSnapshot, Timestamp, writeBatch, increment, DocumentData } from 'firebase/firestore';
import { auth, db } from '@/firebaseConfig';
import { queueAdminNotification, queueNotification } from './notifications';
export interface ConversationEntry extends DocumentData { id: string; userId?: string; type: 'lucidify' | 'direct'; timestamp?: Timestamp | null; }
const newest = (a: ConversationEntry, b: ConversationEntry) => Number(b.isPinned || false) - Number(a.isPinned || false) || (b.timestamp?.toMillis?.() || 0) - (a.timestamp?.toMillis?.() || 0);
export function subscribeClientConversations(uid: string, next: (items: ConversationEntry[]) => void, error: (error: unknown) => void) {
  let support: ConversationEntry[] = [];
  const directs = new Map<string, ConversationEntry>();
  const stops = new Map<string, () => void>();
  let active = true;
  const emit = () => { if (active) next([...support, ...directs.values()].sort(newest)); };
  const supportStop = onSnapshot(collection(db, 'users', uid, 'conversations'), snap => {
    support = snap.docs.map(d => ({ ...d.data(), id: d.id, type: 'lucidify', title: d.data().title || 'Lucidify', avatarSrc: null, unreadCount: d.data().unreadCounts?.[uid] || 0 })); emit();
  }, error);
  const refsStop = onSnapshot(collection(db, 'users', uid, 'dmConversations'), snap => {
    const ids = new Set(snap.docs.map(d => d.id));
    stops.forEach((stop,id) => { if (!ids.has(id)) { stop(); stops.delete(id); directs.delete(id); } });
    snap.docs.forEach(ref => {
      if (stops.has(ref.id)) return;
      stops.set(ref.id, onSnapshot(doc(db, 'directMessages', ref.id), d => {
        if (!d.exists()) { directs.delete(ref.id); emit(); return; }
        const data = d.data();
        const otherUid = data.participants?.find((id: string) => id !== uid);
        const profile = data.participantProfiles?.[otherUid] || {};
        directs.set(ref.id, { ...data, id: ref.id, type: 'direct', title: `${profile.firstName || 'Member'} ${profile.lastName || ''}`.trim(), avatarSrc: profile.selectedAvatar || null, otherUserId: otherUid, unreadCount: data.unreadCounts?.[uid] || 0 }); emit();
      }, error));
    }); emit();
  }, error);
  return () => { active = false; supportStop(); refsStop(); stops.forEach(stop => stop()); };
}
export function subscribeAdminConversations(next: (items: ConversationEntry[]) => void, error: (error: unknown) => void) {
  const sources = new Map<string, ConversationEntry[]>();
  const stops = new Map<string, () => void>();
  const profiles = new Map<string, DocumentData>();
  let active = true;
  const emit = () => { if (active) next([...sources.entries()].flatMap(([uid,items]) => items.map(item => ({ ...profiles.get(uid), ...item }))).sort(newest)); };
  const stopUsers = onSnapshot(collection(db, 'users'), users => {
    const ids = new Set(users.docs.map(d => d.id));
    stops.forEach((stop,uid) => { if (!ids.has(uid)) { stop(); stops.delete(uid); sources.delete(uid); profiles.delete(uid); } });
    users.docs.forEach(user => {
      profiles.set(user.id, user.data());
      if (stops.has(user.id)) return;
      stops.set(user.id, onSnapshot(collection(db, 'users', user.id, 'conversations'), snap => {
        sources.set(user.id, snap.docs.filter(d => d.data().title === 'Lucidify').map(d => ({ ...d.data(), id: d.id, userId: user.id, type: 'lucidify' }))); emit();
      }, error));
    }); emit();
  }, error);
  return () => { active = false; stopUsers(); stops.forEach(stop => stop()); };
}
export async function sendChatMessage(options: { conversationId: string; text: string; type: 'lucidify' | 'direct'; ownerId: string; admin?: boolean; otherUserId?: string; senderName?: string }) {
  const user = auth.currentUser;
  const text = options.text.trim();
  if (!user || !text) throw new Error('Enter a message before sending.');
  const ref = options.type === 'direct' ? doc(db, 'directMessages', options.conversationId) : doc(db, 'users', options.ownerId, 'conversations', options.conversationId);
  const sender = options.admin ? 'Lucidify' : user.uid;
  const recipient = options.admin ? options.ownerId : options.type === 'direct' ? options.otherUserId : 'Lucidify';
  if (!recipient) throw new Error('This conversation is unavailable.');
  const batch = writeBatch(db);
  const timestamp = Timestamp.now();
  batch.set(doc(collection(ref, 'messages')), { text, sender, timestamp, isRead: false });
  batch.update(ref, { lastMessage: text, lastMessageSender: sender, timestamp, [`unreadCounts.${recipient}`]: increment(1) });
  const preview = text.length > 100 ? `${text.slice(0,100)}…` : text;
  if (recipient === 'Lucidify') queueAdminNotification(batch, `New message from ${options.senderName || 'a client'}`, preview, `/dashboard/messages?userId=${user.uid}&conversationId=${options.conversationId}`);
  else queueNotification(batch, recipient, options.admin ? 'New message from Lucidify' : `New message from ${options.senderName || 'a member'}`, preview, 'message', undefined, `/dashboard/messages?conversationId=${options.conversationId}`, options.type === 'direct' ? { conversationId: options.conversationId, senderId: user.uid } : {});
  await batch.commit();
}
