import { collection, doc, onSnapshot, Timestamp, runTransaction, serverTimestamp, increment, DocumentData } from 'firebase/firestore';
import { ChatAttachment, ChatTarget, MAX_ATTACHMENTS, validAttachment } from './chatAttachments';
import { auth, db } from '@/firebaseConfig';
import { ADMIN_EMAIL, queueAdminNotification, queueNotification } from './notifications';
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
      let data: DocumentData | null = null;
      let directory: DocumentData | null = null;
      let otherUid = '';
      let stopProfile: (() => void) | undefined;
      const update = () => {
        if (!data) return;
        const profile = directory || data.participantProfiles?.[otherUid] || {};
        directs.set(ref.id, { ...data, id: ref.id, type: 'direct', title: `${profile.firstName || 'Member'} ${profile.lastName || ''}`.trim(), avatarSrc: profile.selectedAvatar || null, otherUserId: otherUid, unreadCount: data.unreadCounts?.[uid] || 0 }); emit();
      };
      const stopThread = onSnapshot(doc(db, 'directMessages', ref.id), snapshot => {
        if (!snapshot.exists()) { data = null; stopProfile?.(); directs.delete(ref.id); emit(); return; }
        data = snapshot.data();
        const nextUid = data.participants?.find((id: string) => id !== uid) || '';
        if (nextUid !== otherUid) {
          stopProfile?.(); otherUid = nextUid; directory = null;
          if (otherUid) stopProfile = onSnapshot(doc(db, 'userDirectory', otherUid), member => { directory = member.data() || null; update(); }, () => { directory = null; update(); });
        }
        update();
      }, error);
      stops.set(ref.id, () => { stopThread(); stopProfile?.(); });
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
export async function sendChatMessage(options: ChatTarget & { text: string; attachments?: ChatAttachment[]; messageId?: string }) {
  const user = auth.currentUser;
  const text = options.text.trim();
  const attachments = options.attachments || [];
  if (!user || (!text && !attachments.length)) throw new Error('Enter a message or attach a file before sending.');
  if (text.length > 10000 || attachments.length > MAX_ATTACHMENTS || attachments.some(file => !validAttachment(file, options))) throw new Error('Invalid message or attachment.');
  if (options.admin && user.email !== ADMIN_EMAIL) throw new Error('This account cannot send as Lucidify.');
  if (options.type === 'lucidify' && !options.admin && options.ownerId !== user.uid) throw new Error('This conversation is unavailable.');
  const ref = options.type === 'direct' ? doc(db, 'directMessages', options.conversationId) : doc(db, 'users', options.ownerId, 'conversations', options.conversationId);
  const messageRef = options.messageId ? doc(ref, 'messages', options.messageId) : doc(collection(ref, 'messages'));
  const sender = options.admin ? 'Lucidify' : user.uid;
  const recipient = options.admin ? options.ownerId : options.type === 'direct' ? options.otherUserId : 'Lucidify';
  if (!recipient) throw new Error('This conversation is unavailable.');
  const summary = text || (attachments.length === 1 ? `Attachment: ${attachments[0].name}` : `${attachments.length} attachments`);
  const preview = summary.length > 100 ? `${summary.slice(0, 100)}…` : summary;
  await runTransaction(db, async transaction => {
    const conversation = await transaction.get(ref);
    const existing = await transaction.get(messageRef);
    if (!conversation.exists()) throw new Error('This conversation is unavailable.');
    if (options.type === 'direct' && (!conversation.data().participants?.includes(user.uid) || !conversation.data().participants?.includes(recipient))) throw new Error('This conversation is unavailable.');
    if (existing.exists()) return;
    const timestamp = serverTimestamp();
    transaction.set(messageRef, { text, attachments, sender, timestamp, isRead: false });
    transaction.update(ref, { lastMessage: summary, lastMessageSender: sender, timestamp, [`unreadCounts.${recipient}`]: increment(1) });
    if (recipient === 'Lucidify') queueAdminNotification(transaction, `New message from ${options.senderName || 'a client'}`, preview, `/dashboard/messages?userId=${user.uid}&conversationId=${options.conversationId}`, 'message', `message-${messageRef.id}`);
    else queueNotification(transaction, recipient, options.admin ? 'New message from Lucidify' : `New message from ${options.senderName || 'a member'}`, preview, 'message', undefined, `/dashboard/messages?conversationId=${options.conversationId}`, options.type === 'direct' ? { conversationId: options.conversationId, senderId: user.uid } : {});
  });
}
