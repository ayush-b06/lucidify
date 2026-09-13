"use client";

import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useChatVisible } from '@/hooks/useChatVisible';
import { subscribeClientConversations, sendChatMessage } from '@/utils/conversations';
import { getAuth } from 'firebase/auth';
import {
    addDoc, collection, doc, getDoc, getDocs, increment,
    onSnapshot, orderBy, query, Timestamp, updateDoc
} from 'firebase/firestore';
import { auth, db } from '../firebaseConfig';
import { writeAdminNotification } from '../utils/notifications';
import DashboardClientSideNav from './DashboardClientSideNav';
import Image from 'next/image';
import AddDirectMessageModal from './AddDirectMessageModal';
import DashboardTopBar from './DashboardTopBar';

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
    const params = useSearchParams();
    const requestedId = params.get('conversationId');
    const appliedLink = useRef('');
    const [chatError, setChatError] = useState('');
    const [loadAttempt, setLoadAttempt] = useState(0);

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
    const chatVisible = useChatVisible(mobileView);

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

    useEffect(() => {
        const user = auth.currentUser;
        if (!user) return;
        setChatError('');
        return subscribeClientConversations(user.uid, items => setConvos(items as unknown as ConvoItem[]), () => setChatError('Couldn’t load conversations. Please retry.'));
    }, [loadAttempt]);

    useEffect(() => {
        if (requestedId && appliedLink.current !== requestedId && convos.some(c => c.id === requestedId)) {
            appliedLink.current = requestedId;
            setSelectedId(requestedId); setMobileView('chat');
        } else if (!selectedId && convos.length && window.matchMedia('(min-width: 640px)').matches) {
            setSelectedId(convos[0].id);
        }
    }, [requestedId, convos, selectedId]);

    const handleChatSelect = (convo: ConvoItem) => { setSelectedId(convo.id); setMobileView('chat'); setChatError(''); };
    const selectedType = convos.find(c => c.id === selectedId)?.type;
    const selectedUnread = convos.find(c => c.id === selectedId)?.unreadCount || 0;
    useEffect(() => {
        const user = auth.currentUser;
        if (!user || !selectedId || !selectedType || !selectedUnread || !chatVisible) return;
        const ref = selectedType === 'lucidify' ? doc(db, 'users', user.uid, 'conversations', selectedId) : doc(db, 'directMessages', selectedId);
        void updateDoc(ref, { [`unreadCounts.${user.uid}`]: 0 }).catch(() => setChatError(current => current || 'Couldn’t mark this conversation as read.'));
    }, [selectedId, selectedType, selectedUnread, chatVisible]);

    useEffect(() => {
        setMessages([]);
        const user = auth.currentUser;
        if (!user || !selectedId || !selectedType) return;
        const ref = selectedType === 'lucidify' ? collection(db, 'users', user.uid, 'conversations', selectedId, 'messages') : collection(db, 'directMessages', selectedId, 'messages');
        return onSnapshot(query(ref, orderBy('timestamp', 'asc')), snap => setMessages(snap.docs.map(d => ({ ...d.data(), id: d.id } as Message))), () => setChatError('Couldn’t load messages. Please retry.'));
    }, [selectedId, selectedType, loadAttempt]);

    // ── Auto-scroll to latest message ─────────────────────────────────────────
    useEffect(() => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollTop = messagesEndRef.current.scrollHeight;
        }
    }, [messages]);

    const sendMessage = async () => {
        const text = newMessage.trim();
        const user = auth.currentUser;
        const convo = convos.find(c => c.id === selectedId);
        if (!text || !user || !convo || isSending) return;
        setIsSending(true); setChatError('');
        try {
            await sendChatMessage({ conversationId: convo.id, text, type: convo.type, ownerId: user.uid, otherUserId: convo.otherUserId, senderName: myFirstName });
            setNewMessage(current => current === text || current.trim() === text ? '' : current);
        } catch { setChatError('Message wasn’t sent. Your draft is still here — try again.'); }
        finally { setIsSending(false); }
    };
    const handleDMCreated = (convoId: string) => { setSelectedId(convoId); setMobileView('chat'); };

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
                        <Image src="/Lucidify Umbrella.png" alt="Lucidify" width={64} height={64} style={{ width: "100%", height: "auto" }} />
                    </div>
                ) : convo.avatarSrc ? (
                    <Image src={`/${convo.avatarSrc}`} alt={convo.title} width={64} height={64} style={{ width: "100%", height: "auto" }} />
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
                    <DashboardTopBar title="Messages" />
                    {chatError && <div role="alert" className="DashboardNotice">{chatError}<button onClick={() => setLoadAttempt(n => n + 1)}>Retry</button></div>}

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
                                            <Image src="/Plus Icon.png" alt="New" width={64} height={64} style={{ width: "100%", height: "auto" }} />
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
                                                <Image src={`/${selectedConvo.avatarSrc}`} alt={selectedConvo.title} width={64} height={64} style={{ width: "100%", height: "auto" }} />
                                            ) : selectedConvo?.type === 'direct' ? (
                                                <span className="text-[18px] font-semibold opacity-60">{selectedConvo.title.charAt(0)}</span>
                                            ) : (
                                                <div className="w-[28px]">
                                                    <Image src="/Lucidify Umbrella.png" alt="Lucidify" width={64} height={64} style={{ width: "100%", height: "auto" }} />
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
                                                <Image src="/Phone Call Icon.png" alt="Call" width={64} height={64} style={{ width: "100%", height: "auto" }} />
                                            </div>
                                        </div>
                                        <div className="rounded-[8px] BlackGradient ContentCardShadow flex justify-center items-center hover:cursor-pointer hover:opacity-70 w-[36px] h-[36px]">
                                            <div className="w-[18px]">
                                                <Image src="/Video Call Icon.png" alt="Video" width={64} height={64} style={{ width: "100%", height: "auto" }} />
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
                                                                <Image src={`/${myAvatar}`} alt="You" width={64} height={64} style={{ width: "100%", height: "auto" }} />
                                                            ) : (
                                                                <span className="text-[14px] opacity-60">👤</span>
                                                            )
                                                        ) : selectedConvo?.type === 'direct' && selectedConvo.avatarSrc ? (
                                                            <Image src={`/${selectedConvo.avatarSrc}`} alt={selectedConvo.title} width={64} height={64} style={{ width: "100%", height: "auto" }} />
                                                        ) : selectedConvo?.type === 'direct' ? (
                                                            <span className="text-[14px] font-semibold opacity-60">{selectedConvo.title.charAt(0)}</span>
                                                        ) : (
                                                            <div className="w-[24px]">
                                                                <Image src="/Lucidify Umbrella.png" alt="Lucidify" width={64} height={64} style={{ width: "100%", height: "auto" }} />
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
                                                                className={`text-[14px] font-light px-[15px] py-[10px] whitespace-pre-wrap break-words [overflow-wrap:anywhere] ${
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
                                            onKeyDown={e => e.key === 'Enter' && !e.nativeEvent.isComposing && !e.shiftKey && sendMessage()}
                                            placeholder="Write a message..."
                                            className="w-full focus:outline-none text-[14px] sm:text-[15px] font-light bg-transparent placeholder:opacity-30"
                                        />
                                        <div className="flex gap-[12px] items-center flex-shrink-0">
                                            <button onClick={sendMessage} aria-label="Send message" disabled={isSending || !newMessage.trim()} className="w-[22px] sm:w-[25px] hover:opacity-70 disabled:opacity-30">
                                                <Image src="/Send Icon.png" alt="Send" width={64} height={64} style={{ width: "100%", height: "auto" }} />
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
