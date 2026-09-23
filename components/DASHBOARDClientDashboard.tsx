"use client";
import { useEffect, useState } from 'react';
import { subscribeUserProjects } from '@/utils/projectSubscriptions';
import { getAuth } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { db } from '../firebaseConfig';
import DashboardClientSideNav from './DashboardClientSideNav';
import Image from 'next/image';
import Link from 'next/link';
import DashboardTopBar from './DashboardTopBar';
import CreateProjectPopup from './CreateProjectPopup';
import DashboardIcon from './DashboardIcon';
import { paymentCount, paidCount } from '@/utils/billing';

interface Project {
  uid: string;
  userId: string;
  projectName: string;
  progress?: string;
  approval?: string;
  dueDate?: string;
  recentActivity?: string;
  dateCreated?: string;
  paymentPlan?: number;
  weeksPaid?: number;
  status?: number;
  logoAttachment?: string | null;
}

const DASHBOARDClientDashboard = () => {
  const [creatingProject, setCreatingProject] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [dataLoading, setDataLoading] = useState(true);
  const [firstName, setFirstName] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const auth = getAuth();
  const router = useRouter();

  const getFormattedDate = () => {
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const d = new Date();
    return `${days[d.getDay()]}, ${months[d.getMonth()]} ${d.getDate()}`;
  };

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) { router.push('/login'); return; }
    let active = true;
    setError(''); setDataLoading(true);
    getDoc(doc(db, 'users', user.uid)).then(snapshot => { if (active && snapshot.exists()) setFirstName(snapshot.data().firstName || null); }).catch(() => { if (active) setError('Could not load your profile. Please retry.'); });
    setUserId(user.uid);
    const stop = subscribeUserProjects(user.uid, items => {
      setProjects(items.filter(p => p.approval !== 'Cancelled').map(p => ({ ...p, approval: p.setupComplete === false ? 'Draft' : p.approval })));
      setDataLoading(false);
    }, () => { setError('Could not load dashboard data. Please retry.'); setDataLoading(false); });
    return () => { active = false; stop(); };
  }, [auth, router, attempt]);

  const activeProject = projects.find(p => p.approval === 'Approved') || projects.find(p => p.approval === 'Draft') || projects.find(p => p.approval === 'Pending') || projects[0] || null;
  const isBuilding = activeProject?.approval === 'Approved';
  const projectHeading = !activeProject ? 'Your first website starts here' : isBuilding ? 'Active Project' : activeProject.approval === 'Draft' ? 'Continue your project brief' : activeProject.approval === 'Declined' ? 'Let’s talk about your project' : 'Your brief is with us';
  const activeCount = projects.filter(p => p.approval === 'Approved').length;
  const pendingCount = projects.filter(p => p.approval === 'Pending').length;

  const getApprovalStyle = (approval?: string) => {
    if (approval === 'Approved') return 'text-green-400 bg-green-400/10 px-[10px] py-[3px] rounded-full text-[12px]';
    if (approval === 'Declined') return 'text-red-400 bg-red-400/10 px-[10px] py-[3px] rounded-full text-[12px]';
    return 'text-yellow-400 bg-yellow-400/10 px-[10px] py-[3px] rounded-full text-[12px]';
  };

  return (
    <div className="flex flex-col xl:flex-row h-screen DashboardBackgroundGradient overflow-hidden">
      <CreateProjectPopup isVisible={creatingProject} closeCreatProjectPopup={() => setCreatingProject(false)} />
      <DashboardClientSideNav highlight="dashboard" />

      <div className="flex-1 flex flex-col min-h-0 overflow-hidden pt-[60px] xl:pt-0">
        <DashboardTopBar title="Dashboard" />
        {error && <div role="alert" className="DashboardNotice">{error} <button onClick={() => { setError(''); setAttempt(n => n + 1); }}>Retry</button></div>}

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-[30px] lg:px-[50px] py-[40px]">

          {/* Welcome */}
          <div className="DashboardPurpleCard mb-[30px] rounded-[24px] px-[30px] py-[24px]">
            <h1 className="text-[28px] font-semibold mb-[4px]">Welcome back, {firstName || 'there'}!</h1>
            <p className="text-[14px] font-light opacity-60">Today is {getFormattedDate()}</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-[20px] mb-[20px]">
            {/* Active Project Spotlight */}
            <div className="BlackGradient ContentCardShadow rounded-[24px] overflow-hidden flex flex-col">
              <div className="flex items-center justify-between px-[28px] py-[20px] border-b border-white/10">
                <h2 className="text-[17px] font-semibold">{projectHeading}</h2>
                {projects.length > 0 && (
                  <Link href="/dashboard/projects" className="text-[12px] opacity-50 hover:opacity-100 flex items-center gap-[4px]">
                    All projects
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M4 2l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </Link>
                )}
              </div>
              <div className="flex-1 px-[28px] py-[24px]">
                {dataLoading ? (
                  <p className="opacity-40 font-light text-[14px]">Loading...</p>
                ) : !activeProject ? (
                  <div className="flex flex-col items-center justify-center py-[30px] gap-[12px]">
                    <p className="opacity-80 text-[14px] text-center leading-relaxed">A portfolio, a personal space, or something new. Tell us your rough idea and we’ll help with the details.</p>
                    <button onClick={() => setCreatingProject(true)} className="PopupAttentionGradient PopupAttentionShadow text-[13px] px-[16px] py-[10px] rounded-[10px]">
                      Create your first project
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-[18px]">
                    <div className="flex items-center gap-[14px]">
                      <div className="w-[46px] h-[46px] rounded-[10px] BlackWithLightGradient ContentCardShadow flex items-center justify-center flex-shrink-0 overflow-hidden">
                        {activeProject.logoAttachment ? (
                          <Image src={activeProject.logoAttachment} alt="Logo" layout="responsive" width={0} height={0} />
                        ) : (
                          <DashboardIcon />
                        )}
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-[16px] font-semibold truncate">{activeProject.projectName}</h3>
                        <span className={getApprovalStyle(activeProject.approval)}>{activeProject.approval || 'Pending'}</span>
                      </div>
                    </div>

                    {!isBuilding && <p className="text-[14px] opacity-80 leading-relaxed">{activeProject.approval === 'Draft'
                      ? 'Your answers are saved. Continue whenever you’re ready; a rough idea is enough to send your brief.'
                      : activeProject.approval === 'Declined'
                      ? 'This request wasn’t approved. Open your project or message us to discuss what could work.'
                      : 'We’ll review your idea and follow up in messages. Build progress will appear here once your project is approved.'}</p>}
                    {isBuilding && <>
                    {/* Progress */}
                    <div>
                      <div className="flex justify-between mb-[8px]">
                        <p className="text-[13px] font-light opacity-60">Overall Progress</p>
                        <p className="text-[13px] font-semibold">{activeProject.progress || 0}%</p>
                      </div>
                      <div className="h-[7px] rounded-full bg-white/10">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${Math.min(Number(activeProject.progress) || 0, 100)}%`,
                            background: 'linear-gradient(to right, #6265f0, #725CF7)'
                          }}
                        />
                      </div>
                    </div>

                    {/* Details row */}
                    <div className="grid grid-cols-2 gap-[10px]">
                      <div className="BlackWithLightGradient rounded-[12px] px-[14px] py-[12px]">
                        <p className="text-[11px] opacity-40 mb-[3px]">Due Date</p>
                        <p className="text-[13px] font-medium">{activeProject.dueDate || 'Not set'}</p>
                      </div>
                      <div className="BlackWithLightGradient rounded-[12px] px-[14px] py-[12px]">
                        <p className="text-[11px] opacity-40 mb-[3px]">Payments</p>
                        <p className="text-[13px] font-medium">
                          {paymentCount(activeProject) ? `${paidCount(activeProject)} / ${paymentCount(activeProject)} paid` : 'To be arranged'}
                        </p>
                      </div>
                    </div>

                    </>}
                    {activeProject.recentActivity && (
                      <div className="border-t border-white/10 pt-[14px]">
                        <p className="text-[11px] opacity-40 mb-[4px]">Recent Activity</p>
                        <p className="text-[13px] font-light opacity-80">{activeProject.recentActivity}</p>
                      </div>
                    )}

                    <Link
                      href={`/dashboard/projects/${activeProject.uid}${activeProject.approval === 'Draft' ? '/setup' : ''}?projectId=${activeProject.uid}&userId=${activeProject.userId}`}
                      className="PopupAttentionGradient PopupAttentionShadow text-[13px] font-medium px-[16px] py-[10px] rounded-[12px] text-center"
                    >
                      {activeProject.approval === 'Draft' ? 'Continue your brief' : isBuilding ? 'View Project Details →' : 'View your project'}
                    </Link>
                  </div>
                )}
              </div>
            </div>

            {/* All Projects List */}
            <div className="BlackGradient ContentCardShadow rounded-[24px] overflow-hidden flex flex-col">
              <div className="flex items-center justify-between px-[28px] py-[20px] border-b border-white/10">
                <h2 className="text-[17px] font-semibold">All Projects</h2>
                <Link href="/dashboard/projects" className="text-[12px] opacity-50 hover:opacity-100 flex items-center gap-[4px]">
                  Manage
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M4 2l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </Link>
              </div>
              <div className="flex-1 flex flex-col">
                {dataLoading ? (
                  <div className="flex justify-center items-center py-[40px]">
                    <p className="opacity-40 font-light text-[14px]">Loading...</p>
                  </div>
                ) : projects.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-[40px] gap-[10px]">
                    <p className="opacity-40 font-light text-[14px]">No projects yet.</p>
                  </div>
                ) : (
                  projects.map((project, i) => (
                    <Link
                      key={`${project.userId}/${project.uid}`}
                      href={`/dashboard/projects/${project.uid}${project.approval === 'Draft' ? '/setup' : ''}?projectId=${project.uid}&userId=${project.userId}`}
                      className={`flex items-center gap-[14px] px-[28px] py-[16px] hover:bg-white/[0.03] ${i < projects.length - 1 ? 'border-b border-white/5' : ''}`}
                    >
                      <div className="w-[36px] h-[36px] rounded-[8px] BlackWithLightGradient ContentCardShadow flex items-center justify-center flex-shrink-0 overflow-hidden">
                        {project.logoAttachment ? (
                          <Image src={project.logoAttachment} alt="Logo" layout="responsive" width={0} height={0} />
                        ) : (
                          <DashboardIcon size={18} />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[14px] font-medium truncate">{project.projectName}</p>
                        {project.approval === 'Approved' ? <div className="flex items-center gap-[8px] mt-[4px]">
                          <div className="flex-1 h-[3px] rounded-full bg-white/10">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${Math.min(Number(project.progress) || 0, 100)}%`,
                                background: 'linear-gradient(to right, #6265f0, #725CF7)'
                              }}
                            />
                          </div>
                          <p className="text-[11px] opacity-50 flex-shrink-0">{project.progress || 0}%</p>
                        </div> : <p className="text-[12px] opacity-70 mt-[4px]">{project.approval === 'Draft' ? 'Ready when you are' : project.approval === 'Declined' ? 'Contact us about next steps' : 'Awaiting review'}</p>}
                      </div>
                      <span className={getApprovalStyle(project.approval)}>{project.approval || 'Pending'}</span>
                    </Link>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Stat Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-[15px] mb-[30px]">
            {[
              { label: 'Total Projects', value: dataLoading ? '—' : projects.length, icon: 'folder' as const, color: '#725CF7' },
              { label: 'Active', value: dataLoading ? '—' : activeCount, icon: 'check' as const, color: '#22c55e' },
              { label: 'Pending Review', value: dataLoading ? '—' : pendingCount, icon: 'clock' as const, color: '#f59e0b' },
            ].map((stat) => (
              <div key={stat.label} className="DashboardPurpleCard ContentCardShadow rounded-[20px] px-[25px] py-[22px] flex flex-col gap-[10px]">
                <div className="flex items-center justify-between">
                  <p className="text-[13px] font-light opacity-60">{stat.label}</p>
                  <DashboardIcon name={stat.icon} size={20} />
                </div>
                <p className="text-[32px] font-semibold" style={{ color: stat.color }}>{stat.value}</p>
              </div>
            ))}
          </div>

          {/* Quick Links */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-[15px]">
            {[
              { label: 'My Projects', desc: 'View and track your projects', href: '/dashboard/projects', icon: 'folder' as const },
              { label: 'Messages', desc: 'Chat with the Lucidify team', href: '/dashboard/messages', icon: 'message' as const },
              { label: 'Settings', desc: 'Update your profile & preferences', href: '/dashboard/settings', icon: 'settings' as const },
            ].map((item) => (
              <Link key={item.href} href={item.href} className="BlackWithLightGradient ContentCardShadow rounded-[20px] px-[22px] py-[20px] flex flex-col gap-[8px] hover:bg-white/[0.05]">
                <DashboardIcon name={item.icon} />
                <p className="text-[15px] font-semibold">{item.label}</p>
                <p className="text-[12px] font-light opacity-50">{item.desc}</p>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DASHBOARDClientDashboard;
