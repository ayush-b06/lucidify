"use client";

import { useEffect, useState } from 'react';
import { collection, doc, onSnapshot, Timestamp } from 'firebase/firestore';
import { db } from '@/firebaseConfig';

export interface ClientConversation {
  id: string;
  type: 'lucidify' | 'direct';
  title: string;
  avatarSrc: string | null;
  isPinned: boolean;
  timestamp: Timestamp | null;
  lastMessage: string;
  unreadCount: number;
  otherUserId?: string;
}
export const conversationKey = (conversation: ClientConversation) => `${conversation.type}:${conversation.id}`;

export function useClientConversations(userId?: string) {
  const [convos, setConvos] = useState<ClientConversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    setConvos([]);
    setLoading(true);
    setError('');
    if (!userId) return;
    let active = true;
    let team: ClientConversation[] = [];
    const direct = new Map<string, ClientConversation>();
    const subscriptions = new Map<string, () => void>();
    const pending = new Set<string>();
    let teamReady = false;
    let refsReady = false;
    const publish = () => {
      if (!active) return;
      setConvos([...team, ...Array.from(direct.values())].sort((a, b) =>
        Number(b.isPinned) - Number(a.isPinned) ||
        (b.timestamp?.toMillis() || 0) - (a.timestamp?.toMillis() || 0) ||
        conversationKey(a).localeCompare(conversationKey(b))
      ));
      setLoading(!teamReady || !refsReady || pending.size > 0);
    };
    const failed = () => {
      if (active) setError('Some conversations couldn’t load. Please try again.');
    };
    const unsubscribeTeam = onSnapshot(collection(db, 'users', userId, 'conversations'), { includeMetadataChanges: true }, snapshot => {
      if (snapshot.metadata.hasPendingWrites) return;
      team = snapshot.docs.map(item => {
        const data = item.data();
        return {
          id: item.id, type: 'lucidify', title: data.title || 'Lucidify', avatarSrc: null,
          isPinned: !!data.isPinned, timestamp: data.timestamp || null,
          lastMessage: data.lastMessage || '', unreadCount: data.unreadCounts?.[userId] || 0,
        };
      });
      teamReady = true;
      publish();
    }, () => { teamReady = true; failed(); publish(); });
    const unsubscribeRefs = onSnapshot(collection(db, 'users', userId, 'dmConversations'), snapshot => {
      refsReady = true;
      const ids = new Set(snapshot.docs.map(item => item.id));
      subscriptions.forEach((unsubscribe, id) => {
        if (!ids.has(id)) { unsubscribe(); subscriptions.delete(id); direct.delete(id); pending.delete(id); }
      });
      snapshot.docs.forEach(item => {
        if (subscriptions.has(item.id)) return;
        const otherUserId = item.data().otherUserId;
        pending.add(item.id);
        subscriptions.set(item.id, onSnapshot(doc(db, 'directMessages', item.id), { includeMetadataChanges: true }, thread => {
          if (thread.metadata.hasPendingWrites) return;
          pending.delete(item.id);
          if (thread.exists()) {
            const data = thread.data();
            const profile = data.participantProfiles?.[otherUserId] || {};
            direct.set(item.id, {
              id: item.id, type: 'direct', otherUserId,
              title: [profile.firstName, profile.lastName].filter(Boolean).join(' ') || 'Unknown',
              avatarSrc: profile.selectedAvatar || null, isPinned: false,
              timestamp: data.timestamp || null, lastMessage: data.lastMessage || '',
              unreadCount: data.unreadCounts?.[userId] || 0,
            });
          } else direct.delete(item.id);
          publish();
        }, () => { pending.delete(item.id); failed(); publish(); }));
      });
      publish();
    }, () => { refsReady = true; failed(); publish(); });
    return () => {
      active = false;
      unsubscribeTeam();
      unsubscribeRefs();
      subscriptions.forEach(unsubscribe => unsubscribe());
    };
  }, [userId, attempt]);

  return { convos, loading, error, retry: () => setAttempt(value => value + 1) };
}
