import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Award,
  CheckCircle2,
  ExternalLink,
  Eye,
  FileText,
  Globe,
  LayoutGrid,
  List,
  Loader2,
  Lock,
  Pencil,
  Plus,
  Search,
  Star,
  Trash2,
  Trophy,
} from 'lucide-react';
import { EmptyState, ErrorState, LoadingState } from '@/design/components/EditorialStates';
import { PillButton } from '@/design/components/PillButton';
import { UnderlineTabs, type UnderlineTabItem } from '@/design/components/UnderlineTabs';
import { achievementsService, certificatesService } from '@/services/api';
import type { ApiClientError } from '@/services/http';
import type { Achievement, Certificate, Visibility } from '@/types/api';
import { AchievementFormModal } from './AchievementFormModal';
import { CertificateDetailsModal } from './CertificateDetailsModal';
import { CertificateFormModal } from './CertificateFormModal';
import { DocumentThumbnail } from './DocumentThumbnail';
import {
  ACHIEVEMENT_CATEGORY_OPTIONS,
  CERTIFICATE_CATEGORY_OPTIONS,
  formatCredentialDate,
  getAchievementCategoryLabel,
  getCertificateCategoryLabel,
  getUnifiedDateValue,
  getVerificationStatusMeta,
  type UnifiedCredentialItem,
} from './certificateHelpers';

type TypeTab = 'all' | 'certificates' | 'achievements';
type VisibilityFilter = 'all' | 'public' | 'private';
type SortMode = 'featured' | 'newest' | 'title';
type ViewMode = 'grid' | 'list';

