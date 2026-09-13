"use client";
import { useEffect, useState } from 'react';
import { doc, onSnapshot, DocumentData } from 'firebase/firestore';
import { db } from '@/firebaseConfig';
import { progressFields } from '@/utils/projectProgress';
export function useLiveProject<T extends object>(userId: string, projectId: string) {
    const [projectDetails, setProjectDetails] = useState<T | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    useEffect(() => {
        setLoading(true); setError(null); setProjectDetails(null);
        return onSnapshot(doc(db, 'users', userId, 'projects', projectId), snapshot => {
            setLoading(false);
            if (!snapshot.exists()) { setProjectDetails(null); setError('Project not found.'); return; }
            const data: DocumentData = snapshot.data();
            setProjectDetails({ ...data, ...progressFields(data) } as T); setError(null);
        }, () => { setError('Could not load project updates. Please reload to retry.'); setLoading(false); });
    }, [userId, projectId]);
    return { projectDetails, setProjectDetails, loading, error };
}
