"use client";

import { useEffect, useState } from 'react';
import { getAuth, signOut } from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../firebaseConfig';
import DashboardAdminSideNav from './DashboardAdminSideNav';
import Image from 'next/image';
import Link from 'next/link';
import NotificationBell from './NotificationBell';

const AVATARS = Array.from({ length: 24 }, (_, i) => `Avatar ${i + 1}.png`);
const DEFAULT_BIO = "Building the web, one project at a time. ⚡";

interface AdminProfile {
    selectedAvatar: string | null;
    firstName: string;
    lastName: string;
    email: string;
    phoneNumber: string;
    bio: string;
    title: string;
}

// ── Outside component to prevent remount-on-render focus loss ────────────────
const Field = ({
    label, value, field, multiline = false, readOnly = false,
    isEditing, draft, onChange,
}: {
    label: string; value: string; field: keyof AdminProfile;
    multiline?: boolean; readOnly?: boolean;
    isEditing: boolean; draft: AdminProfile | null;
    onChange: (field: keyof AdminProfile, val: string) => void;
}) => (
    <div className="flex flex-col gap-[6px]">
        <label className="text-[11px] opacity-40 uppercase tracking-wider font-light">{label}</label>
        {isEditing && !readOnly ? (
            multiline ? (
                <textarea
                    value={draft?.[field] as string ?? ''}
                    onChange={e => onChange(field, e.target.value)}
                    rows={3}
                    className="bg-white/5 border border-white/10 rounded-[10px] px-[14px] py-[10px] text-[14px] font-light focus:outline-none focus:ring-1 focus:ring-[#725CF7] resize-none placeholder:opacity-30"
                    placeholder={`Add a ${label.toLowerCase()}...`}
                />
            ) : (
                <input
                    type="text"
                    value={draft?.[field] as string ?? ''}
                    onChange={e => onChange(field, e.target.value)}
                    className="bg-white/5 border border-white/10 rounded-[10px] px-[14px] py-[10px] text-[14px] font-light focus:outline-none focus:ring-1 focus:ring-[#725CF7] placeholder:opacity-30"
                    placeholder={`Enter ${label.toLowerCase()}...`}
                />
            )
        ) : (
            <p className={`text-[14px] font-light leading-relaxed ${value ? 'opacity-90' : 'opacity-25 italic'}`}>
                {value || 'Not set'}
            </p>
        )}
    </div>
);

