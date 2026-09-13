"use client";
import { useDialog } from '@/hooks/useDialog';

import { useState, useRef, useEffect } from 'react';
import { collection, doc, getDoc, getDocs, query, limit, runTransaction, Timestamp, where } from 'firebase/firestore';
import { ADMIN_EMAIL } from '@/utils/notifications';
import { auth, db } from '../firebaseConfig';
import Image from 'next/image';

interface UserProfile {
    uid: string;
    firstName: string;
    lastName: string;
    email: string;
    selectedAvatar: string | null;
    companyName: string | null;
}

interface AddDirectMessageModalProps {
    onClose: () => void;
    onConversationCreated: (convoId: string) => void;
}

const AddDirectMessageModal = ({ onClose, onConversationCreated }: AddDirectMessageModalProps) => {
    const searchVersion = useRef(0);
    const [error, setError] = useState('');
    useEffect(() => () => { searchVersion.current++; }, []);
    const [emailInput, setEmailInput] = useState('');
    const [status, setStatus] = useState<'idle' | 'loading' | 'found' | 'notFound' | 'exists' | 'creating'>('idle');
    const [foundUser, setFoundUser] = useState<UserProfile | null>(null);

    const handleSearch = async () => {
        const trimmed = emailInput.trim().toLowerCase();
        if (!trimmed || status === 'creating') return;
        const version = ++searchVersion.current; setError('');

        const me = auth.currentUser;
        if (!me) return;
        if (trimmed === ADMIN_EMAIL) { setError('Use your pinned Lucidify conversation to contact the team.'); setStatus('idle'); setFoundUser(null); return; }

        if (trimmed === me.email?.toLowerCase()) {
            setStatus('notFound');
            setFoundUser(null);
            return;
        }

        setStatus('loading');
        setFoundUser(null);

        try {
            const q = query(collection(db, 'users'), where('email', '==', trimmed), limit(1));
            const snap = await getDocs(q);
            if (version !== searchVersion.current) return;

            if (snap.empty) {
                setStatus('notFound');
                return;
            }

            const userDoc = snap.docs[0];
            const data = userDoc.data();
            const profile: UserProfile = {
                uid: userDoc.id,
                firstName: data.firstName || '',
                lastName: data.lastName || '',
                email: data.email || '',
                selectedAvatar: data.selectedAvatar || null,
                companyName: data.companyName || null,
            };

            // Check if DM conversation already exists
            const convoId = [me.uid, profile.uid].sort().join('_');
            const dmRef = doc(db, 'directMessages', convoId);
            const dmSnap = await getDoc(dmRef);
            if (version !== searchVersion.current) return;

            if (dmSnap.exists()) {
                setFoundUser(profile);
                setStatus('exists');
                return;
            }

            setFoundUser(profile);
            setStatus('found');
        } catch (err) {
            if (version !== searchVersion.current) return;
            setError('Could not search users. Please try again.'); setStatus('idle');
        }
    };

    const handleStartChat = async () => {
        const me = auth.currentUser;
        if (!me || !foundUser || status === 'creating') return;

        setStatus('creating'); setError('');

        try {
            // Fetch my own profile
            const myDoc = await getDoc(doc(db, 'users', me.uid));
            const myData = myDoc.data() || {};

            const convoId = [me.uid, foundUser.uid].sort().join('_');
            const now = Timestamp.now();

            // Read before creating so repeated opens never overwrite the shared thread.
            await runTransaction(db, async transaction => {
            const ref = doc(db, 'directMessages', convoId);
            const existing = await transaction.get(ref);
            if (!existing.exists()) transaction.set(ref, {
                participants: [me.uid, foundUser.uid],
                participantProfiles: {
                    [me.uid]: {
                        firstName: myData.firstName || '',
                        lastName: myData.lastName || '',
                        selectedAvatar: myData.selectedAvatar || null,
                        companyName: myData.companyName || null,
                        email: me.email || '',
                    },
                    [foundUser.uid]: {
                        firstName: foundUser.firstName,
                        lastName: foundUser.lastName,
                        selectedAvatar: foundUser.selectedAvatar,
                        companyName: foundUser.companyName,
                        email: foundUser.email,
                    },
                },
                lastMessage: '',
                lastMessageSender: '',
                timestamp: now,
                unreadCounts: { [me.uid]: 0, [foundUser.uid]: 0 },
            });

            // Add ref to both users' dmConversations subcollection
            transaction.set(doc(db, 'users', me.uid, 'dmConversations', convoId), {
                otherUserId: foundUser.uid,
                createdAt: now,
            });
            transaction.set(doc(db, 'users', foundUser.uid, 'dmConversations', convoId), {
                otherUserId: me.uid,
                createdAt: now,
            });

            });
            onConversationCreated(convoId);
            onClose();
        } catch (err) {
            setError('Could not start this conversation. Please try again.');
            setStatus('found');
        }
    };

    const handleOpenExisting = () => {
        if (!foundUser) return;
        const me = auth.currentUser;
        if (!me) return;
        const convoId = [me.uid, foundUser.uid].sort().join('_');
        onConversationCreated(convoId);
        onClose();
    };

    const dialogRef = useDialog<HTMLDivElement>(true, onClose, status === 'creating');
    return (
        <div
            className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-[12px] sm:p-[20px]"
            onClick={() => { if (status !== 'creating') onClose(); }}
        >
            <div
                ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-label="New message" className="DashboardDialog w-full max-w-[460px] BlackGradient ContentCardShadow rounded-[28px] px-[28px] py-[28px] flex flex-col gap-[20px]"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-[20px] font-semibold">New Message</h2>
                        <p className="text-[12px] opacity-40 mt-[2px]">Find a user by their email address</p>
                    </div>
                    <button
                        onClick={() => { if (status !== 'creating') onClose(); }}
                        className="w-[32px] h-[32px] rounded-full BlackWithLightGradient ContentCardShadow flex items-center justify-center opacity-60 hover:opacity-100 text-[16px]"
                    >✕</button>
                </div>

                {error && <p role="alert" className="DashboardNotice">{error}</p>}
                {/* Email input */}
                <div className="flex gap-[10px]">
                    <input
                        type="email"
                        value={emailInput}
                        disabled={status === 'creating'} aria-label="Recipient email" onChange={e => { searchVersion.current++; setError(''); setEmailInput(e.target.value); setStatus('idle'); setFoundUser(null); }}
                        onKeyDown={e => e.key === 'Enter' && handleSearch()}
                        placeholder="Enter email address..."
                        className="flex-1 bg-white/5 border border-white/10 rounded-[12px] px-[16px] py-[11px] text-[14px] font-light focus:outline-none focus:ring-1 focus:ring-[#725CF7] placeholder:opacity-30"
                    />
                    <button
                        onClick={handleSearch}
                        disabled={status === 'loading' || status === 'creating' || !emailInput.trim()}
                        className="PopupAttentionGradient PopupAttentionShadow px-[18px] py-[11px] rounded-[12px] text-[13px] font-medium disabled:opacity-40 flex-shrink-0"
                    >
                        {status === 'loading' ? '...' : 'Search'}
                    </button>
                </div>

                {/* Not found */}
                {status === 'notFound' && (
                    <div className="flex items-center gap-[12px] px-[16px] py-[14px] rounded-[14px] bg-red-500/10 border border-red-500/20">
                        <span className="text-[18px]">🔍</span>
                        <div>
                            <p className="text-[13px] font-medium text-red-400">No user found</p>
                            <p className="text-[12px] opacity-50 mt-[2px]">No account is registered with that email.</p>
                        </div>
                    </div>
                )}

                {/* User profile card */}
                {(status === 'found' || status === 'exists' || status === 'creating') && foundUser && (
                    <div className="flex flex-col gap-[16px]">
                        <div className="BlackWithLightGradient ContentCardShadow rounded-[18px] px-[20px] py-[18px] flex items-center gap-[16px]">
                            {/* Avatar */}
                            <div className="w-[52px] h-[52px] rounded-full BlackGradient ContentCardShadow flex items-center justify-center overflow-hidden flex-shrink-0">
                                {foundUser.selectedAvatar ? (
                                    <Image
                                        src={`/${foundUser.selectedAvatar}`}
                                        alt={foundUser.firstName}
                                        layout="responsive"
                                        width={0}
                                        height={0}
                                    />
                                ) : (
                                    <span className="text-[22px] opacity-50">👤</span>
                                )}
                            </div>

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                                <p className="text-[16px] font-semibold truncate">
                                    {foundUser.firstName} {foundUser.lastName}
                                </p>
                                {foundUser.companyName && (
                                    <p className="text-[12px] opacity-50 truncate mt-[2px]">{foundUser.companyName}</p>
                                )}
                                <p className="text-[12px] opacity-40 truncate mt-[1px]">{foundUser.email}</p>
                            </div>

                            {/* Verified badge */}
                            <div className="flex-shrink-0 flex items-center gap-[5px] bg-green-500/10 border border-green-500/20 px-[10px] py-[4px] rounded-full">
                                <span className="text-[10px] text-green-400 font-medium">✓ Found</span>
                            </div>
                        </div>

                        {/* Already exists notice */}
                        {status === 'exists' && (
                            <div className="flex items-center gap-[10px] px-[14px] py-[12px] rounded-[12px] bg-[#725CF7]/10 border border-[#725CF7]/20">
                                <span className="text-[16px]">💬</span>
                                <p className="text-[13px] opacity-70">You already have a conversation with this person.</p>
                            </div>
                        )}

                        {/* Action button */}
                        {status === 'found' && (
                            <button
                                onClick={handleStartChat}
                                className="PopupAttentionGradient PopupAttentionShadow w-full py-[13px] rounded-[14px] text-[14px] font-semibold"
                            >
                                Start Conversation →
                            </button>
                        )}
                        {status === 'exists' && (
                            <button
                                onClick={handleOpenExisting}
                                className="PopupAttentionGradient PopupAttentionShadow w-full py-[13px] rounded-[14px] text-[14px] font-semibold"
                            >
                                Open Conversation →
                            </button>
                        )}
                        {status === 'creating' && (
                            <div className="w-full py-[13px] rounded-[14px] text-[14px] font-semibold text-center opacity-50 BlackWithLightGradient">
                                Creating conversation...
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default AddDirectMessageModal;
