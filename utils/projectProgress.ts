export const STAGES = [
    { id: 1, label: 'Planning', icon: '🗺️' },
    { id: 2, label: 'Designing', icon: '🎨' },
    { id: 3, label: 'Developing', icon: '⚙️' },
    { id: 4, label: 'Launching', icon: '🚀' },
    { id: 5, label: 'Maintaining', icon: '🛡️' },
];

export const STAGE_DETAILS: Record<number, {
    headline: string;
    description: string;
    milestones: string[];
    nextUp: string[];
}> = {
    1: {
        headline: 'Laying the foundation',
        description: "We're defining your project's goals, technical requirements, and timeline. This stage sets the direction for everything that follows.",
        milestones: [
            'Kickoff call completed',
            'Project requirements documented',
            'Scope & deliverables agreed',
            'Timeline & milestones set',
        ],
        nextUp: ['Wireframe delivery', 'Brand asset review', 'Design phase kickoff'],
    },
    2: {
        headline: 'Designing your vision',
        description: "Our designers are crafting the visual identity and UI/UX of your website. You'll be reviewing mockups and providing feedback in this phase.",
        milestones: [
            'Brand direction approved',
            'Homepage mockup delivered',
            'Inner pages mockup delivered',
            'Final design revisions approved',
        ],
        nextUp: ['Development handoff', 'Content gathering', 'Development phase kickoff'],
    },
    3: {
        headline: 'Building your website',
        description: "Developers are turning the approved designs into a fully functional website. This includes frontend, backend integrations, and quality testing.",
        milestones: [
            'Development environment set up',
            'Homepage built & responsive',
            'All pages coded & linked',
            'Forms, integrations & CMS set up',
            'Cross-browser & mobile testing',
        ],
        nextUp: ['Client review session', 'Final QA pass', 'Launch preparation'],
    },
    4: {
        headline: 'Preparing for launch',
        description: "Your website is nearly live! We're handling domain configuration, hosting setup, final testing, and performance optimizations before going live.",
        milestones: [
            'Final client review completed',
            'Domain & DNS configured',
            'SSL certificate active',
            'Performance & SEO optimizations',
            'Website live 🎉',
        ],
        nextUp: ['Go-live announcement', 'Analytics setup', 'Handover & training'],
    },
    5: {
        headline: 'Your website is live',
        description: "Congratulations — your website is live and in the world! We're actively monitoring performance, applying updates, and handling any issues that arise.",
        milestones: [
            'Website successfully launched',
            'Google Analytics connected',
            'Uptime monitoring active',
            'Monthly performance report',
        ],
        nextUp: ['Ongoing support & updates', 'SEO growth review', 'Feature enhancements'],
    },
};

// Default milestone states (all false)
export const defaultMilestones = (): Record<string, boolean[]> => ({
    '1': [false, false, false, false],
    '2': [false, false, false, false],
    '3': [false, false, false, false, false],
    '4': [false, false, false, false, false],
    '5': [false, false, false, false],
});


export function normalizeStage(value: unknown): number {
    const stage = Number(value);
    return Number.isInteger(stage) && stage >= 1 && stage <= 5 ? stage : 1;
}
export function normalizeProgress(value: unknown): number {
    const progress = Number(value);
    return Number.isFinite(progress) ? Math.min(100, Math.max(0, Math.round(progress))) : 0;
}
export function normalizeMilestones(value: unknown): Record<string, boolean[]> {
    const result = defaultMilestones();
    const source = value && typeof value === 'object' ? value as Record<string, unknown> : {};
    for (const key of Object.keys(result)) {
        const list = source[key];
        result[key] = result[key].map((_, i) => Array.isArray(list) && list[i] === true);
    }
    return result;
}
// The four build phases share 0–100%; ongoing maintenance starts at 100%.
export function stageProgress(stage: number, milestones: Record<string, boolean[]>): number {
    const current = normalizeStage(stage);
    if (current === 5) return 100;
    const checklist = normalizeMilestones(milestones)[String(current)];
    return Math.round((current - 1) * 25 + 25 * checklist.filter(Boolean).length / checklist.length);
}
export function progressFields(data: Record<string, unknown>) {
    const status = normalizeStage(data.status);
    const stageMilestones = normalizeMilestones(data.stageMilestones);
    const progressMode = data.progressMode === 'automatic' ? 'automatic' : 'manual';
    return { status, stageMilestones, progressMode,
        progress: progressMode === 'automatic' ? stageProgress(status, stageMilestones) : normalizeProgress(data.progress),
        recentActivity: typeof data.recentActivity === 'string' ? data.recentActivity : '' };
}
