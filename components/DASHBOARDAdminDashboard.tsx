// AdminDashboard.tsx
import { useEffect, useState } from 'react';
import { getAuth } from 'firebase/auth';
import { collection, doc, getDoc, getDocs } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { db } from '../firebaseConfig';
import DashboardAdminSideNav from './DashboardAdminSideNav';
import Image from 'next/image';
import Link from 'next/link';

interface Project {
  uid: string;
  userId: string;
  clientName: string;
  clientAvatar?: string;
  projectName: string;
  progress?: string;
  approval?: string;
  dueDate?: string;
  recentActivity?: string;
  dateCreated?: string;
  status?: number;
}

const AdminDashboard = () => {
  const [allProjects, setAllProjects] = useState<Project[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [firstName, setFirstName] = useState<string | null>(null);
  const auth = getAuth();
  const router = useRouter();

  const getFormattedDate = () => {
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const d = new Date();
    return `${days[d.getDay()]}, ${months[d.getMonth()]} ${d.getDate()}`;
  };

  useEffect(() => {
    const fetchData = async () => {
      const user = auth.currentUser;
      if (!user) { router.push('/login'); return; }

      try {
        // Fetch admin name
        const adminDoc = await getDoc(doc(db, "users", user.uid));
        if (adminDoc.exists()) setFirstName(adminDoc.data().firstName || null);

        // Fetch all users and their projects
        const usersSnapshot = await getDocs(collection(db, 'users'));
        const projects: Project[] = [];

        for (const userDoc of usersSnapshot.docs) {
          const userData = userDoc.data();
          const userId = userDoc.id;
          const clientName = userData.firstName
            ? `${userData.firstName} ${userData.lastName || ''}`.trim()
            : userData.displayName || 'Unknown';

          const projectsSnap = await getDocs(collection(db, 'users', userId, 'projects'));
          projectsSnap.forEach((pDoc) => {
            const p = pDoc.data();
            projects.push({
              uid: pDoc.id,
              userId,
              clientName,
              clientAvatar: userData.selectedAvatar,
              projectName: p.projectName || 'Unnamed Project',
              progress: p.progress || '0',
              approval: p.approval || 'Pending',
              dueDate: p.dueDate || null,
              recentActivity: p.recentActivity || null,
              dateCreated: p.dateCreated || null,
              status: p.status || 1,
            });
          });
        }

        setAllProjects(projects);
      } catch (e) {
        console.error(e);
      } finally {
        setDataLoading(false);
      }
    };

    fetchData();
  }, [auth, router]);

  const totalClients = Array.from(new Set(allProjects.map(p => p.userId))).length;
  const pendingProjects = allProjects.filter(p => p.approval === 'Pending').length;
  const activeProjects = allProjects.filter(p => p.approval === 'Approved').length;
  const recentProjects = [...allProjects].reverse().slice(0, 6);

  const getApprovalStyle = (approval?: string) => {
    if (approval === 'Approved') return 'text-green-400 bg-green-400/10 px-[10px] py-[3px] rounded-full text-[12px]';
    if (approval === 'Declined') return 'text-red-400 bg-red-400/10 px-[10px] py-[3px] rounded-full text-[12px]';
    return 'text-yellow-400 bg-yellow-400/10 px-[10px] py-[3px] rounded-full text-[12px]';
  };

  return (
    <div className="flex h-screen DashboardBackgroundGradient overflow-hidden">
      <DashboardAdminSideNav highlight="dashboard" />

      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <div className="absolute BottomGradientBorder left-0 top-[103px] w-full" />

        {/* Top Bar */}
        <div className="flex items-center justify-between px-[30px] lg:px-[50px] py-6 flex-shrink-0">
          <div className="inline-flex items-center gap-[5px]">
            <div className="inline-flex items-center gap-[5px] opacity-40">
              <div className="w-[15px]"><Image src="/Home Icon.png" alt="Home" layout="responsive" width={0} height={0} /></div>
              <div className="font-light text-sm">Home</div>
            </div>
            <div className="font-light text-sm">/ Dashboard</div>
          </div>
          <div className="inline-flex items-center gap-5">
            <div className="flex w-[55px] h-[55px] items-center justify-center relative rounded-[100px] BlackGradient ContentCardShadow hover:cursor-pointer">
              <div className="flex w-5 h-5 items-center justify-center px-[3px] absolute -top-[5px] -left-[4px] bg-[#6265f0] rounded-md">
                <div className="font-normal text-xs">2</div>
              </div>
              <div className="w-[25px]"><Image src="/Notification Bell Icon.png" alt="Bell" layout="responsive" width={0} height={0} /></div>
            </div>
            <Link href="/dashboard/settings" className="flex w-[129px] h-[55px] items-center justify-center gap-2.5 rounded-[15px] BlackGradient ContentCardShadow">
              <div className="font-light text-sm">Settings</div>
              <div className="w-[30px]"><Image src="/Settings Icon.png" alt="Settings" layout="responsive" width={0} height={0} /></div>
            </Link>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-[30px] lg:px-[50px] py-[40px]">
          {/* Welcome */}
          <div className="mb-[30px]">
            <h1 className="text-[28px] font-semibold mb-[4px]">Welcome back, {firstName || 'Admin'}!</h1>
            <p className="text-[14px] font-light opacity-60">Today is {getFormattedDate()}</p>
          </div>

          {/* Stat Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-[15px] mb-[30px]">
            {[
              { label: 'Total Clients', value: dataLoading ? '—' : totalClients, icon: '👥', color: '#6265f0' },
              { label: 'Total Projects', value: dataLoading ? '—' : allProjects.length, icon: '📁', color: '#725CF7' },
              { label: 'Pending Approval', value: dataLoading ? '—' : pendingProjects, icon: '⏳', color: '#f59e0b' },
              { label: 'Active Projects', value: dataLoading ? '—' : activeProjects, icon: '✅', color: '#22c55e' },
            ].map((stat) => (
              <div key={stat.label} className="BlackGradient ContentCardShadow rounded-[20px] px-[25px] py-[22px] flex flex-col gap-[10px]">
                <div className="flex items-center justify-between">
                  <p className="text-[13px] font-light opacity-60">{stat.label}</p>
                  <span className="text-[18px]">{stat.icon}</span>
                </div>
                <p className="text-[32px] font-semibold" style={{ color: stat.color }}>{stat.value}</p>
              </div>
            ))}
          </div>

          {/* Recent Projects */}
          <div className="BlackGradient ContentCardShadow rounded-[24px] overflow-hidden">
            <div className="flex items-center justify-between px-[30px] py-[22px] border-b border-white/10">
              <h2 className="text-[18px] font-semibold">Recent Projects</h2>
              <Link href="/dashboard/projects" className="text-[13px] font-light opacity-60 hover:opacity-100 flex items-center gap-[5px]">
                View all
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M5 3l4 4-4 4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </Link>
            </div>

            {dataLoading ? (
              <div className="flex justify-center items-center py-[60px]">
                <p className="opacity-40 font-light text-[14px]">Loading projects...</p>
              </div>
            ) : recentProjects.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-[60px] gap-[10px]">
                <p className="opacity-40 font-light text-[14px]">No projects yet.</p>
              </div>
            ) : (
              <div className="flex flex-col">
                {/* Table header */}
                <div className="hidden md:grid grid-cols-[1fr_1.5fr_120px_100px_80px] gap-[15px] px-[30px] py-[12px] border-b border-white/5">
                  {['Client', 'Project', 'Progress', 'Due Date', 'Status'].map(h => (
                    <p key={h} className="text-[12px] font-light opacity-40 uppercase tracking-wide">{h}</p>
                  ))}
                </div>
                {recentProjects.map((project, i) => (
                  <Link
                    key={project.uid}
                    href={`/dashboard/projects/${project.uid}?projectId=${project.uid}&userId=${project.userId}`}
                    className={`flex flex-col md:grid md:grid-cols-[1fr_1.5fr_120px_100px_80px] gap-[10px] md:gap-[15px] px-[30px] py-[18px] hover:bg-white/[0.03] ${i < recentProjects.length - 1 ? 'border-b border-white/5' : ''}`}
                  >
                    {/* Client */}
                    <div className="flex items-center gap-[10px]">
                      <div className="w-[30px] h-[30px] rounded-full BlackWithLightGradient ContentCardShadow flex items-center justify-center flex-shrink-0 overflow-hidden">
                        {project.clientAvatar ? (
                          <Image src={`/${project.clientAvatar}`} alt={project.clientName} layout="responsive" width={0} height={0} />
                        ) : (
                          <span className="text-[11px] opacity-60">{project.clientName.charAt(0)}</span>
                        )}
                      </div>
                      <p className="text-[14px] font-light truncate">{project.clientName}</p>
                    </div>

                    {/* Project name */}
                    <p className="text-[14px] font-medium truncate">{project.projectName}</p>

                    {/* Progress bar */}
                    <div className="flex items-center gap-[8px]">
                      <div className="flex-1 h-[5px] rounded-full bg-white/10">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${Math.min(Number(project.progress) || 0, 100)}%`,
                            background: 'linear-gradient(to right, #6265f0, #725CF7)'
                          }}
                        />
                      </div>
                      <p className="text-[12px] opacity-60 flex-shrink-0">{project.progress || 0}%</p>
                    </div>

                    {/* Due date */}
                    <p className="text-[13px] font-light opacity-60 truncate">{project.dueDate || '—'}</p>

                    {/* Status badge */}
                    <div><span className={getApprovalStyle(project.approval)}>{project.approval || 'Pending'}</span></div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Quick Links */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-[15px] mt-[20px]">
            {[
              { label: 'All Projects', desc: 'Review & manage client submissions', href: '/dashboard/projects', icon: '📋' },
              { label: 'Messages', desc: 'Chat with your clients', href: '/dashboard/messages', icon: '💬' },
              { label: 'Settings', desc: 'Update your account preferences', href: '/dashboard/settings', icon: '⚙️' },
            ].map((item) => (
              <Link key={item.href} href={item.href} className="BlackWithLightGradient ContentCardShadow rounded-[20px] px-[22px] py-[20px] flex flex-col gap-[8px] hover:bg-white/[0.05] group">
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

export default AdminDashboard;
