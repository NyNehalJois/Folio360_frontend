import React, { useEffect, useState } from 'react';
import {
  Briefcase,
  ChevronLeft,
  ChevronRight,
  Download,
  ExternalLink,
  Eye,
  FileText,
  Globe,
  Loader2,
  Lock,
  MapPin,
  Pencil,
  Star,
  X,
} from 'lucide-react';
import { PillButton } from '@/design/components/PillButton';
import { DocumentThumbnail, formatMimeShort } from '@/features/certificates/DocumentThumbnail';
import { documentsService, openDocumentSignedUrl } from '@/services/api';
import type { DocumentRef, Experience } from '@/types/api';
import {
  formatExperienceDateRange,
  formatExperienceDuration,
  formatExperienceLocation,
  getExperienceTypeLabel,
} from './experienceHelpers';

interface ExperienceDetailsModalProps {
  item: Experience | null;
  onClose: () => void;
  onEdit: (item: Experience) => void;
}

export const ExperienceDetailsModal: React.FC<ExperienceDetailsModalProps> = ({
  item,
  onClose,
  onEdit,
}) => {
  const [loadingDocId, setLoadingDocId] = useState<string | null>(null);
  const [docError, setDocError] = useState<string | null>(null);
  const [activeDocIndex, setActiveDocIndex] = useState(0);

  const evidenceDocs: DocumentRef[] = item?.documents ?? [];
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
    } catch {
      setDocError('Unable to access this Document Vault attachment right now.');
    } finally {
      setLoadingDocId(null);
    }
  };

  const hasDocuments = evidenceDocs.length > 0;
  const dateRange = formatExperienceDateRange(
    item.start_date,
    item.end_date,
    item.is_current,
  );
  const duration = formatExperienceDuration(
    item.start_date,
    item.end_date,
    item.is_current,
  );
  const locationText = formatExperienceLocation(item);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="experience-details-title"
      onClick={onClose}
    >
      <div
        className={`max-h-[90vh] w-full overflow-y-auto rounded-xl border border-[var(--border-medium)] bg-[var(--surface-elevated)] shadow-2xl ${
          hasDocuments ? 'max-w-3xl' : 'max-w-xl'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-[var(--border-subtle)] px-6 py-5">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-main)] px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--text-secondary)]">
                <Briefcase className="h-3 w-3" />
                {getExperienceTypeLabel(item.type)}
              </span>
              {item.is_current && (
                <span className="inline-flex items-center rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.1em] text-emerald-700 dark:text-emerald-300">
                  Current
                </span>
              )}
              {item.featured && (
                <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.1em] text-amber-600 dark:text-amber-300">
                  <Star className="h-3 w-3 fill-current" /> Featured
                </span>
              )}
              <span className="inline-flex items-center gap-1 rounded-full border border-[var(--border-subtle)] px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.1em] text-[var(--text-secondary)]">
                {item.visibility === 'public' ? (
                  <Globe className="h-3 w-3" />
                ) : (
                  <Lock className="h-3 w-3" />
                )}
                {item.visibility}
              </span>
            </div>
            <h2
              id="experience-details-title"
              className="mt-2 font-serif text-2xl font-normal text-[var(--text-primary)]"
            >
              {item.role}
            </h2>
            <p className="mt-0.5 text-sm text-[var(--text-secondary)]">
              {item.organization}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close details"
            className="inline-flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full border border-[var(--border-subtle)] text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-6">
          <div
            className={
              hasDocuments
                ? 'grid grid-cols-1 gap-6 md:grid-cols-[minmax(0,1fr)_220px] md:items-start'
                : 'space-y-4'
            }
          >
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--text-secondary)]">
                    Duration
                  </p>
                  <p className="mt-0.5 text-sm text-[var(--text-primary)]">
                    {dateRange}
                    {duration ? (
                      <span className="ml-1.5 text-xs text-[var(--text-secondary)]">
                        ({duration})
                      </span>
                    ) : null}
                  </p>
                </div>

                {locationText && (
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--text-secondary)]">
                      Location
                    </p>
                    <p className="mt-0.5 inline-flex items-center gap-1 text-sm text-[var(--text-primary)]">
                      <MapPin className="h-3.5 w-3.5 text-[var(--text-secondary)]" />
                      {locationText}
                    </p>
                  </div>
                )}

                {item.organization_url && (
                  <div className="sm:col-span-2">
                    <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--text-secondary)]">
                      Organization Website
                    </p>
                    <a
                      href={item.organization_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-0.5 inline-flex items-center gap-1 text-sm text-[var(--accent)] hover:underline"
                    >
                      {item.organization_url}
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </div>
                )}
              </div>

              {item.description && (
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--text-secondary)]">
                    Overview
                  </p>
                  <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-[var(--text-primary)]">
                    {item.description}
                  </p>
                </div>
              )}

              {item.highlights && item.highlights.length > 0 && (
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--text-secondary)]">
                    Key Highlights
                  </p>
                  <ul className="mt-1.5 list-disc space-y-1.5 pl-4 text-sm text-[var(--text-primary)]">
                    {item.highlights.map((highlight, idx) => (
                      <li key={idx}>{highlight}</li>
                    ))}
                  </ul>
                </div>
              )}

              {item.skills && item.skills.length > 0 && (
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--text-secondary)]">
                    Skills Applied
                  </p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {item.skills.map((skill) => (
                      <span
                        key={skill.id}
                        className="rounded-full border border-[var(--border-subtle)] bg-[var(--bg-main)] px-2.5 py-0.5 text-xs text-[var(--text-primary)]"
                      >
                        {skill.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {hasDocuments && activeDoc && (
              <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-main)] p-3">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--text-secondary)]">
                    Evidence ({safeIndex + 1}/{evidenceDocs.length})
                  </p>
                  {evidenceDocs.length > 1 && (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() =>
                          setActiveDocIndex(
                            (prev) => (prev - 1 + evidenceDocs.length) % evidenceDocs.length,
                          )
                        }
                        aria-label="Previous evidence document"
                        className="inline-flex h-6 w-6 cursor-pointer items-center justify-center rounded-full border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:bg-[var(--surface-muted)]"
                      >
                        <ChevronLeft className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setActiveDocIndex((prev) => (prev + 1) % evidenceDocs.length)
                        }
                        aria-label="Next evidence document"
                        className="inline-flex h-6 w-6 cursor-pointer items-center justify-center rounded-full border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:bg-[var(--surface-muted)]"
                      >
                        <ChevronRight className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                <DocumentThumbnail
                  doc={activeDoc}
                  size="modal"
                  onPreviewClick={(doc) => void handleDocumentAccess(doc, 'preview')}
                />

                <div className="mt-2.5">
                  <p className="truncate text-xs font-medium text-[var(--text-primary)]">
                    {activeDoc.title}
                  </p>
                  <p className="mt-0.5 inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.1em] text-[var(--text-secondary)]">
                    <FileText className="h-3 w-3" />
                    {formatMimeShort(activeDoc.mime_type)}
                  </p>
                </div>

                <div className="mt-3 flex gap-1.5">
                  <PillButton
                    type="button"
                    variant="secondary"
                    size="sm"
                    disabled={Boolean(loadingDocId)}
                    onClick={() => void handleDocumentAccess(activeDoc, 'preview')}
                    className="flex-1 justify-center"
                  >
                    {loadingDocId === `${activeDoc.id}-preview` ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Eye className="h-3 w-3" />
                    )}
                    Open
                  </PillButton>
                  <PillButton
                    type="button"
                    variant="secondary"
                    size="sm"
                    disabled={Boolean(loadingDocId)}
                    onClick={() => void handleDocumentAccess(activeDoc, 'download')}
                    className="flex-1 justify-center"
                  >
                    {loadingDocId === `${activeDoc.id}-download` ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Download className="h-3 w-3" />
                    )}
                    Save
                  </PillButton>
                </div>

                {docError && (
                  <p className="mt-2 text-[11px] text-[var(--danger-text)]">{docError}</p>
                )}
              </div>
            )}
          </div>

          <div className="mt-6 flex items-center justify-end gap-2 border-t border-[var(--border-subtle)] pt-4">
            <PillButton type="button" variant="secondary" onClick={onClose}>
              Close
            </PillButton>
            <PillButton
              type="button"
              variant="primary"
              onClick={() => {
                onClose();
                onEdit(item);
              }}
            >
              <Pencil className="h-3.5 w-3.5" /> Edit
            </PillButton>
          </div>
        </div>
      </div>
    </div>
  );
};
