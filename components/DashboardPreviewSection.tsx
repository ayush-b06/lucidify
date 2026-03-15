"use client"

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useTheme } from '@/context/themeContext';

const pills = [
    { icon: '📊', label: 'Progress Tracking' },
    { icon: '🖼️', label: 'Design Uploads' },
    { icon: '💬', label: 'Direct Messaging' },
    { icon: '💳', label: 'Payment Plans' },
];

const navItems = [
    { icon: '/Dashboard Icon.png', label: 'Dashboard', active: true },
    { icon: '/Projects Icon.png', label: 'Projects', active: false },
    { icon: '/Messages Icon.png', label: 'Messages', active: false },
    { icon: '/Transactions Icon.png', label: 'Transactions', active: false },
];

const mockProjects = [
    { name: 'E-Commerce Site', progress: 72, color: '#998BF9', statusLabel: 'Developing' },
    { name: 'Brand Refresh', progress: 45, color: '#5840F0', statusLabel: 'Designing' },
];

const DashboardPreviewSection = () => {
    const { theme } = useTheme();
    const isDark = theme === 'dark';
    const sectionRef = useRef<HTMLDivElement>(null);
    const mockupRef = useRef<HTMLDivElement>(null);
    const [progressVisible, setProgressVisible] = useState(false);
    const [tilt, setTilt] = useState({ x: 0, y: 0 });
    const [isHovering, setIsHovering] = useState(false);

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setProgressVisible(true);
                    observer.disconnect();
                }
            },
            { threshold: 0.25 }
        );
        if (sectionRef.current) observer.observe(sectionRef.current);
        return () => observer.disconnect();
    }, []);

    const handleMockupMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        const rect = mockupRef.current!.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const dx = (e.clientX - cx) / (rect.width / 2);
        const dy = (e.clientY - cy) / (rect.height / 2);
        setTilt({ x: dy * -5, y: dx * 5 });
    };

    const handleMockupMouseLeave = () => {
        setIsHovering(false);
        setTilt({ x: 0, y: 0 });
    };

    const handleMockupMouseEnter = () => setIsHovering(true);

    return (
        <section className="items-center" ref={sectionRef}>
            <div className="flex flex-col items-center mx-auto py-[80px] sm:py-[120px] px-[20px] sm:px-[40px] max-w-[1100px]">

                {/* Label pill */}
                <div className="FadeInUp flex items-center gap-[8px] border border-[#2F2F2F] rounded-full px-[16px] py-[6px] mb-[22px]">
                    <div className="w-[7px] h-[7px] rounded-full bg-[#6265F0]" />
                    <span className="text-[11px] tracking-[3px] font-medium opacity-60">CLIENT DASHBOARD</span>
                </div>

                {/* Heading */}
                <h1 className="FadeInUp1 HeadingFont text-center mb-[16px]">
                    Your project, <span className="TextGradient">always in sight</span>.
                </h1>
                <p className="FadeInUp2 TextFont text-center max-w-[520px] mb-[40px]">
                    Every Lucidify client gets their own private dashboard — track progress in real-time, review designs, manage payments, and message your team directly.
                </p>

                {/* Feature pills */}
                <div className="FadeInUp3 flex flex-wrap gap-[8px] justify-center mb-[56px]">
                    {pills.map(p => (
                        <div key={p.label} className="BlackGradient ContentCardShadow rounded-full px-[14px] py-[7px] flex items-center gap-[7px]">
                            <span className="text-[13px]">{p.icon}</span>
                            <span className="text-[12px] font-light opacity-60">{p.label}</span>
                        </div>
                    ))}
                </div>

                {/* Dashboard mockup — 3D tilt wrapper */}
                <div
                    ref={mockupRef}
                    onMouseMove={handleMockupMouseMove}
                    onMouseLeave={handleMockupMouseLeave}
                    onMouseEnter={handleMockupMouseEnter}
                    className="FadeInUp4 w-full max-w-[900px] rounded-[20px] overflow-hidden DashboardPreviewGlow"
                    style={{
                        transform: `perspective(1200px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
                        transition: isHovering ? 'transform 0.12s ease-out' : 'transform 0.5s ease-out',
                    }}
                >
                    {/* Browser chrome */}
                    <div
                        className="px-[16px] py-[11px] flex items-center gap-[8px]"
                        style={{
                            background: isDark ? '#0D0D0D' : '#F0F0F0',
                            borderBottom: isDark ? '1px solid #1C1C1C' : '1px solid #DCDCDC',
                        }}
                    >
                        <div className="w-[10px] h-[10px] rounded-full bg-[#FF5F57] flex-shrink-0" />
                        <div className="w-[10px] h-[10px] rounded-full bg-[#FEBC2E] flex-shrink-0" />
                        <div className="w-[10px] h-[10px] rounded-full bg-[#28C840] flex-shrink-0" />
                        <div className="flex-1 mx-[12px]">
                            <div
                                className="rounded-[6px] px-[12px] py-[5px] max-w-[280px] mx-auto"
                                style={{
                                    background: isDark ? '#1A1A1A' : '#ffffff',
                                    border: isDark ? 'none' : '1px solid #E0E0E0',
                                }}
                            >
                                <span className="text-[11px] font-light" style={{ color: isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.35)' }}>
                                    lucidify.vercel.app/dashboard
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Dashboard interior */}
                    <div className="DashboardBackgroundGradient flex" style={{ height: '420px' }}>

                        {/* Sidebar icon-only */}
                        {/* <div
                            className="flex-shrink-0 border-r border-white/5 py-[20px] flex flex-col"
                            style={{ width: '60px' }}
                        >
                            <div className="px-[14px] mb-[28px]">
                                <div className="w-[28px] opacity-60">
                                    <Image src="/Lucidify Umbrella.png" alt="Lucidify" layout="responsive" width={0} height={0} />
                                </div>
                            </div>
                            <div className="flex flex-col gap-[4px] px-[10px]">
                                {navItems.map(item => (
                                    <div
                                        key={item.label}
                                        className={`flex items-center justify-center w-[36px] h-[36px] rounded-[9px] ${item.active ? 'BlackWithLightGradient ContentCardShadow' : ''}`}
                                    >
                                        <div className={`w-[15px] h-[15px] ${item.active ? '' : 'opacity-30'}`}>
                                            <Image src={item.icon} alt={item.label} layout="responsive" width={0} height={0} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div> */}

                        {/* Wider sidebar sm+ */}
                        <div className="hidden sm:flex flex-col flex-shrink-0 border-r border-white/5 py-[20px] px-[20px]" style={{ width: '165px' }}>
                            <div className="w-[100px] opacity-70 mb-[40px]">
                                <Image src="/Lucidify white logo.png" alt="Lucidify" layout="responsive" width={0} height={0} />
                            </div>
                            <div className="flex flex-col gap-[6px]">
                                {navItems.map(item => (
                                    <div
                                        key={item.label}
                                        className={`flex items-center gap-[10px] px-[10px] py-[7px] rounded-[9px] ${item.active ? 'BlackWithLightGradient SpecialContentCardShadow' : ''}`}
                                    >
                                        <div className={`w-[14px] h-[14px] flex-shrink-0 ${item.active ? '' : 'opacity-35'}`}>
                                            <Image src={item.icon} alt={item.label} layout="responsive" width={0} height={0} />
                                        </div>
                                        <span className={`text-[12px] font-light ${item.active ? 'opacity-100' : 'opacity-35'}`}>{item.label}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Main content */}
                        <div className="flex-1 px-[16px] sm:px-[28px] py-[20px] overflow-hidden">
                            {/* Top bar */}
                            <div className="flex items-center justify-between mb-[20px] sm:mb-[26px]">
                                <span className="text-[13px] font-semibold opacity-50">Dashboard</span>
                                <div className="flex items-center gap-[10px]">
                                    {/* Notification badge with ping */}
                                    <div className="NotifPing w-[20px] h-[20px] rounded-full bg-[#6265F0] flex items-center justify-center">
                                        <span className="text-[9px] font-medium relative z-10">3</span>
                                    </div>
                                    <div className="hidden sm:flex w-[80px] h-[30px] BlackGradient ContentCardShadow rounded-[8px] items-center justify-center gap-[5px]">
                                        <span className="text-[10px] font-light opacity-60">Settings</span>
                                    </div>
                                </div>
                            </div>

                            {/* Welcome */}
                            <div className="mb-[20px] sm:mb-[24px]">
                                <h3 className="text-[16px] sm:text-[20px] font-semibold">Welcome back, James 👋</h3>
                                <p className="text-[11px] opacity-35 font-light mt-[3px]">Here&apos;s what&apos;s happening with your projects.</p>
                            </div>

                            {/* Project cards with animated progress bars */}
                            <div className="flex gap-[10px] sm:gap-[14px] flex-wrap mb-[18px]">
                                {mockProjects.map((p, i) => (
                                    <div key={p.name} className="BlackGradient ContentCardShadow rounded-[14px] px-[14px] sm:px-[18px] py-[12px] sm:py-[14px] flex-1 min-w-[120px]">
                                        <p className="text-[11px] sm:text-[13px] font-semibold mb-[8px] truncate">{p.name}</p>
                                        <div className="w-full h-[4px] bg-white/10 rounded-full mb-[6px]">
                                            <div
                                                className="h-full rounded-full"
                                                style={{
                                                    width: progressVisible ? `${p.progress}%` : '0%',
                                                    backgroundColor: p.color,
                                                    transition: 'width 1.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                                    transitionDelay: progressVisible ? `${0.3 + i * 0.15}s` : '0s',
                                                }}
                                            />
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-[10px] opacity-35 font-light">{p.statusLabel}</span>
                                            <span className="text-[10px] opacity-50 font-light">{p.progress}%</span>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Stats row */}
                            <div className="flex gap-[10px]">
                                {[
                                    { label: 'Messages', value: '2 new' },
                                    { label: 'Next Payment', value: 'Due in 3d' },
                                ].map(s => (
                                    <div key={s.label} className="BlackGradient ContentCardShadow rounded-[12px] px-[12px] sm:px-[16px] py-[10px] flex-1">
                                        <p className="text-[9px] sm:text-[10px] opacity-30 font-light mb-[2px]">{s.label}</p>
                                        <p className="text-[11px] sm:text-[13px] font-semibold">{s.value}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* CTA */}
                <div className="FadeInUp5 flex items-center gap-[16px] mt-[36px]">
                    <Link href="/login" className="TextGradient text-[14px] font-medium hover:opacity-75">
                        Access your dashboard →
                    </Link>
                    <span className="opacity-20">|</span>
                    <span className="text-[13px] opacity-35 font-light">Available to all Lucidify clients</span>
                </div>
            </div>
        </section>
    );
};

export default DashboardPreviewSection;
