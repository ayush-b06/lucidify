"use client";

import { useEffect, useRef, useState } from 'react';
import { doc, getDoc, runTransaction, updateDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { queueAdminNotification } from '@/utils/notifications';
import { db } from '../firebaseConfig';
import styles from './Onboarding.module.css';

interface Props { userId: string; projectId: string; }
const STEPS = ['Your idea', 'Look & feel', 'Content', 'Any details', 'Review'];
const TITLES = ['Tell us a little about your idea.', 'What feels like you?', 'What do you have so far?', 'Anything else we should know?', 'Here’s what we’ll start with.'];
const INTROS = [
    'A few sentences are plenty. You don’t need a finished plan or any technical knowledge.',
    'Go with your first impression. These are starting points, and we can figure out the rest together.',
    'You can share links to photos, writing, a résumé, social profiles, or an existing website. It’s also fine to start from scratch.',
    'These details are optional. If we’ve already talked about them, there’s no need to repeat everything.',
    'Check that this sounds like you. Sending your brief starts the conversation; you don’t need every detail settled.',
];
const LOOKS = ['Clean & simple', 'Warm & personal', 'Bold & expressive', 'Polished & professional', 'Playful & creative', 'Help me decide'];
const CONTENT = ['I have content ready', 'I have a few things', 'Starting from scratch', 'Help me decide'];
const PRACTICAL = ['Help me decide', 'We’ve already discussed this'];
const EMPTY = { projectDescription: '', audience: '', visitorGoal: '', visualDirection: '', inspiration: '', contentReadiness: '', contentLinks: '', mustHaves: '', timelinePreference: '', estimatedBudget: '', additionalNotes: '' };
type Brief = typeof EMPTY;

export default function ProjectSetup({ userId, projectId }: Props) {
    const router = useRouter();
    const [brief, setBrief] = useState<Brief>(EMPTY);
    const [projectName, setProjectName] = useState('');
    const [step, setStep] = useState(0);
    const [loading, setLoading] = useState(true);
    const [loadFailed, setLoadFailed] = useState(false);
    const [attempt, setAttempt] = useState(0);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [logoUrl, setLogoUrl] = useState('');
    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [preview, setPreview] = useState('');
    const inFlight = useRef(false);
    const heading = useRef<HTMLHeadingElement>(null);
    const description = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        let active = true;
        setLoading(true); setLoadFailed(false); setError('');
        getDoc(doc(db, 'users', userId, 'projects', projectId)).then(snapshot => {
            if (!active) return;
            if (!snapshot.exists()) throw new Error('Project not found');
            const data = snapshot.data();
            if (data.setupComplete === true) { router.replace(`/dashboard/projects/${projectId}?userId=${userId}`); return; }
            setProjectName(data.projectName || 'Your website');
            const loaded = { ...EMPTY };
            for (const key of Object.keys(loaded) as (keyof Brief)[]) loaded[key] = typeof data[key] === 'string' ? data[key] : '';
            setBrief(loaded);
            setLogoUrl(typeof data.logoUrl === 'string' ? data.logoUrl : '');
            setStep(data.briefVersion === 2 && Number.isInteger(data.setupStep) ? Math.min(4, Math.max(0, data.setupStep)) : 0);
        }).catch(() => { if (active) { setLoadFailed(true); setError('Could not load this project. Please retry.'); } })
            .finally(() => { if (active) setLoading(false); });
        return () => { active = false; };
    }, [userId, projectId, router, attempt]);

    useEffect(() => {
        if (!logoFile) { setPreview(''); return; }
        const url = URL.createObjectURL(logoFile); setPreview(url);
        return () => URL.revokeObjectURL(url);
    }, [logoFile]);

    const change = (key: keyof Brief, value: string) => setBrief(current => ({ ...current, [key]: value }));
    const go = (next: number) => { setStep(next); requestAnimationFrame(() => heading.current?.focus()); };
    const save = async (action: 'next' | 'exit' | 'submit') => {
        if (inFlight.current || loading || loadFailed) return;
        if (action !== 'exit' && !brief.projectDescription.trim()) {
            setError('Tell us your rough idea first. Even one sentence is enough.');
            setStep(0); requestAnimationFrame(() => description.current?.focus()); return;
        }
        inFlight.current = true; setBusy(true); setError('');
        try {
            let savedLogo = logoUrl;
            if (logoFile) {
                const form = new FormData(); form.append('file', logoFile); form.append('upload_preset', 'Unsigned Presets');
                const response = await fetch('https://api.cloudinary.com/v1_1/dldxkfbz4/image/upload', { method: 'POST', body: form });
                const data = await response.json();
                if (!response.ok || typeof data.secure_url !== 'string' || !data.secure_url.startsWith('https://')) throw new Error('Upload failed');
                savedLogo = data.secure_url; setLogoUrl(savedLogo); setLogoFile(null);
            }
            const nextStep = action === 'next' ? Math.min(step + 1, 4) : step;
            const fields = Object.fromEntries(Object.entries(brief).map(([key, value]) => [key, value.trim()]));
            const updates = { ...fields, logoUrl: savedLogo, briefVersion: 2, setupStep: nextStep };
            const ref = doc(db, 'users', userId, 'projects', projectId);
            if (action === 'submit') {
                await runTransaction(db, async transaction => {
                    const snapshot = await transaction.get(ref);
                    if (!snapshot.exists()) throw new Error('Project not found');
                    if (snapshot.data().setupComplete === true) return;
                    transaction.update(ref, { ...updates, setupComplete: true, approval: 'Pending' });
                    queueAdminNotification(transaction, 'New project request', `${projectName} is ready for review.`, `/dashboard/projects/${projectId}?userId=${userId}`, 'new_project', `project-${projectId}`);
                });
                router.push(`/dashboard/projects/${projectId}?userId=${userId}`);
            } else {
                await updateDoc(ref, updates);
                if (action === 'exit') router.push('/dashboard/projects');
                else go(nextStep);
            }
        } catch {
            setError(action === 'submit' ? 'We could not submit your project. Your answers are still here — please try again.' : 'Your changes could not be saved. Your answers are still here — please try again.');
        } finally { inFlight.current = false; setBusy(false); }
    };

    const field = (key: keyof Brief, label: string, placeholder: string, hint?: string) => <label className={styles.field} htmlFor={`brief-${key}`}>
        <span className={styles.label}>{label}</span>{hint && <span className={styles.hint}>{hint}</span>}
        <textarea id={`brief-${key}`} className={styles.input} value={brief[key]} maxLength={3000} rows={3} placeholder={placeholder} onChange={event => change(key, event.target.value)} />
    </label>;
    const choices = (key: keyof Brief, options: string[], label: string) => <div className={styles.choices} role="group" aria-label={label}>{options.map(value => <button type="button" key={value} className={styles.choice} aria-pressed={brief[key] === value} onClick={() => change(key, brief[key] === value ? '' : value)}>{value}</button>)}</div>;
    const review = (title: string, rows: [string, string][], editStep: number) => <section className={styles.review}>
        <div className={styles.topbar}><h3>{title}</h3><button type="button" className={styles.secondary} onClick={() => go(editStep)} aria-label={`Edit ${title.toLowerCase()}`}>Edit</button></div>
        <dl>{rows.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value || 'We’ll figure this out together.'}</dd></div>)}</dl>
    </section>;

    return <div className={`${styles.shell} ${styles.project}`}>
        <div className={styles.topbar}><div><p className={styles.eyebrow}>Your project brief</p><p className="font-semibold break-words">{projectName}</p></div><button className={styles.secondary} disabled={busy || loading || loadFailed} onClick={() => save('exit')}>Save & exit</button></div>
        {loading ? <p role="status">Opening your project…</p> : loadFailed ? <div><p role="alert" className={styles.error}>{error}</p><button className={styles.secondary} onClick={() => setAttempt(value => value + 1)}>Retry</button></div> : <>
            <ol className={styles.steps} aria-label="Project setup progress">{STEPS.map((label, index) => <li key={label} aria-current={index === step ? 'step' : undefined}>{index + 1}. {label}</li>)}</ol>
            <form className={styles.card} onSubmit={event => { event.preventDefault(); save(step === 4 ? 'submit' : 'next'); }} aria-busy={busy}>
                <p className={styles.eyebrow}>Step {step + 1} of 5{step > 0 && step < 4 ? ' · Optional' : ''}</p>
                <h1 className={styles.title} ref={heading} tabIndex={-1}>{TITLES[step]}</h1>
                <p className={styles.intro}>{INTROS[step]}</p>
                {error && <p role="alert" className={styles.error}>{error}</p>}
                <fieldset disabled={busy}>
                    {step === 0 && <>
                        <label className={styles.field} htmlFor="brief-idea"><span className={styles.label}>What would you like your website to be?</span><textarea ref={description} id="brief-idea" className={styles.input} rows={4} maxLength={3000} value={brief.projectDescription} onChange={event => change('projectDescription', event.target.value)} placeholder="For example: A place to show my photography and let people contact me. I’m not sure what else it needs yet." /></label>
                        {field('audience', 'Who is it for? (optional)', 'Friends, potential clients, employers, a community…')}
                        {field('visitorGoal', 'What would you like people to do? (optional)', 'Explore my work, get in touch, read my writing, book something…')}
                    </>}
                    {step === 1 && <>
                        <p className={styles.label}>Which direction feels closest?</p>{choices('visualDirection', LOOKS, 'Visual direction')}
                        {field('inspiration', 'Anything you like the look of? (optional)', 'A website link, a favorite color, a mood — or something you want to avoid.', 'If you share a link, tell us what you like about it. A sentence is enough.')}
                    </>}
                    {step === 2 && <>
                        <p className={styles.label}>Where are you with content?</p>{choices('contentReadiness', CONTENT, 'Content readiness')}
                        {field('contentLinks', 'Links or notes about your content (optional)', 'My photos are here… I have a résumé… I’d like help writing the text.', 'For shared folders, make sure the team can open the link. You can also share more links in messages later.')}
                        <label className={styles.field} htmlFor="brief-logo"><span className={styles.label}>A logo, if you have one (optional)</span><span className={styles.hint}>No logo needed to get started. Image files up to 10 MB.</span><input className={styles.input} id="brief-logo" type="file" accept="image/*" onChange={event => {
                            const file = event.target.files?.[0]; if (!file) return;
                            if (!file.type.startsWith('image/') || file.size > 10 * 1024 * 1024) { setError('Choose an image smaller than 10 MB.'); event.target.value = ''; return; }
                            setError(''); setLogoFile(file);
                        }} /></label>
                        {(preview || logoUrl) && <div><img className={styles.preview} src={preview || logoUrl} alt="Your logo" /><button className={styles.secondary} type="button" onClick={() => { setLogoFile(null); setLogoUrl(''); const input = document.getElementById('brief-logo') as HTMLInputElement | null; if (input) input.value = ''; }}>Remove logo</button></div>}
                    </>}
                    {step === 3 && <>
                        {field('mustHaves', 'Anything your website needs to include? (optional)', 'A gallery, contact form, booking link, a page about me…', 'Describe it in your own words. You don’t need to choose pages or technology.')}
                        <label className={styles.field} htmlFor="brief-timing"><span className={styles.label}>Any timing in mind? (optional)</span><input id="brief-timing" className={styles.input} maxLength={300} value={brief.timelinePreference} onChange={event => change('timelinePreference', event.target.value)} placeholder="No rush, sometime this summer, before an event…" /></label>{choices('timelinePreference', PRACTICAL, 'Timing preference')}
                        <label className={styles.field} htmlFor="brief-budget"><span className={styles.label}>Anything to share about budget? (optional)</span><span className={styles.hint}>A rough range is fine. This isn’t a quote or a commitment.</span><input id="brief-budget" className={styles.input} maxLength={300} value={brief.estimatedBudget} onChange={event => change('estimatedBudget', event.target.value)} placeholder="A rough range, or leave this for our conversation" /></label>{choices('estimatedBudget', PRACTICAL, 'Budget preference')}
                        {field('additionalNotes', 'Anything else? (optional)', 'Questions, concerns, or a detail we talked about already…')}
                    </>}
                    {step === 4 && <>
                        {review('Your idea', [['The website', brief.projectDescription], ['Who it’s for', brief.audience], ['What visitors should do', brief.visitorGoal]], 0)}
                        {review('Look & feel', [['Direction', brief.visualDirection], ['Inspiration', brief.inspiration]], 1)}
                        {review('Content', [['Starting point', brief.contentReadiness], ['Links & notes', brief.contentLinks], ['Logo', logoUrl ? 'Logo added' : 'No logo added']], 2)}
                        {review('Any details', [['Must-haves', brief.mustHaves], ['Timing', brief.timelinePreference], ['Budget', brief.estimatedBudget], ['Other notes', brief.additionalNotes]], 3)}
                        <p className={styles.hint}>We’ll review your idea and follow up with questions. You can follow progress and keep the conversation going from your project dashboard.</p>
                    </>}
                    <div className={styles.actions}>
                        {step > 0 ? <button type="button" className={styles.secondary} onClick={() => { setError(''); go(step - 1); }}>Back</button> : <span className={styles.hint}>Your idea is enough to start.</span>}
                        <button type="submit" className={styles.primary}>{busy ? 'Saving…' : step === 4 ? 'Send project brief' : step === 3 ? 'Review your brief' : 'Continue'}</button>
                    </div>
                </fieldset>
            </form>
        </>}
    </div>;
}
