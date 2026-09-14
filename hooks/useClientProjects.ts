"use client";

import { useEffect, useState } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { useAuth } from '@/context/authContext';
import { db } from '@/firebaseConfig';
import { ClientProject } from '@/utils/projectWorkflow';

export function useClientProjects() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<ClientProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const userId = user?.uid;

  useEffect(() => {
    setProjects([]);
    setError('');
    setLoading(true);
    if (!userId) return;
    return onSnapshot(collection(db, 'users', userId, 'projects'), snapshot => {
      const next = snapshot.docs.map(item => ({
        ...item.data(), uid: item.id, projectName: item.data().projectName || 'Unnamed Project',
      } as ClientProject));
      next.sort((a, b) => (Date.parse(b.dateCreated || '') || 0) - (Date.parse(a.dateCreated || '') || 0) || a.uid.localeCompare(b.uid));
      setProjects(next);
      setError('');
      setLoading(false);
    }, () => {
      setError('We couldn’t load your projects. Please try again.');
      setLoading(false);
    });
  }, [userId, attempt]);

  return { projects, loading, error, retry: () => setAttempt(value => value + 1) };
}
