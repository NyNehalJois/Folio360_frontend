import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Briefcase,
  ExternalLink,
  Eye,
  Globe,
  LayoutGrid,
  List,
  Loader2,
  Lock,
  MapPin,
  Pencil,
  Plus,
  Search,
  Star,
  Trash2,
} from 'lucide-react';
import { EmptyState, ErrorState, LoadingState } from '@/design/components/EditorialStates';
import { PillButton } from '@/design/components/PillButton';
import { DocumentThumbnail } from '@/features/certificates/DocumentThumbnail';
import { experienceService } from '@/services/api';
import type { ApiClientError } from '@/services/http';
import type { Experience, ExperienceType, Visibility } from '@/types/api';
import { ExperienceDetailsModal } from './ExperienceDetailsModal';
import { ExperienceFormModal } from './ExperienceFormModal';
import {
  EXPERIENCE_TYPE_OPTIONS,
  formatExperienceDateRange,
  formatExperienceDuration,
  formatExperienceLocation,
  getExperienceTypeLabel,
} from './experienceHelpers';

type VisibilityFilter = 'all' | 'public' | 'private';
type SortMode = 'featured' | 'newest' | 'role';
type ViewMode = 'timeline' | 'grid';

export const ExperiencePage: React.FC = () => {
  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<ApiClientError | Error | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<ExperienceType | 'all'>('all');
  const [visibilityFilter, setVisibilityFilter] = useState<VisibilityFilter>('all');
  const [sortMode, setSortMode] = useState<SortMode>('featured');
  const [viewMode, setViewMode] = useState<ViewMode>('timeline');

  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Experience | null>(null);
  const [detailsItem, setDetailsItem] = useState<Experience | null>(null);

  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [actionBanner, setActionBanner] = useState<{
    tone: 'success' | 'error';
    message: string;
  } | null>(null);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await experienceService.list({ page: 1, page_size: 100 });
      setExperiences(res.items ?? []);
    } catch (err) {
      setLoadError(err as ApiClientError | Error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const counts = useMemo(
    () => ({
      total: experiences.length,
      current: experiences.filter((exp) => exp.is_current).length,
      publicCount: experiences.filter((exp) => exp.visibility === 'public').length,
      featuredCount: experiences.filter((exp) => exp.featured).length,
    }),
    [experiences],
  );

  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = experiences.filter((exp) => {
      if (typeFilter !== 'all' && exp.type !== typeFilter) return false;
      if (visibilityFilter !== 'all' && exp.visibility !== visibilityFilter) return false;
      if (!q) return true;
      const haystack = [
        exp.role,
        exp.organization,
        exp.location ?? '',
        exp.description ?? '',
        ...(exp.highlights ?? []),
        ...(exp.skills ?? []).map((s) => s.name),
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });

    list.sort((a, b) => {
      if (sortMode === 'role') {
        return a.role.localeCompare(b.role);
      }
      if (sortMode === 'featured') {
        const featDiff = Number(Boolean(b.featured)) - Number(Boolean(a.featured));
        if (featDiff !== 0) return featDiff;
        const currentDiff = Number(Boolean(b.is_current)) - Number(Boolean(a.is_current));
        if (currentDiff !== 0) return currentDiff;
      }
      return b.start_date.localeCompare(a.start_date);
    });
    return list;
  }, [experiences, searchQuery, typeFilter, visibilityFilter, sortMode]);

  const hasActiveFilters =
    searchQuery.trim().length > 0 || typeFilter !== 'all' || visibilityFilter !== 'all';

  const handleSaved = async (_saved: Experience, mode: 'create' | 'edit') => {
    setActionBanner({
      tone: 'success',
      message: mode === 'create' ? 'Experience added to timeline.' : 'Experience updated.',
    });
    await loadAll();
  };

  const handleToggleVisibility = async (item: Experience) => {
    if (togglingId) return;
    const nextVis: Visibility = item.visibility === 'public' ? 'private' : 'public';
    setTogglingId(item.id);
    setActionBanner(null);
    try {
      const updated = await experienceService.update(item.id, { visibility: nextVis });
      setExperiences((prev) => prev.map((row) => (row.id === item.id ? updated : row)));
      if (detailsItem?.id === item.id) setDetailsItem(updated);
      setActionBanner({
        tone: 'success',
        message:
          nextVis === 'public'
            ? `"${item.role}" is now visible on your public profile.`
            : `"${item.role}" is now private.`,
      });
    } catch (err) {
      const apiErr = err as ApiClientError;
      setActionBanner({
        tone: 'error',
        message: apiErr?.message || 'Failed to update visibility.',
      });
    } finally {
      setTogglingId(null);
    }
  };

  const handleToggleFeatured = async (item: Experience) => {
    if (togglingId) return;
    const nextFeatured = !item.featured;
    setTogglingId(item.id);
    setActionBanner(null);
    try {
      const updated = await experienceService.update(item.id, { featured: nextFeatured });
      setExperiences((prev) => prev.map((row) => (row.id === item.id ? updated : row)));
      if (detailsItem?.id === item.id) setDetailsItem(updated);
    } catch (err) {
      const apiErr = err as ApiClientError;
      setActionBanner({
        tone: 'error',
        message: apiErr?.message || 'Failed to update featured status.',
      });
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = async (item: Experience) => {
    if (deletingId) return;
    setDeletingId(item.id);
    setActionBanner(null);
    try {
      await experienceService.remove(item.id);
      setExperiences((prev) => prev.filter((row) => row.id !== item.id));
      if (detailsItem?.id === item.id) setDetailsItem(null);
      setConfirmDeleteId(null);
      setActionBanner({
        tone: 'success',
        message: `"${item.role}" deleted. Any attached Document Vault files remain safely in your Vault.`,
      });
    } catch (err) {
      const apiErr = err as ApiClientError;
      setActionBanner({
        tone: 'error',
        message: apiErr?.message || 'Failed to delete experience entry.',
      });
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-[1120px] px-6 py-10 md:px-10">
        <LoadingState label="Loading experience timeline…" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="mx-auto max-w-[1120px] px-6 py-10 md:px-10">
        <ErrorState error={loadError} onRetry={loadAll} />
      </div>
    );
  }

  const renderCard = (exp: Experience) => {
    const firstDoc = exp.documents?.[0] ?? null;
    const extraDocs = Math.max(0, (exp.documents?.length ?? 0) - 1);
    const dateRange = formatExperienceDateRange(exp.start_date, exp.end_date, exp.is_current);
    const duration = formatExperienceDuration(exp.start_date, exp.end_date, exp.is_current);
    const locationText = formatExperienceLocation(exp);
    const isDeleting = deletingId === exp.id;
    const isToggling = togglingId === exp.id;

    return (
      <article
        key={exp.id}
        className="group relative rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-elevated)] p-5 shadow-xs transition-colors hover:border-[var(--border-medium)]"
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-main)] px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--text-secondary)]">
                <Briefcase className="h-3 w-3" />
                {getExperienceTypeLabel(exp.type)}
              </span>
              {exp.is_current && (
                <span className="inline-flex items-center rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.1em] text-emerald-700 dark:text-emerald-300">
                  Current
                </span>
              )}
              {exp.featured && (
                <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.1em] text-amber-600 dark:text-amber-300">
                  <Star className="h-3 w-3 fill-current" /> Featured
                </span>
              )}
              <button
                type="button"
                disabled={isToggling}
                onClick={() => void handleToggleVisibility(exp)}
                title="Toggle public profile visibility"
                className="inline-flex cursor-pointer items-center gap-1 rounded-full border border-[var(--border-subtle)] px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.1em] text-[var(--text-secondary)] transition-colors hover:border-[var(--border-medium)] hover:text-[var(--text-primary)] disabled:opacity-50"
              >
                {exp.visibility === 'public' ? (
                  <Globe className="h-3 w-3 text-[var(--accent)]" />
                ) : (
                  <Lock className="h-3 w-3" />
                )}
                {exp.visibility}
              </button>
            </div>

            <h3 className="mt-2.5 font-serif text-xl font-normal text-[var(--text-primary)]">
              {exp.role}
            </h3>

            <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-[var(--text-secondary)]">
              {exp.organization_url ? (
                <a
                  href={exp.organization_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-medium text-[var(--text-primary)] hover:text-[var(--accent)] hover:underline"
                >
                  {exp.organization}
                  <ExternalLink className="h-3 w-3" />
                </a>
              ) : (
                <span className="font-medium text-[var(--text-primary)]">{exp.organization}</span>
              )}
              <span className="font-mono text-xs">
                {dateRange}
                {duration ? ` · ${duration}` : ''}
              </span>
              {locationText && (
                <span className="inline-flex items-center gap-1 text-xs">
                  <MapPin className="h-3 w-3" />
                  {locationText}
                </span>
              )}
            </div>

            {exp.description && (
              <p className="mt-2.5 line-clamp-2 text-sm leading-relaxed text-[var(--text-secondary)]">
                {exp.description}
              </p>
            )}

            {exp.highlights && exp.highlights.length > 0 && (
              <ul className="mt-2.5 list-disc space-y-1 pl-4 text-xs text-[var(--text-secondary)]">
                {exp.highlights.slice(0, 3).map((hl, idx) => (
                  <li key={idx} className="text-[var(--text-primary)]/90">
                    {hl}
                  </li>
                ))}
                {exp.highlights.length > 3 && (
                  <li className="list-none font-mono text-[10px] uppercase tracking-[0.1em] text-[var(--text-secondary)]">
                    +{exp.highlights.length - 3} more highlight
                    {exp.highlights.length - 3 > 1 ? 's' : ''}
                  </li>
                )}
              </ul>
            )}

            {exp.skills && exp.skills.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {exp.skills.slice(0, 6).map((skill) => (
                  <span
                    key={skill.id}
                    className="rounded-full border border-[var(--border-subtle)] bg-[var(--bg-main)] px-2.5 py-0.5 text-[11px] text-[var(--text-secondary)]"
                  >
                    {skill.name}
                  </span>
                ))}
                {exp.skills.length > 6 && (
                  <span className="px-1.5 py-0.5 font-mono text-[10px] text-[var(--text-secondary)]">
                    +{exp.skills.length - 6}
                  </span>
                )}
              </div>
            )}
          </div>

          {firstDoc && (
            <div className="shrink-0 sm:pt-1">
              <DocumentThumbnail
                doc={firstDoc}
                extraCount={extraDocs}
                size="card"
                onPreviewClick={() => setDetailsItem(exp)}
              />
            </div>
          )}
        </div>

        {confirmDeleteId === exp.id ? (
          <div
            role="alertdialog"
            aria-label={`Confirm deletion of ${exp.role}`}
            className="mt-4 flex flex-col gap-2.5 rounded-lg border border-[var(--danger-border)] bg-[var(--danger-bg)] p-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <p className="text-xs text-[var(--danger-text)]">
              Remove <strong>{exp.role}</strong> at {exp.organization}? Linked Vault documents will not be deleted.
            </p>
            <div className="flex items-center gap-2 shrink-0">
              <PillButton
                type="button"
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
                onClick={() => void handleDelete(exp)}
                className="inline-flex h-8 cursor-pointer items-center justify-center gap-1.5 rounded-full border border-[var(--danger-border)] bg-[var(--danger-text)] px-3.5 text-xs font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {isDeleting && <Loader2 className="h-3 w-3 animate-spin" />}
                Delete
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-[var(--border-subtle)] pt-3">
            <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--text-secondary)]">
              {exp.documents?.length
                ? `${exp.documents.length} document${exp.documents.length > 1 ? 's' : ''}`
                : 'No evidence attached'}
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setDetailsItem(exp)}
                className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-full border border-[var(--border-subtle)] px-3 text-xs text-[var(--text-secondary)] transition-colors hover:border-[var(--border-medium)] hover:text-[var(--text-primary)]"
              >
                <Eye className="h-3.5 w-3.5" /> Details
              </button>
              <button
                type="button"
                disabled={isToggling}
                onClick={() => void handleToggleFeatured(exp)}
                title={exp.featured ? 'Remove featured pin' : 'Feature on top'}
                className={`inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border transition-colors ${
                  exp.featured
                    ? 'border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-300'
                    : 'border-[var(--border-subtle)] text-[var(--text-secondary)] hover:border-[var(--border-medium)] hover:text-[var(--text-primary)]'
                }`}
              >
                <Star className={`h-3.5 w-3.5 ${exp.featured ? 'fill-current' : ''}`} />
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditingItem(exp);
                  setModalOpen(true);
                }}
                aria-label={`Edit ${exp.role}`}
                className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-[var(--border-subtle)] text-[var(--text-secondary)] transition-colors hover:border-[var(--border-medium)] hover:text-[var(--text-primary)]"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setConfirmDeleteId(exp.id)}
                aria-label={`Delete ${exp.role}`}
                className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-[var(--border-subtle)] text-[var(--text-secondary)] transition-colors hover:border-[var(--danger-border)] hover:text-[var(--danger-text)]"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </article>
    );
  };

  return (
    <div className="mx-auto max-w-[1120px] px-6 py-10 md:px-10 md:py-12">
      {/* Header */}
      <div className="flex flex-col justify-between gap-6 border-b border-[var(--border-subtle)] pb-8 md:flex-row md:items-end">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--text-secondary)]">
            MODULE 09 — EXPERIENCE
          </p>
          <h1 className="mt-2 font-serif text-4xl font-normal tracking-[-0.015em] text-[var(--text-primary)]">
            Experience Timeline
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--text-secondary)]">
            Document internships, employment, research, volunteering, mentorship, and leadership roles—linked to verified skills and Document Vault evidence.
          </p>
          <div className="mt-4 flex flex-wrap gap-5 font-mono text-[11px] uppercase tracking-[0.12em] text-[var(--text-secondary)]">
            <span>{counts.total} Total</span>
            <span>{counts.current} Current</span>
            <span>{counts.publicCount} Public</span>
            <span>{counts.featuredCount} Featured</span>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <PillButton
            type="button"
            variant="primary"
            onClick={() => {
              setEditingItem(null);
              setModalOpen(true);
            }}
          >
            <Plus className="h-4 w-4" /> Add experience
          </PillButton>
        </div>
      </div>

      {actionBanner && (
        <div
          role="status"
          className={`mt-6 flex items-center justify-between gap-3 rounded-lg border px-4 py-3 text-xs ${
            actionBanner.tone === 'success'
              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
              : 'border-[var(--danger-border)] bg-[var(--danger-bg)] text-[var(--danger-text)]'
          }`}
        >
          <span>{actionBanner.message}</span>
          <button
            type="button"
            onClick={() => setActionBanner(null)}
            className="cursor-pointer font-mono text-[10px] uppercase tracking-[0.1em] underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Search, Filter & View Controls */}
      <div className="mt-6 flex flex-col gap-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-elevated)] p-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-[var(--text-secondary)]" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by role, organization, skill, or highlight…"
            className="h-9 w-full rounded-full border border-[var(--border-subtle)] bg-[var(--bg-main)] pr-4 pl-9 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]/70 focus:border-[var(--accent)] focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            aria-label="Filter by experience type"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as ExperienceType | 'all')}
            className="h-9 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-main)] px-3.5 text-xs text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none"
          >
            <option value="all">All types</option>
            {EXPERIENCE_TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          <select
            aria-label="Filter by visibility"
            value={visibilityFilter}
            onChange={(e) => setVisibilityFilter(e.target.value as VisibilityFilter)}
            className="h-9 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-main)] px-3.5 text-xs text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none"
          >
            <option value="all">All visibility</option>
            <option value="public">Public</option>
            <option value="private">Private</option>
          </select>

          <select
            aria-label="Sort experience entries"
            value={sortMode}
            onChange={(e) => setSortMode(e.target.value as SortMode)}
            className="h-9 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-main)] px-3.5 text-xs text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none"
          >
            <option value="featured">Featured & current</option>
            <option value="newest">Newest first</option>
            <option value="role">Role (A–Z)</option>
          </select>

          <div className="inline-flex rounded-full border border-[var(--border-subtle)] bg-[var(--bg-main)] p-0.5">
            <button
              type="button"
              onClick={() => setViewMode('timeline')}
              aria-label="Timeline view"
              className={`inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-full transition-colors ${
                viewMode === 'timeline'
                  ? 'bg-[var(--surface-elevated)] text-[var(--text-primary)] shadow-xs'
                  : 'text-[var(--text-secondary)]'
              }`}
            >
              <List className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              aria-label="Grid view"
              className={`inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-full transition-colors ${
                viewMode === 'grid'
                  ? 'bg-[var(--surface-elevated)] text-[var(--text-primary)] shadow-xs'
                  : 'text-[var(--text-secondary)]'
              }`}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="mt-8">
        {filteredItems.length === 0 ? (
          hasActiveFilters ? (
            <EmptyState
              title="No matching experience entries"
              description="Adjust your search query or clear filters to see all recorded roles."
              action={
                <PillButton
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setSearchQuery('');
                    setTypeFilter('all');
                    setVisibilityFilter('all');
                  }}
                >
                  Clear filters
                </PillButton>
              }
            />
          ) : (
            <EmptyState
              title="Your experience timeline is empty"
              description="Add your internships, full-time or freelance roles, campus leadership, or mentoring experience along with supporting offer letters."
              action={
                <PillButton
                  type="button"
                  variant="primary"
                  onClick={() => {
                    setEditingItem(null);
                    setModalOpen(true);
                  }}
                >
                  <Plus className="h-4 w-4" /> Add first experience
                </PillButton>
              }
            />
          )
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {filteredItems.map((exp) => renderCard(exp))}
          </div>
        ) : (
          <div className="relative space-y-5 pl-6 before:absolute before:top-3 before:bottom-3 before:left-2 before:w-px before:bg-[var(--border-subtle)]">
            {filteredItems.map((exp) => (
              <div key={exp.id} className="relative">
                <span
                  aria-hidden="true"
                  className={`absolute top-6 -left-[21px] h-2.5 w-2.5 rounded-full border-2 border-[var(--bg-main)] ${
                    exp.is_current
                      ? 'bg-emerald-500'
                      : exp.featured
                        ? 'bg-[var(--accent)]'
                        : 'bg-[var(--border-medium)]'
                  }`}
                />
                {renderCard(exp)}
              </div>
            ))}
          </div>
        )}
      </div>

      <ExperienceFormModal
        open={modalOpen}
        editingExperience={editingItem}
        onClose={() => {
          setModalOpen(false);
          setEditingItem(null);
        }}
        onSaved={handleSaved}
      />

      <ExperienceDetailsModal
        item={detailsItem}
        onClose={() => setDetailsItem(null)}
        onEdit={(item) => {
          setEditingItem(item);
          setModalOpen(true);
        }}
      />
    </div>
  );
};
