"use client";

import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import DashboardAdminSideNav from '@/components/DashboardAdminSideNav';
import DashboardTopBar from './DashboardTopBar';
import ProjectTabs from './ProjectTabs';
import ProjectResourceGrid from './ProjectResourceGrid';
import UploadResourceDialog from './UploadResourceDialog';
import { ProjectResource, subscribeResources } from '@/utils/projectUploads';

interface DASHBOARDAdminProjectDetailsUploadsProps {
    userId: string;
    projectId: string;
}

const DASHBOARDAdminProjectDetailsUploads = ({ userId, projectId }: DASHBOARDAdminProjectDetailsUploadsProps) => {
    const [projectName, setProjectName] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [filesError, setFilesError] = useState<string | null>(null);
    const [resources, setResources] = useState<ProjectResource[]>([]);
    const [uploadOpen, setUploadOpen] = useState(false);

    useEffect(() => {
        if (!userId || !projectId) return;
        setLoading(true); setError(null); setFilesError(null);

        const unsubscribeProject = onSnapshot(doc(db, 'users', userId, 'projects', projectId), snapshot => {
            setLoading(false);
            if (!snapshot.exists()) { setError('Project not found.'); return; }
            setProjectName(snapshot.data().projectName || '');
            setError(null);
        }, () => { setLoading(false); setError('Could not load this project. Please reload to retry.'); });

        const unsubscribeResources = subscribeResources(userId, projectId, setResources,
            () => setFilesError('Some files could not be loaded. Please reload to retry.'));

        return () => { unsubscribeProject(); unsubscribeResources(); };
    }, [userId, projectId]);

    const liked = resources.filter(resource => resource.liked).length;

    if (loading || error) {
        return (
            <div className="flex flex-col xl:flex-row h-screen DashboardBackgroundGradient overflow-hidden">
                <DashboardAdminSideNav highlight="projects" />
                <div className="flex-1 flex flex-col pt-[60px] xl:pt-0 min-h-0 overflow-hidden">
                    <DashboardTopBar title="Uploads" />
                    <div className="flex-1 flex items-center justify-center px-[20px]">
                        {loading
                            ? <p className="opacity-40 font-light text-[14px]">Loading files...</p>
                            : <p role="alert" className="text-red-400 text-[14px] text-center">{error}</p>}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <>
            <UploadResourceDialog
                isVisible={uploadOpen} onClose={() => setUploadOpen(false)}
                userId={userId} projectId={projectId} projectName={projectName} isAdmin
            />

            <div className="flex flex-col xl:flex-row h-screen DashboardBackgroundGradient overflow-hidden">
                <DashboardAdminSideNav highlight="projects" />

                <div className="flex-1 flex flex-col pt-[60px] xl:pt-0 min-h-0 overflow-hidden">
                    <DashboardTopBar title="Uploads" />

                    <div className="flex-1 overflow-y-auto px-[20px] sm:px-[50px] pt-[30px] pb-[40px]">
                        <ProjectTabs projectId={projectId} active="uploads" userId={userId} />

                        {filesError && <p role="alert" className="text-red-400 text-[13px] mb-[16px]">{filesError}</p>}

                        <div className="flex flex-wrap items-start justify-between gap-[14px] mb-[24px]">
                            <div>
                                {projectName && <p className="text-[12px] opacity-40 mb-[4px]">{projectName}</p>}
                                <h1 className="text-[22px] sm:text-[26px] font-semibold">Files &amp; Designs</h1>
                                <p className="text-[13px] opacity-50 mt-[4px]">
                                    {resources.length} file{resources.length !== 1 ? 's' : ''} on this project
                                    {liked > 0 && ` · ${liked} liked by the client`}
                                </p>
                            </div>
                            <button
                                onClick={() => setUploadOpen(true)}
                                className="flex items-center gap-[8px] PopupAttentionGradient PopupAttentionShadow px-[18px] py-[10px] rounded-[12px] text-[13px] font-medium"
                            >
                                <span className="text-[16px] leading-none" aria-hidden="true">+</span>
                                Add files
                            </button>
                        </div>

                        <ProjectResourceGrid
                            resources={resources} userId={userId} projectId={projectId}
                            projectName={projectName} isAdmin
                        />
                    </div>
                </div>
            </div>
        </>
    );
};

export default DASHBOARDAdminProjectDetailsUploads;
