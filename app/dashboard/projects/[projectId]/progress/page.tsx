"use client";
import { Suspense } from 'react';
import Link from 'next/link';
import { useProjectRoute } from '@/hooks/useProjectRoute';
import DASHBOARDClientProjectDetailsProgress from "@/components/DASHBOARDClientProjectDetailsProgress";
import DASHBOARDAdminProjectDetailsProgress from "@/components/DASHBOARDAdminProjectDetailsProgress";

function ProjectPageContent() {
  const { loading, isAdmin, userId, projectId } = useProjectRoute();
  if (loading) return <p role="status" className="p-8">Loading project...</p>;
  if (!userId || !projectId) return (
    <div className="p-8"><p>Select a client project to continue.</p><Link href="/dashboard/projects">Back to projects</Link></div>
  );
  return isAdmin ? <DASHBOARDAdminProjectDetailsProgress userId={userId} projectId={projectId} /> : <DASHBOARDClientProjectDetailsProgress userId={userId} projectId={projectId} />;
}
export default function ProjectPage() {
  return <Suspense fallback={<p role="status" className="p-8">Loading project...</p>}><ProjectPageContent /></Suspense>;
}
