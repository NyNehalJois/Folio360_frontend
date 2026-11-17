import React from 'react';
import {
  ArrowRight,
  ArrowUpRight,
  FileText,
  FolderGit2,
  GraduationCap,
  Plus,
  Upload,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/app/AuthContext';
import { ErrorState, LoadingState } from '@/design/components/EditorialStates';
import { StrandCanvas } from '@/design/strands/StrandCanvas';
import { useApiQuery } from '@/hooks/useApiQuery';
import { analyticsService } from '@/services/api';

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function formatRelativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const hours = Math.max(1, Math.floor(diffMs / 3_600_000));
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

const CONTINUE_ICONS: Record<string, React.ComponentType<{ className?: string; strokeWidth?: number }>> =
  {
    education_records: GraduationCap,
    projects_update: FolderGit2,
    resume_generated: FileText,
  };

export const OverviewPage: React.FC = () => {
  const { user } = useAuth();
  const { data, loading, error, refetch } = useApiQuery(
    () => analyticsService.getDashboard(),
    [],
  );

  if (loading) {
    return (
      <div className="mx-auto max-w-[1120px] px-6 py-10 md:px-10">
        <LoadingState label="Loading dashboard overview" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="mx-auto max-w-[1120px] px-6 py-10 md:px-10">
        <ErrorState error={error} onRetry={refetch} />
      </div>
    );
  }

  const quickActions = [
    { label: 'Add Record', to: '/workspace/education', icon: Plus },
    { label: 'Upload Document', to: '/workspace/documents', icon: Upload },
    { label: 'Generate Resume', to: '/workspace/resumes', icon: FileText },
    { label: 'Share Profile', to: '/workspace/sharing', icon: ArrowUpRight },
  ];

  return (
    <div className="relative min-h-[calc(100vh-68px)] overflow-hidden">
      {/* Shared full-bleed StrandCanvas background matching the public homepage animation */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 h-full w-full"
      >
        <StrandCanvas variant="hero" opacityScale={0.72} className="h-full w-full" />
      </div>

      <div className="relative z-10 mx-auto max-w-[1120px] px-6 py-10 md:px-10 md:py-12">
        {/* Personalized Greeting */}
        <div className="max-w-xl">
          <h1 className="font-serif text-4xl leading-tight tracking-[-0.01em] text-[var(--text-primary)] md:text-[2.85rem]">
            {getGreeting()}, {data.first_name}.
          </h1>
          <p className="mt-1.5 text-sm text-[var(--text-secondary)]">
            Continue building your digital identity.
          </p>
        </div>

        {/* Editorial 3-column layout matching Image 1 & 2 */}
        <div className="mt-10 grid grid-cols-1 gap-8 lg:grid-cols-12">
          {/* Left vertical strand artwork panel */}
          <div className="hidden lg:block lg:col-span-3">
            <div className="relative h-[340px] w-full overflow-hidden rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)]">
              <StrandCanvas variant="dashboard-card" className="h-full w-full" />
            </div>
          </div>

          {/* Center column: Progress + Continue Working On + Recent Activity */}
          <div className="lg:col-span-5 flex flex-col gap-9">
            {/* Profile Completion */}
            <section aria-labelledby="progress-heading">
              <div className="flex items-baseline justify-between">
                <h2
                  id="progress-heading"
                  className="font-serif text-[1.4rem] text-[var(--text-primary)]"
                >
                  Your Progress
                </h2>
                <span className="font-mono text-sm font-medium text-[var(--text-primary)]">
                  {data.completeness.percent}%
                </span>
              </div>

              <div
                role="progressbar"
                aria-valuenow={data.completeness.percent}
                aria-valuemin={0}
                aria-valuemax={100}
                className="mt-3 h-2 w-full overflow-hidden rounded-full bg-[var(--progress-track)]"
              >
                <div
                  className="h-full rounded-full bg-[var(--progress-fill)] transition-all duration-500"
                  style={{ width: `${data.completeness.percent}%` }}
                />
              </div>
            </section>

            {/* Continue Working On */}
            <section aria-labelledby="continue-heading">
              <h2
                id="continue-heading"
                className="font-serif text-[1.4rem] text-[var(--text-primary)]"
              >
                Continue Working On
              </h2>

              <div className="mt-3 flex flex-col gap-2.5">
                {data.continue_items.map((item) => {
                  const Icon = CONTINUE_ICONS[item.key] ?? FileText;
                  return (
                    <Link
                      key={item.key}
                      to={item.action_route}
                      className="group flex items-center justify-between rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-main)] px-4 py-3 text-sm transition-colors hover:border-[var(--border-medium)] hover:bg-[var(--bg-secondary)]/55"
                    >
                      <span className="flex items-center gap-3 text-[var(--text-primary)]">
                        <Icon
                          className="h-4 w-4 text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]"
                          strokeWidth={1.6}
                        />
                        <span>{item.label}</span>
                      </span>
                      <ArrowRight className="h-4 w-4 text-[var(--text-secondary)] transition-transform group-hover:translate-x-0.5 group-hover:text-[var(--text-primary)]" />
                    </Link>
                  );
                })}
              </div>
            </section>

            {/* Recent Activity — Clean editorial list */}
            <section aria-labelledby="activity-heading">
              <div className="flex items-baseline justify-between border-b border-[var(--border-subtle)] pb-2.5">
                <h2
                  id="activity-heading"
                  className="font-serif text-[1.35rem] text-[var(--text-primary)]"
                >
                  Recent Activity
                </h2>
                <span className="font-mono text-[11px] uppercase tracking-wider text-[var(--text-secondary)]">
                  {data.counts.projects} projects · {data.counts.documents} docs
                </span>
              </div>

              <ul className="divide-y divide-[var(--border-subtle)]">
                {data.recent_activity.map((event) => (
                  <li
                    key={event.id}
                    className="flex items-baseline justify-between gap-4 py-3 text-sm"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-[var(--text-primary)]">{event.label}</p>
                      <p className="mt-0.5 font-mono text-[10px] uppercase tracking-wider text-[var(--text-secondary)]">
                        {event.verb} · {event.entity_type.replace('_', ' ')}
                      </p>
                    </div>
                    <span className="shrink-0 font-mono text-[11px] text-[var(--text-secondary)]">
                      {formatRelativeTime(event.created_at)}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          </div>

          {/* Right column: Quick Actions */}
          <div className="lg:col-span-4 lg:border-l lg:border-[var(--border-subtle)] lg:pl-8">
            <section aria-labelledby="quick-actions-heading">
              <h2
                id="quick-actions-heading"
                className="font-serif text-[1.4rem] text-[var(--text-primary)]"
              >
                Quick Actions
              </h2>

              <div className="mt-3 divide-y divide-[var(--border-subtle)] border-b border-[var(--border-subtle)]">
                {quickActions.map((action) => {
                  const Icon = action.icon;
                  return (
                    <Link
                      key={action.label}
                      to={action.to}
                      className="group flex items-center justify-between py-3.5 text-sm text-[var(--text-primary)] transition-colors hover:text-[var(--accent)]"
                    >
                      <span>{action.label}</span>
                      <Icon
                        className="h-4 w-4 text-[var(--text-secondary)] transition-colors group-hover:text-[var(--text-primary)]"
                        strokeWidth={1.6}
                      />
                    </Link>
                  );
                })}
              </div>

              <div className="mt-8 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-secondary)]/55 p-4">
                <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--text-secondary)]">
                  PUBLIC PROFILE
                </p>
                <p className="mt-1.5 font-mono text-xs text-[var(--text-primary)]">
                  folio360.in/@{user?.slug || data.first_name.toLowerCase()}
                </p>
                <Link
                  to="/workspace/sharing"
                  className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-[var(--text-primary)] hover:underline"
                >
                  Manage visibility &amp; QR
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};
