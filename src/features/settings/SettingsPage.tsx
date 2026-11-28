import React, { useCallback, useEffect, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Download,
  ExternalLink,
  History,
  Laptop,
  Lock,
  LogOut,
  Mail,
  Monitor,
  Moon,
  Shield,
  Sun,
  Trash2,
} from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/app/AuthContext';
import { ErrorState, LoadingState } from '@/design/components/EditorialStates';
import { PillButton } from '@/design/components/PillButton';
import { useTheme } from '@/design/theme';
import {
  validateConfirmPassword,
  validateEmail,
  validatePassword,
} from '@/features/auth/validation';
import { DeleteAccountModal } from '@/features/settings/DeleteAccountModal';
import {
  accountService,
  authService,
  githubService,
  profileService,
} from '@/services/api';
import { ApiClientError } from '@/services/http';
import type {
  Account,
  AuditEvent,
  Connection,
  GithubConnection,
  OAuthProvider,
  PublicSettings,
  Session,
  ThemePreference,
} from '@/types/api';

const INPUT_CLASS =
  'h-10 w-full rounded-lg border border-[var(--border-medium)] bg-[var(--bg-main)] px-3.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]/60 transition-colors focus:border-[var(--text-primary)] focus:outline-none disabled:cursor-not-allowed disabled:opacity-50';

const LABEL_CLASS =
  'block font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--text-secondary)] mb-1.5';

const AUDIT_ACTION_LABELS: Record<string, string> = {
  login_success: 'Signed in',
  login_failed: 'Failed sign-in attempt',
  password_changed: 'Password updated',
  session_revoked: 'Session revoked',
  logout_all: 'Signed out all devices',
  email_change_requested: 'Email change requested',
  email_changed: 'Email address updated',
  oauth_disconnected: 'OAuth provider disconnected',
  data_exported: 'Account data exported',
};

