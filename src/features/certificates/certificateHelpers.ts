import type {
  Achievement,
  AchievementCategory,
  Certificate,
  CertificateCategory,
} from '@/types/api';

export const CERTIFICATE_CATEGORY_OPTIONS: {
  value: CertificateCategory;
  label: string;
}[] = [
  { value: 'course', label: 'Course Completion' },
  { value: 'professional', label: 'Professional Certificate' },
  { value: 'training', label: 'Training & Bootcamp' },
  { value: 'workshop', label: 'Workshop & Seminar' },
  { value: 'participation', label: 'Participation' },
  { value: 'academic', label: 'Academic Certificate' },
  { value: 'other', label: 'Other' },
];

export const ACHIEVEMENT_CATEGORY_OPTIONS: {
  value: AchievementCategory;
  label: string;
}[] = [
  { value: 'award', label: 'Award & Honour' },
  { value: 'academic_distinction', label: 'Academic Distinction' },
  { value: 'scholarship', label: 'Scholarship & Fellowship' },
  { value: 'hackathon', label: 'Hackathon' },
  { value: 'competition', label: 'Competition Result' },
  { value: 'publication', label: 'Research & Publication' },
  { value: 'leadership', label: 'Leadership' },
  { value: 'extracurricular', label: 'Extracurricular' },
  { value: 'other', label: 'Other' },
];

export function getCertificateCategoryLabel(category?: string | null): string {
  if (!category) return 'Course Completion';
  return (
    CERTIFICATE_CATEGORY_OPTIONS.find((opt) => opt.value === category)?.label ??
    category.replace(/_/g, ' ')
  );
}

export function getAchievementCategoryLabel(category?: string | null): string {
  if (!category) return 'Award & Honour';
  return (
    ACHIEVEMENT_CATEGORY_OPTIONS.find((opt) => opt.value === category)?.label ??
    category.replace(/_/g, ' ')
  );
}

export function getVerificationStatusMeta(status: Certificate['verification_status']): {
  label: string;
  classes: string;
} {
  switch (status) {
    case 'issuer_verified':
      return {
        label: 'Issuer Verified',
        classes: 'border-emerald-500/35 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
      };
    case 'link_provided':
      return {
        label: 'Verification Link',
        classes: 'border-[var(--border-accent)] bg-[var(--nav-active-bg)] text-[var(--accent)]',
      };
    default:
      return {
        label: 'Self-Reported',
        classes: 'border-[var(--border-subtle)] bg-[var(--surface-muted)] text-[var(--text-secondary)]',
      };
  }
}

export function formatCredentialDate(iso?: string | null): string | null {
  if (!iso) return null;
  const parsed = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return iso;
  return parsed.toLocaleDateString(undefined, {
    month: 'short',
    year: 'numeric',
  });
}

export type UnifiedCredentialItem =
  | { kind: 'certificate'; data: Certificate }
  | { kind: 'achievement'; data: Achievement };

export function getUnifiedDateValue(item: UnifiedCredentialItem): string {
  return item.kind === 'certificate'
    ? item.data.issue_date ?? item.data.created_at
    : item.data.date ?? item.data.created_at;
}
