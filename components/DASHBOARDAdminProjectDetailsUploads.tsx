"use client";

import { useEffect, useState } from 'react';
import { collection, doc, getDoc, getDocs } from 'firebase/firestore';
import { writeNotification } from '../utils/notifications';
import { db } from '../firebaseConfig';
import Link from 'next/link';
import Image from 'next/image';
import DashboardAdminSideNav from '@/components/DashboardAdminSideNav';
import CreateWebDesignPopup from './CreateWebDesignPopup';
import NotificationBell from '@/components/NotificationBell';

interface DASHBOARDAdminProjectDetailsUploadsProps {
    userId: string;
    projectId: string;
}

interface Design {
    designName: string;
    designDescription: string;
    designURL: string;
    designPage: 'Sections' | 'Full-Page';
    designType: string;
    dateCreated: string;
    selectedDesign?: boolean;
}

const DASHBOARDAdminProjectDetailsUploads = ({ userId, projectId }: DASHBOARDAdminProjectDetailsUploadsProps) => {
    const [projectName, setProjectName] = useState<string>('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedTab, setSelectedTab] = useState<'Sections' | 'Full-Page'>('Sections');
    const [sectionDesigns, setSectionDesigns] = useState<Design[]>([]);
    const [fullPageDesigns, setFullPageDesigns] = useState<Design[]>([]);
    const [isPopupOpen, setIsPopupOpen] = useState(false);
    const [lightboxURL, setLightboxURL] = useState<string | null>(null);

    useEffect(() => {
        const fetchAll = async () => {
            if (!userId || !projectId) return;
            try {
                const basePath = `users/${userId}/projects/${projectId}`;

                // Project name
                const projectDoc = await getDoc(doc(db, 'users', userId, 'projects', projectId));
                if (projectDoc.exists()) setProjectName(projectDoc.data().projectName || '');
                else { setError('Project not found.'); return; }

                // Section designs
                try {
                    const snap = await getDocs(collection(db, `${basePath}/section web designs`));
                    setSectionDesigns(snap.docs.map(d => d.data() as Design));
                } catch { setSectionDesigns([]); }

                // Full-page designs
                try {
                    const snap = await getDocs(collection(db, `${basePath}/full-page web designs`));
                    setFullPageDesigns(snap.docs.map(d => d.data() as Design));
                } catch { setFullPageDesigns([]); }

            } catch (err) {
                console.error(err);
                setError('Failed to load project.');
            } finally {
                setLoading(false);
            }
        };
        fetchAll();
    }, [userId, projectId, isPopupOpen]); // refetch after popup closes (new upload)

    const displayedDesigns = selectedTab === 'Sections' ? sectionDesigns : fullPageDesigns;

    if (loading) {
        return (
            <div className="flex flex-col xl:flex-row h-screen DashboardBackgroundGradient overflow-hidden">
                <DashboardAdminSideNav highlight="projects" />
                <div className="flex-1 flex items-center justify-center pt-[60px] xl:pt-0">
                    <p className="opacity-40 font-light text-[14px]">Loading uploads...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col xl:flex-row h-screen DashboardBackgroundGradient overflow-hidden">
                <DashboardAdminSideNav highlight="projects" />
                <div className="flex-1 flex items-center justify-center pt-[60px] xl:pt-0">
                    <p className="text-red-400 text-[14px]">{error}</p>
                </div>
            </div>
        );
    }

    return (
        <>
            <CreateWebDesignPopup
                closeCreatProjectPopup={() => setIsPopupOpen(false)}
                isVisible={isPopupOpen}
                userId={userId}
                projectId={projectId}
                onDesignAdded={() => writeNotification(
                    userId,
                    'New design uploaded',
                    `A new design was added to ${projectName || 'your project'}.`,
                    'upload',
                    projectId,
                    `/dashboard/projects/${projectId}/uploads?projectId=${projectId}&userId=${userId}`,
                )}
            />

            {/* Lightbox */}
            {lightboxURL && (
                <div
                    className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center p-[20px]"
                    onClick={() => setLightboxURL(null)}
                >
                    <div className="relative max-w-[90vw] max-h-[90vh]" onClick={e => e.stopPropagation()}>
                        <img src={lightboxURL} alt="Design preview" className="max-w-full max-h-[85vh] rounded-[16px] object-contain" />
                        <button
                            onClick={() => setLightboxURL(null)}
                            className="absolute -top-[14px] -right-[14px] w-[32px] h-[32px] rounded-full BlackGradient ContentCardShadow flex items-center justify-center text-[16px] opacity-70 hover:opacity-100"
                        >✕</button>
                    </div>
                </div>
            )}

            <div className="flex flex-col xl:flex-row h-screen DashboardBackgroundGradient overflow-hidden">
                <DashboardAdminSideNav highlight="projects" />

                <div className="flex-1 flex flex-col pt-[60px] xl:pt-0 min-h-0 overflow-hidden">
                    <div className="absolute BottomGradientBorder left-0 top-[103px] w-full" />

                    {/* Top Bar */}
                    <div className="flex items-center justify-between px-[20px] sm:px-[50px] py-6 flex-shrink-0">
                        <div className="inline-flex items-center gap-[5px]">
                            <div className="inline-flex items-center gap-[5px] opacity-40">
                                <div className="w-[15px]">
                                    <Image src="/Home Icon.png" alt="Home" layout="responsive" width={0} height={0} />
                                </div>
                                <div className="font-light text-sm hidden sm:block">Admin</div>
                            </div>
                            <div className="font-light text-sm hidden sm:block">/ Projects</div>
                            <div className="font-light text-sm truncate max-w-[140px] sm:max-w-none">/ {projectName}</div>
                        </div>
                        <div className="inline-flex items-center gap-3">
                            <NotificationBell />
                            <Link href="/dashboard/settings" className="hidden sm:flex w-[129px] h-[55px] items-center justify-center gap-2.5 rounded-[15px] BlackGradient ContentCardShadow">
                                <div className="font-light text-sm">Settings</div>
                                <div className="w-[30px]">
                                    <Image src="/Settings Icon.png" alt="Settings" layout="responsive" width={0} height={0} />
                                </div>
                            </Link>
                        </div>
                    </div>

                    {/* Scrollable Content */}
                    <div className="flex-1 overflow-y-auto px-[20px] sm:px-[50px] pt-[30px] pb-[40px]">

                        {/* Tab Nav */}
                        <div className="flex items-center gap-[20px] sm:gap-[30px] mb-[30px] overflow-x-auto pb-[4px]">
                            <Link href={`/dashboard/projects/${projectId}?projectId=${projectId}&userId=${userId}`}
                                className="font-normal text-[#ffffff66] text-sm sm:text-base whitespace-nowrap hover:text-white">Overview</Link>
                            <Link href={`/dashboard/projects/${projectId}/progress?projectId=${projectId}&userId=${userId}`}
                                className="font-normal text-[#ffffff66] text-sm sm:text-base whitespace-nowrap hover:text-white">Progress</Link>
                            <Link href={`/dashboard/projects/${projectId}/uploads?projectId=${projectId}&userId=${userId}`}
                                className="font-normal text-base whitespace-nowrap border-b-2 border-[#725CF7] pb-[2px]">Uploads</Link>
                            <div className="font-normal text-[#ffffff66] text-sm sm:text-base whitespace-nowrap opacity-40 cursor-not-allowed">Analytics</div>
                        </div>

                        {/* Header row */}
                        <div className="flex items-center justify-between mb-[24px]">
                            <div>
                                <h1 className="text-[22px] sm:text-[26px] font-semibold">Design Uploads</h1>
                                <p className="text-[13px] opacity-50 mt-[4px]">
                                    {sectionDesigns.length + fullPageDesigns.length} design{sectionDesigns.length + fullPageDesigns.length !== 1 ? 's' : ''} uploaded for this project
                                </p>
                            </div>
                            <button
                                onClick={() => setIsPopupOpen(true)}
                                className="flex items-center gap-[8px] PopupAttentionGradient PopupAttentionShadow px-[16px] sm:px-[20px] py-[10px] rounded-[12px] text-[13px] font-medium"
                            >
                                <span className="text-[16px] leading-none">+</span>
                                <span className="hidden sm:inline">Add Design</span>
                            </button>
                        </div>

                        {/* Type tabs */}
                        <div className="flex items-center gap-[8px] mb-[24px]">
                            {(['Sections', 'Full-Page'] as const).map(tab => (
                                <button
                                    key={tab}
                                    onClick={() => setSelectedTab(tab)}
                                    className={`flex items-center gap-[8px] px-[16px] py-[8px] rounded-[10px] text-[13px] font-medium transition-all
                                        ${selectedTab === tab ? 'PopupAttentionGradient PopupAttentionShadow' : 'BlackWithLightGradient ContentCardShadow opacity-60 hover:opacity-90'}
                                    `}
                                >
                                    {tab}
                                    <span className={`text-[11px] px-[7px] py-[1px] rounded-full ${selectedTab === tab ? 'bg-white/20' : 'bg-white/10'}`}>
                                        {tab === 'Sections' ? sectionDesigns.length : fullPageDesigns.length}
                                    </span>
                                </button>
                            ))}
                        </div>

                        {/* Design Grid */}
                        {displayedDesigns.length === 0 ? (
                            <div className="BlackGradient ContentCardShadow rounded-[24px] flex flex-col items-center justify-center py-[60px] gap-[16px]">
                                <div className="text-[40px] opacity-20">🖼️</div>
                                <p className="text-[15px] font-light opacity-40">No {selectedTab} designs uploaded yet</p>
                                <button
                                    onClick={() => setIsPopupOpen(true)}
                                    className="PopupAttentionGradient PopupAttentionShadow px-[20px] py-[10px] rounded-[12px] text-[13px] font-medium mt-[4px]"
                                >
                                    Upload First Design
                                </button>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-[20px]">
                                {displayedDesigns.map((design, i) => (
                                    <div key={i} className="BlackGradient ContentCardShadow rounded-[20px] overflow-hidden flex flex-col">
                                        {/* Image */}
                                        <div
                                            className="relative w-full bg-white/5 cursor-zoom-in overflow-hidden"
                                            style={{ paddingBottom: '60%' }}
                                            onClick={() => setLightboxURL(design.designURL)}
                                        >
                                            <img
                                                src={design.designURL}
                                                alt={design.designName}
                                                className="absolute inset-0 w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                                            />
                                            {design.selectedDesign && (
                                                <div className="absolute top-[10px] left-[10px] bg-green-500/90 text-white text-[10px] font-semibold px-[10px] py-[4px] rounded-full">
                                                    ✓ Selected
                                                </div>
                                            )}
                                        </div>

                                        {/* Info */}
                                        <div className="px-[20px] py-[18px] flex flex-col gap-[10px]">
                                            <div className="flex items-start justify-between gap-[10px]">
                                                <h3 className="font-semibold text-[15px] leading-tight">{design.designName}</h3>
                                                <span className="flex-shrink-0 text-[11px] PopupAttentionGradient PopupAttentionShadow px-[10px] py-[3px] rounded-full">
                                                    {design.designType}
                                                </span>
                                            </div>
                                            <p className="text-[12px] font-light opacity-50 leading-[1.5] line-clamp-2">{design.designDescription}</p>
                                            <div className="flex items-center gap-[6px] mt-[2px]">
                                                <span className="text-[11px] opacity-30">📅</span>
                                                <p className="text-[11px] opacity-40 font-light">Uploaded {design.dateCreated}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
};

export default DASHBOARDAdminProjectDetailsUploads;
