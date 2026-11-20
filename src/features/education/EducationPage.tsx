import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Building2,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Globe,
  GraduationCap,
  Landmark,
  Lock,
  MapPin,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react';
import { EmptyState, ErrorState, LoadingState } from '@/design/components/EditorialStates';
import { PillButton } from '@/design/components/PillButton';
import type { ApiClientError } from '@/services/http';
import { educationService } from '@/services/api/education.service';
import type { Education } from '@/types/api';
import { EducationFormModal } from './EducationFormModal';
import {
  formatEducationPeriod,
  getEducationLevelLabel,
  sortEducationTimeline,
} from './educationHelpers';

export const EducationPage: React.FC = () => {
  const [records, setRecords] = useState<Education[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<ApiClientError | Error | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<Education | null>(null);
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [actionBanner, setActionBanner] = useState<{
    tone: 'success' | 'error';
    message: string;
  } | null>(null);

  const loadEducation = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const response = await educationService.list({ page: 1, page_size: 100 });
      const sorted = sortEducationTimeline(response.items);
      setRecords(sorted);
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
    void loadEducation();
  }, [loadEducation]);

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

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl pb-12">
        <LoadingState label="Loading education history…" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="mx-auto max-w-4xl pb-12">
        <ErrorState error={loadError} onRetry={() => void loadEducation()} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8 pb-12">
      {/* Editorial Header */}
      <header className="flex flex-col gap-5 border-b border-[var(--border-subtle)] pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--text-secondary)]">
            MODULE 03 — EDUCATION
          </p>
          <h1 className="mt-2 font-serif text-3xl text-[var(--text-primary)] sm:text-4xl">
            Education &amp; Academic Journey
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--text-secondary)]">
            Chronicle your schools, pre-university boards, diplomas, and university degrees in an
            editorial timeline. Control what appears on your public folio record by record.
          </p>
        </div>

        <div className="shrink-0">
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
              ? 'border-[var(--accent)]/40 bg-[var(--bg-secondary)]/70 text-[var(--text-primary)]'
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
            className="font-mono text-[11px] uppercase tracking-[0.1em] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Current Education Summary */}
      {primarySummary && (
        <section
          aria-label="Current education summary"
          className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)]/50 p-6"
        >
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--text-secondary)]">
                  {currentRecords.length > 0 ? 'Current Education' : 'Latest Qualification'}
                </span>
                {primarySummary.is_current ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--accent)]/40 bg-[var(--accent)]/10 px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.1em] text-[var(--accent)]">
                    <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
                    Currently Studying
                  </span>
                ) : (
                  <span className="inline-flex items-center rounded-full border border-[var(--border-medium)] px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.1em] text-[var(--text-secondary)]">
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
          description="Record your school, pre-university board, diploma, or university degrees to build a verified academic timeline for your portfolio."
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

                  <article
                    className={`rounded-xl border transition-colors ${
                      record.is_current
                        ? 'border-[var(--border-medium)] bg-[var(--bg-secondary)]/45'
                        : 'border-[var(--border-subtle)] bg-[var(--bg-main)]/75'
                    }`}
                  >
                    <div className="p-5 sm:p-6">
                      {/* Top Meta Row */}
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="inline-flex items-center gap-1 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-secondary)] px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.1em] text-[var(--text-secondary)]">
                            <GraduationCap className="h-3 w-3" />
                            {levelLabel}
                          </span>
                          {record.is_current ? (
                            <span className="inline-flex items-center gap-1 rounded-full border border-[var(--accent)]/40 bg-[var(--accent)]/10 px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.1em] text-[var(--accent)]">
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
                                    className="rounded-full border border-[var(--border-subtle)] bg-[var(--bg-secondary)] px-3 py-1 text-xs text-[var(--text-primary)]"
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

      <EducationFormModal
        open={modalOpen}
        editingRecord={editingRecord}
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
