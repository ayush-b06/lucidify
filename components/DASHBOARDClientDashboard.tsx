"use client";
import { useEffect, useState } from 'react';
import { useAuth } from '@/context/authContext';
import { useClientProjects } from '@/hooks/useClientProjects';
import { projectState, projectProgress, projectHref, projectNextStep, projectStateLabels } from '@/utils/projectWorkflow';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import DashboardClientSideNav from './DashboardClientSideNav';
import Image from 'next/image';
import Link from 'next/link';
import DashboardTopBar from './DashboardTopBar';

const DASHBOARDClientDashboard = () => {
  const { projects, loading: dataLoading, error, retry } = useClientProjects();
  const [firstName, setFirstName] = useState<string | null>(null);
  const { user } = useAuth();

  const getFormattedDate = () => {
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const d = new Date();
    return `${days[d.getDay()]}, ${months[d.getMonth()]} ${d.getDate()}`;
  };

  useEffect(() => {
    if (!user) return;
    let active = true;
    getDoc(doc(db, 'users', user.uid)).then(snapshot => {
      if (active && snapshot.exists()) setFirstName(snapshot.data().firstName || null);
    }).catch(console.error);
    return () => { active = false; };
  }, [user]);

  const activeProject = projects.find(p => projectState(p) === 'approved') || projects[0] || null;
  const activeCount = projects.filter(p => projectState(p) === 'approved').length;
  const pendingCount = projects.filter(p => projectState(p) === 'pending').length;
  const actionProjects = projects.filter(p => ['setup', 'declined'].includes(projectState(p)));

  const getApprovalStyle = (approval?: string) => {
    if (approval === 'Approved') return 'text-green-400 bg-green-400/10 px-[10px] py-[3px] rounded-full text-[12px]';
    if (approval === 'Declined') return 'text-red-400 bg-red-400/10 px-[10px] py-[3px] rounded-full text-[12px]';
    return 'text-yellow-400 bg-yellow-400/10 px-[10px] py-[3px] rounded-full text-[12px]';
  };

  return (
    <div className="flex flex-col xl:flex-row h-screen DashboardBackgroundGradient overflow-hidden">
      <DashboardClientSideNav highlight="dashboard" />

      <div className="flex-1 flex flex-col min-h-0 overflow-hidden pt-[60px] xl:pt-0">
        <DashboardTopBar title="Dashboard" />

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-[30px] lg:px-[50px] py-[40px]">

          {/* Welcome */}
          <div className="DashboardPurpleCard mb-[30px] rounded-[24px] px-[30px] py-[24px]">
            <h1 className="text-[28px] font-semibold mb-[4px]">Welcome back, {firstName || 'there'}!</h1>
            <p className="text-[14px] font-light opacity-60">Today is {getFormattedDate()}</p>
          </div>

          {error && <div role="alert" className="BlackGradient rounded-xl p-5 mb-5"><p>{error}</p><button onClick={retry} className="underline mt-2">Try again</button></div>}
          {!dataLoading && !error && actionProjects.length > 0 && <section aria-label="Your next steps" className="BlackGradient ContentCardShadow rounded-[24px] p-6 mb-6">
            <h2 className="text-[17px] font-semibold mb-3">Your next steps</h2>
            {actionProjects.map(project => <div key={project.uid} className="flex flex-wrap items-center justify-between gap-3 py-3 border-t border-white/10">
              <div><p className="font-medium">{project.projectName}</p><p className="text-[13px] opacity-70 mt-1">{projectNextStep(project)}</p></div>
              <Link className="PopupAttentionGradient rounded-xl px-4 py-2 text-[13px]" href={projectState(project) === 'setup' ? projectHref(project) : `/dashboard/messages?projectId=${encodeURIComponent(project.uid)}`}>
                {projectState(project) === 'setup' ? 'Continue setup' : 'Discuss project'}
              </Link>
            </div>)}
          </section>}
          {/* Stat Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-[15px] mb-[30px]">
            {[
              { label: 'Total Projects', value: dataLoading || error ? '—' : projects.length, icon: '📁', color: '#725CF7' },
              { label: 'Active', value: dataLoading || error ? '—' : activeCount, icon: '✅', color: '#22c55e' },
              { label: 'Pending Review', value: dataLoading || error ? '—' : pendingCount, icon: '⏳', color: '#f59e0b' },
            ].map((stat) => (
              <div key={stat.label} className="DashboardPurpleCard ContentCardShadow rounded-[20px] px-[25px] py-[22px] flex flex-col gap-[10px]">
                <div className="flex items-center justify-between">
                  <p className="text-[13px] font-light opacity-60">{stat.label}</p>
                  <span className="text-[18px]">{stat.icon}</span>
                </div>
                <p className="text-[32px] font-semibold" style={{ color: stat.color }}>{stat.value}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-[20px] mb-[20px]">
            {/* Active Project Spotlight */}
            <div className="BlackGradient ContentCardShadow rounded-[24px] overflow-hidden flex flex-col">
              <div className="flex items-center justify-between px-[28px] py-[20px] border-b border-white/10">
                <h2 className="text-[17px] font-semibold">Project Overview</h2>
                {projects.length > 0 && (
                  <Link href="/dashboard/projects" className="text-[12px] opacity-50 hover:opacity-100 flex items-center gap-[4px]">
                    All projects
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M4 2l4 4-4 4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </Link>
                )}
              </div>
              <div className="flex-1 px-[28px] py-[24px]">
                {error ? <p className="p-6 text-[14px]">Project information is unavailable.</p> : dataLoading ? (
                  <p className="opacity-40 font-light text-[14px]">Loading...</p>
                ) : !activeProject ? (
                  <div className="flex flex-col items-center justify-center py-[30px] gap-[12px]">
                    <p className="opacity-40 font-light text-[14px] text-center">No projects yet.</p>
                    <Link href="/dashboard/projects" className="PopupAttentionGradient PopupAttentionShadow text-[13px] px-[16px] py-[8px] rounded-[10px]">
                      Start a project
                    </Link>
                  </div>
                ) : (
                  <div className="flex flex-col gap-[18px]">
                    <div className="flex items-center gap-[14px]">
                      <div className="w-[46px] h-[46px] rounded-[10px] BlackWithLightGradient ContentCardShadow flex items-center justify-center flex-shrink-0 overflow-hidden">
                        {activeProject.logoAttachment ? (
                          <Image src={activeProject.logoAttachment} alt="Logo" layout="responsive" width={0} height={0} />
                        ) : (
                          <span className="text-[18px] opacity-50">📁</span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-[16px] font-semibold truncate">{activeProject.projectName}</h3>
                        <span className={getApprovalStyle(activeProject.approval)}>{projectStateLabels[projectState(activeProject)]}</span>
                      </div>
                    </div>

                    {/* Progress */}
                    <div>
                      <div className="flex justify-between mb-[8px]">
                        <p className="text-[13px] font-light opacity-60">Overall Progress</p>
                        <p className="text-[13px] font-semibold">{projectProgress(activeProject.progress)}%</p>
                      </div>
                      <div className="h-[7px] rounded-full bg-white/10">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${projectProgress(activeProject.progress)}%`,
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
                          {typeof activeProject.paymentPlan === 'number' ? `${activeProject.weeksPaid || 0} / ${activeProject.paymentPlan} wks` : activeProject.paymentPlan || 'Not set'}
                        </p>
                      </div>
                    </div>

                    {activeProject.recentActivity && (
                      <div className="border-t border-white/10 pt-[14px]">
                        <p className="text-[11px] opacity-40 mb-[4px]">Recent Activity</p>
                        <p className="text-[13px] font-light opacity-80">{activeProject.recentActivity}</p>
                      </div>
                    )}

                    <Link
                      href={projectHref(activeProject)}
                      className="PopupAttentionGradient PopupAttentionShadow text-[13px] font-medium px-[16px] py-[10px] rounded-[12px] text-center"
                    >
                      {projectState(activeProject) === 'setup' ? 'Continue setup →' : 'View Project Details →'}
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
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M4 2l4 4-4 4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </Link>
              </div>
              <div className="flex-1 flex flex-col">
                {error ? <p className="p-6 text-[14px]">Project information is unavailable.</p> : dataLoading ? (
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
                      key={project.uid}
                      href={projectHref(project)}
                      className={`flex items-center gap-[14px] px-[28px] py-[16px] hover:bg-white/[0.03] ${i < projects.length - 1 ? 'border-b border-white/5' : ''}`}
                    >
                      <div className="w-[36px] h-[36px] rounded-[8px] BlackWithLightGradient ContentCardShadow flex items-center justify-center flex-shrink-0 overflow-hidden">
                        {project.logoAttachment ? (
                          <Image src={project.logoAttachment} alt="Logo" layout="responsive" width={0} height={0} />
                        ) : (
                          <span className="text-[14px] opacity-50">📁</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[14px] font-medium truncate">{project.projectName}</p>
                        <div className="flex items-center gap-[8px] mt-[4px]">
                          <div className="flex-1 h-[3px] rounded-full bg-white/10">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${projectProgress(project.progress)}%`,
                                background: 'linear-gradient(to right, #6265f0, #725CF7)'
                              }}
                            />
                          </div>
                          <p className="text-[11px] opacity-50 flex-shrink-0">{projectProgress(project.progress)}%</p>
                        </div>
                      </div>
                      <span className={getApprovalStyle(project.approval)}>{projectStateLabels[projectState(project)]}</span>
                    </Link>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-[15px]">
            {[
              { label: 'My Projects', desc: 'View and track your projects', href: '/dashboard/projects', icon: '📋' },
              { label: 'Messages', desc: 'Chat with the Lucidify team', href: '/dashboard/messages', icon: '💬' },
              { label: 'Settings', desc: 'Update your profile & preferences', href: '/dashboard/settings', icon: '⚙️' },
            ].map((item) => (
              <Link key={item.href} href={item.href} className="BlackWithLightGradient ContentCardShadow rounded-[20px] px-[22px] py-[20px] flex flex-col gap-[8px] hover:bg-white/[0.05]">
                <span className="text-[22px]">{item.icon}</span>
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
