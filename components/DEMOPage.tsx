"use client"

import Image from 'next/image'
import Link from 'next/link'
import React, { useEffect, useRef, useState } from 'react'
import Popup from './Popup'
import DashboardPreviewSection from './DashboardPreviewSection'

// ─── Deterministic particles (no SSR mismatch) ───────────────────────────────
const particles = Array.from({ length: 12 }, (_, i) => ({
    left: `${(i * 47 + 9) % 92}%`,
    top: `${(i * 59 + 17) % 88}%`,
    size: 1.5 + (i % 3) * 0.5,
    delay: `${(i * 0.45) % 3.5}s`,
    duration: `${3.5 + (i % 3)}s`,
}))

// ─── Dashboard features ───────────────────────────────────────────────────────
const dashFeatures = [
    {
        icon: '📊',
        title: 'Live Progress Tracking',
        desc: 'Watch your project move through every stage — Planning, Designing, Developing, and Launching — in real time.',
        color: 'rgba(114,92,247,0.18)',
        border: 'rgba(114,92,247,0.20)',
    },
    {
        icon: '🖼️',
        title: 'Design Review & Approvals',
        desc: 'Every design we create lands directly in your dashboard. Review, leave feedback, and approve — no email threads.',
        color: 'rgba(70,120,217,0.16)',
        border: 'rgba(70,120,217,0.20)',
    },
    {
        icon: '💬',
        title: 'Direct Team Messaging',
        desc: 'Chat directly with your Lucidify team. Ask questions, share ideas, get updates — all in one thread.',
        color: 'rgba(44,173,110,0.14)',
        border: 'rgba(44,173,110,0.20)',
    },
    {
        icon: '💳',
        title: 'Flexible Payment Plans',
        desc: 'See your payment schedule, track what\'s been paid, and manage everything without a single spreadsheet.',
        color: 'rgba(251,191,36,0.14)',
        border: 'rgba(251,191,36,0.22)',
    },
    {
        icon: '📅',
        title: 'Project Timeline',
        desc: 'Know exactly what\'s coming next. Your project timeline is always visible so nothing catches you off guard.',
        color: 'rgba(241,63,94,0.12)',
        border: 'rgba(241,63,94,0.20)',
    },
    {
        icon: '🔒',
        title: 'Private & Secure',
        desc: 'Your dashboard is yours alone. All data is secured and only accessible with your account.',
        color: 'rgba(114,92,247,0.14)',
        border: 'rgba(114,92,247,0.18)',
    },
]

// ─── How it works ─────────────────────────────────────────────────────────────
const steps = [
    {
        num: '01',
        title: 'Start your project',
        desc: 'Tell us what you need — a landing page, a full site, a web app. We\'ll get the details sorted.',
        icon: '🚀',
    },
    {
        num: '02',
        title: 'Get your dashboard',
        desc: 'You\'re instantly set up with a private dashboard linked to your project. No setup required on your end.',
        icon: '✨',
    },
    {
        num: '03',
        title: 'Track everything',
        desc: 'From design approvals to launch day, every update lives in your dashboard. Always in the loop.',
        icon: '📡',
    },
]

// ─── Testimonials ─────────────────────────────────────────────────────────────
const testimonials = [
    {
        quote: 'Having a dashboard to track my project made the whole process feel so transparent. I always knew what was happening.',
        name: 'Sarah M.',
        role: 'E-commerce founder',
        initial: 'S',
        color: '#725CF7',
    },
    {
        quote: 'The messaging feature alone saved me hours of back-and-forth emails. Everything was right there in one place.',
        name: 'James T.',
        role: 'Restaurant owner',
        initial: 'J',
        color: '#467CD9',
    },
    {
        quote: 'Seeing my progress bar move from 0 to 100% was honestly satisfying. The transparency is unmatched.',
        name: 'Priya K.',
        role: 'Consultant',
        initial: 'P',
        color: '#2CAD6E',
    },
]

