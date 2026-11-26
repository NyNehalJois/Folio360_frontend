import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Building2,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  FileText,
  Globe,
  GraduationCap,
  Landmark,
  Lock,
  MapPin,
  MoreVertical,
  Pencil,
  Plus,
  Search,
  Sparkles,
  Trash2,
  Upload,
} from 'lucide-react';
import { EmptyState, ErrorState, LoadingState } from '@/design/components/EditorialStates';
import { PillButton } from '@/design/components/PillButton';
import {
  DOCUMENT_CATEGORY_OPTIONS,
  DocumentUploadWidget,
  formatDocumentCategory,
  formatFileSize,
} from '@/features/documents/DocumentUploadWidget';
import type { ApiClientError } from '@/services/http';
import { documentsService, educationService } from '@/services/api';
import type { Document, DocumentCategory, Education } from '@/types/api';
import { EducationFormModal } from './EducationFormModal';
import {
  formatEducationPeriod,
  getEducationLevelLabel,
  sortEducationTimeline,
} from './educationHelpers';

export const EducationPage: React.FC = () => {
  const [records, setRecords] = useState<Education[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<ApiClientError | Error | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<Education | null>(null);
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [docSearch, setDocSearch] = useState('');
  const [docCategoryFilter, setDocCategoryFilter] = useState<DocumentCategory | 'all'>('all');
  const [docSort, setDocSort] = useState<'newest' | 'oldest' | 'title'>('newest');
  const [docsGridOpen, setDocsGridOpen] = useState(false);
  const [uploadPanelOpen, setUploadPanelOpen] = useState(false);
  const [togglingDocId, setTogglingDocId] = useState<string | null>(null);
  const [openDocMenuId, setOpenDocMenuId] = useState<string | null>(null);
  const [confirmDeleteDocId, setConfirmDeleteDocId] = useState<string | null>(null);
  const [deletingDocId, setDeletingDocId] = useState<string | null>(null);

  useEffect(() => {
    if (!openDocMenuId) return;
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target?.closest('[data-doc-visibility-menu]')) {
        setOpenDocMenuId(null);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpenDocMenuId(null);
      }
    };
    document.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [openDocMenuId]);

  const [actionBanner, setActionBanner] = useState<{
    tone: 'success' | 'error';
    message: string;
  } | null>(null);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [eduRes, docsRes] = await Promise.all([
        educationService.list({ page: 1, page_size: 100 }),
        documentsService.list({ page: 1, page_size: 100 }),
      ]);
      const sorted = sortEducationTimeline(eduRes.items);
      setRecords(sorted);
      setDocuments(docsRes.items);
      setExpandedIds((prev) => {
        if (Object.keys(prev).length > 0 || sorted.length === 0) return prev;
        return { [sorted[0].id]: true };
      });
    } catch (err) {
      setLoadError(err as ApiClientError | Error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const sortedRecords = useMemo(() => sortEducationTimeline(records), [records]);
  const currentRecords = useMemo(
    () => sortedRecords.filter((item) => item.is_current),
    [sortedRecords],
  );
  const primarySummary = currentRecords[0] ?? sortedRecords[0] ?? null;
  const publicCount = useMemo(
    () => sortedRecords.filter((item) => item.visibility === 'public').length,
    [sortedRecords],
  );

  const filteredDocuments = useMemo(() => {
    const q = docSearch.trim().toLowerCase();
    const list = documents.filter((doc) => {
      if (docCategoryFilter !== 'all' && doc.category !== docCategoryFilter) return false;
      if (
        q &&
        !doc.title.toLowerCase().includes(q) &&
        !doc.original_filename.toLowerCase().includes(q) &&
        !(doc.notes ?? '').toLowerCase().includes(q)
      ) {
        return false;
      }
      return true;
    });
    return [...list].sort((a, b) => {
      if (docSort === 'title') return a.title.localeCompare(b.title);
      const timeA = new Date(a.uploaded_at).getTime();
      const timeB = new Date(b.uploaded_at).getTime();
      return docSort === 'oldest' ? timeA - timeB : timeB - timeA;
    });
  }, [documents, docSearch, docCategoryFilter, docSort]);

  const openCreateModal = () => {
    setEditingRecord(null);
    setModalOpen(true);
    setActionBanner(null);
  };

  const openEditModal = (record: Education) => {
    setEditingRecord(record);
    setModalOpen(true);
    setActionBanner(null);
  };

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleSaved = (saved: Education, mode: 'create' | 'edit') => {
    setRecords((prev) => {
      const next =
        mode === 'edit'
          ? prev.map((item) => (item.id === saved.id ? saved : item))
          : [saved, ...prev];
      return sortEducationTimeline(next);
    });
    setExpandedIds((prev) => ({ ...prev, [saved.id]: true }));
    setModalOpen(false);
    setEditingRecord(null);
    setConfirmDeleteId(null);
    setActionBanner({
      tone: 'success',
      message:
        mode === 'create'
          ? `Added ${saved.degree} at ${saved.institution}.`
          : `Updated ${saved.degree} at ${saved.institution}.`,
    });
  };

  const handleDeleteConfirm = async (record: Education) => {
    if (deletingId) return;
    setDeletingId(record.id);
    setActionBanner(null);
    try {
      await educationService.remove(record.id);
      setRecords((prev) => prev.filter((item) => item.id !== record.id));
      setConfirmDeleteId(null);
      setActionBanner({
        tone: 'success',
        message: `Removed ${record.degree} at ${record.institution}.`,
      });
    } catch (err) {
      setActionBanner({
        tone: 'error',
        message:
          err instanceof Error
            ? err.message
            : 'Unable to delete this education record. Please try again.',
      });
    } finally {
      setDeletingId(null);
    }
  };

  const handleSetDocumentDisplay = async (doc: Document, showInEducation: boolean) => {
    setOpenDocMenuId(null);
    if (togglingDocId || Boolean(doc.show_in_education) === showInEducation) return;
    setTogglingDocId(doc.id);
    try {
      const updated = await documentsService.update(doc.id, {
        show_in_education: showInEducation,
      });
      setDocuments((prev) => prev.map((item) => (item.id === doc.id ? updated : item)));
    } catch (err) {
      setActionBanner({
        tone: 'error',
        message:
          err instanceof Error
            ? err.message
            : 'Unable to update document display preference.',
      });
    } finally {
      setTogglingDocId(null);
    }
  };

  const handleDeleteDocument = async (doc: Document) => {
    if (deletingDocId) return;
    setDeletingDocId(doc.id);
    try {
      await documentsService.remove(doc.id, true);
      setDocuments((prev) => prev.filter((item) => item.id !== doc.id));
      setConfirmDeleteDocId(null);
      setActionBanner({
        tone: 'success',
        message: `Removed "${doc.title}" from your documents.`,
      });
    } catch (err) {
      setActionBanner({
        tone: 'error',
        message: err instanceof Error ? err.message : 'Unable to delete document.',
      });
    } finally {
      setDeletingDocId(null);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8 pb-12 sm:px-6">
        <LoadingState label="Loading education history…" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8 pb-12 sm:px-6">
        <ErrorState error={loadError} onRetry={() => void loadAll()} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8 px-4 py-8 pb-16 sm:px-6">
      {/* Editorial Header */}
      <header className="flex flex-col gap-5 border-b border-[var(--border-subtle)] pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--text-secondary)]">
            MODULE 03 — EDUCATION &amp; ACADEMIC VAULT
          </p>
          <h1 className="mt-2 font-serif text-3xl text-[var(--text-primary)] sm:text-4xl">
            Education &amp; Academic Journey
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--text-secondary)]">
            Chronicle your schools, pre-university boards, diplomas, and university degrees, attach
            marksheets, and choose which uploaded documents appear in your Education tab.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <a
            href="#education-documents"
            className="inline-flex h-10 items-center justify-center rounded-full border border-[var(--border-medium)] px-4 text-xs font-medium text-[var(--text-primary)] transition-colors hover:border-[var(--text-primary)] hover:bg-[var(--surface-muted)]"
          >
            Documents ({documents.length})
          </a>
          <PillButton onClick={openCreateModal}>
            <Plus className="h-4 w-4" />
            Add Education
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
            className="font-mono text-[11px] uppercase tracking-[0.1em] text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Current Education Summary — unified elevated surface */}
      {primarySummary && (
        <section
          aria-label="Current education summary"
          className="rounded-xl border border-[var(--border-medium)] bg-[var(--surface-elevated)] p-6"
        >
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--text-secondary)]">
                  {currentRecords.length > 0 ? 'Current Education' : 'Latest Qualification'}
                </span>
                {primarySummary.is_current ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border-accent)] bg-[var(--nav-active-bg)] px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.1em] text-[var(--text-primary)]">
                    <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
                    Currently Studying
                  </span>
                ) : (
                  <span className="inline-flex items-center rounded-full border border-[var(--border-subtle)] px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.1em] text-[var(--text-secondary)]">
                    Completed
                  </span>
                )}
              </div>

              <h2 className="mt-2 font-serif text-2xl text-[var(--text-primary)]">
                {primarySummary.degree}
                {primarySummary.branch ? ` in ${primarySummary.branch}` : ''}
              </h2>

              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-[var(--text-secondary)]">
                <span className="inline-flex items-center gap-1.5 text-[var(--text-primary)]">
                  <Building2 className="h-3.5 w-3.5 text-[var(--text-secondary)]" />
                  {primarySummary.institution}
                </span>
                {primarySummary.university_or_board && (
                  <span className="inline-flex items-center gap-1.5">
                    <Landmark className="h-3.5 w-3.5" />
                    {primarySummary.university_or_board}
                  </span>
                )}
              </div>

              <p className="mt-2 font-mono text-xs text-[var(--text-secondary)]">
                {getEducationLevelLabel(primarySummary.education_level)} ·{' '}
                {formatEducationPeriod(primarySummary)}
                {primarySummary.state || primarySummary.country
                  ? ` · ${[primarySummary.state, primarySummary.country].filter(Boolean).join(', ')}`
                  : ''}
              </p>
            </div>

            <div className="grid grid-cols-3 gap-4 border-t border-[var(--border-subtle)] pt-4 sm:border-l sm:border-t-0 sm:pl-6 sm:pt-0">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--text-secondary)]">
                  Records
                </p>
                <p className="mt-1 font-serif text-2xl text-[var(--text-primary)]">
                  {sortedRecords.length}
                </p>
              </div>
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--text-secondary)]">
                  Active
                </p>
                <p className="mt-1 font-serif text-2xl text-[var(--text-primary)]">
                  {currentRecords.length}
                </p>
              </div>
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--text-secondary)]">
                  Public
                </p>
                <p className="mt-1 font-serif text-2xl text-[var(--text-primary)]">
                  {publicCount}
                </p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Empty State or Education History Timeline */}
      {sortedRecords.length === 0 ? (
        <EmptyState
          title="No education history added yet"
          description="Record your school, pre-university board, diploma, or university degrees and attach your marksheets or certificates."
          action={
            <PillButton onClick={openCreateModal}>
              <Plus className="h-4 w-4" />
              Add your first education
            </PillButton>
          }
        />
      ) : (
        <section aria-label="Education history timeline" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--text-secondary)]">
              Education Timeline ({sortedRecords.length})
            </h2>
            <span className="font-mono text-[11px] text-[var(--text-secondary)]">
              Ordered newest &amp; ongoing first
            </span>
          </div>

          <ol className="relative space-y-5 before:absolute before:bottom-4 before:left-[15px] before:top-4 before:w-px before:bg-[var(--border-medium)]">
            {sortedRecords.map((record) => {
              const isExpanded = Boolean(expandedIds[record.id]);
              const isConfirmingDelete = confirmDeleteId === record.id;
              const isDeleting = deletingId === record.id;
              const period = formatEducationPeriod(record);
              const levelLabel = getEducationLevelLabel(record.education_level);
              const locationLabel = [record.state, record.country].filter(Boolean).join(', ');
              const attachedDocs = record.documents ?? [];

              return (
                <li key={record.id} className="relative pl-10">
                  {/* Timeline Node */}
                  <span
                    aria-hidden="true"
                    className={`absolute left-[9px] top-6 h-3.5 w-3.5 rounded-full border-2 ${
                      record.is_current
                        ? 'border-[var(--accent)] bg-[var(--accent)]'
                        : 'border-[var(--border-medium)] bg-[var(--bg-main)]'
                    }`}
                  />

                  <article className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-elevated)] transition-colors">
                    <div className="p-5 sm:p-6">
                      {/* Top Meta Row */}
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="inline-flex items-center gap-1 rounded-full border border-[var(--border-subtle)] bg-[var(--surface-muted)] px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.1em] text-[var(--text-secondary)]">
                            <GraduationCap className="h-3 w-3" />
                            {levelLabel}
                          </span>
                          {record.is_current ? (
                            <span className="inline-flex items-center gap-1 rounded-full border border-[var(--border-accent)] bg-[var(--nav-active-bg)] px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.1em] text-[var(--text-primary)]">
                              Ongoing
                            </span>
                          ) : (
                            <span className="inline-flex items-center rounded-full border border-[var(--border-subtle)] px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.1em] text-[var(--text-secondary)]">
                              Completed
                            </span>
                          )}
                          <span className="inline-flex items-center gap-1 rounded-full border border-[var(--border-subtle)] px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.1em] text-[var(--text-secondary)]">
                            {record.visibility === 'public' ? (
                              <Globe className="h-3 w-3" />
                            ) : (
                              <Lock className="h-3 w-3" />
                            )}
                            {record.visibility}
                          </span>
                        </div>

                        <span className="inline-flex items-center gap-1.5 font-mono text-xs text-[var(--text-secondary)]">
                          <Calendar className="h-3.5 w-3.5" />
                          {period}
                        </span>
                      </div>

                      {/* Primary Title & Institutions */}
                      <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0 flex-1">
                          <h3 className="font-serif text-xl text-[var(--text-primary)] sm:text-2xl">
                            {record.degree}
                            {record.branch ? ` · ${record.branch}` : ''}
                          </h3>

                          <div className="mt-2 space-y-1 text-sm">
                            <p className="flex items-center gap-2 text-[var(--text-primary)]">
                              <Building2 className="h-4 w-4 shrink-0 text-[var(--text-secondary)]" />
                              <span>{record.institution}</span>
                            </p>
                            {record.university_or_board && (
                              <p className="flex items-center gap-2 text-[var(--text-secondary)]">
                                <Landmark className="h-4 w-4 shrink-0" />
                                <span>{record.university_or_board}</span>
                              </p>
                            )}
                            {locationLabel && (
                              <p className="flex items-center gap-2 text-[var(--text-secondary)]">
                                <MapPin className="h-4 w-4 shrink-0" />
                                <span>{locationLabel}</span>
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex flex-wrap items-center gap-2 shrink-0">
                          <PillButton
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleExpand(record.id)}
                            aria-expanded={isExpanded}
                          >
                            {isExpanded ? (
                              <>
                                Less
                                <ChevronUp className="h-3.5 w-3.5" />
                              </>
                            ) : (
                              <>
                                Details
                                <ChevronDown className="h-3.5 w-3.5" />
                              </>
                            )}
                          </PillButton>
                          <PillButton
                            variant="secondary"
                            size="sm"
                            onClick={() => openEditModal(record)}
                            aria-label={`Edit ${record.degree} at ${record.institution}`}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            Edit
                          </PillButton>
                          <PillButton
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              setConfirmDeleteId((curr) => (curr === record.id ? null : record.id))
                            }
                            aria-label={`Delete ${record.degree} at ${record.institution}`}
                            className="text-[var(--danger-text)] hover:bg-[var(--danger-bg)]"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Delete
                          </PillButton>
                        </div>
                      </div>

                      {/* Attached Documents Summary */}
                      {attachedDocs.length > 0 && (
                        <div className="mt-4 flex flex-wrap items-center gap-2">
                          {attachedDocs.map((doc) => (
                            <span
                              key={doc.id}
                              className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border-subtle)] bg-[var(--surface-muted)] px-3 py-1 text-xs text-[var(--text-primary)]"
                            >
                              <FileText className="h-3 w-3 text-[var(--text-secondary)]" />
                              <span>{doc.title}</span>
                              <span className="font-mono text-[10px] uppercase text-[var(--text-secondary)]">
                                · {formatDocumentCategory(doc.category)}
                              </span>
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Delete Confirmation Step */}
                      {isConfirmingDelete && (
                        <div
                          role="alertdialog"
                          aria-label={`Confirm deletion of ${record.degree}`}
                          className="mt-4 flex flex-col gap-3 rounded-lg border border-[var(--danger-border)] bg-[var(--danger-bg)] p-4 sm:flex-row sm:items-center sm:justify-between"
                        >
                          <p className="text-xs text-[var(--danger-text)]">
                            Remove <strong>{record.degree}</strong> at{' '}
                            <strong>{record.institution}</strong> from your education timeline?
                          </p>
                          <div className="flex items-center gap-2 shrink-0">
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
                              onClick={() => void handleDeleteConfirm(record)}
                              className="inline-flex h-8 cursor-pointer items-center justify-center rounded-full border border-[var(--danger-border)] bg-[var(--danger-text)] px-4 text-xs font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {isDeleting ? 'Deleting…' : 'Confirm delete'}
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Expandable Details */}
                      {isExpanded && (
                        <div className="mt-4 space-y-3 border-t border-[var(--border-subtle)] pt-4 text-sm">
                          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                            <div>
                              <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--text-secondary)]">
                                Institution / College
                              </p>
                              <p className="mt-0.5 text-[var(--text-primary)]">
                                {record.institution}
                              </p>
                            </div>
                            <div>
                              <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--text-secondary)]">
                                University / Board
                              </p>
                              <p className="mt-0.5 text-[var(--text-primary)]">
                                {record.university_or_board || '—'}
                              </p>
                            </div>
                            <div>
                              <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--text-secondary)]">
                                Specialization
                              </p>
                              <p className="mt-0.5 text-[var(--text-primary)]">
                                {record.specialization || '—'}
                              </p>
                            </div>
                          </div>

                          {record.description && (
                            <div>
                              <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--text-secondary)]">
                                Notes &amp; Highlights
                              </p>
                              <p className="mt-1 whitespace-pre-line leading-relaxed text-[var(--text-secondary)]">
                                {record.description}
                              </p>
                            </div>
                          )}

                          {record.achievements && record.achievements.length > 0 && (
                            <div>
                              <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--text-secondary)]">
                                Honors &amp; Roles
                              </p>
                              <ul className="mt-1.5 flex flex-wrap gap-2">
                                {record.achievements.map((item) => (
                                  <li
                                    key={item}
                                    className="rounded-full border border-[var(--border-subtle)] bg-[var(--surface-muted)] px-3 py-1 text-xs text-[var(--text-primary)]"
                                  >
                                    {item}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </article>
                </li>
              );
            })}
          </ol>
        </section>
      )}

      {/* Scrolled-Down Academic Documents Section (Image 1 Editorial Card Grid) */}
      <section
        id="education-documents"
        aria-labelledby="education-documents-heading"
        className="space-y-6 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-elevated)] p-6 sm:p-7"
      >
        {/* Top Row: Eyebrow + Heading + AI Processing Pill + Upload Document Button */}
        <div className="flex flex-col gap-4 border-b border-[var(--border-subtle)] pb-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--text-secondary)]">
              EDUCATION DOCUMENTS
            </p>
            <h2
              id="education-documents-heading"
              className="mt-1.5 font-serif text-3xl text-[var(--text-primary)]"
            >
              Your Academic Documents
            </h2>
            <p className="mt-1 text-xs text-[var(--text-secondary)]">
              Manage and view your educational documents. Upload marksheets, transcripts,
              certificates and more.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <span className="inline-flex items-center gap-2 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-main)] px-3 py-1.5 text-[11px] font-medium text-[var(--text-secondary)]">
              <Sparkles className="h-3 w-3 text-[var(--accent)]" />
              AI-Powered Document Processing
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            </span>

            <PillButton
              variant="primary"
              size="md"
              onClick={() => setUploadPanelOpen((prev) => !prev)}
            >
              <Upload className="h-3.5 w-3.5" />
              {uploadPanelOpen ? 'Close Upload' : 'Upload Document'}
            </PillButton>
          </div>
        </div>

        {/* Toggleable Upload Drawer */}
        {uploadPanelOpen && (
          <div className="rounded-xl border border-[var(--border-medium)] bg-[var(--surface-muted)]/60 p-4">
            <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--text-secondary)]">
              Upload New Academic Document
            </p>
            <DocumentUploadWidget
              onUploaded={(doc) => {
                setDocuments((prev) => [doc, ...prev]);
                setUploadPanelOpen(false);
                setActionBanner({
                  tone: 'success',
                  message: `Uploaded "${doc.title}" to Your Academic Documents.`,
                });
              }}
            />
          </div>
        )}

        {/* Search, Category Filter & Sort Row */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--text-secondary)]" />
            <input
              type="search"
              value={docSearch}
              onChange={(e) => setDocSearch(e.target.value)}
              placeholder="Search your documents..."
              className="w-full rounded-full border border-[var(--border-medium)] bg-[var(--bg-main)] py-2 pl-9 pr-4 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]/60 focus:border-[var(--text-primary)] focus:outline-none"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <select
              aria-label="Filter documents by category"
              value={docCategoryFilter}
              onChange={(e) => setDocCategoryFilter(e.target.value as DocumentCategory | 'all')}
              className="rounded-full border border-[var(--border-medium)] bg-[var(--bg-main)] px-3.5 py-2 text-xs text-[var(--text-primary)] focus:border-[var(--text-primary)] focus:outline-none cursor-pointer"
            >
              <option value="all">All Categories</option>
              {DOCUMENT_CATEGORY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>

            <select
              aria-label="Sort documents"
              value={docSort}
              onChange={(e) => setDocSort(e.target.value as 'newest' | 'oldest' | 'title')}
              className="rounded-full border border-[var(--border-medium)] bg-[var(--bg-main)] px-3.5 py-2 text-xs text-[var(--text-primary)] focus:border-[var(--text-primary)] focus:outline-none cursor-pointer"
            >
              <option value="newest">Sort by: Newest</option>
              <option value="oldest">Sort by: Oldest</option>
              <option value="title">Sort by: Title A–Z</option>
            </select>
          </div>
        </div>

        {/* Collapsible View Dropdown for the 2-Column Document Cards */}
        <div className="space-y-4">
          <button
            type="button"
            aria-expanded={docsGridOpen}
            aria-controls="academic-documents-grid"
            onClick={() => setDocsGridOpen((prev) => !prev)}
            className="flex w-full items-center justify-between gap-3 rounded-xl border border-[var(--border-medium)] bg-[var(--bg-main)] px-4 py-3 text-left text-sm transition-colors hover:border-[var(--text-primary)] cursor-pointer"
          >
            <span className="flex items-center gap-2.5">
              <Eye className="h-4 w-4 text-[var(--text-secondary)]" />
              <span className="font-medium text-[var(--text-primary)]">
                {docsGridOpen ? 'Hide Documents' : 'View Documents'}
              </span>
              <span className="font-mono text-xs text-[var(--text-secondary)]">
                ({filteredDocuments.length})
              </span>
            </span>
            <ChevronDown
              className={`h-4 w-4 text-[var(--text-secondary)] transition-transform duration-200 ${
                docsGridOpen ? 'rotate-180' : ''
              }`}
            />
          </button>

          {docsGridOpen && (
            <div id="academic-documents-grid">
              {filteredDocuments.length === 0 ? (
                <div className="rounded-xl border border-dashed border-[var(--border-medium)] bg-[var(--bg-main)]/50 px-6 py-10 text-center">
                  <p className="text-sm text-[var(--text-secondary)]">
                    {documents.length === 0
                      ? 'No documents uploaded yet. Click "Upload Document" above to add your first marksheet or certificate.'
                      : 'No documents match your search or category filter.'}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {filteredDocuments.map((doc) => {
              const isSelected = Boolean(doc.show_in_education);
              const isToggling = togglingDocId === doc.id;
              const isConfirmingDocDelete = confirmDeleteDocId === doc.id;
              const isDeletingDoc = deletingDocId === doc.id;
              const uploadedLabel = new Date(doc.uploaded_at).toLocaleDateString('en-GB', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
              });
              const programLabel =
                doc.attached_to?.[0]?.label ||
                (primarySummary
                  ? `${primarySummary.degree}${primarySummary.branch ? ' CSE' : ''}`
                  : 'Academic Vault');
              const summaryText =
                doc.notes ||
                `${formatDocumentCategory(doc.category)} uploaded as ${doc.original_filename}. ${
                  isSelected
                    ? 'Visible in your Education tab.'
                    : 'Stored privately in your academic vault.'
                }`;

              return (
                <article
                  key={doc.id}
                  className="flex flex-col justify-between rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-main)] p-4 transition-colors hover:border-[var(--border-medium)]"
                >
                  {/* Card Top: Title + Category + Thumbnail */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <FileText className="h-4 w-4 shrink-0 text-[var(--text-secondary)]" />
                        <h3 className="truncate text-sm font-semibold text-[var(--text-primary)]">
                          {doc.title}
                        </h3>
                        <span className="rounded-full border border-[var(--border-subtle)] bg-[var(--surface-muted)] px-2.5 py-0.5 text-[10px] font-medium text-[var(--text-secondary)]">
                          {formatDocumentCategory(doc.category)}
                        </span>
                      </div>

                      <div className="mt-3">
                        <p className="inline-flex items-center gap-1.5 text-[11px] font-medium text-[var(--text-primary)]">
                          <Sparkles className="h-3 w-3 text-[var(--accent)]" />
                          AI Generated Description
                        </p>
                        <p className="mt-1 line-clamp-3 text-xs leading-relaxed text-[var(--text-secondary)]">
                          {summaryText}
                        </p>
                      </div>
                    </div>

                    {/* Document Miniature Preview */}
                    <div className="hidden sm:flex h-24 w-24 shrink-0 flex-col justify-between rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-elevated)] p-2 shadow-2xs">
                      <div className="flex items-center justify-between">
                        <span className="h-2 w-2 rounded-full bg-[var(--accent)]/60" />
                        <span className="font-mono text-[7px] uppercase tracking-wider text-[var(--text-secondary)]">
                          {doc.mime_type === 'application/pdf' ? 'PDF' : 'IMG'}
                        </span>
                      </div>
                      <div className="space-y-1">
                        <div className="h-1 w-full rounded bg-[var(--border-medium)]" />
                        <div className="h-1 w-4/5 rounded bg-[var(--border-subtle)]" />
                        <div className="h-1 w-full rounded bg-[var(--border-subtle)]" />
                        <div className="h-1 w-3/5 rounded bg-[var(--border-subtle)]" />
                      </div>
                      <p className="truncate font-mono text-[7px] text-[var(--text-secondary)]">
                        {doc.original_filename}
                      </p>
                    </div>
                  </div>

                  {/* Card Footer: Uploaded on · Program · Size + 3-dot Menu */}
                  <div className="mt-4 flex items-center justify-between gap-2 border-t border-[var(--border-subtle)] pt-3">
                    <div className="grid flex-1 grid-cols-3 gap-2 text-[10px] text-[var(--text-secondary)]">
                      <div className="min-w-0">
                        <span className="flex items-center gap-1 opacity-80">
                          <Calendar className="h-3 w-3 shrink-0" />
                          Uploaded on
                        </span>
                        <p className="mt-0.5 truncate font-medium text-[var(--text-primary)]">
                          {uploadedLabel}
                        </p>
                      </div>
                      <div className="min-w-0">
                        <span className="flex items-center gap-1 opacity-80">
                          <GraduationCap className="h-3 w-3 shrink-0" />
                          Program
                        </span>
                        <p className="mt-0.5 truncate font-medium text-[var(--text-primary)]">
                          {programLabel}
                        </p>
                      </div>
                      <div className="min-w-0">
                        <span className="flex items-center gap-1 opacity-80">
                          <FileText className="h-3 w-3 shrink-0" />
                          Size
                        </span>
                        <p className="mt-0.5 truncate font-medium text-[var(--text-primary)]">
                          {formatFileSize(doc.size_bytes)}
                        </p>
                      </div>
                    </div>

                    {/* 3-Dot Action Menu */}
                    <div className="relative shrink-0" data-doc-visibility-menu>
                      <button
                        type="button"
                        disabled={isToggling}
                        aria-haspopup="menu"
                        aria-expanded={openDocMenuId === doc.id}
                        aria-label={`Document actions for ${doc.title}`}
                        onClick={() =>
                          setOpenDocMenuId((curr) => (curr === doc.id ? null : doc.id))
                        }
                        className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--border-subtle)] text-[var(--text-secondary)] transition-colors hover:border-[var(--border-medium)] hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)] cursor-pointer"
                      >
                        <MoreVertical className="h-3.5 w-3.5" />
                      </button>

                      {openDocMenuId === doc.id && (
                        <div
                          role="menu"
                          aria-label={`Actions for ${doc.title}`}
                          className="absolute right-0 bottom-9 z-20 w-56 rounded-xl border border-[var(--border-medium)] bg-[var(--surface-elevated)] p-1.5 shadow-xl"
                        >
                          <button
                            type="button"
                            role="menuitemradio"
                            aria-checked={isSelected}
                            onClick={() => void handleSetDocumentDisplay(doc, true)}
                            className={`flex w-full items-start gap-2.5 rounded-lg px-3 py-2 text-left text-xs transition-colors cursor-pointer ${
                              isSelected
                                ? 'bg-[var(--nav-active-bg)] text-[var(--text-primary)] font-medium'
                                : 'text-[var(--text-primary)] hover:bg-[var(--surface-muted)]'
                            }`}
                          >
                            <Eye className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                            <div>
                              <p>View in Education tab</p>
                              <p className="text-[11px] font-normal text-[var(--text-secondary)]">
                                Display on Education &amp; /@username
                              </p>
                            </div>
                          </button>

                          <button
                            type="button"
                            role="menuitemradio"
                            aria-checked={!isSelected}
                            onClick={() => void handleSetDocumentDisplay(doc, false)}
                            className={`flex w-full items-start gap-2.5 rounded-lg px-3 py-2 text-left text-xs transition-colors cursor-pointer ${
                              !isSelected
                                ? 'bg-[var(--nav-active-bg)] text-[var(--text-primary)] font-medium'
                                : 'text-[var(--text-primary)] hover:bg-[var(--surface-muted)]'
                            }`}
                          >
                            <EyeOff className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                            <div>
                              <p>Hide from Education tab</p>
                              <p className="text-[11px] font-normal text-[var(--text-secondary)]">
                                Keep in document vault only
                              </p>
                            </div>
                          </button>

                          <div className="my-1 border-t border-[var(--border-subtle)]" />

                          <button
                            type="button"
                            role="menuitem"
                            onClick={() => {
                              setOpenDocMenuId(null);
                              setConfirmDeleteDocId((curr) => (curr === doc.id ? null : doc.id));
                            }}
                            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-xs text-[var(--danger-text)] hover:bg-[var(--danger-bg)] cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5 shrink-0" />
                            <span>Delete document</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {isConfirmingDocDelete && (
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[var(--danger-border)] bg-[var(--danger-bg)] px-3 py-2 text-xs">
                      <span className="text-[var(--danger-text)]">
                        Delete <strong>{doc.title}</strong>?
                      </span>
                      <div className="flex items-center gap-2">
                        <PillButton
                          variant="secondary"
                          size="sm"
                          disabled={isDeletingDoc}
                          onClick={() => setConfirmDeleteDocId(null)}
                        >
                          Cancel
                        </PillButton>
                        <button
                          type="button"
                          disabled={isDeletingDoc}
                          onClick={() => void handleDeleteDocument(doc)}
                          className="inline-flex h-8 cursor-pointer items-center justify-center rounded-full border border-[var(--danger-border)] bg-[var(--danger-text)] px-3 text-xs font-medium text-white"
                        >
                          {isDeletingDoc ? 'Deleting…' : 'Confirm'}
                        </button>
                      </div>
                    </div>
                  )}
                </article>
              );
            })}
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      <EducationFormModal
        open={modalOpen}
        editingRecord={editingRecord}
        availableDocuments={documents}
        onDocumentUploaded={(doc) => {
          setDocuments((prev) => [doc, ...prev]);
        }}
        onClose={() => {
          if (!modalOpen) return;
          setModalOpen(false);
          setEditingRecord(null);
        }}
        onSaved={handleSaved}
      />
    </div>
  );
};
