import React, { useRef, useState } from 'react';
import { AlertCircle, CheckCircle2, FileUp, Loader2 } from 'lucide-react';
import { PillButton } from '@/design/components/PillButton';
import { documentsService } from '@/services/api';
import { ApiClientError } from '@/services/http';
import type { Document, DocumentCategory } from '@/types/api';

export const DOCUMENT_CATEGORY_OPTIONS: { value: DocumentCategory; label: string }[] = [
  { value: 'marksheet', label: 'Marksheet' },
  { value: 'certificate', label: 'Certificate' },
  { value: 'project_report', label: 'Project Report' },
  { value: 'resume', label: 'Resume' },
  { value: 'identity', label: 'Identity' },
  { value: 'other', label: 'Other' },
];

export function formatDocumentCategory(category: DocumentCategory): string {
  return (
    DOCUMENT_CATEGORY_OPTIONS.find((item) => item.value === category)?.label ?? category
  );
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface DocumentUploadWidgetProps {
  onUploaded: (doc: Document) => void;
  defaultCategory?: DocumentCategory;
  compact?: boolean;
  submitLabel?: string;
}

export const DocumentUploadWidget: React.FC<DocumentUploadWidgetProps> = ({
  onUploaded,
  defaultCategory = 'marksheet',
  compact = false,
  submitLabel = 'Upload document',
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<DocumentCategory>(defaultCategory);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    setError(null);
    setSuccessMsg(null);
    if (!file) {
      setSelectedFile(null);
      return;
    }
    const allowed = new Set(['application/pdf', 'image/jpeg', 'image/png']);
    if (!allowed.has(file.type)) {
      setError('Unsupported format. Please choose a PDF, JPEG, or PNG file.');
      setSelectedFile(null);
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
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
      });
      onUploaded(res.document);
      setSuccessMsg(`Uploaded "${res.document.title}".`);
      setSelectedFile(null);
      setTitle('');
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
            className="block h-10 w-full cursor-pointer rounded-md border border-[var(--border-medium)] bg-[var(--bg-main)] px-2.5 py-1.5 text-xs text-[var(--text-primary)] file:mr-2.5 file:cursor-pointer file:rounded-full file:border file:border-[var(--border-medium)] file:bg-[var(--bg-secondary)] file:px-3 file:py-1 file:text-xs file:font-medium file:text-[var(--text-primary)]"
          />
        </div>

        <div>
          <label className="block font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--text-secondary)] mb-1.5 whitespace-nowrap">
            Document Title
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., Semester V Marksheet"
            className="h-10 w-full rounded-md border border-[var(--border-medium)] bg-[var(--bg-main)] px-3 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]/60 focus:border-[var(--text-primary)] focus:outline-none"
          />
        </div>

        <div>
          <label className="block font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--text-secondary)] mb-1.5 whitespace-nowrap">
            Category
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as DocumentCategory)}
            className="h-10 w-full rounded-md border border-[var(--border-medium)] bg-[var(--bg-main)] px-3 text-xs text-[var(--text-primary)] focus:border-[var(--text-primary)] focus:outline-none"
          >
            {DOCUMENT_CATEGORY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-xs text-[var(--text-secondary)]">
          {selectedFile
            ? `Ready: ${selectedFile.name} (${formatFileSize(selectedFile.size)})`
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
              Uploading…
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
        <p role="alert" className="flex items-center gap-1.5 text-xs text-[var(--danger-text)]">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          <span>{error}</span>
        </p>
      )}
      {successMsg && (
        <p role="status" className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
          <span>{successMsg}</span>
        </p>
      )}
    </div>
  );
};
