import React, { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, CheckCircle2, Mail, RefreshCw, XCircle } from 'lucide-react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { PillButton } from '@/design/components/PillButton';
import { authService } from '@/services/api';
import { API_CONFIG } from '@/services/config';
import { ApiClientError } from '@/services/http';
import { AuthAlert, AuthTextField } from './AuthControls';
import { AuthShell } from './AuthShell';
import { validateEmail } from './validation';

/* --- /auth/verify-email --- */

export const VerifyEmailPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');
  const inFlightRef = useRef<{ token: string; promise: Promise<unknown> } | null>(null);

  useEffect(() => {
    if (!token) {
      navigate('/auth/verification-failed?reason=missing', { replace: true });
      return;
    }

    if (!inFlightRef.current || inFlightRef.current.token !== token) {
      inFlightRef.current = {
        token,
        promise: authService.verifyEmail(token),
      };
    }

    let active = true;
    (inFlightRef.current.promise as ReturnType<typeof authService.verifyEmail>)
      .then((verifiedUser) => {
        if (!active) return;
        const verifiedEmail = verifiedUser?.email;
        navigate(
          verifiedEmail
            ? `/auth/verification-success?email=${encodeURIComponent(verifiedEmail)}`
            : '/auth/verification-success',
          {
            replace: true,
            state: verifiedEmail ? { email: verifiedEmail } : undefined,
          },
        );
      })
      .catch((err) => {
        if (!active) return;
        const reason =
          err instanceof ApiClientError && err.code === 'TOKEN_EXPIRED'
            ? 'expired'
            : err instanceof ApiClientError && err.code === 'TOKEN_ALREADY_USED'
              ? 'used'
              : 'invalid';
        navigate(`/auth/verification-failed?reason=${reason}`, {
          replace: true,
          state: {
            message:
              err instanceof ApiClientError
                ? err.message
                : 'Verification link could not be validated.',
          },
        });
      });

    return () => {
      active = false;
    };
  }, [token, navigate]);

  return (
    <AuthShell
      eyebrow="EMAIL VERIFICATION"
      heading="Verifying your email."
      description="Confirming your verification token with Folio360…"
    >
      <div className="flex items-center gap-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-secondary)]/55 p-4 text-sm text-[var(--text-secondary)]">
        <RefreshCw className="h-4 w-4 animate-spin text-[var(--accent)]" />
        <span>Checking verification status…</span>
      </div>
    </AuthShell>
  );
};

/* --- /auth/verification-sent --- */

export const VerificationSentPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const routeState = location.state as {
    email?: string;
    verificationEmailSent?: boolean;
    deliveryMessage?: string;
  } | null;
  const stateEmail = routeState?.email;
  const initialEmail = searchParams.get('email') || stateEmail || '';
  const initialDeliveryFailed = routeState?.verificationEmailSent === false;
  const initialDeliveryMessage = routeState?.deliveryMessage;

  const [emailInput, setEmailInput] = useState(initialEmail);
  const [emailError, setEmailError] = useState<string | undefined>();
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [cooldown]);

  const handleResend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (resending || cooldown > 0) return;

    const errMsg = validateEmail(emailInput);
    setEmailError(errMsg);
    if (errMsg) return;

    setError(null);
    setResent(false);
    setResending(true);
    try {
      await authService.resendVerification(emailInput.trim());
      setResent(true);
      setCooldown(30);
    } catch (err) {
      setError(
        err instanceof ApiClientError
          ? err.message
          : 'Unable to resend verification email right now.',
      );
    } finally {
      setResending(false);
    }
  };

  return (
    <AuthShell
      eyebrow="VERIFY YOUR EMAIL"
      heading={initialDeliveryFailed && !resent ? 'Verification email not sent.' : 'Check your inbox.'}
      description={
        initialDeliveryFailed && !resent
          ? 'Your account was created, but we could not deliver the verification email right now.'
          : initialEmail
            ? `We sent a verification link to ${initialEmail}. Verify your email before signing in.`
            : 'Enter your email address to resend a fresh verification link.'
      }
      footer={
        <span>
          Already verified?{' '}
          <Link to="/auth/login" className="font-medium text-[var(--text-primary)] underline">
            Return to login
          </Link>
        </span>
      }
    >
      {initialDeliveryFailed && !resent && (
        <div className="mb-4">
          <AuthAlert tone="error">
            {initialDeliveryMessage ||
              'Verification email delivery failed. Please use the button below to resend.'}
          </AuthAlert>
        </div>
      )}

      <div className="mb-5 flex items-start gap-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-secondary)]/55 p-4">
        <Mail className="mt-0.5 h-4 w-4 shrink-0 text-[var(--accent)]" />
        <div className="text-xs leading-relaxed text-[var(--text-secondary)]">
          <p className="font-medium text-[var(--text-primary)]">
            {initialEmail || 'Verification required'}
          </p>
          <p className="mt-0.5">
            Email/password accounts remain locked for normal login until verification succeeds.
          </p>
        </div>
      </div>

      {resent && (
        <div className="mb-4">
          <AuthAlert tone="success">
            If an unverified account exists for{' '}
            <span className="font-medium text-[var(--text-primary)]">{emailInput.trim()}</span>, a
            fresh verification link has been sent.
          </AuthAlert>
        </div>
      )}

      {error && (
        <div className="mb-4">
          <AuthAlert tone="error">{error}</AuthAlert>
        </div>
      )}

      <form onSubmit={handleResend} noValidate className="space-y-4">
        {!initialEmail && (
          <AuthTextField
            id="verify-sent-email"
            label="Email Address"
            type="email"
            placeholder="you@example.com"
            value={emailInput}
            onChange={(e) => {
              setEmailInput(e.target.value);
              if (emailError) setEmailError(undefined);
            }}
            error={emailError}
          />
        )}

        <PillButton
          type="submit"
          variant="secondary"
          size="lg"
          disabled={resending || cooldown > 0}
          className="w-full"
        >
          {resending
            ? 'Sending…'
            : cooldown > 0
              ? `Resend available in ${cooldown}s`
              : 'Resend verification email'}
        </PillButton>
      </form>

      {API_CONFIG.useMocks && (
        <div className="mt-5 rounded-lg border border-[var(--border-subtle)] p-3 font-mono text-[11px] text-[var(--text-secondary)]">
          Mock preview links:{' '}
          <Link to="/auth/verify-email?token=mock-verify-valid" className="underline text-[var(--text-primary)]">
            valid
          </Link>
          {' · '}
          <Link to="/auth/verify-email?token=mock-verify-expired" className="underline text-[var(--text-primary)]">
            expired
          </Link>
          {' · '}
          <Link to="/auth/verify-email?token=mock-verify-invalid" className="underline text-[var(--text-primary)]">
            invalid
          </Link>
          {' · '}
          <Link to="/auth/verify-email?token=mock-verify-used" className="underline text-[var(--text-primary)]">
            used
          </Link>
        </div>
      )}
    </AuthShell>
  );
};

