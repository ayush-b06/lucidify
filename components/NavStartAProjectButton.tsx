import React from 'react';
import Link from 'next/link';

interface NavStartAProjectButtonProps {
    onClick?: () => void;
    href?: string;
    label?: string;
}

const NavStartAProjectButton: React.FC<NavStartAProjectButtonProps> = ({ onClick, href, label = 'Start a Project' }) => {
    const className = 'NavStartAProjectBtn relative flex justify-center items-center rounded-[10px] overflow-hidden active:scale-[0.97] transition-transform duration-100';
    const style = {
        background: 'linear-gradient(135deg, #8B6FFF 0%, #6047F5 50%, #4A2FE0 100%)',
        boxShadow: '0 0 0 1px rgba(114,92,247,0.5), 0 2px 8px rgba(90,60,200,0.35), 0 6px 20px rgba(90,60,200,0.25)',
        padding: '1px',
    };
    const content = <>
        <div
            className="flex items-center gap-[6px] rounded-[9px] px-[16px] sm:px-[18px] py-[7px] sm:py-[8px]"
            style={{
                background: 'linear-gradient(135deg, rgba(140,115,255,0.15) 0%, rgba(90,60,200,0.08) 100%)',
                backdropFilter: 'blur(4px)',
            }}
        >
            <svg aria-hidden="true" width="12" height="12" viewBox="0 0 12 12" fill="none" className="opacity-90 flex-shrink-0">
                <path d="M6 0L7.2 4.8L12 6L7.2 7.2L6 12L4.8 7.2L0 6L4.8 4.8L6 0Z" fill="white" />
            </svg>
            <span className="NavStartAProjectText font-medium sm:text-[14px] text-[13px] tracking-[0.2px]" style={{ color: 'white' }}>{label}</span>
        </div>
        <div aria-hidden="true" className="absolute inset-0 opacity-[0.08]" style={{ background: 'linear-gradient(120deg, transparent 30%, white 50%, transparent 70%)' }} />
    </>;
    return href
        ? <Link href={href} onClick={onClick} className={className} style={style}>{content}</Link>
        : <button type="button" onClick={onClick} className={className} style={style}>{content}</button>;
};

export default NavStartAProjectButton;
