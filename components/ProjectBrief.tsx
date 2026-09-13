export interface ProjectBriefData {
    estimatedBudget?: string; requestedPaymentPlan?: string; platform?: string;
    subpages?: string[]; maintenancePlan?: string; approval?: string; paymentPlan?: number | string;
}
export default function ProjectBrief({ project }: { project: ProjectBriefData }) {
    const preference = project.requestedPaymentPlan || (typeof project.paymentPlan === 'string' ? project.paymentPlan : '');
    const fields = [['Platform', project.platform], ['Estimated budget', project.estimatedBudget], ['Requested payment arrangement', preference], ['Ongoing support', project.maintenancePlan], ['Pages', Array.isArray(project.subpages) ? project.subpages.join(', ') : '']].filter(([,value]) => value);
    if (!fields.length && !project.approval) return null;
    return <section aria-label="Project brief" className="BlackGradient ContentCardShadow rounded-[20px] p-6 mb-5">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4"><h2 className="font-semibold">Project brief</h2>{project.approval && <span className="text-sm">{project.approval === 'Pending' ? 'Awaiting review' : project.approval}</span>}</div>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">{fields.map(([label,value]) => <div key={label}><dt className="text-xs opacity-70 mb-1">{label}</dt><dd className="text-sm break-words">{value}</dd></div>)}</dl>
        {preference && <p className="text-xs opacity-70 mt-4">The payment arrangement above is a preference. The agreed billing schedule appears below.</p>}
    </section>;
}
