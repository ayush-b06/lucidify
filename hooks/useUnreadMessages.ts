"use client";
import { useEffect, useState } from 'react';
import { useAuth } from '@/context/authContext';
import { ADMIN_EMAIL } from '@/utils/notifications';
import { subscribeAdminConversations, subscribeClientConversations } from '@/utils/conversations';
export function useUnreadMessages() {
  const { user } = useAuth();
  const [unread, setUnread] = useState(0);
  useEffect(() => {
    setUnread(0);
    if (!user) return;
    if (user.email === ADMIN_EMAIL) return subscribeAdminConversations(items => setUnread(items.reduce((n,c) => n + (c.unreadCounts?.Lucidify || 0),0)), () => setUnread(0));
    return subscribeClientConversations(user.uid, items => setUnread(items.reduce((n,c) => n + (c.unreadCount || 0),0)), () => setUnread(0));
  }, [user]);
  return unread;
}
