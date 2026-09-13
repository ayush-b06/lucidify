"use client";

import { useEffect, useState } from 'react';
import { getAuth, signOut, sendPasswordResetEmail } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { doc, writeBatch, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { queueAdminNotification } from '@/utils/notifications';
import { db } from '../firebaseConfig';
import DashboardClientSideNav from './DashboardClientSideNav';
import DashboardTopBar from './DashboardTopBar';

const DASHBOARDClientSettings = () => {
    const [showLogoutPopup, setShowLogoutPopup] = useState(false);
    const [showDeletePopup, setShowDeletePopup] = useState(false);
    const [resetEmailSent, setResetEmailSent] = useState(false);
    const [resetLoading, setResetLoading] = useState(false);
    const [error, setError] = useState('');
    const [deleting, setDeleting] = useState(false);
    const [deletionRequested, setDeletionRequested] = useState(false);
    const auth = getAuth();
    const router = useRouter();

    useEffect(() => {
        const user = auth.currentUser;
        if (!user) { router.push('/login'); return; }
        return onSnapshot(doc(db, 'users', user.uid), snap => setDeletionRequested(!!snap.data()?.deletionRequestedAt), () => setError('Could not load account preferences. Please reload.'));
    }, [auth, router]);

    const handleLogOut = async () => {
        try { await signOut(auth); router.push('/login'); }
        catch { setError('Could not sign out. Please try again.'); setShowLogoutPopup(false); }
    };

    const handlePasswordReset = async () => {
        const user = auth.currentUser;
        if (!user?.email) return;
        setResetLoading(true);
        try {
            await sendPasswordResetEmail(auth, user.email);
            setResetEmailSent(true);
        } catch (e) {
            setError('Could not send the reset email. Please try again.');
        } finally {
            setResetLoading(false);
        }
    };

    const handleDeleteAccount = async () => {
        const user = auth.currentUser;
        if (!user || deleting || deletionRequested) return;
        setDeleting(true); setError('');
        try {
            const batch = writeBatch(db);
            batch.update(doc(db, 'users', user.uid), { deletionRequestedAt: serverTimestamp() });
            queueAdminNotification(batch, 'Account deletion requested', `${user.email || 'A client'} requested account and data deletion. Review their request and contact them to arrange completion.`, `/dashboard/messages?userId=${user.uid}&conversationId=lucidify`, 'account', 'account-deletion');
            await batch.commit();
            setDeletionRequested(true); setShowDeletePopup(false);
        } catch { setError('Could not send your deletion request. Please try again.'); setShowDeletePopup(false); }
        finally { setDeleting(false); }
    };

    return (
        <div className="flex flex-col xl:flex-row h-screen DashboardBackgroundGradient overflow-hidden relative">
            <DashboardClientSideNav highlight="none" />

            <div className="flex-1 flex flex-col pt-[60px] xl:pt-0 min-h-0 overflow-hidden">
                <DashboardTopBar title="Settings" />
                {error && <div role="alert" className="DashboardNotice">{error}</div>}

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto px-[20px] sm:px-[50px] pt-[30px] pb-[40px]">
                    <div className="mb-[28px]">
                        <h1 className="text-[28px] font-semibold mb-[4px]">Settings</h1>
                        <p className="text-[14px] font-light opacity-50">Manage your account preferences.</p>
                    </div>

                    <div className="flex flex-col gap-[14px] max-w-[680px]">

                        {/* Security */}
                        <div className="BlackGradient ContentCardShadow rounded-[20px] px-[24px] sm:px-[30px] py-[24px]">
                            <h2 className="text-[16px] font-semibold mb-[3px]">Security</h2>
                            <p className="text-[12px] opacity-40 font-light mb-[20px]">Manage your account security.</p>
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
                                    <div className="text-[12px] opacity-35 font-light mt-[2px]">Sign out of your Lucidify account.</div>
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
                                    <div className="text-[12px] opacity-35 font-light mt-[2px]">Request account and data deletion from the Lucidify team.</div>
                                </div>
                                <button
                                    disabled={deletionRequested} onClick={() => setShowDeletePopup(true)}
                                    className="flex-shrink-0 px-[16px] py-[8px] bg-red-500/15 border border-red-500/30 rounded-[10px] text-[13px] font-light text-red-400 active:scale-95 transition-transform whitespace-nowrap hover:bg-red-500/25"
                                >
                                    {deletionRequested ? 'Request sent' : 'Request deletion'}
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
                    <h2 className="text-[17px] font-semibold text-center">Request account deletion?</h2>
                    <p className="text-[12px] opacity-40 font-light text-center leading-relaxed">Lucidify will review your request and contact you to complete deletion. Your account stays active until the request is completed.</p>
                    <div className="flex gap-[12px] w-full">
                        <button disabled={deleting} onClick={handleDeleteAccount} className="flex-1 py-[10px] bg-red-500/20 border border-red-500/30 text-red-400 text-[13px] font-light rounded-[10px] active:scale-95">{deleting ? 'Sending…' : 'Send request'}</button>
                        <button disabled={deleting} onClick={() => setShowDeletePopup(false)} className="flex-1 py-[10px] BlackWithLightGradient ContentCardShadow text-[13px] font-light rounded-[10px] active:scale-95">Cancel</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DASHBOARDClientSettings;
