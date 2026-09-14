export const STAGES = [
    { id: 1, label: 'Planning', icon: '🗺️' },
    { id: 2, label: 'Designing', icon: '🎨' },
    { id: 3, label: 'Developing', icon: '⚙️' },
    { id: 4, label: 'Launching', icon: '🚀' },
    { id: 5, label: 'Maintaining', icon: '🛡️' },
];

export const STAGE_DETAILS: Record<number, { headline: string; description: string }> = {
    1: {
        headline: 'Laying the foundation',
        description: "We're working out what your website needs to do and how it should feel. Nothing is being built yet — this is the thinking part.",
    },
    2: {
        headline: 'Designing your vision',
        description: "We're shaping how your website looks. Designs will appear under Uploads for you to react to, and your feedback steers what comes next.",
    },
    3: {
        headline: 'Building your website',
        description: "The approved design is being turned into a real, working website — every page, link, and form behind it.",
    },
    4: {
        headline: 'Preparing for launch',
        description: "Final checks, your domain, and hosting. Your website is nearly ready for the world to see.",
    },
    5: {
        headline: 'Your website is live',
        description: "Your website is out in the world. We keep an eye on it and handle updates and anything that comes up.",
    },
};

// Each stage is an equal step toward launch. An active project never reads as 0%,
// which is what a client would otherwise see for the whole of Planning.
const STAGE_PERCENT: Record<number, number> = { 1: 20, 2: 40, 3: 60, 4: 80, 5: 100 };

export function normalizeStage(value: unknown): number {
    const stage = Number(value);
    return Number.isInteger(stage) && stage >= 1 && stage <= 5 ? stage : 1;
}

export function normalizeProgress(value: unknown): number {
    const progress = Number(value);
    return Number.isFinite(progress) ? Math.min(100, Math.max(0, Math.round(progress))) : 0;
}

export function stageProgress(stage: number): number {
    return STAGE_PERCENT[normalizeStage(stage)];
}

/** The stage after this one, or null once the site is live and simply being looked after. */
export function nextStage(stage: number) {
    return STAGES.find(entry => entry.id === normalizeStage(stage) + 1) ?? null;
}

export function progressFields(data: Record<string, unknown>) {
    const status = normalizeStage(data.status);
    // Projects created before progressMode existed keep the percentage they were last
    // given, so nothing a client already saw changes underneath them.
    const progressMode = data.progressMode === 'automatic' ? 'automatic' : 'manual';
    return {
        status,
        progressMode,
        progress: progressMode === 'automatic' ? stageProgress(status) : normalizeProgress(data.progress),
        recentActivity: typeof data.recentActivity === 'string' ? data.recentActivity : '',
    };
}
