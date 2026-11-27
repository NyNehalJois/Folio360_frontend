import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Calendar,
  CheckCircle2,
  Download,
  ExternalLink,
  FileText,
  Info,
  Loader2,
  RefreshCw,
  Search,
  Upload,
} from 'lucide-react';
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from '@/design/components/EditorialStates';
import { PillButton } from '@/design/components/PillButton';
import { documentsService, openDocumentSignedUrl } from '@/services/api';
import { ApiClientError } from '@/services/http';
import type {
  Document,
  DocumentCategory,
  DocumentCategoryInfo,
  DocumentProcessingStatus,
} from '@/types/api';
import { DocumentDetailsModal } from './DocumentDetailsModal';
import {
  canRescanDocument,
  DocumentStatusBadge,
  formatDocumentFailureReason,
  isDocumentReady,
} from './DocumentStatusBadge';
import {
  DOCUMENT_CATEGORY_OPTIONS,
  DocumentUploadWidget,
  formatDocumentCategory,
  formatFileSize,
} from './DocumentUploadWidget';

const STATUS_FILTER_OPTIONS: {
  value: DocumentProcessingStatus | 'all';
  label: string;
}[] = [
  { value: 'all', label: 'All Statuses' },
  { value: 'ready', label: 'Ready' },
  { value: 'pending_scan', label: 'Pending scan' },
  { value: 'scanning', label: 'Scanning' },
  { value: 'scan_failed', label: 'Scan failed' },
  { value: 'rejected', label: 'Rejected' },
];

