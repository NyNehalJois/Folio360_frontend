import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { PillButton } from '@/design/components/PillButton';
import { ErrorState, LoadingState } from '@/design/components/EditorialStates';
import { useApiQuery } from '@/hooks/useApiQuery';

interface ModuleScaffoldPageProps {
  sectionCode: string;
  title: string;
  description: string;
  contractEndpoints: string[];
  loadCount?: () => Promise<number>;
}

export const ModuleScaffoldPage: React.FC<ModuleScaffoldPageProps> = ({
  sectionCode,
  title,
  description,
  contractEndpoints,
  loadCount,
}) => {
  const { data: count, loading, error, refetch } = useApiQuery(
    async () => (loadCount ? loadCount() : null),
    [title],
  );

  return (
    <div className="mx-auto max-w-[1040px] px-6 py-10 md:px-10 md:py-12">
      <div className="border-b border-[var(--border-subtle)] pb-6">
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--text-secondary)]">
          {sectionCode}
        </p>
        <h1 className="mt-2 font-serif text-4xl text-[var(--text-primary)]">{title}</h1>
        <p className="mt-2 max-w-2xl text-sm text-[var(--text-secondary)]">{description}</p>
      </div>

      {loading ? (
        <LoadingState label={`Checking ${title} service`} />
      ) : error ? (
        <div className="mt-6">
          <ErrorState error={error} onRetry={refetch} />
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-1 gap-8 md:grid-cols-12">
          <div className="md:col-span-7 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)]/50 p-6">
            <p className="font-mono text-[11px] uppercase tracking-wider text-[var(--accent)]">
              PHASE 1 — NEXT MODULE MILESTONE
            </p>
            <h2 className="mt-2 font-serif text-2xl text-[var(--text-primary)]">
              Service foundation connected
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-[var(--text-secondary)]">
              This workspace route is wired to the typed API service layer and mock adapter. The
              full interactive UI for {title} will be built in the next approved milestone after
              foundation review.
            </p>
            {count !== null && (
              <p className="mt-4 font-mono text-xs text-[var(--text-primary)]">
                Mock records currently available via API service: {count}
              </p>
            )}
            <div className="mt-6">
              <PillButton to="/workspace" variant="secondary" size="sm">
                <ArrowLeft className="h-3.5 w-3.5" />
                Back to Overview
              </PillButton>
            </div>
          </div>

          <div className="md:col-span-5 rounded-xl border border-[var(--border-subtle)] p-6">
            <p className="font-mono text-[11px] uppercase tracking-wider text-[var(--text-secondary)]">
              CONTRACT ENDPOINTS (REV 2)
            </p>
            <ul className="mt-4 divide-y divide-[var(--border-subtle)] font-mono text-xs text-[var(--text-primary)]">
              {contractEndpoints.map((ep) => (
                <li key={ep} className="py-2.5">
                  {ep}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};
