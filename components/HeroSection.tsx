"use client"

import Image from 'next/image'
import Link from 'next/link'
import React, { useEffect, useRef } from 'react'
import LogInButton from './LogInButton'
import { Poppins } from 'next/font/google'

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['100', '200', '300', '400', '500', '600', '700', '800', '900']
});

const stats = [
  { value: '15+', label: 'Projects Delivered' },
  { value: 'Free', label: 'Hosting Included' },
  { value: '100%', label: 'Client Satisfaction' },
];

// Deterministic particle positions to avoid SSR hydration mismatch
const particles = Array.from({ length: 12 }, (_, i) => ({
  left: `${(i * 37 + 11) % 92}%`,
  top: `${(i * 53 + 17) % 88}%`,
  size: 1.5 + (i % 3) * 0.5,
  delay: `${(i * 0.4) % 3}s`,
  duration: `${3 + (i % 4)}s`,
}));

const HeroSection = () => {
  const orb1Ref = useRef<HTMLDivElement>(null);
  const orb2Ref = useRef<HTMLDivElement>(null);
  const orb3Ref = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const chevronRef = useRef<HTMLDivElement>(null);
  const magnetRef = useRef<HTMLAnchorElement>(null);

  const mouseX = useRef(0);
  const mouseY = useRef(0);
  const scrollP = useRef(0);

  const applyContentTransform = () => {
    if (!contentRef.current) return;
    const scrollOffset = scrollP.current * 30;
    const opacity = Math.max(0, 1 - scrollP.current * 1.4);
    contentRef.current.style.transform = `translate(${mouseX.current}px, ${mouseY.current + scrollOffset}px)`;
    contentRef.current.style.opacity = String(opacity);
    if (chevronRef.current) {
      chevronRef.current.style.opacity = String(opacity * 0.65);
    }
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const x = (e.clientX / window.innerWidth - 0.5) * 2;
      const y = (e.clientY / window.innerHeight - 0.5) * 2;

      mouseX.current = x * 5;
      mouseY.current = y * 3;

      if (orb1Ref.current)
        orb1Ref.current.style.transform = `translate(${x * -20}px, ${y * -16}px)`;
      if (orb2Ref.current)
        orb2Ref.current.style.transform = `translate(${x * 14}px, ${y * 10}px)`;
      if (orb3Ref.current)
        orb3Ref.current.style.transform = `translate(${x * -8}px, ${y * 18}px)`;

      applyContentTransform();

      // Magnetic effect on "Get a Demo" button
      const btn = magnetRef.current;
      if (btn) {
        const rect = btn.getBoundingClientRect();
        const bx = e.clientX - (rect.left + rect.width / 2);
        const by = e.clientY - (rect.top + rect.height / 2);
        const dist = Math.sqrt(bx * bx + by * by);
        const threshold = 80;
        if (dist < threshold) {
          const strength = (1 - dist / threshold) * 0.35;
          btn.style.transform = `translate(${bx * strength}px, ${by * strength}px) translateY(-2px)`;
        } else {
          btn.style.transform = 'translate(0px, 0px) translateY(0px)';
        }
      }
    };

    const handleScroll = () => {
      scrollP.current = Math.min(window.scrollY / 500, 1);
      applyContentTransform();

      const s = scrollP.current;
      if (orb1Ref.current) orb1Ref.current.style.opacity = String(1 - s * 0.8);
      if (orb2Ref.current) orb2Ref.current.style.opacity = String(1 - s * 0.8);
      if (orb3Ref.current) orb3Ref.current.style.opacity = String(1 - s * 0.8);
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('scroll', handleScroll);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <section className={`${poppins.className} items-center mt-[86px] sm:mt-[90px]`}>
      <div className="flex justify-center rounded-b-[50px] mx-auto BackgroundGradient relative overflow-hidden">

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
              background: 'rgba(255,255,255,0.35)',
              animationDelay: p.delay,
              animationDuration: p.duration,
            }}
          />
        ))}

        {/* Floating orbs */}
        <div ref={orb1Ref} className="absolute pointer-events-none" style={{ top: '-120px', left: '-180px', width: '500px', height: '500px' }}>
          <div className="HeroOrbInner" style={{ background: 'radial-gradient(circle, rgba(82,64,201,0.5) 0%, transparent 65%)', animationDelay: '0s' }} />
        </div>
        <div ref={orb2Ref} className="absolute pointer-events-none" style={{ top: '40px', right: '-140px', width: '380px', height: '380px' }}>
          <div className="HeroOrbInner" style={{ background: 'radial-gradient(circle, rgba(114,92,247,0.4) 0%, transparent 65%)', animationDelay: '-2s' }} />
        </div>
        <div ref={orb3Ref} className="absolute pointer-events-none" style={{ bottom: '-60px', left: '28%', width: '260px', height: '260px' }}>
          <div className="HeroOrbInner" style={{ background: 'radial-gradient(circle, rgba(153,139,249,0.35) 0%, transparent 65%)', animationDelay: '-4s' }} />
        </div>

        {/* Content */}
        <div
          ref={contentRef}
          className="flex items-center w-full flex-col mt-[116px] sm:mb-[70px] mb-[60px] 2xl:mt-[130px] 2xl:mb-[80px] xl:mt-[120px] xl:mb-[60px] lg:mt-[112px] lg:mb-[50px] max-w-[780px] px-[24px] sm:px-[48px] lg:px-0"
          style={{ transition: 'transform 0.08s linear, opacity 0.08s linear' }}
        >
          {/* Badge */}
          <div className="FadeInUp flex justify-center items-center border-solid border border-1 border-[#2F2F2F] rounded-full">
            <div className="flex items-center my-1.5 mx-5">
              <div className="sm:w-[16px] w-[14px] mr-3">
                <Image
                  src="/Lucidify Umbrella and L (black gradient).png"
                  alt="Lucidify Umbrella"
                  layout="responsive"
                  width={0}
                  height={0}
                />
              </div>
              <h2 className="tracking-[4px] font-medium sm:text-[12px] text-[10px]">WEB DEVELOPMENT AGENCY</h2>
            </div>
          </div>

          {/* Title */}
          <h1 className={`${poppins.className} FadeInUp1 TitleFont my-[22px] text-center lg:max-w-[80%] xl:max-w-[100%] max-w-[90%]`}>
            Take your <span className="TextGradient">business</span> to the next level.
          </h1>

          {/* Subtitle */}
          <div className="FadeInUp2 max-w-[75%] sm:max-w-[80%] mb-[45px]">
            <h3 className="TextFont text-center">
              Lucidify will build your dream website hassle-free, delivering a seamless process that saves you time and effort.
            </h3>
          </div>

          {/* CTA buttons */}
          <div className="FadeInUp3 flex justify-center">
            <Link
              ref={magnetRef}
              href="/demo"
              className="flex justify-center items-center rounded-full bg-white mr-[32px] ThreeD hover:shadow-lg hover:shadow-gray-600"
              style={{ transition: 'transform 0.2s ease, box-shadow 0.2s ease' }}
            >
              <div className="flex items-center justify-center sm:mx-[16px] mx-[14px] my-[8px]">
                <h1 className="text-black font-medium mr-1 sm:text-[16px] text-[14px]">Get a Demo</h1>
                <div className="w-[11px]">
                  <Image src="/Black Right Arrow.png" alt="Arrow" layout="responsive" width={0} height={0} />
                </div>
              </div>
            </Link>
            <LogInButton />
          </div>

          {/* Social proof stats */}
          <div className="FadeInUp4 flex items-center gap-[20px] sm:gap-[36px] mt-[52px] opacity-40">
            {stats.map((s, i) => (
              <React.Fragment key={s.label}>
                <div className="flex flex-col items-center gap-[2px]">
                  <span className="text-[15px] sm:text-[17px] font-semibold text-white">{s.value}</span>
                  <span className="text-[10px] sm:text-[11px] font-light tracking-[0.5px]">{s.label}</span>
                </div>
                {i < stats.length - 1 && (
                  <div className="w-[1px] h-[28px] bg-white/20 rounded-full" />
                )}
              </React.Fragment>
            ))}
          </div>

          {/* Scroll indicator */}
          <div className="FadeInUp5 mt-[60px]">
            <div
              ref={chevronRef}
              className="BounceDown flex flex-row items-center gap-[10px] cursor-pointer"
              style={{ opacity: 0.65 }}
              onClick={() => window.scrollTo({ top: window.innerHeight, behavior: 'smooth' })}
            >
              <span className="text-[10px] tracking-[3px] font-medium">SCROLL</span>
            </div>
          </div>

        </div>
      </div>
    </section>
  )
}

export default HeroSection
