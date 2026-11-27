import type { Education, EducationLevel, Visibility } from '@/types/api';

export const EDUCATION_LEVEL_OPTIONS: { value: EducationLevel; label: string }[] = [
  { value: 'school', label: 'School' },
  { value: 'pre_university', label: 'Pre-University / Higher Secondary' },
  { value: 'diploma', label: 'Diploma' },
  { value: 'undergraduate', label: 'Undergraduate' },
  { value: 'postgraduate', label: 'Postgraduate' },
  { value: 'doctorate', label: 'Doctorate' },
  { value: 'other', label: 'Other' },
];

export const MONTH_OPTIONS: { value: number; label: string; short: string }[] = [
  { value: 1, label: 'January', short: 'Jan' },
  { value: 2, label: 'February', short: 'Feb' },
  { value: 3, label: 'March', short: 'Mar' },
  { value: 4, label: 'April', short: 'Apr' },
  { value: 5, label: 'May', short: 'May' },
  { value: 6, label: 'June', short: 'Jun' },
  { value: 7, label: 'July', short: 'Jul' },
  { value: 8, label: 'August', short: 'Aug' },
  { value: 9, label: 'September', short: 'Sep' },
  { value: 10, label: 'October', short: 'Oct' },
  { value: 11, label: 'November', short: 'Nov' },
  { value: 12, label: 'December', short: 'Dec' },
];

export function getEducationLevelLabel(level?: EducationLevel | null): string {
  const match = EDUCATION_LEVEL_OPTIONS.find((item) => item.value === level);
  return match ? match.label : 'Qualification';
}

export function formatMonthYear(month?: number | null, year?: number | null): string {
  if (!year) return '';
  if (!month) return String(year);
  const m = MONTH_OPTIONS.find((item) => item.value === month);
  return m ? `${m.short} ${year}` : String(year);
}

export function formatEducationPeriod(item: {
  start_month?: number | null;
  start_year?: number | null;
  end_month?: number | null;
  end_year?: number | null;
  is_current?: boolean;
}): string {
  const start = formatMonthYear(item.start_month, item.start_year);
  if (item.is_current) {
    return start ? `${start} – Present` : 'Present';
  }
  const end = formatMonthYear(item.end_month, item.end_year);
  if (start && end) return `${start} – ${end}`;
  if (start) return start;
  if (end) return end;
  return 'Dates not specified';
}

export function sortEducationTimeline<
  T extends {
    is_current?: boolean;
    start_year?: number | null;
    start_month?: number | null;
    end_year?: number | null;
    end_month?: number | null;
  },
>(records: T[]): T[] {
  return [...records].sort((a, b) => {
    const aCurr = Boolean(a.is_current);
    const bCurr = Boolean(b.is_current);
    if (aCurr !== bCurr) return aCurr ? -1 : 1;

    const aStartYear = a.start_year ?? 0;
    const bStartYear = b.start_year ?? 0;

    if (!aCurr && !bCurr) {
      const aEndYear = a.end_year ?? aStartYear;
      const bEndYear = b.end_year ?? bStartYear;
      if (aEndYear !== bEndYear) return bEndYear - aEndYear;

      const aEndMonth = a.end_year != null ? (a.end_month ?? 0) : (a.start_month ?? 0);
      const bEndMonth = b.end_year != null ? (b.end_month ?? 0) : (b.start_month ?? 0);
      if (aEndMonth !== bEndMonth) return bEndMonth - aEndMonth;
    }

    if (aStartYear !== bStartYear) return bStartYear - aStartYear;
    return (b.start_month ?? 0) - (a.start_month ?? 0);
  });
}

export interface EducationFormValues {
  institution: string;
  university_or_board: string;
  education_level: EducationLevel;
  degree: string;
  branch: string;
  specialization: string;
  country: string;
  state: string;
  start_month: string;
  start_year: string;
  end_month: string;
  end_year: string;
  is_current: boolean;
  description: string;
  visibility: Visibility;
}

export type EducationFormErrors = Partial<Record<keyof EducationFormValues | 'date_range', string>>;

export function toInitialFormValues(record?: Education | null): EducationFormValues {
  if (!record) {
    return {
      institution: '',
      university_or_board: '',
      education_level: 'undergraduate',
      degree: '',
      branch: '',
      specialization: '',
      country: '',
      state: '',
      start_month: '',
      start_year: '',
      end_month: '',
      end_year: '',
      is_current: false,
      description: '',
      visibility: 'private',
    };
  }

  return {
    institution: record.institution,
    university_or_board: record.university_or_board ?? '',
    education_level: record.education_level ?? 'undergraduate',
    degree: record.degree,
    branch: record.branch ?? '',
    specialization: record.specialization ?? '',
    country: record.country ?? '',
    state: record.state ?? '',
    start_month: record.start_month ? String(record.start_month) : '',
    start_year: record.start_year ? String(record.start_year) : '',
    end_month: !record.is_current && record.end_month ? String(record.end_month) : '',
    end_year: !record.is_current && record.end_year ? String(record.end_year) : '',
    is_current: record.is_current,
    description: record.description ?? '',
    visibility: record.visibility,
  };
}

export function validateEducationForm(values: EducationFormValues): EducationFormErrors {
  const errors: EducationFormErrors = {};

  if (!values.institution.trim() || values.institution.trim().length < 2) {
    errors.institution = 'Institution name is required (at least 2 characters).';
  }
  if (!values.education_level) {
    errors.education_level = 'Select an education level.';
  }
  if (!values.degree.trim() || values.degree.trim().length < 2) {
    errors.degree = 'Degree or qualification is required.';
  }
  if (!values.branch.trim() || values.branch.trim().length < 2) {
    errors.branch = 'Field of study is required.';
  }
  if (!values.country.trim()) {
    errors.country = 'Country is required.';
  }
  if (!values.state.trim()) {
    errors.state = 'State or region is required.';
  }

  const startMonth = Number(values.start_month);
  const startYear = Number(values.start_year);

  if (!values.start_month || !Number.isInteger(startMonth) || startMonth < 1 || startMonth > 12) {
    errors.start_month = 'Select a start month.';
  }
  if (!values.start_year || !Number.isInteger(startYear) || startYear < 1950 || startYear > 2040) {
    errors.start_year = 'Enter a valid start year (1950–2040).';
  }

  if (!values.is_current) {
    const endMonth = Number(values.end_month);
    const endYear = Number(values.end_year);

    if (!values.end_month || !Number.isInteger(endMonth) || endMonth < 1 || endMonth > 12) {
      errors.end_month = 'Select an end month.';
    }
    if (!values.end_year || !Number.isInteger(endYear) || endYear < 1950 || endYear > 2045) {
      errors.end_year = 'Enter a valid end year (1950–2045).';
    }

    if (!errors.start_month && !errors.start_year && !errors.end_month && !errors.end_year) {
      if (endYear < startYear || (endYear === startYear && endMonth < startMonth)) {
        errors.date_range = 'End date cannot precede start date.';
      }
    }
  }

  if (values.description.trim().length > 1500) {
    errors.description = 'Description must be 1500 characters or fewer.';
  }

  return errors;
}
