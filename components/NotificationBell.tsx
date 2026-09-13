"use client";
import { useEffect, useId, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useNotifications, DashboardNotification } from '@/context/notificationContext';
import { dashboardLink } from '@/utils/notifications';
const icons: Record<string,string> = { project_update: '📋', upload: '🖼️', payment: '💳', new_project: '🚀', message: '💬', account: '👤' };
export default function NotificationBell() {
  const { items, loading, error, retry, markRead } = useNotifications();
  const [open, setOpen] = useState(false);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [actionError, setActionError] = useState('');
  const [busy, setBusy] = useState(false);
  const [, tick] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const id = useId();
  const router = useRouter();
  const unread = items.filter(n => !n.read);
  useEffect(() => {
    if (!open) return;
    const click = (event: MouseEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    const key = (event: KeyboardEvent) => { if (event.key === 'Escape') { setOpen(false); trigger.current?.focus(); } };
    document.addEventListener('mousedown', click); document.addEventListener('keydown', key);
    const timer = setInterval(() => tick(n => n + 1), 60000);
    return () => { document.removeEventListener('mousedown', click); document.removeEventListener('keydown', key); clearInterval(timer); };
  }, [open]);
  const mark = async (selected: DashboardNotification[]) => {
    if (busy) return false;
    setBusy(true); setActionError('');
    try { await markRead(selected); return true; } catch { setActionError('Couldn’t mark notifications as read. Please try again.'); return false; }
    finally { setBusy(false); }
  };
  const visit = async (item: DashboardNotification) => {
    if (!await mark([item])) return;
    const link = dashboardLink(item.link);
    if (link) { setOpen(false); router.push(link); }
  };
  const age = (n: DashboardNotification) => {
    const time = n.createdAt?.toMillis?.();
    if (!time) return 'Just now';
    const minutes = Math.max(0, Math.floor((Date.now() - time) / 60000));
    return minutes < 1 ? 'Just now' : minutes < 60 ? `${minutes}m ago` : minutes < 1440 ? `${Math.floor(minutes/60)}h ago` : `${Math.floor(minutes/1440)}d ago`;
  };
  return <div className="NotificationRoot" ref={root}>
    <button ref={trigger} aria-label={`Notifications${unread.length ? ` (${unread.length} unread)` : ''}`} aria-expanded={open} aria-controls={id} onClick={() => setOpen(v => !v)} className="DashboardIconButton">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M18 8a6 6 0 00-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
      {unread.length > 0 && <span className="NotificationBadge">{unread.length > 99 ? '99+' : unread.length}</span>}
    </button>
    {open && <section id={id} aria-label="Notification inbox" className="NotificationPanel">
      <div className="NotificationHeader"><div><h2>Notifications</h2><p>{unread.length ? `${unread.length} unread` : 'You’re all caught up'}</p></div><button aria-label="Close notifications" onClick={() => { setOpen(false); trigger.current?.focus(); }}>✕</button></div>
      <div className="NotificationFilters"><div><button aria-pressed={!unreadOnly} onClick={() => setUnreadOnly(false)}>All</button><button aria-pressed={unreadOnly} onClick={() => setUnreadOnly(true)}>Unread</button></div><button disabled={busy || !unread.length} onClick={() => mark(unread)}>{busy ? 'Saving…' : 'Mark all read'}</button></div>
      {(error || actionError) && <div className="DashboardNotice" role="alert">{error || actionError} {error && <button onClick={retry}>Retry</button>}</div>}
      <div className="NotificationList">
        {loading ? <p className="NotificationEmpty" role="status">Loading notifications…</p> : (unreadOnly ? unread : items).length === 0 ? <div className="NotificationEmpty"><span>🔔</span><p>{unreadOnly ? 'No unread notifications' : 'No notifications yet'}</p><small>Project updates and messages will appear here.</small></div> : (unreadOnly ? unread : items).map(item => <button key={item.id} disabled={busy} onClick={() => visit(item)} className={`NotificationItem ${item.read ? '' : 'isUnread'}`}>
          <span className="NotificationType" aria-hidden="true">{icons[item.type] || '🔔'}</span><span><strong>{item.title || 'Update'}</strong><span className="NotificationMessage">{item.message}</span><small>{age(item)}{!item.read && ' · Unread'}</small></span>
        </button>)}
      </div>
    </section>}
  </div>;
}
