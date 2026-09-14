"use client"

import Image from 'next/image';
import Link from 'next/link';
import React, { useState, useEffect } from 'react';
import NavStartAProjectButton from './NavStartAProjectButton';
import SignUpButton from './SignUpButton';
import { useTheme } from '@/context/themeContext';

const navLinks = [
    { href: '/', label: 'Home' },
    { href: '/creations', label: 'Our Creations' },
    { href: '/contact', label: "Let's Connect" },
];

const Navbar = () => {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [scrollProgress, setScrollProgress] = useState(0);
    const { theme } = useTheme();

    useEffect(() => {
        const handleScroll = () => {
            const scrollTop = window.scrollY;
            const docHeight = document.documentElement.scrollHeight - window.innerHeight;
            setScrollProgress(docHeight > 0 ? (scrollTop / docHeight) * 100 : 0);
        };
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const toggleMobileMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen);
    const closeMobileMenu = () => setIsMobileMenuOpen(false);

    // Dark mode pill is white → use black logo; light mode pill is dark → use white logo
    const logoSrc = theme === 'dark'
        ? '/Lucidify black logo.png'
        : '/Lucidify white logo.png';

    return (
        <>
            <div className="ScrollProgressBar" style={{ width: `${scrollProgress}%` }} />

            <header className="fixed top-0 left-0 right-0 z-50 pointer-events-none flex justify-center pt-4 px-3 sm:px-6 lg:px-10">

                {/* Desktop Navigation — 3-column grid so center links are truly centered */}
                <nav className={`NavbarPill hidden lg:grid pointer-events-auto w-full grid-cols-3 items-center px-8 h-[66px] rounded-[20px] transition-all duration-300 `}>
                    {/* Left — Logo */}
                    <Link href="/" className="relative w-[115px]">
                        <Image
                            src={logoSrc}
                            alt="Lucidify Logo"
                            layout="responsive"
                            width={0}
                            height={0}
                        />
                    </Link>

                    {/* Center — Nav Links (truly centered) */}
                    <div className="flex justify-center items-center gap-[18px]">
                        {navLinks.map(link => (
                            <Link key={link.href} href={link.href} className="NavLinkButton button rounded-full">
                                <div className="button__content NavLinkContent rounded-full">
                                    <span className={`button__text NavLinkText${link.label.length > 5 ? ' text-[11px]' : ''}`}>{link.label}</span>
                                </div>
                            </Link>
                        ))}
                    </div>

                    {/* Right — Buttons */}
                    <div className="flex justify-end items-center gap-[10px]">
                        <SignUpButton />
                        <NavStartAProjectButton label="Log In" href="/login" />
                    </div>
                </nav>

                {/* Mobile Navigation */}
                <nav className="lg:hidden pointer-events-auto w-full flex flex-col items-center">
                    {/* Mobile pill bar */}
                    <div className="NavbarPill w-full flex justify-between items-center py-[11px] px-[18px] rounded-[20px]">
                        <Link href="/" className="relative sm:w-[110px] w-[95px]" onClick={closeMobileMenu}>
                            <Image
                                src={logoSrc}
                                alt="Lucidify Logo"
                                layout="responsive"
                                width={0}
                                height={0}
                            />
                        </Link>
                        <div className="flex items-center gap-[8px]">
                            <NavStartAProjectButton label="Log In" href="/login" onClick={closeMobileMenu} />
                            <button
                                onClick={toggleMobileMenu}
                                aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
                                className="w-[32px] h-[32px] rounded-full NavbarHamburger cursor-pointer ml-[8px] flex flex-col justify-center items-center active:scale-[0.90] active:opacity-75 duration-100 ease-in-out"
                            >
                                {isMobileMenuOpen ? (
                                    <div className="relative w-[14px] h-[14px]">
                                        <div className="absolute top-1/2 left-0 w-full h-[2px] NavbarHamburgerBar rounded-full rotate-45 -translate-y-1/2" />
                                        <div className="absolute top-1/2 left-0 w-full h-[2px] NavbarHamburgerBar rounded-full -rotate-45 -translate-y-1/2" />
                                    </div>
                                ) : (
                                    <>
                                        <div className="w-[14px] h-[2px] NavbarHamburgerBar rounded-full" />
                                        <div className="w-[14px] h-[2px] NavbarHamburgerBar rounded-full my-[2px]" />
                                        <div className="w-[14px] h-[2px] NavbarHamburgerBar rounded-full" />
                                    </>
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Mobile Dropdown */}
                    <div className={`w-full overflow-hidden transition-all duration-300 ease-in-out ${
                        isMobileMenuOpen ? 'max-h-[400px] opacity-100 mt-[8px]' : 'max-h-0 opacity-0'
                    }`}>
                        <div className="NavbarDropdown rounded-[24px] px-[20px] py-[24px] flex flex-col gap-[6px]">
                            {navLinks.map(link => (
                                <Link
                                    key={link.href}
                                    href={link.href}
                                    onClick={closeMobileMenu}
                                    className="NavbarDropdownLink font-medium text-[15px] py-[12px] px-[16px] rounded-[14px] NavbarDropdownLinkHover transition-colors duration-150 flex items-center justify-between"
                                >
                                    {link.label}
                                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="opacity-40">
                                        <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                </Link>
                            ))}
                            <div className="h-[1px] NavbarDropdownDivider my-[8px]" />
                            <div className="flex flex-col gap-[10px]">
                                <SignUpButton />
                            </div>
                        </div>
                    </div>
                </nav>

            </header>
        </>
    );
};

export default Navbar;
