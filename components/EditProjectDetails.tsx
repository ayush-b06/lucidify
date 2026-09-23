"use client";

import { useRef, useState } from 'react';
import { doc, runTransaction } from 'firebase/firestore';
import { db } from '@/firebaseConfig';

export default function EditProjectDetails({ userId, projectId, project }: { userId: string; projectId: string; project: { projectName?: string; projectDescription?: string } }) {
    const [editing, setEditing] = useState(false);
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [original, setOriginal] = useState({ projectName: '', projectDescription: '' });
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);
    const inFlight = useRef(false);
    if (!editing) return <button className="text-sm underline mb-5" onClick={() => {
        const values = { projectName: project.projectName || '', projectDescription: project.projectDescription || '' };
        setOriginal(values); setName(values.projectName); setDescription(values.projectDescription); setError(''); setEditing(true);
    }}>Edit project details</button>;
    return <form aria-label="Edit project details" className="BlackGradient ContentCardShadow rounded-[20px] p-6 mb-5 flex flex-col gap-4" onSubmit={async event => {
        event.preventDefault();
        if (!name.trim() || inFlight.current) return;
        inFlight.current = true; setBusy(true); setError('');
        try {
            await runTransaction(db, async transaction => {
                const ref = doc(db, 'users', userId, 'projects', projectId);
                const current = await transaction.get(ref);
                if (!current.exists()) throw new Error('This project is no longer available.');
                const updates: Record<string, string> = {};
                if (name.trim() !== original.projectName) updates.projectName = name.trim();
                if (description.trim() !== original.projectDescription) updates.projectDescription = description.trim();
                for (const key of Object.keys(updates) as (keyof typeof original)[]) {
                    if ((current.data()[key] || '') !== original[key]) throw new Error('Someone updated these details while you were editing. Cancel and reopen the editor to see their changes.');
                }
                if (Object.keys(updates).length) transaction.update(ref, updates);
            });
            setEditing(false);
        } catch (failure) { setError(failure instanceof Error && !('code' in failure) ? failure.message : 'Could not save your changes. Please retry.'); }
        finally { inFlight.current = false; setBusy(false); }
    }}>
        <label className="flex flex-col gap-2 text-sm">Project name<input required maxLength={120} value={name} disabled={busy} onChange={event => setName(event.target.value)} className="DashboardSearch rounded-xl p-3" /></label>
        <label className="flex flex-col gap-2 text-sm">Project description<textarea maxLength={5000} rows={3} value={description} disabled={busy} onChange={event => setDescription(event.target.value)} className="DashboardSearch rounded-xl p-3" /></label>
        {error && <p role="alert">{error}</p>}
        <div className="flex gap-4"><button disabled={busy || !name.trim()} className="rounded-xl bg-[#725CF7] px-4 py-2 text-sm text-white disabled:opacity-50">{busy ? 'Saving…' : 'Save details'}</button><button type="button" disabled={busy} onClick={() => setEditing(false)}>Cancel</button></div>
    </form>;
}
