"use client";
import { Suspense } from 'react';
import Link from 'next/link';
import { useProjectRoute } from '@/hooks/useProjectRoute';
import DASHBOARDClientProjectDetails from "@/components/DASHBOARDClientProjectDetails";
import DASHBOARDAdminProjectDetails from "@/components/DASHBOARDAdminProjectDetails";

function ProjectPageContent() {
  const { loading, isAdmin, userId, projectId } = useProjectRoute();
  if (loading) return <p role="status" className="p-8">Loading project...</p>;
  if (!userId || !projectId) return (
    <div className="p-8"><p>Select a client project to continue.</p><Link href="/dashboard/projects">Back to projects</Link></div>
  );
  return isAdmin ? <DASHBOARDAdminProjectDetails userId={userId} projectId={projectId} /> : <DASHBOARDClientProjectDetails userId={userId} projectId={projectId} />;
}
export default function ProjectPage() {
  return <Suspense fallback={<p role="status" className="p-8">Loading project...</p>}><ProjectPageContent /></Suspense>;
}
