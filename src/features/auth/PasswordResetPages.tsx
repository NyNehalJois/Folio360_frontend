import React, { useState } from 'react';
import { ArrowUpRight, Mail } from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { PillButton } from '@/design/components/PillButton';
import { authService } from '@/services/api';
import { ApiClientError } from '@/services/http';
import { AuthAlert, AuthPasswordField, AuthTextField } from './AuthControls';
import { AuthShell } from './AuthShell';
import {
  mapApiFieldErrors,
  validateConfirmPassword,
  validateEmail,
  validatePassword,
} from './validation';

/* --- /auth/forgot-password --- */

export const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState<string | undefined>();
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    setFormError(null);
    const errMsg = validateEmail(email);
    setEmailError(errMsg);
    if (errMsg) return;

    setSubmitting(true);
    try {
      const normalized = email.trim();
      await authService.forgotPassword(normalized);
      setSubmittedEmail(normalized);
    } catch (err) {
      setFormError(
        err instanceof ApiClientError
          ? err.message
          : 'Unable to submit reset request right now.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (submittedEmail) {
    return (
      <AuthShell
        eyebrow="RESET REQUEST SENT"
        heading="Check your email."
        description="We processed your password reset request."
        footer={
          <span>
            Remembered your password?{' '}
            <Link to="/auth/login" className="font-medium text-[var(--text-primary)] underline">
              Back to login
            </Link>
          </span>
        }
      >
        <div className="mb-6 flex items-start gap-3 rounded-lg border border-[var(--border-accent)] bg-[var(--bg-secondary)]/60 p-4">
          <Mail className="mt-0.5 h-4 w-4 shrink-0 text-[var(--accent)]" />
          <p className="text-xs leading-relaxed text-[var(--text-secondary)]">
            If an account exists for{' '}
            <span className="font-medium text-[var(--text-primary)]">{submittedEmail}</span>,
            we have sent instructions to reset your password.
          </p>
        </div>

        <PillButton to="/auth/login" variant="primary" size="lg" className="w-full">
          Return to Login
          <ArrowUpRight className="h-4 w-4" />
        </PillButton>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      eyebrow="PASSWORD RECOVERY"
      heading="Reset your password."
      description="Enter your email address and we will send password reset instructions if an account matches."
      footer={
        <span>
          Remembered your password?{' '}
          <Link to="/auth/login" className="font-medium text-[var(--text-primary)] underline">
            Back to login
          </Link>
        </span>
      }
    >
      {formError && (
        <div className="mb-5">
          <AuthAlert tone="error">{formError}</AuthAlert>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <AuthTextField
          id="forgot-email"
          label="Email Address"
          type="email"
          autoComplete="email"
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
          disabled={submitting}
          className="mt-2 w-full"
        >
          {submitting ? 'Sending request…' : 'Send reset instructions'}
          <ArrowUpRight className="h-4 w-4" />
        </PillButton>
      </form>
    </AuthShell>
  );
};

/* --- /auth/reset-password --- */

interface ResetErrors {
  new_password?: string;
  confirm_password?: string;
}

export const ResetPasswordPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<ResetErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [tokenError, setTokenError] = useState<string | null>(
    token ? null : 'No password reset token was provided in this link.',
  );
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting || !token) return;

    setFormError(null);
    const errors: ResetErrors = {
      new_password: validatePassword(newPassword),
      confirm_password: validateConfirmPassword(newPassword, confirmPassword),
    };
    setFieldErrors(errors);
    if (Object.values(errors).some(Boolean)) return;

    setSubmitting(true);
    try {
      await authService.resetPassword({ token, new_password: newPassword });
      navigate('/auth/login', { replace: true, state: { passwordReset: true } });
    } catch (err) {
      if (err instanceof ApiClientError) {
        if (
          err.code === 'TOKEN_EXPIRED' ||
          err.code === 'BAD_REQUEST' ||
          err.code === 'NOT_FOUND'
        ) {
          setTokenError(err.message);
        } else {
          const mapped = mapApiFieldErrors(err);
          if (Object.keys(mapped).length > 0) {
            setFieldErrors((p) => ({ ...p, ...mapped }));
          }
          setFormError(err.message);
        }
      } else {
        setFormError('Unable to reset password right now.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (tokenError) {
    return (
      <AuthShell
        eyebrow="INVALID OR EXPIRED LINK"
        heading="Reset link unavailable."
        description={tokenError}
        footer={
          <span>
            Remembered your password?{' '}
            <Link to="/auth/login" className="font-medium text-[var(--text-primary)] underline">
              Back to login
            </Link>
          </span>
        }
      >
        <div className="mb-6">
          <AuthAlert tone="error">{tokenError}</AuthAlert>
        </div>

        <PillButton to="/auth/forgot-password" variant="primary" size="lg" className="w-full">
          Request a new reset link
          <ArrowUpRight className="h-4 w-4" />
        </PillButton>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      eyebrow="NEW PASSWORD"
      heading="Choose a new password."
      description="Create a strong password of 12–128 characters for your Folio360 account."
      footer={
        <span>
          Return to{' '}
          <Link to="/auth/login" className="font-medium text-[var(--text-primary)] underline">
            Sign in
          </Link>
        </span>
      }
    >
      {formError && (
        <div className="mb-5">
          <AuthAlert tone="error">{formError}</AuthAlert>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <AuthPasswordField
          id="reset-new-password"
          label="New Password"
          autoComplete="new-password"
          placeholder="At least 12 characters"
          value={newPassword}
          onChange={(e) => {
            setNewPassword(e.target.value);
            if (fieldErrors.new_password) {
              setFieldErrors((p) => ({ ...p, new_password: undefined }));
            }
          }}
          hint="Use 12–128 characters. Any combination of letters, numbers, or symbols."
          error={fieldErrors.new_password}
        />

        <AuthPasswordField
          id="reset-confirm-password"
          label="Confirm New Password"
          autoComplete="new-password"
          placeholder="Re-enter your new password"
          value={confirmPassword}
          onChange={(e) => {
            setConfirmPassword(e.target.value);
            if (fieldErrors.confirm_password) {
              setFieldErrors((p) => ({ ...p, confirm_password: undefined }));
            }
          }}
          error={fieldErrors.confirm_password}
        />

        <PillButton
          type="submit"
          variant="primary"
          size="lg"
          disabled={submitting}
          className="mt-2 w-full"
        >
          {submitting ? 'Updating password…' : 'Update password'}
          <ArrowUpRight className="h-4 w-4" />
        </PillButton>
      </form>
    </AuthShell>
  );
};
