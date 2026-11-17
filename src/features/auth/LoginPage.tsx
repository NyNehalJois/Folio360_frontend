import React, { useState } from 'react';
import { ArrowUpRight } from 'lucide-react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/app/AuthContext';
import { PillButton } from '@/design/components/PillButton';
import { authService } from '@/services/api';
import { API_CONFIG } from '@/services/config';
import { ApiClientError } from '@/services/http';
import { AuthAlert, AuthPasswordField, AuthTextField, OAuthButtons } from './AuthControls';
import { AuthShell } from './AuthShell';
import { mapApiFieldErrors, validateEmail } from './validation';

interface LoginErrors {
  email?: string;
  password?: string;
}

export const LoginPage: React.FC = () => {
  const { user, isAuthenticated, isInitializing, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const routeState = location.state as { from?: string; passwordReset?: boolean } | null;
  const from = routeState?.from || '/workspace';
  const passwordResetSuccess = Boolean(routeState?.passwordReset);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<LoginErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);
  const [resending, setResending] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  if (!isInitializing && isAuthenticated) {
    return <Navigate to={user?.slug ? from : '/onboarding/username'} replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    setFormError(null);
    setUnverifiedEmail(null);

    const errors: LoginErrors = {
      email: validateEmail(email),
      password: !password ? 'Password is required.' : undefined,
    };
    setFieldErrors(errors);
    if (Object.values(errors).some(Boolean)) return;

    setSubmitting(true);
    try {
      const signedInUser = await login(email.trim(), password);
      navigate(signedInUser.slug ? from : '/onboarding/username', {
        replace: true,
        state: signedInUser.slug ? undefined : { from },
      });
    } catch (err) {
      if (err instanceof ApiClientError) {
        if (err.code === 'EMAIL_NOT_VERIFIED') {
          setUnverifiedEmail(email.trim());
        } else {
          const mapped = mapApiFieldErrors(err);
          if (Object.keys(mapped).length > 0) {
            setFieldErrors((prev) => ({ ...prev, ...mapped }));
          }
          setFormError(err.message);
        }
      } else {
        setFormError('Unable to sign in right now. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleResendForUnverified = async () => {
    if (!unverifiedEmail || resending) return;
    setResending(true);
    try {
      await authService.resendVerification(unverifiedEmail);
      navigate(`/auth/verification-sent?email=${encodeURIComponent(unverifiedEmail)}`, {
        state: { email: unverifiedEmail },
      });
    } catch (err) {
      setFormError(
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
      eyebrow="SIGN IN"
      heading="Welcome back."
      description="Enter your credentials to access your academic records, portfolio, and document vault."
      footer={
        <span>
          New to Folio360?{' '}
          <Link to="/auth/register" className="font-medium text-[var(--text-primary)] underline">
            Create an account
          </Link>
        </span>
      }
    >
      {passwordResetSuccess && !formError && (
        <div className="mb-5">
          <AuthAlert tone="success" title="Password updated">
            Your password has been reset. Sign in with your new password.
          </AuthAlert>
        </div>
      )}

      {formError && (
        <div className="mb-5">
          <AuthAlert tone="error">{formError}</AuthAlert>
        </div>
      )}

      {unverifiedEmail && (
        <div className="mb-5">
          <AuthAlert tone="info" title="Email verification required">
            <p>
              <span className="font-medium text-[var(--text-primary)]">{unverifiedEmail}</span>{' '}
              must be verified before normal login is enabled.
            </p>
            <button
              type="button"
              disabled={resending}
              onClick={handleResendForUnverified}
              className="mt-2 font-medium text-[var(--text-primary)] underline hover:opacity-80 disabled:opacity-50 cursor-pointer"
            >
              {resending ? 'Sending verification email…' : 'Resend verification email'}
            </button>
          </AuthAlert>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <AuthTextField
          id="login-email"
          label="Email Address"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (fieldErrors.email) setFieldErrors((p) => ({ ...p, email: undefined }));
          }}
          error={fieldErrors.email}
        />

        <AuthPasswordField
          id="login-password"
          label="Password"
          autoComplete="current-password"
          placeholder="Enter your password"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            if (fieldErrors.password) setFieldErrors((p) => ({ ...p, password: undefined }));
          }}
          rightSlot={
            <Link
              to="/auth/forgot-password"
              className="font-mono text-[11px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] underline underline-offset-4"
            >
              Forgot password?
            </Link>
          }
          error={fieldErrors.password}
        />

        <PillButton
          type="submit"
          variant="primary"
          size="lg"
          disabled={submitting}
          className="mt-2 w-full"
        >
          {submitting ? 'Signing in…' : 'Login'}
          <ArrowUpRight className="h-4 w-4" />
        </PillButton>
      </form>

      {API_CONFIG.useMocks && (
        <p className="mt-4 font-mono text-[11px] leading-relaxed text-[var(--text-secondary)]">
          Mock sample account: <span className="text-[var(--text-primary)]">demo@example.com</span> /{' '}
          <span className="text-[var(--text-primary)]">password1234</span>
        </p>
      )}

      <div className="mt-6">
        <OAuthButtons redirectTo={from} disabled={submitting} />
      </div>
    </AuthShell>
  );
};
