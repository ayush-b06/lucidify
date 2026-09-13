export interface Billing { paymentPlan?: unknown; paymentAmount?: unknown; weeksPaid?: unknown }
export function paymentCount(p: Billing) { return typeof p.paymentPlan === 'number' && Number.isInteger(p.paymentPlan) && p.paymentPlan >= 1 && p.paymentPlan <= 5 ? p.paymentPlan : 0; }
export function paymentAmount(p: Billing) { return typeof p.paymentAmount === 'number' && Number.isFinite(p.paymentAmount) ? Math.max(0, p.paymentAmount) : 0; }
export function paidCount(p: Billing) { return Math.min(paymentCount(p), typeof p.weeksPaid === 'number' && Number.isFinite(p.weeksPaid) ? Math.max(0, Math.floor(p.weeksPaid)) : 0); }
export const getTotalCost = (p: Billing) => Math.round(paymentCount(p) * paymentAmount(p) * 100) / 100;
export const getPaid = (p: Billing) => Math.round(paidCount(p) * paymentAmount(p) * 100) / 100;
export const getRemaining = (p: Billing) => Math.round((getTotalCost(p) - getPaid(p)) * 100) / 100;
