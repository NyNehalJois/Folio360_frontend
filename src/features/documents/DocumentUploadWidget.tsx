import React, { useRef, useState } from 'react';
import { AlertCircle, CheckCircle2, FileUp, Loader2 } from 'lucide-react';
import { PillButton } from '@/design/components/PillButton';
import { documentsService } from '@/services/api';
import { ApiClientError } from '@/services/http';
import type {
  Document,
  DocumentCategory,
  DocumentCategoryInfo,
} from '@/types/api';

export const DOCUMENT_CATEGORY_OPTIONS: {
  value: DocumentCategory;
  label: string;
}[] = [
  { value: 'marksheet', label: 'Marksheet' },
  { value: 'certificate', label: 'Certificate' },
  { value: 'project_report', label: 'Project Report' },
  { value: 'resume', label: 'Resume' },
  { value: 'identity', label: 'Identity' },
  { value: 'other', label: 'Other' },
];

export function formatDocumentCategory(category: DocumentCategory): string {
  return (
    DOCUMENT_CATEGORY_OPTIONS.find((item) => item.value === category)?.label ??
    category
  );
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
]);
const ALLOWED_EXTENSIONS = /\.(pdf|jpe?g|png)$/i;
const MAX_DOCUMENT_SIZE_BYTES = 10 * 1024 * 1024;

interface DocumentUploadWidgetProps {
  onUploaded: (doc: Document) => void;
  defaultCategory?: DocumentCategory;
  categories?: DocumentCategoryInfo[];
  compact?: boolean;
  submitLabel?: string;
  showNotes?: boolean;
  showEducationToggle?: boolean;
}

