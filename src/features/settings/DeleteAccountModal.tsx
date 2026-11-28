import React, { useEffect, useState } from 'react';
import { AlertCircle, AlertTriangle, X } from 'lucide-react';
import { PillButton } from '@/design/components/PillButton';

interface DeleteAccountModalProps {
  open: boolean;
  hasPassword: boolean;
  deleting: boolean;
  error: string | null;
  onClose: () => void;
  onConfirm: (currentPassword?: string) => Promise<void>;
}

export const DeleteAccountModal: React.FC<DeleteAccountModalProps> = ({
  open,
  hasPassword,
  deleting,
  error,
  onClose,
  onConfirm,
}) => {
  const [confirmText, setConfirmText] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setConfirmText('');
    setCurrentPassword('');
    setLocalError(null);

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !deleting) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, deleting, onClose]);

  if (!open) return null;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (deleting) return;
    setLocalError(null);

    if (confirmText.trim() !== 'DELETE') {
      setLocalError('Type DELETE in all caps to confirm permanent account deletion.');
      return;
    }
    if (hasPassword && !currentPassword) {
      setLocalError('Enter your current password to confirm account deletion.');
      return;
    }
    await onConfirm(hasPassword ? currentPassword : undefined);
  };

  const displayError = localError || error;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 backdrop-blur-[2px]"
      role="presentation"
      onClick={(event) => {
        if (event.target === event.currentTarget && !deleting) {
          onClose();
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-account-modal-title"
        className="flex w-full max-w-lg flex-col overflow-hidden rounded-xl border border-[var(--danger-border)] bg-[var(--surface-elevated)] shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4 border-b border-[var(--border-subtle)] px-6 py-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-1 h-5 w-5 shrink-0 text-[var(--danger-text)]" />
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--danger-text)]">
                PERMANENT ACTION
              </p>
              <h2
                id="delete-account-modal-title"
                className="mt-1 font-serif text-2xl text-[var(--text-primary)]"
              >
                Delete Account
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={deleting}
            aria-label="Close delete account dialog"
            className="cursor-pointer rounded-full p-2 text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)] disabled:opacity-50"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate className="space-y-4 px-6 py-5">
          <p className="text-xs leading-relaxed text-[var(--text-secondary)]">
            Deleting your Folio360 account is permanent and cannot be undone. All profile details,
            education records, projects, skills, certificates, achievements, experience, uploaded
            documents, and active sessions will be permanently removed.
          </p>

          {displayError && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-lg border border-[var(--danger-border)] bg-[var(--danger-bg)] px-3.5 py-2.5 text-xs text-[var(--danger-text)]"
            >
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>{displayError}</span>
            </div>
          )}

          <div>
            <label
              htmlFor="delete-account-confirm-input"
              className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--text-secondary)]"
            >
              Type DELETE to confirm
            </label>
            <input
              id="delete-account-confirm-input"
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              disabled={deleting}
              placeholder="DELETE"
              className="h-10 w-full rounded-lg border border-[var(--border-medium)] bg-[var(--bg-main)] px-3.5 text-sm text-[var(--text-primary)] focus:border-[var(--danger-text)] focus:outline-none disabled:opacity-50"
            />
          </div>

          {hasPassword && (
            <div>
              <label
                htmlFor="delete-account-password-input"
                className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--text-secondary)]"
              >
                Current Password
              </label>
              <input
                id="delete-account-password-input"
                type="password"
                autoComplete="current-password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                disabled={deleting}
                className="h-10 w-full rounded-lg border border-[var(--border-medium)] bg-[var(--bg-main)] px-3.5 text-sm text-[var(--text-primary)] focus:border-[var(--danger-text)] focus:outline-none disabled:opacity-50"
              />
            </div>
          )}

          <div className="flex items-center justify-end gap-3 border-t border-[var(--border-subtle)] pt-4">
            <PillButton
              type="button"
              variant="secondary"
              size="sm"
              disabled={deleting}
              onClick={onClose}
            >
              Cancel
            </PillButton>
            <button
              type="submit"
              disabled={deleting || confirmText.trim() !== 'DELETE'}
              className="inline-flex h-8 cursor-pointer items-center justify-center rounded-full border border-[var(--danger-border)] bg-[var(--danger-bg)] px-4 text-xs font-medium text-[var(--danger-text)] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {deleting ? 'Deleting account…' : 'Permanently Delete Account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
