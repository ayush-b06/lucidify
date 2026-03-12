"use client";

import { useEffect, useRef, useState } from 'react';
import { collection, doc, onSnapshot, orderBy, query, updateDoc, writeBatch } from 'firebase/firestore';
import { auth, db } from '../firebaseConfig';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

interface Notification {
    id: string;
    title: string;
    message: string;
    type: string;
    read: boolean;
    createdAt: any;
    projectId?: string;
    link?: string;
}

const TYPE_ICON: Record<string, string> = {
    project_update: '📋',
    upload: '🖼️',
    payment: '💳',
    new_project: '🚀',
    message: '💬',
};

const NotificationBell = () => {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const popupRef = useRef<HTMLDivElement>(null);
    const router = useRouter();

    useEffect(() => {
        const user = auth.currentUser;
        if (!user) return;
        const q = query(
            collection(db, 'users', user.uid, 'notifications'),
            orderBy('createdAt', 'desc'),
        );
        const unsub = onSnapshot(q, (snap) => {
            setNotifications(snap.docs.map(d => ({ id: d.id, ...d.data() } as Notification)));
        });
        return () => unsub();
    }, []);

    // Close on outside click
    useEffect(() => {
        if (!isOpen) return;
        const handleClick = (e: MouseEvent) => {
            if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, [isOpen]);

    const unreadCount = notifications.filter(n => !n.read).length;

    const markReadAndNavigate = async (notif: Notification) => {
        const user = auth.currentUser;
        if (!user) return;
        if (!notif.read) {
            await updateDoc(doc(db, 'users', user.uid, 'notifications', notif.id), { read: true });
        }
        if (notif.link) {
            setIsOpen(false);
            router.push(notif.link);
        }
    };

    const markAllRead = async () => {
        const user = auth.currentUser;
        if (!user) return;
        const unread = notifications.filter(n => !n.read);
        if (unread.length === 0) return;
        const batch = writeBatch(db);
        unread.forEach(n => {
            batch.update(doc(db, 'users', user.uid, 'notifications', n.id), { read: true });
        });
        await batch.commit();
    };

    const timeAgo = (ts: any): string => {
        if (!ts) return '';
        const date = ts.toDate ? ts.toDate() : new Date(ts);
        const diff = Math.floor((Date.now() - date.getTime()) / 1000);
        if (diff < 60) return 'just now';
        if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
        if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
        return `${Math.floor(diff / 86400)}d ago`;
    };

    return (
        <div ref={popupRef} className="relative">
            <button
                onClick={() => setIsOpen(prev => !prev)}
                className="flex w-[45px] h-[45px] sm:w-[55px] sm:h-[55px] items-center justify-center relative rounded-[100px] BlackGradient ContentCardShadow cursor-pointer"
            >
                {unreadCount > 0 && (
                    <div className="flex w-5 h-5 items-center justify-center absolute -top-[5px] -left-[4px] bg-[#6265f0] rounded-md">
                        <div className="font-normal text-xs">{unreadCount > 9 ? '9+' : unreadCount}</div>
                    </div>
                )}
                <div className="w-[22px] sm:w-[25px]">
                    <Image src="/Notification Bell Icon.png" alt="Notifications" layout="responsive" width={0} height={0} />
                </div>
            </button>

            {/* Popup */}
            {isOpen && (
                <div className="absolute right-0 top-[calc(100%+10px)] w-[300px] sm:w-[350px] BlackGradient ContentCardShadow rounded-[20px] z-50 overflow-hidden">
                    {/* Header */}
                    <div className="flex items-center justify-between px-[20px] py-[16px] border-b border-white/5">
                        <div>
                            <h3 className="text-[15px] font-semibold">Notifications</h3>
                            {unreadCount > 0 && (
                                <p className="text-[11px] opacity-40 mt-[1px]">{unreadCount} unread</p>
                            )}
                        </div>
                        {unreadCount > 0 && (
                            <button
                                onClick={markAllRead}
                                className="text-[11px] opacity-50 hover:opacity-100 font-light transition-opacity"
                            >
                                Mark all read
                            </button>
                        )}
                    </div>

                    {/* List */}
                    <div className="max-h-[360px] overflow-y-auto">
                        {notifications.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-[40px] gap-[8px]">
                                <div className="text-[28px] opacity-20">🔔</div>
                                <p className="text-[13px] opacity-35 font-light">No notifications yet</p>
                            </div>
                        ) : (
                            notifications.map(n => (
                                <div
                                    key={n.id}
                                    onClick={() => markReadAndNavigate(n)}
                                    className={`flex items-start gap-[12px] px-[20px] py-[14px] border-b border-white/5 last:border-0 transition-colors ${n.link ? 'cursor-pointer hover:bg-white/[0.04]' : 'cursor-default'} ${!n.read ? 'bg-white/[0.03]' : ''}`}
                                >
                                    {/* Unread dot */}
                                    <div
                                        className="flex-shrink-0 w-[8px] h-[8px] rounded-full mt-[5px]"
                                        style={{
                                            background: n.read ? 'transparent' : '#725CF7',
                                            border: n.read ? '1.5px solid rgba(255,255,255,0.1)' : 'none',
                                        }}
                                    />
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-[6px] mb-[2px]">
                                            <span className="text-[12px]">{TYPE_ICON[n.type] || '🔔'}</span>
                                            <p className={`text-[13px] leading-snug ${n.read ? 'opacity-50 font-light' : 'font-medium'}`}>
                                                {n.title}
                                            </p>
                                        </div>
                                        <p className="text-[11px] opacity-35 font-light leading-snug">{n.message}</p>
                                        <p className="text-[10px] opacity-25 mt-[4px]">{timeAgo(n.createdAt)}</p>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default NotificationBell;
