"use client";
import { Suspense } from 'react';
import Link from 'next/link';
import { useProjectRoute } from '@/hooks/useProjectRoute';
import DASHBOARDClientProjectDetailsUploads from "@/components/DASHBOARDClientProjectDetailsUploads";
import DASHBOARDAdminProjectDetailsUploads from "@/components/DASHBOARDAdminProjectDetailsUploads";

function ProjectPageContent() {
  const { loading, isAdmin, userId, projectId } = useProjectRoute();
  if (loading) return <p role="status" className="p-8">Loading project...</p>;
  if (!userId || !projectId) return (
    <div className="p-8"><p>Select a client project to continue.</p><Link href="/dashboard/projects">Back to projects</Link></div>
  );
  return isAdmin ? <DASHBOARDAdminProjectDetailsUploads userId={userId} projectId={projectId} /> : <DASHBOARDClientProjectDetailsUploads userId={userId} projectId={projectId} />;
}
export default function ProjectPage() {
  return <Suspense fallback={<p role="status" className="p-8">Loading project...</p>}><ProjectPageContent /></Suspense>;
}
