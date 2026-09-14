// Everything the project brief asks for is driven from this file: the style directions a
// client is shown, the assets we ask them for, and the pages we suggest. Changing a category
// here changes every step of the wizard and the brief the team reads afterwards.

export type StyleLayout = 'centered' | 'split' | 'grid' | 'editorial' | 'showcase' | 'stacked';

export interface StyleDirection {
    id: string;
    label: string;
    blurb: string;
    /**
     * Drop in a real screenshot URL (Cloudinary or /public) and the painted preview below is
     * replaced by that image. Nothing else needs to change.
     */
    image?: string;
    preview: {
        bg: string;
        surface: string;
        ink: string;
        accent: string;
        layout: StyleLayout;
        radius: number;
        serif?: boolean;
    };
}

// A shared pool of visual directions. Each category orders them by what usually suits it,
// so a restaurant leads with warm photography and a consultancy leads with a clean grid.
export const STYLE_DIRECTIONS: Record<string, StyleDirection> = {
    minimal: {
        id: 'minimal',
        label: 'Minimal & airy',
        blurb: 'Lots of breathing room, small type, nothing shouting.',
        preview: { bg: '#ffffff', surface: '#f2f2f4', ink: '#1b1b20', accent: '#1b1b20', layout: 'centered', radius: 3 },
    },
    bold: {
        id: 'bold',
        label: 'Bold & graphic',
        blurb: 'Big type and strong blocks of colour. Hard to ignore.',
        preview: { bg: '#fdf24a', surface: '#1b1b20', ink: '#1b1b20', accent: '#1b1b20', layout: 'split', radius: 2 },
    },
    warm: {
        id: 'warm',
        label: 'Warm & photo-led',
        blurb: 'Photography does the talking, with soft, warm tones.',
        preview: { bg: '#f7efe6', surface: '#c98a5e', ink: '#3b2a1d', accent: '#a75f33', layout: 'showcase', radius: 8 },
    },
    editorial: {
        id: 'editorial',
        label: 'Editorial',
        blurb: 'Reads like a good magazine. Words first, serif type.',
        preview: { bg: '#fbfaf7', surface: '#e6e2d8', ink: '#16150f', accent: '#8a1f1f', layout: 'editorial', radius: 1, serif: true },
    },
    dark: {
        id: 'dark',
        label: 'Dark & premium',
        blurb: 'Deep background, glowing accents, a high-end feel.',
        preview: { bg: '#131318', surface: '#22222c', ink: '#f4f2ff', accent: '#8b6cff', layout: 'split', radius: 10 },
    },
    playful: {
        id: 'playful',
        label: 'Playful & colourful',
        blurb: 'Rounded shapes and bright colour. Friendly and informal.',
        preview: { bg: '#fff5fa', surface: '#ffd166', ink: '#2b1c3d', accent: '#ef5da8', layout: 'stacked', radius: 14 },
    },
    clean: {
        id: 'clean',
        label: 'Clean & professional',
        blurb: 'An orderly grid and calm blues. Straightforward and trustworthy.',
        preview: { bg: '#f6f8fc', surface: '#ffffff', ink: '#101a2c', accent: '#2563c9', layout: 'grid', radius: 6 },
    },
    elegant: {
        id: 'elegant',
        label: 'Classic & elegant',
        blurb: 'Centred, restrained, serif type and thin rules.',
        preview: { bg: '#f4f1ea', surface: '#ffffff', ink: '#232019', accent: '#9a7b3f', layout: 'centered', radius: 2, serif: true },
    },
};

export interface AssetRequest {
    id: string;
    label: string;
    hint: string;
}

export interface ProjectCategory {
    id: string;
    label: string;
    icon: string;
    /** What this kind of site usually is, shown under the label so the choice is obvious. */
    blurb: string;
    /** Style direction ids, best fit first. */
    styles: string[];
    assets: AssetRequest[];
    pages: string[];
    /** Portfolios and personal blogs rarely have a logo, so we do not ask for one. */
    wantsLogo: boolean;
}