// ─── Main component ───────────────────────────────────────────────────────────
const DEMOPage = () => {
    const [isPopupOpen, setIsPopupOpen] = useState(false)
    const glowRef = useRef<HTMLDivElement>(null)
    const heroRef = useRef<HTMLDivElement>(null)
    const featuresRef = useRef<HTMLDivElement>(null)
    const [featuresVisible, setFeaturesVisible] = useState(false)

    useEffect(() => {
        const obs = new IntersectionObserver(
            ([e]) => { if (e.isIntersecting) { setFeaturesVisible(true); obs.disconnect() } },
            { threshold: 0.15 }
        )
        if (featuresRef.current) obs.observe(featuresRef.current)
        return () => obs.disconnect()
    }, [])

    useEffect(() => {
        const hero = heroRef.current
        if (!hero) return
        const onMove = (e: MouseEvent) => {
            if (!glowRef.current) return
            const rect = hero.getBoundingClientRect()
            glowRef.current.style.left = `${e.clientX - rect.left}px`
            glowRef.current.style.top = `${e.clientY - rect.top}px`
            glowRef.current.style.opacity = '1'
        }
        const onLeave = () => { if (glowRef.current) glowRef.current.style.opacity = '0' }
        hero.addEventListener('mousemove', onMove, { passive: true })
        hero.addEventListener('mouseleave', onLeave)
        return () => { hero.removeEventListener('mousemove', onMove); hero.removeEventListener('mouseleave', onLeave) }
    }, [])

    const cardBase = {
        border: '1px solid var(--color-border)',
        background: 'var(--color-bg-card)',
        transition: 'box-shadow 0.3s ease, transform 0.18s ease',
    }

    return (
        <>
            <Popup closePopup={() => setIsPopupOpen(false)} isVisible={isPopupOpen} />

            {/* ── Hero ─────────────────────────────────────────────────────── */}
            <section>
                <div
                    ref={heroRef}
                    className="BackgroundGradient relative overflow-hidden rounded-[50px] mt-[100px] sm:mt-[120px] mx-[12px] sm:mx-[24px]"
                >
                    {/* Mouse glow */}
                    <div
                        ref={glowRef}
                        className="absolute pointer-events-none rounded-full"
                        style={{
                            width: '400px', height: '400px',
                            background: 'radial-gradient(circle, rgba(114,92,247,0.16) 0%, transparent 65%)',
                            transform: 'translate(-50%,-50%)',
                            transition: 'left 0.3s ease, top 0.3s ease, opacity 0.4s ease',
                            opacity: 0, zIndex: 0,
                        }}
                    />

                    {/* Particles */}
                    {particles.map((p, i) => (
                        <div
                            key={i}
                            className="absolute pointer-events-none rounded-full HeroParticle"
                            style={{
                                left: p.left, top: p.top,
                                width: `${p.size}px`, height: `${p.size}px`,
                                background: 'rgba(255,255,255,0.25)',
                                animationDelay: p.delay, animationDuration: p.duration, zIndex: 0,
                            }}
                        />
                    ))}

                    <div className="relative z-10 flex flex-col items-center text-center max-w-[720px] mx-auto px-[24px] sm:px-[48px] pt-[80px] sm:pt-[110px] pb-[80px] sm:pb-[110px]">

                        {/* Label pill */}
                        <div className="flex items-center gap-[8px] border border-[#2F2F2F] rounded-full px-[16px] py-[6px] mb-[28px]">
                            <div className="w-[7px] h-[7px] rounded-full bg-[#6265F0]" />
                            <span className="text-[11px] tracking-[3px] font-medium opacity-60">CLIENT DASHBOARD</span>
                        </div>

                        <h1 className="HeadingFont mb-[18px]">
                            Your project, <span className="TextGradient">always in sight</span>.
                        </h1>
                        <p className="TextFont max-w-[520px] mb-[44px]">
                            Every Lucidify client gets a private dashboard — track progress in real time, review designs, message your team, and manage payments. All in one place.
                        </p>

                        <div className="flex flex-wrap gap-[14px] justify-center">
                            <button
                                onClick={() => setIsPopupOpen(true)}
                                className="flex items-center gap-[8px] px-[22px] py-[12px] rounded-full font-medium text-[15px] transition-all hover:opacity-90 active:scale-[0.97]"
                                style={{
                                    background: 'radial-gradient(ellipse 80% 110% at 50% -5%, #251470 0%, #3e28a8 40%, #5c3ecc 70%, #7255e0 100%)',
                                    color: '#ffffff',
                                    boxShadow: '0 6px 28px rgba(82,56,200,0.45)',
                                    border: '1px solid rgba(255,255,255,0.12)',
                                }}
                            >
                                <span>✦</span> Start a project
                            </button>
                            <Link
                                href="/login"
                                className="flex items-center gap-[8px] px-[22px] py-[12px] rounded-full font-medium text-[15px] transition-all hover:opacity-80 active:scale-[0.97]"
                                style={{
                                    background: 'rgba(255,255,255,0.08)',
                                    border: '1px solid rgba(255,255,255,0.14)',
                                    color: '#ffffff',
                                }}
                            >
                                Access my dashboard →
                            </Link>
                        </div>

                        {/* Social proof strip */}
                        <div className="flex items-center gap-[24px] mt-[44px] flex-wrap justify-center">
                            {[
                                { val: '100%', label: 'design approval rate' },
                                { val: '99.9%', label: 'uptime' },
                                { val: '50%', label: 'below market rate' },
                            ].map(s => (
                                <div key={s.label} className="flex flex-col items-center">
                                    <span className="TextGradient font-bold text-[22px] leading-none">{s.val}</span>
                                    <span className="text-[11px] font-light opacity-35 mt-[3px]">{s.label}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* ── Dashboard Preview ─────────────────────────────────────────── */}
            <DashboardPreviewSection />

            {/* ── Dashboard Features ───────────────────────────────────────── */}
            <section>
                <div ref={featuresRef} className="max-w-[1080px] mx-auto px-[24px] sm:px-[48px] py-[100px] sm:py-[140px]">

                    <div className="mb-[52px]">
                        <span className="text-[10px] tracking-[4px] font-medium opacity-25">WHAT YOU GET</span>
                        <h1 className="HeadingFont mt-[10px]">
                            Everything you need, <span className="TextGradient">nothing you don&apos;t</span>.
                        </h1>
                        <p className="TextFont mt-[10px] max-w-[480px]">
                            Your dashboard is purpose-built for Lucidify clients. Clean, fast, and focused on your project.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-[14px]">
                        {dashFeatures.map((f, i) => (
                            <div
                                key={f.title}
                                className="relative rounded-[22px] p-[28px] flex flex-col gap-[14px] group"
                                style={{
                                    ...cardBase,
                                    opacity: featuresVisible ? 1 : 0,
                                    transform: featuresVisible ? 'translateY(0)' : 'translateY(20px)',
                                    transition: `opacity 0.5s ease ${i * 0.07}s, transform 0.5s ease ${i * 0.07}s, box-shadow 0.3s ease`,
                                }}
                                onMouseEnter={e => {
                                    (e.currentTarget as HTMLElement).style.boxShadow = `inset 0 0 60px ${f.color}, 0 20px 50px rgba(0,0,0,0.15)`
                                    ;(e.currentTarget as HTMLElement).style.borderColor = f.border
                                }}
                                onMouseLeave={e => {
                                    (e.currentTarget as HTMLElement).style.boxShadow = ''
                                    ;(e.currentTarget as HTMLElement).style.borderColor = 'var(--color-border)'
                                }}
                            >
                                <div
                                    className="w-[44px] h-[44px] rounded-[14px] flex items-center justify-center text-[20px] flex-shrink-0"
                                    style={{ background: f.color, border: `1px solid ${f.border}` }}
                                >
                                    {f.icon}
                                </div>
                                <div>
                                    <h3 className="text-[15px] font-semibold mb-[6px]">{f.title}</h3>
                                    <p className="text-[13px] font-light leading-relaxed opacity-50">{f.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── How it works ─────────────────────────────────────────────── */}
            <section>
                <div className="max-w-[1080px] mx-auto px-[24px] sm:px-[48px] pb-[100px] sm:pb-[140px]">

                    <div className="mb-[52px]">
                        <span className="text-[10px] tracking-[4px] font-medium opacity-25">HOW IT WORKS</span>
                        <h1 className="HeadingFont mt-[10px]">
                            Up and running in <span className="TextGradient">three steps</span>.
                        </h1>
                    </div>

                    <div className="flex flex-col lg:flex-row gap-[14px]">
                        {steps.map((s, i) => (
                            <div
                                key={s.num}
                                className="relative flex-1 rounded-[22px] p-[32px] flex flex-col justify-between"
                                style={{ ...cardBase, minHeight: '220px' }}
                            >
                                {/* Connector line (desktop) */}
                                {i < steps.length - 1 && (
                                    <div
                                        className="hidden lg:block absolute top-[50px] right-0 w-[14px] h-[1px] translate-x-full"
                                        style={{ background: 'var(--color-border)' }}
                                    />
                                )}

                                <div className="flex items-center justify-between mb-[28px]">
                                    <span className="text-[11px] font-bold TextGradient opacity-50">{s.num}</span>
                                    <span className="text-[26px]">{s.icon}</span>
                                </div>
                                <div>
                                    <h3 className="text-[17px] font-semibold mb-[8px]">{s.title}</h3>
                                    <p className="text-[13px] font-light leading-relaxed opacity-45">{s.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── Testimonials ─────────────────────────────────────────────── */}
            <section>
                <div className="max-w-[1080px] mx-auto px-[24px] sm:px-[48px] pb-[100px] sm:pb-[140px]">

                    <div className="mb-[52px]">
                        <span className="text-[10px] tracking-[4px] font-medium opacity-25">FROM OUR CLIENTS</span>
                        <h1 className="HeadingFont mt-[10px]">
                            What clients are <span className="TextGradient">saying</span>.
                        </h1>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-[14px]">
                        {testimonials.map((t) => (
                            <div
                                key={t.name}
                                className="rounded-[22px] p-[28px] flex flex-col gap-[20px]"
                                style={cardBase}
                            >
                                {/* Stars */}
                                <div className="flex gap-[3px]">
                                    {Array.from({ length: 5 }).map((_, i) => (
                                        <span key={i} className="text-[13px]" style={{ color: '#fbbf24' }}>★</span>
                                    ))}
                                </div>

                                <p className="text-[13px] font-light leading-relaxed opacity-70 flex-1">
                                    &ldquo;{t.quote}&rdquo;
                                </p>

                                <div className="flex items-center gap-[10px]">
                                    <div
                                        className="w-[34px] h-[34px] rounded-full flex items-center justify-center text-[13px] font-semibold text-white flex-shrink-0"
                                        style={{ background: t.color }}
                                    >
                                        {t.initial}
                                    </div>
                                    <div>
                                        <p className="text-[13px] font-semibold">{t.name}</p>
                                        <p className="text-[11px] opacity-40 font-light">{t.role}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── Final CTA ─────────────────────────────────────────────────── */}
            <section className="items-center">
                <div className="BackgroundGradient relative overflow-hidden rounded-[50px] mt-[0px] mb-[80px] sm:mb-[120px] mx-[12px] sm:mx-[24px]">

                    {/* Particles */}
                    {particles.slice(0, 8).map((p, i) => (
                        <div
                            key={i}
                            className="absolute pointer-events-none rounded-full HeroParticle"
                            style={{
                                left: p.left, top: p.top,
                                width: `${p.size}px`, height: `${p.size}px`,
                                background: 'rgba(255,255,255,0.25)',
                                animationDelay: p.delay, animationDuration: p.duration, zIndex: 0,
                            }}
                        />
                    ))}

                    <div className="relative z-10 flex flex-col items-center text-center max-w-[600px] mx-auto px-[24px] sm:px-[48px] py-[90px] sm:py-[120px]">
                        <div className="flex justify-center items-center rounded-full bg-white shadow-sm shadow-neutral-900 mb-[28px]">
                            <div className="flex items-center mx-[14px] sm:mx-[16px] my-[6px] sm:my-[8px] gap-[8px]">
                                <div className="w-[12px] sm:w-[14px]">
                                    <Image src="/Lucidify Umbrella and L (black gradient).png" alt="Lucidify" layout="responsive" width={0} height={0} />
                                </div>
                                <span className="tracking-[4px] font-semibold text-[12px] sm:text-[14px] text-black">GET STARTED</span>
                            </div>
                        </div>

                        <h1 className="HeadingFont mb-[16px]">
                            Ready to see it <span className="TextGradient">for yourself?</span>
                        </h1>
                        <p className="TextFont mb-[44px] max-w-[440px]">
                            Start your project today and get instant access to your private client dashboard.
                        </p>

                        <div className="flex flex-wrap gap-[14px] justify-center">
                            <button
                                onClick={() => setIsPopupOpen(true)}
                                className="flex items-center gap-[8px] px-[24px] py-[12px] rounded-full font-medium text-[15px] transition-all hover:opacity-90 active:scale-[0.97] bg-white text-black ThreeD"
                                style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.2)' }}
                            >
                                Start a project
                                <div className="w-[11px]">
                                    <Image src="/Black Right Arrow.png" alt="→" layout="responsive" width={0} height={0} />
                                </div>
                            </button>
                            <Link
                                href="/login"
                                className="flex items-center gap-[8px] px-[24px] py-[12px] rounded-full font-medium text-[15px] transition-all hover:opacity-80"
                                style={{
                                    background: 'rgba(255,255,255,0.08)',
                                    border: '1px solid rgba(255,255,255,0.14)',
                                    color: '#ffffff',
                                }}
                            >
                                Log in
                            </Link>
                        </div>
                    </div>
                </div>
            </section>
        </>
    )
}

export default DEMOPage