/* --- /auth/verification-success --- */

export const VerificationSuccessPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const email =
    searchParams.get('email') || (location.state as { email?: string } | null)?.email;

  return (
    <AuthShell
      eyebrow="VERIFIED"
      heading="Email verified."
      description={
        email
          ? `${email} is confirmed. Your Folio360 account is now ready for login.`
          : 'Your email address is confirmed. Your Folio360 account is now ready for login.'
      }
    >
      <div className="mb-6 flex items-start gap-3 rounded-lg border border-[var(--border-accent)] bg-[var(--bg-secondary)]/60 p-4">
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[var(--text-primary)]" />
        <p className="text-xs leading-relaxed text-[var(--text-secondary)]">
          Sign in with your email and password to open your personal Folio360 workspace.
        </p>
      </div>

      <PillButton to="/auth/login" variant="primary" size="lg" className="w-full">
        Continue to Login
        <ArrowUpRight className="h-4 w-4" />
      </PillButton>
    </AuthShell>
  );
};

/* --- /auth/verification-failed --- */

export const VerificationFailedPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const reason = searchParams.get('reason') || 'invalid';
  const stateMsg = (location.state as { message?: string } | null)?.message;

  const [email, setEmail] = useState(searchParams.get('email') || '');
  const [emailError, setEmailError] = useState<string | undefined>();
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const heading =
    reason === 'expired'
      ? 'Verification link expired.'
      : reason === 'used'
        ? 'Verification link already used.'
        : reason === 'missing'
          ? 'Missing verification token.'
          : 'Verification failed.';

  const description =
    stateMsg ||
    (reason === 'expired'
      ? 'This verification link has expired. Request a new link below to activate your account.'
      : reason === 'used'
        ? 'This verification link has already been used. If your email is verified, return to login; otherwise request a fresh link below.'
        : reason === 'missing'
          ? 'No verification token was included in this URL. Open the link from your email or request a new one.'
          : 'This verification link is invalid.');

  const handleResend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (resending) return;
    const errMsg = validateEmail(email);
    setEmailError(errMsg);
    if (errMsg) return;

    setError(null);
    setResent(false);
    setResending(true);
    try {
      await authService.resendVerification(email.trim());
      setResent(true);
    } catch (err) {
      setError(
        err instanceof ApiClientError
          ? err.message
          : 'Unable to send verification email right now.',
      );
    } finally {
      setResending(false);
    }
  };

  return (
    <AuthShell
      eyebrow="VERIFICATION ISSUE"
      heading={heading}
      description={description}
      footer={
        <span>
          Ready to try signing in?{' '}
          <Link to="/auth/login" className="font-medium text-[var(--text-primary)] underline">
            Back to login
          </Link>
        </span>
      }
    >
      <div className="mb-5 flex items-start gap-3 rounded-lg border border-[var(--danger-border)] bg-[var(--danger-bg)] p-4 text-xs text-[var(--danger-text)]">
        <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
        <span>
          {reason === 'expired'
            ? 'Verification tokens are time-limited for account security.'
            : 'Request a fresh verification email below to continue.'}
        </span>
      </div>

      {resent && (
        <div className="mb-4">
          <AuthAlert tone="success">
            Verification instructions sent to{' '}
            <span className="font-medium text-[var(--text-primary)]">{email.trim()}</span>.
          </AuthAlert>
        </div>
      )}

      {error && (
        <div className="mb-4">
          <AuthAlert tone="error">{error}</AuthAlert>
        </div>
      )}

      <form onSubmit={handleResend} noValidate className="space-y-4">
        <AuthTextField
          id="verify-failed-email"
          label="Email Address"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (emailError) setEmailError(undefined);
          }}
          error={emailError}
        />

        <PillButton
          type="submit"
          variant="primary"
          size="lg"
          disabled={resending}
          className="w-full"
        >
          {resending ? 'Sending…' : 'Resend verification email'}
          <ArrowUpRight className="h-4 w-4" />
        </PillButton>
      </form>
    </AuthShell>
  );
};
