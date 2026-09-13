"use client";

import React, { useEffect, useState } from 'react';
import { doc, getDoc, updateDoc, writeBatch } from 'firebase/firestore';
import { queueAdminNotification } from '@/utils/notifications';
import { db } from '../firebaseConfig';
import { useRouter } from 'next/navigation';
import { useTheme } from '@/context/themeContext';
import Image from 'next/image';
import Link from 'next/link';

interface Props {
    userId: string;
    projectId: string;
}

const PLATFORMS = [
    { id: 'WordPress',   emoji: '🌐', label: 'WordPress',    desc: 'Best for blogs & content sites' },
    { id: 'Webflow',     emoji: '⚡', label: 'Webflow',      desc: 'Beautiful design without code' },
    { id: 'Shopify',     emoji: '🛍️', label: 'Shopify',      desc: 'Built for online stores' },
    { id: 'Next.js',     emoji: '▲',  label: 'Next.js',      desc: 'Fast, modern web apps' },
    { id: 'Wix',         emoji: '🎨', label: 'Wix',          desc: 'Easy drag & drop builder' },
    { id: 'Squarespace', emoji: '⬜', label: 'Squarespace',  desc: 'Sleek portfolios & businesses' },
    { id: 'Custom',      emoji: '🔧', label: 'Custom Build', desc: 'Fully bespoke from scratch' },
    { id: 'Not sure',    emoji: '🤷', label: "Not sure yet", desc: "We'll recommend the best fit" },
];

const SUBPAGES = [
    { id: 'Home',         emoji: '🏠', label: 'Home' },
    { id: 'About',        emoji: '👋', label: 'About Us' },
    { id: 'Services',     emoji: '⚙️', label: 'Services' },
    { id: 'Portfolio',    emoji: '🖼️', label: 'Portfolio' },
    { id: 'Blog',         emoji: '✍️', label: 'Blog' },
    { id: 'Contact',      emoji: '📬', label: 'Contact' },
    { id: 'FAQ',          emoji: '❓', label: 'FAQ' },
    { id: 'Pricing',      emoji: '💰', label: 'Pricing' },
    { id: 'Team',         emoji: '👥', label: 'Our Team' },
    { id: 'Testimonials', emoji: '⭐', label: 'Reviews' },
    { id: 'Shop',         emoji: '🛒', label: 'Shop' },
    { id: 'Privacy',      emoji: '🔒', label: 'Privacy Policy' },
];

const BUDGETS = [
    { id: '$500 – $1,000',    label: '$500 – $1,000',    desc: 'Simple landing page or basic site' },
    { id: '$1,000 – $2,500',  label: '$1,000 – $2,500',  desc: 'Small business website' },
    { id: '$2,500 – $5,000',  label: '$2,500 – $5,000',  desc: 'Multi-page professional site' },
    { id: '$5,000 – $10,000', label: '$5,000 – $10,000', desc: 'Full-featured web application' },
    { id: '$10,000+',         label: '$10,000+',          desc: 'Large-scale or complex build' },
];

const PAYMENT_PLANS = [
    { id: 'Full upfront', emoji: '⚡', label: 'All upfront',    desc: 'Pay 100% now, get started immediately' },
    { id: '50/50',        emoji: '🤝', label: '50% / 50%',      desc: '50% now, 50% when delivered' },
    { id: 'Monthly',      emoji: '📅', label: 'Monthly',        desc: 'Spread payments across the timeline' },
    { id: 'Milestone',    emoji: '🎯', label: 'Milestones',     desc: 'Pay as each phase is completed' },
];

const MAINTENANCE_OPTIONS = [
    { id: 'none',     emoji: '🙌', label: 'No thanks',  sublabel: 'I\'ve got it covered',  desc: "I'll manage updates myself after launch." },
    { id: 'basic',    emoji: '🛡️', label: 'Basic',      sublabel: '$49 / month',            desc: 'Monthly security patches, backups & uptime checks.' },
    { id: 'standard', emoji: '⚡', label: 'Standard',   sublabel: '$99 / month',            desc: 'Weekly updates, priority support & performance checks.' },
    { id: 'premium',  emoji: '🚀', label: 'Premium',    sublabel: '$199 / month',           desc: 'Daily monitoring, unlimited edits & 24/7 support.' },
];

