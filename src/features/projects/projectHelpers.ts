import { API_CONFIG } from '@/services/config';
import type { Project, Visibility } from '@/types/api';

export const PROJECT_CATEGORY_OPTIONS: string[] = [
  'Web & Mobile Platform',
  'Software',
  'AI / ML',
  'Systems & Cloud',
  'Data & Analytics',
  'Hardware & IoT',
  'Design & Tooling',
  'Research',
  'General',
];

export interface ProjectFormValues {
  title: string;
  category: string;
  summary: string;
  description: string;
  technologies: string[];
  github_url: string;
  live_url: string;
  start_date: string;
  end_date: string;
  is_ongoing: boolean;
  featured: boolean;
  visibility: Visibility;
}

export type ProjectFormErrors = Partial<Record<keyof ProjectFormValues | 'date_range', string>>;

export function toInitialProjectFormValues(project?: Project | null): ProjectFormValues {
  if (!project) {
    return {
      title: '',
      category: 'Software',
      summary: '',
      description: '',
      technologies: [],
      github_url: '',
      live_url: '',
      start_date: '',
      end_date: '',
      is_ongoing: false,
      featured: false,
      visibility: 'private',
    };
  }

  return {
    title: project.title,
    category: project.category || 'General',
    summary: project.summary,
    description: project.description ?? '',
    technologies: [...(project.technologies ?? [])],
    github_url: project.github_url ?? '',
    live_url: project.live_url ?? '',
    start_date: project.start_date ?? '',
    end_date: !project.is_ongoing ? (project.end_date ?? '') : '',
    is_ongoing: project.is_ongoing,
    featured: project.featured,
    visibility: project.visibility,
  };
}

function isValidHttpUrl(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return true;
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

export function validateProjectForm(values: ProjectFormValues): ProjectFormErrors {
  const errors: ProjectFormErrors = {};

  if (!values.title.trim() || values.title.trim().length < 2) {
    errors.title = 'Project title is required (at least 2 characters).';
  } else if (values.title.trim().length > 200) {
    errors.title = 'Project title must not exceed 200 characters.';
  }

  if (!values.summary.trim() || values.summary.trim().length < 5) {
    errors.summary = 'A short project summary is required (at least 5 characters).';
  } else if (values.summary.trim().length > 500) {
    errors.summary = 'Project summary must not exceed 500 characters.';
  }

  if (values.description.trim().length > 10000) {
    errors.description = 'Description must not exceed 10,000 characters.';
  }

  if (!isValidHttpUrl(values.github_url)) {
    errors.github_url = 'Enter a valid http:// or https:// GitHub URL.';
  }

  if (!isValidHttpUrl(values.live_url)) {
    errors.live_url = 'Enter a valid http:// or https:// live URL.';
  }

  if (!values.is_ongoing && values.start_date && values.end_date && values.end_date < values.start_date) {
    errors.date_range = 'End date cannot precede start date.';
  }

  return errors;
}

export function formatProjectDate(dateStr?: string | null): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length < 2) return dateStr;
  const year = Number(parts[0]);
  const month = Number(parts[1]);
  if (!year || !month || month < 1 || month > 12) return dateStr;
  const shortMonths = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${shortMonths[month - 1]} ${year}`;
}

export function formatProjectPeriod(project: {
  start_date?: string | null;
  end_date?: string | null;
  is_ongoing?: boolean;
}): string {
  const start = formatProjectDate(project.start_date);
  if (project.is_ongoing) {
    return start ? `${start} – Ongoing` : 'Ongoing';
  }
  const end = formatProjectDate(project.end_date);
  if (start && end) return `${start} – ${end}`;
  if (start) return start;
  if (end) return end;
  return 'Timeline not specified';
}

export function parseTechInput(raw: string, existing: string[]): string[] {
  const next = [...existing];
  const seen = new Set(existing.map((t) => t.toLowerCase()));
  for (const part of raw.split(',')) {
    const cleaned = part.trim().slice(0, 60);
    if (!cleaned) continue;
    const key = cleaned.toLowerCase();
    if (!seen.has(key) && next.length < 20) {
      seen.add(key);
      next.push(cleaned);
    }
  }
  return next;
}

export function resolveProjectImageUrl(url: string): string {
  if (!url || url.startsWith('http://') || url.startsWith('https://') || url.startsWith('blob:') || url.startsWith('data:')) {
    return url;
  }
  if (API_CONFIG.apiBaseUrl.startsWith('http://') || API_CONFIG.apiBaseUrl.startsWith('https://')) {
    try {
      const origin = new URL(API_CONFIG.apiBaseUrl).origin;
      return `${origin}${url.startsWith('/') ? url : `/${url}`}`;
    } catch {
      return url;
    }
  }
  return url;
}
