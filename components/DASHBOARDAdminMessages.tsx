"use client";

import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useChatVisible } from '@/hooks/useChatVisible';
import { subscribeAdminConversations, sendChatMessage } from '@/utils/conversations';
import { getAuth } from 'firebase/auth';
import {
    addDoc,
    collection,
    getDocs,
    onSnapshot,
    orderBy,
    query,
    Timestamp,
    doc,
    DocumentData,
    QuerySnapshot,
    updateDoc
} from 'firebase/firestore';
import { auth, db } from '../firebaseConfig';
import { writeNotification } from '../utils/notifications';
import Image from 'next/image';
import DashboardAdminSideNav from './DashboardAdminSideNav';
import DashboardTopBar from './DashboardTopBar';

// Types
interface Conversation {
    userId: string;
    id: string;
    firstName?: string;
    companyName?: string;
    unreadCounts?: Record<string, number>; // 🔑 replaces unreadMessagesCount
    lastName?: string;
    selectedAvatar?: string;
    title?: string;
    timestamp?: Timestamp | null;
    lastMessage?: string | null;
    lastSeen?: string | null;
    lastMessageSender?: string | null;
}



interface Message {
    id: string;
    text: string;
    sender: string;
    timestamp: Timestamp;
}

interface SelectedChat {
    lastSeen?: string | null; // Last seen value or null
}

