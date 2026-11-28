import React, { useCallback, useEffect, useState } from 'react';
import {
  ArrowRight,
  ArrowUpRight,
  Award,
  Briefcase,
  FileText,
  FolderGit2,
  FolderOpen,
  GraduationCap,
  Settings,
  Sparkles,
  Upload,
  User,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/app/AuthContext';
import { ErrorState, LoadingState } from '@/design/components/EditorialStates';
import { StrandCanvas } from '@/design/strands/StrandCanvas';
import {
  formatDocumentCategory,
  formatFileSize,
} from '@/features/documents/DocumentUploadWidget';
import { DocumentUploadModal } from '@/features/overview/DocumentUploadModal';
import { resolveAvatarUrl } from '@/features/profile/profileHelpers';
import { useApiQuery } from '@/hooks/useApiQuery';
import { analyticsService, documentsService } from '@/services/api';
import type { Document } from '@/types/api';

const MAX_OVERVIEW_ACTIVITY = 4;

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

const CONTINUE_ICONS: Record<
  string,
  React.ComponentType<{ className?: string; strokeWidth?: number }>
> = {
  profile_setup: User,
  profile_details: User,
  education_records: GraduationCap,
  projects_update: FolderGit2,
  skills_added: Sparkles,
  experience_added: Briefcase,
  certificates_added: Award,
  documents_vault: FolderOpen,
  resume_generated: FileText,
};

interface QuickActionItem {
  label: string;
  to?: string;
  onClick?: () => void;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
}

export const OverviewPage: React.FC = () => {
  const { user } = useAuth();
  const { data, loading, error, refetch } = useApiQuery(
    () => analyticsService.getDashboard(),
    [],
  );
  const [recentDocs, setRecentDocs] = useState<Document[]>([]);
  const [docsTotal, setDocsTotal] = useState<number | null>(null);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);

  const loadRecentDocs = useCallback(async () => {
    try {
      const res = await documentsService.list({ page: 1, page_size: 4 });
      setRecentDocs(res.items);
      setDocsTotal(res.total);
    } catch {
      // Non-fatal if documents fail to load separately
    }
  }, []);

  useEffect(() => {
    void loadRecentDocs();
  }, [loadRecentDocs]);

  const handleDocumentUploaded = useCallback(
    (doc: Document) => {
      setRecentDocs((prev) => [doc, ...prev.filter((item) => item.id !== doc.id)].slice(0, 4));
      setDocsTotal((prev) => (prev ?? data?.counts.documents ?? 0) + 1);
      void loadRecentDocs();
      void refetch();
    },
    [data?.counts.documents, loadRecentDocs, refetch],
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

  const avatarUrl = resolveAvatarUrl(user?.avatar_url ?? data.avatar_url ?? null);
  const displayName = user?.full_name || data.first_name;
  const profileSlug = data.slug || user?.slug || '';
  const visibleActivities = data.recent_activity.slice(0, MAX_OVERVIEW_ACTIVITY);

  const quickActions: QuickActionItem[] = [
    {
      label: 'Upload Document',
      onClick: () => setUploadModalOpen(true),
      icon: Upload,
    },
    { label: 'Education', to: '/workspace/education', icon: GraduationCap },
    { label: 'Document Vault', to: '/workspace/documents', icon: FolderOpen },
    { label: 'Projects', to: '/workspace/projects', icon: FolderGit2 },
    { label: 'Skills', to: '/workspace/skills', icon: Sparkles },
    { label: 'Certificates & Achievements', to: '/workspace/certificates', icon: Award },
    { label: 'Experience', to: '/workspace/experience', icon: Briefcase },
    { label: 'Generate Resume', to: '/workspace/resumes', icon: FileText },
    { label: 'Profile Settings', to: '/workspace/profile', icon: Settings },
  ];

  return (
    <div className="relative min-h-[calc(100vh-68px)] overflow-hidden">
      <div className="relative z-10 mx-auto max-w-[1120px] px-6 py-8 md:px-10 md:py-10">
        {/* Personalized Greeting */}
        <div className="max-w-xl">
          <h1 className="font-serif text-4xl leading-tight tracking-[-0.01em] text-[var(--text-primary)] md:text-[2.75rem]">
            {getGreeting()}, {data.first_name}.
          </h1>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Continue building your digital identity.
          </p>
        </div>

        {/* Editorial 3-column layout */}
        <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-12">
          {/* Left profile visual card: uploaded photo replaces the card strand animation; removing restores it */}
          <div className="hidden lg:block lg:col-span-3">
            <div className="relative h-[320px] w-full overflow-hidden rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)]">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={`${displayName} profile portrait`}
                  className="h-full w-full object-cover"
                />
              ) : (
                <StrandCanvas variant="dashboard-card" className="h-full w-full" />
              )}
            </div>
          </div>

          {/* Center column: Progress + Continue Working On + Compact Recent Activity */}
          <div className="lg:col-span-5 flex flex-col gap-7">
            {/* Profile Completion */}
            <section aria-labelledby="progress-heading">
              <div className="flex items-baseline justify-between">
                <h2
                  id="progress-heading"
                  className="font-serif text-[1.35rem] text-[var(--text-primary)]"
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
                className="mt-2.5 h-2 w-full overflow-hidden rounded-full bg-[var(--progress-track)]"
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
                className="font-serif text-[1.35rem] text-[var(--text-primary)]"
              >
                Continue Working On
              </h2>

              <div className="mt-2.5 flex flex-col gap-2">
                {data.continue_items.length === 0 ? (
                  <p className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-main)] px-4 py-2.5 text-sm text-[var(--text-secondary)]">
                    All core portfolio sections have records. Keep adding updates as you grow.
                  </p>
                ) : (
                  data.continue_items.map((item) => {
                    const Icon = CONTINUE_ICONS[item.key] ?? FileText;
                    return (
                      <Link
                        key={item.key}
                        to={item.action_route}
                        className="group flex items-center justify-between rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-main)] px-4 py-2.5 text-sm transition-colors hover:border-[var(--border-medium)] hover:bg-[var(--bg-secondary)]/55"
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
                  })
                )}
              </div>
            </section>

            {/* Compact Recent Activity */}
            <section aria-labelledby="activity-heading">
              <div className="flex items-baseline justify-between border-b border-[var(--border-subtle)] pb-2">
                <h2
                  id="activity-heading"
                  className="font-serif text-[1.35rem] text-[var(--text-primary)]"
                >
                  Recent Activity
                </h2>
                <span className="font-mono text-[11px] uppercase tracking-wider text-[var(--text-secondary)]">
                  {data.counts.projects} projects · {docsTotal ?? data.counts.documents} docs
                </span>
              </div>

              {visibleActivities.length === 0 ? (
                <p className="py-3 text-sm text-[var(--text-secondary)]">
                  No recent activity yet. Add records or upload a document to get started.
                </p>
              ) : (
                <ul className="divide-y divide-[var(--border-subtle)]">
                  {visibleActivities.map((event) => (
                    <li
                      key={event.id}
                      className="flex items-center justify-between gap-4 py-2 text-sm"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-[var(--text-primary)]">{event.label}</p>
                        <p className="font-mono text-[10px] uppercase tracking-wider text-[var(--text-secondary)]">
                          {event.verb} · {event.entity_type.replace('_', ' ')}
                        </p>
                      </div>
                      <span className="shrink-0 font-mono text-[11px] text-[var(--text-secondary)]">
                        {formatRelativeTime(event.created_at)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          {/* Right column: Quick Actions + Public Profile */}
          <div className="lg:col-span-4 lg:border-l lg:border-[var(--border-subtle)] lg:pl-8">
            <section aria-labelledby="quick-actions-heading">
              <h2
                id="quick-actions-heading"
                className="font-serif text-[1.35rem] text-[var(--text-primary)]"
              >
                Quick Actions
              </h2>

              <div className="mt-2.5 divide-y divide-[var(--border-subtle)] border-b border-[var(--border-subtle)]">
                {quickActions.map((action) => {
                  const Icon = action.icon;
                  const rowClass =
                    'group flex w-full items-center justify-between py-2.5 text-left text-sm text-[var(--text-primary)] transition-colors hover:text-[var(--accent)] cursor-pointer';
                  if (action.to) {
                    return (
                      <Link key={action.label} to={action.to} className={rowClass}>
                        <span>{action.label}</span>
                        <Icon
                          className="h-4 w-4 shrink-0 text-[var(--text-secondary)] transition-colors group-hover:text-[var(--text-primary)]"
                          strokeWidth={1.6}
                        />
                      </Link>
                    );
                  }
                  return (
                    <button
                      key={action.label}
                      type="button"
                      onClick={action.onClick}
                      className={rowClass}
                    >
                      <span>{action.label}</span>
                      <Icon
                        className="h-4 w-4 shrink-0 text-[var(--text-secondary)] transition-colors group-hover:text-[var(--text-primary)]"
                        strokeWidth={1.6}
                      />
                    </button>
                  );
                })}
              </div>

              <div className="mt-6 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-secondary)]/55 p-4">
                <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--text-secondary)]">
                  PUBLIC PROFILE
                </p>
                <p className="mt-1.5 font-mono text-xs text-[var(--text-primary)]">
                  {profileSlug ? `folio360.in/@${profileSlug}` : 'Username not set yet'}
                </p>
                <Link
                  to="/workspace/profile"
                  className="mt-2.5 inline-flex items-center gap-1.5 text-xs font-medium text-[var(--text-primary)] hover:underline"
                >
                  Manage profile &amp; visibility
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </section>
          </div>
        </div>

        {/* Compact Recent Documents */}
        <section
          aria-labelledby="recent-docs-heading"
          className="mt-8 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-elevated)]/95 p-5"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2
              id="recent-docs-heading"
              className="font-serif text-[1.25rem] text-[var(--text-primary)]"
            >
              Recent Documents ({docsTotal ?? recentDocs.length})
            </h2>
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => setUploadModalOpen(true)}
                className="inline-flex cursor-pointer items-center gap-1.5 font-mono text-xs text-[var(--text-primary)] hover:text-[var(--accent)]"
              >
                <Upload className="h-3.5 w-3.5" />
                Upload
              </button>
              <Link
                to="/workspace/documents"
                className="inline-flex items-center gap-1 font-mono text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              >
                Open Vault
                <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>

          {recentDocs.length === 0 ? (
            <p className="mt-3 text-xs text-[var(--text-secondary)]">
              No documents uploaded yet.
            </p>
          ) : (
            <ul className="mt-3.5 grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
              {recentDocs.map((doc) => (
                <li
                  key={doc.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-main)] px-3.5 py-2.5 text-xs"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium text-[var(--text-primary)]">{doc.title}</p>
                    <p className="mt-0.5 truncate font-mono text-[10px] text-[var(--text-secondary)]">
                      {formatDocumentCategory(doc.category)} · {formatFileSize(doc.size_bytes)}
                    </p>
                  </div>
                  <FileText className="h-4 w-4 shrink-0 text-[var(--text-secondary)]" />
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <DocumentUploadModal
        open={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        onUploaded={handleDocumentUploaded}
      />
    </div>
  );
};
