import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  Check,
  Download,
  ExternalLink,
  Loader2,
  Pencil,
  RefreshCw,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import { PillButton } from '@/design/components/PillButton';
import { documentsService, openDocumentSignedUrl } from '@/services/api';
import { ApiClientError } from '@/services/http';
import type {
  Document,
  DocumentCategory,
  DocumentCategoryInfo,
} from '@/types/api';
import { DocumentAnalysisModal } from './DocumentAnalysisModal';
import {
  canRescanDocument,
  DocumentStatusBadge,
  formatDocumentFailureReason,
  getDocumentStatusMeta,
  isDocumentReady,
} from './DocumentStatusBadge';
import {
  DOCUMENT_CATEGORY_OPTIONS,
  formatDocumentCategory,
  formatFileSize,
} from './DocumentUploadWidget';

interface DocumentDetailsModalProps {
  open: boolean;
  doc: Document | null;
  categories: DocumentCategoryInfo[];
  onClose: () => void;
  onUpdated: (updated: Document) => void;
  onDeleted: (documentId: string) => void;
}

const INPUT_CLASS =
  'w-full rounded-md border border-[var(--border-medium)] bg-[var(--bg-main)] px-3.5 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]/60 focus:border-[var(--text-primary)] focus:outline-none disabled:opacity-50';

const LABEL_CLASS =
  'block font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--text-secondary)] mb-1';

function formatMimeLabel(mime: Document['mime_type']): string {
  if (mime === 'application/pdf') return 'PDF';
  if (mime === 'image/jpeg') return 'JPEG';
  return 'PNG';
}

