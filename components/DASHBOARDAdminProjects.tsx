import { subscribeAllProjects } from '@/utils/projectSubscriptions';
import { updateAndNotify } from '@/utils/notifications';
import { useEffect, useState } from 'react';
import { collection, doc, getDocs, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import Link from 'next/link';
import Image from 'next/image';
import DashboardAdminSideNav from './DashboardAdminSideNav';
import DashboardTopBar from './DashboardTopBar';

interface Project {
    uid: string;
    projectName: string;
    progress?: string;
    logoAttachment?: string | null;
    logoUrl?: string | null;
    recentActivity?: string;
    dateCreated?: string;
    comments?: string;
    approval?: string;
    paymentPlan?: number;
    weeksPaid?: number;
    dueDate?: string;
    status?: number;
    setupComplete?: boolean;
}

interface User {
    displayName: string;
    email: string;
    photoURL: string;
    selectedAvatar?: string;
    firstName?: string;
    lastName?: string;
}

interface UserProjects {
    userId: string;
    projects: Project[];
}

const ADMIN_EMAIL = 'ayush.bhujle@gmail.com';

const parseDate = (d?: string) => {
    if (!d || d === 'N/A') return 0;
    return new Date(d).getTime() || 0;
};

const DASHBOARDAdminProjects = () => {
    const [userProjects, setUserProjects] = useState<UserProjects[]>([]);
    const [userProfiles, setUserProfiles] = useState<{ [userId: string]: User }>({});
    const [error, setError] = useState('');
    const [attempt, setAttempt] = useState(0);
    const [busy, setBusy] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(true); setError('');
        return subscribeAllProjects((items, profiles) => {
            const grouped = new Map<string, Project[]>();
            for (const project of items) {
                if (project.setupComplete === false || project.approval === 'Cancelled') continue;
                grouped.set(project.userId, [...(grouped.get(project.userId) || []), project]);
            }
            const groups = [...grouped.entries()].map(([userId, projects]) => ({ userId, projects: projects.sort((a,b) => parseDate(b.dateCreated) - parseDate(a.dateCreated)) }));
            setUserProjects(groups.sort((a,b) => parseDate(b.projects[0]?.dateCreated) - parseDate(a.projects[0]?.dateCreated)));
            setUserProfiles(profiles as Record<string, User>); setLoading(false);
        }, () => { setError('Could not load projects. Please retry.'); setLoading(false); });
    }, [attempt]);

    const handleApproval = async (userId: string, projectId: string, newStatus: 'Approved' | 'Declined') => {
        if (busy) return;
        setBusy(true); setError('');
        try {
            const projectRef = doc(db, 'users', userId, 'projects', projectId);
            await updateAndNotify(projectRef, {
                approval: newStatus,
                recentActivity: newStatus === 'Approved' ? 'Project approved by Lucidify.' : 'Project declined by Lucidify.',
            }, userId, `Project ${newStatus.toLowerCase()}`, `Your project request has been ${newStatus.toLowerCase()}.`, 'project_update', projectId, `/dashboard/projects/${projectId}`);
            setAttempt(n => n + 1);
        } catch (error) {
            setError('Could not update this project. Please retry.');
        } finally {
            setBusy(false);
        }
    };

    const handleDeleteProject = async (userId: string, projectId: string) => {
        const confirmed = window.confirm('Are you sure you want to cancel this project?');
        if (!confirmed) return;
        try {
            await updateAndNotify(doc(db, 'users', userId, 'projects', projectId), { approval: 'Cancelled' }, userId, 'Project cancelled', 'Your project has been cancelled. Contact Lucidify if you need help.', 'project_update', projectId, '/dashboard/projects');
            setAttempt(n => n + 1);
        } catch (error) {
            setError('Could not cancel this project. Please retry.');
            console.error('Error deleting project: ', error);
        }
    };

    const totalProjects = userProjects.reduce((s, u) => s + u.projects.length, 0);

    return (
        <div className="flex flex-col xl:flex-row h-screen DashboardBackgroundGradient overflow-hidden">
            <DashboardAdminSideNav highlight="projects" />

            <div className="flex-1 flex flex-col pt-[60px] xl:pt-0 min-h-0 overflow-hidden">
                <DashboardTopBar title="Projects" />
                {error && <div role="alert" className="DashboardNotice">{error} <button onClick={() => { setError(''); setAttempt(n => n + 1); }}>Retry</button></div>}

                <div className="flex-1 overflow-y-auto px-[20px] sm:px-[50px] pt-[30px] pb-[40px]">
                    {/* Page Header */}
                    <div className="mb-[28px]">
                        <h1 className="text-[28px] font-semibold mb-[4px]">Projects</h1>
                        <p className="text-[14px] font-light opacity-50">
                            {loading ? 'Loading...' : `${totalProjects} project${totalProjects !== 1 ? 's' : ''} across ${userProjects.length} client${userProjects.length !== 1 ? 's' : ''}`}
                        </p>
                    </div>

                    {loading ? (
                        <div className="flex items-center justify-center py-[80px]">
                            <p className="opacity-30 font-light text-[14px]">Loading...</p>
                        </div>
                    ) : userProjects.length === 0 ? (
                        <div className="BlackGradient ContentCardShadow rounded-[20px] flex flex-col items-center justify-center py-[60px] gap-[10px]">
                            <div className="text-[32px] opacity-20">📂</div>
                            <p className="text-[14px] opacity-35 font-light">No projects yet</p>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-[36px]">
                            {userProjects.map((user) => {
                                const profile = userProfiles[user.userId];
                                const displayName = [profile?.firstName, profile?.lastName].filter(part => part?.trim()).join(' ').trim()
                                    || profile?.displayName?.trim() || 'Unnamed client';
                                const avatarSrc = profile?.selectedAvatar
                                    ? `/${profile.selectedAvatar}`
                                    : profile?.photoURL || '/Lucidify Umbrella.png';

                                return (
                                    <div key={user.userId}>
                                        {/* Client Header */}
                                        <div className="flex items-center gap-[12px] mb-[14px]">
                                            <div className="w-[32px] h-[32px] rounded-full overflow-hidden flex-shrink-0">
                                                <Image src={avatarSrc} alt={displayName} layout="responsive" width={0} height={0} />
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-[8px]">
                                                    <span className="text-[15px] font-semibold">{displayName}</span>
                                                    <span className="text-[11px] opacity-35 font-light">{user.projects.length} project{user.projects.length !== 1 ? 's' : ''}</span>
                                                </div>
                                                <p className="text-[12px] opacity-35 font-light">{profile?.email}</p>
                                            </div>
                                        </div>

                                        {/* Projects Grid */}
                                        <div className="flex flex-wrap gap-[16px]">
                                            {user.projects.map((project) => (
                                                <div
                                                    key={project.uid}
                                                    className={`relative w-full sm:w-[calc(50%-8px)] lg:w-[calc(25%-12px)] px-[24px] py-[20px] BlackGradient ContentCardShadow rounded-[10px] flex flex-col gap-4`}
                                                >
                                                    {/* Top Section: Title and Logo */}
                                                    <div className="flex justify-between items-start">
                                                        <div className="flex flex-col min-w-0 pr-2">
                                                            <h3 className="text-[15px] font-semibold truncate">{project.projectName}</h3>
                                                            <p className="text-[11px] text-white opacity-50 mt-[2px]">Created: {project.dateCreated}</p>
                                                            <p className="text-[11px] text-white opacity-50">Due: {project.dueDate}</p>
                                                        </div>
                                                        {project.logoAttachment && (
                                                            <div className="w-[40px] flex-shrink-0">
                                                                <Image src={project.logoAttachment} alt={project.projectName} layout="responsive" width={0} height={0} />
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Status and Progress */}
                                                    <div className="flex flex-col gap-[10px]">
                                                        <div className="flex justify-between items-center">
                                                            {/* Status dots */}
                                                            <div className="relative font-normal text-[14px]">
                                                                {project.status === 1 && (
                                                                    <div className="flex gap-[8px] items-center">
                                                                        <div className="flex gap-[3px]">
                                                                            <div className="rounded-full bg-[#ADA0FF] w-[5px] h-[5px]" />
                                                                            <div className="opacity-40 rounded-full bg-[#ADA0FF] w-[5px] h-[5px]" />
                                                                            <div className="opacity-40 rounded-full bg-[#ADA0FF] w-[5px] h-[5px]" />
                                                                            <div className="opacity-40 rounded-full bg-[#ADA0FF] w-[5px] h-[5px]" />
                                                                        </div>
                                                                        <h3 className="text-[#ADA0FF]">Planning</h3>
                                                                    </div>
                                                                )}
                                                                {project.status === 2 && (
                                                                    <div className="flex gap-[8px] items-center">
                                                                        <div className="flex gap-[3px]">
                                                                            <div className="rounded-full bg-[#FFD563] w-[5px] h-[5px]" />
                                                                            <div className="rounded-full bg-[#FFD563] w-[5px] h-[5px]" />
                                                                            <div className="opacity-40 rounded-full bg-[#FFD563] w-[5px] h-[5px]" />
                                                                            <div className="opacity-40 rounded-full bg-[#FFD563] w-[5px] h-[5px]" />
                                                                        </div>
                                                                        <h3 className="text-[#FFD563]">Designing</h3>
                                                                    </div>
                                                                )}
                                                                {project.status === 3 && (
                                                                    <div className="flex gap-[8px] items-center">
                                                                        <div className="flex gap-[3px]">
                                                                            <div className="rounded-full bg-[#467CD9] w-[5px] h-[5px]" />
                                                                            <div className="rounded-full bg-[#467CD9] w-[5px] h-[5px]" />
                                                                            <div className="rounded-full bg-[#467CD9] w-[5px] h-[5px]" />
                                                                            <div className="opacity-40 rounded-full bg-[#467CD9] w-[5px] h-[5px]" />
                                                                        </div>
                                                                        <h3 className="text-[#6294E9]">Developing</h3>
                                                                    </div>
                                                                )}
                                                                {project.status === 4 && (
                                                                    <div className="flex gap-[8px] items-center">
                                                                        <div className="flex gap-[3px]">
                                                                            <div className="rounded-full bg-[#46D999] w-[5px] h-[5px]" />
                                                                            <div className="rounded-full bg-[#46D999] w-[5px] h-[5px]" />
                                                                            <div className="rounded-full bg-[#46D999] w-[5px] h-[5px]" />
                                                                            <div className="rounded-full bg-[#46D999] w-[5px] h-[5px]" />
                                                                        </div>
                                                                        <h3 className="text-[#62E98F]">Launching</h3>
                                                                    </div>
                                                                )}
                                                                {project.status === 5 && (
                                                                    <div className="flex gap-[8px] items-center">
                                                                        <h3 className="text-[#6294E9]">Maintaining</h3>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>

                                                        {/* Progress Bar */}
                                                        <div className="flex flex-col items-end gap-[6px]">
                                                            <div className="w-full h-[9px] bg-[#333741] rounded-full ContentCardLightShadow">
                                                                <div
                                                                    className={`h-[9px] ContentCardLightShadow rounded-full ${project.status === 1 ? 'bg-[#ADA0FF]' :
                                                                        project.status === 2 ? 'bg-[#FFD563]' :
                                                                            project.status === 3 ? 'bg-[#467CD9]' :
                                                                                project.status === 4 ? 'bg-[#46D999]' :
                                                                                    project.status === 5 ? 'bg-[#6294E9]' :
                                                                                        'bg-[#ADA0FF]'
                                                                        }`}
                                                                    style={{ width: `${project.progress}%` }}
                                                                />
                                                            </div>
                                                            <p className="text-[13px]">{project.progress}%</p>
                                                        </div>
                                                    </div>

                                                    {project.approval !== 'Approved' && <Link href={`/dashboard/projects/${project.uid}?userId=${user.userId}`} className="text-sm underline">Review request</Link>}
                                                    {/* Action Buttons */}
                                                    {project.approval === 'Pending' ? (
                                                        <div className="pointer-events-auto flex justify-between items-center">
                                                            <button
                                                                className="button-86 button-approve hover:cursor-pointer pointer-events-auto" role="button"
                                                                disabled={busy} onClick={() => handleApproval(user.userId, project.uid, 'Approved')}>
                                                                Approve
                                                            </button>
                                                            <button
                                                                className="button-86 button-decline hover:cursor-pointer pointer-events-auto" role="button"
                                                                disabled={busy} onClick={() => handleApproval(user.userId, project.uid, 'Declined')}>
                                                                Decline
                                                            </button>
                                                        </div>
                                                    ) : project.approval === 'Declined' ? (
                                                        <div className="pointer-events-auto flex justify-between items-center">
                                                            <button
                                                                className="button-86 button-override hover:cursor-pointer pointer-events-auto" role="button"
                                                                disabled={busy} onClick={() => handleApproval(user.userId, project.uid, 'Approved')}>
                                                                Reapprove
                                                            </button>
                                                            <div className="body">
                                                                <div className="container container2">
                                                                    <div className="btn" style={{ width: '100px', height: '40px' }}>
                                                                        <a className="hover:cursor-pointer" onClick={() => handleDeleteProject(user.userId, project.uid)}>Cancel project</a>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ) : project.approval === 'Approved' ? (
                                                        <div className="flex justify-between items-center">
                                                            <div className="body">
                                                                <div className="container container1">
                                                                    <div className="btn" style={{ width: '140px', height: '40px' }}>
                                                                        <a href={`/dashboard/projects/${project.uid}?projectId=${project.uid}&userId=${user.userId}`}>
                                                                            View Project
                                                                            <div className="-rotate-45 w-[12px] ml-[4px] rounded-full pointer-events-auto overflow-clip">
                                                                                <Image src="/White Top Right Arrow.png" alt="Right Arrow" layout="responsive" width={0} height={0} />
                                                                            </div>
                                                                        </a>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <div className="body">
                                                                <div className="container container2">
                                                                    <div className="btn" style={{ width: '100px', height: '40px' }}>
                                                                        <a className="hover:cursor-pointer" onClick={() => handleDeleteProject(user.userId, project.uid)}>Cancel project</a>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ) : null}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DASHBOARDAdminProjects;
