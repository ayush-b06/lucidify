"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/authContext";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/firebaseConfig";

export default function DashboardGuard({ children }: { children: React.ReactNode }) {
    const { user, loading } = useAuth();
    const router = useRouter();
    const [checkedUid, setCheckedUid] = useState<string | null>(null);
    const [error, setError] = useState(false);
    const [attempt, setAttempt] = useState(0);

    useEffect(() => {
        let cancelled = false;
        setCheckedUid(null);
        setError(false);
        if (loading) return;
        if (!user) {
            router.replace("/login");
            return;
        }

        void getDoc(doc(db, "users", user.uid)).then(snapshot => {
            if (cancelled) return;
            if (snapshot.data()?.setUp !== true) {
                router.replace("/signup/get-started");
            } else {
                setCheckedUid(user.uid);
            }
        }).catch(() => {
            if (!cancelled) setError(true);
        });
        return () => { cancelled = true; };
    }, [user, loading, router, attempt]);

    if (error) return (
        <div className="DashboardBackgroundGradient min-h-screen flex flex-col items-center justify-center gap-4 p-6">
            <p role="alert">We couldn’t load your profile. Please try again.</p>
            <button className="rounded-lg bg-[#725CF7] px-5 py-3 text-white" onClick={() => setAttempt(value => value + 1)}>Try again</button>
        </div>
    );
    if (loading || !user || checkedUid !== user.uid) return (
        <div className="DashboardBackgroundGradient min-h-screen flex items-center justify-center" role="status">Loading your dashboard…</div>
    );
    return <>{children}</>;
}
