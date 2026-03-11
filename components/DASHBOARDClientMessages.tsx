import { useEffect, useRef, useState } from 'react';
import { getAuth } from 'firebase/auth';
import { addDoc, collection, doc, getDoc, getDocs, onSnapshot, orderBy, query, Timestamp, updateDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { auth, db } from '../firebaseConfig'; // Firestore instance
import DashboardClientSideNav from './DashboardClientSideNav';
import Image from 'next/image';
import Link from 'next/link';
import CreateProjectPopup from './CreateProjectPopup';

interface Message {
    id: string;
    text: string;
    sender: string;
    timestamp: Timestamp;
}

interface Conversation {
    id: string;
    title: string;
    isPinned: boolean;
    timestamp: Timestamp;
    lastMessage: string;
    lastMessageSender: string;
    lastSeen: string;
    unreadCounts: Record<string, number>; // 🔑 replaces unreadMessagesCount
}


const DASHBOARDClientMessages = () => {
    const router = useRouter();
    const [conversations, setConversations] = useState<Conversation[]>([]); // List of conversations
    const [messages, setMessages] = useState<Message[]>([]); // Messages in the currently selected conversation
    const [selectedChat, setSelectedChat] = useState<string>('Lucidify'); // Initially set to 'Lucidify'
    const [newMessage, setNewMessage] = useState<string>('');
    const [selectedAvatar, setSelectedAvatar] = useState<string | null>(null); // 🔑 new state
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [mobileView, setMobileView] = useState<'list' | 'chat'>('list');

    const authInstance = getAuth();

    // 🔑 Fetch user profile (for avatar, etc.)
    useEffect(() => {
        const fetchUserAvatar = async () => {
            const user = authInstance.currentUser;
            if (!user) return;

            try {
                const userRef = doc(db, "users", user.uid);
                const userSnap = await getDoc(userRef);

                if (userSnap.exists()) {
                    const data = userSnap.data();
                    setSelectedAvatar(data.selectedAvatar || null); // Save avatar if it exists
                }
            } catch (error) {
                console.error("Error fetching user avatar:", error);
            }
        };

        fetchUserAvatar();
    }, [authInstance]);

    useEffect(() => {
        const fetchConversations = async () => {
            const userId = auth.currentUser?.uid;
            if (!userId) return;

            const conversationsRef = collection(db, 'users', userId, 'conversations');
            const conversationsSnapshot = await getDocs(conversationsRef);

            const convos = conversationsSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Conversation[];
            setConversations(convos);

            // Select 'Lucidify' chat if exists
            const lucidifyChat = convos.find(convo => convo.title === 'Lucidify');
            if (lucidifyChat) {
                setSelectedChat(lucidifyChat.id);
                fetchMessages(lucidifyChat.id);

                // 🔹 Reset unread messages for this user
                const convoRef = doc(db, "users", userId, "conversations", lucidifyChat.id);
                await updateDoc(convoRef, {
                    [`unreadCounts.${userId}`]: 0,
                });

                // Update local state immediately
                setConversations(prevConvos =>
                    prevConvos.map(convo =>
                        convo.id === lucidifyChat.id
                            ? {
                                ...convo,
                                unreadCounts: {
                                    ...convo.unreadCounts,
                                    [userId]: 0,
                                },
                            }
                            : convo
                    )
                );
            }
        };

        fetchConversations();
    }, []);


    // Fetch messages for the selected conversation
    const fetchMessages = async (conversationName: string) => {
        const userId = auth.currentUser?.uid;
        if (!userId) return; // Return early if no user is logged in
        const messagesRef = collection(db, 'users', userId, 'conversations', conversationName, "messages");
        const q = query(messagesRef, orderBy("timestamp", "asc"));
        const messagesSnapshot = await getDocs(q);

        const fetchedMessages = messagesSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        })) as Message[];
        setMessages(fetchedMessages);
    };

    // Fetch messages for the selected conversation
    useEffect(() => {
        if (selectedChat) {
            const fetchMessages = async (conversationName: string) => {
                const userId = authInstance.currentUser?.uid;
                if (!userId) return; // Return early if no user is logged in
                const messagesRef = collection(db, 'users', userId, 'conversations', selectedChat, 'messages');
                const q = query(messagesRef, orderBy("timestamp", "asc"));

                const unsubscribe = onSnapshot(q, (snapshot) => {
                    const messagesList = snapshot.docs.map(doc => ({
                        id: doc.id,
                        ...doc.data(),
                    })) as Message[];
                    setMessages(messagesList);
                });

                return () => unsubscribe(); // Clean up listener on unmount
            };

            fetchMessages(selectedChat);
        }
    }, [selectedChat, authInstance]);

    // Update messages when a new chat is selected
    const handleChatSelect = async (conversationId: string) => {
        setSelectedChat(conversationId); // Set the conversation to the selected one
        fetchMessages(conversationId); // Fetch messages for the selected conversation
        setMobileView('chat');

        const user = authInstance.currentUser;
        if (!user) return;

        const convoRef = doc(db, "users", user.uid, "conversations", conversationId);

        // Reset the client's unread count
        await updateDoc(convoRef, {
            [`unreadCounts.${user.uid}`]: 0,
        });

        // Also update local state immediately
        setConversations((prevConvos) =>
            prevConvos.map((convo) =>
                convo.id === conversationId
                    ? {
                        ...convo,
                        unreadCounts: {
                            ...convo.unreadCounts,
                            [user.uid]: 0,
                        },
                    }
                    : convo
            )
        );
    };


    // Send new message
    const sendMessage = async () => {
        if (newMessage.trim() === '') return;

        const user = authInstance.currentUser;
        if (!user || !selectedConversation) return;

        const newTimestamp = Timestamp.fromDate(new Date());

        const messageData = {
            text: newMessage,
            sender: user.uid,
            timestamp: newTimestamp,
            isRead: false
        };

        // 1. Add message
        await addDoc(
            collection(db, "users", user.uid, "conversations", selectedChat, "messages"),
            messageData
        );

        // 2. Update conversation metadata
        const convoRef = doc(db, "users", user.uid, "conversations", selectedChat);

        const updatedUnreadCounts = {
            ...selectedConversation.unreadCounts,
            Lucidify: (selectedConversation.unreadCounts?.Lucidify || 0) + 1 // 🔑 increment admin's count
        };

        await updateDoc(convoRef, {
            lastMessage: newMessage,
            lastMessageSender: user.uid,
            timestamp: newTimestamp,
            unreadCounts: updatedUnreadCounts,
        });

        // 3. Update local state
        setConversations((prevConvos) =>
            prevConvos.map((convo) =>
                convo.id === selectedChat
                    ? {
                        ...convo,
                        lastMessage: newMessage,
                        lastMessageSender: user.uid,
                        timestamp: newTimestamp,
                        unreadCounts: updatedUnreadCounts,
                    }
                    : convo
            )
        );

        setNewMessage('');
    };



    const chunkMessagesBySender = (messages: Message[]) => {
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

    // Helper function to format the Firestore timestamp
    const formatTimestamp = (timestamp: Timestamp) => {
        if (timestamp instanceof Timestamp) {
            const date = timestamp.toDate(); // Converts Firestore Timestamp to JS Date
            return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); // Format the time as HH:MM
        }
        return '1:08'; // Fallback time if there's no valid timestamp
    };

    const selectedConversation = conversations.find(convo => convo.id === selectedChat);

    const filteredConversations = conversations.filter(convo =>
        convo.title?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const messagesEndRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        // Scroll to the bottom whenever groupedMessages change
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollTop = messagesEndRef.current.scrollHeight;
        }
    }, [groupedMessages]);

    return (
        <div className="flex h-screen DashboardBackgroundGradient overflow-hidden">
            {/* Left Sidebar */}
            <DashboardClientSideNav highlight="messages" />

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

                {/* START OF MESSAGES */}
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
                            <div className="flex flex-col gap-[20px] lg:gap-[30px] flex-1 overflow-y-auto min-h-0">
                                {/* Pinned Messages */}
                                <div className="flex flex-col gap-[10px]">
                                    <h3 className="px-[30px] lg:px-[50px] opacity-70 font-light text-[14px]">Pinned</h3>
                                    <div className="flex flex-col">
                                        {filteredConversations.filter(conversation => conversation.isPinned).length > 0 ? (
                                            filteredConversations
                                                .filter(conversation => conversation.isPinned)
                                                .map(conversation => (
                                                    <div
                                                        key={conversation.id}
                                                        className={`px-[30px] lg:px-[50px] py-[18px] lg:py-[22px] border-t-[0.5px] border-solid border-white ${selectedChat === conversation.id ? 'MessagesHighlightGradient border-opacity-50' : 'border-opacity-25'} text-white cursor-pointer flex gap-[15px]`}
                                                        onClick={() => handleChatSelect(conversation.id)}
                                                    >
                                                        <div className="rounded-[5px] BlackGradient ContentCardShadow flex justify-center items-center flex-shrink-0">
                                                            <div className="w-[30px] mx-[8px] my-[8px]">
                                                                <Image src="/Lucidify Umbrella.png" alt="Lucidify Logo" layout="responsive" width={0} height={0} />
                                                            </div>
                                                        </div>
                                                        <div className="flex flex-col h-full flex-grow min-w-0">
                                                            <div className="flex justify-between w-full">
                                                                <h4 className="text-[16px] flex-grow truncate">{conversation.title || 'Untitled Chat'}</h4>
                                                                <h4 className="text-[12px] opacity-60 flex-shrink-0 ml-2">{formatTimestamp(conversation.timestamp)}</h4>
                                                            </div>
                                                            <div className="flex justify-between w-full">
                                                                <p className="text-[14px] opacity-40 truncate flex-grow">{conversation.lastMessage}</p>
                                                                {conversation.unreadCounts?.[auth.currentUser?.uid || ""] > 0 ? (
                                                                    <div className="flex justify-center items-center w-[20px] h-[20px] bg-[#6265F0] rounded-full flex-shrink-0 ml-2">
                                                                        <h4 className="px-[2px] text-[12px]">{conversation.unreadCounts[auth.currentUser?.uid || ""]}</h4>
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

                                {/* All Messages */}
                                <div className="flex flex-col gap-[10px]">
                                    <h3 className="px-[30px] lg:px-[50px] opacity-70 font-light text-[14px]">All Messages</h3>
                                    <div className="flex flex-col">
                                        {filteredConversations.filter(conversation => !conversation.isPinned).length > 0 ? (
                                            filteredConversations
                                                .filter(conversation => !conversation.isPinned)
                                                .map(conversation => (
                                                    <div
                                                        key={conversation.id}
                                                        className={`px-[30px] lg:px-[50px] py-[18px] lg:py-[22px] border-t-[0.5px] border-solid border-white ${selectedChat === conversation.id ? 'MessagesHighlightGradient border-opacity-50' : 'border-opacity-25'} text-white cursor-pointer flex gap-[15px]`}
                                                        onClick={() => handleChatSelect(conversation.id)}
                                                    >
                                                        <div className="rounded-[5px] BlackGradient ContentCardShadow flex justify-center items-center flex-shrink-0">
                                                            <div className="w-[30px] mx-[8px] my-[8px]">
                                                                <Image src="/Lucidify Umbrella.png" alt="Lucidify Logo" layout="responsive" width={0} height={0} />
                                                            </div>
                                                        </div>
                                                        <div className="flex flex-col h-full flex-grow min-w-0">
                                                            <div className="flex justify-between w-full">
                                                                <h4 className="text-[16px] flex-grow truncate">{conversation.title || 'Untitled Chat'}</h4>
                                                                <h4 className="text-[12px] opacity-60 flex-shrink-0 ml-2">{formatTimestamp(conversation.timestamp)}</h4>
                                                            </div>
                                                            <div className="flex justify-between w-full">
                                                                <p className="text-[14px] opacity-40 truncate flex-grow">{conversation.lastMessage}</p>
                                                                {conversation.unreadCounts?.[auth.currentUser?.uid || ""] > 0 ? (
                                                                    <div className="flex justify-center items-center w-[20px] h-[20px] bg-[#6265F0] rounded-full flex-shrink-0 ml-2">
                                                                        <h4 className="px-[2px] text-[12px]">{conversation.unreadCounts[auth.currentUser?.uid || ""]}</h4>
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
                                {/* Back button - mobile only */}
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
                                        <div className="w-[30px] h-[30px] flex items-center mx-[8px] my-[8px]">
                                            <Image src="/Lucidify Umbrella.png" alt="Lucidify Logo" layout="responsive" width={0} height={0} />
                                        </div>
                                    </div>
                                    <div className="h-full flex flex-col justify-between font-semibold text-[16px] min-w-0">
                                        <h3 className="truncate">{selectedConversation ? selectedConversation.title || 'Untitled Chat' : 'Loading...'}</h3>
                                        <h3 className="opacity-60 text-[14px] font-light truncate">{selectedConversation ? selectedConversation.lastSeen || 'Last seen...' : 'Last seen...'}</h3>
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
                                    <div key={index} className={`flex mx-[20px] sm:mx-[60px] my-[15px] sm:my-[30px] ${group[0].sender === authInstance.currentUser?.uid ? "justify-end" : "justify-start"}`}>
                                        <div className="max-w-[85%] sm:max-w-[80%]">
                                            {group[0].sender === authInstance.currentUser?.uid ? (
                                                <div className="inline-flex gap-[10px] sm:gap-[15px]">
                                                    <div className="flex flex-col gap-[10px] items-end">
                                                        <div className="flex items-center gap-[10px]">
                                                            <h3 className="opacity-80 font-light text-[14px]">You</h3>
                                                            <h3 className="font-semibold text-[16px]">You</h3>
                                                        </div>
                                                        <div className="flex flex-col gap-[10px] items-end">
                                                            {group.map(message => (
                                                                <div key={message.id} className="inline flex-col gap-[50px]">
                                                                    <div className={`inline-flex text-[14px] font-light rounded-b-[15px] rounded-tl-[15px] px-[15px] py-[10px] ${group[0].sender === authInstance.currentUser?.uid ? 'PopupAttentionGradient PopupAttentionShadow' : 'MessagesHighlightGradient ContentCardShadow'}`}>
                                                                        {message.text}
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                    <div className="rounded-[5px] BlackGradient ContentCardShadow inline-flex justify-center items-center self-start flex-shrink-0">
                                                        <div className="w-[35px] h-[35px] mx-[8px] my-[8px] flex items-center rounded-full overflow-clip">
                                                            <Image src={"/" + selectedAvatar || "/Lucidify Umbrella.png"} alt="Your PFP" layout="responsive" width={0} height={0} />
                                                        </div>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="inline-flex gap-[10px] sm:gap-[15px]">
                                                    <div className="rounded-[5px] BlackGradient ContentCardShadow inline-flex justify-center items-center self-start flex-shrink-0">
                                                        <div className="w-[30px] h-[30px] mx-[8px] my-[8px] flex items-center">
                                                            <Image src="/Lucidify Umbrella.png" alt="Lucidify Logo" layout="responsive" width={0} height={0} />
                                                        </div>
                                                    </div>
                                                    <div className="flex flex-col gap-[10px]">
                                                        <div className="flex items-center gap-[10px]">
                                                            <h3 className="font-semibold text-[16px]">{selectedConversation ? selectedConversation.title || 'Untitled Chat' : 'Loading...'}</h3>
                                                            <h3 className="opacity-80 font-light text-[14px]">{selectedConversation ? selectedConversation.title || 'Untitled Chat' : 'Loading...'}</h3>
                                                        </div>
                                                        <div className="flex flex-col gap-[10px]">
                                                            {group.map(message => (
                                                                <div key={message.id} className="inline flex-col gap-[50px]">
                                                                    <div className={`inline-flex text-[14px] font-light rounded-b-[15px] rounded-tr-[15px] px-[15px] py-[10px] ${group[0].sender === authInstance.currentUser?.uid ? 'PopupAttentionGradient PopupAttentionShadow' : 'MessagesHighlightGradient ContentCardShadow'}`}>
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

export default DASHBOARDClientMessages;
