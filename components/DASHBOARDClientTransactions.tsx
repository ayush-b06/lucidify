"use client";

import { getTotalCost, getPaid, getRemaining, paymentCount, paidCount } from '@/utils/billing';
import { useEffect, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { auth, db } from '../firebaseConfig';
import DashboardClientSideNav from './DashboardClientSideNav';
import DashboardTopBar from './DashboardTopBar';
import Link from 'next/link';

interface Project {
    id: string;
    projectName: string;
    logoAttachment?: string | null;
    paymentPlan?: number;
    paymentAmount?: number;
    paymentStatus?: string;
    weeksPaid?: number;
    paymentStartDate?: string;
    status?: number;
}

const PLAN_LABELS: Record<number, string> = {
    1: '100% Upfront',
    2: '2-Week Plan',
    3: '3-Week Plan',
    4: '4-Week Plan',
    5: '5-Week Plan',
};

const fmt = (n: number) => `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const StatusBadge = ({ status }: { status?: string }) => {
    if (!status) return <span className="text-[11px] opacity-25 font-light italic">Not started</span>;
    const styles: Record<string, string> = {
        'On Time': 'bg-green-500/15 border-green-500/30 text-green-400',
        'Overdue': 'bg-red-500/15 border-red-500/30 text-red-400',
        'Paid': 'bg-[#725CF7]/15 border-[#725CF7]/30 text-[#a89cff]',
    };
    const cls = styles[status] ?? 'bg-white/10 border-white/10 text-white/50';
    return <span className={`text-[11px] px-[8px] py-[2px] rounded-full border font-light ${cls}`}>{status}</span>;
};

const DASHBOARDClientTransactions = () => {
    const [projects, setProjects] = useState<Project[]>([]);
    const [error, setError] = useState('');
    const [attempt, setAttempt] = useState(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const user = auth.currentUser;
        if (!user) return;
        getDocs(collection(db, 'users', user.uid, 'projects'))
            .then(snap => setProjects(snap.docs.map(d => ({ id: d.id, ...d.data() } as Project))))
            .catch(() => setError('Could not load payments. Please retry.'))
            .finally(() => setLoading(false));
    }, [attempt]);

    const active = projects.filter(p => getTotalCost(p) > 0);
    const totalCost = active.reduce((s, p) => s + getTotalCost(p), 0);
    const totalPaid = active.reduce((s, p) => s + getPaid(p), 0);
    const totalRemaining = active.reduce((s, p) => s + getRemaining(p), 0);

    return (
        <div className="flex flex-col xl:flex-row h-screen DashboardBackgroundGradient overflow-hidden">
            <DashboardClientSideNav highlight="transactions" />

            <div className="flex-1 flex flex-col pt-[60px] xl:pt-0 min-h-0 overflow-hidden">
                <DashboardTopBar title="Transactions" />
                {error && <div role="alert" className="DashboardNotice">{error} <button onClick={() => { setError(''); setAttempt(n => n + 1); }}>Retry</button></div>}

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto px-[20px] sm:px-[50px] pt-[30px] pb-[40px]">
                    <div className="mb-[28px]">
                        <h1 className="text-[28px] font-semibold mb-[4px]">Transactions</h1>
                        <p className="text-[14px] font-light opacity-50">Track your project payments and billing history.</p>
                    </div>

                    {loading ? (
                        <div className="flex items-center justify-center py-[80px]">
                            <p className="opacity-30 font-light text-[14px]">Loading...</p>
                        </div>
                    ) : (
                        <>
                            {/* Summary Cards */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-[14px] mb-[30px]">
                                {[
                                    { label: 'Total Project Cost', value: fmt(totalCost), sub: 'across all projects', icon: '💰' },
                                    { label: 'Paid So Far', value: fmt(totalPaid), sub: totalCost > 0 ? `${Math.round((totalPaid / totalCost) * 100)}% of total` : '—', icon: '✅' },
                                    { label: 'Remaining Balance', value: fmt(totalRemaining), sub: 'outstanding', icon: '⏳' },
                                ].map(card => (
                                    <div key={card.label} className="BlackGradient ContentCardShadow rounded-[20px] px-[24px] py-[22px]">
                                        <div className="flex items-center gap-[8px] mb-[12px]">
                                            <span className="text-[16px]">{card.icon}</span>
                                            <p className="text-[12px] opacity-40 font-light">{card.label}</p>
                                        </div>
                                        <p className="text-[26px] font-semibold mb-[3px]">{card.value}</p>
                                        <p className="text-[11px] opacity-25 font-light">{card.sub}</p>
                                    </div>
                                ))}
                            </div>

                            {/* Payment Schedules */}
                            <div className="flex items-center gap-[10px] mb-[14px]">
                                <h2 className="text-[16px] font-semibold">Payment Schedules</h2>
                                <span className="text-[11px] opacity-35 font-light">{active.length} project{active.length !== 1 ? 's' : ''}</span>
                            </div>

                            {active.length === 0 ? (
                                <div className="BlackGradient ContentCardShadow rounded-[20px] flex flex-col items-center justify-center py-[60px] gap-[10px] mb-[28px]">
                                    <div className="text-[32px] opacity-20">💳</div>
                                    <p className="text-[14px] opacity-35 font-light">No active payment schedules</p>
                                    <p className="text-[12px] opacity-25 font-light">Payment details will appear here once your project is set up.</p>
                                </div>
                            ) : (
                                <div className="flex flex-col gap-[12px] mb-[30px]">
                                    {active.map(p => {
                                        const total = getTotalCost(p);
                                        const paid = getPaid(p);
                                        const remaining = getRemaining(p);
                                        const totalPayments = p.paymentPlan === 1 ? 1 : (p.paymentPlan ?? 1);
                                        const paidCount = p.weeksPaid ?? 0;
                                        const pct = totalPayments > 0 ? Math.min(100, Math.round((paidCount / totalPayments) * 100)) : 0;
                                        const isComplete = paidCount >= totalPayments && totalPayments > 0;

                                        return (
                                            <div key={p.id} className="BlackGradient ContentCardShadow rounded-[20px] px-[24px] py-[22px]">
                                                {/* Header row */}
                                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-[16px]">
                                                    <div className="flex items-center gap-[14px] min-w-0">
                                                        <div className="w-[44px] h-[44px] rounded-[12px] overflow-hidden flex-shrink-0 BlackWithLightGradient flex items-center justify-center">
                                                            {p.logoAttachment
                                                                ? <img src={p.logoAttachment} alt={p.projectName} className="w-full h-full object-cover" />
                                                                : <span className="text-[18px] opacity-25">🌐</span>
                                                            }
                                                        </div>
                                                        <div className="min-w-0">
                                                            <div className="flex items-center gap-[8px] flex-wrap mb-[3px]">
                                                                <p className="text-[15px] font-semibold truncate">{p.projectName}</p>
                                                                <StatusBadge status={p.paymentStatus} />
                                                            </div>
                                                            <p className="text-[12px] opacity-35 font-light">{PLAN_LABELS[p.paymentPlan ?? 0] ?? 'Custom'}</p>
                                                        </div>
                                                    </div>

                                                    {/* Amounts */}
                                                    <div className="flex items-center gap-[20px] sm:gap-[28px] flex-shrink-0">
                                                        <div className="text-center">
                                                            <p className="text-[11px] opacity-30 font-light mb-[2px]">Per Payment</p>
                                                            <p className="text-[15px] font-semibold">{fmt(p.paymentAmount ?? 0)}</p>
                                                        </div>
                                                        <div className="text-center">
                                                            <p className="text-[11px] opacity-30 font-light mb-[2px]">Paid</p>
                                                            <p className="text-[15px] font-semibold text-green-400">{fmt(paid)}</p>
                                                        </div>
                                                        <div className="text-center">
                                                            <p className="text-[11px] opacity-30 font-light mb-[2px]">Remaining</p>
                                                            <p className={`text-[15px] font-semibold ${remaining === 0 && total > 0 ? 'text-green-400' : ''}`}>
                                                                {remaining === 0 && total > 0 ? 'Paid ✓' : fmt(remaining)}
                                                            </p>
                                                        </div>
                                                        <button
                                                            disabled
                                                            title="Online payments coming soon"
                                                            className="hidden sm:flex flex-shrink-0 items-center gap-[6px] px-[16px] py-[9px] rounded-[10px] text-[12px] font-medium opacity-30 cursor-not-allowed BlackWithLightGradient ContentCardShadow whitespace-nowrap"
                                                        >
                                                            {isComplete ? '✓ Fully Paid' : '🔒 Pay Now'}
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* Progress bar */}
                                                <div className="mt-[16px]">
                                                    <div className="flex items-center justify-between mb-[6px]">
                                                        <p className="text-[11px] opacity-30 font-light">{paidCount} of {totalPayments} payment{totalPayments !== 1 ? 's' : ''} made</p>
                                                        <p className="text-[11px] opacity-30 font-light">{pct}%</p>
                                                    </div>
                                                    <div className="w-full h-[5px] rounded-full bg-white/8 overflow-hidden">
                                                        <div
                                                            className="h-full rounded-full transition-all duration-500"
                                                            style={{ width: `${pct}%`, background: isComplete ? '#4ade80' : 'linear-gradient(90deg, #725CF7, #6265f0)' }}
                                                        />
                                                    </div>
                                                </div>

                                                {/* Mobile pay button */}
                                                <button
                                                    disabled
                                                    title="Online payments coming soon"
                                                    className="sm:hidden mt-[14px] w-full py-[10px] rounded-[10px] text-[12px] font-medium opacity-30 cursor-not-allowed BlackWithLightGradient ContentCardShadow"
                                                >
                                                    {isComplete ? '✓ Fully Paid' : '🔒 Pay Now — Coming Soon'}
                                                </button>

                                                <Link
                                                    href={`/dashboard/projects/${p.id}?projectId=${p.id}&userId=${auth.currentUser?.uid}`}
                                                    className="inline-flex items-center gap-[4px] mt-[12px] text-[11px] opacity-25 hover:opacity-55 font-light transition-opacity"
                                                >
                                                    View project →
                                                </Link>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            {/* Invoice History */}
                            <div className="flex items-center gap-[10px] mb-[14px]">
                                <h2 className="text-[16px] font-semibold">Invoice History</h2>
                            </div>
                            <div className="BlackGradient ContentCardShadow rounded-[20px] flex flex-col items-center justify-center py-[55px] gap-[10px]">
                                <div className="text-[32px] opacity-20">🧾</div>
                                <p className="text-[14px] opacity-35 font-light">No invoices yet</p>
                                <p className="text-[12px] opacity-25 font-light text-center max-w-[280px] leading-relaxed">
                                    Your receipts and invoices will appear here once online payments are enabled.
                                </p>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DASHBOARDClientTransactions;
