import { useEffect, useRef, useState } from 'react';
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
import Image from 'next/image';
import Link from 'next/link';
import DashboardAdminSideNav from './DashboardAdminSideNav';

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

    useEffect(() => {
        const fetchConversations = async () => {
            const usersSnapshot = await getDocs(collection(db, 'users'));
            const allConversations: Conversation[] = [];

            for (const userDoc of usersSnapshot.docs) {
                const userId = userDoc.id;
                const userFirstName = userDoc.data().firstName as string | undefined;
                const userLastName = userDoc.data().lastName as string | undefined;
                const userCompanyName = userDoc.data().companyName as string | undefined;
                const userAvatar = userDoc.data().selectedAvatar as string | undefined;
                const conversationsRef = collection(db, 'users', userId, 'conversations');
                const conversationsSnapshot = await getDocs(conversationsRef);

                conversationsSnapshot.forEach((doc) => {
                    const conversationData = doc.data();
                    if (conversationData.title === 'Lucidify') {
                        allConversations.push({
                            userId,
                            id: doc.id,
                            firstName: userFirstName,
                            companyName: userCompanyName,
                            selectedAvatar: userAvatar,
                            ...conversationData,
                        });
                    }
                });
            }

            setConversations(allConversations);

            if (allConversations.length > 0) {
                const defaultChat = allConversations[0];
                setSelectedChat(defaultChat);
                fetchMessages(defaultChat.userId, defaultChat.id);

                // 🔹 Reset Lucidify's unread count for default chat
                const convoRef = doc(db, "users", defaultChat.userId, "conversations", defaultChat.id);
                await updateDoc(convoRef, {
                    ["unreadCounts.Lucidify"]: 0,
                });

                // Update local state immediately
                setConversations(prevConvos =>
                    prevConvos.map(convo =>
                        convo.id === defaultChat.id && convo.userId === defaultChat.userId
                            ? {
                                ...convo,
                                unreadCounts: {
                                    ...convo.unreadCounts,
                                    Lucidify: 0,
                                },
                            }
                            : convo
                    )
                );
            }
        };

        fetchConversations();
    }, []);

    const fetchMessages = async (userId: string, conversationId: string) => {
        const messagesRef = collection(db, 'users', userId, 'conversations', conversationId, 'messages');
        const q = query(messagesRef, orderBy('timestamp', 'asc'));

        const unsubscribe = onSnapshot(q, (snapshot: QuerySnapshot<DocumentData>) => {
            const fetchedMessages: Message[] = snapshot.docs.map((doc) => ({
                id: doc.id,
                ...(doc.data() as Omit<Message, 'id'>),
            }));
            setMessages(fetchedMessages);
        });

        return () => unsubscribe();
    };

    const handleChatSelect = async (conversation: Conversation) => {
        setSelectedChat(conversation);
        fetchMessages(conversation.userId, conversation.id);
        setMobileView('chat');

        // Reset admin's unread count
        const convoRef = doc(db, "users", conversation.userId, "conversations", conversation.id);
        await updateDoc(convoRef, {
            ["unreadCounts.Lucidify"]: 0,
        });

        // Update local state
        setConversations((prevConvos) =>
            prevConvos.map((convo) =>
                convo.id === conversation.id && convo.userId === conversation.userId
                    ? {
                        ...convo,
                        unreadCounts: {
                            ...convo.unreadCounts,
                            Lucidify: 0,
                        },
                    }
                    : convo
            )
        );

        // Also update selectedChat state locally
        setSelectedChat((prev) =>
            prev
                ? {
                    ...prev,
                    unreadCounts: {
                        ...prev.unreadCounts,
                        Lucidify: 0,
                    },
                }
                : prev
        );
    };


    const sendMessage = async () => {
        if (newMessage.trim() === '' || !selectedChat) return;

        const newTimestamp = Timestamp.fromDate(new Date());

        const messageData = {
            text: newMessage,
            sender: "Lucidify",
            timestamp: newTimestamp,
            isRead: false,
        };

        try {
            // 1. Add the new message
            await addDoc(
                collection(db, "users", selectedChat.userId, "conversations", selectedChat.id, "messages"),
                messageData
            );

            // 2. Update conversation metadata
            const conversationRef = doc(db, "users", selectedChat.userId, "conversations", selectedChat.id);

            const updatedUnreadCounts = {
                ...selectedChat.unreadCounts,
                [selectedChat.userId]: (selectedChat.unreadCounts?.[selectedChat.userId] || 0) + 1 // 🔑 increment client’s count
            };

            await updateDoc(conversationRef, {
                lastMessage: newMessage,
                timestamp: newTimestamp,
                lastMessageSender: "Lucidify",
                unreadCounts: updatedUnreadCounts,
            });

            // 3. Update local state
            setConversations((prevConvos) =>
                prevConvos.map((convo) =>
                    convo.id === selectedChat.id && convo.userId === selectedChat.userId
                        ? {
                            ...convo,
                            lastMessage: newMessage,
                            timestamp: newTimestamp,
                            lastMessageSender: "Lucidify",
                            unreadCounts: updatedUnreadCounts,
                        }
                        : convo
                )
            );

            setSelectedChat((prev) =>
                prev
                    ? {
                        ...prev,
                        lastMessage: newMessage,
                        timestamp: newTimestamp,
                        lastMessageSender: "Lucidify",
                        unreadCounts: updatedUnreadCounts,
                    }
                    : prev
            );

            setNewMessage("");
        } catch (error) {
            console.error("Error sending message:", error);
        }
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
        <div className="flex h-screen DashboardBackgroundGradient overflow-hidden">
            {/* Left Sidebar */}
            <DashboardAdminSideNav highlight="messages" />

            {/* Right Side (Main Content) */}
            <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                <div className="absolute BottomGradientBorder left-0 top-[103px] w-full" />
                <div className="flex min-w-min items-center justify-between px-[20px] sm:px-[50px] py-6 flex-shrink-0">
                    <div className="inline-flex items-center gap-[5px]">
                        <div className="inline-flex items-center gap-[5px] opacity-40">
                            <div className="w-[15px]">
                                <Image src="/Home Icon.png" alt="Home Icon" layout="responsive" width={0} height={0} />
                            </div>
                            <div className="font-light text-sm">Home</div>
                        </div>
                        <div className="inline-flex items-center gap-[5px]">
                            <div className="font-light text-sm">/ Messages</div>
                        </div>
                    </div>
                    <div className="inline-flex items-center gap-5">
                        <div className="flex w-[55px] h-[55px] items-center justify-center gap-2.5 relative rounded-[100px] BlackGradient ContentCardShadow hover:cursor-pointer">
                            <div className="flex flex-col w-5 h-5 items-center justify-center gap-2.5 px-[3px] py-0 absolute -top-[5px] -left-[4px] bg-[#6265f0] rounded-md">
                                <div className="font-normal text-xs">2</div>
                            </div>
                            <div className="w-[25px]">
                                <Image src="/Notification Bell Icon.png" alt="Bell Icon" layout="responsive" width={0} height={0} />
                            </div>
                        </div>
                        <Link href="/dashboard/settings" className="flex w-[129px] h-[55px] items-center justify-center gap-2.5 px-0 py-[15px] rounded-[15px] BlackGradient ContentCardShadow">
                            <div className="font-light text-sm">Settings</div>
                            <div className="w-[30px]">
                                <Image src="/Settings Icon.png" alt="Settings Icon" layout="responsive" width={0} height={0} />
                            </div>
                        </Link>
                    </div>
                </div>

                {/* Messages Panel */}
                <div className="flex flex-1 min-h-0 justify-center px-[12px] sm:px-[50px] pb-[12px] sm:pb-[30px]">
                    <div className="flex w-full p-[1px] ContentCardShadow rounded-[35px] min-h-0 overflow-hidden">

                        {/* Left: Conversations List */}
                        <div className={`flex flex-col w-full sm:w-[320px] lg:w-[467px] bg-gradient-to-br from-[#1A1A1A] to-[#101010] rounded-[35px] sm:rounded-l-[35px] sm:rounded-r-none min-h-0 overflow-hidden flex-shrink-0 ${mobileView === 'chat' ? 'hidden sm:flex' : 'flex'}`}>
                            <div className="flex justify-between mx-[30px] lg:mx-[50px] mt-[25px] items-center flex-shrink-0">
                                <h1 className="text-[24px] lg:text-[30px] font-semibold mb-[2px]">Messages</h1>
                                <div className="hover:cursor-pointer flex items-center gap-[6px] px-[16px] py-[8px] rounded-[10px] PopupAttentionGradient PopupAttentionShadow">
                                    <div className="w-[15px]">
                                        <Image src="/Plus Icon.png" alt="Plus Icon" layout="responsive" width={0} height={0} />
                                    </div>
                                    <h3 className="text-[14px] font-light">New</h3>
                                </div>
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
                                                    key={conversation.id}
                                                    className={`px-[30px] lg:px-[50px] py-[18px] lg:py-[22px] border-t-[0.5px] border-solid border-white ${selectedChat && selectedChat.id === conversation.id ? 'MessagesHighlightGradient border-opacity-50' : 'border-opacity-25'} text-white cursor-pointer flex gap-[15px]`}
                                                    onClick={() => handleChatSelect(conversation)}
                                                >
                                                    <div className="rounded-[5px] BlackGradient ContentCardShadow flex justify-center items-center flex-shrink-0">
                                                        <div className="w-[30px] mx-[8px] my-[8px] rounded-full overflow-clip">
                                                            <Image src={'/' + conversation.selectedAvatar || '/Lucidify Umbrella.png'} alt="Avatar" layout="responsive" width={0} height={0} />
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
                                                <Image src={'/' + selectedChat.selectedAvatar || '/Lucidify Umbrella.png'} alt="Avatar" layout="responsive" width={0} height={0} />
                                            ) : (
                                                <Image src="/Lucidify Umbrella.png" alt="Lucidify Logo" layout="responsive" width={0} height={0} />
                                            )}
                                        </div>
                                    </div>
                                    <div className="h-full flex flex-col justify-between font-semibold text-[16px] min-w-0">
                                        <h3 className="truncate">{selectedChat ? selectedChat.firstName || 'Untitled Chat' : 'Loading...'}</h3>
                                        <h3 className="opacity-60 text-[14px] font-light truncate">{selectedChat ? selectedChat.lastSeen || 'Last seen...' : 'Last seen...'}</h3>
                                    </div>
                                </div>
                                <div className="flex gap-[15px] sm:gap-[30px] items-center flex-shrink-0">
                                    <div className="hidden sm:flex gap-[15px]">
                                        <div className="rounded-[5px] BlackGradient ContentCardShadow flex justify-center items-center hover:cursor-pointer hover:scale-95">
                                            <div className="w-[20px] h-[20px] flex items-center mx-[8px] my-[8px]">
                                                <Image src="/Phone Call Icon.png" alt="Phone Call Icon" layout="responsive" width={0} height={0} />
                                            </div>
                                        </div>
                                        <div className="rounded-[5px] BlackGradient ContentCardShadow flex justify-center items-center hover:cursor-pointer hover:scale-95">
                                            <div className="w-[20px] h-[20px] flex items-center mx-[8px] my-[8px]">
                                                <Image src="/Video Call Icon.png" alt="Video Call Icon" layout="responsive" width={0} height={0} />
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
                                                            <Image src="/Lucidify Umbrella.png" alt="Lucidify PFP" layout="responsive" width={0} height={0} />
                                                        </div>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="inline-flex gap-[10px] sm:gap-[15px]">
                                                    <div className="rounded-[5px] BlackGradient ContentCardShadow inline-flex justify-center items-center self-start flex-shrink-0">
                                                        <div className="w-[30px] h-[30px] mx-[8px] my-[8px] flex items-center rounded-full overflow-clip">
                                                            <Image src={'/' + selectedChat?.selectedAvatar || '/Lucidify Umbrella.png'} alt="Avatar" layout="responsive" width={0} height={0} />
                                                        </div>
                                                    </div>
                                                    <div className="flex flex-col gap-[10px]">
                                                        <div className="flex items-center gap-[10px]">
                                                            <h3 className="font-semibold text-[16px]">{selectedChat ? selectedChat.firstName || 'Untitled Chat' : 'Loading...'}</h3>
                                                            <h3 className="opacity-80 font-light text-[14px]">{selectedChat ? selectedChat.companyName || 'Untitled Chat' : 'Loading...'}</h3>
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
                                        onChange={(e) => setNewMessage(e.target.value)}
                                        placeholder="Write a Message..."
                                        className="w-full focus:outline-none text-[16px] font-light bg-transparent"
                                    />
                                    <div className="flex gap-[25px] items-center">
                                        <div className="hidden sm:flex gap-[15px]">
                                            <div className="w-[20px] opacity-60 hover:opacity-100 hover:cursor-pointer">
                                                <Image src="/Attachment Icon.png" alt="Send Icon" layout="responsive" width={0} height={0} />
                                            </div>
                                            <div className="w-[20px] opacity-60 hover:opacity-100 hover:cursor-pointer">
                                                <Image src="/Microphone Icon.png" alt="Send Icon" layout="responsive" width={0} height={0} />
                                            </div>
                                        </div>
                                        <button onClick={sendMessage}>
                                            <div className="w-[25px]">
                                                <Image src="/Send Icon.png" alt="Send Icon" layout="responsive" width={0} height={0} />
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
