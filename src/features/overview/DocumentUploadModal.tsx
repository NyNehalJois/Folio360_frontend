import React, { useEffect } from 'react';
import { ArrowUpRight, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PillButton } from '@/design/components/PillButton';
import { DocumentUploadWidget } from '@/features/documents/DocumentUploadWidget';
import type { Document } from '@/types/api';

interface DocumentUploadModalProps {
  open: boolean;
  onClose: () => void;
  onUploaded: (doc: Document) => void;
}

export const DocumentUploadModal: React.FC<DocumentUploadModalProps> = ({
  open,
  onClose,
  onUploaded,
}) => {
  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 backdrop-blur-[2px]"
      role="presentation"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="overview-upload-modal-title"
        className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-[var(--border-medium)] bg-[var(--surface-elevated)] shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4 border-b border-[var(--border-subtle)] px-6 py-4">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--text-secondary)]">
              DOCUMENT VAULT
            </p>
            <h2
              id="overview-upload-modal-title"
              className="mt-1 font-serif text-2xl text-[var(--text-primary)]"
            >
              Upload Document
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close upload dialog"
            className="cursor-pointer rounded-full p-2 text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="overflow-y-auto px-6 py-5">
          <DocumentUploadWidget onUploaded={onUploaded} />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border-subtle)] bg-[var(--bg-secondary)]/40 px-6 py-3.5">
          <Link
            to="/workspace/documents"
            onClick={onClose}
            className="inline-flex items-center gap-1 font-mono text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          >
            Open Document Vault
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
          <PillButton variant="secondary" size="sm" onClick={onClose}>
            Close
          </PillButton>
        </div>
      </div>
    </div>
  );
};
