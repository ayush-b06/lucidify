"use client";

import { useEffect, useRef, useState } from 'react';
import { collection, doc, getDoc, increment, onSnapshot, orderBy, query, serverTimestamp, Timestamp, updateDoc, writeBatch } from 'firebase/firestore';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { db } from '../firebaseConfig';
import { useAuth } from '@/context/authContext';
import { ClientConversation as ConvoItem, conversationKey, useClientConversations } from '@/hooks/useClientConversations';
import { writeAdminNotification } from '../utils/notifications';
import DashboardClientSideNav from './DashboardClientSideNav';
import Image from 'next/image';
import AddDirectMessageModal from './AddDirectMessageModal';
import DashboardTopBar from './DashboardTopBar';

interface Message {
    id: string;
    text: string;
    sender: string;
    timestamp: Timestamp | null;
    pending?: boolean;
}

const DASHBOARDClientMessages = () => {
    const { user } = useAuth();
    const userId = user?.uid;
    const { convos, loading: conversationsLoading, error: conversationsError, retry: retryConversations } = useClientConversations(userId);
    const [messages, setMessages] = useState<Message[]>([]);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [drafts, setDrafts] = useState<Record<string, string>>({});
    const [sendErrors, setSendErrors] = useState<Record<string, string>>({});
    const [myAvatar, setMyAvatar] = useState<string | null>(null);
    const [myFirstName, setMyFirstName] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [mobileView, setMobileView] = useState<'list' | 'chat'>('list');
    const [isDMModalOpen, setIsDMModalOpen] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const [messagesLoading, setMessagesLoading] = useState(false);
    const [messagesError, setMessagesError] = useState('');
    const [readError, setReadError] = useState('');
    const [messageAttempt, setMessageAttempt] = useState(0);
    const [pageVisible, setPageVisible] = useState(true);
    const [desktopChat, setDesktopChat] = useState(false);
    const sendLock = useRef(false);
    const draftValues = useRef<Record<string, string>>({});
    const messagesEndRef = useRef<HTMLDivElement | null>(null);
    const keepAtBottom = useRef(true);
    const selectedConvo = convos.find(c => conversationKey(c) === selectedId) || null;
    const selectedType = selectedConvo?.type;
    const selectedDocumentId = selectedConvo?.id;
    const newMessage = selectedId ? drafts[selectedId] || '' : '';
    const projectId = useSearchParams().get('projectId');
    const [projectName, setProjectName] = useState('');
    const [projectError, setProjectError] = useState('');

    useEffect(() => {
        if (!userId) return;
        let active = true;
        getDoc(doc(db, 'users', userId)).then(snapshot => {
            if (!active || !snapshot.exists()) return;
            setMyAvatar(snapshot.data().selectedAvatar || null);
            setMyFirstName(snapshot.data().firstName || '');
        }).catch(console.error);
        return () => { active = false; };
    }, [userId]);

    useEffect(() => {
        setProjectName('');
        setProjectError('');
        if (!userId || !projectId) return;
        let active = true;
        getDoc(doc(db, 'users', userId, 'projects', projectId)).then(snapshot => {
            if (!active) return;
            if (snapshot.exists()) setProjectName(snapshot.data().projectName || 'Your project');
            else setProjectError('This project is unavailable. You can still message the team.');
        }).catch(() => { if (active) setProjectError('Project details couldn’t load. You can still message the team.'); });
        return () => { active = false; };
    }, [userId, projectId]);

    useEffect(() => {
        if (!selectedId && convos.length) {
            const initial = convos.find(c => c.type === 'lucidify' && c.id === 'lucidify') || convos.find(c => c.type === 'lucidify') || convos[0];
            setSelectedId(conversationKey(initial));
            if (projectId) setMobileView('chat');
        }
    }, [convos, selectedId, projectId]);

    const storageKey = (id: string) => `lucidify:message-draft:${userId}:${id}`;
    const saveDraft = (id: string, value: string) => {
        draftValues.current[id] = value;
        setDrafts(previous => ({ ...previous, [id]: value }));
        try {
            if (value) sessionStorage.setItem(storageKey(id), value);
            else sessionStorage.removeItem(storageKey(id));
        } catch { /* Drafts still work in memory when browser storage is disabled. */ }
    };

    useEffect(() => {
        if (!selectedId || !userId) return;
        try {
            const value = sessionStorage.getItem(`lucidify:message-draft:${userId}:${selectedId}`) || '';
            draftValues.current[selectedId] = value;
            setDrafts(previous => ({ ...previous, [selectedId]: value }));
        } catch { /* Keep the in-memory draft. */ }
    }, [selectedId, userId]);

    const handleChatSelect = (convo: ConvoItem) => {
        if (conversationKey(convo) !== selectedId) {
            setMessages([]);
            setMessagesLoading(true);
            setMessagesError('');
            setSelectedId(conversationKey(convo));
            keepAtBottom.current = true;
        }
        setMobileView('chat');
    };

    useEffect(() => {
        if (!selectedDocumentId || !selectedType || !userId) { setMessages([]); setMessagesLoading(false); setMessagesError(''); return; }
        setMessages([]);
        setMessagesLoading(true);
        setMessagesError('');
        const reference = selectedType === 'lucidify'
            ? collection(db, 'users', userId, 'conversations', selectedDocumentId, 'messages')
            : collection(db, 'directMessages', selectedDocumentId, 'messages');
        return onSnapshot(query(reference, orderBy('timestamp', 'asc')), { includeMetadataChanges: true }, snapshot => {
            setMessages(snapshot.docs.map(item => ({ id: item.id, ...item.data({ serverTimestamps: 'estimate' }), pending: item.metadata.hasPendingWrites } as Message)));
            setMessagesLoading(false);
            setMessagesError('');
        }, () => {
            setMessagesLoading(false);
            setMessagesError('We couldn’t load these messages. Please try again.');
        });
    }, [selectedDocumentId, selectedType, userId, messageAttempt]);

    useEffect(() => {
        const media = window.matchMedia('(min-width: 640px)');
        const update = () => { setPageVisible(document.visibilityState === 'visible'); setDesktopChat(media.matches); };
        update();
        document.addEventListener('visibilitychange', update);
        media.addEventListener('change', update);
        return () => { document.removeEventListener('visibilitychange', update); media.removeEventListener('change', update); };
    }, []);

    const unreadCount = selectedConvo?.unreadCount || 0;
    useEffect(() => {
        setReadError('');
        if (!userId || !selectedType || !selectedDocumentId || !unreadCount || messagesLoading || messagesError || !pageVisible || (!desktopChat && mobileView !== 'chat')) return;
        let active = true;
        const reference = selectedType === 'lucidify'
            ? doc(db, 'users', userId, 'conversations', selectedDocumentId)
            : doc(db, 'directMessages', selectedDocumentId);
        updateDoc(reference, { [`unreadCounts.${userId}`]: 0 }).catch(() => {
            if (active) setReadError('Messages loaded, but we couldn’t mark this conversation as read.');
        });
        return () => { active = false; };
    }, [userId, selectedType, selectedDocumentId, unreadCount, messagesLoading, messagesError, pageVisible, desktopChat, mobileView, messageAttempt]);

    useEffect(() => {
        if (keepAtBottom.current && messagesEndRef.current) messagesEndRef.current.scrollTop = messagesEndRef.current.scrollHeight;
    }, [messages]);

    const sendMessage = async () => {
        const text = newMessage.trim();
        if (!text || !selectedConvo || !selectedId || !userId || sendLock.current || messagesLoading || messagesError) return;
        const key = selectedId;
        const draft = newMessage;
        const outgoingText = projectName && selectedConvo.type === 'lucidify' ? `[Project: ${projectName}]\n${text}` : text;
        const recipient = selectedConvo.type === 'lucidify' ? 'Lucidify' : selectedConvo.otherUserId;
        if (!recipient) return;
        sendLock.current = true;
        setIsSending(true);
        setSendErrors(previous => ({ ...previous, [key]: '' }));
        keepAtBottom.current = true;
        const reference = selectedConvo.type === 'lucidify'
            ? doc(db, 'users', userId, 'conversations', selectedConvo.id)
            : doc(db, 'directMessages', selectedConvo.id);
        const batch = writeBatch(db);
        const timestamp = serverTimestamp();
        batch.set(doc(collection(reference, 'messages')), { text: outgoingText, sender: userId, timestamp, isRead: false });
        batch.update(reference, { lastMessage: outgoingText, lastMessageSender: userId, timestamp, [`unreadCounts.${recipient}`]: increment(1) });
        try {
            await batch.commit();
            // A send finishing in another chat must not erase a newer draft.
            if (draftValues.current[key] === draft) saveDraft(key, '');
            if (selectedConvo.type === 'lucidify') void writeAdminNotification(`New message from ${myFirstName || 'A client'}`, outgoingText.slice(0, 80), '/dashboard/messages');
        } catch {
            setSendErrors(previous => ({ ...previous, [key]: 'Your message wasn’t sent. Your draft is saved here; try sending again.' }));
        } finally {
            sendLock.current = false;
            setIsSending(false);
        }
    };

    const handleDMCreated = (convoId: string) => {
        setSelectedId(`direct:${convoId}`);
        setMessages([]);
        setMobileView('chat');
        setIsDMModalOpen(false);
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

    const groupedMessages = chunkBySender(messages);
    const filteredConvos = convos.filter(c =>
        c.title.toLowerCase().includes(searchQuery.toLowerCase())
    );
    const pinnedConvos = filteredConvos.filter(c => c.isPinned);
    const allConvos = filteredConvos.filter(c => !c.isPinned);

    const ConvoRow = ({ convo }: { convo: ConvoItem }) => (
        <button
            type="button"
            aria-label={`Open conversation with ${convo.title}`}
            aria-pressed={selectedId === conversationKey(convo)}
            className={`w-full text-left px-[30px] lg:px-[50px] py-[18px] lg:py-[22px] border-t-[0.5px] border-solid border-white ${selectedId === conversationKey(convo) ? 'MessagesHighlightGradient border-opacity-50' : 'border-opacity-10'} text-white cursor-pointer flex gap-[15px] hover:bg-white/[0.02]`}
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
        </button>
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
                                    {conversationsLoading && <p role="status" className="p-5 text-[13px]">Loading conversations...</p>}
                                    {conversationsError && <div role="alert" className="p-5 text-[13px]"><p>{conversationsError}</p><button onClick={retryConversations} className="underline mt-2">Retry conversations</button></div>}
                                    {pinnedConvos.length > 0 && (
                                        <div className="mb-[4px]">
                                            <p className="px-[30px] lg:px-[40px] pb-[8px] opacity-40 font-light text-[12px] uppercase tracking-wide">Pinned</p>
                                            {pinnedConvos.map(c => <ConvoRow key={conversationKey(c)} convo={c} />)}
                                        </div>
                                    )}
                                    {allConvos.length > 0 ? (
                                        <div>
                                            <p className="px-[30px] lg:px-[40px] pb-[8px] opacity-40 font-light text-[12px] uppercase tracking-wide">
                                                {pinnedConvos.length > 0 ? 'All Messages' : 'Conversations'}
                                            </p>
                                            {allConvos.map(c => <ConvoRow key={conversationKey(c)} convo={c} />)}
                                        </div>
                                    ) : !conversationsLoading && !conversationsError && convos.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center py-[40px] gap-[10px] opacity-40">
                                            <span className="text-[32px]">💬</span>
                                            <p className="text-[13px] font-light">No conversations yet</p>
                                            <button onClick={() => setIsDMModalOpen(true)} className="text-[12px] text-[#725CF7] hover:opacity-80 mt-[4px]">
                                                Start a new message
                                            </button>
                                        </div>
                                    ) : !conversationsLoading && !conversationsError && filteredConvos.length === 0 && convos.length > 0 ? (
                                        <div className="flex justify-center py-[30px]">
                                            <p className="text-[13px] opacity-40">No results</p>
                                        </div>
                                    ) : null}
                                </div>
                            </div>

                            {/* ── Right: Chat Panel ── */}
                            <div className={`flex-1 bg-gradient-to-br from-[#101010] to-[#1A1A1A] rounded-[35px] sm:rounded-l-none sm:rounded-r-[35px] flex flex-col LeftGradientBorder min-h-0 overflow-hidden ${mobileView === 'list' ? 'hidden sm:flex' : 'flex'}`}>

                                {/* Chat header */}
                                <div className="BlackWithLightGradient rounded-t-[35px] sm:rounded-tl-none sm:rounded-tr-[35px] px-[20px] sm:px-[40px] py-[18px] flex justify-between border-b-[0.5px] border-solid border-white border-opacity-10 flex-shrink-0 items-center gap-[12px]">
                                    <button
                                        className="sm:hidden opacity-60 hover:opacity-100 flex-shrink-0"
                                        aria-label="Back to conversations"
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

                                </div>
                                {projectName && selectedType === 'lucidify' && <div className="px-5 py-3 text-[13px] border-b border-white/10">
                                    Discussing <Link className="underline" href={`/dashboard/projects/${encodeURIComponent(projectId!)}`}>{projectName}</Link>. Your message will include the project name.
                                </div>}
                                {projectError && <p role="status" className="px-5 py-3 text-[13px]">{projectError}</p>}
                                {readError && <div role="alert" className="px-5 py-3 text-[13px]">{readError} <button className="underline" onClick={() => setMessageAttempt(value => value + 1)}>Retry</button></div>}

                                {/* Messages */}
                                <div ref={messagesEndRef} onScroll={event => { const element = event.currentTarget; keepAtBottom.current = element.scrollHeight - element.scrollTop - element.clientHeight < 80; }} className="flex flex-col overflow-y-auto gap-[10px] flex-1 min-h-0 px-[20px] sm:px-[40px] py-[20px]">
                                    {messagesLoading && <p role="status" className="text-[13px]">Loading messages...</p>}
                                    {messagesError && <div role="alert" className="text-[13px]"><p>{messagesError}</p><button onClick={() => setMessageAttempt(value => value + 1)} className="underline mt-2">Retry messages</button></div>}
                                    {!messagesLoading && !messagesError && groupedMessages.length === 0 && (
                                        <div className="flex flex-col items-center justify-center h-full gap-[10px] opacity-30">
                                            <span className="text-[36px]">💬</span>
                                            <p className="text-[14px] font-light">{selectedConvo ? 'No messages yet. Say hello!' : 'Choose a conversation to get started.'}</p>
                                        </div>
                                    )}
                                    {groupedMessages.map((group, idx) => {
                                        const isMe = group[0].sender === userId;
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
                                                                className={`whitespace-pre-wrap break-words min-w-0 text-[14px] font-light px-[15px] py-[10px] ${
                                                                    isMe
                                                                        ? 'PopupAttentionGradient PopupAttentionShadow rounded-b-[15px] rounded-tl-[15px]'
                                                                        : 'MessagesHighlightGradient ContentCardShadow rounded-b-[15px] rounded-tr-[15px]'
                                                                }`}
                                                            >
                                                                {msg.text}
                                                                {msg.pending && <span className="block text-[11px] opacity-60 mt-1">Sending...</span>}
                                                            </div>
                                                        ))}
                                                        <p className="text-[11px] opacity-25 px-[4px]">{formatTimestamp(group[group.length - 1].timestamp)}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                {selectedId && sendErrors[selectedId] && <p role="alert" className="px-5 py-3 text-[13px]">{sendErrors[selectedId]}</p>}
                                {/* Input */}
                                <div className="BlackGradient ContentCardShadow rounded-b-[35px] sm:rounded-bl-none sm:rounded-br-[35px] px-[20px] sm:px-[40px] py-[16px] flex-shrink-0">
                                    <div className="BlackWithLightGradient ContentCardShadow rounded-[12px] flex gap-[15px] px-[16px] sm:px-[22px] py-[12px] items-center">
                                        <textarea
                                            rows={2}
                                            maxLength={5000}
                                            aria-label="Message"
                                            disabled={!selectedConvo || isSending || messagesLoading || !!messagesError}
                                            value={newMessage}
                                            onChange={e => { if (selectedId) saveDraft(selectedId, e.target.value); }}
                                            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); void sendMessage(); } }}
                                            placeholder="Write a message..."
                                            className="w-full focus:outline-none text-[14px] sm:text-[15px] font-light bg-transparent placeholder:opacity-30"
                                        />
                                        <div className="flex gap-[12px] items-center flex-shrink-0">
                                            <button aria-label="Send message" onClick={sendMessage} disabled={isSending || !newMessage.trim() || !selectedConvo || messagesLoading || !!messagesError} className="w-[22px] sm:w-[25px] hover:opacity-70 disabled:opacity-30">
                                                <Image src="/Send Icon.png" alt="Send" layout="responsive" width={0} height={0} />
                                            </button>
                                        </div>
                                    </div>
                                    <p className="text-[11px] opacity-50 mt-2">Enter to send · Shift+Enter for a new line · Drafts saved in this tab</p>
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
