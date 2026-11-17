import React, { useState } from 'react';
import { AlertCircle, CheckCircle2, Eye, EyeOff, Info } from 'lucide-react';
import { prepareOAuthStartUrl } from '@/services/api/oauth';
import { API_CONFIG } from '@/services/config';
import type { OAuthProvider } from '@/types/api';

interface TextFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  id: string;
  label: string;
  error?: string;
  rightSlot?: React.ReactNode;
}

export const AuthTextField: React.FC<TextFieldProps> = ({
  id,
  label,
  error,
  rightSlot,
  className = '',
  ...rest
}) => {
  const errorId = `${id}-error`;
  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <label
          htmlFor={id}
          className="block font-mono text-[11px] uppercase tracking-[0.12em] text-[var(--text-secondary)]"
        >
          {label}
        </label>
        {rightSlot}
      </div>
      <input
        id={id}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
        className={`mt-1.5 w-full rounded-lg border bg-[var(--bg-main)] px-3.5 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]/60 transition-colors focus:outline-none ${
          error
            ? 'border-[var(--danger-text)] focus:border-[var(--danger-text)]'
            : 'border-[var(--border-medium)] focus:border-[var(--text-primary)]'
        } ${className}`}
        {...rest}
      />
      {error && (
        <p id={errorId} role="alert" className="mt-1.5 text-xs text-[var(--danger-text)]">
          {error}
        </p>
      )}
    </div>
  );
};

interface PasswordFieldProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  rightSlot?: React.ReactNode;
}

export const AuthPasswordField: React.FC<PasswordFieldProps> = ({
  id,
  label,
  error,
  hint,
  rightSlot,
  ...rest
}) => {
  const [visible, setVisible] = useState(false);
  const errorId = `${id}-error`;

  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <label
          htmlFor={id}
          className="block font-mono text-[11px] uppercase tracking-[0.12em] text-[var(--text-secondary)]"
        >
          {label}
        </label>
        {rightSlot}
      </div>
      <div className="relative mt-1.5">
        <input
          id={id}
          type={visible ? 'text' : 'password'}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
          className={`w-full rounded-lg border bg-[var(--bg-main)] py-2.5 pl-3.5 pr-11 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]/60 transition-colors focus:outline-none ${
            error
              ? 'border-[var(--danger-text)] focus:border-[var(--danger-text)]'
              : 'border-[var(--border-medium)] focus:border-[var(--text-primary)]'
          }`}
          {...rest}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
          aria-pressed={visible}
          className="absolute inset-y-0 right-1 flex w-9 items-center justify-center rounded-md text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer focus:outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent)]"
        >
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
      {hint && !error && (
        <p className="mt-1.5 text-[11px] text-[var(--text-secondary)]">{hint}</p>
      )}
      {error && (
        <p id={errorId} role="alert" className="mt-1.5 text-xs text-[var(--danger-text)]">
          {error}
        </p>
      )}
    </div>
  );
};

export const AuthAlert: React.FC<{
  tone: 'error' | 'success' | 'info';
  title?: string;
  children: React.ReactNode;
}> = ({ tone, title, children }) => {
  const styles =
    tone === 'error'
      ? 'border-[var(--danger-border)] bg-[var(--danger-bg)] text-[var(--danger-text)]'
      : tone === 'success'
        ? 'border-[var(--border-accent)] bg-[var(--bg-secondary)] text-[var(--text-primary)]'
        : 'border-[var(--border-subtle)] bg-[var(--bg-secondary)]/70 text-[var(--text-secondary)]';

  const Icon = tone === 'error' ? AlertCircle : tone === 'success' ? CheckCircle2 : Info;

  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={`rounded-lg border px-4 py-3 text-xs leading-relaxed ${styles}`}
    >
      <div className="flex items-start gap-2.5">
        <Icon className="mt-0.5 h-4 w-4 shrink-0" />
        <div className="flex-1">
          {title && <p className="font-medium text-[var(--text-primary)]">{title}</p>}
          <div className={title ? 'mt-0.5' : ''}>{children}</div>
        </div>
      </div>
    </div>
  );
};

interface OAuthButtonsProps {
  redirectTo?: string;
  disabled?: boolean;
  onNotice?: (message: string) => void;
}

