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

const navItemsDark = [
    { icon: '/Dashboard Icon.png', label: 'Dashboard', active: true },
    { icon: '/Projects Icon.png', label: 'Projects', active: false },
    { icon: '/Messages Icon.png', label: 'Messages', active: false },
    { icon: '/Transactions Icon.png', label: 'Transactions', active: false },
];
const navItemsLight = [
    { icon: '/Black Dashboard Icon.png', label: 'Dashboard', active: true },
    { icon: '/Black Projects Icon.png', label: 'Projects', active: false },
    { icon: '/Black Messages Icon.png', label: 'Messages', active: false },
    { icon: '/Black Transactions Icon.png', label: 'Transactions', active: false },
];

const mockProject = { name: 'E-Commerce Site', progress: 72, status: 'Developing', due: 'Apr 15, 2026', activity: 'Homepage design approved ✓' };
const mockStats = [
    { label: 'Total Projects', value: '2', icon: '📁', color: '#725CF7' },
    { label: 'Active', value: '1', icon: '✅', color: '#22c55e' },
    { label: 'Pending', value: '1', icon: '⏳', color: '#f59e0b' },
];
const mockQuickLinks = [
    { label: 'My Projects', icon: '📋' },
    { label: 'Messages', icon: '💬' },
    { label: 'Settings', icon: '⚙️' },
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
                        className="px-[16px] py-[7px] flex items-center gap-[8px]"
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
                    <div className="DashboardBackgroundGradient flex" style={{ height: '440px' }}>

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
                        <div
                            className="hidden sm:flex flex-col flex-shrink-0 py-[20px] px-[20px]"
                            style={{ width: '165px', borderRight: isDark ? '1px solid rgba(255,255,255,0.05)' : '1px solid rgba(0,0,0,0.07)' }}
                        >
                            <div className="w-[100px] mb-[40px]" style={{ opacity: isDark ? 0.7 : 1 }}>
                                <Image src={isDark ? '/Lucidify white logo.png' : '/Lucidify black logo.png'} alt="Lucidify" layout="responsive" width={0} height={0} />
                            </div>
                            <div className="flex flex-col gap-[6px]">
                                {(isDark ? navItemsDark : navItemsLight).map(item => (
                                    <div
                                        key={item.label}
                                        className={`flex items-center gap-[10px] px-[10px] py-[7px] rounded-[9px] ${item.active ? (isDark ? 'BlackWithLightGradient SpecialContentCardShadow' : '') : ''}`}
                                        style={item.active && !isDark ? { background: '#ffffff', boxShadow: '0 1px 6px rgba(0,0,0,0.10)' } : {}}
                                    >
                                        <div className={`w-[14px] h-[14px] flex-shrink-0 ${item.active ? '' : 'opacity-35'}`}>
                                            <Image src={item.icon} alt={item.label} layout="responsive" width={0} height={0} />
                                        </div>
                                        <span
                                            className={`text-[12px] font-light ${item.active ? 'opacity-100' : 'opacity-35'}`}
                                            style={{ color: isDark ? '#ffffff' : '#111111' }}
                                        >{item.label}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Main content */}
                        <div className="flex-1 px-[14px] sm:px-[22px] py-[16px] overflow-hidden flex flex-col gap-[10px]">

                            {/* Welcome card */}
                            <div
                                className="rounded-[14px] px-[16px] sm:px-[20px] py-[12px] sm:py-[14px] flex-shrink-0"
                                style={{
                                    background: isDark
                                        ? 'linear-gradient(135deg, rgba(98,101,240,0.25) 0%, rgba(114,92,247,0.15) 100%)'
                                        : 'linear-gradient(135deg, rgba(98,101,240,0.12) 0%, rgba(114,92,247,0.08) 100%)',
                                    border: isDark ? '1px solid rgba(114,92,247,0.2)' : '1px solid rgba(114,92,247,0.15)',
                                }}
                            >
                                <p className="text-[13px] sm:text-[15px] font-semibold" style={{ color: isDark ? '#ffffff' : '#111111' }}>Welcome back, James 👋</p>
                                <p className="text-[10px] sm:text-[11px] font-light mt-[2px]" style={{ color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)' }}>Sunday, Mar 15</p>
                            </div>

                            {/* Stat chips */}
                            <div className="grid grid-cols-3 gap-[6px] flex-shrink-0">
                                {mockStats.map(s => (
                                    <div
                                        key={s.label}
                                        className="rounded-[10px] px-[10px] py-[8px]"
                                        style={{
                                            background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
                                            border: isDark ? '1px solid rgba(255,255,255,0.07)' : '1px solid rgba(0,0,0,0.07)',
                                        }}
                                    >
                                        <div className="flex items-center justify-between mb-[4px]">
                                            <p className="text-[8px] sm:text-[9px] font-light" style={{ color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)' }}>{s.label}</p>
                                            <span className="text-[10px]">{s.icon}</span>
                                        </div>
                                        <p className="text-[16px] sm:text-[20px] font-semibold" style={{ color: s.color }}>{s.value}</p>
                                    </div>
                                ))}
                            </div>

                            {/* Active project card */}
                            <div
                                className="rounded-[12px] px-[14px] sm:px-[16px] py-[12px] flex-shrink-0"
                                style={{
                                    background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
                                    border: isDark ? '1px solid rgba(255,255,255,0.07)' : '1px solid rgba(0,0,0,0.07)',
                                }}
                            >
                                <div className="flex items-center justify-between mb-[10px]">
                                    <p className="text-[10px] font-semibold" style={{ color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.45)' }}>Active Project</p>
                                    <span
                                        className="text-[8px] px-[6px] py-[2px] rounded-full font-medium"
                                        style={{ background: 'rgba(96,165,250,0.15)', color: '#60a5fa' }}
                                    >{mockProject.status}</span>
                                </div>
                                <p className="text-[12px] sm:text-[13px] font-semibold mb-[8px]" style={{ color: isDark ? '#ffffff' : '#111111' }}>{mockProject.name}</p>
                                <div className="flex items-center gap-[8px] mb-[8px]">
                                    <div className="flex-1 h-[5px] rounded-full overflow-hidden" style={{ background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }}>
                                        <div
                                            className="h-full rounded-full"
                                            style={{
                                                width: progressVisible ? `${mockProject.progress}%` : '0%',
                                                background: 'linear-gradient(to right, #6265f0, #725CF7)',
                                                transition: 'width 1.4s cubic-bezier(0.4, 0, 0.2, 1)',
                                                transitionDelay: progressVisible ? '0.3s' : '0s',
                                            }}
                                        />
                                    </div>
                                    <span className="text-[10px] font-medium flex-shrink-0" style={{ color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)' }}>{mockProject.progress}%</span>
                                </div>
                                <div className="flex gap-[6px]">
                                    {[{ label: 'Due', value: mockProject.due }, { label: 'Activity', value: mockProject.activity }].map(d => (
                                        <div
                                            key={d.label}
                                            className="flex-1 rounded-[8px] px-[8px] py-[6px]"
                                            style={{ background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)' }}
                                        >
                                            <p className="text-[8px] font-light mb-[1px]" style={{ color: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.35)' }}>{d.label}</p>
                                            <p className="text-[9px] font-medium truncate" style={{ color: isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.7)' }}>{d.value}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Quick links */}
                            <div className="grid grid-cols-3 gap-[6px] flex-shrink-0">
                                {mockQuickLinks.map(q => (
                                    <div
                                        key={q.label}
                                        className="rounded-[10px] px-[8px] py-[8px] flex flex-col gap-[4px]"
                                        style={{
                                            background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
                                            border: isDark ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(0,0,0,0.06)',
                                        }}
                                    >
                                        <span className="text-[12px]">{q.icon}</span>
                                        <p className="text-[9px] font-medium" style={{ color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)' }}>{q.label}</p>
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
