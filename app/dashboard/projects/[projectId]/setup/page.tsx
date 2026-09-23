"use client";
import Client from '@/components/DASHBOARDClientProjectSetup';

import { useAuth } from '@/context/authContext';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ADMIN_EMAIL } from '@/utils/notifications';
export default function ProjectPage() {
    const { user } = useAuth();
    const { projectId } = useParams<{ projectId: string }>();
    const search = useSearchParams();
    if (!user) return null;
    const isAdmin = user.email === ADMIN_EMAIL;
    const userId = search.get('userId') || (isAdmin ? null : user.uid);
    if (!userId) return <main className="DashboardBackgroundGradient p-8"><p>Select a client project to open its details.</p><Link href="/dashboard/projects" className="underline">Back to projects</Link></main>;
    return <Client userId={userId} projectId={projectId} />;
}
