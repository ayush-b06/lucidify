"use client";

import { useEffect, useRef, useState } from 'react';
import { doc, getDoc, runTransaction, updateDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { queueAdminNotification } from '@/utils/notifications';
import { db } from '../firebaseConfig';
import styles from './Onboarding.module.css';
import StylePreview from './StylePreview';
import {
    PROJECT_CATEGORIES, OTHER_CATEGORY_ID, MAX_STYLE_PICKS,
    findCategory, stylesForCategory, assetLabel, STYLE_DIRECTIONS,
} from '@/utils/projectCategories';

interface Props { userId: string; projectId: string; }

const STEPS = ['Type', 'Look', 'Your files', 'Pages', 'Review'];
const TITLES = [
    'What kind of website is this?',
    'Which of these feel right?',
    'What do you have already?',
    'Which pages do you need?',
    'Here’s what we’ll start with.',
];
const INTROS = [
    'Pick the closest match. It shapes what we ask you next, and you can change it at any point.',
    'Go on instinct — pick up to three. These are a starting point for the look, not a blueprint.',
    'All optional. Anything you don’t have yet, we can sort out together later.',
    'A starting point only. We’ll tell you if we think something is missing.',
    'Check this sounds like you. Sending it starts the conversation — nothing here is final.',
];

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const MAX_FILES_PER_GROUP = 10;

async function uploadImage(file: File) {
    const form = new FormData();
    form.append('file', file);
    form.append('upload_preset', 'Unsigned Presets');
    const response = await fetch('https://api.cloudinary.com/v1_1/dldxkfbz4/image/upload', { method: 'POST', body: form });
    const data = await response.json();
    if (!response.ok || typeof data.secure_url !== 'string' || !data.secure_url.startsWith('https://')) throw new Error('Upload failed');
    return data.secure_url as string;
}

const asStringArray = (value: unknown) => Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === 'string') : [];