const DASHBOARDAdminMessages: React.FC = () => {
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [messages, setMessages] = useState<Message[]>([]);
    const [selectedChat, setSelectedChat] = useState<Conversation | null>(null);
    const [newMessage, setNewMessage] = useState<string>('');
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [mobileView, setMobileView] = useState<'list' | 'chat'>('list');
    const [chatError, setChatError] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [loadAttempt, setLoadAttempt] = useState(0);
    const chatVisible = useChatVisible(mobileView);
    const params = useSearchParams();
    const requestedId = params.get('conversationId');
    const appliedLink = useRef('');
    const requestedUser = params.get('userId');

    useEffect(() => {
        setChatError('');
        return subscribeAdminConversations(items => setConversations(items as unknown as Conversation[]), () => setChatError('Couldn’t load conversations. Please retry.'));
    }, [loadAttempt]);
    useEffect(() => {
        const target = conversations.find(c => c.id === requestedId && c.userId === requestedUser);
        if (target && appliedLink.current !== `${requestedUser}:${requestedId}`) { appliedLink.current = `${requestedUser}:${requestedId}`; setSelectedChat(target); setMobileView('chat'); }
        else setSelectedChat(current => current ? conversations.find(c => c.id === current.id && c.userId === current.userId) || current : window.matchMedia('(min-width: 640px)').matches ? conversations[0] || null : null);
    }, [conversations, requestedId, requestedUser]);
    const handleChatSelect = (conversation: Conversation) => { setSelectedChat(conversation); setMobileView('chat'); setChatError(''); };
    const selectedUnread = selectedChat?.unreadCounts?.Lucidify || 0;
    useEffect(() => {
        if (!selectedChat || !selectedUnread || !chatVisible) return;
        void updateDoc(doc(db, 'users', selectedChat.userId, 'conversations', selectedChat.id), { 'unreadCounts.Lucidify': 0 }).catch(() => setChatError(current => current || 'Couldn’t mark this conversation as read.'));
    }, [selectedChat, selectedUnread, chatVisible]);
    const selectedChatId = selectedChat?.id;
    const selectedUserId = selectedChat?.userId;
    useEffect(() => {
        setMessages([]);
        if (!selectedChatId || !selectedUserId) return;
        const ref = collection(db, 'users', selectedUserId!, 'conversations', selectedChatId!, 'messages');
        return onSnapshot(query(ref, orderBy('timestamp','asc')), snap => setMessages(snap.docs.map(d => ({ ...d.data(), id:d.id } as Message))), () => setChatError('Couldn’t load messages. Please retry.'));
    }, [selectedChatId, selectedUserId, loadAttempt]);
    const sendMessage = async () => {
        const text = newMessage.trim();
        if (!text || !selectedChat || isSending) return;
        setIsSending(true); setChatError('');
        try {
            await sendChatMessage({ conversationId: selectedChat.id, ownerId: selectedChat.userId, text, type:'lucidify', admin:true });
            setNewMessage(current => current.trim() === text ? '' : current);
        } catch { setChatError('Message wasn’t sent. Your draft is still here — try again.'); }
        finally { setIsSending(false); }
    };

    const formatTimestamp = (timestamp?: Timestamp | null): string => {
        if (!timestamp) return ''; // Handle null or undefined
        const date = timestamp.toDate();
        return date.toLocaleString(); // Format as desired
    };

    const chunkMessagesBySender = (messages: Message[]): Message[][] => {
        const groupedMessages: Message[][] = [];
        let currentGroup: Message[] = [];

        messages.forEach((message, index) => {
            if (index === 0 || message.sender !== messages[index - 1].sender) {
                if (currentGroup.length > 0) {
                    groupedMessages.push(currentGroup);
                }
                currentGroup = [message];
            } else {
                currentGroup.push(message);
            }
        });

        if (currentGroup.length > 0) {
            groupedMessages.push(currentGroup);
        }

        return groupedMessages;
    };

    const groupedMessages = chunkMessagesBySender(messages);

    const filteredConversations = conversations.filter(convo =>
        convo.firstName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        convo.companyName?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const messagesEndRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollTop = messagesEndRef.current.scrollHeight;
        }
    }, [groupedMessages]);

    return (
        <div className="flex flex-col xl:flex-row h-screen DashboardBackgroundGradient overflow-hidden">
            {/* Left Sidebar */}
            <DashboardAdminSideNav highlight="messages" />

            {/* Right Side (Main Content) */}
            <div className="flex-1 flex flex-col min-h-0 overflow-hidden pt-[60px] xl:pt-0">
                <DashboardTopBar title="Messages" />
                {chatError && <div role="alert" className="DashboardNotice">{chatError}<button onClick={() => setLoadAttempt(n => n + 1)}>Retry</button></div>}

                {/* Messages Panel */}
                <div className="flex flex-1 min-h-0 justify-center px-[12px] sm:px-[50px] pb-[12px] sm:pb-[30px]">
                    <div className="flex w-full p-[1px] ContentCardShadow rounded-[35px] min-h-0 overflow-hidden">

                        {/* Left: Conversations List */}
                        <div className={`flex flex-col w-full sm:w-[320px] lg:w-[467px] bg-gradient-to-br from-[#1A1A1A] to-[#101010] rounded-[35px] sm:rounded-l-[35px] sm:rounded-r-none min-h-0 overflow-hidden flex-shrink-0 ${mobileView === 'chat' ? 'hidden sm:flex' : 'flex'}`}>
                            <div className="flex justify-between mx-[30px] lg:mx-[50px] mt-[25px] items-center flex-shrink-0">
                                <h1 className="text-[24px] lg:text-[30px] font-semibold mb-[2px]">Messages</h1>
                                <a href="/dashboard/projects" className="text-[12px] underline">View clients</a>
                            </div>
                            <div className="relative my-[20px] lg:my-[30px] mx-[30px] lg:mx-[50px] flex-shrink-0">
                                <input
                                    type="text"
                                    placeholder="Search"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full px-[15px] py-[12px] lg:py-[15px] rounded-lg BlackWithLightGradient ContentCardShadow text-[14px] focus:outline-none"
                                />
                            </div>
                            <div className="flex flex-col gap-[10px] flex-1 overflow-y-auto min-h-0">
                                <div className="flex flex-col gap-[10px]">
                                    <h3 className="px-[30px] lg:px-[50px] opacity-70 font-light text-[14px]">All Messages</h3>
                                    <div className="flex flex-col">
                                        {filteredConversations.length > 0 ? (
                                            filteredConversations.map(conversation => (
                                                <div
                                                    key={`${conversation.userId}:${conversation.id}`}
                                                    className={`px-[30px] lg:px-[50px] py-[18px] lg:py-[22px] border-t-[0.5px] border-solid border-white ${selectedChat && selectedChat.id === conversation.id && selectedChat.userId === conversation.userId ? 'MessagesHighlightGradient border-opacity-50' : 'border-opacity-25'} text-white cursor-pointer flex gap-[15px]`}
                                                    onClick={() => handleChatSelect(conversation)}
                                                >
                                                    <div className="rounded-[5px] BlackGradient ContentCardShadow flex justify-center items-center flex-shrink-0">
                                                        <div className="w-[30px] mx-[8px] my-[8px] rounded-full overflow-clip">
                                                            <Image src={conversation.selectedAvatar ? `/${conversation.selectedAvatar}` : '/Lucidify Umbrella.png'} alt="Avatar" width={64} height={64} style={{ width: "100%", height: "auto" }} />
                                                        </div>
                                                    </div>
                                                    <div className="flex flex-col h-full flex-grow min-w-0">
                                                        <div className="flex justify-between w-full">
                                                            <h4 className="text-[16px] flex-grow truncate">{conversation.firstName}</h4>
                                                            <h4 className="text-[12px] opacity-60 flex-shrink-0 ml-2">{formatTimestamp(conversation.timestamp)}</h4>
                                                        </div>
                                                        <div className="flex justify-between w-full">
                                                            <p className="text-[14px] opacity-40 truncate flex-grow">{conversation.lastMessage}</p>
                                                            {conversation.unreadCounts?.["Lucidify"] ? (
                                                                <div className="flex justify-center items-center w-[20px] h-[20px] bg-[#6265F0] rounded-full flex-shrink-0 ml-2">
                                                                    <h4 className="px-[2px] text-[12px]">{conversation.unreadCounts["Lucidify"]}</h4>
                                                                </div>
                                                            ) : null}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="w-full flex justify-center items-center">
                                                <p className="text-sm opacity-60 text-white pt-[30px] pb-[40px]">No messages</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Right: Chat Messages */}
                        <div className={`flex-1 bg-gradient-to-br from-[#101010] to-[#1A1A1A] rounded-[35px] sm:rounded-l-none sm:rounded-r-[35px] flex flex-col LeftGradientBorder min-h-0 overflow-hidden ${mobileView === 'list' ? 'hidden sm:flex' : 'flex'}`}>
                            {/* Top part */}
                            <div className="BlackWithLightGradient rounded-t-[35px] sm:rounded-tl-none sm:rounded-tr-[35px] px-[20px] sm:px-[60px] py-[20px] flex justify-between border-b-[0.5px] border-solid border-white border-opacity-20 flex-shrink-0 items-center">
                                <button
                                    className="sm:hidden mr-[10px] opacity-60 hover:opacity-100 flex-shrink-0"
                                    onClick={() => setMobileView('list')}
                                    aria-label="Back to conversations"
                                >
                                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                                        <path d="M12 4l-6 6 6 6" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                </button>
                                <div className="flex gap-[10px] flex-1 min-w-0">
                                    <div className="rounded-[5px] BlackGradient ContentCardShadow flex justify-center items-center flex-shrink-0">
                                        <div className="w-[30px] h-[30px] flex items-center mx-[8px] my-[8px] rounded-full overflow-clip">
                                            {selectedChat ? (
                                                <Image src={selectedChat.selectedAvatar ? `/${selectedChat.selectedAvatar}` : '/Lucidify Umbrella.png'} alt="Avatar" width={64} height={64} style={{ width: "100%", height: "auto" }} />
                                            ) : (
                                                <Image src="/Lucidify Umbrella.png" alt="Lucidify Logo" width={64} height={64} style={{ width: "100%", height: "auto" }} />
                                            )}
                                        </div>
                                    </div>
                                    <div className="h-full flex flex-col justify-between font-semibold text-[16px] min-w-0">
                                        <h3 className="truncate">{selectedChat ? selectedChat.firstName || 'Untitled Chat' : 'Loading...'}</h3>
                                        <h3 className="opacity-60 text-[14px] font-light truncate">{selectedChat ? 'Lucidify client' : 'Choose a conversation'}</h3>
                                    </div>
                                </div>
                                <div className="flex gap-[15px] sm:gap-[30px] items-center flex-shrink-0">
                                    <div className="hidden sm:flex gap-[15px]">
                                        <div className="rounded-[5px] BlackGradient ContentCardShadow flex justify-center items-center hover:cursor-pointer hover:scale-95">
                                            <div className="w-[20px] h-[20px] flex items-center mx-[8px] my-[8px]">
                                                <Image src="/Phone Call Icon.png" alt="Phone Call Icon" width={64} height={64} style={{ width: "100%", height: "auto" }} />
                                            </div>
                                        </div>
                                        <div className="rounded-[5px] BlackGradient ContentCardShadow flex justify-center items-center hover:cursor-pointer hover:scale-95">
                                            <div className="w-[20px] h-[20px] flex items-center mx-[8px] my-[8px]">
                                                <Image src="/Video Call Icon.png" alt="Video Call Icon" width={64} height={64} style={{ width: "100%", height: "auto" }} />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex flex-col gap-[4px] hover:cursor-pointer hover:opacity-50">
                                        <div className="bg-white rounded-full w-[4px] h-[4px]" />
                                        <div className="bg-white rounded-full w-[4px] h-[4px]" />
                                        <div className="bg-white rounded-full w-[4px] h-[4px]" />
                                    </div>
                                </div>
                            </div>

                            {/* Middle part - scrollable */}
                            <div ref={messagesEndRef} className="flex flex-col overflow-y-auto gap-[15px] flex-1 min-h-0">
                                {groupedMessages.map((group, index) => (
                                    <div key={index} className={`flex mx-[20px] sm:mx-[60px] my-[15px] sm:my-[30px] ${group[0].sender === 'Lucidify' ? "justify-end" : "justify-start"}`}>
                                        <div className="max-w-[85%] sm:max-w-[80%]">
                                            {group[0].sender === 'Lucidify' ? (
                                                <div className="inline-flex gap-[10px] sm:gap-[15px]">
                                                    <div className="flex flex-col gap-[10px] items-end">
                                                        <div className="flex items-center gap-[10px]">
                                                            <h3 className="opacity-80 font-light text-[14px]">Moopy</h3>
                                                            <h3 className="font-semibold text-[16px]">You</h3>
                                                        </div>
                                                        <div className="flex flex-col gap-[10px] items-end">
                                                            {group.map((message) => (
                                                                <div key={message.id} className="inline flex-col gap-[50px]">
                                                                    <div className={`inline-flex text-[14px] font-light rounded-b-[15px] rounded-tl-[15px] px-[15px] py-[10px] ${message.sender === 'Lucidify' ? 'PopupAttentionGradient PopupAttentionShadow' : 'MessagesHighlightGradient ContentCardShadow'}`}>
                                                                        {message.text}
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                    <div className="rounded-[5px] BlackGradient ContentCardShadow inline-flex justify-center items-center self-start flex-shrink-0">
                                                        <div className="w-[35px] h-[35px] mx-[8px] my-[8px] flex items-center rounded-full overflow-clip">
                                                            <Image src="/Lucidify Umbrella.png" alt="Lucidify PFP" width={64} height={64} style={{ width: "100%", height: "auto" }} />
                                                        </div>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="inline-flex gap-[10px] sm:gap-[15px]">
                                                    <div className="rounded-[5px] BlackGradient ContentCardShadow inline-flex justify-center items-center self-start flex-shrink-0">
                                                        <div className="w-[30px] h-[30px] mx-[8px] my-[8px] flex items-center rounded-full overflow-clip">
                                                            <Image src={selectedChat?.selectedAvatar ? `/${selectedChat.selectedAvatar}` : '/Lucidify Umbrella.png'} alt="Avatar" width={64} height={64} style={{ width: "100%", height: "auto" }} />
                                                        </div>
                                                    </div>
                                                    <div className="flex flex-col gap-[10px]">
                                                        <div className="flex items-center gap-[10px]">
                                                            <h3 className="font-semibold text-[16px]">{selectedChat ? selectedChat.firstName || 'Untitled Chat' : 'Loading...'}</h3>
                                                            <h3 className="opacity-80 font-light text-[14px]">{selectedChat ? selectedChat.companyName || 'Lucidify member' : 'Loading...'}</h3>
                                                        </div>
                                                        <div className="flex flex-col gap-[10px]">
                                                            {group.map((message) => (
                                                                <div key={message.id} className="inline flex-col gap-[50px]">
                                                                    <div className={`inline-flex text-[14px] font-light rounded-b-[15px] rounded-tr-[15px] px-[15px] py-[10px] ${message.sender === 'Lucidify' ? 'PopupAttentionGradient PopupAttentionShadow' : 'MessagesHighlightGradient ContentCardShadow'}`}>
                                                                        {message.text}
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Bottom part */}
                            <div className="BlackGradient ContentCardShadow rounded-b-[35px] sm:rounded-bl-none sm:rounded-br-[35px] px-[20px] sm:px-[50px] py-[17px] flex gap-[25px] flex-shrink-0">
                                <div className="BlackWithLightGradient ContentCardShadow rounded-[10px] flex gap-[25px] px-[15px] sm:px-[25px] py-[13px] w-full">
                                    <input
                                        type="text"
                                        value={newMessage}
                                        disabled={!selectedChat || isSending}
                                        onKeyDown={e => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) { e.preventDefault(); void sendMessage(); } }}
                                        onChange={(e) => setNewMessage(e.target.value)}
                                        placeholder="Write a Message..."
                                        className="w-full focus:outline-none text-[16px] font-light bg-transparent"
                                    />
                                    <div className="flex gap-[25px] items-center">
                                        <div className="hidden sm:flex gap-[15px]">
                                            <div className="w-[20px] opacity-60 hover:opacity-100 hover:cursor-pointer">
                                                <Image src="/Attachment Icon.png" alt="Send Icon" width={64} height={64} style={{ width: "100%", height: "auto" }} />
                                            </div>
                                            <div className="w-[20px] opacity-60 hover:opacity-100 hover:cursor-pointer">
                                                <Image src="/Microphone Icon.png" alt="Send Icon" width={64} height={64} style={{ width: "100%", height: "auto" }} />
                                            </div>
                                        </div>
                                        <button aria-label="Send message" disabled={isSending || !newMessage.trim() || !selectedChat} onClick={sendMessage}>
                                            <div className="w-[25px]">
                                                <Image src="/Send Icon.png" alt="Send Icon" width={64} height={64} style={{ width: "100%", height: "auto" }} />
                                            </div>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DASHBOARDAdminMessages;
