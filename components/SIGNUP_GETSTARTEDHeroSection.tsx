"use client";

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, serverTimestamp, writeBatch } from 'firebase/firestore';
import { auth, db } from '../firebaseConfig';
import styles from './Onboarding.module.css';
import { queueDirectoryProfile } from '@/utils/memberDirectory';
import { ADMIN_EMAIL } from '@/utils/notifications';

const avatars = Array.from({ length: 24 }, (_, index) => `Avatar ${index + 1}.png`);

export default function AccountSetup() {
    const router = useRouter();
    const [name, setName] = useState('');
    const [selectedAvatar, setSelectedAvatar] = useState('');
    const [ready, setReady] = useState(false);
    const [checking, setChecking] = useState(true);
    const [attempt, setAttempt] = useState(0);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const inFlight = useRef(false);

    useEffect(() => {
        let generation = 0;
        const unsubscribe = onAuthStateChanged(auth, async user => {
            const request = ++generation;
            setReady(false); setChecking(true); setError('');
            if (!user) { router.replace('/signup'); return; }
            try {
                const snapshot = await getDoc(doc(db, 'users', user.uid));
                if (request !== generation) return;
                const profile = snapshot.data();
                if (profile?.setUp === true) { router.replace('/dashboard'); return; }
                setName(profile?.firstName || user.displayName?.split(' ')[0] || '');
                setSelectedAvatar(avatars.includes(profile?.selectedAvatar) ? profile!.selectedAvatar : '');
                setReady(true);
            } catch {
                if (request === generation) setError('We couldn’t load your profile. Please try again.');
            } finally {
                if (request === generation) setChecking(false);
            }
        });
        return () => { generation++; unsubscribe(); };
    }, [router, attempt]);

    const finish = async (event: React.FormEvent) => {
        event.preventDefault();
        if (inFlight.current || !ready) return;
        if (!name.trim() || !selectedAvatar) { setError('Add your name and choose an avatar to continue.'); return; }
        const user = auth.currentUser;
        if (!user) { router.replace('/login'); return; }
        inFlight.current = true; setSaving(true); setError('');
        try {
            const userRef = doc(db, 'users', user.uid);
            const snapshot = await getDoc(userRef);
            if (snapshot.data()?.setUp === true) { router.replace('/dashboard'); return; }
            const timestamp = serverTimestamp();
            const welcome = "Welcome to Lucidify! We're excited to help you get started with your project.";
            const batch = writeBatch(db);
            const profileUpdates = {
                email: user.email || '', firstName: name.trim(), selectedAvatar, setUp: true,
                createdAt: snapshot.data()?.createdAt ?? timestamp,
            };
            batch.set(userRef, profileUpdates, { merge: true });
            batch.set(doc(userRef, 'conversations', 'lucidify'), {
                title: 'Lucidify', isPinned: true, lastMessage: welcome,
                lastMessageSender: 'Lucidify', timestamp, unreadCounts: { [user.uid]: 1, Lucidify: 0 },
            });
            batch.set(doc(userRef, 'conversations', 'lucidify', 'messages', 'welcome'), {
                text: welcome, sender: 'Lucidify', timestamp, isRead: false,
            });
            if (user.email !== ADMIN_EMAIL) queueDirectoryProfile(batch, user.uid, { ...snapshot.data(), ...profileUpdates });
            await batch.commit();
            router.replace('/dashboard');
        } catch {
            setError('We couldn’t save your setup. Your answers are still here — please try again.');
        } finally { inFlight.current = false; setSaving(false); }
    };

    return <div className={`${styles.shell} ${styles.account}`}>
        <section className={styles.card} aria-labelledby="account-title">
            <div className={styles.brand}>lucidify</div>
            <h1 id="account-title" className={styles.title}>Make yourself at home.</h1>
            <p className={styles.intro}>Just a name and a face to get started. We’ll talk about your website when you create a project.</p>
            {checking && <p role="status">Getting things ready…</p>}
            {error && <p className={styles.error} role="alert">{error}</p>}
            {!checking && !ready && <button className={styles.secondary} onClick={() => setAttempt(value => value + 1)}>Try again</button>}
            {ready && <form onSubmit={finish} aria-busy={saving}>
                <fieldset disabled={saving}>
                    <label className={styles.field} htmlFor="account-name">
                        <span className={styles.label}>What should we call you?</span>
                        <input id="account-name" className={styles.input} autoComplete="given-name" placeholder="Your name" required maxLength={80} value={name} onChange={event => setName(event.target.value)} />
                    </label>
                    <fieldset>
                        <legend className={styles.legend}>Choose your avatar</legend>
                        <p className={styles.hint}>Pick one that feels like you. You can change it later.</p>
                        <div className={styles.avatars}>{avatars.map((avatar, index) => <label className={styles.avatar} key={avatar}>
                            <input className={styles.radio} type="radio" name="avatar" value={avatar} checked={selectedAvatar === avatar} onChange={() => setSelectedAvatar(avatar)} required aria-label={`Avatar ${index + 1}`} />
                            <Image src={`/${avatar}`} alt={`Avatar ${index + 1}`} width={64} height={64} />
                        </label>)}</div>
                    </fieldset>
                    <div className={styles.actions}><span className={styles.hint}>That’s all for your account.</span><button className={styles.primary} type="submit">{saving ? 'Saving…' : 'Finish setup'}</button></div>
                </fieldset>
            </form>}
        </section>
    </div>;
}
