export interface ProjectBriefData {
    briefVersion?: number; projectDescription?: string; audience?: string; visitorGoal?: string;
    visualDirection?: string; inspiration?: string; contentReadiness?: string; contentLinks?: string;
    mustHaves?: string; timelinePreference?: string; additionalNotes?: string;
    estimatedBudget?: string; requestedPaymentPlan?: string; platform?: string;
    subpages?: string[]; maintenancePlan?: string; approval?: string; paymentPlan?: number | string;
}
export default function ProjectBrief({ project }: { project: ProjectBriefData }) {
    const preference = project.requestedPaymentPlan || (typeof project.paymentPlan === 'string' ? project.paymentPlan : '');
    const fields = [
        ['The idea', project.briefVersion === 2 ? project.projectDescription : ''],
        ['Who it’s for', project.audience], ['What visitors should do', project.visitorGoal],
        ['Look & feel', project.visualDirection], ['Inspiration', project.inspiration],
        ['Content starting point', project.contentReadiness], ['Content links & notes', project.contentLinks],
        ['Must-haves', project.mustHaves], ['Timing preference', project.timelinePreference],
        ['Budget preference', project.estimatedBudget], ['Other notes', project.additionalNotes],
        ['Platform', project.platform], ['Requested payment arrangement', preference],
        ['Ongoing support', project.maintenancePlan], ['Pages', Array.isArray(project.subpages) ? project.subpages.join(', ') : ''],
    ].filter(([, value]) => value);
    if (!fields.length && !project.approval) return null;
    return <section aria-label="Project brief" className="BlackGradient ContentCardShadow rounded-[20px] p-6 mb-5">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4"><h2 className="font-semibold">Project brief</h2>{project.approval && <span className="text-sm">{project.approval === 'Pending' ? 'Awaiting review' : project.approval}</span>}</div>
        {project.briefVersion === 2 && <p className="text-sm opacity-80 mb-5">A starting point for our conversation. Any open details can be worked out together.</p>}
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-5">{fields.map(([label, value]) => <div key={label}><dt className="text-xs opacity-80 mb-1">{label}</dt><dd className="text-sm whitespace-pre-wrap break-words leading-relaxed">{value}</dd></div>)}</dl>
        {preference && <p className="text-xs opacity-80 mt-4">The payment arrangement above is a preference. The agreed billing schedule appears below.</p>}
    </section>;
}
