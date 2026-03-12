import { useEffect, useState } from 'react';
import { getAuth } from 'firebase/auth';
import { collection, deleteDoc, doc, getDocs } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { auth, db } from '../firebaseConfig'; // Firestore instance
import DashboardClientSideNav from './DashboardClientSideNav';
import Image from 'next/image';
import Link from 'next/link';
import CreateProjectPopup from './CreateProjectPopup';
import NotificationBell from './NotificationBell';

interface Project {
    uid: string;
    projectName: string;
    logoAttachment: string | null;
    progress?: string;
    recentActivity?: string;
    dateCreated?: string;
    comments?: string;
    approval?: string;
    paymentPlan?: number;
    weeksPaid?: number;
    dueDate?: string;
    status?: number;
}




const STATUS_CONFIG: Record<number, { bg: string; border: string; text: string; label: string; dots: number }> = {
    1: { bg: 'bg-[#5E49E2]', border: 'border-[#7B67FF]', text: 'text-[#ADA0FF]', label: 'Planning', dots: 1 },
    2: { bg: 'bg-[#A9671C]', border: 'border-[#B56A20]', text: 'text-[#FFD563]', label: 'Designing', dots: 2 },
    3: { bg: 'bg-[#102A56]', border: 'border-[#153B84]', text: 'text-[#6294E9]', label: 'Developing', dots: 3 },
    4: { bg: 'bg-[#105625]', border: 'border-[#27733E]', text: 'text-[#62E98F]', label: 'Launching', dots: 4 },
    5: { bg: 'bg-[#102A56]', border: 'border-[#153B84]', text: 'text-[#6294E9]', label: 'Maintaining', dots: 4 },
};

const DOT_COLORS: Record<number, string> = {
    1: 'bg-[#ADA0FF]', 2: 'bg-[#FFD563]', 3: 'bg-[#467CD9]', 4: 'bg-[#46D999]', 5: 'bg-[#467CD9]',
};

const StatusBadge = ({ status }: { status?: number }) => {
    const s = status ?? 1;
    const cfg = STATUS_CONFIG[s];
    if (!cfg) return null;
    const dotColor = DOT_COLORS[s];
    return (
        <div className={`inline-flex ${cfg.bg} border ${cfg.border} rounded-[4px] px-[8px] py-[4px] gap-[6px] items-center`}>
            <div className="flex flex-wrap gap-[1px] w-[13px] h-[13px]">
                {[0, 1, 2, 3].map(i => (
                    <div key={i} className={`rounded-[1px] w-[5px] h-[5px] ${dotColor} ${i < cfg.dots ? 'opacity-100' : 'opacity-30'}`} />
                ))}
            </div>
            <span className={`${cfg.text} text-[13px]`}>{cfg.label}</span>
        </div>
    );
};

const PaymentDots = ({ plan, paid }: { plan?: number; paid?: number }) => {
    const total = plan ?? 0;
    if (!total) return <span className="text-[12px] opacity-30 font-light">—</span>;
    const planLabels: Record<number, string> = { 1: '100% upfront', 2: '2-week', 3: '3-week', 4: '4-week', 5: '5-week' };
    return (
        <div className="flex flex-col gap-[4px]">
            <div className="flex gap-[4px]">
                {Array.from({ length: total }).map((_, i) => (
                    <div key={i} className={`w-[13px] h-[13px] PopupAttentionGradient rounded-[3px] ${i < (paid ?? 0) ? 'opacity-100' : 'opacity-30'}`} />
                ))}
            </div>
            <span className="text-[10px] opacity-40 font-light">{planLabels[total]}</span>
        </div>
    );
};

