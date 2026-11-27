import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  ExternalLink,
  FolderGit2,
  GitBranch,
  Globe,
  Lock,
  Pencil,
  Plus,
  Search,
  Sparkles,
  Trash2,
  Unplug,
} from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { EmptyState, ErrorState, LoadingState } from '@/design/components/EditorialStates';
import { PillButton } from '@/design/components/PillButton';
import { StrandCanvas } from '@/design/strands/StrandCanvas';
import { githubService, projectsService } from '@/services/api';
import { API_CONFIG } from '@/services/config';
import type { ApiClientError } from '@/services/http';
import type {
  GithubConnection,
  GithubImportResult,
  Project,
  Visibility,
} from '@/types/api';
import { GitHubImportModal } from './GitHubImportModal';
import { ProjectFormModal } from './ProjectFormModal';
import { formatProjectPeriod, resolveProjectImageUrl } from './projectHelpers';

type VisibilityFilter = 'all' | 'public' | 'private';

export const ProjectsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [projects, setProjects] = useState<Project[]>([]);
  const [ghConnection, setGhConnection] = useState<GithubConnection>({
    connected: false,
    username: null,
    avatar_url: null,
    connected_at: null,
  });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<ApiClientError | Error | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [visibilityFilter, setVisibilityFilter] = useState<VisibilityFilter>('all');

  const [formOpen, setFormOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [importOpen, setImportOpen] = useState(false);

  const [connectingGithub, setConnectingGithub] = useState(false);
  const [disconnectingGithub, setDisconnectingGithub] = useState(false);
  const [togglingVisibilityId, setTogglingVisibilityId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [actionBanner, setActionBanner] = useState<{
    tone: 'success' | 'error';
    message: string;
  } | null>(null);

  const loadPortfolio = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [projectsRes, ghRes] = await Promise.allSettled([
        projectsService.list({ page: 1, page_size: 100 }),
        githubService.getConnection(),
      ]);
      if (projectsRes.status === 'rejected') {
        throw projectsRes.reason;
      }
      setProjects(projectsRes.value.items);
      if (ghRes.status === 'fulfilled') {
        setGhConnection(ghRes.value);
      }
    } catch (err) {
      setLoadError(err as ApiClientError | Error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPortfolio();
  }, [loadPortfolio]);

  useEffect(() => {
    const ghStatus = searchParams.get('github');
    if (!ghStatus) return;
    if (ghStatus === 'connected') {
      setActionBanner({
        tone: 'success',
        message: 'GitHub connected. You can now browse and import your repositories.',
      });
      void githubService.getConnection().then(setGhConnection).catch(() => {});
    } else if (ghStatus === 'error') {
      const reason = searchParams.get('reason') ?? 'authorization_failed';
      setActionBanner({
        tone: 'error',
        message: `GitHub connection was not completed (${reason.replace(/_/g, ' ')}).`,
      });
    }
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete('github');
    nextParams.delete('reason');
    setSearchParams(nextParams, { replace: true });
  }, [searchParams, setSearchParams]);

  const filteredProjects = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return projects.filter((proj) => {
      if (visibilityFilter !== 'all' && proj.visibility !== visibilityFilter) return false;
      if (!q) return true;
      return (
        proj.title.toLowerCase().includes(q) ||
        proj.summary.toLowerCase().includes(q) ||
        proj.category.toLowerCase().includes(q) ||
        proj.technologies.some((tech) => tech.toLowerCase().includes(q))
      );
    });
  }, [projects, searchQuery, visibilityFilter]);

  const publicCount = useMemo(
    () => projects.filter((item) => item.visibility === 'public').length,
    [projects],
  );
  const privateCount = projects.length - publicCount;

  const handleConnectGithub = async () => {
    if (connectingGithub) return;
    setConnectingGithub(true);
    setActionBanner(null);
    try {
      const redirectUri = `${window.location.origin}/workspace/projects`;
      const { authorization_url } = await githubService.connect(redirectUri);
      if (API_CONFIG.useMocks && authorization_url.startsWith(window.location.origin)) {
        await loadPortfolio();
        setActionBanner({
          tone: 'success',
          message: 'Mock GitHub account connected. You can browse sample repositories now.',
        });
        return;
      }
      window.location.assign(authorization_url);
    } catch (err) {
      setActionBanner({
        tone: 'error',
        message:
          err instanceof Error
            ? err.message
            : 'Unable to start GitHub connection right now.',
      });
    } finally {
      setConnectingGithub(false);
    }
  };

  const handleDisconnectGithub = async () => {
    if (disconnectingGithub) return;
    setDisconnectingGithub(true);
    setActionBanner(null);
    try {
      await githubService.disconnect();
      setGhConnection({
        connected: false,
        username: null,
        avatar_url: null,
        connected_at: null,
      });
      setActionBanner({
        tone: 'success',
        message: 'Disconnected GitHub account. Existing imported projects remain intact.',
      });
    } catch (err) {
      setActionBanner({
        tone: 'error',
        message:
          err instanceof Error
            ? err.message
            : 'Unable to disconnect GitHub right now.',
      });
    } finally {
      setDisconnectingGithub(false);
    }
  };

  const handleProjectSaved = async (saved: Project, mode: 'create' | 'edit') => {
    setFormOpen(false);
    setEditingProject(null);
    setProjects((prev) =>
      mode === 'edit'
        ? prev.map((item) => (item.id === saved.id ? saved : item))
        : [saved, ...prev],
    );
    setActionBanner({
      tone: 'success',
      message:
        mode === 'create'
          ? `Added "${saved.title}" to your portfolio.`
          : `Updated "${saved.title}".`,
    });
  };

  const handleImported = async (result: GithubImportResult) => {
    setImportOpen(false);
    if (result.created.length > 0) {
      setProjects((prev) => [...result.created, ...prev]);
    }
    const createdCount = result.created.length;
    const skippedCount = result.skipped.length;
    if (createdCount > 0) {
      setActionBanner({
        tone: 'success',
        message: `Imported ${createdCount} repositor${createdCount === 1 ? 'y' : 'ies'} as Private${
          skippedCount > 0 ? ` (${skippedCount} skipped as already imported)` : ''
        }.`,
      });
    } else if (skippedCount > 0) {
      setActionBanner({
        tone: 'error',
        message: `Skipped ${skippedCount} repositor${skippedCount === 1 ? 'y' : 'ies'}: ${result.skipped[0]?.reason ?? 'Already imported'}.`,
      });
    }
  };

  const handleToggleVisibility = async (project: Project) => {
    if (togglingVisibilityId) return;
    const nextVisibility: Visibility = project.visibility === 'public' ? 'private' : 'public';
    setTogglingVisibilityId(project.id);
    setActionBanner(null);
    try {
      const updated = await projectsService.update(project.id, {
        visibility: nextVisibility,
      });
      setProjects((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      setActionBanner({
        tone: 'success',
        message: `"${updated.title}" is now ${updated.visibility}.`,
      });
    } catch (err) {
      setActionBanner({
        tone: 'error',
        message:
          err instanceof Error
            ? err.message
            : 'Unable to update project visibility.',
      });
    } finally {
      setTogglingVisibilityId(null);
    }
  };

  const handleDeleteConfirm = async (project: Project) => {
    if (deletingId) return;
    setDeletingId(project.id);
    setActionBanner(null);
    try {
      await projectsService.remove(project.id);
      setProjects((prev) => prev.filter((item) => item.id !== project.id));
      setConfirmDeleteId(null);
      setActionBanner({
        tone: 'success',
        message: `Deleted "${project.title}" from your portfolio.`,
      });
    } catch (err) {
      setActionBanner({
        tone: 'error',
        message:
          err instanceof Error
            ? err.message
            : 'Unable to delete this project right now.',
      });
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8 pb-12 sm:px-6">
        <LoadingState label="Loading your portfolio…" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8 pb-12 sm:px-6">
        <ErrorState error={loadError} onRetry={() => void loadPortfolio()} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-7 px-4 py-8 pb-16 sm:px-6">
      {/* Portfolio Header */}
      <header className="flex flex-col gap-5 border-b border-[var(--border-subtle)] pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--text-secondary)]">
            MODULE 05 &amp; 06 — PROJECTS PORTFOLIO
          </p>
          <h1 className="mt-2 font-serif text-3xl text-[var(--text-primary)] sm:text-4xl">
            My Work
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--text-secondary)]">
            Showcase engineering builds, research, and side projects. Add projects manually or
            connect GitHub to import repositories privately before choosing what to publish.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          {ghConnection.connected ? (
            <>
              <span className="inline-flex h-10 items-center gap-2 rounded-full border border-[var(--border-subtle)] bg-[var(--surface-elevated)] px-3.5 text-xs text-[var(--text-primary)]">
                <GitBranch className="h-3.5 w-3.5 text-[var(--accent)]" />
                <span className="font-mono">@{ghConnection.username}</span>
              </span>
              <PillButton variant="secondary" onClick={() => setImportOpen(true)}>
                <FolderGit2 className="h-4 w-4" />
                Import from GitHub
              </PillButton>
              <PillButton
                variant="ghost"
                size="sm"
                onClick={() => void handleDisconnectGithub()}
                disabled={disconnectingGithub}
                aria-label="Disconnect GitHub account"
              >
                <Unplug className="h-3.5 w-3.5" />
                {disconnectingGithub ? 'Disconnecting…' : 'Disconnect'}
              </PillButton>
            </>
          ) : (
            <PillButton
              variant="secondary"
              onClick={() => void handleConnectGithub()}
              disabled={connectingGithub}
            >
              <GitBranch className="h-4 w-4" />
              {connectingGithub ? 'Connecting…' : 'Connect GitHub'}
            </PillButton>
          )}

          <PillButton
            onClick={() => {
              setEditingProject(null);
              setFormOpen(true);
              setActionBanner(null);
            }}
          >
            <Plus className="h-4 w-4" />
            Add Project
          </PillButton>
        </div>
      </header>

      {/* Action Feedback Banner */}
      {actionBanner && (
        <div
          role="status"
          className={`flex items-center justify-between gap-3 rounded-lg border px-4 py-3 text-sm ${
            actionBanner.tone === 'success'
              ? 'border-[var(--border-accent)] bg-[var(--surface-elevated)] text-[var(--text-primary)]'
              : 'border-[var(--danger-border)] bg-[var(--danger-bg)] text-[var(--danger-text)]'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-[var(--accent)]" />
            <span>{actionBanner.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionBanner(null)}
            className="cursor-pointer font-mono text-[11px] uppercase tracking-[0.1em] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Search & Visibility Filters */}
      {projects.length > 0 && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-secondary)]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search projects or tech…"
              aria-label="Search projects"
              className="h-10 w-full rounded-full border border-[var(--border-medium)] bg-[var(--surface-elevated)] pl-9 pr-4 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]/60 focus:border-[var(--text-primary)] focus:outline-none"
            />
          </div>

          <div className="inline-flex self-start rounded-full border border-[var(--border-medium)] bg-[var(--surface-elevated)] p-1">
            {(
              [
                { key: 'all', label: `All (${projects.length})` },
                { key: 'public', label: `Public (${publicCount})` },
                { key: 'private', label: `Private (${privateCount})` },
              ] as const
            ).map((tab) => {
              const active = visibilityFilter === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setVisibilityFilter(tab.key)}
                  className={`cursor-pointer rounded-full px-3.5 py-1.5 font-mono text-[11px] uppercase tracking-[0.08em] transition-colors ${
                    active
                      ? 'bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)]'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Portfolio Grid or Empty State */}
      {projects.length === 0 ? (
        <EmptyState
          title="No projects in your portfolio yet"
          description="Create a project manually with cover imagery, links, and tech stack tags, or connect GitHub to import existing repositories privately."
          action={
            <div className="flex flex-wrap items-center justify-center gap-3">
              <PillButton
                onClick={() => {
                  setEditingProject(null);
                  setFormOpen(true);
                }}
              >
                <Plus className="h-4 w-4" />
                Add Project
              </PillButton>
              {ghConnection.connected ? (
                <PillButton variant="secondary" onClick={() => setImportOpen(true)}>
                  <FolderGit2 className="h-4 w-4" />
                  Import from GitHub
                </PillButton>
              ) : (
                <PillButton
                  variant="secondary"
                  onClick={() => void handleConnectGithub()}
                  disabled={connectingGithub}
                >
                  <GitBranch className="h-4 w-4" />
                  Connect GitHub
                </PillButton>
              )}
            </div>
          }
        />
      ) : filteredProjects.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[var(--border-medium)] px-6 py-12 text-center text-sm text-[var(--text-secondary)]">
          No projects match your current filter.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredProjects.map((project) => {
            const cover = project.images?.[0] ?? null;
            const isDeleting = deletingId === project.id;
            const isConfirming = confirmDeleteId === project.id;
            const isToggling = togglingVisibilityId === project.id;
            const primaryLink = project.live_url || project.github_url;
            const visibleTechs = project.technologies.slice(0, 5);
            const extraTechCount = project.technologies.length - visibleTechs.length;

            return (
              <article
                key={project.id}
                className="group flex flex-col overflow-hidden rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-elevated)] transition-colors hover:border-[var(--border-medium)]"
              >
                {/* Cover Image */}
                <div className="relative aspect-[16/10] w-full overflow-hidden border-b border-[var(--border-subtle)] bg-[var(--bg-secondary)]">
                  {cover ? (
                    <img
                      src={resolveProjectImageUrl(cover.url)}
                      alt={cover.alt || project.title}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                    />
                  ) : (
                    <div className="relative flex h-full w-full items-end p-4">
                      <StrandCanvas
                        variant="dashboard-card"
                        className="absolute inset-0 h-full w-full opacity-75"
                      />
                      <span className="relative z-10 rounded-full border border-[var(--border-medium)] bg-[var(--bg-main)]/85 px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--text-secondary)]">
                        {project.category}
                      </span>
                    </div>
                  )}

                  <div className="absolute right-3 top-3 flex items-center gap-1.5">
                    {project.featured && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-[var(--border-accent)] bg-[var(--bg-main)]/90 px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.1em] text-[var(--text-primary)]">
                        <Sparkles className="h-2.5 w-2.5 text-[var(--accent)]" />
                        Featured
                      </span>
                    )}
                    {project.github_import && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-[var(--border-medium)] bg-[var(--bg-main)]/90 px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.1em] text-[var(--text-secondary)]">
                        <GitBranch className="h-2.5 w-2.5" />
                        GitHub
                      </span>
                    )}
                  </div>
                </div>

                {/* Card Body */}
                <div className="flex flex-1 flex-col p-5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--text-secondary)] truncate">
                      {formatProjectPeriod(project)}
                    </span>
                    <button
                      type="button"
                      disabled={isToggling}
                      onClick={() => void handleToggleVisibility(project)}
                      aria-label={`Toggle visibility for ${project.title} (currently ${project.visibility})`}
                      className={`inline-flex cursor-pointer items-center gap-1 rounded-full border px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.1em] transition-colors disabled:opacity-50 ${
                        project.visibility === 'public'
                          ? 'border-[var(--border-accent)] bg-[var(--nav-active-bg)] text-[var(--text-primary)]'
                          : 'border-[var(--border-subtle)] bg-[var(--surface-muted)] text-[var(--text-secondary)] hover:border-[var(--border-medium)]'
                      }`}
                    >
                      {project.visibility === 'public' ? (
                        <Globe className="h-2.5 w-2.5" />
                      ) : (
                        <Lock className="h-2.5 w-2.5" />
                      )}
                      {project.visibility}
                    </button>
                  </div>

                  <h2 className="mt-2 font-serif text-2xl leading-snug text-[var(--text-primary)]">
                    {project.title}
                  </h2>

                  <p className="mt-2 text-sm leading-relaxed text-[var(--text-secondary)] line-clamp-3">
                    {project.summary}
                  </p>

                  {visibleTechs.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-1.5">
                      {visibleTechs.map((tech) => (
                        <span
                          key={tech}
                          className="rounded-full border border-[var(--border-subtle)] bg-[var(--surface-muted)] px-2.5 py-0.5 font-mono text-[10px] text-[var(--text-secondary)]"
                        >
                          {tech}
                        </span>
                      ))}
                      {extraTechCount > 0 && (
                        <span className="rounded-full border border-[var(--border-subtle)] px-2 py-0.5 font-mono text-[10px] text-[var(--text-secondary)]">
                          +{extraTechCount}
                        </span>
                      )}
                    </div>
                  )}

                  {isConfirming && (
                    <div
                      role="alertdialog"
                      aria-label={`Confirm deletion of ${project.title}`}
                      className="mt-4 rounded-lg border border-[var(--danger-border)] bg-[var(--danger-bg)] p-3 text-xs"
                    >
                      <p className="text-[var(--danger-text)]">
                        Delete <strong>{project.title}</strong>?
                      </p>
                      <div className="mt-2.5 flex items-center justify-end gap-2">
                        <PillButton
                          variant="secondary"
                          size="sm"
                          disabled={isDeleting}
                          onClick={() => setConfirmDeleteId(null)}
                        >
                          Cancel
                        </PillButton>
                        <button
                          type="button"
                          disabled={isDeleting}
                          onClick={() => void handleDeleteConfirm(project)}
                          className="inline-flex h-8 cursor-pointer items-center justify-center rounded-full border border-[var(--danger-border)] bg-[var(--danger-text)] px-3.5 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50"
                        >
                          {isDeleting ? 'Deleting…' : 'Confirm'}
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="mt-auto flex items-center justify-between gap-2 border-t border-[var(--border-subtle)] pt-4 mt-5">
                    <div className="flex flex-wrap items-center gap-3 text-xs">
                      {project.live_url && (
                        <a
                          href={project.live_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 font-medium text-[var(--text-primary)] hover:text-[var(--accent)]"
                        >
                          Live
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                      {project.github_url && (
                        <a
                          href={project.github_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                        >
                          GitHub
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                      {!primaryLink && (
                        <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-[var(--text-secondary)]">
                          No external link
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingProject(project);
                          setFormOpen(true);
                          setActionBanner(null);
                        }}
                        aria-label={`Edit ${project.title}`}
                        className="cursor-pointer rounded-full p-2 text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setConfirmDeleteId((curr) =>
                            curr === project.id ? null : project.id,
                          )
                        }
                        aria-label={`Delete ${project.title}`}
                        className="cursor-pointer rounded-full p-2 text-[var(--danger-text)] transition-colors hover:bg-[var(--danger-bg)]"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <ProjectFormModal
        open={formOpen}
        editingProject={editingProject}
        onClose={() => {
          if (!formOpen) return;
          setFormOpen(false);
          setEditingProject(null);
        }}
        onSaved={handleProjectSaved}
      />

      <GitHubImportModal
        open={importOpen}
        username={ghConnection.username}
        onClose={() => setImportOpen(false)}
        onImported={handleImported}
      />
    </div>
  );
};