export const OTHER_CATEGORY_ID = 'other';

export const PROJECT_CATEGORIES: ProjectCategory[] = [
    {
        id: 'portfolio',
        label: 'Personal Portfolio',
        icon: '🎒',
        blurb: 'Show your work and let people reach you',
        styles: ['minimal', 'bold', 'editorial', 'dark', 'warm', 'elegant'],
        assets: [
            { id: 'work', label: 'Photos of your work', hint: 'Screenshots, photographs, designs — whatever you want shown off.' },
            { id: 'headshot', label: 'A photo of you', hint: 'Optional, but people like seeing who they are hiring.' },
            { id: 'resume', label: 'Résumé or CV', hint: 'An image or a link is fine.' },
        ],
        pages: ['Home', 'About', 'Work', 'Projects', 'Résumé', 'Blog', 'Contact'],
        wantsLogo: false,
    },
    {
        id: 'business',
        label: 'Business / Services',
        icon: '💼',
        blurb: 'Explain what you do and bring in enquiries',
        styles: ['clean', 'minimal', 'dark', 'bold', 'warm', 'elegant'],
        assets: [
            { id: 'team', label: 'Team or staff photos', hint: 'Faces build trust faster than anything else on the page.' },
            { id: 'work', label: 'Photos of your work or premises', hint: 'Finished jobs, your shop, your office — anything real.' },
        ],
        pages: ['Home', 'About', 'Services', 'Pricing', 'Our Work', 'Team', 'FAQ', 'Contact'],
        wantsLogo: true,
    },
    {
        id: 'restaurant',
        label: 'Restaurant / Café',
        icon: '🍽️',
        blurb: 'Menu, atmosphere, and how to find you',
        styles: ['warm', 'elegant', 'bold', 'dark', 'minimal', 'playful'],
        assets: [
            { id: 'food', label: 'Food & drink photos', hint: 'The single most important thing on a restaurant site.' },
            { id: 'interior', label: 'Photos of the space', hint: 'The room, the bar, the terrace — whatever sets the mood.' },
            { id: 'menu', label: 'Your menu', hint: 'A photo, PDF, or document. We will set it properly.' },
        ],
        pages: ['Home', 'Menu', 'About', 'Gallery', 'Reservations', 'Location & Hours', 'Contact'],
        wantsLogo: true,
    },
    {
        id: 'store',
        label: 'Online Store',
        icon: '🛍️',
        blurb: 'Sell products directly to customers',
        styles: ['clean', 'minimal', 'bold', 'warm', 'playful', 'dark'],
        assets: [
            { id: 'products', label: 'Product photos', hint: 'Plain backgrounds work best. One per product is enough to start.' },
            { id: 'productList', label: 'Product list & prices', hint: 'A spreadsheet, document, or photo of your list.' },
        ],
        pages: ['Home', 'Shop', 'Product pages', 'About', 'Cart & Checkout', 'Shipping & Returns', 'FAQ', 'Contact'],
        wantsLogo: true,
    },
    {
        id: 'organization',
        label: 'Club / Organization',
        icon: '🎪',
        blurb: 'For a school club, nonprofit, or community group',
        styles: ['playful', 'bold', 'clean', 'warm', 'minimal', 'editorial'],
        assets: [
            { id: 'events', label: 'Event photos', hint: 'Meetings, socials, competitions — these make a group feel alive.' },
            { id: 'members', label: 'Photos of members or the team', hint: 'Group shots or individual photos of the people running things.' },
        ],
        pages: ['Home', 'About', 'Events', 'Members', 'Join Us', 'Gallery', 'Sponsors', 'Contact'],
        wantsLogo: true,
    },
    {
        id: 'event',
        label: 'Event',
        icon: '🎟️',
        blurb: 'A conference, show, wedding, or one-off occasion',
        styles: ['bold', 'dark', 'playful', 'elegant', 'warm', 'minimal'],
        assets: [
            { id: 'event', label: 'Photos from past events', hint: 'Shows people what they are signing up for.' },
            { id: 'lineup', label: 'Speaker or lineup photos', hint: 'Headshots or performer photos, plus their names.' },
        ],
        pages: ['Home', 'Schedule', 'Speakers', 'Tickets', 'Venue & Travel', 'FAQ', 'Contact'],
        wantsLogo: true,
    },
    {
        id: 'blog',
        label: 'Blog / Writing',
        icon: '✍️',
        blurb: 'Publish writing and build a readership',
        styles: ['editorial', 'minimal', 'elegant', 'dark', 'warm', 'bold'],
        assets: [
            { id: 'headshot', label: 'A photo of you', hint: 'For your about page and article bylines.' },
            { id: 'posts', label: 'Writing you already have', hint: 'Drafts or published pieces, so we can set the type around real words.' },
        ],
        pages: ['Home', 'All Posts', 'Categories', 'About', 'Newsletter', 'Archive', 'Contact'],
        wantsLogo: false,
    },
    {
        id: 'booking',
        label: 'Booking / Appointments',
        icon: '📅',
        blurb: 'Let people book time with you',
        styles: ['clean', 'warm', 'minimal', 'elegant', 'playful', 'dark'],
        assets: [
            { id: 'space', label: 'Photos of your space or your work', hint: 'The studio, salon, gym, or results from past clients.' },
            { id: 'headshot', label: 'A photo of you or your team', hint: 'People book people, not businesses.' },
        ],
        pages: ['Home', 'Services', 'Book Now', 'Pricing', 'About', 'Reviews', 'FAQ', 'Contact'],
        wantsLogo: true,
    },
    {
        id: 'landing',
        label: 'Product / App Landing Page',
        icon: '🚀',
        blurb: 'One focused page to launch a product',
        styles: ['dark', 'bold', 'clean', 'minimal', 'playful', 'warm'],
        assets: [
            { id: 'screens', label: 'Screenshots of your product', hint: 'Even rough ones. The product should be visible above the fold.' },
            { id: 'brand', label: 'Any brand assets you have', hint: 'Colours, fonts, icons — anything already decided.' },
        ],
        pages: ['Home', 'Features', 'How it Works', 'Pricing', 'FAQ', 'Sign Up', 'Contact'],
        wantsLogo: true,
    },
    {
        id: OTHER_CATEGORY_ID,
        label: 'Something else',
        icon: '✨',
        blurb: 'Tell us in your own words',
        styles: ['minimal', 'clean', 'bold', 'warm', 'dark', 'editorial'],
        assets: [
            { id: 'photos', label: 'Any photos you want to use', hint: 'Anything you already have that belongs on the site.' },
        ],
        pages: ['Home', 'About', 'What We Do', 'Gallery', 'FAQ', 'Contact'],
        wantsLogo: true,
    },
];