const STEP_INFO = [
    {
        emoji: '🗓️',
        title: 'When do you want to launch?',
        subtitle: "Give us a rough idea of your ideal timeline. Don't worry if you're not sure — you can always update this later.",
        optional: true,
    },
    {
        emoji: '✨',
        title: 'Do you have a logo?',
        subtitle: "Upload your brand logo if you have one. No logo yet? No problem — just skip this and we can help design one for you.",
        optional: true,
    },
    {
        emoji: '🛠️',
        title: 'What should your site be built on?',
        subtitle: "Not sure what any of these mean? Pick \"Not sure yet\" and we'll figure out the best fit together based on your needs.",
        optional: false,
    },
    {
        emoji: '📄',
        title: 'What pages will you need?',
        subtitle: "Think of pages like rooms in a house — each has a purpose. Select all the pages you think your visitors will need.",
        optional: true,
    },
    {
        emoji: '💳',
        title: "What's your budget?",
        subtitle: "All ranges include professional design and development. This just helps us plan the right scope for your project.",
        optional: false,
    },
    {
        emoji: '🛡️',
        title: 'Want ongoing support after launch?',
        subtitle: "Websites need love after they go live — updates, security fixes, and tweaks keep everything running smoothly.",
        optional: false,
    },
];

const TOTAL_STEPS = 6;

const DATE_PRESETS = [
    { label: 'ASAP',       sub: 'Within 2 weeks',   months: 0, days: 14 },
    { label: '1 month',    sub: 'Within 30 days',   months: 1, days: 0 },
    { label: '2–3 months', sub: 'I have some time', months: 2, days: 0 },
    { label: 'Custom',     sub: 'Pick a specific date', months: 0, days: 0 },
];

