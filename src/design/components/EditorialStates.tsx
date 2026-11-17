import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { PillButton } from './PillButton';
import type { ApiClientError } from '@/services/http';

export const LoadingState: React.FC<{ label?: string }> = ({
  label = 'Loading workspace…',
}) => (
  <div className="flex flex-col gap-4 py-10" role="status" aria-live="polite">
    <div className="h-4 w-44 rounded bg-[var(--bg-secondary)] animate-pulse" />
    <div className="h-3 w-72 rounded bg-[var(--bg-secondary)] animate-pulse" />
    <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="h-24 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-secondary)]/60 animate-pulse" />
      <div className="h-24 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-secondary)]/60 animate-pulse" />
    </div>
    <span className="sr-only">{label}</span>
  </div>
);

export const ErrorState: React.FC<{
  error: ApiClientError | Error | null;
  onRetry?: () => void;
}> = ({ error, onRetry }) => (
  <div
    role="alert"
    className="rounded-lg border border-[var(--danger-border)] bg-[var(--danger-bg)] p-5 text-sm"
  >
    <div className="flex items-start gap-3">
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--danger-text)]" />
      <div className="flex-1">
        <p className="font-medium text-[var(--danger-text)]">Unable to load data</p>
        <p className="mt-1 text-[var(--text-secondary)]">
          {error?.message || 'An unexpected error occurred while contacting the service.'}
        </p>
        {onRetry && (
          <div className="mt-3">
            <PillButton variant="secondary" size="sm" onClick={onRetry}>
              <RefreshCw className="h-3.5 w-3.5" />
              Try again
            </PillButton>
          </div>
        )}
      </div>
    </div>
  </div>
);

export const EmptyState: React.FC<{
  title: string;
  description: string;
  action?: React.ReactNode;
}> = ({ title, description, action }) => (
  <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-secondary)]/50 p-8 text-center">
    <h3 className="font-serif text-2xl text-[var(--text-primary)]">{title}</h3>
    <p className="mx-auto mt-2 max-w-md text-sm text-[var(--text-secondary)]">{description}</p>
    {action && <div className="mt-5 flex justify-center">{action}</div>}
  </div>
);
