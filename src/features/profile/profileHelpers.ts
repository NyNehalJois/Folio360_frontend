import { API_CONFIG } from '@/services/config';
import type { ActivityCategory } from '@/types/api';

export interface ActivityOption {
  key: ActivityCategory;
  label: string;
  placeholder: string;
}

export const ACTIVITY_OPTIONS: ActivityOption[] = [
  {
    key: 'studying',
    label: 'Studying',
    placeholder: 'e.g., Pursuing B.Tech in Computer Science',
  },
  {
    key: 'working',
    label: 'Working',
    placeholder: 'e.g., Software Engineer at Acme Corp',
  },
  {
    key: 'interning',
    label: 'Interning',
    placeholder: 'e.g., Backend Engineering Intern',
  },
  {
    key: 'freelancing',
    label: 'Freelancing',
    placeholder: 'e.g., Working as a web developer',
  },
  {
    key: 'job_seeking',
    label: 'Job Seeking',
    placeholder: 'e.g., Looking for full-stack roles',
  },
  {
    key: 'researching',
    label: 'Researching',
    placeholder: 'e.g., Exploring distributed consensus systems',
  },
  {
    key: 'building_project',
    label: 'Building a Project / Startup',
    placeholder: 'e.g., Developing a personal portfolio platform',
  },
  {
    key: 'learning_skills',
    label: 'Learning New Skills',
    placeholder: 'e.g., Learning Rust and cloud architecture',
  },
  {
    key: 'other',
    label: 'Other',
    placeholder: 'Optional short description',
  },
];

export const SUGGESTED_INTERESTS: string[] = [
  'Software Engineering',
  'AI & Machine Learning',
  'UI/UX Design',
  'Distributed Systems',
  'Open Source',
  'Data Science',
  'Cybersecurity',
  'Cloud & DevOps',
  'Mobile Development',
  'Product Management',
];

export function resolveAvatarUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (
    url.startsWith('http://') ||
    url.startsWith('https://') ||
    url.startsWith('blob:') ||
    url.startsWith('data:')
  ) {
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
