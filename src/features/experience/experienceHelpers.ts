import type { Experience, ExperienceType } from '@/types/api';

export const EXPERIENCE_TYPE_OPTIONS: { value: ExperienceType; label: string }[] = [
  { value: 'internship', label: 'Internship' },
  { value: 'employment', label: 'Employment' },
  { value: 'freelance', label: 'Freelance' },
  { value: 'research', label: 'Research' },
  { value: 'volunteering', label: 'Volunteering' },
  { value: 'mentorship', label: 'Mentorship' },
  { value: 'leadership', label: 'Leadership' },
  { value: 'other', label: 'Other' },
];

const EXPERIENCE_TYPE_LABEL_MAP: Record<ExperienceType, string> = {
  internship: 'Internship',
  employment: 'Employment',
  freelance: 'Freelance',
  research: 'Research',
  volunteering: 'Volunteering',
  mentorship: 'Mentorship',
  leadership: 'Leadership',
  other: 'Other',
};

export function getExperienceTypeLabel(type: ExperienceType | string | undefined): string {
  if (!type) return 'Experience';
  return EXPERIENCE_TYPE_LABEL_MAP[type as ExperienceType] ?? type.replace(/_/g, ' ');
}

export function formatExperienceDate(value: string | null | undefined): string {
  if (!value) return '';
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString('en-US', {
    month: 'short',
    year: 'numeric',
  });
}

export function formatExperienceDateRange(
  startDate: string,
  endDate: string | null | undefined,
  isCurrent: boolean,
): string {
  const startLabel = formatExperienceDate(startDate) || startDate;
  if (isCurrent) return `${startLabel} – Present`;
  if (!endDate) return startLabel;
  const endLabel = formatExperienceDate(endDate) || endDate;
  return `${startLabel} – ${endLabel}`;
}

export function formatExperienceDuration(
  startDate: string,
  endDate: string | null | undefined,
  isCurrent: boolean,
): string {
  const start = new Date(`${startDate}T00:00:00`);
  const end = isCurrent ? new Date() : endDate ? new Date(`${endDate}T00:00:00`) : null;
  if (Number.isNaN(start.getTime()) || !end || Number.isNaN(end.getTime())) {
    return '';
  }
  const totalMonths = Math.max(
    1,
    (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()) + 1,
  );
  const years = Math.floor(totalMonths / 12);
  const months = totalMonths % 12;
  const parts: string[] = [];
  if (years > 0) parts.push(`${years} yr${years > 1 ? 's' : ''}`);
  if (months > 0) parts.push(`${months} mo${months > 1 ? 's' : ''}`);
  return parts.join(' ');
}

export function formatExperienceLocation(exp: Pick<Experience, 'location' | 'is_remote'>): string {
  if (exp.location && exp.is_remote) return `${exp.location} · Remote`;
  if (exp.is_remote) return 'Remote';
  return exp.location ?? '';
}