const DASHBOARDClientProjectSetup: React.FC<Props> = ({ userId, projectId }) => {
    const router = useRouter();
    const { theme } = useTheme();
    const isDark = theme === 'dark';

    const [saveError, setSaveError] = useState('');
    const [loadFailed, setLoadFailed] = useState(false);
    const [savingStep, setSavingStep] = useState(false);
    const [loadAttempt, setLoadAttempt] = useState(0);
    const [step, setStep] = useState(1);
    const [visible, setVisible] = useState(true);
    const [goingForward, setGoingForward] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [initialLoading, setInitialLoading] = useState(true);
    const [projectName, setProjectName] = useState('');

    const [dueDatePreset, setDueDatePreset] = useState('');
    const [dueDate, setDueDate] = useState('');
    const [showDatePicker, setShowDatePicker] = useState(false);

    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [logoPreview, setLogoPreview] = useState<string | null>(null);
    const [savedLogoUrl, setSavedLogoUrl] = useState<string | null>(null);
    const [logoUploading, setLogoUploading] = useState(false);

    const [platform, setPlatform] = useState('');
    const [selectedSubpages, setSelectedSubpages] = useState<string[]>(['Home', 'Contact']);
    const [customSubpage, setCustomSubpage] = useState('');
    const [budget, setBudget] = useState('');
    const [paymentPlan, setPaymentPlan] = useState('');
    const [maintenance, setMaintenance] = useState('');

    useEffect(() => {
        const load = async () => {
            setInitialLoading(true); setLoadFailed(false); setSaveError('');
            try {
                const snap = await getDoc(doc(db, 'users', userId, 'projects', projectId));
                if (!snap.exists()) throw new Error('Project not found');
                if (snap.exists()) {
                    const d = snap.data();
                    if (d.setupComplete === true) { router.replace(`/dashboard/projects/${projectId}?userId=${userId}`); return; }
                    if (d.projectName) setProjectName(d.projectName);
                    if (d.dueDate) { setDueDate(d.dueDate); setDueDatePreset('Custom'); setShowDatePicker(true); }
                    if (d.logoUrl) { setSavedLogoUrl(d.logoUrl); setLogoPreview(d.logoUrl); }
                    if (d.platform) setPlatform(d.platform);
                    if (d.subpages?.length) setSelectedSubpages(d.subpages);
                    if (d.estimatedBudget) setBudget(d.estimatedBudget);
                    setPaymentPlan(d.requestedPaymentPlan || (typeof d.paymentPlan === 'string' ? d.paymentPlan : ''));
                    if (d.maintenancePlan) setMaintenance(d.maintenancePlan);
                }
            } catch (err) {
                setLoadFailed(true); setSaveError('Could not load this project. Please retry.');
            } finally {
                setInitialLoading(false);
            }
        };
        load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userId, projectId, loadAttempt]);

    useEffect(() => () => { if (logoPreview?.startsWith('blob:')) URL.revokeObjectURL(logoPreview); }, [logoPreview]);

    const navigate = (to: number) => {
        setGoingForward(to > step);
        setVisible(false);
        setTimeout(() => { setStep(to); setVisible(true); }, 180);
    };

    const saveCurrentStep = async () => {

        const updates: Record<string, any> = {};
        if (step === 1) updates.dueDate = dueDate && dueDate !== 'custom' ? dueDate : null;
        if (step === 2) {
            const logoUrl = logoFile ? await uploadLogo() : savedLogoUrl;
            updates.logoUrl = logoUrl;
        }
        if (step === 3 && platform) updates.platform = platform;
        if (step === 4) updates.subpages = selectedSubpages;
        if (step === 5) {
            if (budget) updates.estimatedBudget = budget;
            if (paymentPlan) updates.requestedPaymentPlan = paymentPlan;
        }
        if (step === 6 && maintenance) updates.maintenancePlan = maintenance;
        if (Object.keys(updates).length > 0) {
            await updateDoc(doc(db, 'users', userId, 'projects', projectId), updates);
            if ('logoUrl' in updates) { setSavedLogoUrl(updates.logoUrl); setLogoPreview(updates.logoUrl); setLogoFile(null); }
        }
    };

    const uploadLogo = async (): Promise<string | null> => {
        if (!logoFile) return null;
        setLogoUploading(true);
        try {
            const fd = new FormData();
            fd.append('file', logoFile);
            fd.append('upload_preset', 'Unsigned Presets');
            const res = await fetch('https://api.cloudinary.com/v1_1/dldxkfbz4/image/upload', { method: 'POST', body: fd });
            const data = await res.json();
            if (!res.ok || !data.secure_url) throw new Error('Logo upload failed.');
            return data.secure_url;
        }
        finally { setLogoUploading(false); }
    };

    const handleNext = async () => {
        if (savingStep || submitting) return;
        setSavingStep(true); setSaveError('');
        try {
            await saveCurrentStep();
            if (step < TOTAL_STEPS) navigate(step + 1);
            else await handleFinish();
        } catch { setSaveError('Your changes could not be saved. Please try again.'); }
        finally { setSavingStep(false); }
    };
    const handleSkip = () => {
        if (!savingStep && !submitting && step < TOTAL_STEPS) navigate(step + 1);
    };
    const handleSaveExit = async () => {
        if (savingStep || submitting) return;
        setSavingStep(true); setSaveError('');
        try {
            await saveCurrentStep();
            if (logoFile && step !== 2) {
                const logoUrl = await uploadLogo();
                await updateDoc(doc(db, 'users', userId, 'projects', projectId), { logoUrl });
            }
            router.push('/dashboard/projects');
        } catch { setSaveError('Your changes could not be saved. Please try again.'); }
        finally { setSavingStep(false); }
    };

    const handleFinish = async () => {
        if (submitting) return;
        setSubmitting(true); setSaveError('');
        try {
            let logoUrl: string | null = savedLogoUrl;
            if (logoFile) logoUrl = await uploadLogo();
            const batch = writeBatch(db);
            batch.update(doc(db, 'users', userId, 'projects', projectId), {
                ...(dueDate && dueDate !== 'custom' && { dueDate }),
                logoUrl,
                ...(platform && { platform }),
                subpages: selectedSubpages,
                ...(budget && { estimatedBudget: budget }),
                ...(paymentPlan && { requestedPaymentPlan: paymentPlan }),
                ...(maintenance && { maintenancePlan: maintenance }),
                setupComplete: true, approval: 'Pending',
            });
            queueAdminNotification(batch, 'New project request', `${projectName || 'A new project'} is ready for review.`, `/dashboard/projects/${projectId}?userId=${userId}`, 'new_project', `project-${projectId}`);
            await batch.commit();
            router.push(`/dashboard/projects/${projectId}?userId=${userId}&projectId=${projectId}`);
        } catch (err) {
            setSaveError('We could not submit your project. Check your connection and try again; your choices are still here.');
        } finally {
            setSubmitting(false);
        }
    };

    const toggleSubpage = (id: string) =>
        setSelectedSubpages(prev => prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]);

    const addCustomSubpage = () => {
        const t = customSubpage.trim();
        if (t && !selectedSubpages.includes(t)) setSelectedSubpages(prev => [...prev, t]);
        setCustomSubpage('');
    };

    const canProceed = () => {
        if (step === 3 && !platform) return false;
        if (step === 5 && (!budget || !paymentPlan)) return false;
        if (step === 6 && !maintenance) return false;
        return true;
    };

    // Styles
    const textColor = isDark ? '#ffffff' : '#111111';
    const mutedColor = isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.45)';
    const cardBg = isDark ? 'rgba(15,15,17,0.97)' : 'rgba(255,255,255,0.98)';
    const cardBorder = isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.08)';
    const inputStyle: React.CSSProperties = {
        background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
        border: isDark ? '1px solid rgba(255,255,255,0.10)' : '1px solid rgba(0,0,0,0.10)',
        color: textColor,
    };
    const chipOn: React.CSSProperties = {
        background: 'radial-gradient(ellipse 80% 110% at 50% -5%, #251470 0%, #3e28a8 40%, #5c3ecc 70%, #7255e0 100%)',
        border: '1px solid rgba(255,255,255,0.15)',
        boxShadow: '0 4px 16px rgba(82,56,200,0.30)',
        color: '#ffffff',
    };
    const chipOff: React.CSSProperties = {
        background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
        border: isDark ? '1px solid rgba(255,255,255,0.09)' : '1px solid rgba(0,0,0,0.09)',
        color: textColor,
    };

    if (loadFailed) return <main className="DashboardBackgroundGradient p-8"><p role="alert">{saveError}</p><button onClick={() => setLoadAttempt(n => n + 1)} className="underline mr-4">Retry</button><Link href="/dashboard/projects">Back to projects</Link></main>;

    if (initialLoading) {
        return (
            <div className="min-h-screen DashboardBackgroundGradient flex items-center justify-center">
                <div className="w-[32px] h-[32px] rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: '#7255e0', borderTopColor: 'transparent' }} />
            </div>
        );
    }

    const current = STEP_INFO[step - 1];

    return (
        <div className="min-h-screen DashboardBackgroundGradient flex flex-col">

            {/* ── Top bar ── */}
            <div className="flex items-center justify-between px-[24px] sm:px-[48px] py-[18px] flex-shrink-0">
                <Link href="/dashboard/projects" className="relative w-[100px]">
                    <Image
                        src={isDark ? '/Lucidify white logo.png' : '/Lucidify black logo.png'}
                        alt="Lucidify" width={160} height={48}
                    />
                </Link>

                <div className="flex items-center gap-[20px]">
                    <span className="text-[13px] hidden sm:block" style={{ color: mutedColor }}>
                        Setting up: <span className="font-medium" style={{ color: textColor }}>{projectName || 'Your Project'}</span>
                    </span>
                    <button
                        onClick={handleSaveExit} disabled={savingStep || submitting}
                        className="text-[13px] px-[14px] h-[34px] rounded-[10px] flex items-center transition-opacity hover:opacity-70"
                        style={{ background: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)', color: mutedColor }}
                    >
                        Save & exit
                    </button>
                </div>
            </div>

            {saveError && <div role="alert" className="DashboardNotice mx-6">{saveError}</div>}
            {/* ── Progress segments ── */}
            <div className="flex gap-[5px] px-[24px] sm:px-[48px] mb-[8px]">
                {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
                    <div
                        key={i}
                        className="flex-1 h-[3px] rounded-full overflow-hidden"
                        style={{ background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }}
                    >
                        <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                                width: i < step ? '100%' : '0%',
                                background: 'linear-gradient(to right, #5240c9, #7255e0)',
                            }}
                        />
                    </div>
                ))}
            </div>

            {/* ── Animated step content ── */}
            <div className="flex-1 flex items-start sm:items-center justify-center px-[20px] py-[24px] overflow-y-auto">
                <div
                    className="w-full max-w-[580px]"
                    style={{
                        opacity: visible ? 1 : 0,
                        transform: visible
                            ? 'translateY(0px)'
                            : goingForward ? 'translateY(18px)' : 'translateY(-18px)',
                        transition: 'opacity 0.18s ease, transform 0.18s ease',
                    }}
                >
                    {/* Step header */}
                    <div className="text-center mb-[28px]">
                        <div className="text-[48px] leading-none mb-[14px]">{current.emoji}</div>
                        <h1 className="text-[26px] sm:text-[30px] font-bold leading-tight mb-[10px]" style={{ color: textColor }}>
                            {current.title}
                        </h1>
                        <p className="text-[14px] sm:text-[15px] leading-[1.65] max-w-[440px] mx-auto" style={{ color: mutedColor }}>
                            {current.subtitle}
                        </p>
                    </div>

                    {/* ── Card ── */}
                    <div
                        className="rounded-[24px] p-[24px] sm:p-[32px] mb-[20px]"
                        style={{
                            background: cardBg,
                            border: cardBorder,
                            boxShadow: isDark ? '0 12px 56px rgba(0,0,0,0.55)' : '0 12px 56px rgba(0,0,0,0.10)',
                        }}
                    >

                        {/* ════ STEP 1: Due Date ════ */}
                        {step === 1 && (
                            <div className="flex flex-col gap-[12px]">
                                <div className="grid grid-cols-2 gap-[10px]">
                                    {DATE_PRESETS.map((preset) => {
                                        const isCustom = preset.label === 'Custom';
                                        const isActive = dueDatePreset === preset.label;
                                        return (
                                            <button
                                                key={preset.label}
                                                onClick={() => {
                                                    setDueDatePreset(preset.label);
                                                    if (isCustom) {
                                                        setShowDatePicker(true);
                                                    } else {
                                                        setShowDatePicker(false);
                                                        const d = new Date();
                                                        d.setMonth(d.getMonth() + preset.months);
                                                        d.setDate(d.getDate() + preset.days);
                                                        setDueDate(d.toISOString().split('T')[0]);
                                                    }
                                                }}
                                                className="flex flex-col items-start rounded-[14px] px-[18px] py-[14px] text-left transition-all active:scale-[0.97]"
                                                style={isActive ? chipOn : chipOff}
                                            >
                                                <span className="text-[15px] font-semibold">{preset.label}</span>
                                                <span className="text-[12px] mt-[3px] opacity-60">{preset.sub}</span>
                                            </button>
                                        );
                                    })}
                                </div>

                                {showDatePicker && (
                                    <div className="flex flex-col gap-[8px] pt-[4px]">
                                        <label className="text-[12px] font-medium tracking-[0.8px]" style={{ color: mutedColor }}>
                                            PICK YOUR DATE
                                        </label>
                                        <input
                                            type="date"
                                            value={dueDate}
                                            onChange={(e) => setDueDate(e.target.value)}
                                            className="w-full rounded-[12px] px-[16px] h-[48px] text-[14px] outline-none"
                                            style={inputStyle}
                                        />
                                    </div>
                                )}

                                {dueDatePreset && dueDatePreset !== 'Custom' && dueDate && (
                                    <p className="text-[13px] text-center pt-[4px]" style={{ color: mutedColor }}>
                                        Target date: <span className="font-medium" style={{ color: textColor }}>
                                            {new Date(dueDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                                        </span>
                                    </p>
                                )}
                            </div>
                        )}

                        {/* ════ STEP 2: Logo ════ */}
                        {step === 2 && (
                            <div className="flex flex-col gap-[16px]">
                                <label
                                    className="flex flex-col items-center justify-center gap-[14px] rounded-[18px] cursor-pointer transition-all hover:opacity-80 active:scale-[0.99]"
                                    style={{
                                        minHeight: '180px',
                                        background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                                        border: isDark ? '1.5px dashed rgba(255,255,255,0.14)' : '1.5px dashed rgba(0,0,0,0.14)',
                                    }}
                                >
                                    {logoPreview ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img
                                            src={logoPreview}
                                            alt="Logo preview"
                                            className="max-h-[130px] max-w-[220px] object-contain rounded-[10px]"
                                        />
                                    ) : (
                                        <>
                                            <div className="w-[52px] h-[52px] rounded-[16px] flex items-center justify-center text-[24px]"
                                                style={{ background: isDark ? 'rgba(114,85,224,0.12)' : 'rgba(114,85,224,0.09)', border: '1px solid rgba(114,85,224,0.2)' }}>
                                                🖼️
                                            </div>
                                            <div className="text-center">
                                                <p className="text-[14px] font-medium" style={{ color: textColor }}>Click to upload your logo</p>
                                                <p className="text-[12px] mt-[4px]" style={{ color: mutedColor }}>PNG, SVG, JPG — any size</p>
                                            </div>
                                        </>
                                    )}
                                    <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (!file) return;
                                        if (!file.type.startsWith('image/') || file.size > 10 * 1024 * 1024) { setSaveError('Choose an image smaller than 10 MB.'); return; }
                                        setSaveError('');
                                        setLogoFile(file);
                                        setLogoPreview(URL.createObjectURL(file));
                                    }} />
                                </label>

                                {logoPreview && (
                                    <div className="flex items-center justify-between">
                                        <p className="text-[13px] font-medium" style={{ color: textColor }}>Logo selected ✓</p>
                                        <button
                                            onClick={() => { setLogoFile(null); setLogoPreview(null); setSavedLogoUrl(null); }}
                                            className="text-[13px] transition-opacity hover:opacity-70"
                                            style={{ color: mutedColor }}
                                        >
                                            Remove
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* ════ STEP 3: Platform ════ */}
                        {step === 3 && (
                            <div className="grid grid-cols-2 gap-[10px]">
                                {PLATFORMS.map((p) => (
                                    <button
                                        key={p.id}
                                        onClick={() => setPlatform(p.id)}
                                        className="flex flex-col items-start rounded-[14px] px-[16px] py-[14px] text-left transition-all active:scale-[0.97]"
                                        style={platform === p.id ? chipOn : chipOff}
                                    >
                                        <div className="flex items-center gap-[8px] mb-[4px]">
                                            <span className="text-[18px] leading-none">{p.emoji}</span>
                                            <span className="text-[14px] font-semibold">{p.label}</span>
                                        </div>
                                        <span className="text-[12px] opacity-60 leading-[1.4]">{p.desc}</span>
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* ════ STEP 4: Subpages ════ */}
                        {step === 4 && (
                            <div className="flex flex-col gap-[18px]">
                                <div className="flex flex-wrap gap-[8px]">
                                    {SUBPAGES.map((page) => {
                                        const active = selectedSubpages.includes(page.id);
                                        return (
                                            <button
                                                key={page.id}
                                                onClick={() => toggleSubpage(page.id)}
                                                className="flex items-center gap-[6px] px-[14px] h-[40px] rounded-[12px] text-[13px] font-medium transition-all active:scale-[0.97]"
                                                style={active ? chipOn : chipOff}
                                            >
                                                <span>{page.emoji}</span>
                                                <span>{page.label}</span>
                                                {active && <span className="opacity-70 text-[11px] ml-[1px]">✓</span>}
                                            </button>
                                        );
                                    })}
                                </div>

                                <div className="flex gap-[8px]">
                                    <input
                                        type="text"
                                        value={customSubpage}
                                        onChange={(e) => setCustomSubpage(e.target.value)}
                                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustomSubpage(); } }}
                                        placeholder="Need a custom page? Add it here..."
                                        className="flex-1 rounded-[12px] px-[14px] h-[42px] text-[13px] outline-none"
                                        style={inputStyle}
                                    />
                                    <button
                                        onClick={addCustomSubpage}
                                        className="px-[16px] h-[42px] rounded-[12px] text-[13px] font-semibold transition-opacity hover:opacity-80"
                                        style={{ background: 'rgba(114,85,224,0.15)', color: '#7255e0', border: '1px solid rgba(114,85,224,0.25)' }}
                                    >
                                        Add
                                    </button>
                                </div>

                                {selectedSubpages.length > 0 && (
                                    <p className="text-[12px]" style={{ color: mutedColor }}>
                                        {selectedSubpages.length} page{selectedSubpages.length !== 1 ? 's' : ''} selected
                                    </p>
                                )}
                            </div>
                        )}

                        {/* ════ STEP 5: Budget & Payment ════ */}
                        {step === 5 && (
                            <div className="flex flex-col gap-[24px]">
                                <div className="flex flex-col gap-[10px]">
                                    <p className="text-[12px] font-semibold tracking-[0.8px]" style={{ color: mutedColor }}>ESTIMATED BUDGET</p>
                                    <div className="flex flex-col gap-[8px]">
                                        {BUDGETS.map((b) => (
                                            <button
                                                key={b.id}
                                                onClick={() => setBudget(b.id)}
                                                className="flex items-center justify-between rounded-[14px] px-[18px] py-[14px] text-left transition-all active:scale-[0.99]"
                                                style={budget === b.id ? chipOn : chipOff}
                                            >
                                                <span className="text-[15px] font-semibold">{b.label}</span>
                                                <span className="text-[12px] opacity-60">{b.desc}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="flex flex-col gap-[10px]">
                                    <p className="text-[12px] font-semibold tracking-[0.8px]" style={{ color: mutedColor }}>HOW WOULD YOU LIKE TO PAY?</p>
                                    <div className="grid grid-cols-2 gap-[8px]">
                                        {PAYMENT_PLANS.map((p) => (
                                            <button
                                                key={p.id}
                                                onClick={() => setPaymentPlan(p.id)}
                                                className="flex flex-col items-start rounded-[14px] px-[16px] py-[14px] text-left transition-all active:scale-[0.97]"
                                                style={paymentPlan === p.id ? chipOn : chipOff}
                                            >
                                                <div className="flex items-center gap-[8px] mb-[4px]">
                                                    <span className="text-[18px] leading-none">{p.emoji}</span>
                                                    <span className="text-[14px] font-semibold">{p.label}</span>
                                                </div>
                                                <span className="text-[12px] opacity-60 leading-[1.4]">{p.desc}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ════ STEP 6: Maintenance ════ */}
                        {step === 6 && (
                            <div className="flex flex-col gap-[10px]">
                                {MAINTENANCE_OPTIONS.map((opt) => (
                                    <button
                                        key={opt.id}
                                        onClick={() => setMaintenance(opt.id)}
                                        className="flex items-center gap-[16px] rounded-[16px] px-[20px] py-[16px] text-left transition-all active:scale-[0.99]"
                                        style={maintenance === opt.id ? chipOn : chipOff}
                                    >
                                        <span className="text-[26px] leading-none flex-shrink-0">{opt.emoji}</span>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-baseline gap-[8px] flex-wrap">
                                                <span className="text-[15px] font-semibold">{opt.label}</span>
                                                <span className="text-[12px] opacity-60">{opt.sublabel}</span>
                                            </div>
                                            <p className="text-[12px] mt-[3px] opacity-60 leading-[1.5]">{opt.desc}</p>
                                        </div>
                                        {maintenance === opt.id && (
                                            <span className="text-[18px] flex-shrink-0">✓</span>
                                        )}
                                    </button>
                                ))}
                            </div>
                        )}

                    </div>

                    {/* ── Navigation ── */}
                    <div className="flex items-center gap-[10px]">
                        {step > 1 && (
                            <button
                                onClick={() => navigate(step - 1)} disabled={savingStep || submitting || !visible}
                                className="h-[50px] px-[20px] rounded-[14px] text-[14px] font-medium transition-opacity hover:opacity-70 flex-shrink-0"
                                style={{
                                    background: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)',
                                    color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.55)',
                                    border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.07)',
                                }}
                            >
                                ← Back
                            </button>
                        )}

                        {current.optional && (
                            <button
                                onClick={handleSkip} disabled={savingStep || submitting || !visible}
                                className="h-[50px] px-[20px] rounded-[14px] text-[14px] font-medium transition-opacity hover:opacity-70 flex-shrink-0"
                                style={{
                                    background: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)',
                                    color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.55)',
                                    border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.07)',
                                }}
                            >
                                Skip for now
                            </button>
                        )}

                        <button
                            onClick={handleNext}
                            disabled={!canProceed() || submitting || savingStep || logoUploading || !visible}
                            className="flex-1 h-[50px] rounded-[14px] text-[15px] font-semibold transition-all hover:opacity-90 disabled:opacity-35 active:scale-[0.98]"
                            style={{
                                background: 'radial-gradient(ellipse 80% 110% at 50% -5%, #251470 0%, #3e28a8 40%, #5c3ecc 70%, #7255e0 100%)',
                                color: '#ffffff',
                                boxShadow: '0 4px 24px rgba(82,56,200,0.40)',
                                border: '1px solid rgba(255,255,255,0.12)',
                            }}
                        >
                            {submitting || logoUploading
                                ? '⏳ Saving...'
                                : step === TOTAL_STEPS
                                ? '🎉 Submit Project'
                                : 'Continue →'}
                        </button>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default DASHBOARDClientProjectSetup;