export const DocumentDetailsModal: React.FC<DocumentDetailsModalProps> = ({
  open,
  doc,
  categories,
  onClose,
  onUpdated,
  onDeleted,
}) => {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<DocumentCategory>('other');
  const [notes, setNotes] = useState('');
  const [showInEducation, setShowInEducation] = useState(true);

  const [saving, setSaving] = useState(false);
  const [rescanning, setRescanning] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [fetchingAction, setFetchingAction] = useState<
    'preview' | 'download' | null
  >(null);
  const [deleteStep, setDeleteStep] = useState<'idle' | 'confirm' | 'in_use'>(
    'idle',
  );
  const [linkedCount, setLinkedCount] = useState<number>(0);
  const [deleting, setDeleting] = useState(false);
  const [analysisOpen, setAnalysisOpen] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !doc) return;
    setEditing(false);
    setTitle(doc.title);
    setCategory(doc.category);
    setNotes(doc.notes ?? '');
    setShowInEducation(doc.show_in_education);
    setDeleteStep('idle');
    setLinkedCount(doc.attached_to.length);
    setActionError(null);
    setSaving(false);
    setRescanning(false);
    setRefreshing(false);
    setFetchingAction(null);
    setDeleting(false);
    setAnalysisOpen(false);
  }, [open, doc]);

  const busy =
    saving ||
    rescanning ||
    refreshing ||
    fetchingAction !== null ||
    deleting;

  useEffect(() => {
    if (!open || analysisOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !busy) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, analysisOpen, busy, onClose]);

  if (!open || !doc) return null;

  const ready = isDocumentReady(doc);
  const rescanAllowed = canRescanDocument(doc);
  const statusMeta = getDocumentStatusMeta(doc.processing_status);
  const failureMsg = formatDocumentFailureReason(doc.failure_reason);

  const categoryOptions =
    categories.length > 0
      ? categories.map((item) => ({ value: item.key, label: item.label }))
      : DOCUMENT_CATEGORY_OPTIONS;

  const syncFreshMetadata = async () => {
    try {
      const latest = await documentsService.get(doc.id);
      onUpdated(latest);
    } catch {
      // Best-effort status sync after stale error
    }
  };

  const handleOpenSignedUrl = async (kind: 'preview' | 'download') => {
    if (!ready || busy) return;
    setFetchingAction(kind);
    setActionError(null);
    try {
      const res =
        kind === 'preview'
          ? await documentsService.getPreviewUrl(doc.id)
          : await documentsService.getDownloadUrl(doc.id);
      openDocumentSignedUrl(res.url, kind, doc.original_filename);
    } catch (err) {
      if (err instanceof ApiClientError) {
        setActionError(err.message);
        if (
          err.code === 'DOCUMENT_NOT_READY' ||
          err.code === 'DOCUMENT_REJECTED' ||
          err.code === 'DOCUMENT_SCAN_FAILED'
        ) {
          await syncFreshMetadata();
        }
      } else {
        setActionError(`Unable to fetch ${kind} link right now.`);
      }
    } finally {
      setFetchingAction(null);
    }
  };

  const handleRefreshStatus = async () => {
    if (busy) return;
    setRefreshing(true);
    setActionError(null);
    try {
      const fresh = await documentsService.get(doc.id);
      onUpdated(fresh);
    } catch (err) {
      setActionError(
        err instanceof ApiClientError
          ? err.message
          : 'Unable to refresh document status.',
      );
    } finally {
      setRefreshing(false);
    }
  };

  const handleRescan = async () => {
    if (!rescanAllowed || busy) return;
    setRescanning(true);
    setActionError(null);
    try {
      const updated = await documentsService.rescan(doc.id);
      onUpdated(updated);
    } catch (err) {
      if (err instanceof ApiClientError) {
        setActionError(err.message);
        await syncFreshMetadata();
      } else {
        setActionError('Unable to rescan this document right now.');
      }
    } finally {
      setRescanning(false);
    }
  };

  const handleSaveMetadata = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy) return;
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setActionError('Document title cannot be blank.');
      return;
    }

    const patchPayload: {
      title?: string;
      category?: DocumentCategory;
      notes?: string | null;
      show_in_education?: boolean;
    } = {};
    if (trimmedTitle !== doc.title) patchPayload.title = trimmedTitle;
    if (category !== doc.category) patchPayload.category = category;
    const normalizedNotes = notes.trim() || null;
    if (normalizedNotes !== (doc.notes ?? null)) {
      patchPayload.notes = normalizedNotes;
    }
    if (showInEducation !== doc.show_in_education) {
      patchPayload.show_in_education = showInEducation;
    }

    if (Object.keys(patchPayload).length === 0) {
      setEditing(false);
      return;
    }

    setSaving(true);
    setActionError(null);
    try {
      const updated = await documentsService.update(doc.id, patchPayload);
      onUpdated(updated);
      setEditing(false);
    } catch (err) {
      setActionError(
        err instanceof ApiClientError
          ? err.message
          : 'Unable to update document metadata.',
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (force: boolean) => {
    if (busy) return;
    setDeleting(true);
    setActionError(null);
    try {
      await documentsService.remove(doc.id, force);
      onDeleted(doc.id);
      onClose();
    } catch (err) {
      if (
        err instanceof ApiClientError &&
        err.status === 409 &&
        err.code === 'DOCUMENT_IN_USE' &&
        !force
      ) {
        setLinkedCount(Math.max(doc.attached_to.length, 1));
        setDeleteStep('in_use');
      } else {
        setActionError(
          err instanceof ApiClientError
            ? err.message
            : 'Unable to delete document.',
        );
      }
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 backdrop-blur-[2px]"
      role="presentation"
      onClick={(event) => {
        if (event.target === event.currentTarget && !busy) {
          onClose();
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="document-details-title"
        className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-[var(--border-medium)] bg-[var(--bg-main)] shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4 border-b border-[var(--border-subtle)] px-6 py-5">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--text-secondary)]">
                {formatDocumentCategory(doc.category)} · {formatMimeLabel(doc.mime_type)}
              </span>
              <DocumentStatusBadge status={doc.processing_status} />
            </div>
            <h2
              id="document-details-title"
              className="mt-1.5 truncate font-serif text-2xl text-[var(--text-primary)]"
            >
              {doc.title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            aria-label="Close document details"
            className="rounded-full p-2 text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)] disabled:opacity-50 cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
          {actionError && (
            <div
              role="alert"
              className="flex items-start gap-2.5 rounded-lg border border-[var(--danger-border)] bg-[var(--danger-bg)] px-4 py-3 text-xs text-[var(--danger-text)]"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{actionError}</span>
            </div>
          )}

          {/* Stage 5 Security / Validation Status Box */}
          <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-secondary)]/45 p-4 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--text-secondary)]">
                Validation &amp; Scan Status
              </span>
              <DocumentStatusBadge status={doc.processing_status} />
            </div>
            <p className="mt-2 text-[var(--text-secondary)]">
              {statusMeta.description}
            </p>
            {failureMsg && (
              <p className="mt-2 font-medium text-[var(--danger-text)]">
                Reason: {failureMsg}
              </p>
            )}
          </div>

          {editing ? (
            <form onSubmit={handleSaveMetadata} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="doc-edit-title" className={LABEL_CLASS}>
                    Document Title
                  </label>
                  <input
                    id="doc-edit-title"
                    type="text"
                    maxLength={255}
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    disabled={saving}
                    className={INPUT_CLASS}
                  />
                </div>
                <div>
                  <label htmlFor="doc-edit-category" className={LABEL_CLASS}>
                    Category
                  </label>
                  <select
                    id="doc-edit-category"
                    value={category}
                    onChange={(e) =>
                      setCategory(e.target.value as DocumentCategory)
                    }
                    disabled={saving}
                    className={INPUT_CLASS}
                  >
                    {categoryOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="doc-edit-notes" className={LABEL_CLASS}>
                  Notes (Optional)
                </label>
                <textarea
                  id="doc-edit-notes"
                  rows={3}
                  maxLength={2000}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  disabled={saving}
                  className={`${INPUT_CLASS} resize-y`}
                />
              </div>

              <label className="flex cursor-pointer items-start gap-2.5 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-secondary)]/35 px-3.5 py-2.5 text-xs">
                <input
                  type="checkbox"
                  checked={showInEducation}
                  onChange={(e) => setShowInEducation(e.target.checked)}
                  disabled={saving}
                  className="mt-0.5 h-3.5 w-3.5 rounded border-[var(--border-medium)] accent-[var(--accent)]"
                />
                <div>
                  <p className="font-medium text-[var(--text-primary)]">
                    Show in my private Education workspace
                  </p>
                  <p className="text-[11px] text-[var(--text-secondary)]">
                    Controls visibility in your private Education tab only. Does not share publicly.
                  </p>
                </div>
              </label>

              <div className="flex items-center justify-end gap-2">
                <PillButton
                  variant="secondary"
                  size="sm"
                  disabled={saving}
                  onClick={() => {
                    setEditing(false);
                    setTitle(doc.title);
                    setCategory(doc.category);
                    setNotes(doc.notes ?? '');
                    setShowInEducation(doc.show_in_education);
                  }}
                >
                  Cancel
                </PillButton>
                <PillButton type="submit" size="sm" disabled={saving}>
                  <Check className="h-3.5 w-3.5" />
                  {saving ? 'Saving…' : 'Save metadata'}
                </PillButton>
              </div>
            </form>
          ) : (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <p className={LABEL_CLASS}>Original Filename</p>
                  <p className="truncate text-[var(--text-primary)]">
                    {doc.original_filename}
                  </p>
                </div>
                <div>
                  <p className={LABEL_CLASS}>Size &amp; Type</p>
                  <p className="text-[var(--text-primary)]">
                    {formatFileSize(doc.size_bytes)} · {doc.mime_type}
                    {doc.page_count ? ` (${doc.page_count} pp.)` : ''}
                  </p>
                </div>
                <div>
                  <p className={LABEL_CLASS}>Uploaded</p>
                  <p className="text-[var(--text-primary)]">
                    {new Date(doc.uploaded_at).toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className={LABEL_CLASS}>Education Workspace Visibility</p>
                  <p className="text-[var(--text-primary)]">
                    {doc.show_in_education
                      ? 'Shown in private Education tab'
                      : 'Hidden from Education tab'}
                  </p>
                </div>
              </div>

              <div>
                <p className={LABEL_CLASS}>SHA-256 Checksum</p>
                <p className="break-all font-mono text-[11px] text-[var(--text-secondary)]">
                  {doc.sha256}
                </p>
              </div>

              {doc.notes && (
                <div>
                  <p className={LABEL_CLASS}>Notes</p>
                  <p className="whitespace-pre-line text-xs leading-relaxed text-[var(--text-secondary)]">
                    {doc.notes}
                  </p>
                </div>
              )}

              <div>
                <p className={LABEL_CLASS}>Linked Records</p>
                {doc.attached_to.length === 0 ? (
                  <p className="text-xs text-[var(--text-secondary)]">
                    Not currently attached to any Education record.
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {doc.attached_to.map((item) => (
                      <span
                        key={`${item.entity_type}-${item.entity_id}`}
                        className="inline-flex items-center rounded-full border border-[var(--border-subtle)] bg-[var(--surface-muted)] px-3 py-1 text-xs text-[var(--text-primary)]"
                      >
                        {item.label}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Safe Delete Confirmation & 409 DOCUMENT_IN_USE Conflict Dialog */}
          {deleteStep === 'confirm' && (
            <div
              role="alertdialog"
              aria-label="Confirm document deletion"
              className="flex flex-col gap-3 rounded-lg border border-[var(--danger-border)] bg-[var(--danger-bg)] p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <p className="text-xs text-[var(--danger-text)]">
                Permanently delete <strong>{doc.title}</strong> from your Document Vault?
              </p>
              <div className="flex items-center gap-2 shrink-0">
                <PillButton
                  variant="secondary"
                  size="sm"
                  disabled={deleting}
                  onClick={() => setDeleteStep('idle')}
                >
                  Cancel
                </PillButton>
                <button
                  type="button"
                  disabled={deleting}
                  onClick={() => void handleDelete(false)}
                  className="inline-flex h-8 cursor-pointer items-center justify-center rounded-full border border-[var(--danger-border)] bg-[var(--danger-text)] px-4 text-xs font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {deleting ? 'Deleting…' : 'Confirm delete'}
                </button>
              </div>
            </div>
          )}

          {deleteStep === 'in_use' && (
            <div
              role="alertdialog"
              aria-label="Document is linked to Education records"
              className="space-y-3 rounded-lg border border-[var(--danger-border)] bg-[var(--danger-bg)] p-4"
            >
              <p className="text-xs text-[var(--danger-text)]">
                <strong>{doc.title}</strong> is attached to {linkedCount}{' '}
                Education record{linkedCount === 1 ? '' : 's'}. Deleting it will
                permanently remove this file and unlink it from those Education
                entries.
              </p>
              <div className="flex flex-wrap items-center justify-end gap-2">
                <PillButton
                  variant="secondary"
                  size="sm"
                  disabled={deleting}
                  onClick={() => setDeleteStep('idle')}
                >
                  Cancel
                </PillButton>
                <button
                  type="button"
                  disabled={deleting}
                  onClick={() => void handleDelete(true)}
                  className="inline-flex h-8 cursor-pointer items-center justify-center rounded-full border border-[var(--danger-border)] bg-[var(--danger-text)] px-4 text-xs font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {deleting ? 'Removing…' : 'Unlink from Education & Delete'}
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--border-subtle)] bg-[var(--bg-secondary)]/30 px-6 py-4">
          <div className="flex flex-wrap items-center gap-2">
            {ready && (
              <>
                <PillButton
                  variant="primary"
                  size="sm"
                  disabled={busy}
                  onClick={() => void handleOpenSignedUrl('preview')}
                >
                  {fetchingAction === 'preview' ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <ExternalLink className="h-3.5 w-3.5" />
                  )}
                  Preview
                </PillButton>
                <PillButton
                  variant="secondary"
                  size="sm"
                  disabled={busy}
                  onClick={() => void handleOpenSignedUrl('download')}
                >
                  {fetchingAction === 'download' ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Download className="h-3.5 w-3.5" />
                  )}
                  Download
                </PillButton>
                <PillButton
                  variant="secondary"
                  size="sm"
                  disabled={busy}
                  onClick={() => setAnalysisOpen(true)}
                >
                  <Sparkles className="h-3.5 w-3.5 text-[var(--accent)]" />
                  Analyze Document
                </PillButton>
              </>
            )}

            {(doc.processing_status === 'pending_scan' ||
              doc.processing_status === 'scanning') && (
              <PillButton
                variant="secondary"
                size="sm"
                disabled={busy}
                onClick={() => void handleRefreshStatus()}
              >
                <RefreshCw
                  className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`}
                />
                Refresh status
              </PillButton>
            )}

            {rescanAllowed && (
              <PillButton
                variant="secondary"
                size="sm"
                disabled={busy}
                onClick={() => void handleRescan()}
              >
                <RefreshCw
                  className={`h-3.5 w-3.5 ${rescanning ? 'animate-spin' : ''}`}
                />
                {rescanning ? 'Rescanning…' : 'Rescan'}
              </PillButton>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {!editing && (
              <PillButton
                variant="secondary"
                size="sm"
                disabled={busy}
                onClick={() => setEditing(true)}
              >
                <Pencil className="h-3.5 w-3.5" />
                Edit metadata
              </PillButton>
            )}
            <PillButton
              variant="ghost"
              size="sm"
              disabled={busy}
              onClick={() =>
                setDeleteStep((prev) =>
                  prev === 'idle' ? 'confirm' : 'idle',
                )
              }
              className="text-[var(--danger-text)] hover:bg-[var(--danger-bg)]"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete
            </PillButton>
          </div>
        </div>
      </div>

      <DocumentAnalysisModal
        open={analysisOpen}
        doc={doc}
        onClose={() => setAnalysisOpen(false)}
      />
    </div>
  );
};
