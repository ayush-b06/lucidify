"use client"

import Image from 'next/image'
import React, { useEffect, useRef, useState } from 'react'

const steps = [
    { num: '01', title: 'PLAN',    desc: 'We get your vision and map out the plan.' },
    { num: '02', title: 'DESIGN',  desc: 'We design a stunning site that fits your brand.' },
    { num: '03', title: 'DEVELOP', desc: 'We build your site with precision, ensuring speed, functionality, and responsiveness.' },
    { num: '04', title: 'LAUNCH',  desc: "We launch your website for free. It's that simple." },
];

const ProcessSection = () => {
    const sectionRef = useRef<HTMLDivElement>(null);
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setVisible(true);
                    observer.disconnect();
                }
            },
            { threshold: 0.2 }
        );
        if (sectionRef.current) observer.observe(sectionRef.current);
        return () => observer.disconnect();
    }, []);

    return (
        <section className="items-center">
            <div ref={sectionRef} className="flex justify-center UpsideDownBackgroundGradient rounded-[50px] mt-[150px]">
                <div className="flex sm:flex-row flex-col justify-between items-center my-[150px]">

                    {/* Heading — slides in from left */}
                    <div className={`flex flex-col sm:mr-[200px] sm:items-start items-center ScrollRevealLeft ${visible ? 'is-visible' : ''}`}>
                        <h1 className="HeadingFont">Our Process.</h1>
                        <div className="flex mt-[10px]">
                            <div className="w-[16px] mr-3">
                                <Image
                                    src="/Lucidify Umbrella and L (black gradient).png"
                                    alt="Lucidify Umbrella"
                                    layout="responsive"
                                    width={0}
                                    height={0}
                                />
                            </div>
                            <h2 className="TextFont tracking-[1.5px] font-medium sm:mb-0 mb-[75px]">It&apos;s that simple.</h2>
                        </div>
                    </div>

                    {/* Steps — relative container for the vertical line */}
                    <div className="flex flex-col justify-between relative">

                        {/* Animated vertical connecting line */}
                        <div className={`ProcessLine ${visible ? 'is-visible' : ''}`} />

                        {steps.map((step, i) => (
                            <div
                                key={step.num}
                                className={`flex items-center ScrollReveal ${visible ? 'is-visible' : ''} Delay${i + 1} ${
                                    i === 0 ? 'mb-[50px]' : i === steps.length - 1 ? 'mt-[50px]' : 'my-[50px]'
                                }`}
                            >
                                <div className="sm:w-[50px] w-[40px] mr-[15px] flex-shrink-0">
                                    <Image
                                        src="/Purple Circle.png"
                                        alt="Circle"
                                        layout="responsive"
                                        width={0}
                                        height={0}
                                    />
                                </div>
                                <div className="flex flex-col max-w-[400px]">
                                    <h2 className="sm:text-[25px] text-[20px] font-medium">{step.num} {step.title}</h2>
                                    <h3 className="TextFont mt-[10px] sm:max-w-[100%] max-w-[250px]">{step.desc}</h3>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    )
}

export default ProcessSection
