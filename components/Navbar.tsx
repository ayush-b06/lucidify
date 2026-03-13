"use client"

import Image from 'next/image';
import Link from 'next/link';
import React, { useState, useEffect } from 'react';
import NavStartAProjectButton from './NavStartAProjectButton';
import Popup from './Popup'; // Import the Popup component
import SignUpButton from './SignUpButton';

const navLinks = [
    { href: '/', label: 'Home' },
    { href: '/creations', label: 'Our Creations' },
    { href: '/contact', label: "Let's Connect" },
];

const Navbar = () => {
    const [isPopupOpen, setIsPopupOpen] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [scrollProgress, setScrollProgress] = useState(0);
    const [isScrolled, setIsScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            const scrollTop = window.scrollY;
            const docHeight = document.documentElement.scrollHeight - window.innerHeight;
            setScrollProgress(docHeight > 0 ? (scrollTop / docHeight) * 100 : 0);
            setIsScrolled(scrollTop > 20);
        };
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const togglePopup = () => {
        setIsPopupOpen(!isPopupOpen);
    };

    const toggleMobileMenu = () => {
        setIsMobileMenuOpen(!isMobileMenuOpen);
    };

    const closeMobileMenu = () => {
        setIsMobileMenuOpen(false);
    };

    return (
        <header className={`sticky top-0 z-50 ${isScrolled ? 'NavbarScrolled' : ''}`}>
            {/* Scroll progress bar */}
            <div className="ScrollProgressBar" style={{ width: `${scrollProgress}%` }} />

            <Popup closePopup={togglePopup} isVisible={isPopupOpen} />

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex justify-between h-[125px] items-center relative ">
                <div className="xl:w-[80%] md:w-[85%] 2xl:w-[75%] flex justify-between items-center text-[14px] relative mx-auto">
                    {/* Left Logo */}
                    <Link href="/" className="relative w-[125px]">
                        <Image
                            src="/Lucidify white logo.png"
                            alt="Lucidify Logo"
                            layout="responsive"
                            width={0}
                            height={0}
                        />
                    </Link>

                    {/* Center Navigation Links */}
                    <div className="absolute left-1/2 transform -translate-x-1/2 flex">
                        <Link href="/" className="mx-6 font-medium flex flex-col items-center NavItemHover">
                            Home
                            <div className="h-[1px] w-[50%] bg-white rounded-full NavItemUnderline"></div>
                        </Link>
                        <Link href="/creations" className="mx-6 font-medium flex flex-col items-center NavItemHover">
                            Our Creations
                            <div className="h-[1px] w-[50%] bg-white rounded-full NavItemUnderline"></div>
                        </Link>
                        <Link href="/contact" className="mx-6 font-medium flex flex-col items-center NavItemHover">
                            Let&apos;s Connect
                            <div className="h-[1px] w-[50%] bg-white rounded-full NavItemUnderline"></div>
                        </Link>
                    </div>

                    {/* Right Side Buttons */}
                    <div className="flex">
                        <div className='mr-[15px]'>
                            <SignUpButton />
                        </div>
                        <NavStartAProjectButton onClick={togglePopup} />
                    </div>
                </div>
            </nav>

            {/* Mobile Navigation */}
            <nav className="lg:hidden flex flex-col items-center">
                {/* Mobile Top Bar */}
                <div className="w-[90%] sm:w-[85%] mt-[30px] flex justify-between items-center text-[14px] border-solid border border-1 border-[#414141] rounded-full py-[8px] px-[16px]">
                    <Link href="/" className="relative sm:w-[125px] w-[110px]" onClick={closeMobileMenu}>
                        <Image
                            src="/Lucidify white logo.png"
                            alt="Lucidify Logo"
                            layout="responsive"
                            width={0}
                            height={0}
                        />
                    </Link>
                    <div className="flex items-center">
                        <NavStartAProjectButton onClick={() => { closeMobileMenu(); togglePopup(); }} />
                        {/* Hamburger / Close Button */}
                        <button
                            onClick={toggleMobileMenu}
                            aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
                            className="w-[30px] h-[30px] rounded-full bg-white shadow cursor-pointer ml-[10px] flex flex-col justify-center items-center active:scale-[0.90] active:opacity-75 duration-100 ease-in-out"
                        >
                            {isMobileMenuOpen ? (
                                /* X icon */
                                <div className="relative w-[14px] h-[14px]">
                                    <div className="absolute top-1/2 left-0 w-full h-[2px] bg-black rounded-full rotate-45 -translate-y-1/2" />
                                    <div className="absolute top-1/2 left-0 w-full h-[2px] bg-black rounded-full -rotate-45 -translate-y-1/2" />
                                </div>
                            ) : (
                                /* Hamburger icon */
                                <>
                                    <div className="w-[14px] h-[2px] bg-black rounded-full" />
                                    <div className="w-[14px] h-[2px] bg-black rounded-full my-[2px]" />
                                    <div className="w-[14px] h-[2px] bg-black rounded-full" />
                                </>
                            )}
                        </button>
                    </div>
                </div>

                {/* Mobile Dropdown Menu */}
                <div
                    className={`w-[90%] sm:w-[85%] overflow-hidden transition-all duration-300 ease-in-out ${
                        isMobileMenuOpen ? 'max-h-[400px] opacity-100 mt-[10px]' : 'max-h-0 opacity-0'
                    }`}
                >
                    <div className="border border-[#414141] rounded-[24px] px-[20px] py-[24px] flex flex-col gap-[6px]">
                        {navLinks.map((link) => (
                            <Link
                                key={link.href}
                                href={link.href}
                                onClick={closeMobileMenu}
                                className="text-white font-medium text-[15px] py-[12px] px-[16px] rounded-[14px] hover:bg-white/10 active:bg-white/20 transition-colors duration-150 flex items-center justify-between"
                            >
                                {link.label}
                                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="opacity-40">
                                    <path d="M6 3l5 5-5 5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </Link>
                        ))}

                        {/* Divider */}
                        <div className="h-[1px] bg-[#414141] my-[8px]" />

                        {/* Auth Buttons */}
                        <div className="flex flex-col gap-[10px]">
                            <SignUpButton />
                        </div>
                    </div>
                </div>
            </nav>
        </header>
    );
};

export default Navbar;
