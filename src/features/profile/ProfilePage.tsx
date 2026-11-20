import React, { useCallback, useEffect, useState } from 'react';
import {
  AlertCircle,
  ArrowUpRight,
  Check,
  CheckCircle2,
  Copy,
  ExternalLink,
  ImagePlus,
  Lock,
  Plus,
  Trash2,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/app/AuthContext';
import { ErrorState, LoadingState } from '@/design/components/EditorialStates';
import { PillButton } from '@/design/components/PillButton';
import { StrandCanvas } from '@/design/strands/StrandCanvas';
import { validateFullName, validateUsername } from '@/features/auth/validation';
import { profileService } from '@/services/api';
import { ApiClientError } from '@/services/http';
import type { Profile, ProfileLinkItem, PublicSettings } from '@/types/api';
import { ProfilePictureEditorModal } from './ProfilePictureEditorModal';

function isValidHttpUrl(value: string): boolean {
  if (!value.trim()) return true;
  try {
    const parsed = new URL(value.trim());
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

interface ToggleRowProps {
  id: string;
  label: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
}

const VisibilityToggleRow: React.FC<ToggleRowProps> = ({
  id,
  label,
  description,
  checked,
  disabled = false,
  onChange,
}) => (
  <label
    htmlFor={id}
    className={`flex items-start justify-between gap-4 py-3.5 ${
      disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
    }`}
  >
    <div className="min-w-0">
      <p className="text-sm font-medium text-[var(--text-primary)]">{label}</p>
      <p className="mt-0.5 text-xs text-[var(--text-secondary)]">{description}</p>
    </div>
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      className={`relative mt-0.5 inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors cursor-pointer disabled:cursor-not-allowed ${
        checked
          ? 'border-[var(--btn-primary-bg)] bg-[var(--btn-primary-bg)]'
          : 'border-[var(--border-medium)] bg-[var(--bg-secondary)]'
      }`}
    >
      <span
        className={`inline-block h-4 w-4 rounded-full transition-transform ${
          checked
            ? 'translate-x-5.5 bg-[var(--btn-primary-text)]'
            : 'translate-x-1 bg-[var(--text-secondary)]'
        }`}
      />
    </button>
  </label>
);

export const ProfilePage: React.FC = () => {
  const { user, refreshUser } = useAuth();

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<ApiClientError | Error | null>(null);

  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);

  // Identity
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [savedUsername, setSavedUsername] = useState('');
  const [usernameStatus, setUsernameStatus] = useState<
    'unchanged' | 'checking' | 'available' | 'unavailable'
  >('unchanged');
  const [usernameError, setUsernameError] = useState<string | undefined>();
  const [savingUsername, setSavingUsername] = useState(false);
  const [headline, setHeadline] = useState('');
  const [bio, setBio] = useState('');
  const [location, setLocation] = useState('');

  // Contact
  const [contactEmail, setContactEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [website, setWebsite] = useState('');

  // Social
  const [linkedin, setLinkedin] = useState('');
  const [github, setGithub] = useState('');
  const [portfolioUrl, setPortfolioUrl] = useState('');
  const [additionalLinks, setAdditionalLinks] = useState<ProfileLinkItem[]>([]);

  // Public visibility
  const [visibility, setVisibility] = useState<PublicSettings | null>(null);

  // Save state
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);

  const hydrateForm = useCallback((profile: Profile, vis: PublicSettings) => {
    setAvatarUrl(profile.avatar_url);
    setFullName(profile.full_name);
    setUsername(profile.slug || '');
    setSavedUsername(profile.slug || '');
    setUsernameStatus('unchanged');
    setUsernameError(undefined);
    setHeadline(profile.headline ?? '');
    setBio(profile.bio ?? '');
    setLocation(profile.location ?? '');
    setContactEmail(profile.contact_email ?? '');
    setPhone(profile.phone ?? '');
    setWebsite(profile.website ?? '');
    setLinkedin(profile.links.linkedin ?? '');
    setGithub(profile.links.github ?? '');

    const portfolioEntry = (profile.links.other ?? []).find(
      (item) => item.label.trim().toLowerCase() === 'portfolio',
    );
    setPortfolioUrl(portfolioEntry?.url ?? '');
    setAdditionalLinks(
      (profile.links.other ?? []).filter(
        (item) => item.label.trim().toLowerCase() !== 'portfolio',
      ),
    );
    setVisibility(vis);
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [profile, vis] = await Promise.all([
        profileService.getMe(),
        profileService.getVisibility(),
      ]);
      hydrateForm(profile, vis);
    } catch (err) {
      setLoadError(
        err instanceof Error ? err : new ApiClientError(500, 'INTERNAL_ERROR', 'Unable to load profile.'),
      );
    } finally {
      setLoading(false);
    }
  }, [hydrateForm]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Debounced username availability check when username differs from saved
  useEffect(() => {
    if (username === savedUsername) {
      setUsernameStatus('unchanged');
      setUsernameError(undefined);
      return;
    }

    const err = validateUsername(username);
    if (err) {
      setUsernameStatus('unavailable');
      setUsernameError(err);
      return;
    }

    let active = true;
    setUsernameStatus('checking');
    setUsernameError(undefined);

    const timer = window.setTimeout(async () => {
      try {
        const res = await profileService.checkSlugAvailability(username);
        if (!active) return;
        if (res.available) {
          setUsernameStatus('available');
          setUsernameError(undefined);
        } else {
          setUsernameStatus('unavailable');
          setUsernameError(res.reason || 'This username is unavailable.');
        }
      } catch {
        if (!active) return;
        setUsernameStatus('unchanged');
      }
    }, 280);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [username, savedUsername]);

  const handleSaveUsername = async () => {
    if (savingUsername || username === savedUsername) return;
    const err = validateUsername(username);
    if (err) {
      setUsernameError(err);
      return;
    }
    setSavingUsername(true);
    setSaveError(null);
    setSaveSuccess(null);
    try {
      const updated = await profileService.updateSlug(username);
      setSavedUsername(updated.slug);
      setUsername(updated.slug);
      setUsernameStatus('unchanged');
      await refreshUser();
      setSaveSuccess(`Username updated to /@${updated.slug}`);
    } catch (errObj) {
      setUsernameError(
        errObj instanceof ApiClientError ? errObj.message : 'Unable to update username.',
      );
    } finally {
      setSavingUsername(false);
    }
  };

  const validateAllFields = (): Record<string, string> => {
    const errors: Record<string, string> = {};
    const nameErr = validateFullName(fullName);
    if (nameErr) errors.full_name = nameErr;

    if (headline.trim().length > 120) {
      errors.headline = 'Headline must be 120 characters or fewer.';
    }
    if (bio.trim().length > 1000) {
      errors.bio = 'Biography must be 1000 characters or fewer.';
    }
    if (contactEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail.trim())) {
      errors.contact_email = 'Enter a valid contact email address.';
    }
    if (!isValidHttpUrl(website)) {
      errors.website = 'Website must start with http:// or https://.';
    }
    if (!isValidHttpUrl(linkedin)) {
      errors.linkedin = 'LinkedIn URL must start with http:// or https://.';
    }
    if (!isValidHttpUrl(github)) {
      errors.github = 'GitHub URL must start with http:// or https://.';
    }
    if (!isValidHttpUrl(portfolioUrl)) {
      errors.portfolio = 'Portfolio URL must start with http:// or https://.';
    }
    additionalLinks.forEach((link, idx) => {
      if ((link.label.trim() && !link.url.trim()) || (!link.label.trim() && link.url.trim())) {
        errors[`link_${idx}`] = 'Both label and URL are required for each link.';
      } else if (link.url.trim() && !isValidHttpUrl(link.url)) {
        errors[`link_${idx}`] = 'URL must start with http:// or https://.';
      }
    });
    return errors;
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving || !visibility) return;

    setSaveError(null);
    setSaveSuccess(null);

    const errors = validateAllFields();
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      setSaveError('Please resolve the highlighted fields before saving.');
      return;
    }

    setSaving(true);
    try {
      const cleanOtherLinks: ProfileLinkItem[] = [];
      if (portfolioUrl.trim()) {
        cleanOtherLinks.push({ label: 'Portfolio', url: portfolioUrl.trim() });
      }
      for (const item of additionalLinks) {
        if (item.label.trim() && item.url.trim()) {
          cleanOtherLinks.push({ label: item.label.trim(), url: item.url.trim() });
        }
      }

      const [updatedProfile, updatedVis] = await Promise.all([
        profileService.updateMe({
          full_name: fullName.trim(),
          headline: headline.trim() || null,
          bio: bio.trim() || null,
          location: location.trim() || null,
          contact_email: contactEmail.trim() || null,
          phone: phone.trim() || null,
          website: website.trim() || null,
          links: {
            linkedin: linkedin.trim() || undefined,
            github: github.trim() || undefined,
            other: cleanOtherLinks,
          },
        }),
        profileService.updateVisibility(visibility),
      ]);

      hydrateForm(updatedProfile, updatedVis);
      await refreshUser();
      setSaveSuccess('Profile and visibility settings saved.');
    } catch (err) {
      setSaveError(
        err instanceof ApiClientError ? err.message : 'Unable to save profile changes right now.',
      );
    } finally {
      setSaving(false);
    }
  };

  const handleCopyPublicUrl = async () => {
    const url = `${window.location.origin}/@${savedUsername}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedUrl(true);
      window.setTimeout(() => setCopiedUrl(false), 2000);
    } catch {
      // Fallback ignored if clipboard unavailable
    }
  };

  const handleAvatarSaved = async (newUrl: string) => {
    setAvatarUrl(newUrl);
    await refreshUser();
    setSaveSuccess('Profile picture updated.');
  };

  const handleAvatarRemoved = async () => {
    setAvatarUrl(null);
    await refreshUser();
    setSaveSuccess('Profile picture removed. Default strand artwork restored.');
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-[980px] px-6 py-10 md:px-10">
        <LoadingState label="Loading personal profile" />
      </div>
    );
  }

  if (loadError || !visibility) {
    return (
      <div className="mx-auto max-w-[980px] px-6 py-10 md:px-10">
        <ErrorState error={loadError} onRetry={loadData} />
      </div>
    );
  }

  const publicRoutePath = `/@${savedUsername}`;

  return (
    <div className="mx-auto max-w-[980px] px-6 py-10 md:px-10 md:py-12">
      {/* Header */}
      <div className="flex flex-col gap-4 border-b border-[var(--border-subtle)] pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--text-secondary)]">
            MODULE 02 — PERSONAL PROFILE
          </p>
          <h1 className="mt-2 font-serif text-4xl text-[var(--text-primary)]">
            Personal Profile
          </h1>
          <p className="mt-1.5 text-sm text-[var(--text-secondary)]">
            Manage your identity, contact details, social links, and public profile visibility.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {savedUsername && visibility.public_enabled && (
            <PillButton to={publicRoutePath} variant="secondary" size="sm">
              Preview Public Profile
              <ArrowUpRight className="h-3.5 w-3.5" />
            </PillButton>
          )}
          <PillButton
            type="submit"
            form="personal-profile-form"
            variant="primary"
            size="sm"
            disabled={saving}
          >
            {saving ? 'Saving…' : 'Save Changes'}
          </PillButton>
        </div>
      </div>

      {saveError && (
        <div
          role="alert"
          className="mt-6 flex items-start gap-2.5 rounded-lg border border-[var(--danger-border)] bg-[var(--danger-bg)] px-4 py-3 text-xs text-[var(--danger-text)]"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{saveError}</span>
        </div>
      )}

      {saveSuccess && (
        <div
          role="status"
          className="mt-6 flex items-start gap-2.5 rounded-lg border border-[var(--border-accent)] bg-[var(--bg-secondary)] px-4 py-3 text-xs text-[var(--text-primary)]"
        >
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{saveSuccess}</span>
        </div>
      )}

      <form id="personal-profile-form" onSubmit={handleSaveProfile} noValidate className="mt-10 space-y-12">
        {/* SECTION 1 — IDENTITY */}
        <section aria-labelledby="identity-heading" className="grid grid-cols-1 gap-8 md:grid-cols-12">
          <div className="md:col-span-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--accent)]">
              01
            </p>
            <h2 id="identity-heading" className="mt-1 font-serif text-2xl text-[var(--text-primary)]">
              Identity
            </h2>
            <p className="mt-1.5 text-xs leading-relaxed text-[var(--text-secondary)]">
              Your name, handle, headline, and profile portrait. Without a photo, your card
              displays Folio360&rsquo;s flowing strand artwork.
            </p>
          </div>

          <div className="md:col-span-8 space-y-6">
            {/* Profile Picture Preview & Controls */}
            <div className="flex flex-col gap-5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)]/45 p-5 sm:flex-row sm:items-center">
              <div className="relative h-32 w-32 shrink-0 overflow-hidden rounded-xl border border-[var(--border-medium)] bg-[var(--bg-secondary)]">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={`${fullName || 'User'} profile portrait`}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <StrandCanvas variant="dashboard-card" className="h-full w-full" />
                )}
              </div>

              <div className="flex-1">
                <p className="font-mono text-[11px] uppercase tracking-wider text-[var(--text-secondary)]">
                  PROFILE PICTURE
                </p>
                <p className="mt-1 text-xs leading-relaxed text-[var(--text-secondary)]">
                  Square crop (1:1). Supports JPEG, PNG, and WebP up to 5 MB. Stored as a profile
                  asset, separate from your private Document Vault.
                </p>

                <div className="mt-4 flex flex-wrap items-center gap-2.5">
                  <PillButton
                    variant="secondary"
                    size="sm"
                    onClick={() => setEditorOpen(true)}
                  >
                    <ImagePlus className="h-3.5 w-3.5" />
                    {avatarUrl ? 'Edit / Replace Photo' : 'Upload Photo'}
                  </PillButton>

                  {avatarUrl && (
                    <button
                      type="button"
                      onClick={() => setEditorOpen(true)}
                      className="inline-flex h-8 items-center gap-1.5 rounded-full border border-[var(--danger-border)] px-3.5 text-xs font-medium text-[var(--danger-text)] hover:bg-[var(--danger-bg)] cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Remove
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Full Name */}
            <div>
              <label
                htmlFor="profile-full-name"
                className="block font-mono text-[11px] uppercase tracking-[0.12em] text-[var(--text-secondary)]"
              >
                Full Name
              </label>
              <input
                id="profile-full-name"
                type="text"
                value={fullName}
                onChange={(e) => {
                  setFullName(e.target.value);
                  if (fieldErrors.full_name) {
                    setFieldErrors((p) => ({ ...p, full_name: '' }));
                  }
                }}
                placeholder="Your full name"
                className="mt-1.5 w-full rounded-lg border border-[var(--border-medium)] bg-[var(--bg-main)] px-3.5 py-2.5 text-sm text-[var(--text-primary)] focus:border-[var(--text-primary)] focus:outline-none"
              />
              {fieldErrors.full_name && (
                <p role="alert" className="mt-1 text-xs text-[var(--danger-text)]">
                  {fieldErrors.full_name}
                </p>
              )}
            </div>

            {/* Username (/@username) */}
            <div>
              <label
                htmlFor="profile-username"
                className="block font-mono text-[11px] uppercase tracking-[0.12em] text-[var(--text-secondary)]"
              >
                Username
              </label>
              <div className="mt-1.5 flex flex-col gap-2 sm:flex-row sm:items-center">
                <div className="flex flex-1 items-center rounded-lg border border-[var(--border-medium)] bg-[var(--bg-main)] focus-within:border-[var(--text-primary)]">
                  <span className="pl-3.5 pr-1 font-mono text-sm text-[var(--text-secondary)] select-none">
                    /@
                  </span>
                  <input
                    id="profile-username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="your_username"
                    className="w-full bg-transparent py-2.5 pr-3 text-sm text-[var(--text-primary)] focus:outline-none"
                  />
                </div>
                {username !== savedUsername && (
                  <PillButton
                    variant="secondary"
                    size="sm"
                    onClick={handleSaveUsername}
                    disabled={
                      savingUsername ||
                      usernameStatus === 'checking' ||
                      usernameStatus === 'unavailable' ||
                      Boolean(usernameError)
                    }
                  >
                    {savingUsername ? 'Updating…' : 'Update username'}
                  </PillButton>
                )}
              </div>
              <p className="mt-1.5 text-[11px] text-[var(--text-secondary)]">
                3–30 characters · lowercase letters, numbers, and underscores only · public format:{' '}
                <span className="font-mono text-[var(--text-primary)]">
                  /@{username || 'username'}
                </span>
              </p>
              {usernameStatus === 'checking' && (
                <p className="mt-1 font-mono text-[11px] text-[var(--text-secondary)]">
                  Checking availability…
                </p>
              )}
              {usernameStatus === 'available' && !usernameError && (
                <p className="mt-1 font-mono text-[11px] text-[var(--text-primary)]">
                  Username is available.
                </p>
              )}
              {usernameError && (
                <p role="alert" className="mt-1 text-xs text-[var(--danger-text)]">
                  {usernameError}
                </p>
              )}
            </div>

            {/* Professional Headline */}
            <div>
              <div className="flex items-center justify-between">
                <label
                  htmlFor="profile-headline"
                  className="block font-mono text-[11px] uppercase tracking-[0.12em] text-[var(--text-secondary)]"
                >
                  Professional Headline
                </label>
                <span className="font-mono text-[10px] text-[var(--text-secondary)]">
                  {headline.length}/120
                </span>
              </div>
              <input
                id="profile-headline"
                type="text"
                maxLength={120}
                value={headline}
                onChange={(e) => setHeadline(e.target.value)}
                placeholder="e.g. Computer Science Student · Full-Stack Developer"
                className="mt-1.5 w-full rounded-lg border border-[var(--border-medium)] bg-[var(--bg-main)] px-3.5 py-2.5 text-sm text-[var(--text-primary)] focus:border-[var(--text-primary)] focus:outline-none"
              />
              {fieldErrors.headline && (
                <p role="alert" className="mt-1 text-xs text-[var(--danger-text)]">
                  {fieldErrors.headline}
                </p>
              )}
            </div>

            {/* Biography */}
            <div>
              <div className="flex items-center justify-between">
                <label
                  htmlFor="profile-bio"
                  className="block font-mono text-[11px] uppercase tracking-[0.12em] text-[var(--text-secondary)]"
                >
                  Biography
                </label>
                <span className="font-mono text-[10px] text-[var(--text-secondary)]">
                  {bio.length}/1000
                </span>
              </div>
              <textarea
                id="profile-bio"
                rows={4}
                maxLength={1000}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Summarize your academic focus, engineering interests, and goals."
                className="mt-1.5 w-full rounded-lg border border-[var(--border-medium)] bg-[var(--bg-main)] px-3.5 py-2.5 text-sm leading-relaxed text-[var(--text-primary)] focus:border-[var(--text-primary)] focus:outline-none"
              />
              {fieldErrors.bio && (
                <p role="alert" className="mt-1 text-xs text-[var(--danger-text)]">
                  {fieldErrors.bio}
                </p>
              )}
            </div>

            {/* Location */}
            <div>
              <label
                htmlFor="profile-location"
                className="block font-mono text-[11px] uppercase tracking-[0.12em] text-[var(--text-secondary)]"
              >
                Location (Optional)
              </label>
              <input
                id="profile-location"
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Bengaluru, IN"
                className="mt-1.5 w-full rounded-lg border border-[var(--border-medium)] bg-[var(--bg-main)] px-3.5 py-2.5 text-sm text-[var(--text-primary)] focus:border-[var(--text-primary)] focus:outline-none"
              />
            </div>
          </div>
        </section>

        <hr className="border-[var(--border-subtle)]" />

        {/* SECTION 2 — CONTACT */}
        <section aria-labelledby="contact-heading" className="grid grid-cols-1 gap-8 md:grid-cols-12">
          <div className="md:col-span-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--accent)]">
              02
            </p>
            <h2 id="contact-heading" className="mt-1 font-serif text-2xl text-[var(--text-primary)]">
              Contact
            </h2>
            <p className="mt-1.5 text-xs leading-relaxed text-[var(--text-secondary)]">
              Account email is always private by default. Email and phone remain hidden unless
              explicitly enabled in visibility settings below.
            </p>
          </div>

          <div className="md:col-span-8 space-y-5">
            {/* Account Email (Read-only, verified flow in Settings) */}
            <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-secondary)]/55 p-4">
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.12em] text-[var(--text-secondary)]">
                  <Lock className="h-3 w-3" />
                  Account Email
                </span>
                <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--text-secondary)]">
                  Private by default
                </span>
              </div>
              <p className="mt-1.5 text-sm font-medium text-[var(--text-primary)]">
                {user?.email || '—'}
              </p>
              <p className="mt-1 text-xs text-[var(--text-secondary)]">
                Changing your account login email requires verification in{' '}
                <Link to="/workspace/settings" className="underline text-[var(--text-primary)]">
                  Account Settings
                </Link>
                .
              </p>
            </div>

            {/* Optional Public Contact Email */}
            <div>
              <label
                htmlFor="profile-contact-email"
                className="block font-mono text-[11px] uppercase tracking-[0.12em] text-[var(--text-secondary)]"
              >
                Public Contact Email (Optional)
              </label>
              <input
                id="profile-contact-email"
                type="email"
                value={contactEmail}
                onChange={(e) => {
                  setContactEmail(e.target.value);
                  if (fieldErrors.contact_email) {
                    setFieldErrors((p) => ({ ...p, contact_email: '' }));
                  }
                }}
                placeholder="Separate contact email if shared publicly"
                className="mt-1.5 w-full rounded-lg border border-[var(--border-medium)] bg-[var(--bg-main)] px-3.5 py-2.5 text-sm text-[var(--text-primary)] focus:border-[var(--text-primary)] focus:outline-none"
              />
              {fieldErrors.contact_email && (
                <p role="alert" className="mt-1 text-xs text-[var(--danger-text)]">
                  {fieldErrors.contact_email}
                </p>
              )}
            </div>

            {/* Optional Phone */}
            <div>
              <label
                htmlFor="profile-phone"
                className="block font-mono text-[11px] uppercase tracking-[0.12em] text-[var(--text-secondary)]"
              >
                Phone Number (Optional)
              </label>
              <input
                id="profile-phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98765 43210"
                className="mt-1.5 w-full rounded-lg border border-[var(--border-medium)] bg-[var(--bg-main)] px-3.5 py-2.5 text-sm text-[var(--text-primary)] focus:border-[var(--text-primary)] focus:outline-none"
              />
            </div>

            {/* Personal Website */}
            <div>
              <label
                htmlFor="profile-website"
                className="block font-mono text-[11px] uppercase tracking-[0.12em] text-[var(--text-secondary)]"
              >
                Personal Website
              </label>
              <input
                id="profile-website"
                type="url"
                value={website}
                onChange={(e) => {
                  setWebsite(e.target.value);
                  if (fieldErrors.website) {
                    setFieldErrors((p) => ({ ...p, website: '' }));
                  }
                }}
                placeholder="https://yourwebsite.dev"
                className="mt-1.5 w-full rounded-lg border border-[var(--border-medium)] bg-[var(--bg-main)] px-3.5 py-2.5 text-sm text-[var(--text-primary)] focus:border-[var(--text-primary)] focus:outline-none"
              />
              {fieldErrors.website && (
                <p role="alert" className="mt-1 text-xs text-[var(--danger-text)]">
                  {fieldErrors.website}
                </p>
              )}
            </div>
          </div>
        </section>

        <hr className="border-[var(--border-subtle)]" />

        {/* SECTION 3 — SOCIAL PROFILES */}
        <section aria-labelledby="social-heading" className="grid grid-cols-1 gap-8 md:grid-cols-12">
          <div className="md:col-span-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--accent)]">
              03
            </p>
            <h2 id="social-heading" className="mt-1 font-serif text-2xl text-[var(--text-primary)]">
              Social Profiles
            </h2>
            <p className="mt-1.5 text-xs leading-relaxed text-[var(--text-secondary)]">
              Connect your LinkedIn, GitHub, portfolio, and any additional professional links.
            </p>
          </div>

          <div className="md:col-span-8 space-y-5">
            <div>
              <label
                htmlFor="profile-linkedin"
                className="block font-mono text-[11px] uppercase tracking-[0.12em] text-[var(--text-secondary)]"
              >
                LinkedIn
              </label>
              <input
                id="profile-linkedin"
                type="url"
                value={linkedin}
                onChange={(e) => setLinkedin(e.target.value)}
                placeholder="https://linkedin.com/in/username"
                className="mt-1.5 w-full rounded-lg border border-[var(--border-medium)] bg-[var(--bg-main)] px-3.5 py-2.5 text-sm text-[var(--text-primary)] focus:border-[var(--text-primary)] focus:outline-none"
              />
              {fieldErrors.linkedin && (
                <p role="alert" className="mt-1 text-xs text-[var(--danger-text)]">
                  {fieldErrors.linkedin}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="profile-github"
                className="block font-mono text-[11px] uppercase tracking-[0.12em] text-[var(--text-secondary)]"
              >
                GitHub
              </label>
              <input
                id="profile-github"
                type="url"
                value={github}
                onChange={(e) => setGithub(e.target.value)}
                placeholder="https://github.com/username"
                className="mt-1.5 w-full rounded-lg border border-[var(--border-medium)] bg-[var(--bg-main)] px-3.5 py-2.5 text-sm text-[var(--text-primary)] focus:border-[var(--text-primary)] focus:outline-none"
              />
              {fieldErrors.github && (
                <p role="alert" className="mt-1 text-xs text-[var(--danger-text)]">
                  {fieldErrors.github}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="profile-portfolio"
                className="block font-mono text-[11px] uppercase tracking-[0.12em] text-[var(--text-secondary)]"
              >
                Portfolio Link
              </label>
              <input
                id="profile-portfolio"
                type="url"
                value={portfolioUrl}
                onChange={(e) => setPortfolioUrl(e.target.value)}
                placeholder="https://portfolio.example.com"
                className="mt-1.5 w-full rounded-lg border border-[var(--border-medium)] bg-[var(--bg-main)] px-3.5 py-2.5 text-sm text-[var(--text-primary)] focus:border-[var(--text-primary)] focus:outline-none"
              />
              {fieldErrors.portfolio && (
                <p role="alert" className="mt-1 text-xs text-[var(--danger-text)]">
                  {fieldErrors.portfolio}
                </p>
              )}
            </div>

            {/* Additional Links */}
            <div>
              <div className="flex items-center justify-between">
                <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-[var(--text-secondary)]">
                  Additional Links
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setAdditionalLinks((prev) => [...prev, { label: '', url: '' }])
                  }
                  className="inline-flex items-center gap-1 font-mono text-[11px] text-[var(--text-primary)] hover:underline cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add link
                </button>
              </div>

              {additionalLinks.length === 0 ? (
                <p className="mt-2 text-xs text-[var(--text-secondary)]">
                  No additional links added yet.
                </p>
              ) : (
                <div className="mt-2.5 space-y-3">
                  {additionalLinks.map((item, idx) => (
                    <div key={idx}>
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                        <input
                          type="text"
                          value={item.label}
                          onChange={(e) => {
                            const val = e.target.value;
                            setAdditionalLinks((prev) =>
                              prev.map((row, i) => (i === idx ? { ...row, label: val } : row)),
                            );
                          }}
                          placeholder="Label (e.g. Kaggle)"
                          aria-label={`Additional link ${idx + 1} label`}
                          className="sm:w-40 rounded-lg border border-[var(--border-medium)] bg-[var(--bg-main)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--text-primary)] focus:outline-none"
                        />
                        <input
                          type="url"
                          value={item.url}
                          onChange={(e) => {
                            const val = e.target.value;
                            setAdditionalLinks((prev) =>
                              prev.map((row, i) => (i === idx ? { ...row, url: val } : row)),
                            );
                          }}
                          placeholder="https://..."
                          aria-label={`Additional link ${idx + 1} URL`}
                          className="flex-1 rounded-lg border border-[var(--border-medium)] bg-[var(--bg-main)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--text-primary)] focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setAdditionalLinks((prev) => prev.filter((_, i) => i !== idx))
                          }
                          aria-label={`Remove link ${idx + 1}`}
                          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--danger-text)] hover:border-[var(--danger-border)] cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      {fieldErrors[`link_${idx}`] && (
                        <p role="alert" className="mt-1 text-xs text-[var(--danger-text)]">
                          {fieldErrors[`link_${idx}`]}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>

        <hr className="border-[var(--border-subtle)]" />

        {/* SECTION 4 — PUBLIC PROFILE & VISIBILITY */}
        <section aria-labelledby="public-heading" className="grid grid-cols-1 gap-8 md:grid-cols-12">
          <div className="md:col-span-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--accent)]">
              04
            </p>
            <h2 id="public-heading" className="mt-1 font-serif text-2xl text-[var(--text-primary)]">
              Public Profile
            </h2>
            <p className="mt-1.5 text-xs leading-relaxed text-[var(--text-secondary)]">
              Control whether your public portfolio is reachable and which contact fields or
              sections appear. Private Vault documents are never exposed publicly.
            </p>
          </div>

          <div className="md:col-span-8 space-y-6">
            {/* Public URL Bar */}
            <div className="flex flex-col gap-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)]/55 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--text-secondary)]">
                  PUBLIC PROFILE URL
                </p>
                <p className="mt-1 truncate font-mono text-xs text-[var(--text-primary)]">
                  {savedUsername ? `folio360.in/@${savedUsername}` : 'Set a username above to claim URL'}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {savedUsername && (
                  <>
                    <button
                      type="button"
                      onClick={handleCopyPublicUrl}
                      className="inline-flex h-8 items-center gap-1.5 rounded-full border border-[var(--border-medium)] px-3.5 text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--bg-main)] cursor-pointer"
                    >
                      {copiedUrl ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                      {copiedUrl ? 'Copied' : 'Copy URL'}
                    </button>

                    {visibility.public_enabled && (
                      <Link
                        to={publicRoutePath}
                        className="inline-flex h-8 items-center gap-1.5 rounded-full bg-[var(--btn-primary-bg)] px-3.5 text-xs font-medium text-[var(--btn-primary-text)] hover:bg-[var(--btn-primary-hover)]"
                      >
                        Preview
                        <ExternalLink className="h-3 w-3" />
                      </Link>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Visibility Switches */}
            <div className="divide-y divide-[var(--border-subtle)] rounded-xl border border-[var(--border-subtle)] px-5">
              <VisibilityToggleRow
                id="vis-public-enabled"
                label="Enable public profile"
                description="Allow visitors with your /@username URL to view your selected public portfolio."
                checked={visibility.public_enabled}
                onChange={(val) =>
                  setVisibility((prev) =>
                    prev
                      ? {
                          ...prev,
                          public_enabled: val,
                          discoverable: val ? prev.discoverable : false,
                        }
                      : prev,
                  )
                }
              />

              <VisibilityToggleRow
                id="vis-discoverable"
                label="Discoverable in Explore"
                description="Opt in to appear in Folio360's public Explore directory (requires public profile enabled)."
                checked={visibility.discoverable}
                disabled={!visibility.public_enabled}
                onChange={(val) =>
                  setVisibility((prev) => (prev ? { ...prev, discoverable: val } : prev))
                }
              />

              <VisibilityToggleRow
                id="vis-show-location"
                label="Show location on public profile"
                description="Display your city or region publicly."
                checked={visibility.public_contact.show_location}
                disabled={!visibility.public_enabled}
                onChange={(val) =>
                  setVisibility((prev) =>
                    prev
                      ? {
                          ...prev,
                          public_contact: { ...prev.public_contact, show_location: val },
                        }
                      : prev,
                  )
                }
              />

              <VisibilityToggleRow
                id="vis-show-email"
                label="Show public contact email"
                description="Off by default. Exposes only the optional contact email field above—never your private account login email unless entered there."
                checked={visibility.public_contact.show_email}
                disabled={!visibility.public_enabled}
                onChange={(val) =>
                  setVisibility((prev) =>
                    prev
                      ? {
                          ...prev,
                          public_contact: { ...prev.public_contact, show_email: val },
                        }
                      : prev,
                  )
                }
              />

              <VisibilityToggleRow
                id="vis-show-phone"
                label="Show phone number on public profile"
                description="Off by default. Keep hidden unless you intentionally want recruiters to see it."
                checked={visibility.public_contact.show_phone}
                disabled={!visibility.public_enabled}
                onChange={(val) =>
                  setVisibility((prev) =>
                    prev
                      ? {
                          ...prev,
                          public_contact: { ...prev.public_contact, show_phone: val },
                        }
                      : prev,
                  )
                }
              />
            </div>

            {/* Public Portfolio Sections */}
            <div className="rounded-xl border border-[var(--border-subtle)] p-5">
              <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-[var(--text-secondary)]">
                VISIBLE PORTFOLIO SECTIONS
              </p>
              <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                {(
                  [
                    ['education', 'Education'],
                    ['projects', 'Projects'],
                    ['skills', 'Skills'],
                    ['certificates', 'Certificates'],
                    ['experience', 'Experience'],
                    ['achievements', 'Achievements'],
                    ['academics_cgpa', 'Overall CGPA'],
                  ] as const
                ).map(([key, label]) => (
                  <label
                    key={key}
                    className={`flex items-center gap-2.5 rounded-lg border border-[var(--border-subtle)] px-3 py-2 text-xs ${
                      visibility.public_enabled
                        ? 'text-[var(--text-primary)] cursor-pointer'
                        : 'text-[var(--text-secondary)] opacity-55 cursor-not-allowed'
                    }`}
                  >
                    <input
                      type="checkbox"
                      disabled={!visibility.public_enabled}
                      checked={visibility.public_sections[key]}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setVisibility((prev) =>
                          prev
                            ? {
                                ...prev,
                                public_sections: {
                                  ...prev.public_sections,
                                  [key]: checked,
                                },
                              }
                            : prev,
                        );
                      }}
                      className="h-3.5 w-3.5 accent-[var(--text-primary)]"
                    />
                    <span>{label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Bottom Save Action */}
        <div className="flex flex-wrap items-center justify-end gap-3 border-t border-[var(--border-subtle)] pt-6">
          <PillButton type="submit" variant="primary" size="lg" disabled={saving}>
            {saving ? 'Saving profile…' : 'Save Profile'}
          </PillButton>
        </div>
      </form>

      <ProfilePictureEditorModal
        open={editorOpen}
        currentAvatarUrl={avatarUrl}
        onClose={() => setEditorOpen(false)}
        onSaved={handleAvatarSaved}
        onRemoved={handleAvatarRemoved}
      />
    </div>
  );
};