export const DocumentUploadWidget: React.FC<DocumentUploadWidgetProps> = ({
  onUploaded,
  defaultCategory = 'marksheet',
  categories,
  compact = false,
  submitLabel = 'Upload document',
  showNotes = false,
  showEducationToggle = false,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<DocumentCategory>(defaultCategory);
  const [notes, setNotes] = useState('');
  const [showInEducation, setShowInEducation] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const categoryOptions =
    categories && categories.length > 0
      ? categories.map((item) => ({ value: item.key, label: item.label }))
      : DOCUMENT_CATEGORY_OPTIONS;

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    setError(null);
    setSuccessMsg(null);
    if (!file) {
      setSelectedFile(null);
      return;
    }
    if (file.size === 0) {
      setError('Uploaded file must not be empty.');
      setSelectedFile(null);
      return;
    }
    const mimeOk = file.type
      ? ALLOWED_MIME_TYPES.has(file.type)
      : ALLOWED_EXTENSIONS.test(file.name);
    if (!mimeOk) {
      setError('Unsupported format. Please choose a PDF, JPEG, or PNG file.');
      setSelectedFile(null);
      return;
    }
    if (file.size > MAX_DOCUMENT_SIZE_BYTES) {
      setError('File exceeds the 10 MB maximum limit.');
      setSelectedFile(null);
      return;
    }
    setSelectedFile(file);
    if (!title.trim()) {
      setTitle(file.name.replace(/\.[^.]+$/, ''));
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || uploading) return;
    setUploading(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const res = await documentsService.upload(selectedFile, {
        title: title.trim() || undefined,
        category,
        notes: showNotes && notes.trim() ? notes.trim() : undefined,
        show_in_education: showEducationToggle ? showInEducation : undefined,
      });
      const uploadedDoc = res.document;
      onUploaded(uploadedDoc);

      if (uploadedDoc.processing_status === 'ready') {
        setSuccessMsg(`Uploaded "${uploadedDoc.title}" — ready in Document Vault.`);
      } else if (
        uploadedDoc.processing_status === 'pending_scan' ||
        uploadedDoc.processing_status === 'scanning'
      ) {
        setSuccessMsg(
          `Uploaded "${uploadedDoc.title}". Security validation is in progress before preview is enabled.`,
        );
      } else if (uploadedDoc.processing_status === 'scan_failed') {
        setError(
          `Uploaded "${uploadedDoc.title}", but security scanning failed. Open details to retry scanning.`,
        );
      } else if (uploadedDoc.processing_status === 'rejected') {
        setError(
          `Upload "${uploadedDoc.title}" was rejected during security or format validation.`,
        );
      }

      setSelectedFile(null);
      setTitle('');
      setNotes('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err) {
      setError(
        err instanceof ApiClientError
          ? err.message
          : 'Unable to upload document right now. Please try again.',
      );
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-3">
      <div
        className={`grid items-end gap-3 ${
          compact ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1 sm:grid-cols-3'
        }`}
      >
        <div className={compact ? 'sm:col-span-2' : ''}>
          <label className="block font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--text-secondary)] mb-1.5 whitespace-nowrap">
            Document File
          </label>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
            onChange={handleFileChange}
            disabled={uploading}
            className="block h-10 w-full cursor-pointer rounded-md border border-[var(--border-medium)] bg-[var(--bg-main)] px-2.5 py-1.5 text-xs text-[var(--text-primary)] file:mr-2.5 file:cursor-pointer file:rounded-full file:border file:border-[var(--border-medium)] file:bg-[var(--bg-secondary)] file:px-3 file:py-1 file:text-xs file:font-medium file:text-[var(--text-primary)] disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>

        <div>
          <label className="block font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--text-secondary)] mb-1.5 whitespace-nowrap">
            Document Title <span className="opacity-70">(Optional)</span>
          </label>
          <input
            type="text"
            maxLength={255}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={uploading}
            placeholder="e.g., Semester V Marksheet"
            className="h-10 w-full rounded-md border border-[var(--border-medium)] bg-[var(--bg-main)] px-3 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]/60 focus:border-[var(--text-primary)] focus:outline-none disabled:opacity-50"
          />
        </div>

        <div>
          <label className="block font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--text-secondary)] mb-1.5 whitespace-nowrap">
            Category
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as DocumentCategory)}
            disabled={uploading}
            className="h-10 w-full rounded-md border border-[var(--border-medium)] bg-[var(--bg-main)] px-3 text-xs text-[var(--text-primary)] focus:border-[var(--text-primary)] focus:outline-none disabled:opacity-50"
          >
            {categoryOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {showNotes && (
        <div>
          <label className="block font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--text-secondary)] mb-1.5">
            Notes <span className="opacity-70">(Optional)</span>
          </label>
          <textarea
            rows={2}
            maxLength={2000}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            disabled={uploading}
            placeholder="Optional personal notes about this document (kept private)."
            className="w-full rounded-md border border-[var(--border-medium)] bg-[var(--bg-main)] px-3 py-2 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]/60 focus:border-[var(--text-primary)] focus:outline-none disabled:opacity-50"
          />
        </div>
      )}

      {showEducationToggle && (
        <label className="flex cursor-pointer items-start gap-2.5 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-main)] px-3 py-2.5 text-xs">
          <input
            type="checkbox"
            checked={showInEducation}
            onChange={(e) => setShowInEducation(e.target.checked)}
            disabled={uploading}
            className="mt-0.5 h-3.5 w-3.5 rounded border-[var(--border-medium)] accent-[var(--accent)]"
          />
          <div>
            <p className="font-medium text-[var(--text-primary)]">
              Show in my private Education workspace
            </p>
            <p className="text-[11px] text-[var(--text-secondary)]">
              Controls listing in your private Education tab only. Uploaded files remain private and are never shared publicly.
            </p>
          </div>
        </label>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-xs text-[var(--text-secondary)]">
          {selectedFile
            ? `Selected: ${selectedFile.name} (${formatFileSize(selectedFile.size)})`
            : 'Accepted: PDF, JPEG, or PNG (max 10 MB).'}
        </div>
        <PillButton
          variant="primary"
          size="sm"
          disabled={!selectedFile || uploading}
          onClick={() => void handleUpload()}
        >
          {uploading ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Uploading &amp; validating…
            </>
          ) : (
            <>
              <FileUp className="h-3.5 w-3.5" />
              {submitLabel}
            </>
          )}
        </PillButton>
      </div>

      {error && (
        <p
          role="alert"
          className="flex items-center gap-1.5 text-xs text-[var(--danger-text)]"
        >
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          <span>{error}</span>
        </p>
      )}
      {successMsg && (
        <p
          role="status"
          className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400"
        >
          <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
          <span>{successMsg}</span>
        </p>
      )}
    </div>
  );
};
