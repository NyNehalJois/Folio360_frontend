import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  ArrowUpRight,
  Check,
  CheckCircle2,
  ImagePlus,
  Loader2,
  Plus,
  Trash2,
  X,
  XCircle,
} from 'lucide-react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/app/AuthContext';
import { isProfileComplete } from '@/app/profileCompletion';
import { LoadingState } from '@/design/components/EditorialStates';
import { FolioLogo } from '@/design/components/FolioLogo';
import { PillButton } from '@/design/components/PillButton';
import { ThemeToggle } from '@/design/components/ThemeToggle';
import { StrandCanvas } from '@/design/strands/StrandCanvas';
import { validateFullName, validateUsername } from '@/features/auth/validation';
import { profileService } from '@/services/api';
import { ApiClientError } from '@/services/http';
import type { ActivityCategory, CurrentActivityItem } from '@/types/api';
import { ProfilePictureEditorModal } from './ProfilePictureEditorModal';

type AvailabilityStatus = 'idle' | 'checking' | 'available' | 'unavailable';

interface ActivityOption {
  key: ActivityCategory;
  label: string;
  placeholder: string;
}

const ACTIVITY_OPTIONS: ActivityOption[] = [
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

const SUGGESTED_INTERESTS = [
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

const INPUT_CLASS =
  'w-full rounded-lg border bg-[var(--bg-main)] px-3.5 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]/60 transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/40';

const LABEL_CLASS =
  'block font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--text-secondary)] mb-1.5';

function validateDateOfBirth(value: string): string | undefined {
  if (!value.trim()) {
    return 'Date of birth is required.';
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return 'Enter a valid date (YYYY-MM-DD).';
  }
  const parsed = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) {
    return 'Enter a valid calendar date.';
  }
  const minDate = new Date('1900-01-01T00:00:00Z');
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  if (parsed < minDate) {
    return 'Date of birth must be after 1900.';
  }
  if (parsed > today) {
    return 'Date of birth cannot be in the future.';
  }
  return undefined;
}

export const ProfileCreationPage: React.FC = () => {
  const { user, logout, refreshUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const destination = (location.state as { from?: string } | null)?.from || '/workspace';

  const [initializing, setInitializing] = useState(true);
  const [fullName, setFullName] = useState(user?.full_name ?? '');
  const [username, setUsername] = useState(user?.slug ?? '');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(user?.avatar_url ?? null);
  const [interests, setInterests] = useState<string[]>([]);
  const [customInterest, setCustomInterest] = useState('');
  const [selectedActivities, setSelectedActivities] = useState<
    Partial<Record<ActivityCategory, CurrentActivityItem>>
  >({});

  const [availability, setAvailability] = useState<AvailabilityStatus>(
    user?.slug ? 'available' : 'idle',
  );
  const [availabilityReason, setAvailabilityReason] = useState<string | undefined>();

  const [fieldErrors, setFieldErrors] = useState<{
    fullName?: string;
    username?: string;
    dateOfBirth?: string;
    otherLabel?: string;
  }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [removingAvatar, setRemovingAvatar] = useState(false);

  // Pre-fill from /profile/me so users returning midway can resume seamlessly
  useEffect(() => {
    let active = true;
    async function loadExisting() {
      try {
        const profile = await profileService.getMe();
        if (!active) return;
        if (profile.full_name) setFullName(profile.full_name);
        if (profile.slug) {
          setUsername(profile.slug);
          setAvailability('available');
        }
        if (profile.date_of_birth) setDateOfBirth(profile.date_of_birth);
        if (profile.bio) setBio(profile.bio);
        if (profile.avatar_url) setAvatarUrl(profile.avatar_url);
        if (Array.isArray(profile.interests) && profile.interests.length > 0) {
          setInterests(profile.interests);
        }
        if (Array.isArray(profile.current_activities) && profile.current_activities.length > 0) {
          const map: Partial<Record<ActivityCategory, CurrentActivityItem>> = {};
          for (const item of profile.current_activities) {
            map[item.key] = item;
          }
          setSelectedActivities(map);
        }
      } catch {
        // Non-fatal: user may not have a profile row yet on fresh registration
      } finally {
        if (active) setInitializing(false);
      }
    }
    void loadExisting();
    return () => {
      active = false;
    };
  }, []);

  // Debounced live username availability check
  useEffect(() => {
    if (initializing) return;
    const err = validateUsername(username);
    if (!username || err) {
      setAvailability('idle');
      setAvailabilityReason(undefined);
      return;
    }

    if (user?.slug && username === user.slug) {
      setAvailability('available');
      setAvailabilityReason(undefined);
      return;
    }

    let active = true;
    setAvailability('checking');
    setAvailabilityReason(undefined);

    const timer = window.setTimeout(async () => {
      try {
        const res = await profileService.checkSlugAvailability(username);
        if (!active) return;
        if (res.available) {
          setAvailability('available');
          setAvailabilityReason(undefined);
        } else {
          setAvailability('unavailable');
          setAvailabilityReason(res.reason || 'This username is already taken.');
        }
      } catch {
        if (!active) return;
        setAvailability('idle');
      }
    }, 260);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [username, user?.slug, initializing]);

  if (isProfileComplete(user)) {
    return <Navigate to={destination} replace />;
  }

  const toggleInterest = (tag: string) => {
    setInterests((prev) =>
      prev.includes(tag) ? prev.filter((item) => item !== tag) : [...prev, tag],
    );
  };

  const handleAddCustomInterest = () => {
    const cleaned = customInterest.trim();
    if (!cleaned) return;
    if (!interests.some((item) => item.toLowerCase() === cleaned.toLowerCase())) {
      setInterests((prev) => [...prev, cleaned]);
    }
    setCustomInterest('');
  };

  const toggleActivity = (key: ActivityCategory) => {
    setSelectedActivities((prev) => {
      const next = { ...prev };
      if (next[key]) {
        delete next[key];
      } else {
        next[key] = { key, label: key === 'other' ? '' : undefined, description: '' };
      }
      return next;
    });
    if (key === 'other') {
      setFieldErrors((prev) => ({ ...prev, otherLabel: undefined }));
    }
  };

  const updateActivityField = (
    key: ActivityCategory,
    field: 'label' | 'description',
    value: string,
  ) => {
    setSelectedActivities((prev) => {
      const current = prev[key];
      if (!current) return prev;
      return {
        ...prev,
        [key]: { ...current, [field]: value },
      };
    });
    if (key === 'other' && field === 'label') {
      setFieldErrors((prev) => ({ ...prev, otherLabel: undefined }));
    }
  };

  const handleRemoveAvatar = async () => {
    if (removingAvatar) return;
    setRemovingAvatar(true);
    setFormError(null);
    try {
      await profileService.removeAvatar();
      setAvatarUrl(null);
      await refreshUser();
    } catch (err) {
      setFormError(
        err instanceof ApiClientError ? err.message : 'Unable to remove profile picture.',
      );
    } finally {
      setRemovingAvatar(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    setFormError(null);
    const nameErr = validateFullName(fullName);
    const userErr = validateUsername(username);
    const dobErr = validateDateOfBirth(dateOfBirth);
    const otherItem = selectedActivities.other;
    const otherErr =
      otherItem && !(otherItem.label ?? '').trim()
        ? 'Please specify your custom activity.'
        : undefined;

    setFieldErrors({
      fullName: nameErr,
      username: userErr,
      dateOfBirth: dobErr,
      otherLabel: otherErr,
    });

    if (nameErr || userErr || dobErr || otherErr) return;

    if (availability === 'unavailable') {
      setFieldErrors((prev) => ({
        ...prev,
        username: availabilityReason || 'Please choose a different username.',
      }));
      return;
    }

    setSubmitting(true);
    try {
      if (!user?.slug || username !== user.slug) {
        const check = await profileService.checkSlugAvailability(username);
        if (!check.available) {
          setAvailability('unavailable');
          setFieldErrors((prev) => ({
            ...prev,
            username: check.reason || 'This username is unavailable.',
          }));
          setSubmitting(false);
          return;
        }
      }

      const activitiesPayload: CurrentActivityItem[] = Object.values(selectedActivities)
        .filter((item): item is CurrentActivityItem => Boolean(item))
        .map((item) => ({
          key: item.key,
          label: item.key === 'other' ? item.label?.trim() || null : undefined,
          description: item.description?.trim() || null,
        }));

      await profileService.completeInitialProfile({
        full_name: fullName.trim(),
        slug: username.trim(),
        date_of_birth: dateOfBirth,
        bio: bio.trim() || null,
        interests,
        current_activities: activitiesPayload,
      });

      await refreshUser();
      navigate(destination, { replace: true });
    } catch (err) {
      if (err instanceof ApiClientError) {
        setFormError(err.message);
      } else {
        setFormError('Unable to complete profile setup right now. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const initials = (fullName || user?.full_name || 'F')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[var(--bg-main)] text-[var(--text-primary)]">
      <div className="pointer-events-none fixed inset-0 z-0 opacity-45">
        <StrandCanvas variant="subtle" className="h-full w-full" />
      </div>

      {/* Top Bar */}
      <header className="relative z-10 border-b border-[var(--border-subtle)] bg-[var(--bg-main)]/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <FolioLogo />
            <span className="hidden rounded-full border border-[var(--border-subtle)] px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--text-secondary)] sm:inline-block">
              First-Time Setup
            </span>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <button
              type="button"
              onClick={() => void logout()}
              className="font-mono text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-12">
        {initializing ? (
          <LoadingState label="Preparing your profile setup…" />
        ) : (
          <form onSubmit={handleSubmit} noValidate className="space-y-8">
            {/* Editorial Intro */}
            <header className="border-b border-[var(--border-subtle)] pb-6">
              <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--accent)]">
                STEP 01 — CREATE YOUR PROFILE
              </p>
              <h1 className="mt-2 font-serif text-3xl text-[var(--text-primary)] sm:text-4xl">
                Set up your Folio360 identity.
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--text-secondary)]">
                Complete the essentials below to unlock your workspace. Optional details can be
                skipped now and updated anytime in Profile settings.
              </p>
            </header>

            {formError && (
              <div
                role="alert"
                className="flex items-start gap-2.5 rounded-lg border border-[var(--danger-border)] bg-[var(--danger-bg)] px-4 py-3 text-sm text-[var(--danger-text)]"
              >
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            {/* Required Identity Section */}
            <section className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-main)]/90 p-5 sm:p-6">
              <div className="mb-5 flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
                <h2 className="font-serif text-xl text-[var(--text-primary)]">
                  Required Details
                </h2>
                <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--text-secondary)]">
                  Required to continue
                </span>
              </div>

              <div className="space-y-5">
                {/* Full Name */}
                <div>
                  <label htmlFor="create-full-name" className={LABEL_CLASS}>
                    Full Name <span className="text-[var(--danger-text)]">*</span>
                  </label>
                  <input
                    id="create-full-name"
                    type="text"
                    value={fullName}
                    onChange={(e) => {
                      const val = e.target.value;
                      setFullName(val);
                      setFieldErrors((prev) => ({
                        ...prev,
                        fullName: val ? validateFullName(val) : undefined,
                      }));
                    }}
                    placeholder="Your full name"
                    aria-invalid={Boolean(fieldErrors.fullName)}
                    className={`${INPUT_CLASS} ${
                      fieldErrors.fullName
                        ? 'border-[var(--danger-border)]'
                        : 'border-[var(--border-medium)] focus:border-[var(--text-primary)]'
                    }`}
                  />
                  {fieldErrors.fullName && (
                    <p className="mt-1 text-xs text-[var(--danger-text)]">{fieldErrors.fullName}</p>
                  )}
                </div>

                {/* Username */}
                <div>
                  <label htmlFor="create-username" className={LABEL_CLASS}>
                    Username <span className="text-[var(--danger-text)]">*</span>
                  </label>
                  <div
                    className={`flex items-center rounded-lg border bg-[var(--bg-main)] transition-colors ${
                      fieldErrors.username || availability === 'unavailable'
                        ? 'border-[var(--danger-border)]'
                        : 'border-[var(--border-medium)] focus-within:border-[var(--text-primary)]'
                    }`}
                  >
                    <span className="select-none pl-3.5 pr-1 font-mono text-sm text-[var(--text-secondary)]">
                      /@
                    </span>
                    <input
                      id="create-username"
                      type="text"
                      autoComplete="username"
                      autoCapitalize="none"
                      autoCorrect="off"
                      spellCheck={false}
                      placeholder="your_username"
                      value={username}
                      onChange={(e) => {
                        const val = e.target.value;
                        setUsername(val);
                        setFieldErrors((prev) => ({
                          ...prev,
                          username: val ? validateUsername(val) : undefined,
                        }));
                      }}
                      aria-invalid={Boolean(fieldErrors.username)}
                      className="w-full bg-transparent py-2.5 pr-3.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]/60 focus:outline-none"
                    />
                  </div>
                  <div className="mt-1.5 flex min-h-[18px] items-center gap-1.5 text-xs">
                    {fieldErrors.username ? (
                      <span className="text-[var(--danger-text)]">{fieldErrors.username}</span>
                    ) : availability === 'checking' ? (
                      <span className="inline-flex items-center gap-1.5 text-[var(--text-secondary)]">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        Checking availability…
                      </span>
                    ) : availability === 'available' ? (
                      <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Available as <code className="font-mono">/@{username}</code>
                      </span>
                    ) : availability === 'unavailable' ? (
                      <span className="inline-flex items-center gap-1.5 text-[var(--danger-text)]">
                        <XCircle className="h-3.5 w-3.5" />
                        {availabilityReason}
                      </span>
                    ) : (
                      <span className="text-[var(--text-secondary)]">
                        3–30 characters: lowercase letters, numbers, and underscores only.
                      </span>
                    )}
                  </div>
                </div>

                {/* Date of Birth */}
                <div>
                  <label htmlFor="create-dob" className={LABEL_CLASS}>
                    Date of Birth <span className="text-[var(--danger-text)]">*</span>
                  </label>
                  <input
                    id="create-dob"
                    type="date"
                    value={dateOfBirth}
                    max={new Date().toISOString().split('T')[0]}
                    min="1900-01-01"
                    onChange={(e) => {
                      const val = e.target.value;
                      setDateOfBirth(val);
                      setFieldErrors((prev) => ({
                        ...prev,
                        dateOfBirth: validateDateOfBirth(val),
                      }));
                    }}
                    aria-invalid={Boolean(fieldErrors.dateOfBirth)}
                    className={`${INPUT_CLASS} max-w-xs ${
                      fieldErrors.dateOfBirth
                        ? 'border-[var(--danger-border)]'
                        : 'border-[var(--border-medium)] focus:border-[var(--text-primary)]'
                    }`}
                  />
                  {fieldErrors.dateOfBirth ? (
                    <p className="mt-1 text-xs text-[var(--danger-text)]">
                      {fieldErrors.dateOfBirth}
                    </p>
                  ) : (
                    <p className="mt-1 text-xs text-[var(--text-secondary)]">
                      Kept private for account verification and age-appropriate features.
                    </p>
                  )}
                </div>
              </div>
            </section>

            {/* Optional Profile Picture */}
            <section className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-main)]/90 p-5 sm:p-6">
              <div className="mb-4 flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
                <h2 className="font-serif text-xl text-[var(--text-primary)]">Profile Picture</h2>
                <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--text-secondary)]">
                  Optional
                </span>
              </div>

              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={fullName || 'Profile avatar'}
                    className="h-20 w-20 shrink-0 rounded-full border border-[var(--border-medium)] object-cover"
                  />
                ) : (
                  <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full border border-[var(--border-medium)] bg-[var(--bg-secondary)] font-serif text-2xl text-[var(--text-primary)]">
                    {initials}
                  </div>
                )}

                <div className="space-y-2">
                  <p className="text-xs text-[var(--text-secondary)]">
                    Add a square portrait (JPEG, PNG, or WebP, max 5 MB) or skip for now.
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    <PillButton
                      variant="secondary"
                      size="sm"
                      onClick={() => setEditorOpen(true)}
                    >
                      <ImagePlus className="h-3.5 w-3.5" />
                      {avatarUrl ? 'Change photo' : 'Upload photo'}
                    </PillButton>
                    {avatarUrl && (
                      <PillButton
                        variant="ghost"
                        size="sm"
                        disabled={removingAvatar}
                        onClick={() => void handleRemoveAvatar()}
                        className="text-[var(--danger-text)] hover:bg-[var(--danger-bg)]"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        {removingAvatar ? 'Removing…' : 'Remove'}
                      </PillButton>
                    )}
                  </div>
                </div>
              </div>
            </section>

            {/* Optional Bio & Interests */}
            <section className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-main)]/90 p-5 sm:p-6">
              <div className="mb-5 flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
                <h2 className="font-serif text-xl text-[var(--text-primary)]">
                  About &amp; Interests
                </h2>
                <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--text-secondary)]">
                  Optional
                </span>
              </div>

              <div className="space-y-5">
                <div>
                  <div className="flex items-center justify-between">
                    <label htmlFor="create-bio" className={LABEL_CLASS}>
                      Short Bio
                    </label>
                    <span className="font-mono text-[10px] text-[var(--text-secondary)]">
                      {bio.length}/500
                    </span>
                  </div>
                  <textarea
                    id="create-bio"
                    rows={3}
                    maxLength={500}
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Introduce yourself in a few sentences—what you study, build, or care about."
                    className={`${INPUT_CLASS} resize-y border-[var(--border-medium)] focus:border-[var(--text-primary)]`}
                  />
                </div>

                <div>
                  <span className={LABEL_CLASS}>Interests</span>
                  <div className="flex flex-wrap gap-2">
                    {SUGGESTED_INTERESTS.map((tag) => {
                      const active = interests.includes(tag);
                      return (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => toggleInterest(tag)}
                          className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition-colors cursor-pointer ${
                            active
                              ? 'border-[var(--btn-primary-bg)] bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)]'
                              : 'border-[var(--border-medium)] bg-[var(--bg-secondary)]/50 text-[var(--text-primary)] hover:border-[var(--text-primary)]'
                          }`}
                        >
                          {active && <Check className="h-3 w-3" />}
                          {tag}
                        </button>
                      );
                    })}
                  </div>

                  {/* Custom interest input */}
                  <div className="mt-3 flex flex-wrap gap-2">
                    <input
                      type="text"
                      value={customInterest}
                      onChange={(e) => setCustomInterest(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddCustomInterest();
                        }
                      }}
                      placeholder="Add another interest…"
                      className={`${INPUT_CLASS} max-w-xs border-[var(--border-medium)] focus:border-[var(--text-primary)]`}
                    />
                    <PillButton variant="secondary" size="sm" onClick={handleAddCustomInterest}>
                      <Plus className="h-3.5 w-3.5" />
                      Add
                    </PillButton>
                  </div>

                  {/* Custom interests that aren't in SUGGESTED_INTERESTS */}
                  {interests.some((item) => !SUGGESTED_INTERESTS.includes(item)) && (
                    <div className="mt-2.5 flex flex-wrap gap-2">
                      {interests
                        .filter((item) => !SUGGESTED_INTERESTS.includes(item))
                        .map((custom) => (
                          <span
                            key={custom}
                            className="inline-flex items-center gap-1.5 rounded-full border border-[var(--btn-primary-bg)] bg-[var(--btn-primary-bg)] px-3 py-1 text-xs text-[var(--btn-primary-text)]"
                          >
                            {custom}
                            <button
                              type="button"
                              aria-label={`Remove ${custom}`}
                              onClick={() => toggleInterest(custom)}
                              className="rounded-full p-0.5 hover:opacity-80 cursor-pointer"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </span>
                        ))}
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* Optional Multi-Select Current Activities */}
            <section className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-main)]/90 p-5 sm:p-6">
              <div className="mb-2 flex items-center justify-between">
                <h2 className="font-serif text-xl text-[var(--text-primary)]">
                  What are you currently doing?
                </h2>
                <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--text-secondary)]">
                  Optional · Select multiple
                </span>
              </div>
              <p className="mb-5 text-xs text-[var(--text-secondary)]">
                Choose all that apply right now and add an optional short description for each.
              </p>

              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  {ACTIVITY_OPTIONS.map((opt) => {
                    const isSelected = Boolean(selectedActivities[opt.key]);
                    return (
                      <button
                        key={opt.key}
                        type="button"
                        aria-pressed={isSelected}
                        onClick={() => toggleActivity(opt.key)}
                        className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-xs font-medium transition-colors cursor-pointer ${
                          isSelected
                            ? 'border-[var(--btn-primary-bg)] bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)]'
                            : 'border-[var(--border-medium)] bg-[var(--bg-secondary)]/50 text-[var(--text-primary)] hover:border-[var(--text-primary)]'
                        }`}
                      >
                        {isSelected && <Check className="h-3.5 w-3.5" />}
                        {opt.label}
                      </button>
                    );
                  })}
                </div>

                {/* Selected activity detail cards */}
                {ACTIVITY_OPTIONS.filter((opt) => Boolean(selectedActivities[opt.key])).map(
                  (opt) => {
                    const entry = selectedActivities[opt.key]!;
                    return (
                      <div
                        key={opt.key}
                        className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-secondary)]/45 p-4"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono text-[11px] uppercase tracking-[0.1em] text-[var(--text-primary)]">
                            {opt.label}
                          </span>
                          <button
                            type="button"
                            onClick={() => toggleActivity(opt.key)}
                            className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
                          >
                            Remove
                          </button>
                        </div>

                        {opt.key === 'other' && (
                          <div className="mt-2.5">
                            <label
                              htmlFor="activity-other-label"
                              className="block text-xs text-[var(--text-secondary)] mb-1"
                            >
                              Custom activity <span className="text-[var(--danger-text)]">*</span>
                            </label>
                            <input
                              id="activity-other-label"
                              type="text"
                              value={entry.label ?? ''}
                              onChange={(e) =>
                                updateActivityField('other', 'label', e.target.value)
                              }
                              placeholder="e.g., Mentoring, Volunteering, Gap Year"
                              aria-invalid={Boolean(fieldErrors.otherLabel)}
                              className={`${INPUT_CLASS} ${
                                fieldErrors.otherLabel
                                  ? 'border-[var(--danger-border)]'
                                  : 'border-[var(--border-medium)] focus:border-[var(--text-primary)]'
                              }`}
                            />
                            {fieldErrors.otherLabel && (
                              <p className="mt-1 text-xs text-[var(--danger-text)]">
                                {fieldErrors.otherLabel}
                              </p>
                            )}
                          </div>
                        )}

                        <div className="mt-2.5">
                          <label
                            htmlFor={`activity-desc-${opt.key}`}
                            className="block text-xs text-[var(--text-secondary)] mb-1"
                          >
                            Short description (optional)
                          </label>
                          <input
                            id={`activity-desc-${opt.key}`}
                            type="text"
                            maxLength={200}
                            value={entry.description ?? ''}
                            onChange={(e) =>
                              updateActivityField(opt.key, 'description', e.target.value)
                            }
                            placeholder={opt.placeholder}
                            className={`${INPUT_CLASS} border-[var(--border-medium)] focus:border-[var(--text-primary)]`}
                          />
                        </div>
                      </div>
                    );
                  },
                )}
              </div>
            </section>

            {/* Submit Bar */}
            <div className="flex flex-col-reverse items-stretch justify-between gap-3 border-t border-[var(--border-subtle)] pt-6 sm:flex-row sm:items-center">
              <p className="text-xs text-[var(--text-secondary)]">
                You can add location, social links, and contact details later in Profile settings.
              </p>
              <PillButton
                type="submit"
                size="lg"
                disabled={submitting || availability === 'checking'}
              >
                {submitting ? 'Completing setup…' : 'Complete Setup & Go to Dashboard'}
                <ArrowUpRight className="h-4 w-4" />
              </PillButton>
            </div>
          </form>
        )}
      </main>

      <ProfilePictureEditorModal
        open={editorOpen}
        currentAvatarUrl={avatarUrl}
        onClose={() => setEditorOpen(false)}
        onSaved={(newUrl) => {
          setAvatarUrl(newUrl);
          setEditorOpen(false);
          void refreshUser();
        }}
        onRemoved={() => {
          setAvatarUrl(null);
          setEditorOpen(false);
          void refreshUser();
        }}
      />
    </div>
  );
};
