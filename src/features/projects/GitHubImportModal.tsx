import React, { useCallback, useEffect, useState } from 'react';
import {
  AlertCircle,
  Check,
  ExternalLink,
  GitBranch,
  Loader2,
  Lock,
  RefreshCw,
  Search,
  Star,
  X,
} from 'lucide-react';
import { PillButton } from '@/design/components/PillButton';
import { githubService } from '@/services/api/github.service';
import type { GithubImportResult, GithubRepo } from '@/types/api';

interface GitHubImportModalProps {
  open: boolean;
  username: string | null;
  onClose: () => void;
  onImported: (result: GithubImportResult) => void | Promise<void>;
}

export const GitHubImportModal: React.FC<GitHubImportModalProps> = ({
  open,
  username,
  onClose,
  onImported,
}) => {
  const [repos, setRepos] = useState<GithubRepo[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedNames, setSelectedNames] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  const loadRepos = useCallback(async (q?: string) => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await githubService.listRepositories({
        page: 1,
        page_size: 50,
        q: q?.trim() || undefined,
      });
      setRepos(res.items);
    } catch (err) {
      setLoadError(
        err instanceof Error
          ? err.message
          : 'Unable to load repositories from GitHub.',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    setSelectedNames([]);
    setSearchQuery('');
    setImportError(null);
    void loadRepos();
  }, [open, loadRepos]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !importing) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, importing, onClose]);

  if (!open) return null;

  const toggleSelect = (fullName: string) => {
    setSelectedNames((prev) =>
      prev.includes(fullName)
        ? prev.filter((item) => item !== fullName)
        : [...prev, fullName],
    );
  };

  const handleImport = async () => {
    if (importing || selectedNames.length === 0) return;
    setImporting(true);
    setImportError(null);
    try {
      const result = await githubService.importRepositories(
        selectedNames.map((full_name) => ({ full_name })),
      );
      await onImported(result);
    } catch (err) {
      setImportError(
        err instanceof Error
          ? err.message
          : 'Unable to import selected repositories.',
      );
    } finally {
      setImporting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 backdrop-blur-[2px]"
      role="presentation"
      onClick={(event) => {
        if (event.target === event.currentTarget && !importing) {
          onClose();
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="github-import-title"
        className="flex max-h-[88vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-[var(--border-medium)] bg-[var(--surface-elevated)] shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4 border-b border-[var(--border-subtle)] px-6 py-4">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--text-secondary)]">
              GitHub Portfolio Sync {username ? `· @${username}` : ''}
            </p>
            <h2
              id="github-import-title"
              className="mt-1 font-serif text-2xl text-[var(--text-primary)]"
            >
              Import repositories
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={importing}
            aria-label="Close GitHub repository browser"
            className="rounded-full p-2 text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)] disabled:opacity-50"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="border-b border-[var(--border-subtle)] bg-[var(--bg-secondary)]/35 px-6 py-3">
          <p className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
            <Lock className="h-3.5 w-3.5 shrink-0 text-[var(--accent)]" />
            <span>
              Imported repositories are saved as <strong>Private</strong> on Folio360. Public
              GitHub repositories are never published automatically.
            </span>
          </p>
        </div>

        <div className="border-b border-[var(--border-subtle)] px-6 py-3">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void loadRepos(searchQuery);
            }}
            className="flex gap-2"
          >
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-secondary)]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter repositories by name, topic, or language…"
                className="h-10 w-full rounded-md border border-[var(--border-medium)] bg-[var(--bg-main)] pl-9 pr-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]/60 focus:border-[var(--text-primary)] focus:outline-none"
              />
            </div>
            <PillButton type="submit" variant="secondary" disabled={loading}>
              Search
            </PillButton>
          </form>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {importError && (
            <div
              role="alert"
              className="mb-4 flex items-start gap-2.5 rounded-lg border border-[var(--danger-border)] bg-[var(--danger-bg)] px-4 py-3 text-xs text-[var(--danger-text)]"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{importError}</span>
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center gap-2.5 py-12 text-sm text-[var(--text-secondary)]">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Loading your GitHub repositories…</span>
            </div>
          ) : loadError ? (
            <div className="rounded-lg border border-[var(--danger-border)] bg-[var(--danger-bg)] p-4 text-xs text-[var(--danger-text)]">
              <p>{loadError}</p>
              <div className="mt-3">
                <PillButton
                  variant="secondary"
                  size="sm"
                  onClick={() => void loadRepos(searchQuery)}
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Retry
                </PillButton>
              </div>
            </div>
          ) : repos.length === 0 ? (
            <div className="rounded-lg border border-dashed border-[var(--border-medium)] px-5 py-10 text-center text-sm text-[var(--text-secondary)]">
              No matching repositories found in your connected GitHub account.
            </div>
          ) : (
            <ul className="space-y-2.5">
              {repos.map((repo) => {
                const checked = selectedNames.includes(repo.full_name);
                const disabled = repo.already_imported;
                const langs = Object.keys(repo.languages).slice(0, 3);
                return (
                  <li key={repo.full_name}>
                    <label
                      className={`flex items-start gap-3 rounded-lg border p-3.5 transition-colors ${
                        disabled
                          ? 'cursor-not-allowed border-[var(--border-subtle)] bg-[var(--bg-secondary)]/30 opacity-70'
                          : checked
                            ? 'cursor-pointer border-[var(--border-accent)] bg-[var(--bg-secondary)]/55'
                            : 'cursor-pointer border-[var(--border-subtle)] bg-[var(--bg-main)] hover:border-[var(--border-medium)]'
                      }`}
                    >
                      <input
                        type="checkbox"
                        disabled={disabled}
                        checked={disabled ? true : checked}
                        onChange={() => !disabled && toggleSelect(repo.full_name)}
                        className="mt-1 h-4 w-4 rounded border-[var(--border-medium)] accent-[var(--accent)]"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex flex-wrap items-center gap-2 min-w-0">
                            <span className="inline-flex items-center gap-1.5 font-medium text-sm text-[var(--text-primary)] truncate">
                              <GitBranch className="h-3.5 w-3.5 shrink-0 text-[var(--text-secondary)]" />
                              {repo.full_name}
                            </span>
                            <span className="rounded-full border border-[var(--border-subtle)] px-2 py-0.5 font-mono text-[10px] uppercase text-[var(--text-secondary)]">
                              {repo.private ? 'GitHub Private' : 'GitHub Public'}
                            </span>
                            {repo.already_imported && (
                              <span className="rounded-full border border-[var(--border-accent)] bg-[var(--nav-active-bg)] px-2 py-0.5 font-mono text-[10px] uppercase text-[var(--text-primary)]">
                                Imported
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 font-mono text-[11px] text-[var(--text-secondary)]">
                            <span className="inline-flex items-center gap-1">
                              <Star className="h-3 w-3" />
                              {repo.stars}
                            </span>
                            <a
                              href={repo.html_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              aria-label={`Open ${repo.full_name} on GitHub`}
                              className="hover:text-[var(--text-primary)]"
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                            </a>
                          </div>
                        </div>

                        {repo.description && (
                          <p className="mt-1 text-xs text-[var(--text-secondary)] line-clamp-2">
                            {repo.description}
                          </p>
                        )}

                        {(langs.length > 0 || repo.topics.length > 0) && (
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {[...langs, ...repo.topics.slice(0, 3)].slice(0, 5).map((tag) => (
                              <span
                                key={tag}
                                className="rounded-full border border-[var(--border-subtle)] bg-[var(--surface-muted)] px-2 py-0.5 font-mono text-[10px] text-[var(--text-secondary)]"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </label>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border-subtle)] bg-[var(--bg-secondary)]/30 px-6 py-3.5">
          <span className="font-mono text-xs text-[var(--text-secondary)]">
            {selectedNames.length} selected
          </span>
          <div className="flex items-center gap-2.5">
            <PillButton variant="secondary" onClick={onClose} disabled={importing}>
              Cancel
            </PillButton>
            <PillButton
              onClick={() => void handleImport()}
              disabled={importing || selectedNames.length === 0}
            >
              <Check className="h-4 w-4" />
              {importing
                ? 'Importing…'
                : `Import selected${selectedNames.length > 0 ? ` (${selectedNames.length})` : ''}`}
            </PillButton>
          </div>
        </div>
      </div>
    </div>
  );
};
