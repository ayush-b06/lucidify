"use client";
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { collection, doc, onSnapshot, writeBatch, Timestamp } from 'firebase/firestore';
import { useAuth } from './authContext';
import { db } from '@/firebaseConfig';
import { ADMIN_EMAIL } from '@/utils/notifications';

export interface DashboardNotification {
  id: string; path: string; title: string; message: string; type: string;
  read: boolean; createdAt?: Timestamp | null; link?: string;
}
const Context = createContext<{ items: DashboardNotification[]; loading: boolean; error: string; retry: () => void; markRead: (items: DashboardNotification[]) => Promise<void> } | null>(null);
export function NotificationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [items, setItems] = useState<DashboardNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    setItems([]); setError(''); setLoading(true);
    if (!user) { setLoading(false); return; }
    let disposed = false;
    const sources = new Map<string, DashboardNotification[]>();
    const stops = new Map<string, () => void>();
    const publish = () => {
      if (disposed) return;
      setItems([...sources.values()].flat().sort((a,b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0)));
      setLoading(false);
    };
    const subscribe = (path: string) => {
      stops.set(path, onSnapshot(collection(db, path), snapshot => {
        sources.set(path, snapshot.docs.map(d => ({ ...d.data(), id: d.ref.path, path: d.ref.path } as DashboardNotification)));
        publish();
      }, () => { if (!disposed) { setError('Notifications could not be loaded.'); setLoading(false); } }));
    };
    subscribe(`users/${user.uid}/notifications`);
    let stopUsers: (() => void) | undefined;
    if (user.email === ADMIN_EMAIL) {
      stopUsers = onSnapshot(collection(db, 'users'), snapshot => {
        const paths = new Set(snapshot.docs.map(d => `users/${d.id}/adminNotifications`));
        for (const [path, stop] of stops) {
          if (path.endsWith('/adminNotifications') && !paths.has(path)) { stop(); stops.delete(path); sources.delete(path); }
        }
        paths.forEach(path => { if (!stops.has(path)) subscribe(path); });
        publish();
      }, () => { if (!disposed) setError('Team notifications could not be loaded.'); });
    }
    return () => { disposed = true; stopUsers?.(); stops.forEach(stop => stop()); };
  }, [user, attempt]);
  const markRead = async (notifications: DashboardNotification[]) => {
    if (!user) throw new Error('Please sign in again.');
    const unread = notifications.filter(n => !n.read);
    for (let i = 0; i < unread.length; i += 450) {
      const batch = writeBatch(db);
      unread.slice(i, i + 450).forEach(n => batch.update(doc(db, n.path), { read: true }));
      await batch.commit();
    }
  };
  return <Context.Provider value={{ items, loading, error, retry: () => setAttempt(n => n + 1), markRead }}>{children}</Context.Provider>;
}
export function useNotifications() {
  const value = useContext(Context);
  if (!value) throw new Error('Notifications require NotificationProvider.');
  return value;
}
