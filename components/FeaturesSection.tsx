"use client"

import Image from 'next/image'
import React, { useEffect, useRef, useState, useCallback } from 'react'

const features = [
    {
        num: '01',
        icon: '/Web Design Icon.png',
        title: 'Free premium web designs.',
        description: 'We offer free web designs until you\'re satisfied. Only then do we move onto development — no upfront cost.',
        statValue: 100,
        statSuffix: '%',
        statLabel: 'client design approval',
        glowColor: 'rgba(82,64,201,0.30)',
    },
    {
        num: '02',
        icon: '/Web Hosting Icon.png',
        title: 'Free website hosting.',
        description: 'Reliable, secure, and fast hosting at no cost. We handle everything so you can focus on growing your business.',
        statValue: 99.9,
        statSuffix: '%',
        statLabel: 'uptime guarantee',
        glowColor: 'rgba(70,120,217,0.26)',
    },
    {
        num: '03',
        icon: '/Dollar Icon.png',
        title: 'High quality, affordable prices.',
        description: 'We deliver premium solutions that fit your budget — no hidden fees, no surprises.',
        statValue: 50,
        statSuffix: '%',
        statLabel: 'below market rate',
        glowColor: 'rgba(44,173,110,0.24)',
    },
];

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

const FeaturesSection = () => {
    const [active, setActive] = useState(0);
    const [displayedStat, setDisplayedStat] = useState<string[]>(
        features.map((f) => `${f.statValue}${f.statSuffix}`)
    );
    const animatingRef = useRef(false);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const tiltRefs = useRef<(HTMLDivElement | null)[]>([]);
    const glowRef = useRef<HTMLDivElement>(null);
    const mouseGlowRef = useRef<HTMLDivElement>(null);
    const rightPanelRef = useRef<HTMLDivElement>(null);

    const runCountUp = useCallback((i: number) => {
        if (animatingRef.current) return;
        animatingRef.current = true;
        const { statValue, statSuffix } = features[i];
        const duration = 1000;
        const start = performance.now();
        const tick = (now: number) => {
            const p = Math.min((now - start) / duration, 1);
            const val = easeOutCubic(p) * statValue;
            const text = (statValue % 1 !== 0 ? val.toFixed(1) : Math.round(val).toString()) + statSuffix;
            setDisplayedStat((prev) => {
                const next = [...prev];
                next[i] = text;
                return next;
            });
            if (p < 1) requestAnimationFrame(tick);
            else animatingRef.current = false;
        };
        requestAnimationFrame(tick);
    }, []);

    const activateFeature = useCallback((i: number) => {
        setActive(i);
        if (glowRef.current) {
            glowRef.current.style.background = `radial-gradient(circle, ${features[i].glowColor} 0%, transparent 65%)`;
        }
        // Reset stat for this feature then count up
        setDisplayedStat((prev) => {
            const next = [...prev];
            next[i] = `0${features[i].statSuffix}`;
            return next;
        });
        setTimeout(() => runCountUp(i), 50);
    }, [runCountUp]);

    // Auto-cycle every 4s, reset on user interaction
    const resetTimer = useCallback((nextIndex?: number) => {
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = setInterval(() => {
            setActive((prev) => {
                const next = (prev + 1) % features.length;
                if (glowRef.current) {
                    glowRef.current.style.background = `radial-gradient(circle, ${features[next].glowColor} 0%, transparent 65%)`;
                }
                setDisplayedStat((d) => {
                    const arr = [...d];
                    arr[next] = `0${features[next].statSuffix}`;
                    return arr;
                });
                setTimeout(() => runCountUp(next), 50);
                return next;
            });
        }, 4000);
        if (nextIndex !== undefined) activateFeature(nextIndex);
    }, [activateFeature, runCountUp]);

    useEffect(() => {
        // Initial count-up for feature 0
        runCountUp(0);
        resetTimer();
        return () => { if (timerRef.current) clearInterval(timerRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Mouse-following glow on right panel
    useEffect(() => {
        const panel = rightPanelRef.current;
        if (!panel) return;
        const onMove = (e: MouseEvent) => {
            if (!mouseGlowRef.current) return;
            const rect = panel.getBoundingClientRect();
            mouseGlowRef.current.style.left = `${e.clientX - rect.left}px`;
            mouseGlowRef.current.style.top = `${e.clientY - rect.top}px`;
        };
        panel.addEventListener('mousemove', onMove, { passive: true });
        return () => panel.removeEventListener('mousemove', onMove);
    }, []);

    // 3D tilt on cards
    const handleCardMouseMove = (e: React.MouseEvent<HTMLDivElement>, i: number) => {
        const el = tiltRefs.current[i];
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const rx = ((e.clientY - cy) / (rect.height / 2)) * -6;
        const ry = ((e.clientX - cx) / (rect.width / 2)) * 6;
        el.style.transform = `perspective(600px) rotateX(${rx}deg) rotateY(${ry}deg) scale(1.02)`;
    };

    const handleCardMouseLeave = (i: number) => {
        const el = tiltRefs.current[i];
        if (!el) return;
        el.style.transform = 'perspective(600px) rotateX(0deg) rotateY(0deg) scale(1)';
    };

    return (
        <section className="items-center">
            <div className="relative my-[150px] w-full max-w-[1080px] mx-auto px-[32px] sm:px-[48px]">

                {/* Top label */}
                <div className="flex items-center justify-between mb-[36px]">
                    <span className="text-[10px] tracking-[4px] font-medium opacity-25">WHY LUCIDIFY</span>
                    <div className="flex gap-[8px] items-center">
                        {features.map((_, i) => (
                            <button
                                key={i}
                                onClick={() => resetTimer(i)}
                                className="h-[4px] rounded-full"
                                style={{
                                    width: i === active ? '20px' : '5px',
                                    background: i === active
                                        ? 'linear-gradient(to right, #5240C9, #998BF9)'
                                        : 'rgba(255,255,255,0.15)',
                                    transition: 'width 0.35s cubic-bezier(0.25,1,0.5,1), background 0.35s ease',
                                    border: 'none',
                                    cursor: 'pointer',
                                    padding: 0,
                                }}
                            />
                        ))}
                    </div>
                </div>

                <div className="flex flex-col lg:flex-row gap-[40px] lg:gap-[70px] items-start lg:items-center">

                    {/* ── LEFT: heading + clickable feature cards ── */}
                    <div className="flex flex-col w-full lg:w-[420px] flex-shrink-0">
                        <h1 className="HeadingFont mb-[28px]">
                            Why businesses choose <span className="TextGradient">Lucidify</span>.
                        </h1>

                        <div className="flex flex-col gap-[10px]">
                            {features.map((f, i) => (
                                <div
                                    key={f.num}
                                    ref={el => { tiltRefs.current[i] = el; }}
                                    onClick={() => resetTimer(i)}
                                    onMouseMove={(e) => handleCardMouseMove(e, i)}
                                    onMouseLeave={() => handleCardMouseLeave(i)}
                                    className="rounded-[16px] px-[20px] pt-[16px] border overflow-hidden cursor-pointer"
                                    style={{
                                        borderColor: i === active ? 'rgba(114,92,247,0.4)' : 'rgba(255,255,255,0.05)',
                                        background: i === active
                                            ? 'linear-gradient(135deg,#1C1C1E 0%,#141414 100%)'
                                            : 'linear-gradient(135deg,#161616 0%,#0E0E0E 100%)',
                                        transition: 'border-color 0.35s ease, background 0.35s ease, transform 0.2s ease, box-shadow 0.2s ease',
                                        boxShadow: i === active ? '0 0 0 1px rgba(114,92,247,0.12), 0 8px 32px rgba(114,92,247,0.12)' : 'none',
                                    }}
                                >
                                    {/* Always-visible row */}
                                    <div className="flex items-center gap-[12px] pb-[14px]">
                                        <span
                                            className="text-[11px] font-bold TextGradient flex-shrink-0"
                                            style={{
                                                opacity: i === active ? 1 : i < active ? 0.4 : 0.2,
                                                transition: 'opacity 0.3s ease',
                                            }}
                                        >
                                            {f.num}
                                        </span>
                                        <div className="w-[28px] h-[28px] rounded-[7px] flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(255,255,255,0.05)' }}>
                                            <div className="w-[16px] h-[16px] relative">
                                                <Image src={f.icon} alt={f.title} fill style={{ objectFit: 'contain' }} />
                                            </div>
                                        </div>
                                        <span className="text-[14px] font-medium leading-snug">{f.title}</span>
                                    </div>

                                    {/* Expandable description */}
                                    <div
                                        className="overflow-hidden"
                                        style={{
                                            maxHeight: i === active ? '110px' : '0px',
                                            opacity: i === active ? 1 : 0,
                                            transition: 'max-height 0.45s cubic-bezier(0.25,1,0.5,1), opacity 0.35s ease',
                                        }}
                                    >
                                        <p className="text-[13px] font-light pb-[18px] leading-relaxed" style={{ opacity: 0.5 }}>
                                            {f.description}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <p className="text-[12px] font-light mt-[24px]" style={{ opacity: 0.18 }}>
                            We don&apos;t just build websites, we build relationships.
                        </p>
                    </div>

                    {/* ── RIGHT: spotlight visual ── */}
                    <div
                        ref={rightPanelRef}
                        className="hidden lg:flex flex-1 items-center justify-center relative"
                        style={{ height: '380px' }}
                    >
                        {/* Mouse-following glow */}
                        <div
                            ref={mouseGlowRef}
                            className="absolute pointer-events-none rounded-full"
                            style={{
                                width: '280px',
                                height: '280px',
                                background: 'radial-gradient(circle, rgba(114,92,247,0.12) 0%, transparent 65%)',
                                transform: 'translate(-50%, -50%)',
                                transition: 'left 0.25s ease, top 0.25s ease',
                            }}
                        />

                        {/* Scroll-driven glow behind icon */}
                        <div
                            ref={glowRef}
                            className="absolute w-[300px] h-[300px] rounded-full pointer-events-none"
                            style={{
                                background: `radial-gradient(circle, ${features[0].glowColor} 0%, transparent 65%)`,
                                transition: 'background 0.5s ease',
                            }}
                        />

                        {/* Decorative rings */}
                        <div className="absolute w-[260px] h-[260px] rounded-full" style={{ border: '1px solid rgba(255,255,255,0.04)' }} />
                        <div className="absolute w-[180px] h-[180px] rounded-full" style={{ border: '1px solid rgba(255,255,255,0.06)' }} />

                        {/* Feature visuals — crossfade on active change */}
                        {features.map((f, i) => (
                            <div
                                key={f.icon}
                                className="absolute flex flex-col items-center"
                                style={{
                                    opacity: i === active ? 1 : 0,
                                    transform: `scale(${i === active ? 1 : 0.88}) translateY(${i === active ? 0 : 18}px)`,
                                    transition: 'opacity 0.45s cubic-bezier(0.25,1,0.5,1), transform 0.45s cubic-bezier(0.25,1,0.5,1)',
                                    pointerEvents: i === active ? 'auto' : 'none',
                                }}
                            >
                                {/* Icon card */}
                                <div
                                    className="w-[90px] h-[90px] rounded-[22px] flex items-center justify-center mb-[24px] ContentCardShadow"
                                    style={{
                                        background: 'linear-gradient(135deg,#1E1E20 0%,#141416 100%)',
                                        border: '1px solid rgba(255,255,255,0.07)',
                                    }}
                                >
                                    <div className="w-[50px] h-[50px] relative">
                                        <Image src={f.icon} alt={f.title} fill style={{ objectFit: 'contain' }} />
                                    </div>
                                </div>

                                {/* Stat + label */}
                                <div className="flex flex-col items-center">
                                    <span className="text-[52px] font-bold leading-none TextGradient">
                                        {displayedStat[i]}
                                    </span>
                                    <span className="text-[12px] font-light tracking-[0.5px] mt-[6px]" style={{ opacity: 0.35 }}>
                                        {f.statLabel}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
};

export default FeaturesSection;