const DASHBOARDClientProjects = () => {
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true); // To handle loading state
    const [firstName, setFirstName] = useState<string | null>(null);
    const [isCreateProjectPopupOpen, setIsCreateProjectPopupOpen] = useState(false);
    const [showNotifications, setShowNotifications] = useState(false);

    const toggleCreateProjectPopup = () => {
        setIsCreateProjectPopupOpen(!isCreateProjectPopupOpen);
    };

    const handleDeleteProject = async (uid: string) => {
        const user = auth.currentUser;

        if (!user) {
            alert('User is not logged in');
            return;
        }

        // Confirmation dialog
        const confirmed = window.confirm("Are you sure you want to cancel this project?");
        if (!confirmed) {
            return; // Exit if the user does not confirm
        }

        try {
            // Reference to the specific project document to delete
            const projectRef = doc(db, "users", user.uid, "projects", uid);
            await deleteDoc(projectRef);
            // Optionally refresh the project list
            setProjects(projects.filter((project) => project.uid !== uid));
        } catch (error) {
            alert('Error deleting project');
            console.error('Error deleting project: ', error);
        }
    };

    const auth = getAuth();
    const router = useRouter();
    const user = auth.currentUser;

    useEffect(() => {
        const fetchProjects = async () => {

            if (!user) {
                // Redirect to login page if user is not authenticated
                router.push('/login');
                return;
            }

            try {
                // Fetch the projects subcollection under the current user's document
                const projectsRef = collection(db, "users", user.uid, "projects");
                const projectsSnapshot = await getDocs(projectsRef);

                const projectsList: Project[] = [];
                projectsSnapshot.forEach((doc) => {
                    const projectData = doc.data() as Project;
                    projectsList.push({
                        uid: doc.id, // Add this line to get the document ID
                        projectName: projectData.projectName || 'Unnamed Project',
                        logoAttachment: projectData.logoAttachment || null,
                        progress: projectData.progress || '5',
                        recentActivity: projectData.recentActivity || 'N/A',
                        dateCreated: projectData.dateCreated || 'N/A',
                        comments: projectData.comments || 'No new tasks',
                        approval: projectData.approval || 'Pending',
                        paymentPlan: projectData.paymentPlan || 0,
                        weeksPaid: projectData.weeksPaid || 0,
                        dueDate: projectData.dueDate || 'No deadline',
                        status: projectData.status || 1,
                    });
                });

                setProjects(projectsList);
            } catch (error) {
                console.error("Error fetching projects:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchProjects();
    }, [auth, router]);

    return (
        <div className="flex flex-col xl:flex-row h-screen DashboardBackgroundGradient overflow-hidden">
            <CreateProjectPopup closeCreatProjectPopup={toggleCreateProjectPopup} isVisible={isCreateProjectPopupOpen} />

            {/* Left Sidebar */}
            <DashboardClientSideNav highlight="projects" />

            {/* Right Side (Main Content) */}
            <div className="flex-1 flex flex-col pt-[60px] xl:pt-0 min-h-0 overflow-hidden">
                <div className="absolute BottomGradientBorder left-0 top-[103px] w-full" />
                <div className="flex min-w-min items-center justify-between px-[20px] sm:px-[50px] py-6 flex-shrink-0">
                    <div className="inline-flex items-center gap-[5px]">
                        <div className="inline-flex items-center gap-[5px] opacity-40">
                            <div className="w-[15px]">
                                <Image
                                    src="/Home Icon.png"
                                    alt="Home Icon"
                                    layout="responsive"
                                    width={0}
                                    height={0}
                                />
                            </div>
                            <div className="font-light text-sm">
                                Home
                            </div>
                        </div>
                        <div className="inline-flex items-center gap-[5px]">
                            <div className=" font-light text-sm">
                                / Projects
                            </div>
                        </div>
                    </div>
                    <div className="inline-flex items-center gap-3">
                        <NotificationBell />
                        <Link
                            href="/dashboard/settings"
                            className="hidden sm:flex w-[129px] h-[55px] items-center justify-center gap-2.5 px-0 py-[15px] rounded-[15px] BlackGradient ContentCardShadow">
                            <div className=" font-light text-sm">
                                Settings
                            </div>
                            <div className=" w-[30px]">
                                <Image
                                    src="/Settings Icon.png"
                                    alt="Settings Icon"
                                    layout="responsive"
                                    width={0}
                                    height={0}
                                />
                            </div>
                        </Link>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto px-[20px] sm:px-[50px] pt-[30px] pb-[40px]">

                    {/* Page Header */}
                    <div className="flex flex-col gap-[4px] mb-[28px]">
                        <h1 className="font-semibold text-[26px]">Projects</h1>
                        <p className="font-normal text-[#ffffff99] text-sm">View and manage your projects.</p>
                    </div>

                    {/* Toolbar */}
                    <div className="flex items-center justify-between mb-[24px]">
                        <div className="flex items-center gap-[24px]">
                            <button className="font-normal text-base border-b-2 border-[#725CF7] pb-[2px]">Current</button>
                            <button className="font-normal text-[#ffffff66] text-base hover:text-white">Past</button>
                        </div>
                        <button
                            onClick={toggleCreateProjectPopup}
                            className="flex items-center gap-[8px] px-[16px] h-[41px] rounded-[10px] ContentCardShadow AddProjectGradient"
                        >
                            <div className="w-[14px] flex-shrink-0">
                                <Image src="/Plus Icon.png" alt="Plus Icon" layout="responsive" width={0} height={0} />
                            </div>
                            <span className="font-normal text-[14px]">Add project</span>
                        </button>
                    </div>

                    {/* Project List */}
                    {loading ? (
                        <div className="py-[34px] opacity-60 text-sm">Loading projects...</div>
                    ) : projects.length > 0 ? (
                        <>
                            {/* Desktop table header */}
                            <div className="hidden lg:grid grid-cols-[auto_1fr_1fr_auto_auto_auto_auto] gap-x-[16px] items-center px-[20px] mb-[10px] text-[#ffffff66] text-[12px] font-normal">
                                <div className="w-[40px]" />
                                <div>Name</div>
                                <div>Recent Activity</div>
                                <div className="w-[120px]">Status</div>
                                <div className="w-[110px]">Progress</div>
                                <div className="w-[100px]">Payment</div>
                                <div className="w-[110px]">Deadline</div>
                            </div>

                            <div className="flex flex-col gap-[12px]">
                                {projects.map((project, index) => (
                                    <div
                                        key={index}
                                        className={`${project.approval === "Pending" ? "TransparentBlackWithLightGradient" : "BlackWithLightGradient"} relative rounded-[12px] ContentCardShadow overflow-hidden`}
                                    >
                                        {/* Pending overlay */}
                                        {project.approval === "Pending" && (
                                            <div className="absolute inset-0 z-10 flex items-center justify-center gap-[16px]">
                                                <div className="flex justify-center items-center rounded-full PendingGradient">
                                                    <div className="text-[13px] font-semibold px-[14px] py-[6px]">Pending Approval</div>
                                                </div>
                                                <button
                                                    onClick={() => handleDeleteProject(project.uid)}
                                                    className="flex justify-center items-center rounded-full bg-[#1A1A1A] hover:bg-[#F13F5E] ContentCardShadow transition-colors"
                                                >
                                                    <div className="text-[13px] font-light px-[18px] py-[6px]">Cancel Project</div>
                                                </button>
                                            </div>
                                        )}

                                        {/* View overlay (approved) */}
                                        {project.approval === "Approved" && user && (
                                            <Link
                                                href={`/dashboard/projects/${project.uid}?projectId=${project.uid}&userId=${user.uid}`}
                                                className="ClientProjectHover absolute inset-0 z-10 flex items-center justify-center hover:bg-black/60 rounded-[12px] transition-colors"
                                            >
                                                <div className="ClientProject opacity-0 rounded-full BlackWithLightGradient ContentCardShadow flex items-center gap-[8px]">
                                                    <h3 className="pl-[18px] text-[14px] font-light">View Project</h3>
                                                    <div className="PopupAttentionGradient PopupAttentionShadow p-[10px] rounded-full">
                                                        <div className="w-[15px] rotate-[135deg]">
                                                            <Image src="/Left White Arrow.png" alt="Arrow" layout="responsive" width={0} height={0} />
                                                        </div>
                                                    </div>
                                                </div>
                                            </Link>
                                        )}

                                        <div className={`${project.approval === "Pending" ? "opacity-50" : ""} px-[20px] py-[18px]`}>

                                            {/* Mobile layout */}
                                            <div className="flex lg:hidden flex-col gap-[12px]">
                                                <div className="flex items-center gap-[12px]">
                                                    <div className="w-[36px] h-[36px] flex-shrink-0">
                                                        <Image
                                                            src={project.logoAttachment ?? "/Lucidify Umbrella.png"}
                                                            alt="Project Logo"
                                                            layout="responsive"
                                                            width={0}
                                                            height={0}
                                                        />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="font-medium text-[14px] truncate">{project.projectName}</p>
                                                        <p className="text-[11px] opacity-40 font-light">Created {project.dateCreated}</p>
                                                    </div>
                                                    {/* Status badge */}
                                                    <StatusBadge status={project.status} />
                                                </div>
                                                <div className="flex items-center gap-[10px]">
                                                    <div className="flex-1 h-[6px] rounded-full bg-[#333741]">
                                                        <div className="h-full rounded-full bg-[#5840F0]" style={{ width: `${project.progress}%` }} />
                                                    </div>
                                                    <span className="text-[11px] opacity-50 font-light flex-shrink-0">{project.progress}%</span>
                                                </div>
                                                <div className="flex items-center justify-between text-[12px] opacity-50 font-light">
                                                    <span>{project.recentActivity}</span>
                                                    <span>Due {project.dueDate}</span>
                                                </div>
                                            </div>

                                            {/* Desktop layout */}
                                            <div className="hidden lg:grid grid-cols-[auto_1fr_1fr_auto_auto_auto_auto] gap-x-[16px] items-center">
                                                {/* Logo */}
                                                <div className="w-[40px] h-[40px] flex-shrink-0">
                                                    <Image
                                                        src={project.logoAttachment ?? "/Lucidify Umbrella.png"}
                                                        alt="Project Logo"
                                                        layout="responsive"
                                                        width={0}
                                                        height={0}
                                                    />
                                                </div>
                                                {/* Name */}
                                                <div className="min-w-0">
                                                    <p className="font-normal text-[13px] truncate">{project.projectName}</p>
                                                    <div className="flex items-center gap-[4px] opacity-40 font-light mt-[2px]">
                                                        <div className="w-[10px]">
                                                            <Image src="/Calendar Icon.png" alt="Calendar" layout="responsive" width={0} height={0} />
                                                        </div>
                                                        <p className="text-[11px]">Created {project.dateCreated}</p>
                                                    </div>
                                                </div>
                                                {/* Recent Activity */}
                                                <div className="text-[13px] font-light opacity-70 truncate">{project.recentActivity}</div>
                                                {/* Status */}
                                                <div className="w-[120px]">
                                                    <StatusBadge status={project.status} />
                                                </div>
                                                {/* Progress */}
                                                <div className="w-[110px] flex items-center gap-[8px]">
                                                    <div className="flex-1 h-[6px] rounded-full bg-[#333741]">
                                                        <div className="h-full rounded-full bg-[#5840F0]" style={{ width: `${project.progress}%` }} />
                                                    </div>
                                                    <span className="text-[11px] opacity-50 font-light w-[28px] text-right">{project.progress}%</span>
                                                </div>
                                                {/* Payment */}
                                                <div className="w-[100px]">
                                                    <PaymentDots plan={project.paymentPlan} paid={project.weeksPaid} />
                                                </div>
                                                {/* Deadline */}
                                                <div className="w-[110px] text-[13px] font-light opacity-70 text-right">{project.dueDate}</div>
                                            </div>

                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                    ) : null}

                    {/* Add New Project Button */}
                    <div
                        className="flex w-full h-[80px] items-center justify-center gap-[10px] mt-[16px] rounded-[12px] ContentCardShadow AddANewProjectGradient hover:cursor-pointer"
                        onClick={toggleCreateProjectPopup}
                    >
                        <div className="flex gap-[8px] items-center opacity-60">
                            <span className="font-light text-[14px]">Add a New Project</span>
                            <div className="w-[14px]">
                                <Image src="/Plus Icon.png" alt="Plus Icon" layout="responsive" width={0} height={0} />
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default DASHBOARDClientProjects;
