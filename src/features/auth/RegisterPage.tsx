import React, { useState } from 'react';
import { ArrowUpRight } from 'lucide-react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '@/app/AuthContext';
import { PillButton } from '@/design/components/PillButton';
import { ApiClientError } from '@/services/http';
import { AuthAlert, AuthPasswordField, AuthTextField, OAuthButtons } from './AuthControls';
import { AuthShell } from './AuthShell';
import {
  mapApiFieldErrors,
  validateConfirmPassword,
  validateEmail,
  validateFullName,
  validatePassword,
} from './validation';

interface RegisterErrors {
  full_name?: string;
  email?: string;
  password?: string;
  confirm_password?: string;
}

export const RegisterPage: React.FC = () => {
  const { isAuthenticated, isInitializing, register } = useAuth();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<RegisterErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!isInitializing && isAuthenticated) {
    return <Navigate to="/workspace" replace />;
  }

  const runValidation = (): RegisterErrors => ({
    full_name: validateFullName(fullName),
    email: validateEmail(email),
    password: validatePassword(password),
    confirm_password: validateConfirmPassword(password, confirmPassword),
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    setFormError(null);
    const errors = runValidation();
    setFieldErrors(errors);

    if (Object.values(errors).some(Boolean)) {
      return;
    }

    setSubmitting(true);
    try {
      const outcome = await register(fullName.trim(), email.trim(), password);
      if (outcome.requiresVerification) {
        navigate(`/auth/verification-sent?email=${encodeURIComponent(outcome.user.email)}`, {
          replace: true,
          state: {
            email: outcome.user.email,
            verificationEmailSent: outcome.verificationEmailSent,
            deliveryMessage: outcome.message,
          },
        });
      } else {
        navigate('/workspace', { replace: true });
      }
    } catch (err) {
      if (err instanceof ApiClientError) {
        const mapped = mapApiFieldErrors(err);
        if (Object.keys(mapped).length > 0) {
          setFieldErrors((prev) => ({ ...prev, ...mapped }));
        }
        setFormError(err.message);
      } else {
        setFormError('Unable to create your account right now. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell
      eyebrow="CREATE ACCOUNT"
      heading="Join Folio360"
      description="Build your unified academic and professional identity."
      footer={
        <span>
          Already have a Folio360 identity?{' '}
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
        <AuthTextField
          id="register-full-name"
          label="Full Name"
          type="text"
          autoComplete="name"
          placeholder="Your full name"
          value={fullName}
          onChange={(e) => {
            setFullName(e.target.value);
            if (fieldErrors.full_name) {
              setFieldErrors((p) => ({ ...p, full_name: undefined }));
            }
          }}
          error={fieldErrors.full_name}
        />

        <AuthTextField
          id="register-email"
          label="Email Address"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (fieldErrors.email) {
              setFieldErrors((p) => ({ ...p, email: undefined }));
            }
          }}
          error={fieldErrors.email}
        />

        <AuthPasswordField
          id="register-password"
          label="Password"
          autoComplete="new-password"
          placeholder="At least 12 characters"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            if (fieldErrors.password) {
              setFieldErrors((p) => ({ ...p, password: undefined }));
            }
          }}
          hint="Use 12–128 characters. Any combination of letters, numbers, or symbols."
          error={fieldErrors.password}
        />

        <AuthPasswordField
          id="register-confirm-password"
          label="Confirm Password"
          autoComplete="new-password"
          placeholder="Re-enter your password"
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
          {submitting ? 'Creating account…' : 'Create account'}
          <ArrowUpRight className="h-4 w-4" />
        </PillButton>
      </form>

      <div className="mt-6">
        <OAuthButtons disabled={submitting} />
      </div>
    </AuthShell>
  );
};
