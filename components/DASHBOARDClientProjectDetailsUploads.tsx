"use client";

import React, { useEffect, useState } from 'react';
import { collection, doc, getDoc, getDocs } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import Link from 'next/link';
import DashboardClientSideNav from '@/components/DashboardClientSideNav';
import DashboardTopBar from './DashboardTopBar';
import { useTheme } from '@/context/themeContext';

interface DASHBOARDClientProjectDetailsUploadsProps {
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

const DASHBOARDClientProjectDetailsUploads = ({ userId, projectId }: DASHBOARDClientProjectDetailsUploadsProps) => {
    const [projectName, setProjectName] = useState<string>('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedTab, setSelectedTab] = useState<'Sections' | 'Full-Page'>('Sections');
    const [sectionDesigns, setSectionDesigns] = useState<Design[]>([]);
    const [fullPageDesigns, setFullPageDesigns] = useState<Design[]>([]);
    const [lightboxURL, setLightboxURL] = useState<string | null>(null);

    const { theme } = useTheme();
    const isDark = theme === 'dark';
    const textColor = isDark ? '#ffffff' : '#111111';
    const mutedColor = isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.45)';

    const tabBase = "px-[14px] h-[34px] rounded-[9px] text-[13px] font-medium whitespace-nowrap transition-all";
    const activeTabStyle: React.CSSProperties = {
        background: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.09)',
        color: textColor,
        boxShadow: isDark ? '0 1px 4px rgba(0,0,0,0.3)' : '0 1px 4px rgba(0,0,0,0.08)',
    };
    const inactiveTabStyle: React.CSSProperties = { background: 'transparent', color: mutedColor };
    const disabledTabStyle: React.CSSProperties = { background: 'transparent', color: mutedColor, opacity: 0.35, cursor: 'not-allowed' };
    const tabBarStyle: React.CSSProperties = {
        background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)',
        border: isDark ? '1px solid rgba(255,255,255,0.07)' : '1px solid rgba(0,0,0,0.07)',
        borderRadius: '13px', padding: '3px', display: 'inline-flex', gap: '2px',
    };

    useEffect(() => {
        const fetchAll = async () => {
            if (!userId || !projectId) return;
            try {
                const basePath = `users/${userId}/projects/${projectId}`;

                const projectDoc = await getDoc(doc(db, 'users', userId, 'projects', projectId));
                if (projectDoc.exists()) setProjectName(projectDoc.data().projectName || '');
                else { setError('Project not found.'); return; }

                try {
                    const snap = await getDocs(collection(db, `${basePath}/section web designs`));
                    setSectionDesigns(snap.docs.map(d => d.data() as Design));
                } catch { setError('Could not load section designs. Please reload to retry.'); }

                try {
                    const snap = await getDocs(collection(db, `${basePath}/full-page web designs`));
                    setFullPageDesigns(snap.docs.map(d => d.data() as Design));
                } catch { setError('Could not load full-page designs. Please reload to retry.'); }

            } catch (err) {
                console.error(err);
                setError('Failed to load project.');
            } finally {
                setLoading(false);
            }
        };
        fetchAll();
    }, [userId, projectId]);

    const displayedDesigns = selectedTab === 'Sections' ? sectionDesigns : fullPageDesigns;

    if (loading) {
        return (
            <div className="flex flex-col xl:flex-row h-screen DashboardBackgroundGradient overflow-hidden">
                <DashboardClientSideNav highlight="projects" />
                <div className="flex-1 flex items-center justify-center pt-[60px] xl:pt-0">
                    <p className="opacity-40 font-light text-[14px]">Loading designs...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col xl:flex-row h-screen DashboardBackgroundGradient overflow-hidden">
                <DashboardClientSideNav highlight="projects" />
                <div className="flex-1 flex items-center justify-center pt-[60px] xl:pt-0">
                    <p className="text-red-400 text-[14px]">{error}</p>
                </div>
            </div>
        );
    }

    return (
        <>
            {/* Lightbox */}
            {lightboxURL && (
                <div
                    className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center p-[20px]"
                    onClick={() => setLightboxURL(null)}
                >
                    <div className="relative max-w-[90vw] max-h-[90vh]" onClick={e => e.stopPropagation()}>
                        <img src={lightboxURL} alt="Design preview" className="max-w-full max-h-[85vh] rounded-[16px] object-contain" />
                        <button
                            onClick={() => setLightboxURL(null)} aria-label="Close preview"
                            className="absolute -top-[14px] -right-[14px] w-[32px] h-[32px] rounded-full BlackGradient ContentCardShadow flex items-center justify-center text-[16px] opacity-70 hover:opacity-100"
                        >✕</button>
                    </div>
                </div>
            )}

            <div className="flex flex-col xl:flex-row h-screen DashboardBackgroundGradient overflow-hidden">
                <DashboardClientSideNav highlight="projects" />

                <div className="flex-1 flex flex-col pt-[60px] xl:pt-0 min-h-0 overflow-hidden">
                    <DashboardTopBar title="Uploads" />

                    {/* Scrollable Content */}
                    <div className="flex-1 overflow-y-auto px-[20px] sm:px-[50px] pt-[30px] pb-[40px]">

                        {/* Tab Nav */}
                        <div className="mb-[28px]">
                            <div style={tabBarStyle}>
                                <Link href={`/dashboard/projects/${projectId}?projectId=${projectId}&userId=${userId}`}
                                    className={tabBase} style={inactiveTabStyle}>Overview</Link>
                                <Link href={`/dashboard/projects/${projectId}/progress?projectId=${projectId}&userId=${userId}`}
                                    className={tabBase} style={inactiveTabStyle}>Progress</Link>
                                <Link href={`/dashboard/projects/${projectId}/uploads?projectId=${projectId}&userId=${userId}`}
                                    className={tabBase} style={activeTabStyle}>Uploads</Link>
                                <button disabled className={tabBase} style={disabledTabStyle}>Analytics</button>
                            </div>
                        </div>

                        {/* Header */}
                        <div className="mb-[24px]">
                            <h1 className="text-[22px] sm:text-[26px] font-semibold">Website Designs</h1>
                            <p className="text-[13px] opacity-50 mt-[4px]">
                                {sectionDesigns.length + fullPageDesigns.length > 0
                                    ? `${sectionDesigns.length + fullPageDesigns.length} design${sectionDesigns.length + fullPageDesigns.length !== 1 ? 's' : ''} shared by Lucidify`
                                    : 'Designs will appear here once Lucidify uploads them'}
                            </p>
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
                            <div className="BlackGradient ContentCardShadow rounded-[24px] flex flex-col items-center justify-center py-[60px] gap-[12px]">
                                <div className="text-[40px] opacity-20">🖼️</div>
                                <p className="text-[15px] font-light opacity-40">No {selectedTab} designs yet</p>
                                <p className="text-[12px] opacity-30 text-center max-w-[280px]">
                                    Lucidify will upload your website designs here for you to review.
                                </p>
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
                                            <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity bg-black/40">
                                                <span className="text-[13px] font-medium bg-white/10 backdrop-blur-sm px-[14px] py-[8px] rounded-full">
                                                    Click to enlarge
                                                </span>
                                            </div>
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

export default DASHBOARDClientProjectDetailsUploads;
