import React, { useEffect, useState } from 'react';
import { ArrowUpRight, CheckCircle2, Loader2, XCircle } from 'lucide-react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/app/AuthContext';
import { PillButton } from '@/design/components/PillButton';
import { profileService } from '@/services/api';
import { API_CONFIG } from '@/services/config';
import { ApiClientError } from '@/services/http';
import { AuthAlert } from './AuthControls';
import { AuthShell } from './AuthShell';
import { validateUsername } from './validation';

type AvailabilityStatus = 'idle' | 'checking' | 'available' | 'unavailable';

export const UsernameOnboardingPage: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const destination = (location.state as { from?: string } | null)?.from || '/workspace';

  const [username, setUsername] = useState('');
  const [fieldError, setFieldError] = useState<string | undefined>();
  const [availability, setAvailability] = useState<AvailabilityStatus>('idle');
  const [availabilityReason, setAvailabilityReason] = useState<string | undefined>();
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user?.slug) return;
    const err = validateUsername(username);
    if (!username || err) {
      setAvailability('idle');
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
  }, [username, user?.slug]);

  // Must come AFTER all hooks to preserve hook order across state updates
  if (user?.slug) {
    return <Navigate to={destination} replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    setFormError(null);
    const err = validateUsername(username);
    setFieldError(err);
    if (err) return;

    if (availability === 'unavailable') {
      setFieldError(availabilityReason || 'Please choose a different username.');
      return;
    }

    setSubmitting(true);
    try {
      const check = await profileService.checkSlugAvailability(username);
      if (!check.available) {
        setAvailability('unavailable');
        setFieldError(check.reason || 'This username is unavailable.');
        setSubmitting(false);
        return;
      }

      await profileService.updateSlug(username);
      await refreshUser();
      navigate(destination, { replace: true });
    } catch (errObj) {
      if (errObj instanceof ApiClientError) {
        setFormError(errObj.message);
      } else {
        setFormError('Unable to save your username right now.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell
      eyebrow="ONBOARDING — IDENTITY HANDLE"
      heading="Claim your handle."
      description="Choose a unique username for your Folio360 public profile. You can update it later in Profile settings."
    >
      {API_CONFIG.useMocks && (
        <div className="mb-5">
          <AuthAlert tone="info" title="Mock onboarding flow">
            Uses contract endpoints <code className="font-mono">/profile/slug-availability</code>{' '}
            and <code className="font-mono">/profile/me/slug</code>. Backend alignment required for
            underscore pattern &amp; <code className="font-mono">/@username</code> routing.
          </AuthAlert>
        </div>
      )}

      {formError && (
        <div className="mb-5">
          <AuthAlert tone="error">{formError}</AuthAlert>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <div>
          <label
            htmlFor="onboarding-username"
            className="block font-mono text-[11px] uppercase tracking-[0.12em] text-[var(--text-secondary)]"
          >
            Username
          </label>

          <div
            className={`mt-1.5 flex items-center rounded-lg border bg-[var(--bg-main)] transition-colors ${
              fieldError || availability === 'unavailable'
                ? 'border-[var(--danger-text)]'
                : 'border-[var(--border-medium)] focus-within:border-[var(--text-primary)]'
            }`}
          >
            <span className="pl-3.5 pr-1 font-mono text-sm text-[var(--text-secondary)] select-none">
              /@
            </span>
            <input
              id="onboarding-username"
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
                setFieldError(val ? validateUsername(val) : undefined);
              }}
              aria-invalid={Boolean(fieldError || availability === 'unavailable')}
              className="w-full bg-transparent py-2.5 pr-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]/60 focus:outline-none"
            />
            <span className="pr-3">
              {availability === 'checking' && (
                <Loader2 className="h-4 w-4 animate-spin text-[var(--text-secondary)]" />
              )}
              {availability === 'available' && !fieldError && (
                <CheckCircle2 className="h-4 w-4 text-[var(--text-primary)]" />
              )}
              {availability === 'unavailable' && (
                <XCircle className="h-4 w-4 text-[var(--danger-text)]" />
              )}
            </span>
          </div>

          <p className="mt-1.5 text-[11px] text-[var(--text-secondary)]">
            3–30 characters · lowercase letters, numbers, and underscores only · no spaces.
          </p>

          {(fieldError || availability === 'unavailable') && (
            <p role="alert" className="mt-1.5 text-xs text-[var(--danger-text)]">
              {fieldError || availabilityReason}
            </p>
          )}

          {availability === 'available' && !fieldError && (
            <p className="mt-1.5 font-mono text-[11px] text-[var(--text-primary)]">
              Available — public identity: /@{username}
            </p>
          )}
        </div>

        <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-secondary)]/55 px-4 py-3">
          <p className="font-mono text-[10px] uppercase tracking-wider text-[var(--text-secondary)]">
            PUBLIC IDENTITY PREVIEW
          </p>
          <p className="mt-1 font-mono text-xs text-[var(--text-primary)]">
            folio360.in/@{username || 'username'}
          </p>
        </div>

        <PillButton
          type="submit"
          variant="primary"
          size="lg"
          disabled={submitting || availability === 'checking'}
          className="mt-2 w-full"
        >
          {submitting ? 'Saving username…' : 'Continue to Workspace'}
          <ArrowUpRight className="h-4 w-4" />
        </PillButton>
      </form>
    </AuthShell>
  );
};
