import { assetLabel, findCategory, OTHER_CATEGORY_ID, STYLE_DIRECTIONS } from '@/utils/projectCategories';

export interface ProjectBriefData {
    briefVersion?: number;
    // Brief v3
    categoryId?: string; customCategory?: string; stylePicks?: string[]; pages?: string[];
    briefAssets?: Record<string, string[]>; assetLinks?: string;
    // Shared / legacy
    projectDescription?: string; audience?: string; visitorGoal?: string;
    visualDirection?: string; inspiration?: string; contentReadiness?: string; contentLinks?: string;
    mustHaves?: string; timelinePreference?: string; additionalNotes?: string;
    estimatedBudget?: string; requestedPaymentPlan?: string; platform?: string;
    subpages?: string[]; maintenancePlan?: string; approval?: string; paymentPlan?: number | string;
    logoUrl?: string;
}

const list = (value: unknown) => Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === 'string') : [];

export default function ProjectBrief({ project }: { project: ProjectBriefData }) {
    const preference = project.requestedPaymentPlan || (typeof project.paymentPlan === 'string' ? project.paymentPlan : '');
    const isCurrent = project.briefVersion === 3;

    const categoryAnswer = !isCurrent ? '' : project.categoryId === OTHER_CATEGORY_ID
        ? (project.customCategory || 'Something else')
        : (project.categoryId ? findCategory(project.categoryId).label : '');
    const styleAnswer = list(project.stylePicks).map(id => STYLE_DIRECTIONS[id]?.label).filter(Boolean).join(', ');

    const assetGroups = Object.entries(project.briefAssets || {})
        .map(([groupId, urls]) => [groupId, list(urls)] as const)
        .filter(([, urls]) => urls.length > 0);

    const fields: [string, string][] = [
        // Brief v3
        ['Kind of website', categoryAnswer],
        ['Directions they liked', styleAnswer],
        ['Pages they picked', list(project.pages).join(', ')],
        ['Links & notes about their files', project.assetLinks || ''],
        // Older briefs keep rendering exactly as they did
        ['The idea', project.briefVersion === 2 ? project.projectDescription || '' : ''],
        ['Who it’s for', project.audience || ''],
        ['What visitors should do', project.visitorGoal || ''],
        ['Look & feel', project.visualDirection || ''],
        ['Inspiration', project.inspiration || ''],
        ['Content starting point', project.contentReadiness || ''],
        ['Content links & notes', project.contentLinks || ''],
        ['Must-haves', project.mustHaves || ''],
        ['Timing preference', project.timelinePreference || ''],
        ['Budget preference', project.estimatedBudget || ''],
        ['Platform', project.platform || ''],
        ['Requested payment arrangement', preference],
        ['Ongoing support', project.maintenancePlan || ''],
        ['Pages', list(project.subpages).join(', ')],
        // Shared
        ['Anything else', project.additionalNotes || ''],
    ].filter((entry): entry is [string, string] => Boolean(entry[1]));

    if (!fields.length && !assetGroups.length && !project.approval) return null;

    return <section aria-label="Project brief" className="BlackGradient ContentCardShadow rounded-[20px] p-6 mb-5">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <h2 className="font-semibold">Project brief</h2>
            {project.approval && <span className="text-sm">{project.approval === 'Pending' ? 'Awaiting review' : project.approval}</span>}
        </div>
        {(isCurrent || project.briefVersion === 2) && <p className="text-sm opacity-80 mb-5">A starting point for our conversation. Any open details can be worked out together.</p>}

        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {fields.map(([label, value]) => <div key={label}>
                <dt className="text-xs opacity-80 mb-1">{label}</dt>
                <dd className="text-sm whitespace-pre-wrap break-words leading-relaxed">{value}</dd>
            </div>)}
        </dl>

        {assetGroups.length > 0 && <div className="mt-6">
            <h3 className="text-sm font-semibold mb-3">Files they shared</h3>
            <div className="flex flex-col gap-4">
                {assetGroups.map(([groupId, urls]) => <div key={groupId}>
                    <p className="text-xs opacity-80 mb-2">{assetLabel(groupId)} · {urls.length}</p>
                    <div className="flex flex-wrap gap-2">
                        {urls.map(url => <a key={url} href={url} target="_blank" rel="noreferrer"
                            className="block w-[84px] h-[84px] rounded-[10px] overflow-hidden border border-white/10">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={url} alt="" className="w-full h-full object-cover" />
                        </a>)}
                    </div>
                </div>)}
            </div>
        </div>}

        {preference && <p className="text-xs opacity-80 mt-4">The payment arrangement above is a preference. The agreed billing schedule appears below.</p>}
    </section>;
}