// Asset ids are shared across categories, so a file group stays readable on the brief even
// if the client changed the category after uploading.
const ASSET_LABELS: Record<string, string> = Object.fromEntries(
    PROJECT_CATEGORIES.flatMap(entry => entry.assets.map(request => [request.id, request.label])),
);

export function assetLabel(id: string): string {
    return ASSET_LABELS[id] ?? id;
}

export function findCategory(id: string | undefined): ProjectCategory {
    return PROJECT_CATEGORIES.find(entry => entry.id === id) ?? PROJECT_CATEGORIES[PROJECT_CATEGORIES.length - 1];
}

/** The one-line description shown under a project's name: its category, or an older brief's free text. */
export function projectSummary(project: { categoryId?: string; customCategory?: string; projectDescription?: string }): string {
    if (project.categoryId === OTHER_CATEGORY_ID) return project.customCategory?.trim() || 'Something else';
    if (project.categoryId) return findCategory(project.categoryId).label;
    return project.projectDescription?.trim() || '';
}

export function stylesForCategory(id: string | undefined): StyleDirection[] {
    return findCategory(id).styles.map(styleId => STYLE_DIRECTIONS[styleId]).filter(Boolean);
}

/** How many style directions a client may pick. One is plenty; three is the most that stays useful. */
export const MAX_STYLE_PICKS = 3;
