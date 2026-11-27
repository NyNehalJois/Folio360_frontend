import React, { useEffect, useState } from 'react';
import {
  Award,
  ChevronLeft,
  ChevronRight,
  Download,
  ExternalLink,
  Eye,
  FileText,
  Globe,
  Loader2,
  Lock,
  Pencil,
  Star,
  Trophy,
  X,
} from 'lucide-react';
import { PillButton } from '@/design/components/PillButton';
import { documentsService, openDocumentSignedUrl } from '@/services/api';
import type { DocumentRef } from '@/types/api';
import {
  formatCredentialDate,
  getAchievementCategoryLabel,
  getCertificateCategoryLabel,
  getVerificationStatusMeta,
  type UnifiedCredentialItem,
} from './certificateHelpers';
import { DocumentThumbnail, formatMimeShort } from './DocumentThumbnail';

interface CertificateDetailsModalProps {
  item: UnifiedCredentialItem | null;
  onClose: () => void;
  onEdit: (item: UnifiedCredentialItem) => void;
}

export const CertificateDetailsModal: React.FC<CertificateDetailsModalProps> = ({
  item,
  onClose,
  onEdit,
}) => {
  const [loadingDocId, setLoadingDocId] = useState<string | null>(null);
  const [docError, setDocError] = useState<string | null>(null);
  const [activeDocIndex, setActiveDocIndex] = useState(0);

  const evidenceDocs: DocumentRef[] = item
    ? item.kind === 'certificate'
      ? item.data.document
        ? [item.data.document]
        : []
      : item.data.documents ?? []
    : [];

  const safeIndex =
    evidenceDocs.length > 0 ? Math.min(activeDocIndex, evidenceDocs.length - 1) : 0;
  const activeDoc = evidenceDocs[safeIndex] ?? null;

  useEffect(() => {
    setDocError(null);
    setLoadingDocId(null);
    setActiveDocIndex(0);
  }, [item]);

  useEffect(() => {
    if (!item) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [item, onClose]);

  if (!item) return null;

  const isCert = item.kind === 'certificate';

  const handleDocumentAccess = async (doc: DocumentRef, mode: 'preview' | 'download') => {
    if (loadingDocId) return;
    setLoadingDocId(`${doc.id}-${mode}`);
    setDocError(null);
    try {
      const signed =
        mode === 'preview'
          ? await documentsService.getPreviewUrl(doc.id)
          : await documentsService.getDownloadUrl(doc.id);
      openDocumentSignedUrl(signed.url, mode, doc.title);
    } catch (err) {
      setDocError(
        err instanceof Error
          ? err.message
          : 'Unable to open this private Document Vault file.',
      );
    } finally {
      setLoadingDocId(null);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 backdrop-blur-[2px]"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="credential-details-title"
        className="flex max-h-[88vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-[var(--border-medium)] bg-[var(--surface-elevated)] shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4 border-b border-[var(--border-subtle)] px-6 py-4">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full border border-[var(--border-accent)] bg-[var(--nav-active-bg)] px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.1em] text-[var(--accent)]">
                {isCert ? <Award className="h-3 w-3" /> : <Trophy className="h-3 w-3" />}
                {isCert ? 'Certificate' : 'Achievement'}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-[var(--border-subtle)] bg-[var(--surface-muted)] px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.08em] text-[var(--text-secondary)]">
                {item.data.visibility === 'public' ? (
                  <Globe className="h-3 w-3" />
                ) : (
                  <Lock className="h-3 w-3" />
                )}
                {item.data.visibility}
              </span>
              {item.data.featured && (
                <span className="inline-flex items-center gap-1 rounded-full border border-[var(--border-accent)] px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.08em] text-[var(--accent)]">
                  <Star className="h-3 w-3 fill-current" />
                  Featured
                </span>
              )}
            </div>
            <h2
              id="credential-details-title"
              className="mt-2 font-serif text-2xl text-[var(--text-primary)]"
            >
              {isCert ? item.data.name : item.data.title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close details dialog"
            className="cursor-pointer rounded-full p-2 text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
          {/* Two-column layout: Left = details, Right = compact document thumbnail preview */}
          <div
            className={
              activeDoc
                ? 'grid grid-cols-1 gap-5 sm:grid-cols-[minmax(0,1fr)_184px] sm:items-start'
                : 'space-y-5'
            }
          >
            {/* Left column: Metadata */}
            <div className="min-w-0 space-y-4">
              {isCert ? (
                <>
                  <div className="grid grid-cols-1 gap-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-main)]/70 p-4 sm:grid-cols-2">
                    <div>
                      <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--text-secondary)]">
                        Issuer
                      </p>
                      <p className="mt-1 text-sm font-medium text-[var(--text-primary)]">
                        {item.data.issuer}
                      </p>
                    </div>
                    <div>
                      <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--text-secondary)]">
                        Category
                      </p>
                      <p className="mt-1 text-sm text-[var(--text-primary)]">
                        {getCertificateCategoryLabel(item.data.category)}
                      </p>
                    </div>
                    <div>
                      <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--text-secondary)]">
                        Issued / Expiry
                      </p>
                      <p className="mt-1 text-sm text-[var(--text-primary)]">
                        {formatCredentialDate(item.data.issue_date) ?? 'Not specified'}
                        {item.data.expiry_date
                          ? ` → ${formatCredentialDate(item.data.expiry_date)}`
                          : ''}
                      </p>
                    </div>
                    <div>
                      <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--text-secondary)]">
                        Verification Status
                      </p>
                      <span
                        className={`mt-1 inline-flex rounded-full border px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.08em] ${getVerificationStatusMeta(item.data.verification_status).classes}`}
                      >
                        {getVerificationStatusMeta(item.data.verification_status).label}
                      </span>
                    </div>
                    {item.data.credential_id && (
                      <div className="sm:col-span-2">
                        <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--text-secondary)]">
                          Credential ID
                        </p>
                        <p className="mt-1 font-mono text-xs text-[var(--text-primary)]">
                          {item.data.credential_id}
                        </p>
                      </div>
                    )}
                  </div>

                  {item.data.verification_url && (
                    <a
                      href={item.data.verification_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 rounded-lg border border-[var(--border-accent)] bg-[var(--nav-active-bg)] px-4 py-2.5 text-xs font-medium text-[var(--accent)] hover:opacity-90"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      Open Verification Link
                    </a>
                  )}

                  {item.data.skills.length > 0 && (
                    <div>
                      <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--text-secondary)]">
                        Linked Skills
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {item.data.skills.map((skill) => (
                          <span
                            key={skill.id}
                            className="rounded-full border border-[var(--border-subtle)] bg-[var(--bg-main)] px-3 py-1 text-xs text-[var(--text-primary)]"
                          >
                            {skill.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="grid grid-cols-1 gap-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-main)]/70 p-4 sm:grid-cols-2">
                    <div>
                      <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--text-secondary)]">
                        Category
                      </p>
                      <p className="mt-1 text-sm font-medium text-[var(--text-primary)]">
                        {getAchievementCategoryLabel(item.data.category)}
                      </p>
                    </div>
                    <div>
                      <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--text-secondary)]">
                        Date
                      </p>
                      <p className="mt-1 text-sm text-[var(--text-primary)]">
                        {formatCredentialDate(item.data.date) ?? 'Not specified'}
                      </p>
                    </div>
                    {item.data.organization && (
                      <div className="sm:col-span-2">
                        <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--text-secondary)]">
                          Organization / Event
                        </p>
                        <p className="mt-1 text-sm text-[var(--text-primary)]">
                          {item.data.organization}
                        </p>
                      </div>
                    )}
                  </div>

                  {item.data.description && (
                    <div>
                      <p className="mb-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--text-secondary)]">
                        Description
                      </p>
                      <p className="whitespace-pre-line text-sm leading-relaxed text-[var(--text-secondary)]">
                        {item.data.description}
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Right column: Compact document preview thumbnail */}
            {activeDoc && (
              <div className="w-full space-y-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-main)]/70 p-3 sm:w-[184px]">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--text-secondary)]">
                    Evidence
                  </span>
                  <span className="rounded-full border border-[var(--border-subtle)] bg-[var(--surface-elevated)] px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.08em] text-[var(--accent)]">
                    {formatMimeShort(activeDoc.mime_type)}
                  </span>
                </div>

                <DocumentThumbnail
                  doc={activeDoc}
                  size="modal"
                  onPreviewClick={(d) => void handleDocumentAccess(d, 'preview')}
                />

                <p className="truncate text-[11px] font-medium text-[var(--text-primary)]">
                  {activeDoc.title}
                </p>

                {evidenceDocs.length > 1 && (
                  <div className="flex items-center justify-between gap-1 border-t border-[var(--border-subtle)] pt-2">
                    <button
                      type="button"
                      aria-label="Previous evidence document"
                      onClick={() =>
                        setActiveDocIndex((prev) =>
                          prev === 0 ? evidenceDocs.length - 1 : prev - 1,
                        )
                      }
                      className="flex h-6 w-6 cursor-pointer items-center justify-center rounded border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:border-[var(--border-medium)] hover:text-[var(--text-primary)]"
                    >
                      <ChevronLeft className="h-3.5 w-3.5" />
                    </button>
                    <span className="font-mono text-[10px] text-[var(--text-secondary)]">
                      {safeIndex + 1} / {evidenceDocs.length}
                    </span>
                    <button
                      type="button"
                      aria-label="Next evidence document"
                      onClick={() =>
                        setActiveDocIndex((prev) => (prev + 1) % evidenceDocs.length)
                      }
                      className="flex h-6 w-6 cursor-pointer items-center justify-center rounded border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:border-[var(--border-medium)] hover:text-[var(--text-primary)]"
                    >
                      <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Evidence Documents */}
          <div>
            <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--text-secondary)]">
              Evidence Documents ({evidenceDocs.length})
            </p>
            {docError && (
              <p className="mb-2 rounded-lg border border-[var(--danger-border)] bg-[var(--danger-bg)] px-3 py-2 text-xs text-[var(--danger-text)]">
                {docError}
              </p>
            )}
            {evidenceDocs.length === 0 ? (
              <p className="rounded-lg border border-dashed border-[var(--border-subtle)] px-3 py-3 text-xs text-[var(--text-secondary)]">
                No evidence documents attached.
              </p>
            ) : (
              <ul className="space-y-2">
                {evidenceDocs.map((doc, idx) => {
                  const isActive = idx === safeIndex;
                  return (
                    <li
                      key={doc.id}
                      className={`flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3.5 py-2.5 transition-colors ${
                        isActive
                          ? 'border-[var(--border-accent)] bg-[var(--bg-main)]'
                          : 'border-[var(--border-subtle)] bg-[var(--bg-main)]/65'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => setActiveDocIndex(idx)}
                        className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 text-left"
                      >
                        <FileText className="h-4 w-4 shrink-0 text-[var(--accent)]" />
                        <span className="truncate text-xs font-medium text-[var(--text-primary)]">
                          {doc.title}
                        </span>
                        <span className="rounded border border-[var(--border-subtle)] px-1.5 py-0.5 font-mono text-[9px] uppercase text-[var(--text-secondary)]">
                          {formatMimeShort(doc.mime_type)}
                        </span>
                      </button>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          disabled={Boolean(loadingDocId)}
                          onClick={() => void handleDocumentAccess(doc, 'preview')}
                          className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-[var(--border-subtle)] px-2.5 py-1 text-xs text-[var(--text-primary)] hover:border-[var(--accent)] disabled:opacity-50"
                        >
                          {loadingDocId === `${doc.id}-preview` ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Eye className="h-3 w-3" />
                          )}
                          Preview
                        </button>
                        <button
                          type="button"
                          disabled={Boolean(loadingDocId)}
                          onClick={() => void handleDocumentAccess(doc, 'download')}
                          className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-[var(--border-subtle)] px-2.5 py-1 text-xs text-[var(--text-primary)] hover:border-[var(--accent)] disabled:opacity-50"
                        >
                          {loadingDocId === `${doc.id}-download` ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Download className="h-3 w-3" />
                          )}
                          Download
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-[var(--border-subtle)] bg-[var(--bg-secondary)]/30 px-6 py-3.5">
          <PillButton variant="secondary" onClick={onClose}>
            Close
          </PillButton>
          <PillButton
            onClick={() => {
              onClose();
              onEdit(item);
            }}
          >
            <Pencil className="h-3.5 w-3.5" />
            Edit
          </PillButton>
        </div>
      </div>
    </div>
  );
};
