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

const HeroSection = () => {
  const orb1Ref = useRef<HTMLDivElement>(null);
  const orb2Ref = useRef<HTMLDivElement>(null);
  const orb3Ref = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const x = (e.clientX / window.innerWidth - 0.5) * 2;
      const y = (e.clientY / window.innerHeight - 0.5) * 2;

      if (orb1Ref.current)
        orb1Ref.current.style.transform = `translate(${x * -20}px, ${y * -16}px)`;
      if (orb2Ref.current)
        orb2Ref.current.style.transform = `translate(${x * 14}px, ${y * 10}px)`;
      if (orb3Ref.current)
        orb3Ref.current.style.transform = `translate(${x * -8}px, ${y * 18}px)`;
      if (contentRef.current)
        contentRef.current.style.transform = `translate(${x * 5}px, ${y * 3}px)`;
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <section className={`${poppins.className} items-center`}>
      <div className="flex justify-center rounded-[50px] mx-auto BackgroundGradient relative overflow-hidden">

        {/* Floating orbs — outer div handles JS translate, inner handles CSS pulse */}
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
          className="flex items-center w-full flex-col mt-[125px] sm:mb-[150px] mb-[125px] 2xl:mt-[125px] 2xl:mb-[150px] xl:mt-[80px] xl:mb-[125px] lg:mt-[70px] lg:mb-[100px] max-w-[650px]"
          style={{ transition: 'transform 0.1s linear' }}
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
              href="/"
              className="flex justify-center items-center rounded-full bg-white mr-[32px] ThreeD hover:shadow-lg hover:shadow-gray-600 hover:-translate-y-[4px]"
            >
              <div className="flex items-center justify-center sm:mx-[16px] mx-[14px] my-[8px]">
                <h1 className="text-black font-medium mr-1 sm:text-[16px] text-[14px]">Get a Demo</h1>
                <div className="w-[11px]">
                  <Image
                    src="/Black Right Arrow.png"
                    alt="Arrow"
                    layout="responsive"
                    width={0}
                    height={0}
                  />
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

        </div>
      </div>
    </section>
  )
}

export default HeroSection