const DASHBOARDAdminProfile = () => {
    const [profile, setProfile] = useState<AdminProfile>({
        selectedAvatar: null,
        firstName: '',
        lastName: '',
        email: '',
        phoneNumber: '',
        bio: DEFAULT_BIO,
        title: '',
    });
    const [draft, setDraft] = useState<AdminProfile | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [isAvatarOpen, setIsAvatarOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [savedMsg, setSavedMsg] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchProfile = async () => {
            const user = auth.currentUser;
            if (!user) return;
            try {
                const snap = await getDoc(doc(db, 'users', user.uid));
                if (snap.exists()) {
                    const d = snap.data();
                    setProfile({
                        selectedAvatar: d.selectedAvatar || null,
                        firstName: d.firstName || '',
                        lastName: d.lastName || '',
                        email: user.email || d.email || '',
                        phoneNumber: d.phoneNumber ? String(d.phoneNumber) : '',
                        bio: d.bio || DEFAULT_BIO,
                        title: d.title || '',
                    });
                }
            } catch (e) { console.error(e); }
            finally { setLoading(false); }
        };
        fetchProfile();
    }, []);

    const startEdit = () => { setDraft({ ...profile }); setIsEditing(true); };
    const cancelEdit = () => { setIsEditing(false); setDraft(null); };

    const saveChanges = async () => {
        if (!draft) return;
        const user = auth.currentUser;
        if (!user) return;
        setSaving(true);
        try {
            await updateDoc(doc(db, 'users', user.uid), {
                firstName: draft.firstName,
                lastName: draft.lastName,
                phoneNumber: draft.phoneNumber,
                bio: draft.bio,
                title: draft.title,
            });
            setProfile(draft);
            setIsEditing(false);
            setDraft(null);
            setSavedMsg(true);
            setTimeout(() => setSavedMsg(false), 2500);
        } catch (e) { console.error(e); }
        finally { setSaving(false); }
    };

    const saveAvatar = async (av: string) => {
        const user = auth.currentUser;
        if (!user) return;
        try {
            await updateDoc(doc(db, 'users', user.uid), { selectedAvatar: av });
            setProfile(prev => ({ ...prev, selectedAvatar: av }));
            if (draft) setDraft(prev => prev ? { ...prev, selectedAvatar: av } : prev);
            setIsAvatarOpen(false);
            setSavedMsg(true);
            setTimeout(() => setSavedMsg(false), 2500);
        } catch (e) { console.error(e); }
    };

    const handleFieldChange = (field: keyof AdminProfile, val: string) =>
        setDraft(prev => prev ? { ...prev, [field]: val } : prev);

    const current = isEditing && draft ? draft : profile;

    if (loading) {
        return (
            <div className="flex flex-col xl:flex-row h-screen DashboardBackgroundGradient overflow-hidden">
                <DashboardAdminSideNav highlight="none" />
                <div className="flex-1 flex items-center justify-center pt-[60px] xl:pt-0">
                    <p className="opacity-40 font-light text-[14px]">Loading profile...</p>
                </div>
            </div>
        );
    }

    return (
        <>
            {/* ── Avatar Picker Modal ── */}
            {isAvatarOpen && (
                <div
                    className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm flex items-center justify-center p-[16px] sm:p-[24px]"
                    onClick={() => setIsAvatarOpen(false)}
                >
                    <div
                        className="w-full max-w-[580px] BlackGradient ContentCardShadow rounded-[28px] px-[24px] sm:px-[32px] py-[28px] flex flex-col gap-[20px]"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-[20px] font-semibold">Choose Your Avatar</h2>
                                <p className="text-[12px] opacity-40 mt-[2px]">Pick a look that represents you</p>
                            </div>
                            <button
                                onClick={() => setIsAvatarOpen(false)}
                                className="w-[32px] h-[32px] rounded-full BlackWithLightGradient ContentCardShadow flex items-center justify-center opacity-60 hover:opacity-100 text-[16px]"
                            >✕</button>
                        </div>
                        <div className="grid grid-cols-6 sm:grid-cols-8 gap-[10px] max-h-[340px] overflow-y-auto">
                            {AVATARS.map(av => (
                                <button
                                    key={av}
                                    onClick={() => saveAvatar(av)}
                                    className={`relative rounded-full overflow-hidden transition-all duration-200 ${
                                        profile.selectedAvatar === av
                                            ? 'ring-2 ring-[#725CF7] ring-offset-2 ring-offset-black scale-110'
                                            : 'opacity-60 hover:opacity-100 hover:scale-105'
                                    }`}
                                >
                                    <Image src={`/${av}`} alt={av} layout="responsive" width={0} height={0} />
                                    {profile.selectedAvatar === av && (
                                        <div className="absolute inset-0 flex items-center justify-center bg-[#725CF7]/30 rounded-full">
                                            <span className="text-[12px] font-bold">✓</span>
                                        </div>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            <div className="flex flex-col xl:flex-row h-screen DashboardBackgroundGradient overflow-hidden">
                <DashboardAdminSideNav highlight="none" />

                <div className="flex-1 flex flex-col pt-[60px] xl:pt-0 min-h-0 overflow-hidden">
                    <div className="absolute BottomGradientBorder left-0 top-[103px] w-full" />

                    {/* Top Bar */}
                    <div className="flex items-center justify-between px-[20px] sm:px-[50px] py-6 flex-shrink-0">
                        <div className="inline-flex items-center gap-[5px]">
                            <div className="inline-flex items-center gap-[5px] opacity-40">
                                <div className="w-[15px]">
                                    <Image src="/Home Icon.png" alt="Home" layout="responsive" width={0} height={0} />
                                </div>
                                <div className="font-light text-sm hidden sm:block">Admin</div>
                            </div>
                            <div className="font-light text-sm">/ Profile</div>
                        </div>
                        <div className="inline-flex items-center gap-3">
                            <NotificationBell />
                            <Link href="/dashboard/settings" className="hidden sm:flex w-[129px] h-[55px] items-center justify-center gap-2.5 rounded-[15px] BlackGradient ContentCardShadow">
                                <div className="font-light text-sm">Settings</div>
                                <div className="w-[30px]">
                                    <Image src="/Settings Icon.png" alt="Settings" layout="responsive" width={0} height={0} />
                                </div>
                            </Link>
                        </div>
                    </div>

                    {/* Scrollable Content */}
                    <div className="flex-1 overflow-y-auto px-[20px] sm:px-[50px] pt-[30px] pb-[40px]">

                        {/* ── Hero Banner ── */}
                        <div className="relative BlackGradient ContentCardShadow rounded-[24px] px-[24px] sm:px-[40px] py-[32px] mb-[20px] overflow-hidden">
                            <div className="absolute -top-[60px] -right-[60px] w-[300px] h-[300px] bg-[#725CF7]/10 rounded-full blur-[80px] pointer-events-none" />
                            <div className="absolute -bottom-[40px] -left-[40px] w-[200px] h-[200px] bg-[#6265f0]/8 rounded-full blur-[60px] pointer-events-none" />

                            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-[24px] relative z-10">

                                {/* Avatar */}
                                <div className="relative flex-shrink-0">
                                    <div className="w-[88px] h-[88px] sm:w-[108px] sm:h-[108px] rounded-full overflow-hidden ring-2 ring-[#725CF7]/60 ring-offset-2 ring-offset-[#0a0a0a] shadow-[0_0_36px_rgba(114,92,247,0.25)]">
                                        {current.selectedAvatar ? (
                                            <Image src={`/${current.selectedAvatar}`} alt="Avatar" layout="responsive" width={0} height={0} />
                                        ) : (
                                            <div className="w-full h-full BlackWithLightGradient flex items-center justify-center">
                                                <span className="text-[36px] opacity-40">👤</span>
                                            </div>
                                        )}
                                    </div>
                                    <button
                                        onClick={() => setIsAvatarOpen(true)}
                                        className="absolute -bottom-[2px] -right-[2px] w-[28px] h-[28px] rounded-full PopupAttentionGradient PopupAttentionShadow flex items-center justify-center text-[11px] hover:scale-110 transition-transform"
                                        title="Change avatar"
                                    >✏️</button>
                                </div>

                                {/* Info */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex flex-wrap items-center gap-[10px] mb-[6px]">
                                        <h1 className="text-[22px] sm:text-[26px] font-semibold leading-tight">
                                            {current.firstName || 'Admin'} {current.lastName}
                                        </h1>
                                        <span className="flex items-center gap-[5px] bg-[#725CF7]/25 border border-[#725CF7]/40 px-[10px] py-[3px] rounded-full text-[10px] text-[#c4baff] font-semibold whitespace-nowrap tracking-wide">
                                            ⚡ Lucidify Admin
                                        </span>
                                    </div>
                                    <p className="text-[13px] opacity-55 font-light mb-[14px] leading-relaxed max-w-[480px]">{current.bio}</p>
                                    <div className="flex flex-wrap gap-[14px]">
                                        {current.title && (
                                            <span className="flex items-center gap-[5px] text-[12px] opacity-45 font-light">
                                                🎯 {current.title}
                                            </span>
                                        )}
                                        {current.email && (
                                            <span className="flex items-center gap-[5px] text-[12px] opacity-45 font-light">
                                                ✉️ {current.email}
                                            </span>
                                        )}
                                        {current.phoneNumber && (
                                            <span className="flex items-center gap-[5px] text-[12px] opacity-45 font-light">
                                                📞 {current.phoneNumber}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Edit controls */}
                                <div className="flex items-center gap-[10px] flex-shrink-0">
                                    {savedMsg && (
                                        <span className="text-[12px] text-green-400 font-medium">✓ Saved!</span>
                                    )}
                                    {isEditing ? (
                                        <>
                                            <button
                                                onClick={cancelEdit}
                                                className="px-[16px] py-[8px] rounded-[10px] BlackWithLightGradient ContentCardShadow text-[13px] font-light opacity-60 hover:opacity-100"
                                            >Cancel</button>
                                            <button
                                                onClick={saveChanges}
                                                disabled={saving}
                                                className="px-[18px] py-[8px] rounded-[10px] PopupAttentionGradient PopupAttentionShadow text-[13px] font-medium disabled:opacity-40"
                                            >{saving ? 'Saving...' : 'Save Changes'}</button>
                                        </>
                                    ) : (
                                        <button
                                            onClick={startEdit}
                                            className="flex items-center gap-[8px] px-[16px] py-[8px] rounded-[10px] BlackWithLightGradient ContentCardShadow text-[13px] font-light hover:opacity-80 transition-opacity"
                                        >
                                            <span>Edit Profile</span>
                                            <span className="opacity-40 text-[12px]">✏️</span>
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* ── Details Grid ── */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-[16px] mb-[16px]">

                            {/* Personal Info */}
                            <div className="BlackGradient ContentCardShadow rounded-[20px] px-[24px] sm:px-[28px] py-[24px] flex flex-col gap-[20px]">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h2 className="text-[15px] font-semibold">Personal Info</h2>
                                        <p className="text-[11px] opacity-40 mt-[2px]">Your account details</p>
                                    </div>
                                    <div className="w-[34px] h-[34px] rounded-[10px] bg-[#725CF7]/15 border border-[#725CF7]/20 flex items-center justify-center text-[15px]">👤</div>
                                </div>
                                <div className="h-[1px] bg-white/[0.06]" />
                                <div className="flex flex-col gap-[16px]">
                                    <div className="grid grid-cols-2 gap-[14px]">
                                        <Field label="First Name" value={current.firstName} field="firstName" isEditing={isEditing} draft={draft} onChange={handleFieldChange} />
                                        <Field label="Last Name" value={current.lastName} field="lastName" isEditing={isEditing} draft={draft} onChange={handleFieldChange} />
                                    </div>
                                    <Field label="Email Address" value={current.email} field="email" readOnly isEditing={isEditing} draft={draft} onChange={handleFieldChange} />
                                    <Field label="Phone Number" value={current.phoneNumber} field="phoneNumber" isEditing={isEditing} draft={draft} onChange={handleFieldChange} />
                                    <Field label="Bio" value={current.bio} field="bio" multiline isEditing={isEditing} draft={draft} onChange={handleFieldChange} />
                                </div>
                            </div>

                            {/* Role Info */}
                            <div className="BlackGradient ContentCardShadow rounded-[20px] px-[24px] sm:px-[28px] py-[24px] flex flex-col gap-[20px]">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h2 className="text-[15px] font-semibold">Role & Access</h2>
                                        <p className="text-[11px] opacity-40 mt-[2px]">Your position at Lucidify</p>
                                    </div>
                                    <div className="w-[34px] h-[34px] rounded-[10px] bg-[#725CF7]/15 border border-[#725CF7]/20 flex items-center justify-center text-[15px]">⚡</div>
                                </div>
                                <div className="h-[1px] bg-white/[0.06]" />
                                <div className="flex flex-col gap-[16px]">
                                    <Field label="Job Title" value={current.title} field="title" isEditing={isEditing} draft={draft} onChange={handleFieldChange} />
                                    {/* Read-only role badge */}
                                    <div className="flex flex-col gap-[6px]">
                                        <label className="text-[11px] opacity-40 uppercase tracking-wider font-light">Access Level</label>
                                        <div className="flex items-center gap-[8px]">
                                            <span className="flex items-center gap-[6px] bg-[#725CF7]/20 border border-[#725CF7]/30 px-[12px] py-[5px] rounded-full text-[12px] text-[#c4baff] font-medium">
                                                ⚡ Administrator
                                            </span>
                                            <span className="text-[11px] opacity-30 font-light">Full access</span>
                                        </div>
                                    </div>
                                    <div className="flex flex-col gap-[6px]">
                                        <label className="text-[11px] opacity-40 uppercase tracking-wider font-light">Permissions</label>
                                        <div className="flex flex-wrap gap-[6px]">
                                            {['Manage Projects', 'Upload Designs', 'Control Progress', 'View All Clients'].map(p => (
                                                <span key={p} className="text-[11px] opacity-50 font-light bg-white/5 border border-white/10 px-[10px] py-[4px] rounded-full">{p}</span>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* ── Avatar Grid Card ── */}
                        <div className="BlackGradient ContentCardShadow rounded-[20px] px-[24px] sm:px-[28px] py-[24px] mb-[16px] flex flex-col gap-[20px]">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h2 className="text-[15px] font-semibold">Your Avatar</h2>
                                    <p className="text-[11px] opacity-40 mt-[2px]">Click any avatar to switch instantly</p>
                                </div>
                                <div className="w-[34px] h-[34px] rounded-[10px] bg-[#725CF7]/15 border border-[#725CF7]/20 flex items-center justify-center text-[15px]">✨</div>
                            </div>
                            <div className="h-[1px] bg-white/[0.06]" />
                            <div className="grid grid-cols-8 sm:grid-cols-12 gap-[8px] sm:gap-[10px]">
                                {AVATARS.map(av => (
                                    <button
                                        key={av}
                                        onClick={() => saveAvatar(av)}
                                        title={av.replace('.png', '')}
                                        className={`relative rounded-full overflow-hidden transition-all duration-200 ${
                                            profile.selectedAvatar === av
                                                ? 'ring-2 ring-[#725CF7] ring-offset-2 ring-offset-black scale-[1.12] shadow-[0_0_12px_rgba(114,92,247,0.4)]'
                                                : 'opacity-45 hover:opacity-90 hover:scale-105'
                                        }`}
                                    >
                                        <Image src={`/${av}`} alt={av} layout="responsive" width={0} height={0} />
                                        {profile.selectedAvatar === av && (
                                            <div className="absolute inset-0 flex items-center justify-center bg-[#725CF7]/20 rounded-full">
                                                <span className="text-[10px] font-bold drop-shadow">✓</span>
                                            </div>
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* ── Account Card ── */}
                        <div className="BlackGradient ContentCardShadow rounded-[20px] px-[24px] sm:px-[28px] py-[24px] flex flex-col gap-[16px]">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h2 className="text-[15px] font-semibold">Account</h2>
                                    <p className="text-[11px] opacity-40 mt-[2px]">Manage your account access</p>
                                </div>
                                <div className="w-[34px] h-[34px] rounded-[10px] bg-red-500/10 border border-red-500/15 flex items-center justify-center text-[15px]">🔐</div>
                            </div>
                            <div className="h-[1px] bg-white/[0.06]" />
                            <div className="flex flex-wrap items-center gap-[12px]">
                                <div className="flex flex-col gap-[2px]">
                                    <p className="text-[13px] font-light opacity-70">Signed in as <span className="opacity-100 font-medium">{current.email}</span></p>
                                    <p className="text-[11px] opacity-30 font-light">Admin account secured through Firebase Authentication</p>
                                </div>
                                <button
                                    onClick={() => { const a = getAuth(); signOut(a).then(() => { window.location.href = '/login'; }); }}
                                    className="ml-auto flex items-center gap-[8px] px-[18px] py-[9px] rounded-[12px] bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 transition-colors text-red-400 text-[13px] font-medium"
                                >
                                    Sign Out
                                </button>
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        </>
    );
};

export default DASHBOARDAdminProfile;