function formatDateTime(iso: string): string {
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return iso;
  return parsed.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

interface SwitchRowProps {
  id: string;
  label: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
}

const SettingsSwitchRow: React.FC<SwitchRowProps> = ({
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
      disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
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
      className={`relative mt-0.5 inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors ${
        disabled ? 'cursor-not-allowed' : 'cursor-pointer'
      } ${
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

export const SettingsPage: React.FC = () => {
  const { user, logout, logoutAll, refreshUser } = useAuth();
  const { preference, setTheme } = useTheme();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<ApiClientError | Error | null>(null);

  const [account, setAccount] = useState<Account | null>(null);
  const [visibility, setVisibility] = useState<PublicSettings | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [securityLog, setSecurityLog] = useState<AuditEvent[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [githubConn, setGithubConn] = useState<GithubConnection | null>(null);

  // Email change & export state
  const [newEmail, setNewEmail] = useState('');
  const [emailChangePassword, setEmailChangePassword] = useState('');
  const [requestingEmailChange, setRequestingEmailChange] = useState(false);
  const [emailChangeSuccess, setEmailChangeSuccess] = useState<string | null>(null);
  const [emailChangeError, setEmailChangeError] = useState<string | null>(null);
  const [exportingData, setExportingData] = useState(false);
  const [exportSuccess, setExportSuccess] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);

  // Visibility save state
  const [savingVisibility, setSavingVisibility] = useState(false);
  const [visibilitySuccess, setVisibilitySuccess] = useState<string | null>(null);
  const [visibilityError, setVisibilityError] = useState<string | null>(null);

  // Theme preference state
  const [selectedTheme, setSelectedTheme] = useState<ThemePreference>(preference);
  const [savingTheme, setSavingTheme] = useState(false);
  const [themeSuccess, setThemeSuccess] = useState<string | null>(null);
  const [themeError, setThemeError] = useState<string | null>(null);

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Session & connections state
  const [revokingSessionId, setRevokingSessionId] = useState<string | null>(null);
  const [signingOutAll, setSigningOutAll] = useState(false);
  const [sessionFeedback, setSessionFeedback] = useState<string | null>(null);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [disconnectingProvider, setDisconnectingProvider] = useState<OAuthProvider | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [connectionSuccess, setConnectionSuccess] = useState<string | null>(null);
  const [disconnectingGithub, setDisconnectingGithub] = useState(false);
  const [githubError, setGithubError] = useState<string | null>(null);

  // Delete account modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const refreshAuditLog = useCallback(async () => {
    try {
      const logRes = await accountService.listSecurityLog({ page: 1, page_size: 10 });
      setSecurityLog(logRes.items);
    } catch {
      // Non-fatal refresh failure
    }
  }, []);

  const loadSettings = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [acctRes, visRes, prefRes, sessionsRes, logRes, connRes, ghRes] =
        await Promise.all([
          accountService.get(),
          profileService.getVisibility(),
          profileService.getPreferences(),
          authService.listSessions(),
          accountService.listSecurityLog({ page: 1, page_size: 10 }),
          accountService.listConnections(),
          githubService.getConnection(),
        ]);
      setAccount(acctRes);
      setVisibility(visRes);
      setSelectedTheme(prefRes.theme);
      setTheme(prefRes.theme);
      setSessions(sessionsRes.items);
      setSecurityLog(logRes.items);
      setConnections(connRes.items);
      setGithubConn(ghRes);
    } catch (err) {
      setLoadError(
        err instanceof Error
          ? err
          : new ApiClientError(500, 'INTERNAL_ERROR', 'Unable to load settings.'),
      );
    } finally {
      setLoading(false);
    }
  }, [setTheme]);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  // Handle email-change confirmation link token when visiting /workspace/settings?email_change_token=...
  useEffect(() => {
    const token = searchParams.get('email_change_token');
    if (!token) return;

    let active = true;
    (async () => {
      try {
        const updatedAcct = await accountService.confirmEmailChange(token);
        if (!active) return;
        setAccount(updatedAcct);
        setEmailChangeError(null);
        setEmailChangeSuccess(`Email updated and verified as ${updatedAcct.email}.`);
        setSearchParams({}, { replace: true });
        await refreshUser();
        await refreshAuditLog();
      } catch (err) {
        if (!active) return;
        setEmailChangeSuccess(null);
        setEmailChangeError(
          err instanceof ApiClientError
            ? err.message
            : 'Unable to verify this email change link.',
        );
        setSearchParams({}, { replace: true });
      }
    })();

    return () => {
      active = false;
    };
  }, [searchParams, setSearchParams, refreshUser, refreshAuditLog]);

  const handleRequestEmailChange = async (event: React.FormEvent) => {
    event.preventDefault();
    if (requestingEmailChange || !account) return;
    setEmailChangeSuccess(null);
    setEmailChangeError(null);

    const emailErr = validateEmail(newEmail);
    if (emailErr) {
      setEmailChangeError(emailErr);
      return;
    }
    if (account.has_password && !emailChangePassword) {
      setEmailChangeError('Enter your current password to request an email change.');
      return;
    }

    setRequestingEmailChange(true);
    try {
      const res = await accountService.requestEmailChange({
        new_email: newEmail.trim(),
        current_password: account.has_password ? emailChangePassword : undefined,
      });
      setNewEmail('');
      setEmailChangePassword('');
      setEmailChangeSuccess(res.message);
      if (res.pending_email) {
        setAccount((prev) => (prev ? { ...prev, pending_email: res.pending_email ?? prev.pending_email } : prev));
      }
      await refreshAuditLog();
    } catch (err) {
      setEmailChangeError(
        err instanceof ApiClientError
          ? err.message
          : 'Unable to request email change right now.',
      );
    } finally {
      setRequestingEmailChange(false);
    }
  };

  const handleExportData = async () => {
    if (exportingData) return;
    setExportingData(true);
    setExportSuccess(null);
    setExportError(null);
    try {
      const payload = await accountService.requestExport();
      const blob = new Blob([JSON.stringify(payload, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'folio360-data-export.json';
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setExportSuccess('Your JSON data export has downloaded.');
      await refreshAuditLog();
    } catch (err) {
      setExportError(
        err instanceof ApiClientError
          ? err.message
          : 'Unable to export account data right now.',
      );
    } finally {
      setExportingData(false);
    }
  };

  const handleSaveVisibility = async () => {
    if (!visibility || savingVisibility) return;
    setSavingVisibility(true);
    setVisibilitySuccess(null);
    setVisibilityError(null);
    try {
      const updated = await profileService.updateVisibility(visibility);
      setVisibility(updated);
      setVisibilitySuccess('Public profile visibility settings saved.');
    } catch (err) {
      setVisibilityError(
        err instanceof ApiClientError
          ? err.message
          : 'Unable to save visibility settings right now.',
      );
    } finally {
      setSavingVisibility(false);
    }
  };

  const handleThemeChange = async (nextTheme: ThemePreference) => {
    if (savingTheme) return;
    const prevTheme = selectedTheme;
    setSelectedTheme(nextTheme);
    setTheme(nextTheme);
    setSavingTheme(true);
    setThemeSuccess(null);
    setThemeError(null);
    try {
      const saved = await profileService.updatePreferences({ theme: nextTheme });
      setSelectedTheme(saved.theme);
      setTheme(saved.theme);
      setThemeSuccess(`Theme preference saved (${saved.theme}).`);
    } catch (err) {
      setSelectedTheme(prevTheme);
      setTheme(prevTheme);
      setThemeError(
        err instanceof ApiClientError
          ? err.message
          : 'Unable to save theme preference right now.',
      );
    } finally {
      setSavingTheme(false);
    }
  };

  const handleChangePassword = async (event: React.FormEvent) => {
    event.preventDefault();
    if (savingPassword) return;
    setPasswordSuccess(null);
    setPasswordError(null);

    if (!currentPassword) {
      setPasswordError('Current password is required.');
      return;
    }
    const newPassErr = validatePassword(newPassword);
    if (newPassErr) {
      setPasswordError(newPassErr);
      return;
    }
    const confirmErr = validateConfirmPassword(newPassword, confirmPassword);
    if (confirmErr) {
      setPasswordError(confirmErr);
      return;
    }

    setSavingPassword(true);
    try {
      await authService.changePassword({
        current_password: currentPassword,
        new_password: newPassword,
      });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordSuccess('Password updated. Other active sessions were signed out.');
      const refreshedSessions = await authService.listSessions();
      setSessions(refreshedSessions.items);
      await refreshUser();
      await refreshAuditLog();
    } catch (err) {
      setPasswordError(
        err instanceof ApiClientError
          ? err.message
          : 'Unable to update password right now.',
      );
    } finally {
      setSavingPassword(false);
    }
  };

  const handleRevokeSession = async (session: Session) => {
    if (revokingSessionId) return;
    setRevokingSessionId(session.id);
    setSessionFeedback(null);
    setSessionError(null);
    try {
      await authService.revokeSession(session.id);
      if (session.current) {
        await logoutAll();
        navigate('/');
        return;
      }
      setSessions((prev) => prev.filter((item) => item.id !== session.id));
      setSessionFeedback('Session revoked.');
      await refreshAuditLog();
    } catch (err) {
      setSessionError(
        err instanceof ApiClientError
          ? err.message
          : 'Unable to revoke session right now.',
      );
    } finally {
      setRevokingSessionId(null);
    }
  };

  const handleSignOutAll = async () => {
    if (signingOutAll) return;
    setSigningOutAll(true);
    setSessionError(null);
    try {
      await logoutAll();
      navigate('/');
    } catch (err) {
      setSessionError(
        err instanceof ApiClientError
          ? err.message
          : 'Unable to sign out all devices right now.',
      );
      setSigningOutAll(false);
    }
  };

  const handleDisconnectProvider = async (provider: OAuthProvider) => {
    if (disconnectingProvider) return;
    setDisconnectingProvider(provider);
    setConnectionError(null);
    setConnectionSuccess(null);
    try {
      await accountService.unlinkConnection(provider);
      setConnections((prev) => prev.filter((item) => item.provider !== provider));
      setConnectionSuccess(`Disconnected ${provider} sign-in provider.`);
      await refreshUser();
      await refreshAuditLog();
    } catch (err) {
      setConnectionError(
        err instanceof ApiClientError
          ? err.message
          : `Unable to disconnect ${provider} right now.`,
      );
    } finally {
      setDisconnectingProvider(null);
    }
  };

  const handleDisconnectGithub = async () => {
    if (disconnectingGithub) return;
    setDisconnectingGithub(true);
    setGithubError(null);
    try {
      await githubService.disconnect();
      setGithubConn({
        connected: false,
        username: null,
        avatar_url: null,
        connected_at: null,
      });
    } catch (err) {
      setGithubError(
        err instanceof ApiClientError
          ? err.message
          : 'Unable to disconnect GitHub right now.',
      );
    } finally {
      setDisconnectingGithub(false);
    }
  };

  const handleDeleteAccount = async (confirmPasswordValue?: string) => {
    if (deletingAccount) return;
    setDeletingAccount(true);
    setDeleteError(null);
    try {
      await accountService.deleteAccount({
        confirm: 'DELETE',
        current_password: confirmPasswordValue,
      });
      setDeleteModalOpen(false);
      await logout();
      navigate('/');
    } catch (err) {
      setDeleteError(
        err instanceof ApiClientError
          ? err.message
          : 'Unable to delete account right now.',
      );
      setDeletingAccount(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-[960px] px-6 py-10 md:px-10">
        <LoadingState label="Loading settings" />
      </div>
    );
  }

  if (loadError || !visibility || !account) {
    return (
      <div className="mx-auto max-w-[960px] px-6 py-10 md:px-10">
        <ErrorState error={loadError} onRetry={loadSettings} />
      </div>
    );
  }

  const hasPassword = account.has_password || Boolean(user?.has_password);

  return (
    <div className="mx-auto max-w-[960px] px-6 py-8 md:px-10 md:py-10">
      <div className="border-b border-[var(--border-subtle)] pb-6">
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--text-secondary)]">
          ACCOUNT &amp; PREFERENCES
        </p>
        <h1 className="mt-2 font-serif text-4xl text-[var(--text-primary)]">Settings</h1>
        <p className="mt-1.5 text-sm text-[var(--text-secondary)]">
          Manage your account security, active sessions, theme preferences, connected services, and
          public portfolio visibility.
        </p>
      </div>

      <div className="mt-8 space-y-8">
        {/* 1. Account Information, Email Change & Data Export */}
        <section
          aria-labelledby="settings-account-heading"
          className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-elevated)]/95 p-6"
        >
          <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-[var(--border-subtle)] pb-3">
            <div>
              <h2
                id="settings-account-heading"
                className="font-serif text-2xl text-[var(--text-primary)]"
              >
                Account
              </h2>
              <p className="mt-0.5 text-xs text-[var(--text-secondary)]">
                Your verified login identity, email change workflow, and personal data export.
              </p>
            </div>
            <Link
              to="/workspace/profile"
              className="inline-flex items-center gap-1 font-mono text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            >
              Edit Profile Identity
              <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          </div>

          <dl className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--text-secondary)]">
                LOGIN EMAIL
              </dt>
              <dd className="mt-1 truncate text-sm text-[var(--text-primary)]">{account.email}</dd>
            </div>
            <div>
              <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--text-secondary)]">
                EMAIL STATUS
              </dt>
              <dd className="mt-1 text-sm text-[var(--text-primary)]">
                {account.email_verified ? 'Verified' : 'Unverified'}
              </dd>
            </div>
            <div>
              <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--text-secondary)]">
                PASSWORD AUTH
              </dt>
              <dd className="mt-1 text-sm text-[var(--text-primary)]">
                {hasPassword ? 'Enabled' : 'OAuth-only'}
              </dd>
            </div>
          </dl>

          {account.pending_email && (
            <div className="mt-4 rounded-lg border border-[var(--border-accent)] bg-[var(--bg-secondary)]/60 px-4 py-3 text-xs text-[var(--text-primary)]">
              Pending email verification for{' '}
              <span className="font-mono font-medium">{account.pending_email}</span>. Your current
              login email remains active until you open the verification link.
            </div>
          )}

          {/* Email Change Form */}
          <div className="mt-6 border-t border-[var(--border-subtle)] pt-5">
            <h3 className="flex items-center gap-2 text-sm font-medium text-[var(--text-primary)]">
              <Mail className="h-4 w-4 text-[var(--text-secondary)]" />
              Change Email Address
            </h3>
            <form onSubmit={handleRequestEmailChange} noValidate className="mt-3 space-y-3">
              <div
                className={`grid grid-cols-1 gap-3 ${
                  hasPassword ? 'md:grid-cols-2' : 'md:grid-cols-1'
                }`}
              >
                <div>
                  <label htmlFor="settings-new-email" className={LABEL_CLASS}>
                    New Email Address
                  </label>
                  <input
                    id="settings-new-email"
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    disabled={requestingEmailChange}
                    placeholder="name@example.com"
                    className={INPUT_CLASS}
                  />
                </div>
                {hasPassword && (
                  <div>
                    <label htmlFor="settings-email-change-password" className={LABEL_CLASS}>
                      Current Password
                    </label>
                    <input
                      id="settings-email-change-password"
                      type="password"
                      autoComplete="current-password"
                      value={emailChangePassword}
                      onChange={(e) => setEmailChangePassword(e.target.value)}
                      disabled={requestingEmailChange}
                      className={INPUT_CLASS}
                    />
                  </div>
                )}
              </div>

              {emailChangeError && (
                <p
                  role="alert"
                  className="flex items-center gap-1.5 text-xs text-[var(--danger-text)]"
                >
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  <span>{emailChangeError}</span>
                </p>
              )}
              {emailChangeSuccess && (
                <p
                  role="status"
                  className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400"
                >
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                  <span>{emailChangeSuccess}</span>
                </p>
              )}

              <div className="flex justify-end">
                <PillButton
                  type="submit"
                  variant="secondary"
                  size="sm"
                  disabled={requestingEmailChange}
                >
                  {requestingEmailChange ? 'Sending confirmation…' : 'Request Email Change'}
                </PillButton>
              </div>
            </form>
          </div>

          {/* Data Export */}
          <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-[var(--border-subtle)] pt-5">
            <div>
              <h3 className="text-sm font-medium text-[var(--text-primary)]">Export Your Data</h3>
              <p className="mt-0.5 text-xs text-[var(--text-secondary)]">
                Download a JSON copy of your profile, portfolio records, and document metadata.
              </p>
              {exportError && (
                <p
                  role="alert"
                  className="mt-2 flex items-center gap-1.5 text-xs text-[var(--danger-text)]"
                >
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  <span>{exportError}</span>
                </p>
              )}
              {exportSuccess && (
                <p
                  role="status"
                  className="mt-2 flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400"
                >
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                  <span>{exportSuccess}</span>
                </p>
              )}
            </div>
            <PillButton
              variant="secondary"
              size="sm"
              disabled={exportingData}
              onClick={() => void handleExportData()}
            >
              <Download className="h-3.5 w-3.5" />
              {exportingData ? 'Preparing export…' : 'Export Data (JSON)'}
            </PillButton>
          </div>
        </section>

        {/* 2. Public Profile Visibility */}
        <section
          aria-labelledby="settings-visibility-heading"
          className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-elevated)]/95 p-6"
        >
          <div className="border-b border-[var(--border-subtle)] pb-3">
            <h2
              id="settings-visibility-heading"
              className="font-serif text-2xl text-[var(--text-primary)]"
            >
              Public Profile Visibility
            </h2>
            <p className="mt-0.5 text-xs text-[var(--text-secondary)]">
              Control whether your public portfolio URL is active and which sections visitors can see.
              Private documents and marksheets are never exposed publicly.
            </p>
          </div>

          <div className="mt-3 divide-y divide-[var(--border-subtle)]">
            <SettingsSwitchRow
              id="settings-public-enabled"
              label="Enable public profile"
              description="Allow visitors with your /@username URL to view your public portfolio."
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

            <SettingsSwitchRow
              id="settings-discoverable"
              label="Discoverable in Explore"
              description="Opt in to appear in public discovery directories when your public profile is enabled."
              checked={visibility.discoverable}
              disabled={!visibility.public_enabled}
              onChange={(val) =>
                setVisibility((prev) => (prev ? { ...prev, discoverable: val } : prev))
              }
            />

            <SettingsSwitchRow
              id="settings-show-location"
              label="Show location on public profile"
              description="Display city or region publicly when available."
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

            <SettingsSwitchRow
              id="settings-show-email"
              label="Show public contact email"
              description="Off by default. Exposes only an explicit public contact email, never your login email."
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

            <SettingsSwitchRow
              id="settings-show-phone"
              label="Show phone number on public profile"
              description="Off by default. Keep hidden unless you intend visitors to contact you by phone."
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

          <div className="mt-4 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-main)] p-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--text-secondary)]">
              VISIBLE PORTFOLIO SECTIONS
            </p>
            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3">
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
                      ? 'cursor-pointer text-[var(--text-primary)]'
                      : 'cursor-not-allowed text-[var(--text-secondary)] opacity-55'
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

          {visibilityError && (
            <p
              role="alert"
              className="mt-3 flex items-center gap-1.5 text-xs text-[var(--danger-text)]"
            >
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              <span>{visibilityError}</span>
            </p>
          )}
          {visibilitySuccess && (
            <p
              role="status"
              className="mt-3 flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400"
            >
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
              <span>{visibilitySuccess}</span>
            </p>
          )}

          <div className="mt-4 flex justify-end">
            <PillButton
              variant="primary"
              size="sm"
              disabled={savingVisibility}
              onClick={() => void handleSaveVisibility()}
            >
              {savingVisibility ? 'Saving visibility…' : 'Save Visibility'}
            </PillButton>
          </div>
        </section>

        {/* 3. Interface Preferences */}
        <section
          aria-labelledby="settings-preferences-heading"
          className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-elevated)]/95 p-6"
        >
          <div className="border-b border-[var(--border-subtle)] pb-3">
            <h2
              id="settings-preferences-heading"
              className="font-serif text-2xl text-[var(--text-primary)]"
            >
              Preferences
            </h2>
            <p className="mt-0.5 text-xs text-[var(--text-secondary)]">
              Choose your editorial appearance across sessions.
            </p>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            {(
              [
                { value: 'light', label: 'Light', icon: Sun },
                { value: 'dark', label: 'Dark', icon: Moon },
                { value: 'system', label: 'System', icon: Monitor },
              ] as const
            ).map((opt) => {
              const Icon = opt.icon;
              const active = selectedTheme === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  disabled={savingTheme}
                  onClick={() => void handleThemeChange(opt.value)}
                  className={`flex cursor-pointer items-center justify-between rounded-lg border px-4 py-3 text-sm transition-colors disabled:opacity-50 ${
                    active
                      ? 'border-[var(--text-primary)] bg-[var(--bg-secondary)] font-medium text-[var(--text-primary)]'
                      : 'border-[var(--border-subtle)] bg-[var(--bg-main)] text-[var(--text-secondary)] hover:border-[var(--border-medium)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <span>{opt.label}</span>
                  <Icon className="h-4 w-4" strokeWidth={1.65} />
                </button>
              );
            })}
          </div>

          {themeError && (
            <p
              role="alert"
              className="mt-3 flex items-center gap-1.5 text-xs text-[var(--danger-text)]"
            >
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              <span>{themeError}</span>
            </p>
          )}
          {themeSuccess && (
            <p
              role="status"
              className="mt-3 flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400"
            >
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
              <span>{themeSuccess}</span>
            </p>
          )}
        </section>

        {/* 4. Security: Password, Active Sessions & Audit Log */}
        <section
          aria-labelledby="settings-security-heading"
          className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-elevated)]/95 p-6"
        >
          <div className="border-b border-[var(--border-subtle)] pb-3">
            <h2
              id="settings-security-heading"
              className="font-serif text-2xl text-[var(--text-primary)]"
            >
              Security
            </h2>
            <p className="mt-0.5 text-xs text-[var(--text-secondary)]">
              Update your password, manage active sessions, and review recent security events.
            </p>
          </div>

          {/* Password change */}
          <div className="mt-5">
            <h3 className="flex items-center gap-2 text-sm font-medium text-[var(--text-primary)]">
              <Lock className="h-4 w-4 text-[var(--text-secondary)]" />
              Password
            </h3>

            {!hasPassword ? (
              <p className="mt-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-main)] px-4 py-3 text-xs text-[var(--text-secondary)]">
                This account uses OAuth sign-in and does not currently have a local password
                configured.
              </p>
            ) : (
              <form onSubmit={handleChangePassword} noValidate className="mt-3 space-y-3">
                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                  <div>
                    <label htmlFor="settings-current-password" className={LABEL_CLASS}>
                      Current Password
                    </label>
                    <input
                      id="settings-current-password"
                      type="password"
                      autoComplete="current-password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      disabled={savingPassword}
                      className={INPUT_CLASS}
                    />
                  </div>
                  <div>
                    <label htmlFor="settings-new-password" className={LABEL_CLASS}>
                      New Password
                    </label>
                    <input
                      id="settings-new-password"
                      type="password"
                      autoComplete="new-password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      disabled={savingPassword}
                      placeholder="12+ characters"
                      className={INPUT_CLASS}
                    />
                  </div>
                  <div>
                    <label htmlFor="settings-confirm-password" className={LABEL_CLASS}>
                      Confirm New Password
                    </label>
                    <input
                      id="settings-confirm-password"
                      type="password"
                      autoComplete="new-password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      disabled={savingPassword}
                      className={INPUT_CLASS}
                    />
                  </div>
                </div>

                {passwordError && (
                  <p
                    role="alert"
                    className="flex items-center gap-1.5 text-xs text-[var(--danger-text)]"
                  >
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                    <span>{passwordError}</span>
                  </p>
                )}
                {passwordSuccess && (
                  <p
                    role="status"
                    className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                    <span>{passwordSuccess}</span>
                  </p>
                )}

                <div className="flex justify-end">
                  <PillButton type="submit" variant="secondary" size="sm" disabled={savingPassword}>
                    {savingPassword ? 'Updating password…' : 'Update Password'}
                  </PillButton>
                </div>
              </form>
            )}
          </div>

          {/* Active Sessions */}
          <div className="mt-7 border-t border-[var(--border-subtle)] pt-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="flex items-center gap-2 text-sm font-medium text-[var(--text-primary)]">
                <Shield className="h-4 w-4 text-[var(--text-secondary)]" />
                Active Sessions ({sessions.length})
              </h3>
              <PillButton
                variant="secondary"
                size="sm"
                disabled={signingOutAll}
                onClick={() => void handleSignOutAll()}
              >
                <LogOut className="h-3.5 w-3.5" />
                {signingOutAll ? 'Signing out…' : 'Sign out all devices'}
              </PillButton>
            </div>

            {sessionError && (
              <p
                role="alert"
                className="mt-3 flex items-center gap-1.5 text-xs text-[var(--danger-text)]"
              >
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                <span>{sessionError}</span>
              </p>
            )}
            {sessionFeedback && (
              <p
                role="status"
                className="mt-3 flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400"
              >
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                <span>{sessionFeedback}</span>
              </p>
            )}

            {sessions.length === 0 ? (
              <p className="mt-3 text-xs text-[var(--text-secondary)]">
                No active refresh sessions found.
              </p>
            ) : (
              <ul className="mt-3 divide-y divide-[var(--border-subtle)] rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-main)]">
                {sessions.map((session) => (
                  <li
                    key={session.id}
                    className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-xs"
                  >
                    <div className="flex min-w-0 items-start gap-3">
                      <Laptop className="mt-0.5 h-4 w-4 shrink-0 text-[var(--text-secondary)]" />
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium text-[var(--text-primary)]">
                            {session.device_label}
                          </span>
                          <span className="font-mono text-[10px] uppercase text-[var(--text-secondary)]">
                            {session.client_type}
                          </span>
                          {session.current && (
                            <span className="rounded-full border border-[var(--border-accent)] bg-[var(--bg-secondary)] px-2 py-0.5 font-mono text-[10px] text-[var(--text-primary)]">
                              Current
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 font-mono text-[10px] text-[var(--text-secondary)]">
                          Last active: {formatDateTime(session.last_used_at)}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={revokingSessionId === session.id}
                      onClick={() => void handleRevokeSession(session)}
                      className="inline-flex cursor-pointer items-center gap-1 rounded-full border border-[var(--border-medium)] px-3 py-1 text-[11px] text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] disabled:opacity-50"
                    >
                      <Trash2 className="h-3 w-3" />
                      {revokingSessionId === session.id ? 'Revoking…' : 'Revoke'}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Security Audit Log */}
          <div className="mt-7 border-t border-[var(--border-subtle)] pt-5">
            <h3 className="flex items-center gap-2 text-sm font-medium text-[var(--text-primary)]">
              <History className="h-4 w-4 text-[var(--text-secondary)]" />
              Security Activity Log
            </h3>

            {securityLog.length === 0 ? (
              <p className="mt-3 text-xs text-[var(--text-secondary)]">
                No security events recorded yet.
              </p>
            ) : (
              <ul className="mt-3 divide-y divide-[var(--border-subtle)] rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-main)]">
                {securityLog.map((ev) => (
                  <li
                    key={ev.id}
                    className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 text-xs"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-[var(--text-primary)]">
                        {AUDIT_ACTION_LABELS[ev.action] ?? ev.action}
                      </p>
                      <p className="mt-0.5 font-mono text-[10px] text-[var(--text-secondary)]">
                        {[ev.device_label, ev.ip_address].filter(Boolean).join(' · ') ||
                          'Recorded event'}
                      </p>
                    </div>
                    <span className="shrink-0 font-mono text-[10px] text-[var(--text-secondary)]">
                      {formatDateTime(ev.created_at)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        {/* 5. Connected Accounts */}
        <section
          aria-labelledby="settings-connections-heading"
          className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-elevated)]/95 p-6"
        >
          <div className="border-b border-[var(--border-subtle)] pb-3">
            <h2
              id="settings-connections-heading"
              className="font-serif text-2xl text-[var(--text-primary)]"
            >
              Connected Accounts
            </h2>
            <p className="mt-0.5 text-xs text-[var(--text-secondary)]">
              OAuth sign-in providers and repository integrations linked to your account.
            </p>
          </div>

          {connectionError && (
            <p
              role="alert"
              className="mt-3 flex items-center gap-1.5 text-xs text-[var(--danger-text)]"
            >
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              <span>{connectionError}</span>
            </p>
          )}
          {connectionSuccess && (
            <p
              role="status"
              className="mt-3 flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400"
            >
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
              <span>{connectionSuccess}</span>
            </p>
          )}

          <div className="mt-4 divide-y divide-[var(--border-subtle)] rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-main)]">
            {(['google', 'github'] as const).map((provider) => {
              const linked = connections.find((c) => c.provider === provider);
              const isOnlyAuthMethod = !hasPassword && connections.length <= 1;
              return (
                <div
                  key={provider}
                  className="flex flex-wrap items-center justify-between gap-4 px-4 py-3 text-xs"
                >
                  <div>
                    <p className="font-medium capitalize text-[var(--text-primary)]">
                      {provider} Sign-In
                    </p>
                    <p className="text-[var(--text-secondary)]">
                      {linked
                        ? `${linked.provider_email || 'Linked'} · ${formatDateTime(linked.linked_at)}`
                        : 'Not linked — sign in with a matching verified email on the login page to link'}
                    </p>
                    {linked && isOnlyAuthMethod && (
                      <p className="mt-0.5 text-[11px] text-[var(--text-secondary)]">
                        Only active sign-in method; cannot disconnect without a password or another
                        provider.
                      </p>
                    )}
                  </div>
                  {linked ? (
                    <PillButton
                      variant="secondary"
                      size="sm"
                      disabled={isOnlyAuthMethod || disconnectingProvider === provider}
                      onClick={() => void handleDisconnectProvider(provider)}
                    >
                      {disconnectingProvider === provider ? 'Disconnecting…' : 'Disconnect'}
                    </PillButton>
                  ) : (
                    <span className="rounded-full border border-[var(--border-subtle)] px-2.5 py-0.5 font-mono text-[10px] text-[var(--text-secondary)]">
                      Not connected
                    </span>
                  )}
                </div>
              );
            })}

            <div className="flex flex-wrap items-center justify-between gap-4 px-4 py-3 text-xs">
              <div>
                <p className="font-medium text-[var(--text-primary)]">
                  GitHub Repository Import
                </p>
                <p className="text-[var(--text-secondary)]">
                  {githubConn?.connected
                    ? `Connected as @${githubConn.username}`
                    : 'Not connected for repository browsing'}
                </p>
              </div>
              {githubConn?.connected ? (
                <PillButton
                  variant="secondary"
                  size="sm"
                  disabled={disconnectingGithub}
                  onClick={() => void handleDisconnectGithub()}
                >
                  {disconnectingGithub ? 'Disconnecting…' : 'Disconnect'}
                </PillButton>
              ) : (
                <Link
                  to="/workspace/projects"
                  className="inline-flex items-center gap-1 font-mono text-xs text-[var(--text-primary)] hover:underline"
                >
                  Connect in Projects
                  <ExternalLink className="h-3.5 w-3.5" />
                </Link>
              )}
            </div>
          </div>

          {githubError && (
            <p
              role="alert"
              className="mt-3 flex items-center gap-1.5 text-xs text-[var(--danger-text)]"
            >
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              <span>{githubError}</span>
            </p>
          )}
        </section>

        {/* 6. Danger Zone — Account Deletion */}
        <section
          aria-labelledby="settings-danger-heading"
          className="rounded-xl border border-[var(--danger-border)] bg-[var(--surface-elevated)]/95 p-6"
        >
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2
                id="settings-danger-heading"
                className="font-serif text-2xl text-[var(--danger-text)]"
              >
                Danger Zone
              </h2>
              <p className="mt-0.5 text-xs text-[var(--text-secondary)]">
                Permanently delete your account, portfolio records, documents, and active sessions.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setDeleteError(null);
                setDeleteModalOpen(true);
              }}
              className="inline-flex h-9 cursor-pointer items-center justify-center rounded-full border border-[var(--danger-border)] bg-[var(--danger-bg)] px-4 text-xs font-medium text-[var(--danger-text)] transition-opacity hover:opacity-90"
            >
              Delete Account
            </button>
          </div>
        </section>
      </div>

      <DeleteAccountModal
        open={deleteModalOpen}
        hasPassword={hasPassword}
        deleting={deletingAccount}
        error={deleteError}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleDeleteAccount}
      />
    </div>
  );
};
