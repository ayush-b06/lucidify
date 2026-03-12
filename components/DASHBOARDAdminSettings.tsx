"use client";

import { useEffect, useState } from 'react';
import { getAuth, signOut, sendPasswordResetEmail, deleteUser } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { doc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import DashboardAdminSideNav from './DashboardAdminSideNav';
import Image from 'next/image';
import Link from 'next/link';
import NotificationBell from './NotificationBell';

const DASHBOARDAdminSettings = () => {
    const [showLogoutPopup, setShowLogoutPopup] = useState(false);
    const [showDeletePopup, setShowDeletePopup] = useState(false);
    const [resetEmailSent, setResetEmailSent] = useState(false);
    const [resetLoading, setResetLoading] = useState(false);
    const auth = getAuth();
    const router = useRouter();

    useEffect(() => {
        const user = auth.currentUser;
        if (!user) { router.push('/login'); }
    }, [auth, router]);

    const handleLogOut = async () => {
        await signOut(auth);
        router.push('/login');
    };

    const handlePasswordReset = async () => {
        const user = auth.currentUser;
        if (!user?.email) return;
        setResetLoading(true);
        try {
            await sendPasswordResetEmail(auth, user.email);
            setResetEmailSent(true);
        } catch (e) {
            console.error(e);
        } finally {
            setResetLoading(false);
        }
    };

    const handleDeleteAccount = async () => {
        const user = auth.currentUser;
        if (!user) return;
        try {
            await deleteDoc(doc(db, 'users', user.uid));
            await deleteUser(user);
            router.push('/');
        } catch (e) {
            console.error(e);
        }
    };

    return (
        <div className="flex flex-col xl:flex-row h-screen DashboardBackgroundGradient overflow-hidden relative">
            <DashboardAdminSideNav highlight="none" />

            <div className="flex-1 flex flex-col pt-[60px] xl:pt-0 min-h-0 overflow-hidden">
                {/* Top bar border */}
                <div className="absolute BottomGradientBorder left-0 top-[103px] w-full" />

                {/* Top bar */}
                <div className="flex items-center justify-between px-[20px] sm:px-[50px] py-6 flex-shrink-0">
                    <div className="inline-flex items-center gap-[5px]">
                        <div className="inline-flex items-center gap-[5px] opacity-40">
                            <div className="w-[15px]">
                                <Image src="/Home Icon.png" alt="Home Icon" layout="responsive" width={0} height={0} />
                            </div>
                            <div className="font-light text-sm">Home</div>
                        </div>
                        <div className="font-light text-sm">/ Settings</div>
                    </div>
                    <div className="inline-flex items-center gap-5">
                        <NotificationBell />
                        <Link href="/dashboard/settings" className="flex w-[129px] h-[55px] items-center justify-center gap-2.5 rounded-[15px] BlackGradient ContentCardShadow">
                            <div className="font-light text-sm">Settings</div>
                            <div className="w-[30px]">
                                <Image src="/Settings Icon.png" alt="Settings Icon" layout="responsive" width={0} height={0} />
                            </div>
                        </Link>
                    </div>
                </div>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto px-[20px] sm:px-[50px] pt-[30px] pb-[40px]">
                    <div className="mb-[28px]">
                        <h1 className="text-[28px] font-semibold mb-[4px]">Settings</h1>
                        <p className="text-[14px] font-light opacity-50">Manage your admin account preferences.</p>
                    </div>

                    <div className="flex flex-col gap-[14px] max-w-[680px]">

                        {/* Security */}
                        <div className="BlackGradient ContentCardShadow rounded-[20px] px-[24px] sm:px-[30px] py-[24px]">
                            <h2 className="text-[16px] font-semibold mb-[3px]">Security</h2>
                            <p className="text-[12px] opacity-40 font-light mb-[20px]">Manage your admin account security.</p>
                            <div className="flex items-center justify-between gap-[20px]">
                                <div>
                                    <div className="text-[14px] font-light">Password Reset</div>
                                    <div className="text-[12px] opacity-35 font-light mt-[2px]">
                                        {resetEmailSent ? 'Reset email sent — check your inbox.' : 'Send a password reset link to your email.'}
                                    </div>
                                </div>
                                <button
                                    onClick={handlePasswordReset}
                                    disabled={resetLoading || resetEmailSent}
                                    className="flex-shrink-0 px-[16px] py-[8px] BlackWithLightGradient ContentCardShadow rounded-[10px] text-[13px] font-light disabled:opacity-40 active:scale-95 transition-transform whitespace-nowrap"
                                >
                                    {resetLoading ? 'Sending...' : resetEmailSent ? 'Email Sent ✓' : 'Send Reset Email'}
                                </button>
                            </div>
                        </div>

                        {/* Log Out */}
                        <div className="BlackGradient ContentCardShadow rounded-[20px] px-[24px] sm:px-[30px] py-[24px]">
                            <div className="flex items-center justify-between gap-[20px]">
                                <div>
                                    <div className="text-[14px] font-light">Log Out</div>
                                    <div className="text-[12px] opacity-35 font-light mt-[2px]">Sign out of your Lucidify Admin account.</div>
                                </div>
                                <button
                                    onClick={() => setShowLogoutPopup(true)}
                                    className="flex-shrink-0 px-[16px] py-[8px] LogoutGradient ContentCardShadow rounded-[10px] text-[13px] font-light active:scale-95 transition-transform whitespace-nowrap"
                                >
                                    Log Out
                                </button>
                            </div>
                        </div>

                        {/* Danger Zone */}
                        <div className="rounded-[20px] px-[24px] sm:px-[30px] py-[24px] border border-red-500/20 bg-red-500/5">
                            <h2 className="text-[16px] font-semibold mb-[3px] text-red-400">Danger Zone</h2>
                            <p className="text-[12px] opacity-40 font-light mb-[20px]">Permanent actions that cannot be undone.</p>
                            <div className="flex items-center justify-between gap-[20px]">
                                <div>
                                    <div className="text-[14px] font-light">Delete Account</div>
                                    <div className="text-[12px] opacity-35 font-light mt-[2px]">Permanently remove this admin account and all associated data.</div>
                                </div>
                                <button
                                    onClick={() => setShowDeletePopup(true)}
                                    className="flex-shrink-0 px-[16px] py-[8px] bg-red-500/15 border border-red-500/30 rounded-[10px] text-[13px] font-light text-red-400 active:scale-95 transition-transform whitespace-nowrap hover:bg-red-500/25"
                                >
                                    Delete Account
                                </button>
                            </div>
                        </div>

                    </div>
                </div>
            </div>

            {/* Logout Popup */}
            <div className={`ease-in-out duration-300 fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center transition-opacity ${showLogoutPopup ? 'opacity-100 visible' : 'opacity-0 invisible pointer-events-none'}`}>
                <div className={`ContentCardShadow BlackGradient rounded-[20px] p-[30px] w-[300px] flex flex-col items-center gap-[24px] transition-all duration-300 ${showLogoutPopup ? 'translate-y-0 opacity-100' : '-translate-y-[30px] opacity-0'}`}>
                    <h2 className="text-[17px] font-semibold text-center">Are you sure you want to log out?</h2>
                    <div className="flex gap-[12px] w-full">
                        <button onClick={handleLogOut} className="flex-1 py-[10px] AddProjectGradient ContentCardShadow text-[13px] font-light rounded-[10px] active:scale-95">Yes, Log Out</button>
                        <button onClick={() => setShowLogoutPopup(false)} className="flex-1 py-[10px] BlackWithLightGradient ContentCardShadow text-[13px] font-light rounded-[10px] active:scale-95">Cancel</button>
                    </div>
                </div>
            </div>

            {/* Delete Account Popup */}
            <div className={`ease-in-out duration-300 fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center transition-opacity ${showDeletePopup ? 'opacity-100 visible' : 'opacity-0 invisible pointer-events-none'}`}>
                <div className={`ContentCardShadow BlackGradient rounded-[20px] p-[30px] w-[320px] flex flex-col items-center gap-[18px] transition-all duration-300 ${showDeletePopup ? 'translate-y-0 opacity-100' : '-translate-y-[30px] opacity-0'}`}>
                    <div className="text-[30px]">⚠️</div>
                    <h2 className="text-[17px] font-semibold text-center">Delete this admin account?</h2>
                    <p className="text-[12px] opacity-40 font-light text-center leading-relaxed">This will permanently delete the account and all associated data. This cannot be undone.</p>
                    <div className="flex gap-[12px] w-full">
                        <button onClick={handleDeleteAccount} className="flex-1 py-[10px] bg-red-500/20 border border-red-500/30 text-red-400 text-[13px] font-light rounded-[10px] active:scale-95">Delete</button>
                        <button onClick={() => setShowDeletePopup(false)} className="flex-1 py-[10px] BlackWithLightGradient ContentCardShadow text-[13px] font-light rounded-[10px] active:scale-95">Cancel</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DASHBOARDAdminSettings;
