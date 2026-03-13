"use client"

import Image from 'next/image'
import React, { useEffect, useRef, useState } from 'react'

const QuoteSection = () => {
    const spanRef = useRef<HTMLSpanElement>(null);
    const [count, setCount] = useState(0);
    const [hasRun, setHasRun] = useState(false);

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting && !hasRun) {
                    setHasRun(true);
                    observer.disconnect();

                    const target = 48;
                    const duration = 1500;
                    const startTime = performance.now();

                    const tick = (now: number) => {
                        const elapsed = now - startTime;
                        const progress = Math.min(elapsed / duration, 1);
                        // ease-out cubic
                        const eased = 1 - Math.pow(1 - progress, 3);
                        setCount(Math.round(eased * target));
                        if (progress < 1) requestAnimationFrame(tick);
                    };
                    requestAnimationFrame(tick);
                }
            },
            { threshold: 0.5 }
        );
        if (spanRef.current) observer.observe(spanRef.current);
        return () => observer.disconnect();
    }, [hasRun]);

    return (
        <section className="items-center my-[150px]">
            <div className="flex flex-col max-w-[720px] items-center mx-auto">
                <div className="flex items-center my-1.5 mx-5">
                    <div className="w-[16px] mr-3">
                        <Image
                            src="/Lucidify Umbrella and L (black gradient).png"
                            alt="Lucidify Umbrella"
                            layout="responsive"
                            width={0}
                            height={0}
                        />
                    </div>
                    <h2 className="tracking-[4px] font-medium text-[12px]">OUTCOME</h2>
                </div>
                <h1 className="HeadingFont sm:max-w-[100%] max-w-[80%] text-center">Boost your <span className="TextGradient">Online Presence</span>.</h1>
                <h3 className="TextFont sm:max-w-[600px] max-w-[80%] my-[15px] text-center">
                    &quot;A significant portion of internet users, about{' '}
                    <span ref={spanRef} className="font-medium">{count}%</span>
                    , view web design as a crucial factor in determining the credibility of a business.
                    The way a website looks can impact the first impression and overall perception of a company.&quot;
                    <div className="mt-[20px] mr-[15px]">
                        <h3 className="TextFont text-end">- Forbes</h3>
                    </div>
                </h3>
            </div>
        </section>
    )
}

export default QuoteSection
