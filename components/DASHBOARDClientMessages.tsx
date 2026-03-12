"use client";

import { useEffect, useRef, useState } from 'react';
import { getAuth } from 'firebase/auth';
import {
    addDoc, collection, doc, getDoc, getDocs, increment,
    onSnapshot, orderBy, query, Timestamp, updateDoc
} from 'firebase/firestore';
import { auth, db } from '../firebaseConfig';
import { writeAdminNotification } from '../utils/notifications';
import DashboardClientSideNav from './DashboardClientSideNav';
import Image from 'next/image';
import Link from 'next/link';
import AddDirectMessageModal from './AddDirectMessageModal';
import NotificationBell from './NotificationBell';

interface Message {
    id: string;
    text: string;
    sender: string;
    timestamp: Timestamp;
}

// Unified conversation entry for sidebar
interface ConvoItem {
    id: string;          // for Lucidify: conversation doc id; for DM: directMessages convoId
    type: 'lucidify' | 'direct';
    title: string;
    avatarSrc: string | null; // null = show initials
    isPinned: boolean;
    timestamp: Timestamp | null;
    lastMessage: string;
    unreadCount: number;
    otherUserId?: string; // only for DMs
}

const DASHBOARDClientMessages = () => {
    const authInstance = getAuth();

    const [convos, setConvos] = useState<ConvoItem[]>([]);
    const [messages, setMessages] = useState<Message[]>([]);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [newMessage, setNewMessage] = useState('');
    const [myAvatar, setMyAvatar] = useState<string | null>(null);
    const [myFirstName, setMyFirstName] = useState<string>('');
    const [searchQuery, setSearchQuery] = useState('');
    const [mobileView, setMobileView] = useState<'list' | 'chat'>('list');
    const [isDMModalOpen, setIsDMModalOpen] = useState(false);
    const [isSending, setIsSending] = useState(false);

    const messagesEndRef = useRef<HTMLDivElement | null>(null);

    // ── Fetch my profile ──────────────────────────────────────────────────────
    useEffect(() => {
        const fetchMyProfile = async () => {
            const user = authInstance.currentUser;
            if (!user) return;
            try {
                const snap = await getDoc(doc(db, 'users', user.uid));
                if (snap.exists()) {
                    const data = snap.data();
                    setMyAvatar(data.selectedAvatar || null);
                    setMyFirstName(data.firstName || '');
                    // Ensure email is saved to Firestore (needed for DM search)
                    if (!data.email && user.email) {
                        await updateDoc(doc(db, 'users', user.uid), { email: user.email });
                    }
                }
            } catch (e) { console.error(e); }
        };
        fetchMyProfile();
    }, [authInstance]);

    // ── Load all conversations (Lucidify + DMs) ───────────────────────────────
    const loadConversations = async () => {
        const user = auth.currentUser;
        if (!user) return;

        const items: ConvoItem[] = [];

        // 1. Lucidify conversations
        try {
            const snap = await getDocs(collection(db, 'users', user.uid, 'conversations'));
            snap.forEach(d => {
                const data = d.data();
                items.push({
                    id: d.id,
                    type: 'lucidify',
                    title: data.title || 'Lucidify',
                    avatarSrc: null,
                    isPinned: data.isPinned || false,
                    timestamp: data.timestamp || null,
                    lastMessage: data.lastMessage || '',
                    unreadCount: data.unreadCounts?.[user.uid] || 0,
                });
            });
        } catch (e) { console.error(e); }

        // 2. DM conversations
        try {
            const dmRefsSnap = await getDocs(collection(db, 'users', user.uid, 'dmConversations'));
            for (const ref of dmRefsSnap.docs) {
                const convoId = ref.id;
                const otherUserId = ref.data().otherUserId;
                try {
                    const dmSnap = await getDoc(doc(db, 'directMessages', convoId));
                    if (!dmSnap.exists()) continue;
                    const dm = dmSnap.data();
                    const otherProfile = dm.participantProfiles?.[otherUserId] || {};
                    const displayName = otherProfile.firstName
                        ? `${otherProfile.firstName} ${otherProfile.lastName || ''}`.trim()
                        : 'Unknown';
                    items.push({
                        id: convoId,
                        type: 'direct',
                        title: displayName,
                        avatarSrc: otherProfile.selectedAvatar || null,
                        isPinned: false,
                        timestamp: dm.timestamp || null,
                        lastMessage: dm.lastMessage || '',
                        unreadCount: dm.unreadCounts?.[user.uid] || 0,
                        otherUserId,
                    });
                } catch (e) { console.error(e); }
            }
        } catch (e) { console.error(e); }

        // Sort by timestamp desc
        items.sort((a, b) => {
            if (a.isPinned && !b.isPinned) return -1;
            if (!a.isPinned && b.isPinned) return 1;
            const ta = a.timestamp?.toMillis() || 0;
            const tb = b.timestamp?.toMillis() || 0;
            return tb - ta;
        });

        setConvos(items);

        // Auto-select first (Lucidify) if nothing selected
        const lucidify = items.find(c => c.type === 'lucidify');
        if (lucidify && !selectedId) {
            setSelectedId(lucidify.id);
            selectConversation(lucidify);
        }
    };

    useEffect(() => { loadConversations(); }, []);

    // ── Select a conversation (mark read + fetch messages) ───────────────────
    const selectConversation = async (convo: ConvoItem) => {
        setSelectedId(convo.id);
        setMessages([]);   // clear immediately so old messages don't linger
        setMobileView('chat');
        const user = auth.currentUser;
        if (!user) return;

        // Reset unread count
        try {
            if (convo.type === 'lucidify') {
                await updateDoc(doc(db, 'users', user.uid, 'conversations', convo.id), {
                    [`unreadCounts.${user.uid}`]: 0,
                });
            } else {
                await updateDoc(doc(db, 'directMessages', convo.id), {
                    [`unreadCounts.${user.uid}`]: 0,
                });
            }
        } catch (e) { /* ignore */ }

        setConvos(prev => prev.map(c => c.id === convo.id ? { ...c, unreadCount: 0 } : c));
    };

    const handleChatSelect = (convo: ConvoItem) => {
        selectConversation(convo);
    };

    // ── Real-time messages listener ───────────────────────────────────────────
    useEffect(() => {
        if (!selectedId) return;
        const user = authInstance.currentUser;
        if (!user) return;

        const selectedConvo = convos.find(c => c.id === selectedId);
        if (!selectedConvo) return;

        let messagesRef;
        if (selectedConvo.type === 'lucidify') {
            messagesRef = collection(db, 'users', user.uid, 'conversations', selectedId, 'messages');
        } else {
            messagesRef = collection(db, 'directMessages', selectedId, 'messages');
        }

        const q = query(messagesRef, orderBy('timestamp', 'asc'));
        const unsub = onSnapshot(q, snap => {
            const real = snap.docs.map(d => ({ id: d.id, ...d.data() } as Message));
            // Replace state with real messages (drops any optimistic pending-* entries)
            setMessages(real);
        });

        return () => unsub();
    }, [selectedId, authInstance]);

    // ── Auto-scroll to latest message ─────────────────────────────────────────
    useEffect(() => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollTop = messagesEndRef.current.scrollHeight;
        }
    }, [messages]);

    // ── Send message ──────────────────────────────────────────────────────────
    const sendMessage = async () => {
        const text = newMessage.trim();
        if (!text || !selectedId || isSending) return;
        const user = authInstance.currentUser;
        if (!user) return;

        const selectedConvo = convos.find(c => c.id === selectedId);
        if (!selectedConvo) return;

        setIsSending(true);
        const now = Timestamp.fromDate(new Date());
        const msgData = { text, sender: user.uid, timestamp: now, isRead: false };

        // Optimistically clear input + show message immediately
        setNewMessage('');
        setMessages(prev => [...prev, { id: `pending-${Date.now()}`, ...msgData }]);
        setConvos(prev => prev.map(c =>
            c.id === selectedId ? { ...c, lastMessage: text, timestamp: now } : c
        ));

        try {
            if (selectedConvo.type === 'lucidify') {
                await addDoc(collection(db, 'users', user.uid, 'conversations', selectedId, 'messages'), msgData);
                await updateDoc(doc(db, 'users', user.uid, 'conversations', selectedId), {
                    lastMessage: text,
                    lastMessageSender: user.uid,
                    timestamp: now,
                    'unreadCounts.Lucidify': increment(1),
                });
                // Notify admin
                const senderName = myFirstName || 'A client';
                const preview = text.length > 80 ? text.slice(0, 80) + '…' : text;
                writeAdminNotification(
                    `New message from ${senderName}`,
                    preview,
                    '/dashboard/messages',
                );
            } else {
                await addDoc(collection(db, 'directMessages', selectedId, 'messages'), msgData);
                const otherUid = selectedConvo.otherUserId!;
                await updateDoc(doc(db, 'directMessages', selectedId), {
                    lastMessage: text,
                    lastMessageSender: user.uid,
                    timestamp: now,
                    [`unreadCounts.${otherUid}`]: increment(1),
                });
            }
        } catch (e) {
            console.error(e);
            // Revert optimistic message on failure
            setMessages(prev => prev.filter(m => !m.id.startsWith('pending-')));
            setNewMessage(text);
        } finally {
            setIsSending(false);
        }
    };

    // ── After DM created from modal ───────────────────────────────────────────
    const handleDMCreated = async (convoId: string) => {
        await loadConversations();
        const user = auth.currentUser;
        if (!user) return;
        const dmSnap = await getDoc(doc(db, 'directMessages', convoId));
        if (!dmSnap.exists()) return;
        const dm = dmSnap.data();
        const otherUid = dm.participants.find((p: string) => p !== user.uid);
        const otherProfile = dm.participantProfiles?.[otherUid] || {};
        const displayName = otherProfile.firstName
            ? `${otherProfile.firstName} ${otherProfile.lastName || ''}`.trim()
            : 'User';
        const convo: ConvoItem = {
            id: convoId,
            type: 'direct',
            title: displayName,
            avatarSrc: otherProfile.selectedAvatar || null,
            isPinned: false,
            timestamp: dm.timestamp || null,
            lastMessage: '',
            unreadCount: 0,
            otherUserId: otherUid,
        };
        selectConversation(convo);
    };

    // ── Helpers ───────────────────────────────────────────────────────────────
    const chunkBySender = (msgs: Message[]) => {
        const groups: Message[][] = [];
        let current: Message[] = [];
        msgs.forEach((m, i) => {
            if (i === 0 || m.sender !== msgs[i - 1].sender) {
                if (current.length) groups.push(current);
                current = [m];
            } else {
                current.push(m);
            }
        });
        if (current.length) groups.push(current);
        return groups;
    };

    const formatTimestamp = (ts: Timestamp | null) => {
        if (!ts) return '';
        const d = ts.toDate();
        const now = new Date();
        const isToday = d.toDateString() === now.toDateString();
        return isToday
            ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            : d.toLocaleDateString([], { month: 'short', day: 'numeric' });
    };

    const selectedConvo = convos.find(c => c.id === selectedId) || null;
    const groupedMessages = chunkBySender(messages);
    const filteredConvos = convos.filter(c =>
        c.title.toLowerCase().includes(searchQuery.toLowerCase())
    );
    const pinnedConvos = filteredConvos.filter(c => c.isPinned);
    const allConvos = filteredConvos.filter(c => !c.isPinned);

    const ConvoRow = ({ convo }: { convo: ConvoItem }) => (
        <div
            className={`px-[30px] lg:px-[50px] py-[18px] lg:py-[22px] border-t-[0.5px] border-solid border-white ${selectedId === convo.id ? 'MessagesHighlightGradient border-opacity-50' : 'border-opacity-10'} text-white cursor-pointer flex gap-[15px] hover:bg-white/[0.02]`}
            onClick={() => handleChatSelect(convo)}
        >
            {/* Avatar */}
            <div className="rounded-[8px] BlackGradient ContentCardShadow flex justify-center items-center flex-shrink-0 overflow-hidden w-[46px] h-[46px]">
                {convo.type === 'lucidify' ? (
                    <div className="w-[30px]">
                        <Image src="/Lucidify Umbrella.png" alt="Lucidify" layout="responsive" width={0} height={0} />
                    </div>
                ) : convo.avatarSrc ? (
                    <Image src={`/${convo.avatarSrc}`} alt={convo.title} layout="responsive" width={0} height={0} />
                ) : (
                    <span className="text-[16px] font-semibold opacity-60">{convo.title.charAt(0).toUpperCase()}</span>
                )}
            </div>

            <div className="flex flex-col flex-grow min-w-0 justify-center">
                <div className="flex justify-between w-full">
                    <h4 className="text-[15px] font-medium flex-grow truncate">{convo.title}</h4>
                    <h4 className="text-[11px] opacity-40 flex-shrink-0 ml-2">{formatTimestamp(convo.timestamp)}</h4>
                </div>
                <div className="flex justify-between w-full mt-[2px]">
                    <p className="text-[13px] opacity-40 truncate flex-grow">{convo.lastMessage || 'No messages yet'}</p>
                    {convo.unreadCount > 0 && (
                        <div className="flex justify-center items-center min-w-[20px] h-[20px] bg-[#6265F0] rounded-full flex-shrink-0 ml-2 px-[4px]">
                            <span className="text-[11px]">{convo.unreadCount}</span>
                        </div>
                    )}
                </div>
                {convo.type === 'direct' && (
                    <span className="text-[10px] opacity-30 mt-[2px]">Direct Message</span>
                )}
            </div>
        </div>
    );

    return (
        <>
            {isDMModalOpen && (
                <AddDirectMessageModal
                    onClose={() => setIsDMModalOpen(false)}
                    onConversationCreated={handleDMCreated}
                />
            )}

            <div className="flex flex-col xl:flex-row h-screen DashboardBackgroundGradient overflow-hidden">
                <DashboardClientSideNav highlight="messages" />

                <div className="flex-1 flex flex-col min-h-0 overflow-hidden pt-[60px] xl:pt-0">
                    <div className="absolute BottomGradientBorder left-0 top-[103px] w-full" />

                    {/* Top Bar */}
                    <div className="flex items-center justify-between px-[20px] sm:px-[50px] py-6 flex-shrink-0">
                        <div className="inline-flex items-center gap-[5px]">
                            <div className="inline-flex items-center gap-[5px] opacity-40">
                                <div className="w-[15px]">
                                    <Image src="/Home Icon.png" alt="Home Icon" layout="responsive" width={0} height={0} />
                                </div>
                                <div className="font-light text-sm">Home</div>
                            </div>
                            <div className="font-light text-sm">/ Messages</div>
                        </div>
                        <div className="inline-flex items-center gap-3 sm:gap-5">
                            <NotificationBell />
                            <Link href="/dashboard/settings" className="hidden sm:flex w-[129px] h-[55px] items-center justify-center gap-2.5 rounded-[15px] BlackGradient ContentCardShadow">
                                <div className="font-light text-sm">Settings</div>
                                <div className="w-[30px]">
                                    <Image src="/Settings Icon.png" alt="Settings Icon" layout="responsive" width={0} height={0} />
                                </div>
                            </Link>
                        </div>
                    </div>

                    {/* Messages Layout */}
                    <div className="flex flex-1 min-h-0 justify-center px-[12px] sm:px-[50px] pb-[12px] sm:pb-[30px]">
                        <div className="flex w-full p-[1px] ContentCardShadow rounded-[35px] min-h-0 overflow-hidden">

                            {/* ── Left: Conversations List ── */}
                            <div className={`flex flex-col w-full sm:w-[320px] lg:w-[380px] bg-gradient-to-br from-[#1A1A1A] to-[#101010] rounded-[35px] sm:rounded-l-[35px] sm:rounded-r-none min-h-0 overflow-hidden flex-shrink-0 ${mobileView === 'chat' ? 'hidden sm:flex' : 'flex'}`}>

                                {/* Header */}
                                <div className="flex justify-between mx-[30px] lg:mx-[40px] mt-[25px] items-center flex-shrink-0">
                                    <h1 className="text-[22px] lg:text-[26px] font-semibold">Messages</h1>
                                    <button
                                        onClick={() => setIsDMModalOpen(true)}
                                        className="flex items-center gap-[6px] px-[14px] py-[8px] rounded-[10px] PopupAttentionGradient PopupAttentionShadow hover:opacity-90"
                                    >
                                        <div className="w-[13px]">
                                            <Image src="/Plus Icon.png" alt="New" layout="responsive" width={0} height={0} />
                                        </div>
                                        <span className="text-[13px] font-light">New</span>
                                    </button>
                                </div>

                                {/* Search */}
                                <div className="relative my-[16px] mx-[30px] lg:mx-[40px] flex-shrink-0">
                                    <input
                                        type="text"
                                        placeholder="Search conversations..."
                                        value={searchQuery}
                                        onChange={e => setSearchQuery(e.target.value)}
                                        className="w-full px-[15px] py-[11px] rounded-[12px] BlackWithLightGradient ContentCardShadow text-[13px] focus:outline-none placeholder:opacity-30"
                                    />
                                </div>

                                {/* Conversation list */}
                                <div className="flex flex-col flex-1 overflow-y-auto min-h-0">
                                    {pinnedConvos.length > 0 && (
                                        <div className="mb-[4px]">
                                            <p className="px-[30px] lg:px-[40px] pb-[8px] opacity-40 font-light text-[12px] uppercase tracking-wide">Pinned</p>
                                            {pinnedConvos.map(c => <ConvoRow key={c.id} convo={c} />)}
                                        </div>
                                    )}
                                    {allConvos.length > 0 ? (
                                        <div>
                                            <p className="px-[30px] lg:px-[40px] pb-[8px] opacity-40 font-light text-[12px] uppercase tracking-wide">
                                                {pinnedConvos.length > 0 ? 'All Messages' : 'Conversations'}
                                            </p>
                                            {allConvos.map(c => <ConvoRow key={c.id} convo={c} />)}
                                        </div>
                                    ) : convos.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center py-[40px] gap-[10px] opacity-40">
                                            <span className="text-[32px]">💬</span>
                                            <p className="text-[13px] font-light">No conversations yet</p>
                                            <button onClick={() => setIsDMModalOpen(true)} className="text-[12px] text-[#725CF7] hover:opacity-80 mt-[4px]">
                                                Start a new message
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="flex justify-center py-[30px]">
                                            <p className="text-[13px] opacity-40">No results</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* ── Right: Chat Panel ── */}
                            <div className={`flex-1 bg-gradient-to-br from-[#101010] to-[#1A1A1A] rounded-[35px] sm:rounded-l-none sm:rounded-r-[35px] flex flex-col LeftGradientBorder min-h-0 overflow-hidden ${mobileView === 'list' ? 'hidden sm:flex' : 'flex'}`}>

                                {/* Chat header */}
                                <div className="BlackWithLightGradient rounded-t-[35px] sm:rounded-tl-none sm:rounded-tr-[35px] px-[20px] sm:px-[40px] py-[18px] flex justify-between border-b-[0.5px] border-solid border-white border-opacity-10 flex-shrink-0 items-center gap-[12px]">
                                    <button
                                        className="sm:hidden opacity-60 hover:opacity-100 flex-shrink-0"
                                        onClick={() => setMobileView('list')}
                                    >
                                        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                                            <path d="M12 4l-6 6 6 6" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                    </button>

                                    <div className="flex gap-[12px] flex-1 min-w-0 items-center">
                                        <div className="rounded-[8px] BlackGradient ContentCardShadow flex justify-center items-center flex-shrink-0 overflow-hidden w-[44px] h-[44px]">
                                            {selectedConvo?.type === 'direct' && selectedConvo.avatarSrc ? (
                                                <Image src={`/${selectedConvo.avatarSrc}`} alt={selectedConvo.title} layout="responsive" width={0} height={0} />
                                            ) : selectedConvo?.type === 'direct' ? (
                                                <span className="text-[18px] font-semibold opacity-60">{selectedConvo.title.charAt(0)}</span>
                                            ) : (
                                                <div className="w-[28px]">
                                                    <Image src="/Lucidify Umbrella.png" alt="Lucidify" layout="responsive" width={0} height={0} />
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex flex-col min-w-0">
                                            <h3 className="text-[15px] font-semibold truncate">{selectedConvo?.title || 'Select a chat'}</h3>
                                            <p className="text-[12px] opacity-40 truncate">
                                                {selectedConvo?.type === 'direct' ? 'Direct Message' : 'Lucidify Team'}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="hidden sm:flex gap-[10px] items-center flex-shrink-0">
                                        <div className="rounded-[8px] BlackGradient ContentCardShadow flex justify-center items-center hover:cursor-pointer hover:opacity-70 w-[36px] h-[36px]">
                                            <div className="w-[18px]">
                                                <Image src="/Phone Call Icon.png" alt="Call" layout="responsive" width={0} height={0} />
                                            </div>
                                        </div>
                                        <div className="rounded-[8px] BlackGradient ContentCardShadow flex justify-center items-center hover:cursor-pointer hover:opacity-70 w-[36px] h-[36px]">
                                            <div className="w-[18px]">
                                                <Image src="/Video Call Icon.png" alt="Video" layout="responsive" width={0} height={0} />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex flex-col gap-[4px] hover:cursor-pointer hover:opacity-50 flex-shrink-0">
                                        <div className="bg-white rounded-full w-[4px] h-[4px]" />
                                        <div className="bg-white rounded-full w-[4px] h-[4px]" />
                                        <div className="bg-white rounded-full w-[4px] h-[4px]" />
                                    </div>
                                </div>

                                {/* Messages */}
                                <div ref={messagesEndRef} className="flex flex-col overflow-y-auto gap-[10px] flex-1 min-h-0 px-[20px] sm:px-[40px] py-[20px]">
                                    {groupedMessages.length === 0 && (
                                        <div className="flex flex-col items-center justify-center h-full gap-[10px] opacity-30">
                                            <span className="text-[36px]">💬</span>
                                            <p className="text-[14px] font-light">No messages yet. Say hello!</p>
                                        </div>
                                    )}
                                    {groupedMessages.map((group, idx) => {
                                        const isMe = group[0].sender === authInstance.currentUser?.uid;
                                        return (
                                            <div key={idx} className={`flex ${isMe ? 'justify-end' : 'justify-start'} mb-[6px]`}>
                                                <div className={`flex gap-[10px] sm:gap-[12px] max-w-[85%] sm:max-w-[75%] ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                                                    {/* Avatar */}
                                                    <div className="rounded-[8px] BlackGradient ContentCardShadow flex justify-center items-center self-start flex-shrink-0 w-[38px] h-[38px] overflow-hidden">
                                                        {isMe ? (
                                                            myAvatar ? (
                                                                <Image src={`/${myAvatar}`} alt="You" layout="responsive" width={0} height={0} />
                                                            ) : (
                                                                <span className="text-[14px] opacity-60">👤</span>
                                                            )
                                                        ) : selectedConvo?.type === 'direct' && selectedConvo.avatarSrc ? (
                                                            <Image src={`/${selectedConvo.avatarSrc}`} alt={selectedConvo.title} layout="responsive" width={0} height={0} />
                                                        ) : selectedConvo?.type === 'direct' ? (
                                                            <span className="text-[14px] font-semibold opacity-60">{selectedConvo.title.charAt(0)}</span>
                                                        ) : (
                                                            <div className="w-[24px]">
                                                                <Image src="/Lucidify Umbrella.png" alt="Lucidify" layout="responsive" width={0} height={0} />
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Bubble group */}
                                                    <div className={`flex flex-col gap-[6px] ${isMe ? 'items-end' : 'items-start'}`}>
                                                        <p className="text-[12px] opacity-40 font-light px-[4px]">
                                                            {isMe ? 'You' : selectedConvo?.title || ''}
                                                        </p>
                                                        {group.map(msg => (
                                                            <div
                                                                key={msg.id}
                                                                className={`text-[14px] font-light px-[15px] py-[10px] ${
                                                                    isMe
                                                                        ? 'PopupAttentionGradient PopupAttentionShadow rounded-b-[15px] rounded-tl-[15px]'
                                                                        : 'MessagesHighlightGradient ContentCardShadow rounded-b-[15px] rounded-tr-[15px]'
                                                                }`}
                                                            >
                                                                {msg.text}
                                                            </div>
                                                        ))}
                                                        <p className="text-[11px] opacity-25 px-[4px]">{formatTimestamp(group[group.length - 1].timestamp)}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Input */}
                                <div className="BlackGradient ContentCardShadow rounded-b-[35px] sm:rounded-bl-none sm:rounded-br-[35px] px-[20px] sm:px-[40px] py-[16px] flex-shrink-0">
                                    <div className="BlackWithLightGradient ContentCardShadow rounded-[12px] flex gap-[15px] px-[16px] sm:px-[22px] py-[12px] items-center">
                                        <input
                                            type="text"
                                            value={newMessage}
                                            onChange={e => setNewMessage(e.target.value)}
                                            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                                            placeholder="Write a message..."
                                            className="w-full focus:outline-none text-[14px] sm:text-[15px] font-light bg-transparent placeholder:opacity-30"
                                        />
                                        <div className="flex gap-[12px] items-center flex-shrink-0">
                                            <div className="hidden sm:flex gap-[12px]">
                                                <div className="w-[18px] opacity-40 hover:opacity-80 hover:cursor-pointer">
                                                    <Image src="/Attachment Icon.png" alt="Attach" layout="responsive" width={0} height={0} />
                                                </div>
                                                <div className="w-[18px] opacity-40 hover:opacity-80 hover:cursor-pointer">
                                                    <Image src="/Microphone Icon.png" alt="Mic" layout="responsive" width={0} height={0} />
                                                </div>
                                            </div>
                                            <button onClick={sendMessage} disabled={isSending} className="w-[22px] sm:w-[25px] hover:opacity-70 disabled:opacity-30">
                                                <Image src="/Send Icon.png" alt="Send" layout="responsive" width={0} height={0} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default DASHBOARDClientMessages;
