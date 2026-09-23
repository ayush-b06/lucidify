"use client";
import { useEffect, useState } from 'react';
import { subscribeResources } from '@/utils/projectUploads';

export function useProjectResourceCount(userId: string, projectId: string) {
    const [count, setCount] = useState(0);
    useEffect(() => {
        setCount(0);
        return subscribeResources(userId, projectId, resources => setCount(resources.length), () => setCount(0));
    }, [userId, projectId]);
    return count;
}
