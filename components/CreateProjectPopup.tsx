"use client";
import { useDialog } from '@/hooks/useDialog';

import React, { useState, useEffect, useRef } from 'react';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { useAuth } from '@/context/authContext';
import { useTheme } from '@/context/themeContext';

interface CreateProjectPopupProps {
    closeCreatProjectPopup: () => void;
    isVisible: boolean;
    onCreated?: () => void;
}

const CreateProjectPopup: React.FC<CreateProjectPopupProps> = ({ closeCreatProjectPopup, isVisible, onCreated }) => {
    const { user } = useAuth();
    const { theme } = useTheme();
    const isDark = theme === 'dark';

    const [projectName, setProjectName] = useState('');
    const [projectDescription, setProjectDescription] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [nameFocused, setNameFocused] = useState(false);
    const [descFocused, setDescFocused] = useState(false);
    const [entered, setEntered] = useState(false);
    const nameRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isVisible) {
            setEntered(false);
            const t1 = setTimeout(() => setEntered(true), 20);
            const t2 = setTimeout(() => nameRef.current?.focus(), 120);
            return () => { clearTimeout(t1); clearTimeout(t2); };
        } else {
            setEntered(false);
            setProjectName('');
            setProjectDescription('');
            setError('');
        }
    }, [isVisible]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || loading) return;
        if (!projectName.trim()) {
            setError('Give your project a name first.');
            return;
        }
        setLoading(true);
        setError('');
        try {
            await addDoc(collection(db, 'users', user.uid, 'projects'), {
                projectName: projectName.trim(),
                projectDescription: projectDescription.trim(),
                dateCreated: new Date().toISOString(),
                status: 1,
                approval: 'Pending',
                progress: '0',
                setupComplete: false,
            });
            closeCreatProjectPopup();
            onCreated?.();
        } catch (err) {
            console.error(err);
            setError('Something went wrong. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const dialogRef = useDialog<HTMLDivElement>(isVisible, closeCreatProjectPopup, loading);
    if (!isVisible) return null;

    const textColor = isDark ? '#ffffff' : '#111111';
    const mutedColor = isDark ? 'rgba(255,255,255,0.42)' : 'rgba(0,0,0,0.42)';
    const subtleColor = isDark ? 'rgba(255,255,255,0.22)' : 'rgba(0,0,0,0.22)';

    const inputBase: React.CSSProperties = {
        background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
        color: textColor,
        outline: 'none',
        transition: 'border-color 0.15s, box-shadow 0.15s',
    };
    const inputIdle: React.CSSProperties = {
        ...inputBase,
        border: isDark ? '1px solid rgba(255,255,255,0.09)' : '1px solid rgba(0,0,0,0.09)',
        boxShadow: 'none',
    };
    const inputFocus: React.CSSProperties = {
        ...inputBase,
        border: '1px solid rgba(114,85,224,0.6)',
        boxShadow: '0 0 0 3px rgba(114,85,224,0.14)',
    };

    const nameCharsLeft = 60 - projectName.length;
    const descCharsLeft = 500 - projectDescription.length;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center px-4"
            style={{
                background: 'rgba(0,0,0,0.60)',
                backdropFilter: 'blur(8px)',
                opacity: entered ? 1 : 0,
                transition: 'opacity 0.18s ease',
            }}
            onClick={(e) => { if (!loading && e.target === e.currentTarget) closeCreatProjectPopup(); }}
        >
            <div
                ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-label="Create project" className="DashboardDialog relative w-full max-w-[460px] max-h-[90dvh] rounded-[28px] overflow-y-auto"
                style={{
                    background: isDark
                        ? 'linear-gradient(160deg, #161618 0%, #0f0f11 100%)'
                        : '#ffffff',
                    border: isDark
                        ? '1px solid rgba(255,255,255,0.08)'
                        : '1px solid rgba(0,0,0,0.07)',
                    boxShadow: isDark
                        ? '0 32px 80px rgba(0,0,0,0.65), 0 1px 0 rgba(255,255,255,0.06) inset'
                        : '0 32px 80px rgba(0,0,0,0.16)',
                    transform: entered ? 'scale(1) translateY(0)' : 'scale(0.95) translateY(12px)',
                    transition: 'transform 0.22s cubic-bezier(0.34,1.38,0.64,1), opacity 0.18s ease',
                }}
            >
                {/* Purple glow top accent */}
                <div
                    className="absolute top-0 left-1/2 -translate-x-1/2 w-[260px] h-[1px]"
                    style={{ background: 'linear-gradient(to right, transparent, rgba(114,85,224,0.7), transparent)' }}
                />

                {/* Header area */}
                <div className="px-[32px] pt-[32px] pb-[24px] text-center relative">
                    {/* Close button */}
                    <button
                        onClick={closeCreatProjectPopup} disabled={loading} aria-label="Close create project"
                        className="absolute top-[16px] right-[16px] flex items-center justify-center w-[30px] h-[30px] rounded-[9px] transition-opacity hover:opacity-60"
                        style={{
                            background: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)',
                            color: mutedColor,
                            fontSize: '14px',
                        }}
                    >
                        ✕
                    </button>

                    {/* Icon */}
                    <div
                        className="w-[56px] h-[56px] rounded-[18px] flex items-center justify-center text-[26px] mx-auto mb-[14px]"
                        style={{
                            background: 'radial-gradient(ellipse at 50% 0%, rgba(114,85,224,0.22) 0%, rgba(114,85,224,0.06) 100%)',
                            border: '1px solid rgba(114,85,224,0.22)',
                        }}
                    >
                        🚀
                    </div>

                    <h2 className="text-[20px] font-bold mb-[6px]" style={{ color: textColor }}>
                        What are we building?
                    </h2>
                    <p className="text-[13px] leading-[1.6]" style={{ color: mutedColor }}>
                        Give your project a name. You&apos;ll fill in the details next.
                    </p>
                </div>

                {/* Divider */}
                <div className="mx-[32px] h-[1px]" style={{ background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }} />

                {/* Form */}
                <form onSubmit={handleSubmit} className="px-[32px] pt-[24px] pb-[32px] flex flex-col gap-[16px]">

                    {/* Project Name */}
                    <div className="flex flex-col gap-[8px]">
                        <div className="flex items-center justify-between">
                            <label className="text-[11px] font-semibold tracking-[0.9px]" style={{ color: mutedColor }}>
                                PROJECT NAME
                            </label>
                            <span
                                className="text-[11px] tabular-nums transition-colors"
                                style={{ color: nameCharsLeft < 10 ? '#f87171' : subtleColor }}
                            >
                                {nameCharsLeft}
                            </span>
                        </div>
                        <input
                            ref={nameRef} aria-label="Project name"
                            type="text"
                            value={projectName}
                            onChange={(e) => { setProjectName(e.target.value); setError(''); }}
                            onFocus={() => setNameFocused(true)}
                            onBlur={() => setNameFocused(false)}
                            placeholder="e.g. My Awesome Website"
                            maxLength={60}
                            className="w-full rounded-[13px] px-[16px] h-[50px] text-[14px]"
                            style={nameFocused ? inputFocus : inputIdle}
                        />

                        {/* Live preview chip */}
                        {projectName.trim().length > 0 && (
                            <div
                                className="flex items-center gap-[7px] px-[12px] py-[6px] rounded-[10px] w-fit"
                                style={{
                                    background: 'rgba(114,85,224,0.10)',
                                    border: '1px solid rgba(114,85,224,0.20)',
                                }}
                            >
                                <span className="text-[11px]" style={{ color: 'rgba(114,85,224,0.7)' }}>✦</span>
                                <span className="text-[12px] font-medium" style={{ color: '#a89cff' }}>
                                    {projectName.trim()}
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Description */}
                    <div className="flex flex-col gap-[8px]">
                        <div className="flex items-center justify-between">
                            <label className="text-[11px] font-semibold tracking-[0.9px]" style={{ color: mutedColor }}>
                                DESCRIPTION
                                <span className="font-normal ml-[6px]" style={{ color: subtleColor }}>optional</span>
                            </label>
                            {projectDescription.length > 0 && (
                                <span
                                    className="text-[11px] tabular-nums transition-colors"
                                    style={{ color: descCharsLeft < 50 ? '#f87171' : subtleColor }}
                                >
                                    {descCharsLeft}
                                </span>
                            )}
                        </div>
                        <textarea aria-label="Project description"
                            value={projectDescription}
                            onChange={(e) => setProjectDescription(e.target.value)}
                            onFocus={() => setDescFocused(true)}
                            onBlur={() => setDescFocused(false)}
                            placeholder="What would you like built? A quick idea is enough."
                            rows={3}
                            maxLength={500}
                            className="w-full rounded-[13px] px-[16px] py-[13px] text-[14px] resize-none leading-[1.6]"
                            style={descFocused ? inputFocus : inputIdle}
                        />
                    </div>

                    {/* Error */}
                    {error && (
                        <div
                            className="flex items-center gap-[8px] px-[14px] py-[10px] rounded-[11px] text-[13px]"
                            style={{ background: 'rgba(248,113,113,0.10)', border: '1px solid rgba(248,113,113,0.25)', color: '#f87171' }}
                        >
                            <span>⚠</span> {error}
                        </div>
                    )}

                    {/* Submit */}
                    <button
                        type="submit"
                        disabled={loading || !projectName.trim()}
                        className="w-full h-[52px] rounded-[14px] text-[15px] font-semibold text-white transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-40 mt-[4px]"
                        style={{
                            background: 'radial-gradient(ellipse 80% 110% at 50% -5%, #251470 0%, #3e28a8 40%, #5c3ecc 70%, #7255e0 100%)',
                            boxShadow: projectName.trim() ? '0 6px 28px rgba(82,56,200,0.45)' : 'none',
                            border: '1px solid rgba(255,255,255,0.12)',
                            transition: 'opacity 0.15s, box-shadow 0.2s, transform 0.1s',
                        }}
                    >
                        {loading ? 'Creating...' : 'Create project'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default CreateProjectPopup;
