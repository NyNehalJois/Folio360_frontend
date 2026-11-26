import React, { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, RefreshCw } from 'lucide-react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/app/AuthContext';
import { isProfileComplete, PROFILE_CREATION_ROUTE } from '@/app/profileCompletion';
import { PillButton } from '@/design/components/PillButton';
import { consumeOAuthTransaction } from '@/services/api/oauth';
import { ApiClientError } from '@/services/http';
import { AuthAlert } from './AuthControls';
import { AuthShell } from './AuthShell';

const OAUTH_ERROR_MESSAGES: Record<string, string> = {
  access_denied: 'You cancelled sign-in with the provider.',
  OAUTH_DENIED: 'Authentication was cancelled or denied by the provider.',
  OAUTH_STATE_INVALID:
    'Security validation failed (invalid or expired OAuth state). Please try again.',
  ACCOUNT_EXISTS_UNVERIFIED:
    'An account with this email already exists but is not verified yet. Sign in with your password and verify your email first.',
  OAUTH_EMAIL_UNVERIFIED:
    'Your provider account does not have a verified primary email address.',
  OAUTH_UNAVAILABLE:
    'OAuth authentication requires the Folio360 backend OAuth endpoints, which are unavailable in mock mode.',
};

export const OAuthCallbackPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { exchangeOAuth } = useAuth();

  const inFlightRef = useRef<{
    code: string;
    redirectTo: string;
    promise: ReturnType<typeof exchangeOAuth>;
  } | null>(null);
  const completedRef = useRef(false);

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const hash = location.hash || window.location.hash || '';
    const hasForbiddenTokens =
      searchParams.has('access_token') ||
      searchParams.has('refresh_token') ||
      hash.includes('access_token=') ||
      hash.includes('refresh_token=');

    if (hasForbiddenTokens) {
      window.history.replaceState({}, document.title, '/auth/callback');
      setError(
        'Security policy violation: tokens were present in the redirect URL and rejected.',
      );
      return;
    }

    // If an exchange already started and the URL was cleaned to /auth/callback, reuse its result
    if (inFlightRef.current) {
      let active = true;
      const { promise, redirectTo } = inFlightRef.current;
      promise
        .then((oauthUser) => {
          if (!active) return;
          const completed = isProfileComplete(oauthUser);
          navigate(completed ? redirectTo : PROFILE_CREATION_ROUTE, {
            replace: true,
            state: completed ? undefined : { from: redirectTo },
          });
        })
        .catch((err) => {
          if (!active) return;
          if (err instanceof ApiClientError) {
            setError(OAUTH_ERROR_MESSAGES[err.code] || err.message);
          } else {
            setError('Unable to complete OAuth sign-in.');
          }
        });
      return () => {
        active = false;
      };
    }

    if (completedRef.current) return;

    const oauthError = searchParams.get('error');
    if (oauthError) {
      completedRef.current = true;
      setError(
        OAUTH_ERROR_MESSAGES[oauthError] ||
          `Authentication could not be completed (${oauthError}).`,
      );
      return;
    }

    const code = searchParams.get('code');
    const returnedState = searchParams.get('state');
    const txCheck = consumeOAuthTransaction(returnedState);

    if (!txCheck.valid) {
      completedRef.current = true;
      setError(OAUTH_ERROR_MESSAGES.OAUTH_STATE_INVALID);
      return;
    }

    if (!code) {
      completedRef.current = true;
      setError('No one-time authorization code was returned by the provider.');
      return;
    }

    const redirectTo = txCheck.transaction?.redirectTo || '/workspace';
    const promise = exchangeOAuth(code, txCheck.transaction?.codeVerifier);
    inFlightRef.current = { code, redirectTo, promise };

    // Clear one-time code from browser URL history immediately
    window.history.replaceState({}, document.title, '/auth/callback');

    let active = true;
    promise
      .then((oauthUser) => {
        if (!active) return;
        const completed = isProfileComplete(oauthUser);
        navigate(completed ? redirectTo : PROFILE_CREATION_ROUTE, {
          replace: true,
          state: completed ? undefined : { from: redirectTo },
        });
      })
      .catch((err) => {
        if (!active) return;
        if (err instanceof ApiClientError) {
          setError(OAUTH_ERROR_MESSAGES[err.code] || err.message);
        } else {
          setError('Unable to complete OAuth sign-in.');
        }
      });

    return () => {
      active = false;
    };
  }, [location.hash, location.search, searchParams, exchangeOAuth, navigate]);

  if (error) {
    return (
      <AuthShell
        eyebrow="OAUTH SIGN-IN"
        heading="Authentication could not be completed."
        description="No session was created."
        footer={
          <span>
            Need a new account?{' '}
            <Link to="/auth/register" className="font-medium text-[var(--text-primary)] underline">
              Join Folio360
            </Link>
          </span>
        }
      >
        <div className="mb-6">
          <AuthAlert tone="error">{error}</AuthAlert>
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
      eyebrow="OAUTH SIGN-IN"
      heading="Completing sign-in."
      description="Exchanging your one-time authorization code securely…"
    >
      <div className="flex items-center gap-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-secondary)]/55 p-4 text-sm text-[var(--text-secondary)]">
        <RefreshCw className="h-4 w-4 animate-spin text-[var(--accent)]" />
        <span>Verifying session with Folio360…</span>
      </div>
    </AuthShell>
  );
};