export const DocumentVaultPage: React.FC = () => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [categories, setCategories] = useState<DocumentCategoryInfo[]>(
    DOCUMENT_CATEGORY_OPTIONS.map((opt) => ({
      key: opt.value,
      label: opt.label,
    })),
  );
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<ApiClientError | Error | null>(
    null,
  );

  const [uploadOpen, setUploadOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<
    DocumentCategory | 'all'
  >('all');
  const [statusFilter, setStatusFilter] = useState<
    DocumentProcessingStatus | 'all'
  >('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'title'>('newest');

  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [busyDocId, setBusyDocId] = useState<string | null>(null);
  const [banner, setBanner] = useState<{
    tone: 'success' | 'error';
    message: string;
  } | null>(null);

  const loadVault = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [docsRes, catsRes] = await Promise.allSettled([
        documentsService.list({ page: 1, page_size: 100 }),
        documentsService.listCategories(),
      ]);
      if (docsRes.status === 'rejected') {
        throw docsRes.reason;
      }
      setDocuments(docsRes.value.items);
      if (catsRes.status === 'fulfilled' && catsRes.value.items.length > 0) {
        setCategories(catsRes.value.items);
      }
    } catch (err) {
      setLoadError(err as ApiClientError | Error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadVault();
  }, [loadVault]);

  const selectedDoc = useMemo(
    () => documents.find((doc) => doc.id === selectedDocId) ?? null,
    [documents, selectedDocId],
  );

  const filteredDocuments = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = documents.filter((doc) => {
      if (categoryFilter !== 'all' && doc.category !== categoryFilter) {
        return false;
      }
      if (statusFilter !== 'all' && doc.processing_status !== statusFilter) {
        return false;
      }
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
      if (sortBy === 'title') return a.title.localeCompare(b.title);
      const timeA = new Date(a.uploaded_at).getTime();
      const timeB = new Date(b.uploaded_at).getTime();
      return sortBy === 'oldest' ? timeA - timeB : timeB - timeA;
    });
  }, [documents, searchQuery, categoryFilter, statusFilter, sortBy]);

  const counts = useMemo(() => {
    const readyCount = documents.filter((d) => isDocumentReady(d)).length;
    const pendingCount = documents.filter(
      (d) =>
        d.processing_status === 'pending_scan' ||
        d.processing_status === 'scanning',
    ).length;
    const issueCount = documents.filter(
      (d) =>
        d.processing_status === 'rejected' ||
        d.processing_status === 'scan_failed',
    ).length;
    return { readyCount, pendingCount, issueCount };
  }, [documents]);

  const handleOpenSignedUrl = async (
    doc: Document,
    kind: 'preview' | 'download',
  ) => {
    if (!isDocumentReady(doc) || busyDocId) return;
    setBusyDocId(doc.id);
    setBanner(null);
    try {
      const res =
        kind === 'preview'
          ? await documentsService.getPreviewUrl(doc.id)
          : await documentsService.getDownloadUrl(doc.id);
      openDocumentSignedUrl(res.url, kind, doc.original_filename);
    } catch (err) {
      if (err instanceof ApiClientError) {
        setBanner({ tone: 'error', message: err.message });
        if (
          err.code === 'DOCUMENT_NOT_READY' ||
          err.code === 'DOCUMENT_REJECTED' ||
          err.code === 'DOCUMENT_SCAN_FAILED'
        ) {
          try {
            const refreshed = await documentsService.get(doc.id);
            setDocuments((prev) =>
              prev.map((item) => (item.id === doc.id ? refreshed : item)),
            );
          } catch {
            // Keep banner
          }
        }
      } else {
        setBanner({
          tone: 'error',
          message: `Unable to fetch ${kind} link right now.`,
        });
      }
    } finally {
      setBusyDocId(null);
    }
  };

  const handleRescan = async (doc: Document) => {
    if (!canRescanDocument(doc) || busyDocId) return;
    setBusyDocId(doc.id);
    setBanner(null);
    try {
      const updated = await documentsService.rescan(doc.id);
      setDocuments((prev) =>
        prev.map((item) => (item.id === doc.id ? updated : item)),
      );
      setBanner({
        tone: updated.processing_status === 'ready' ? 'success' : 'error',
        message:
          updated.processing_status === 'ready'
            ? `"${updated.title}" passed validation and is now ready.`
            : `"${updated.title}" scan status: ${updated.processing_status}.`,
      });
    } catch (err) {
      setBanner({
        tone: 'error',
        message:
          err instanceof ApiClientError
            ? err.message
            : 'Unable to rescan this document right now.',
      });
    } finally {
      setBusyDocId(null);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8 pb-12 sm:px-6">
        <LoadingState label="Loading Document Vault…" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8 pb-12 sm:px-6">
        <ErrorState error={loadError} onRetry={() => void loadVault()} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8 px-4 py-8 pb-16 sm:px-6">
      {/* Editorial Header */}
      <header className="flex flex-col gap-5 border-b border-[var(--border-subtle)] pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--text-secondary)]">
            MODULE 10 — DOCUMENT VAULT
          </p>
          <h1 className="mt-2 font-serif text-3xl text-[var(--text-primary)] sm:text-4xl">
            Document Vault
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--text-secondary)]">
            Store private marksheets, certificates, and supporting records. All
            uploads are validated and scanned before preview or download links
            are enabled.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <PillButton
            variant="secondary"
            size="sm"
            onClick={() => void loadVault()}
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </PillButton>
          <PillButton onClick={() => setUploadOpen((prev) => !prev)}>
            <Upload className="h-4 w-4" />
            {uploadOpen ? 'Close Upload' : 'Upload Document'}
          </PillButton>
        </div>
      </header>

      {/* Action Feedback Banner */}
      {banner && (
        <div
          role={banner.tone === 'error' ? 'alert' : 'status'}
          className={`flex items-center justify-between gap-3 rounded-lg border px-4 py-3 text-sm ${
            banner.tone === 'success'
              ? 'border-[var(--border-accent)] bg-[var(--surface-elevated)] text-[var(--text-primary)]'
              : 'border-[var(--danger-border)] bg-[var(--danger-bg)] text-[var(--danger-text)]'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{banner.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setBanner(null)}
            className="font-mono text-[11px] uppercase tracking-[0.1em] text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Vault Summary Strip */}
      <section
        aria-label="Document Vault summary"
        className="grid grid-cols-2 gap-4 rounded-xl border border-[var(--border-medium)] bg-[var(--surface-elevated)] p-5 sm:grid-cols-4"
      >
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--text-secondary)]">
            Total Files
          </p>
          <p className="mt-1 font-serif text-2xl text-[var(--text-primary)]">
            {documents.length}
          </p>
        </div>
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--text-secondary)]">
            Ready
          </p>
          <p className="mt-1 font-serif text-2xl text-[var(--text-primary)]">
            {counts.readyCount}
          </p>
        </div>
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--text-secondary)]">
            Scanning
          </p>
          <p className="mt-1 font-serif text-2xl text-[var(--text-primary)]">
            {counts.pendingCount}
          </p>
        </div>
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--text-secondary)]">
            Needs Attention
          </p>
          <p className="mt-1 font-serif text-2xl text-[var(--text-primary)]">
            {counts.issueCount}
          </p>
        </div>
      </section>

      {/* Collapsible Upload Drawer */}
      {uploadOpen && (
        <section
          aria-label="Upload new document"
          className="rounded-xl border border-[var(--border-medium)] bg-[var(--surface-elevated)] p-5"
        >
          <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--text-secondary)]">
            Upload Private Document
          </p>
          <DocumentUploadWidget
            categories={categories}
            showNotes
            showEducationToggle
            onUploaded={(doc) => {
              setDocuments((prev) => [doc, ...prev]);
              setUploadOpen(false);
              setBanner({
                tone:
                  doc.processing_status === 'rejected' ||
                  doc.processing_status === 'scan_failed'
                    ? 'error'
                    : 'success',
                message:
                  doc.processing_status === 'ready'
                    ? `Uploaded "${doc.title}" — validated and ready.`
                    : `Uploaded "${doc.title}" (status: ${doc.processing_status}).`,
              });
            }}
          />
        </section>
      )}

      {/* Search & Filter Bar */}
      {documents.length > 0 && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--text-secondary)]" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by title, filename, or notes…"
              className="w-full rounded-full border border-[var(--border-medium)] bg-[var(--surface-elevated)] py-2 pl-9 pr-4 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]/60 focus:border-[var(--text-primary)] focus:outline-none"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              aria-label="Filter by category"
              value={categoryFilter}
              onChange={(e) =>
                setCategoryFilter(e.target.value as DocumentCategory | 'all')
              }
              className="rounded-full border border-[var(--border-medium)] bg-[var(--surface-elevated)] px-3.5 py-2 text-xs text-[var(--text-primary)] focus:border-[var(--text-primary)] focus:outline-none cursor-pointer"
            >
              <option value="all">All Categories</option>
              {categories.map((cat) => (
                <option key={cat.key} value={cat.key}>
                  {cat.label}
                </option>
              ))}
            </select>

            <select
              aria-label="Filter by scan status"
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(
                  e.target.value as DocumentProcessingStatus | 'all',
                )
              }
              className="rounded-full border border-[var(--border-medium)] bg-[var(--surface-elevated)] px-3.5 py-2 text-xs text-[var(--text-primary)] focus:border-[var(--text-primary)] focus:outline-none cursor-pointer"
            >
              {STATUS_FILTER_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>

            <select
              aria-label="Sort documents"
              value={sortBy}
              onChange={(e) =>
                setSortBy(e.target.value as 'newest' | 'oldest' | 'title')
              }
              className="rounded-full border border-[var(--border-medium)] bg-[var(--surface-elevated)] px-3.5 py-2 text-xs text-[var(--text-primary)] focus:border-[var(--text-primary)] focus:outline-none cursor-pointer"
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="title">Title A–Z</option>
            </select>
          </div>
        </div>
      )}

      {/* Document List / Empty State */}
      {documents.length === 0 ? (
        <EmptyState
          title="Your Document Vault is empty"
          description="Upload academic marksheets, certificates, or resumes. Each file is validated and scanned before becoming accessible."
          action={
            <PillButton onClick={() => setUploadOpen(true)}>
              <Upload className="h-4 w-4" />
              Upload your first document
            </PillButton>
          }
        />
      ) : filteredDocuments.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[var(--border-medium)] bg-[var(--surface-elevated)] px-6 py-10 text-center">
          <p className="text-sm text-[var(--text-secondary)]">
            No documents match your search or filters.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {filteredDocuments.map((doc) => {
            const ready = isDocumentReady(doc);
            const rescanAllowed = canRescanDocument(doc);
            const isBusy = busyDocId === doc.id;
            const failureText = formatDocumentFailureReason(doc.failure_reason);
            const uploadedLabel = new Date(doc.uploaded_at).toLocaleDateString(
              'en-GB',
              { day: '2-digit', month: 'short', year: 'numeric' },
            );

            return (
              <article
                key={doc.id}
                className="flex flex-col justify-between rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-elevated)] p-5 transition-colors hover:border-[var(--border-medium)]"
              >
                <div>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 shrink-0 text-[var(--text-secondary)]" />
                        <h2 className="truncate text-sm font-semibold text-[var(--text-primary)]">
                          {doc.title}
                        </h2>
                      </div>
                      <p className="mt-1 truncate font-mono text-[11px] text-[var(--text-secondary)]">
                        {doc.original_filename}
                      </p>
                    </div>
                    <DocumentStatusBadge status={doc.processing_status} />
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-[var(--text-secondary)]">
                    <span className="rounded-full border border-[var(--border-subtle)] bg-[var(--surface-muted)] px-2.5 py-0.5 text-[10px] font-medium">
                      {formatDocumentCategory(doc.category)}
                    </span>
                    <span className="font-mono text-[10px] uppercase">
                      {doc.mime_type === 'application/pdf'
                        ? 'PDF'
                        : doc.mime_type === 'image/jpeg'
                          ? 'JPEG'
                          : 'PNG'}
                    </span>
                    <span>· {formatFileSize(doc.size_bytes)}</span>
                    <span className="inline-flex items-center gap-1">
                      · <Calendar className="h-3 w-3" /> {uploadedLabel}
                    </span>
                  </div>

                  {doc.notes && (
                    <p className="mt-2.5 line-clamp-2 text-xs leading-relaxed text-[var(--text-secondary)]">
                      {doc.notes}
                    </p>
                  )}

                  {failureText && (
                    <p className="mt-2.5 rounded-md border border-[var(--danger-border)] bg-[var(--danger-bg)] px-2.5 py-1.5 text-[11px] text-[var(--danger-text)]">
                      {failureText}
                    </p>
                  )}

                  {!ready && !failureText && (
                    <p className="mt-2.5 text-[11px] text-[var(--text-secondary)]">
                      Security scan must finish before preview or download is
                      available.
                    </p>
                  )}
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-[var(--border-subtle)] pt-3">
                  <div className="flex flex-wrap items-center gap-2">
                    {ready && (
                      <>
                        <PillButton
                          variant="secondary"
                          size="sm"
                          disabled={isBusy}
                          onClick={() => void handleOpenSignedUrl(doc, 'preview')}
                        >
                          {isBusy ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <ExternalLink className="h-3.5 w-3.5" />
                          )}
                          Preview
                        </PillButton>
                        <PillButton
                          variant="ghost"
                          size="sm"
                          disabled={isBusy}
                          onClick={() =>
                            void handleOpenSignedUrl(doc, 'download')
                          }
                        >
                          <Download className="h-3.5 w-3.5" />
                          Download
                        </PillButton>
                      </>
                    )}

                    {rescanAllowed && (
                      <PillButton
                        variant="secondary"
                        size="sm"
                        disabled={isBusy}
                        onClick={() => void handleRescan(doc)}
                      >
                        <RefreshCw
                          className={`h-3.5 w-3.5 ${isBusy ? 'animate-spin' : ''}`}
                        />
                        Rescan
                      </PillButton>
                    )}
                  </div>

                  <PillButton
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedDocId(doc.id)}
                  >
                    <Info className="h-3.5 w-3.5" />
                    Details
                  </PillButton>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <DocumentDetailsModal
        open={Boolean(selectedDoc)}
        doc={selectedDoc}
        categories={categories}
        onClose={() => setSelectedDocId(null)}
        onUpdated={(updated) => {
          setDocuments((prev) =>
            prev.map((item) => (item.id === updated.id ? updated : item)),
          );
        }}
        onDeleted={(deletedId) => {
          setDocuments((prev) => prev.filter((item) => item.id !== deletedId));
          setBanner({
            tone: 'success',
            message: 'Document removed from your Document Vault.',
          });
        }}
      />
    </div>
  );
};
