export interface ClientProject {
  uid: string;
  projectName: string;
  projectDescription?: string;
  approval?: string;
  setupComplete?: boolean;
  status?: number;
  progress?: string | number;
  dueDate?: string;
  dateCreated?: string;
  recentActivity?: string;
  logoAttachment?: string | null;
  logoUrl?: string | null;
  paymentPlan?: string | number;
  weeksPaid?: number;
}

export type ProjectState = 'setup' | 'pending' | 'approved' | 'declined';

export function projectState(project: Pick<ClientProject, 'approval' | 'setupComplete'>): ProjectState {
  const approval = project.approval?.trim().toLowerCase();
  if (approval === 'declined') return 'declined';
  // Older approved projects predate the setupComplete field.
  if (approval === 'approved') return 'approved';
  if (project.setupComplete === false) return 'setup';
  return 'pending';
}

export function projectProgress(value?: string | number): number {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.min(100, number)) : 0;
}

export function projectHref(project: ClientProject): string {
  const base = `/dashboard/projects/${encodeURIComponent(project.uid)}`;
  return projectState(project) === 'setup' ? `${base}/setup` : base;
}

export function projectNextStep(project: ClientProject): string {
  switch (projectState(project)) {
    case 'setup': return 'Finish your brief so the team can review your project.';
    case 'declined': return 'Contact the team to discuss the scope and your options.';
    case 'pending': return 'Your brief is with the team. We’ll update the status after review.';
    case 'approved': return 'Follow your progress or message the team with questions.';
  }
}

export const projectStateLabels: Record<ProjectState, string> = {
  setup: 'Setup needed', pending: 'Pending review', approved: 'Approved', declined: 'Declined',
};