export const OAuthButtons: React.FC<OAuthButtonsProps> = ({
  redirectTo = '/workspace',
  disabled = false,
  onNotice,
}) => {
  const [busyProvider, setBusyProvider] = useState<OAuthProvider | null>(null);
  const [localNotice, setLocalNotice] = useState<string | null>(null);

  const handleOAuth = async (provider: OAuthProvider) => {
    if (disabled || busyProvider) return;
    setLocalNotice(null);

    if (API_CONFIG.useMocks) {
      const msg = `${provider === 'google' ? 'Google' : 'GitHub'} OAuth is unavailable in Phase 1 mock mode because it requires the backend OAuth and one-time code exchange endpoints.`;
      setLocalNotice(msg);
      onNotice?.(msg);
      return;
    }

    setBusyProvider(provider);
    try {
      const startUrl = await prepareOAuthStartUrl(provider, redirectTo);
      window.location.assign(startUrl);
    } catch {
      const msg = `Unable to start ${provider === 'google' ? 'Google' : 'GitHub'} authentication right now.`;
      setLocalNotice(msg);
      onNotice?.(msg);
      setBusyProvider(null);
    }
  };

  return (
    <div className="space-y-3">
      <div className="relative flex items-center py-1">
        <div className="flex-grow border-t border-[var(--border-subtle)]" />
        <span className="mx-3 shrink-0 font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--text-secondary)]">
          OR CONTINUE WITH
        </span>
        <div className="flex-grow border-t border-[var(--border-subtle)]" />
      </div>

      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        <button
          type="button"
          disabled={disabled || Boolean(busyProvider)}
          onClick={() => handleOAuth('google')}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-[var(--border-medium)] bg-transparent px-4 text-xs font-medium text-[var(--text-primary)] transition-colors hover:border-[var(--text-primary)] hover:bg-[var(--bg-secondary)]/70 disabled:opacity-50 cursor-pointer"
        >
          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" aria-hidden="true">
            <path
              fill="currentColor"
              d="M21.35 11.1H12v3.2h5.35c-.25 1.45-1.55 4.25-5.35 4.25-3.22 0-5.85-2.66-5.85-5.95S8.78 6.65 12 6.65c1.83 0 3.06.78 3.76 1.45l2.56-2.46C16.68 4.1 14.55 3.15 12 3.15 7.02 3.15 3 7.18 3 12.15s4.02 9 9 9c5.2 0 8.65-3.65 8.65-8.8 0-.59-.07-1.03-.15-1.25Z"
            />
          </svg>
          {busyProvider === 'google' ? 'Redirecting…' : 'Continue with Google'}
        </button>

        <button
          type="button"
          disabled={disabled || Boolean(busyProvider)}
          onClick={() => handleOAuth('github')}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-[var(--border-medium)] bg-transparent px-4 text-xs font-medium text-[var(--text-primary)] transition-colors hover:border-[var(--text-primary)] hover:bg-[var(--bg-secondary)]/70 disabled:opacity-50 cursor-pointer"
        >
          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" aria-hidden="true">
            <path
              fill="currentColor"
              d="M12 2C6.48 2 2 6.58 2 12.23c0 4.52 2.87 8.35 6.84 9.7.5.1.68-.22.68-.49 0-.24-.01-1.05-.01-1.91-2.78.62-3.37-1.21-3.37-1.21-.45-1.18-1.11-1.49-1.11-1.49-.91-.64.07-.63.07-.63 1 .07 1.53 1.05 1.53 1.05.9 1.57 2.35 1.12 2.92.85.09-.66.35-1.12.64-1.38-2.22-.26-4.56-1.14-4.56-5.07 0-1.12.39-2.04 1.03-2.76-.1-.26-.45-1.31.1-2.72 0 0 .84-.27 2.75 1.05A9.3 9.3 0 0 1 12 6.84c.85 0 1.71.12 2.51.35 1.91-1.32 2.75-1.05 2.75-1.05.55 1.41.2 2.46.1 2.72.64.72 1.03 1.64 1.03 2.76 0 3.94-2.34 4.81-4.57 5.06.36.32.68.94.68 1.9 0 1.37-.01 2.47-.01 2.81 0 .27.18.59.69.49A10.22 10.22 0 0 0 22 12.23C22 6.58 17.52 2 12 2Z"
            />
          </svg>
          {busyProvider === 'github' ? 'Redirecting…' : 'Continue with GitHub'}
        </button>
      </div>

      {localNotice && <AuthAlert tone="info">{localNotice}</AuthAlert>}
    </div>
  );
};
