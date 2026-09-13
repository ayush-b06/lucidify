"use client";

import { auth, db } from '@/firebaseConfig';
import { collection, doc, onSnapshot } from 'firebase/firestore';
import { useUnreadMessages } from '@/hooks/useUnreadMessages';
import Image from 'next/image';
import Link from 'next/link';
import React, { useEffect, useState } from 'react';
import NotificationBell from './NotificationBell';
import { useTheme } from '@/context/themeContext';

type DashboardClientSideNavProps = {
    highlight: "getStarted" | "dashboard" | "projects" | "messages" | "transactions" | "none";
}

const DashboardClientSideNav: React.FC<DashboardClientSideNavProps> = ({ highlight }) => {
    const { theme } = useTheme();
    const isLight = theme === 'light';
    const totalUnread = useUnreadMessages();

    const [isOpen, setIsOpen] = useState(false);
    const [userData, setUserData] = useState<{
        selectedAvatar: string | null;
        companyName: string | null;
        firstName: string | null;
        lastName: string | null;
        setupComplete: boolean;
    }>({
        selectedAvatar: null,
        companyName: null,
        firstName: null,
        lastName: null,
        setupComplete: false,
    });

    useEffect(() => {
        const currentUser = auth.currentUser;
        if (!currentUser) return;
        const userRef = doc(db, "users", currentUser.uid);
        const unsub = onSnapshot(userRef, (snap) => {
            if (snap.exists()) {
                const data = snap.data();
                setUserData({
                    selectedAvatar: data?.selectedAvatar || null,
                    companyName: data?.companyName || null,
                    firstName: data?.firstName || null,
                    lastName: data?.lastName || null,
                    setupComplete: data?.setUp || false,
                });
            }
        });
        return () => unsub();
    }, []);

    const { selectedAvatar, companyName, firstName, lastName } = userData;

    const navLinks = [
        { href: "/dashboard", label: "Dashboard", icon: isLight ? "/Black Dashboard Icon.png" : "/Dashboard Icon.png", key: "dashboard" },
        { href: "/dashboard/projects", label: "Projects", icon: isLight ? "/Black Projects Icon.png" : "/Projects Icon.png", key: "projects" },
        { href: "/dashboard/messages", label: "Messages", icon: isLight ? "/Black Messages Icon.png" : "/Messages Icon.png", key: "messages" },
        { href: "/dashboard/transactions", label: "Transactions", icon: isLight ? "/Black Transactions Icon.png" : "/Transactions Icon.png", key: "transactions" },
    ];

    return (
        <>
            {/* Mobile Top Bar */}
            <div className="xl:hidden fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-[20px] h-[60px] DashboardMobileHeader" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                <Link href="/dashboard/" className="relative w-[110px]">
                    <Image src={isLight ? "/Lucidify black logo.png" : "/Lucidify white logo.png"} alt="Lucidify Logo" width={64} height={64} style={{ width: "100%", height: "auto" }} sizes="150px" />
                </Link>
                <div className="flex items-center gap-[10px]">
                    <NotificationBell />
                    <button
                        onClick={() => setIsOpen(true)}
                        className="flex flex-col justify-center items-center gap-[5px] w-[40px] h-[40px] rounded-[10px] BlackWithLightGradient ContentCardShadow"
                        aria-label="Open menu"
                    >
                        <span className="block w-[18px] h-[2px] bg-current rounded-full" />
                        <span className="block w-[18px] h-[2px] bg-current rounded-full" />
                        <span className="block w-[12px] h-[2px] bg-current rounded-full ml-[3px]" />
                    </button>
                </div>
            </div>

            {/* Mobile Drawer Overlay */}
            {isOpen && (
                <div
                    className="xl:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
                    onClick={() => setIsOpen(false)}
                />
            )}

            {/* Mobile Drawer */}
            <div className={`xl:hidden fixed top-0 left-0 z-50 h-full w-[280px] DashboardBackgroundGradient RightGradientBorder px-[25px] py-[25px] flex flex-col justify-between transition-transform duration-300 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                <div className="flex flex-col">
                    <div className="flex items-center justify-between mb-[40px]">
                        <Link href="/dashboard/" className="relative w-[120px]" onClick={() => setIsOpen(false)}>
                            <Image src={isLight ? "/Lucidify black logo.png" : "/Lucidify white logo.png"} alt="Lucidify Logo" width={64} height={64} style={{ width: "100%", height: "auto" }} sizes="150px" />
                        </Link>
                        <button onClick={() => setIsOpen(false)} className="opacity-60 hover:opacity-100 text-[22px] leading-none">✕</button>
                    </div>

                    <div className="opacity-60 tracking-[1px] font-extralight text-[12px] mb-[10px]">MENU</div>
                    <div className="flex flex-col gap-[6px]">
                        {navLinks.map((link) => (
                            <Link key={link.key} href={link.href} onClick={() => setIsOpen(false)}
                                className={`${highlight === link.key ? "BlackWithLightGradient ContentCardShadow" : ""} flex items-center rounded-[10px]`}>
                                <div className="flex mx-[20px] my-[9px] items-center justify-between w-full">
                                    <div className={`${highlight === link.key ? "opacity-100" : "opacity-50"} flex items-center`}>
                                        <div className="relative w-[16px] h-[16px] mr-[15px]">
                                            <Image src={link.icon} alt={link.label} width={64} height={64} style={{ width: "100%", height: "auto" }} sizes="150px" />
                                        </div>
                                        <h3 className="text-[15px] font-light">{link.label}</h3>
                                    </div>
                                    {link.key === "messages" && totalUnread > 0 && (
                                        <div className="PopupAttentionGradient PopupAttentionShadow rounded-[7px] flex justify-center items-center min-w-[20px] min-h-[20px]">
                                            <h3 className="mx-[8px] text-[11px]">{totalUnread}</h3>
                                        </div>
                                    )}
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>

                <Link href="/dashboard/profile" onClick={() => setIsOpen(false)}
                    className="rounded-[10px] flex items-center BlackWithLightGradient ContentCardShadow active:scale-95">
                    <div className="flex w-full items-center justify-between mx-[20px] my-[14px]">
                        <div className="flex items-center gap-[12px]">
                            <div className="relative w-[35px] rounded-full overflow-hidden flex-shrink-0">
                                <Image
                                    src={selectedAvatar ? `/${selectedAvatar}` : auth.currentUser?.photoURL || "/Lucidify Umbrella.png"}
                                    alt="User Profile" width={64} height={64} style={{ width: "100%", height: "auto" }} sizes="150px"
                                />
                            </div>
                            <div className="flex flex-col gap-[2px]">
                                <div className="text-[14px]">{firstName} {lastName || "User"}</div>
                                <div className="text-[#ffffff66] text-[12px]">{companyName || "Lucidify"}</div>
                            </div>
                        </div>
                        <div className="relative w-[12px]">
                            <Image src="/White Right Arrow.png" className="DashboardMonochromeIcon" alt="Right Arrow" width={64} height={64} style={{ width: "100%", height: "auto" }} sizes="150px" />
                        </div>
                    </div>
                </Link>
            </div>

            {/* Desktop Sidebar */}
            <nav className="min-h-screen box-border rounded-r-[35px] DashboardBackgroundGradient RightGradientBorder DashboardSideNav px-[30px] py-[30px] hidden xl:block lg:w-[18%] flex-shrink-0">
                <div className="flex flex-col justify-between h-full">
                    <div className="flex flex-col items-center">
                        <Link href="/dashboard/" className="relative w-[150px]">
                            <Image src={isLight ? "/Lucidify black logo.png" : "/Lucidify white logo.png"} alt="Lucidify Logo" width={64} height={64} style={{ width: "100%", height: "auto" }} sizes="150px" />
                        </Link>

                        <div className="flex flex-col mt-[40px] w-full">
                            <Link href="/dashboard/projects" className="flex items-center rounded-[10px] mt-[20px] mb-[28px] SearchBackground ContentCardShadow">
                                <div className="flex mx-[20px] my-[9px] items-center">
                                    <div className="relative w-[16px] h-[16px] mr-[8px]">
                                        <Image src="/Search Icon.png" className="DashboardMonochromeIcon" alt="Search Icon" width={64} height={64} style={{ width: "100%", height: "auto" }} sizes="150px" />
                                    </div>
                                    <h3 className="text-[15px] font-light opacity-70">Find a project</h3>
                                </div>
                            </Link>

                            <div className="flex flex-col gap-[10px]">
                                <div className="opacity-60 tracking-[1px] font-extralight text-[14px]">MENU</div>
                                <div className="flex flex-col gap-[10px]">
                                    {navLinks.map((link) => (
                                        <Link key={link.key} href={link.href}
                                            className={`${highlight === link.key ? "BlackWithLightGradient ContentCardShadow" : ""} flex items-center rounded-[10px]`}>
                                            <div className="flex mx-[20px] my-[9px] items-center justify-between w-full">
                                                <div className={`${highlight === link.key ? "opacity-100" : "opacity-50"} flex items-center`}>
                                                    <div className="relative w-[16px] h-[16px] mr-[15px]">
                                                        <Image src={link.icon} alt={link.label} width={64} height={64} style={{ width: "100%", height: "auto" }} sizes="150px" />
                                                    </div>
                                                    <h3 className="text-[15px] font-light">{link.label}</h3>
                                                </div>
                                                {link.key === "messages" && totalUnread > 0 && (
                                                    <div className="PopupAttentionGradient PopupAttentionShadow rounded-[7px] flex justify-center items-center min-w-[20px] min-h-[20px]">
                                                        <h3 className="mx-[8px] text-[11px]">{totalUnread}</h3>
                                                    </div>
                                                )}
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    <Link href="/dashboard/profile"
                        className="rounded-[10px] flex items-center justify-around relative bg-white w-full BlackWithLightGradient ContentCardShadow active:scale-95">
                        <div className="flex w-full items-center justify-between relative mx-[20px] my-[14px]">
                            <div className="flex items-center gap-[15px] relative">
                                <div className="relative w-[35px] rounded-full overflow-hidden">
                                    <Image
                                        src={selectedAvatar ? `/${selectedAvatar}` : "/Lucidify Umbrella.png"}
                                        alt="User Profile" width={64} height={64} style={{ width: "100%", height: "auto" }} sizes="150px"
                                    />
                                </div>
                                <div className="flex flex-col gap-[2px]">
                                    <div className="text-[14px]">{firstName ? `${firstName}${lastName ? ` ${lastName}` : ""}` : "User Name"}</div>
                                    <div className="text-[#ffffff66] text-[12px]">{companyName || "Lucidify Member"}</div>
                                </div>
                            </div>
                            <div className="relative w-[12px]">
                                <Image src="/White Right Arrow.png" className="DashboardMonochromeIcon" alt="Right Arrow" width={64} height={64} style={{ width: "100%", height: "auto" }} sizes="150px" />
                            </div>
                        </div>
                    </Link>
                </div>
            </nav>
        </>
    );
};

export default DashboardClientSideNav;