export default function ProjectSetup({ userId, projectId }: Props) {
    const router = useRouter();
    const [projectName, setProjectName] = useState('');
    const [step, setStep] = useState(0);
    const [loading, setLoading] = useState(true);
    const [loadFailed, setLoadFailed] = useState(false);
    const [attempt, setAttempt] = useState(0);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');

    const [categoryId, setCategoryId] = useState('');
    const [customCategory, setCustomCategory] = useState('');
    const [stylePicks, setStylePicks] = useState<string[]>([]);
    const [pages, setPages] = useState<string[]>([]);
    const [assetLinks, setAssetLinks] = useState('');
    const [additionalNotes, setAdditionalNotes] = useState('');

    // Uploaded files live in assetUrls; files still waiting to upload live in assetFiles.
    const [assetUrls, setAssetUrls] = useState<Record<string, string[]>>({});
    const [assetFiles, setAssetFiles] = useState<Record<string, File[]>>({});
    const [previews, setPreviews] = useState<Record<string, string[]>>({});
    const [logoUrl, setLogoUrl] = useState('');
    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [logoPreview, setLogoPreview] = useState('');

    const inFlight = useRef(false);
    const heading = useRef<HTMLHeadingElement>(null);
    const customInput = useRef<HTMLInputElement>(null);

    const category = findCategory(categoryId || OTHER_CATEGORY_ID);
    const directions = stylesForCategory(categoryId);
    const isOther = categoryId === OTHER_CATEGORY_ID;

    useEffect(() => {
        let active = true;
        setLoading(true); setLoadFailed(false); setError('');
        getDoc(doc(db, 'users', userId, 'projects', projectId)).then(snapshot => {
            if (!active) return;
            if (!snapshot.exists()) throw new Error('Project not found');
            const data = snapshot.data();
            if (data.setupComplete === true) { router.replace(`/dashboard/projects/${projectId}`); return; }
            setProjectName(data.projectName || 'Your website');
            setCategoryId(typeof data.categoryId === 'string' ? data.categoryId : '');
            setCustomCategory(typeof data.customCategory === 'string' ? data.customCategory : '');
            setStylePicks(asStringArray(data.stylePicks));
            setPages(asStringArray(data.pages));
            setAssetLinks(typeof data.assetLinks === 'string' ? data.assetLinks : '');
            setAdditionalNotes(typeof data.additionalNotes === 'string' ? data.additionalNotes : '');
            setLogoUrl(typeof data.logoUrl === 'string' ? data.logoUrl : '');
            const saved = data.briefAssets && typeof data.briefAssets === 'object' ? data.briefAssets as Record<string, unknown> : {};
            setAssetUrls(Object.fromEntries(Object.entries(saved).map(([key, value]) => [key, asStringArray(value)])));
            setStep(data.briefVersion === 3 && Number.isInteger(data.setupStep) ? Math.min(4, Math.max(0, data.setupStep)) : 0);
        }).catch(() => { if (active) { setLoadFailed(true); setError('Could not load this project. Please retry.'); } })
            .finally(() => { if (active) setLoading(false); });
        return () => { active = false; };
    }, [userId, projectId, router, attempt]);

    useEffect(() => {
        const created: string[] = [];
        const next: Record<string, string[]> = {};
        for (const [key, files] of Object.entries(assetFiles)) {
            next[key] = files.map(file => { const url = URL.createObjectURL(file); created.push(url); return url; });
        }
        setPreviews(next);
        return () => created.forEach(url => URL.revokeObjectURL(url));
    }, [assetFiles]);

    useEffect(() => {
        if (!logoFile) { setLogoPreview(''); return; }
        const url = URL.createObjectURL(logoFile); setLogoPreview(url);
        return () => URL.revokeObjectURL(url);
    }, [logoFile]);

    const go = (next: number) => { setStep(next); requestAnimationFrame(() => heading.current?.focus()); };

    // Changing the category changes which styles and pages exist, so drop any that no longer do.
    // Uploaded files are kept whatever happens — the team can still see them on the brief.
    const chooseCategory = (id: string) => {
        if (id === categoryId) return;
        const next = findCategory(id);
        setCategoryId(id);
        setStylePicks(current => current.filter(pick => next.styles.includes(pick)));
        setPages(current => current.filter(page => next.pages.includes(page)));
        if (id !== OTHER_CATEGORY_ID) setCustomCategory('');
        setError('');
    };

    const toggleStyle = (id: string) => setStylePicks(current => current.includes(id)
        ? current.filter(pick => pick !== id)
        : current.length >= MAX_STYLE_PICKS ? current : [...current, id]);

    const togglePage = (page: string) => setPages(current => current.includes(page)
        ? current.filter(entry => entry !== page)
        : [...current, page]);

    const addFiles = (groupId: string, list: FileList | null) => {
        if (!list?.length) return;
        const chosen = Array.from(list);
        if (chosen.some(file => !file.type.startsWith('image/') || file.size > MAX_FILE_BYTES)) {
            setError('Images only, and each one under 10 MB.');
            return;
        }
        const already = (assetUrls[groupId]?.length || 0) + (assetFiles[groupId]?.length || 0);
        if (already + chosen.length > MAX_FILES_PER_GROUP) {
            setError(`Up to ${MAX_FILES_PER_GROUP} files here. You can send more in messages later.`);
            return;
        }
        setError('');
        setAssetFiles(current => ({ ...current, [groupId]: [...(current[groupId] || []), ...chosen] }));
    };

    const removeStaged = (groupId: string, index: number) =>
        setAssetFiles(current => ({ ...current, [groupId]: (current[groupId] || []).filter((_, i) => i !== index) }));

    const removeUploaded = (groupId: string, index: number) =>
        setAssetUrls(current => ({ ...current, [groupId]: (current[groupId] || []).filter((_, i) => i !== index) }));

    const save = async (action: 'next' | 'exit' | 'submit') => {
        if (inFlight.current || loading || loadFailed) return;
        if (action !== 'exit' && !categoryId) {
            setError('Choose the kind of website you’d like first.');
            go(0); return;
        }
        if (action !== 'exit' && isOther && !customCategory.trim()) {
            setError('Tell us in a few words what kind of website this is.');
            setStep(0); requestAnimationFrame(() => customInput.current?.focus()); return;
        }
        inFlight.current = true; setBusy(true); setError('');
        try {
            let savedLogo = logoUrl;
            if (logoFile) { savedLogo = await uploadImage(logoFile); setLogoUrl(savedLogo); setLogoFile(null); }

            // Anything already uploaded is reused, so a retry never uploads the same file twice.
            const savedAssets: Record<string, string[]> = { ...assetUrls };
            for (const [groupId, files] of Object.entries(assetFiles)) {
                if (!files.length) continue;
                const uploaded = await Promise.all(files.map(uploadImage));
                savedAssets[groupId] = [...(savedAssets[groupId] || []), ...uploaded];
            }
            setAssetUrls(savedAssets); setAssetFiles({});

            const nextStep = action === 'next' ? Math.min(step + 1, 4) : step;
            const updates = {
                categoryId, customCategory: customCategory.trim(), stylePicks, pages,
                assetLinks: assetLinks.trim(), additionalNotes: additionalNotes.trim(),
                briefAssets: savedAssets, logoUrl: savedLogo, briefVersion: 3, setupStep: nextStep,
            };
            const ref = doc(db, 'users', userId, 'projects', projectId);
            if (action === 'submit') {
                await runTransaction(db, async transaction => {
                    const snapshot = await transaction.get(ref);
                    if (!snapshot.exists()) throw new Error('Project not found');
                    if (snapshot.data().setupComplete === true) return;
                    transaction.update(ref, { ...updates, setupComplete: true, approval: 'Pending' });
                    queueAdminNotification(transaction, 'New project request', `${projectName} is ready for review.`, `/dashboard/projects/${projectId}?userId=${userId}`, 'new_project', `project-${projectId}`);
                });
                router.push(`/dashboard/projects/${projectId}`);
            } else {
                await updateDoc(ref, updates);
                if (action === 'exit') router.push('/dashboard/projects');
                else go(nextStep);
            }
        } catch {
            setError(action === 'submit'
                ? 'We could not send your brief. Your answers are still here — please try again.'
                : 'Your changes could not be saved. Your answers are still here — please try again.');
        } finally { inFlight.current = false; setBusy(false); }
    };

    const countFor = (groupId: string) => (assetUrls[groupId]?.length || 0) + (assetFiles[groupId]?.length || 0);
    const totalFiles = new Set([...Object.keys(assetUrls), ...Object.keys(assetFiles)]);
    const fileSummary = Array.from(totalFiles)
        .filter(groupId => countFor(groupId) > 0)
        .map(groupId => `${assetLabel(groupId)}: ${countFor(groupId)}`)
        .join(' · ');

    const categoryAnswer = isOther ? (customCategory.trim() || 'Something else') : (category.label || '');
    const styleAnswer = stylePicks.map(id => STYLE_DIRECTIONS[id]?.label).filter(Boolean).join(', ');

    const review = (title: string, rows: [string, string][], editStep: number) => <section className={styles.review}>
        <div className={styles.topbar}><h3>{title}</h3><button type="button" className={styles.secondary} onClick={() => go(editStep)} aria-label={`Edit ${title.toLowerCase()}`}>Edit</button></div>
        <dl>{rows.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value || 'We’ll figure this out together.'}</dd></div>)}</dl>
    </section>;

    const thumbs = (groupId: string) => {
        const uploaded = assetUrls[groupId] || [];
        const staged = previews[groupId] || [];
        if (!uploaded.length && !staged.length) return null;
        return <div className={styles.thumbs}>
            {uploaded.map((url, index) => <div className={styles.thumb} key={`saved-${url}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt="" />
                <button type="button" className={styles.thumbRemove} onClick={() => removeUploaded(groupId, index)} aria-label={`Remove ${assetLabel(groupId)} file ${index + 1}`}>✕</button>
            </div>)}
            {staged.map((url, index) => <div className={styles.thumb} key={`staged-${url}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt="" />
                <button type="button" className={styles.thumbRemove} onClick={() => removeStaged(groupId, index)} aria-label={`Remove pending ${assetLabel(groupId)} file ${index + 1}`}>✕</button>
            </div>)}
        </div>;
    };

    return <div className={`${styles.shell} ${styles.project}`}>
        <div className={styles.topbar}><div><p className={styles.eyebrow}>Your project brief</p><p className="font-semibold break-words">{projectName}</p></div><button className={styles.secondary} disabled={busy || loading || loadFailed} onClick={() => save('exit')}>Save &amp; exit</button></div>
        {loading ? <p role="status">Opening your project…</p> : loadFailed ? <div><p role="alert" className={styles.error}>{error}</p><button className={styles.secondary} onClick={() => setAttempt(value => value + 1)}>Retry</button></div> : <>
            <ol className={styles.steps} aria-label="Project setup progress">{STEPS.map((label, index) => <li key={label} aria-current={index === step ? 'step' : undefined}>{index + 1}. {label}</li>)}</ol>
            <form className={styles.card} onSubmit={event => { event.preventDefault(); save(step === 4 ? 'submit' : 'next'); }} aria-busy={busy}>
                <p className={styles.eyebrow}>Step {step + 1} of 5{step > 0 && step < 4 ? ' · Optional' : ''}</p>
                <h1 className={styles.title} ref={heading} tabIndex={-1}>{TITLES[step]}</h1>
                <p className={styles.intro}>{INTROS[step]}</p>
                {error && <p role="alert" className={styles.error}>{error}</p>}
                <fieldset disabled={busy}>

                    {step === 0 && <>
                        <div className={styles.categories} role="group" aria-label="Kind of website">
                            {PROJECT_CATEGORIES.map(entry => <button
                                type="button" key={entry.id} className={styles.category}
                                aria-pressed={categoryId === entry.id} onClick={() => chooseCategory(entry.id)}
                            >
                                <span className={styles.categoryIcon} aria-hidden="true">{entry.icon}</span>
                                <span>
                                    <span className={styles.categoryName}>{entry.label}</span>
                                    <span className={styles.categoryBlurb}>{entry.blurb}</span>
                                </span>
                            </button>)}
                        </div>
                        {isOther && <label className={styles.field} htmlFor="brief-custom">
                            <span className={styles.label}>What kind of website is it?</span>
                            <span className={styles.hint}>A few words is plenty — we’ll ask about the rest in person.</span>
                            <input ref={customInput} id="brief-custom" className={styles.input} maxLength={120} value={customCategory}
                                placeholder="A site for my band, a wedding invite, a directory…"
                                onChange={event => setCustomCategory(event.target.value)} />
                        </label>}
                    </>}

                    {step === 1 && <>
                        <p className={styles.label}>Pick up to {MAX_STYLE_PICKS}</p>
                        <p className={styles.counter} role="status">
                            {stylePicks.length ? `${stylePicks.length} of ${MAX_STYLE_PICKS} chosen` : 'Nothing chosen yet — that’s fine too.'}
                        </p>
                        <div className={styles.styles} role="group" aria-label="Style directions">
                            {directions.map(direction => {
                                const picked = stylePicks.includes(direction.id);
                                const position = stylePicks.indexOf(direction.id) + 1;
                                return <button
                                    type="button" key={direction.id} className={styles.style}
                                    aria-pressed={picked} disabled={!picked && stylePicks.length >= MAX_STYLE_PICKS}
                                    onClick={() => toggleStyle(direction.id)}
                                >
                                    <span className={styles.styleShot}><StylePreview direction={direction} /></span>
                                    {picked && <span className={styles.stylePick} aria-hidden="true">{position}</span>}
                                    <span className={styles.styleText}>
                                        <span className={styles.styleName}>{direction.label}</span>
                                        <span className={styles.styleBlurb}>{direction.blurb}</span>
                                    </span>
                                </button>;
                            })}
                        </div>
                    </>}

                    {step === 2 && <>
                        <div className={styles.assets}>
                            {category.assets.map(request => <div className={styles.asset} key={request.id}>
                                <div className={styles.assetHead}>
                                    <label className={styles.label} htmlFor={`asset-${request.id}`}>{request.label}</label>
                                    {countFor(request.id) > 0 && <span className={styles.assetCount}>{countFor(request.id)} added</span>}
                                </div>
                                <span className={styles.hint}>{request.hint}</span>
                                <input className={styles.input} id={`asset-${request.id}`} type="file" accept="image/*" multiple
                                    onChange={event => { addFiles(request.id, event.target.files); event.target.value = ''; }} />
                                {thumbs(request.id)}
                            </div>)}

                            {category.wantsLogo && <div className={styles.asset}>
                                <div className={styles.assetHead}>
                                    <label className={styles.label} htmlFor="brief-logo">A logo, if you have one</label>
                                </div>
                                <span className={styles.hint}>No logo needed to get started — plenty of sites launch without one.</span>
                                <input className={styles.input} id="brief-logo" type="file" accept="image/*" onChange={event => {
                                    const file = event.target.files?.[0]; if (!file) return;
                                    if (!file.type.startsWith('image/') || file.size > MAX_FILE_BYTES) { setError('Choose an image smaller than 10 MB.'); event.target.value = ''; return; }
                                    setError(''); setLogoFile(file);
                                }} />
                                {(logoPreview || logoUrl) && <div>
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img className={styles.preview} src={logoPreview || logoUrl} alt="Your logo" />
                                    <button className={styles.secondary} type="button" onClick={() => {
                                        setLogoFile(null); setLogoUrl('');
                                        const input = document.getElementById('brief-logo') as HTMLInputElement | null;
                                        if (input) input.value = '';
                                    }}>Remove logo</button>
                                </div>}
                            </div>}
                        </div>

                        <label className={styles.field} htmlFor="brief-links">
                            <span className={styles.label}>Or point us at them</span>
                            <span className={styles.hint}>A shared folder, a social profile, an existing website. Check the team can open any link you share.</span>
                            <textarea id="brief-links" className={styles.input} rows={3} maxLength={3000} value={assetLinks}
                                placeholder="My photos are in this Drive folder… our Instagram is…"
                                onChange={event => setAssetLinks(event.target.value)} />
                        </label>
                    </>}

                    {step === 3 && <>
                        <p className={styles.label}>Suggested for a {categoryAnswer.toLowerCase()} site</p>
                        <div className={styles.choices} role="group" aria-label="Pages">
                            {category.pages.map(page => <button type="button" key={page} className={styles.choice}
                                aria-pressed={pages.includes(page)} onClick={() => togglePage(page)}>{page}</button>)}
                        </div>
                        <label className={styles.field} htmlFor="brief-notes">
                            <span className={styles.label}>Anything else?</span>
                            <span className={styles.hint}>A page that isn’t listed, something it must do, a question, or a detail we already talked about.</span>
                            <textarea id="brief-notes" className={styles.input} rows={4} maxLength={3000} value={additionalNotes}
                                placeholder="I’d like a page for testimonials… it needs to work well on phones…"
                                onChange={event => setAdditionalNotes(event.target.value)} />
                        </label>
                    </>}

                    {step === 4 && <>
                        {review('Type of website', [['What it is', categoryAnswer]], 0)}
                        {review('Look & feel', [['Directions you liked', styleAnswer]], 1)}
                        {review('Your files', [
                            ['Files added', fileSummary],
                            ['Logo', logoUrl || logoFile ? 'Logo added' : ''],
                            ['Links & notes', assetLinks],
                        ], 2)}
                        {review('Pages', [['Pages', pages.join(', ')], ['Anything else', additionalNotes]], 3)}
                        <p className={styles.hint}>We’ll review this and follow up with questions. You can track progress and keep the conversation going from your project dashboard.</p>
                    </>}

                    <div className={styles.actions}>
                        {step > 0
                            ? <button type="button" className={styles.secondary} onClick={() => { setError(''); go(step - 1); }}>Back</button>
                            : <span className={styles.hint}>Choosing a type is all we need to start.</span>}
                        <button type="submit" className={styles.primary}>
                            {busy ? 'Saving…' : step === 4 ? 'Send project brief' : step === 3 ? 'Review your brief' : 'Continue'}
                        </button>
                    </div>
                </fieldset>
            </form>
        </>}
    </div>;
}
