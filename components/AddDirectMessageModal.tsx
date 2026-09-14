"use client";
import { useEffect, useRef, useState } from 'react';
import { collection, doc, getDoc, limit, onSnapshot, query, runTransaction, serverTimestamp, where } from 'firebase/firestore';
import { useDialog } from '@/hooks/useDialog';
import { auth, db } from '@/firebaseConfig';
import { ensureDirectoryProfile } from '@/utils/memberDirectory';
import { normalizeName, MemberName } from '@/utils/memberNames';
import styles from './Messaging.module.css';

interface Member extends MemberName { uid: string; }
interface Props { onClose: () => void; onConversationCreated: (id: string) => void; }
export default function AddDirectMessageModal({ onClose, onConversationCreated }: Props) {
    const [search, setSearch] = useState('');
    const [results, setResults] = useState<Member[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [creating, setCreating] = useState('');
    const [attempt, setAttempt] = useState(0);
    const inFlight = useRef(false);
    const version = useRef(0);
    const dialog = useDialog<HTMLDivElement>(true, onClose, !!creating);

    useEffect(() => {
        const current = ++version.current;
        const term = normalizeName(search);
        setResults([]); setError(''); setLoading(!!term);
        if (!term) return;
        let stop: (() => void) | undefined;
        const timer = setTimeout(() => {
            stop = onSnapshot(query(collection(db, 'userDirectory'), where('searchPrefixes', 'array-contains', term), limit(20)), snapshot => {
                if (version.current !== current) return;
                setResults(snapshot.docs.filter(member => member.id !== auth.currentUser?.uid).map(member => ({ ...member.data(), uid: member.id }))
                    .sort((a, b) => `${(a as Member).firstName} ${(a as Member).lastName}`.localeCompare(`${(b as Member).firstName} ${(b as Member).lastName}`)));
                setLoading(false);
            }, () => { if (version.current === current) { setLoading(false); setError('Could not search names. Please try again.'); } });
        }, 180);
        return () => { clearTimeout(timer); stop?.(); version.current++; };
    }, [search, attempt]);

    const startChat = async (member: Member) => {
        const me = auth.currentUser;
        if (!me || inFlight.current) return;
        inFlight.current = true; setCreating(member.uid); setError('');
        try {
            const myData = (await getDoc(doc(db, 'users', me.uid))).data() || {};
            await ensureDirectoryProfile(me.uid, myData);
            const id = [me.uid, member.uid].sort().join('_');
            await runTransaction(db, async transaction => {
                const ref = doc(db, 'directMessages', id);
                const existing = await transaction.get(ref);
                if (existing.exists()) {
                    transaction.set(doc(db, 'users', me.uid, 'dmConversations', id), { otherUserId: member.uid }, { merge: true });
                    transaction.set(doc(db, 'users', member.uid, 'dmConversations', id), { otherUserId: me.uid }, { merge: true });
                    return;
                }
                const currentMember = (await transaction.get(doc(db, 'userDirectory', member.uid))).data();
                const currentMe = (await transaction.get(doc(db, 'userDirectory', me.uid))).data();
                if (!currentMember || !currentMe) throw new Error('This member is unavailable.');
                const profile = (data: MemberName) => ({ firstName: data.firstName || '', lastName: data.lastName || '', selectedAvatar: data.selectedAvatar || null });
                const timestamp = serverTimestamp();
                transaction.set(ref, {
                    participants: [me.uid, member.uid], participantProfiles: { [me.uid]: profile(currentMe), [member.uid]: profile(currentMember) },
                    lastMessage: '', lastMessageSender: '', timestamp, unreadCounts: { [me.uid]: 0, [member.uid]: 0 },
                });
                transaction.set(doc(db, 'users', me.uid, 'dmConversations', id), { otherUserId: member.uid, createdAt: timestamp });
                transaction.set(doc(db, 'users', member.uid, 'dmConversations', id), { otherUserId: me.uid, createdAt: timestamp });
            });
            onConversationCreated(id); onClose();
        } catch { setError('Could not open this conversation. Please try again.'); }
        finally { inFlight.current = false; setCreating(''); }
    };

    return <div className={styles.overlay} onClick={event => { if (!creating && event.target === event.currentTarget) onClose(); }}>
        <div ref={dialog} className={`DashboardDialog ${styles.directory}`} tabIndex={-1} role="dialog" aria-modal="true" aria-label="New message">
            <div className={styles.heading}><div><h2>New message</h2><p>Find someone by their name.</p></div><button aria-label="Close new message" disabled={!!creating} onClick={onClose}>×</button></div>
            <label className={styles.searchLabel} htmlFor="recipient-name">Name</label>
            <input id="recipient-name" autoFocus autoComplete="off" placeholder="Start typing a name…" maxLength={80} value={search} disabled={!!creating} onChange={event => { version.current++; setResults([]); setSearch(event.target.value); }} className={styles.search} />
            {error && <p role="alert" className={styles.error}>{error} <button onClick={() => setAttempt(value => value + 1)}>Retry</button></p>}
            <div role="status" className={styles.hint}>{loading ? 'Searching…' : !search.trim() ? 'Results update as you type.' : !error && !results.length ? 'No matching names. Try a different spelling.' : `${results.length} ${results.length === 1 ? 'person' : 'people'} found`}</div>
            <ul className={styles.results} aria-label="Matching people">{results.map(member => {
                const name = `${member.firstName || ''} ${member.lastName || ''}`.trim() || 'Lucidify member';
                return <li key={member.uid}><button disabled={!!creating} onClick={() => startChat(member)} aria-label={`Message ${name}`}>
                    {member.selectedAvatar && /^Avatar (?:[1-9]|1\d|2[0-4])\.png$/.test(member.selectedAvatar) ? <img src={`/${member.selectedAvatar}`} alt="" width={42} height={42} /> : <span className={styles.initial}>{name.charAt(0)}</span>}
                    <span className={styles.person}><strong>{name}</strong><small>{creating === member.uid ? 'Opening…' : 'Start or open a conversation'}</small></span><span aria-hidden="true">→</span>
                </button></li>;
            })}</ul>
            {results.length >= 19 && <p className={styles.hint}>Keep typing to narrow the results.</p>}
            <p className={styles.hint}>To contact the Lucidify team, use your pinned Lucidify chat.</p>
        </div>
    </div>;
}
