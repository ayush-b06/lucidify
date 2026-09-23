"use client";

import { CSSProperties, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { collection, doc, limit, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '@/firebaseConfig';
import { useDialog } from '@/hooks/useDialog';
import { useTheme } from '@/context/themeContext';
import { MemberName, normalizeName } from '@/utils/memberNames';
import { addProjectMember } from '@/utils/projectMembers';
import styles from './Messaging.module.css';

interface Member extends MemberName { uid: string; }
const fullName = (member: MemberName) => `${member.firstName || ''} ${member.lastName || ''}`.trim() || 'Lucidify member';

function MemberRow({ uid, owner }: { uid: string; owner: boolean }) {
    const [profile, setProfile] = useState<MemberName | null>(null);
    useEffect(() => onSnapshot(doc(db, 'userDirectory', uid), snapshot => setProfile(snapshot.data() || null), () => setProfile(null)), [uid]);
    return <li className="flex items-center justify-between gap-4 py-2">
        <div className="min-w-0"><p className="text-sm font-medium break-words">{profile ? fullName(profile) : owner ? 'Project owner' : 'Lucidify member'}</p>
            {profile?.email && <p className="text-xs opacity-70 break-all">{profile.email}</p>}</div>
        <span className="text-xs opacity-70 shrink-0">{owner ? 'Owner' : 'Client'}</span>
    </li>;
}

function AddClientDialog({ ownerId, projectId, members, onClose }: { ownerId: string; projectId: string; members: string[]; onClose: () => void }) {
    const { theme } = useTheme();
    const [search, setSearch] = useState('');
    const [results, setResults] = useState<Member[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [adding, setAdding] = useState('');
    const [attempt, setAttempt] = useState(0);
    const inFlight = useRef(false);
    const dialog = useDialog<HTMLDivElement>(true, onClose, !!adding);
    useEffect(() => {
        const term = normalizeName(search);
        let active = true, stop: (() => void) | undefined;
        setResults([]); setError(''); setLoading(!!term && !term.includes('@'));
        if (!term || term.includes('@')) return;
        const timer = setTimeout(() => {
            stop = onSnapshot(query(collection(db, 'userDirectory'), where('searchPrefixes', 'array-contains', term), limit(20)), snapshot => {
                if (!active) return;
                setResults(snapshot.docs.map(d => ({ ...d.data(), uid: d.id } as Member)).sort((a, b) => fullName(a).localeCompare(fullName(b))));
                setLoading(false);
            }, () => { if (active) { setLoading(false); setError('Could not search members. Please retry.'); } });
        }, 180);
        return () => { active = false; clearTimeout(timer); stop?.(); };
    }, [search, attempt]);

    const add = async (member: Member) => {
        if (inFlight.current) return;
        inFlight.current = true; setAdding(member.uid); setError('');
        try { await addProjectMember(ownerId, projectId, member.uid); onClose(); }
        catch { setError('Could not add this client. Please try again.'); }
        finally { inFlight.current = false; setAdding(''); }
    };
    return createPortal(<div className={styles.overlay} onClick={event => { if (!adding && event.target === event.currentTarget) onClose(); }}>
        <div ref={dialog} tabIndex={-1} role="dialog" aria-modal="true" aria-label="Add client" className={`DashboardDialog ${styles.directory}`} style={{ '--dashboard-hover': theme === 'dark' ? '#302a3c' : '#e9e2f2' } as CSSProperties}>
            <div className={styles.heading}><div><h2>Add client</h2><p>Give a Lucidify member access to this project.</p></div><button aria-label="Close add client" disabled={!!adding} onClick={onClose}>×</button></div>
            <label className={styles.searchLabel} htmlFor="project-member-name">Search by name</label>
            <input id="project-member-name" autoFocus autoComplete="off" placeholder="Start typing a name…" maxLength={80} value={search} disabled={!!adding} onChange={event => { setResults([]); setSearch(event.target.value); }} className={styles.search} />
            <p className={styles.hint}>Clients can edit the project, share files, and add other clients.</p>
            {error && <p role="alert" className={styles.error}>{error} <button onClick={() => setAttempt(value => value + 1)}>Retry</button></p>}
            <p role="status" className={styles.hint}>{loading ? 'Searching…' : search.includes('@') ? 'Search by their name, not their email.' : !search.trim() ? 'Enter a first or last name.' : !error && !results.length ? 'No matching names.' : `${results.length} people found`}</p>
            <ul className={styles.results} aria-label="Matching clients">{results.map(member => {
                const included = member.uid === ownerId || members.includes(member.uid);
                return <li key={member.uid}><button disabled={!!adding || included} onClick={() => add(member)} aria-label={`${included ? 'Already added' : 'Add'} ${fullName(member)}`}>
                    <span className={styles.initial}>{fullName(member).charAt(0)}</span>
                    <span className={styles.person}><strong>{fullName(member)}</strong><small className="break-all">{member.email || 'Email unavailable'}</small><small>{included ? 'Already on this project' : adding === member.uid ? 'Adding…' : 'Add to project'}</small></span>
                </button></li>;
            })}</ul>
            {results.length === 20 && <p className={styles.hint}>Keep typing to narrow the results.</p>}
        </div>
    </div>, document.body);
}

export default function ProjectMembers({ userId, projectId }: { userId: string; projectId: string }) {
    const [members, setMembers] = useState<string[]>([]);
    const [open, setOpen] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(true);
    const [attempt, setAttempt] = useState(0);
    useEffect(() => {
        setError(''); setLoading(true); setMembers([]);
        return onSnapshot(collection(db, 'users', userId, 'projects', projectId, 'members'), snapshot => {
            setMembers(snapshot.docs.map(d => d.id).filter(uid => uid !== userId)); setLoading(false);
        }, () => { setError('Could not load project clients.'); setLoading(false); });
    }, [userId, projectId, attempt]);
    return <section aria-label="Project clients" className="BlackGradient ContentCardShadow rounded-[20px] p-6 mb-5">
        <div className="flex items-center justify-between gap-3"><h2 className="font-semibold">Project clients{!loading && !error ? ` (${members.length + 1})` : ''}</h2>
            <button onClick={() => setOpen(true)} disabled={loading || !!error} className="rounded-xl bg-[#725CF7] px-4 py-2 text-sm text-white disabled:opacity-50">Add client</button></div>
        <p className="text-sm opacity-70 mt-2 mb-3">Everyone here shares this project and its files.</p>
        {error ? <p role="alert">{error} <button className="underline" onClick={() => setAttempt(value => value + 1)}>Retry</button></p> : loading ? <p role="status">Loading clients…</p> :
            <ul aria-label="Current clients" className="max-h-64 overflow-y-auto"><MemberRow uid={userId} owner />{members.map(uid => <MemberRow key={uid} uid={uid} owner={false} />)}</ul>}
        {open && <AddClientDialog ownerId={userId} projectId={projectId} members={members} onClose={() => setOpen(false)} />}
    </section>;
}
