import React, { useCallback, useEffect, useState } from 'react';
import { Check, FileText, Loader2, Upload } from 'lucide-react';
import {
  DocumentStatusBadge,
  isDocumentReady,
} from '@/features/documents/DocumentStatusBadge';
import {
  DocumentUploadWidget,
  formatDocumentCategory,
  formatFileSize,
} from '@/features/documents/DocumentUploadWidget';
import { documentsService } from '@/services/api';
import type { Document, DocumentCategory, UUID } from '@/types/api';

interface EvidenceDocumentPickerProps {
  mode: 'single' | 'multiple';
  selectedIds: UUID[];
  onChange: (nextIds: UUID[]) => void;
  defaultUploadCategory?: DocumentCategory;
  disabled?: boolean;
}

export const EvidenceDocumentPicker: React.FC<EvidenceDocumentPickerProps> = ({
  mode,
  selectedIds,
  onChange,
  defaultUploadCategory = 'certificate',
  disabled = false,
}) => {
  const [docs, setDocs] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showUpload, setShowUpload] = useState(false);

  const loadDocuments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await documentsService.list({ page: 1, page_size: 100 });
      setDocs(res.items ?? []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Unable to load Document Vault items.',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDocuments();
  }, [loadDocuments]);

  const toggleDocument = (doc: Document) => {
    if (disabled || !isDocumentReady(doc)) return;
    const isSelected = selectedIds.includes(doc.id);
    if (mode === 'single') {
      onChange(isSelected ? [] : [doc.id]);
      return;
    }
    if (isSelected) {
      onChange(selectedIds.filter((id) => id !== doc.id));
    } else {
      onChange([...selectedIds, doc.id]);
    }
  };

  const handleUploaded = (uploaded: Document) => {
    setDocs((prev) => [uploaded, ...prev.filter((d) => d.id !== uploaded.id)]);
    if (isDocumentReady(uploaded)) {
      if (mode === 'single') {
        onChange([uploaded.id]);
      } else if (!selectedIds.includes(uploaded.id)) {
        onChange([...selectedIds, uploaded.id]);
      }
    }
    setShowUpload(false);
  };

  return (
    <div className="space-y-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-main)]/70 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--text-secondary)]">
            {mode === 'single' ? 'Evidence Document (Optional)' : 'Evidence Documents (Optional)'}
          </p>
          <p className="mt-0.5 text-xs text-[var(--text-secondary)]">
            Attach trusted files from your Document Vault without duplicating storage.
          </p>
        </div>
        <button
          type="button"
          disabled={disabled}
          onClick={() => setShowUpload((prev) => !prev)}
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-[var(--border-medium)] bg-[var(--surface-elevated)] px-3 py-1.5 text-xs font-medium text-[var(--text-primary)] transition-colors hover:border-[var(--accent)] disabled:opacity-50"
        >
          <Upload className="h-3.5 w-3.5 text-[var(--accent)]" />
          {showUpload ? 'Hide Upload' : 'Upload New'}
        </button>
      </div>

      {showUpload && (
        <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-elevated)] p-3">
          <DocumentUploadWidget
            compact
            defaultCategory={defaultUploadCategory}
            showNotes={false}
            showEducationToggle={false}
            submitLabel="Upload to Vault"
            onUploaded={handleUploaded}
          />
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-2 py-4 text-xs text-[var(--text-secondary)]">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Loading Document Vault…
        </div>
      ) : error ? (
        <div className="flex items-center justify-between gap-2 rounded-lg border border-[var(--danger-border)] bg-[var(--danger-bg)] px-3 py-2 text-xs text-[var(--danger-text)]">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => void loadDocuments()}
            className="cursor-pointer underline"
          >
            Retry
          </button>
        </div>
      ) : docs.length === 0 ? (
        <p className="rounded-lg border border-dashed border-[var(--border-medium)] px-3 py-4 text-center text-xs text-[var(--text-secondary)]">
          No documents in your Document Vault yet. Click &ldquo;Upload New&rdquo; above to add evidence.
        </p>
      ) : (
        <ul className="max-h-48 space-y-1.5 overflow-y-auto pr-1">
          {docs.map((doc) => {
            const ready = isDocumentReady(doc);
            const selected = selectedIds.includes(doc.id);

            return (
              <li key={doc.id}>
                <button
                  type="button"
                  disabled={disabled || !ready}
                  onClick={() => toggleDocument(doc)}
                  className={`flex w-full items-center justify-between gap-3 rounded-lg border px-3 py-2 text-left transition-colors ${
                    selected
                      ? 'border-[var(--border-accent)] bg-[var(--nav-active-bg)]'
                      : 'border-[var(--border-subtle)] bg-[var(--surface-elevated)] hover:border-[var(--border-medium)]'
                  } ${!ready ? 'cursor-not-allowed opacity-55' : 'cursor-pointer'}`}
                >
                  <div className="flex min-w-0 flex-1 items-center gap-2.5">
                    <span
                      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                        selected
                          ? 'border-[var(--accent)] bg-[var(--accent)] text-[#171513]'
                          : 'border-[var(--border-medium)] bg-transparent'
                      }`}
                    >
                      {selected && <Check className="h-3 w-3" />}
                    </span>
                    <FileText className="h-3.5 w-3.5 shrink-0 text-[var(--text-secondary)]" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium text-[var(--text-primary)]">
                        {doc.title}
                      </p>
                      <p className="truncate font-mono text-[10px] text-[var(--text-secondary)]">
                        {formatDocumentCategory(doc.category)} · {formatFileSize(doc.size_bytes)}
                      </p>
                    </div>
                  </div>
                  <DocumentStatusBadge status={doc.processing_status} />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};