export const CertificatesPage: React.FC = () => {
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<ApiClientError | Error | null>(null);

  const [activeTab, setActiveTab] = useState<TypeTab>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [visibilityFilter, setVisibilityFilter] = useState<VisibilityFilter>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [sortMode, setSortMode] = useState<SortMode>('featured');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');

  const [certModalOpen, setCertModalOpen] = useState(false);
  const [editingCert, setEditingCert] = useState<Certificate | null>(null);
  const [achModalOpen, setAchModalOpen] = useState(false);
  const [editingAch, setEditingAch] = useState<Achievement | null>(null);
  const [detailsItem, setDetailsItem] = useState<UnifiedCredentialItem | null>(null);

  const [togglingKey, setTogglingKey] = useState<string | null>(null);
  const [confirmDeleteKey, setConfirmDeleteKey] = useState<string | null>(null);
  const [deletingKey, setDeletingKey] = useState<string | null>(null);
  const [actionBanner, setActionBanner] = useState<{
    tone: 'success' | 'error';
    message: string;
  } | null>(null);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [certRes, achRes] = await Promise.all([
        certificatesService.list({ page: 1, page_size: 100 }),
        achievementsService.list({ page: 1, page_size: 100 }),
      ]);
      setCertificates(certRes.items ?? []);
      setAchievements(achRes.items ?? []);
    } catch (err) {
      setLoadError(err as ApiClientError | Error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const unifiedItems = useMemo<UnifiedCredentialItem[]>(() => {
    const certItems: UnifiedCredentialItem[] = certificates.map((data) => ({
      kind: 'certificate',
      data,
    }));
    const achItems: UnifiedCredentialItem[] = achievements.map((data) => ({
      kind: 'achievement',
      data,
    }));
    return [...certItems, ...achItems];
  }, [certificates, achievements]);

  const categoryOptions = useMemo(() => {
    if (activeTab === 'certificates') return CERTIFICATE_CATEGORY_OPTIONS;
    if (activeTab === 'achievements') return ACHIEVEMENT_CATEGORY_OPTIONS;
    const seen = new Set<string>();
    const combined: { value: string; label: string }[] = [];
    for (const opt of [...CERTIFICATE_CATEGORY_OPTIONS, ...ACHIEVEMENT_CATEGORY_OPTIONS]) {
      if (!seen.has(opt.value)) {
        seen.add(opt.value);
        combined.push(opt);
      }
    }
    return combined;
  }, [activeTab]);

  useEffect(() => {
    if (
      categoryFilter !== 'all' &&
      !categoryOptions.some((opt) => opt.value === categoryFilter)
    ) {
      setCategoryFilter('all');
    }
  }, [categoryFilter, categoryOptions]);

  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = unifiedItems.filter((item) => {
      if (activeTab === 'certificates' && item.kind !== 'certificate') return false;
      if (activeTab === 'achievements' && item.kind !== 'achievement') return false;
      if (visibilityFilter !== 'all' && item.data.visibility !== visibilityFilter) return false;
      const itemCategory =
        item.kind === 'certificate'
          ? item.data.category ?? 'course'
          : item.data.category ?? 'award';
      if (categoryFilter !== 'all' && itemCategory !== categoryFilter) return false;

      if (!q) return true;
      if (item.kind === 'certificate') {
        return (
          item.data.name.toLowerCase().includes(q) ||
          item.data.issuer.toLowerCase().includes(q) ||
          (item.data.credential_id ?? '').toLowerCase().includes(q) ||
          item.data.skills.some((s) => s.name.toLowerCase().includes(q))
        );
      }
      return (
        item.data.title.toLowerCase().includes(q) ||
        (item.data.organization ?? '').toLowerCase().includes(q) ||
        (item.data.description ?? '').toLowerCase().includes(q)
      );
    });

    return [...list].sort((a, b) => {
      if (sortMode === 'title') {
        const titleA = a.kind === 'certificate' ? a.data.name : a.data.title;
        const titleB = b.kind === 'certificate' ? b.data.name : b.data.title;
        return titleA.localeCompare(titleB);
      }
      if (sortMode === 'newest') {
        return getUnifiedDateValue(b).localeCompare(getUnifiedDateValue(a));
      }
      const featDiff = Number(Boolean(b.data.featured)) - Number(Boolean(a.data.featured));
      if (featDiff !== 0) return featDiff;
      const orderDiff = (a.data.order ?? 0) - (b.data.order ?? 0);
      if (orderDiff !== 0) return orderDiff;
      return getUnifiedDateValue(b).localeCompare(getUnifiedDateValue(a));
    });
  }, [unifiedItems, activeTab, visibilityFilter, categoryFilter, searchQuery, sortMode]);

  const publicCount = useMemo(
    () => unifiedItems.filter((item) => item.data.visibility === 'public').length,
    [unifiedItems],
  );
  const featuredCount = useMemo(
    () => unifiedItems.filter((item) => item.data.featured).length,
    [unifiedItems],
  );

  const tabs: UnderlineTabItem<TypeTab>[] = [
    { key: 'all', label: `All (${unifiedItems.length})` },
    { key: 'certificates', label: `Certificates (${certificates.length})` },
    { key: 'achievements', label: `Achievements (${achievements.length})` },
  ];

  const handleToggleVisibility = async (item: UnifiedCredentialItem) => {
    const key = `${item.kind}-${item.data.id}-vis`;
    if (togglingKey) return;
    setTogglingKey(key);
    setActionBanner(null);
    const nextVis: Visibility = item.data.visibility === 'public' ? 'private' : 'public';
    try {
      if (item.kind === 'certificate') {
        const updated = await certificatesService.update(item.data.id, { visibility: nextVis });
        setCertificates((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
      } else {
        const updated = await achievementsService.update(item.data.id, { visibility: nextVis });
        setAchievements((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
      }
      setActionBanner({
        tone: 'success',
        message: `Updated visibility to ${nextVis}.`,
      });
    } catch (err) {
      setActionBanner({
        tone: 'error',
        message: err instanceof Error ? err.message : 'Unable to update visibility.',
      });
    } finally {
      setTogglingKey(null);
    }
  };

  const handleToggleFeatured = async (item: UnifiedCredentialItem) => {
    const key = `${item.kind}-${item.data.id}-feat`;
    if (togglingKey) return;
    setTogglingKey(key);
    setActionBanner(null);
    const nextFeatured = !item.data.featured;
    try {
      if (item.kind === 'certificate') {
        const updated = await certificatesService.update(item.data.id, { featured: nextFeatured });
        setCertificates((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
      } else {
        const updated = await achievementsService.update(item.data.id, { featured: nextFeatured });
        setAchievements((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
      }
    } catch (err) {
      setActionBanner({
        tone: 'error',
        message: err instanceof Error ? err.message : 'Unable to update featured status.',
      });
    } finally {
      setTogglingKey(null);
    }
  };

  const handleDelete = async (item: UnifiedCredentialItem) => {
    const key = `${item.kind}-${item.data.id}`;
    if (deletingKey) return;
    setDeletingKey(key);
    setActionBanner(null);
    try {
      if (item.kind === 'certificate') {
        await certificatesService.remove(item.data.id);
        setCertificates((prev) => prev.filter((c) => c.id !== item.data.id));
        setActionBanner({ tone: 'success', message: `Deleted "${item.data.name}".` });
      } else {
        await achievementsService.remove(item.data.id);
        setAchievements((prev) => prev.filter((a) => a.id !== item.data.id));
        setActionBanner({ tone: 'success', message: `Deleted "${item.data.title}".` });
      }
      setConfirmDeleteKey(null);
    } catch (err) {
      setActionBanner({
        tone: 'error',
        message: err instanceof Error ? err.message : 'Unable to delete record.',
      });
    } finally {
      setDeletingKey(null);
    }
  };

  const openEditModal = (item: UnifiedCredentialItem) => {
    if (item.kind === 'certificate') {
      setEditingCert(item.data);
      setCertModalOpen(true);
    } else {
      setEditingAch(item.data);
      setAchModalOpen(true);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-8 pb-12 sm:px-6">
        <LoadingState label="Loading certificates and achievements…" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-8 pb-12 sm:px-6">
        <ErrorState error={loadError} onRetry={() => void loadAll()} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-7 px-4 py-8 pb-16 sm:px-6">
      {/* Header */}
      <header className="flex flex-col gap-5 border-b border-[var(--border-subtle)] pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--text-secondary)]">
            MODULE 08 — CERTIFICATES
          </p>
          <h1 className="mt-2 font-serif text-3xl text-[var(--text-primary)] sm:text-4xl">
            Certificates
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--text-secondary)]">
            Manage verified credentials, courses, distinctions, awards, and accomplishments linked
            to private Document Vault evidence.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <PillButton
            variant="secondary"
            onClick={() => {
              setEditingAch(null);
              setAchModalOpen(true);
              setActionBanner(null);
            }}
          >
            <Trophy className="h-3.5 w-3.5" />
            Add Achievement
          </PillButton>
          <PillButton
            onClick={() => {
              setEditingCert(null);
              setCertModalOpen(true);
              setActionBanner(null);
            }}
          >
            <Plus className="h-4 w-4" />
            Add Certificate
          </PillButton>
        </div>
      </header>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: 'Total Records', value: unifiedItems.length },
          { label: 'Certificates', value: certificates.length },
          { label: 'Achievements', value: achievements.length },
          { label: 'Public / Featured', value: `${publicCount} / ${featuredCount}` },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-elevated)] px-4 py-3.5"
          >
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--text-secondary)]">
              {stat.label}
            </p>
            <p className="mt-1 font-serif text-2xl text-[var(--text-primary)]">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Action Banner */}
      {actionBanner && (
        <div
          role={actionBanner.tone === 'error' ? 'alert' : 'status'}
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

      {/* Tabs + Controls */}
      <div className="space-y-4">
        <UnderlineTabs items={tabs} activeKey={activeTab} onChange={setActiveTab} />

        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-secondary)]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by title, issuer, organization, or credential ID…"
              className="h-10 w-full rounded-lg border border-[var(--border-medium)] bg-[var(--bg-main)] pl-10 pr-3.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]/60 focus:border-[var(--accent)] focus:outline-none"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              aria-label="Filter by visibility"
              value={visibilityFilter}
              onChange={(e) => setVisibilityFilter(e.target.value as VisibilityFilter)}
              className="h-10 cursor-pointer rounded-lg border border-[var(--border-medium)] bg-[var(--bg-main)] px-3 text-xs text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none"
            >
              <option value="all">All visibility</option>
              <option value="public">Public only</option>
              <option value="private">Private only</option>
            </select>

            <select
              aria-label="Filter by category"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="h-10 cursor-pointer rounded-lg border border-[var(--border-medium)] bg-[var(--bg-main)] px-3 text-xs text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none"
            >
              <option value="all">All categories</option>
              {categoryOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>

            <select
              aria-label="Sort records"
              value={sortMode}
              onChange={(e) => setSortMode(e.target.value as SortMode)}
              className="h-10 cursor-pointer rounded-lg border border-[var(--border-medium)] bg-[var(--bg-main)] px-3 text-xs text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none"
            >
              <option value="featured">Sort: Featured &amp; Order</option>
              <option value="newest">Sort: Most Recent</option>
              <option value="title">Sort: Title (A–Z)</option>
            </select>

            <div className="inline-flex overflow-hidden rounded-lg border border-[var(--border-medium)] bg-[var(--bg-main)]">
              <button
                type="button"
                aria-label="Grid view"
                onClick={() => setViewMode('grid')}
                className={`cursor-pointer p-2.5 transition-colors ${
                  viewMode === 'grid'
                    ? 'bg-[var(--nav-active-bg)] text-[var(--accent)]'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button
                type="button"
                aria-label="List view"
                onClick={() => setViewMode('list')}
                className={`cursor-pointer p-2.5 transition-colors ${
                  viewMode === 'list'
                    ? 'bg-[var(--nav-active-bg)] text-[var(--accent)]'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                <List className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      {unifiedItems.length === 0 ? (
        <EmptyState
          title="No certificates or achievements yet"
          description="Add your course certificates, professional credentials, scholarships, awards, or competition achievements with private Document Vault evidence."
          action={
            <div className="flex flex-wrap justify-center gap-2.5">
              <PillButton
                variant="secondary"
                onClick={() => {
                  setEditingAch(null);
                  setAchModalOpen(true);
                }}
              >
                <Trophy className="h-3.5 w-3.5" />
                Add Achievement
              </PillButton>
              <PillButton
                onClick={() => {
                  setEditingCert(null);
                  setCertModalOpen(true);
                }}
              >
                <Plus className="h-4 w-4" />
                Add Certificate
              </PillButton>
            </div>
          }
        />
      ) : filteredItems.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[var(--border-medium)] bg-[var(--surface-elevated)]/60 px-6 py-10 text-center">
          <p className="text-sm text-[var(--text-secondary)]">
            No records match your current search or filter settings.
          </p>
          <button
            type="button"
            onClick={() => {
              setSearchQuery('');
              setVisibilityFilter('all');
              setCategoryFilter('all');
              setActiveTab('all');
            }}
            className="mt-3 cursor-pointer font-mono text-xs uppercase tracking-[0.1em] text-[var(--accent)] underline"
          >
            Reset filters
          </button>
        </div>
      ) : (
        <div
          className={
            viewMode === 'grid'
              ? 'grid grid-cols-1 gap-4 md:grid-cols-2'
              : 'space-y-3'
          }
        >
          {filteredItems.map((item) => {
            const isCert = item.kind === 'certificate';
            const itemKey = `${item.kind}-${item.data.id}`;
            const isDeleting = deletingKey === itemKey;
            const isConfirming = confirmDeleteKey === itemKey;
            const evidenceCount = isCert
              ? item.data.document
                ? 1
                : 0
              : item.data.documents.length;
            const primaryDoc = isCert
              ? item.data.document
              : (item.data.documents[0] ?? null);
            const extraDocsCount = Math.max(0, evidenceCount - 1);

            return (
              <article
                key={itemKey}
                className="flex flex-col justify-between gap-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-elevated)] p-5 transition-colors hover:border-[var(--border-medium)]"
              >
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="inline-flex items-center gap-1 rounded-full border border-[var(--border-accent)] bg-[var(--nav-active-bg)] px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.08em] text-[var(--accent)]">
                        {isCert ? (
                          <Award className="h-3 w-3" />
                        ) : (
                          <Trophy className="h-3 w-3" />
                        )}
                        {isCert ? 'Certificate' : 'Achievement'}
                      </span>
                      <span className="rounded-full border border-[var(--border-subtle)] bg-[var(--bg-main)] px-2.5 py-0.5 font-mono text-[10px] text-[var(--text-secondary)]">
                        {isCert
                          ? getCertificateCategoryLabel(item.data.category)
                          : getAchievementCategoryLabel(item.data.category)}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        disabled={Boolean(togglingKey)}
                        onClick={() => void handleToggleFeatured(item)}
                        title={item.data.featured ? 'Unfeature' : 'Mark as featured'}
                        aria-label={item.data.featured ? 'Unfeature record' : 'Feature record'}
                        className={`flex h-7 w-7 cursor-pointer items-center justify-center rounded-md border transition-colors ${
                          item.data.featured
                            ? 'border-[var(--border-accent)] bg-[var(--nav-active-bg)] text-[var(--accent)]'
                            : 'border-transparent text-[var(--text-secondary)] hover:bg-[var(--bg-main)] hover:text-[var(--text-primary)]'
                        }`}
                      >
                        <Star
                          className={`h-3.5 w-3.5 ${item.data.featured ? 'fill-current' : ''}`}
                        />
                      </button>

                      <button
                        type="button"
                        disabled={Boolean(togglingKey)}
                        onClick={() => void handleToggleVisibility(item)}
                        title={`Visibility: ${item.data.visibility} (click to toggle)`}
                        className="inline-flex h-7 cursor-pointer items-center gap-1 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-main)] px-2 font-mono text-[10px] uppercase tracking-[0.08em] text-[var(--text-secondary)] hover:border-[var(--border-medium)] hover:text-[var(--text-primary)]"
                      >
                        {item.data.visibility === 'public' ? (
                          <Globe className="h-3 w-3 text-[var(--accent)]" />
                        ) : (
                          <Lock className="h-3 w-3" />
                        )}
                        {item.data.visibility}
                      </button>
                    </div>
                  </div>

                  <div className={primaryDoc ? 'flex items-start justify-between gap-4' : ''}>
                    <div className="min-w-0 flex-1 space-y-2.5">
                      <div>
                        <h2 className="font-serif text-xl text-[var(--text-primary)]">
                          {isCert ? item.data.name : item.data.title}
                        </h2>
                        <p className="mt-1 text-xs text-[var(--text-secondary)]">
                          {isCert
                            ? [
                                item.data.issuer,
                                formatCredentialDate(item.data.issue_date),
                              ]
                                .filter(Boolean)
                                .join(' · ')
                            : [
                                item.data.organization,
                                formatCredentialDate(item.data.date),
                              ]
                                .filter(Boolean)
                                .join(' · ') || 'Personal accomplishment'}
                        </p>
                      </div>

                      {!isCert && item.data.description && (
                        <p className="line-clamp-2 text-xs leading-relaxed text-[var(--text-secondary)]">
                          {item.data.description}
                        </p>
                      )}

                      <div className="flex flex-wrap items-center gap-2 pt-0.5">
                        {isCert && (
                          <span
                            className={`inline-flex rounded-full border px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.08em] ${getVerificationStatusMeta(item.data.verification_status).classes}`}
                          >
                            {getVerificationStatusMeta(item.data.verification_status).label}
                          </span>
                        )}
                        {evidenceCount > 0 && (
                          <span className="inline-flex items-center gap-1 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-main)] px-2.5 py-0.5 font-mono text-[10px] text-[var(--text-secondary)]">
                            <FileText className="h-3 w-3 text-[var(--accent)]" />
                            {evidenceCount} {evidenceCount === 1 ? 'document' : 'documents'}
                          </span>
                        )}
                        {isCert && item.data.verification_url && (
                          <a
                            href={item.data.verification_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] font-medium text-[var(--accent)] hover:underline"
                          >
                            Verify
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </div>
                    </div>

                    {primaryDoc && (
                      <DocumentThumbnail
                        doc={primaryDoc}
                        extraCount={extraDocsCount}
                        size="card"
                      />
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--border-subtle)] pt-3">
                  <button
                    type="button"
                    onClick={() => setDetailsItem(item)}
                    className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-medium text-[var(--text-primary)] hover:text-[var(--accent)]"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    Details
                  </button>

                  {isConfirming ? (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={isDeleting}
                        onClick={() => setConfirmDeleteKey(null)}
                        className="cursor-pointer text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        disabled={isDeleting}
                        onClick={() => void handleDelete(item)}
                        className="inline-flex cursor-pointer items-center gap-1 rounded-full border border-[var(--danger-border)] bg-[var(--danger-bg)] px-3 py-1 text-xs font-medium text-[var(--danger-text)]"
                      >
                        {isDeleting && <Loader2 className="h-3 w-3 animate-spin" />}
                        Confirm Delete
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => openEditModal(item)}
                        aria-label="Edit record"
                        title="Edit"
                        className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-md text-[var(--text-secondary)] hover:bg-[var(--bg-main)] hover:text-[var(--text-primary)]"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteKey(itemKey)}
                        aria-label="Delete record"
                        title="Delete"
                        className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-md text-[var(--text-secondary)] hover:bg-[var(--danger-bg)] hover:text-[var(--danger-text)]"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      <CertificateFormModal
        open={certModalOpen}
        editingCertificate={editingCert}
        onClose={() => {
          setCertModalOpen(false);
          setEditingCert(null);
        }}
        onSaved={(saved, mode) => {
          setCertificates((prev) =>
            mode === 'edit'
              ? prev.map((c) => (c.id === saved.id ? saved : c))
              : [saved, ...prev],
          );
          setActionBanner({
            tone: 'success',
            message:
              mode === 'edit'
                ? `Updated certificate "${saved.name}".`
                : `Added certificate "${saved.name}".`,
          });
        }}
      />

      <AchievementFormModal
        open={achModalOpen}
        editingAchievement={editingAch}
        onClose={() => {
          setAchModalOpen(false);
          setEditingAch(null);
        }}
        onSaved={(saved, mode) => {
          setAchievements((prev) =>
            mode === 'edit'
              ? prev.map((a) => (a.id === saved.id ? saved : a))
              : [saved, ...prev],
          );
          setActionBanner({
            tone: 'success',
            message:
              mode === 'edit'
                ? `Updated achievement "${saved.title}".`
                : `Added achievement "${saved.title}".`,
          });
        }}
      />

      <CertificateDetailsModal
        item={detailsItem}
        onClose={() => setDetailsItem(null)}
        onEdit={openEditModal}
      />
    </div>
  );
};
