"use client"

import Image from 'next/image'
import React, { useState, useEffect, useRef } from 'react';
import NavStartAProjectButton from './NavStartAProjectButton'
import LogInButton from './LogInButton'
import Popup from './Popup';

// Deterministic particle positions to avoid SSR hydration mismatch
const particles = Array.from({ length: 10 }, (_, i) => ({
    left: `${(i * 43 + 7) % 90}%`,
    top: `${(i * 61 + 13) % 85}%`,
    size: 1.5 + (i % 3) * 0.5,
    delay: `${(i * 0.5) % 3.5}s`,
    duration: `${3.5 + (i % 3)}s`,
}));

const GetStartedSection = () => {
    const [isPopupOpen, setIsPopupOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const glowRef = useRef<HTMLDivElement>(null);
    const magnetRef = useRef<HTMLDivElement>(null);

    const togglePopup = () => {
        setIsPopupOpen(!isPopupOpen);
    };

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const onMove = (e: MouseEvent) => {
            const rect = container.getBoundingClientRect();

            // Mouse-following glow
            if (glowRef.current) {
                glowRef.current.style.left = `${e.clientX - rect.left}px`;
                glowRef.current.style.top = `${e.clientY - rect.top}px`;
                glowRef.current.style.opacity = '1';
            }

            // Magnetic effect on StartAProjectButton wrapper
            const mag = magnetRef.current;
            if (mag) {
                const mr = mag.getBoundingClientRect();
                const bx = e.clientX - (mr.left + mr.width / 2);
                const by = e.clientY - (mr.top + mr.height / 2);
                const dist = Math.sqrt(bx * bx + by * by);
                const threshold = 90;
                if (dist < threshold) {
                    const strength = (1 - dist / threshold) * 0.35;
                    mag.style.transform = `translate(${bx * strength}px, ${by * strength}px)`;
                } else {
                    mag.style.transform = 'translate(0px, 0px)';
                }
            }
        };

        const onLeave = () => {
            if (glowRef.current) glowRef.current.style.opacity = '0';
            if (magnetRef.current) magnetRef.current.style.transform = 'translate(0px, 0px)';
        };

        container.addEventListener('mousemove', onMove, { passive: true });
        container.addEventListener('mouseleave', onLeave);
        return () => {
            container.removeEventListener('mousemove', onMove);
            container.removeEventListener('mouseleave', onLeave);
        };
    }, []);

    return (
        <section className="items-center">
            <Popup closePopup={togglePopup} isVisible={isPopupOpen} />

            <div
                ref={containerRef}
                className="BackgroundGradient rounded-[50px] relative overflow-hidden mt-[80px] sm:mt-[120px]"
            >
                {/* Mouse-following glow */}
                <div
                    ref={glowRef}
                    className="absolute pointer-events-none rounded-full"
                    style={{
                        width: '350px',
                        height: '350px',
                        background: 'radial-gradient(circle, rgba(114,92,247,0.18) 0%, transparent 65%)',
                        transform: 'translate(-50%, -50%)',
                        transition: 'left 0.3s ease, top 0.3s ease, opacity 0.4s ease',
                        opacity: 0,
                        zIndex: 0,
                    }}
                />

                {/* Floating particles */}
                {particles.map((p, i) => (
                    <div
                        key={i}
                        className="absolute pointer-events-none rounded-full HeroParticle"
                        style={{
                            left: p.left,
                            top: p.top,
                            width: `${p.size}px`,
                            height: `${p.size}px`,
                            background: 'rgba(255,255,255,0.3)',
                            animationDelay: p.delay,
                            animationDuration: p.duration,
                            zIndex: 0,
                        }}
                    />
                ))}

                <div className="relative z-10 flex flex-col items-center sm:max-w-[700px] mx-auto pt-[90px] sm:pt-[120px] pb-[90px] sm:pb-[120px] px-[24px] sm:px-[48px]">
                    <div className="flex justify-center items-center rounded-full bg-white shadow-sm shadow-neutral-900">
                        <div className="flex items-center justify-center sm:mx-[16px] sm:my-[8px] mx-[14px] my-[6px]">
                            <div className="flex items-center my-[0px] mx-[2px]">
                                <div className="sm:w-[14px] w-[12px] mr-3">
                                    <Image
                                        src="/Lucidify Umbrella and L (black gradient).png"
                                        alt="Lucidify Umbrella"
                                        layout="responsive"
                                        width={0}
                                        height={0}
                                    />
                                </div>
                                <h2 className="tracking-[4px] font-semibold sm:text-[14px] text-[12px] text-black">GET STARTED TODAY</h2>
                            </div>
                        </div>
                    </div>

                    <h1 className="HeadingFont text-center my-[22px]">Lets build something <span className="TextGradient">amazing</span> together.</h1>
                    <h3 className="TextFont text-center sm:mb-[50px] mb-[35px] sm:max-w-[100%] max-w-[80%]">
                        Take the first step toward a website that elevates your business.
                        Whether you need a complete overhaul or a brand-new site, Lucidify will bring your vision to life.
                    </h3>

                    <div className="flex justify-between">
                        <div
                            ref={magnetRef}
                            className="mr-[32px]"
                            style={{ transition: 'transform 0.25s ease' }}
                        >
                            <NavStartAProjectButton onClick={togglePopup} />
                        </div>

                        <LogInButton href="/signup" label="Sign Up" />
                    </div>
                </div>
            </div>
        </section>
    )
}

export default GetStartedSection
