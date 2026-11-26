import React from 'react';
import { AlertTriangle, Clock, Loader2, ShieldAlert, ShieldCheck } from 'lucide-react';
import type {
  Document,
  DocumentFailureReason,
  DocumentProcessingStatus,
} from '@/types/api';

export function isDocumentReady(
  doc: Pick<Document, 'processing_status'>,
): boolean {
  return doc.processing_status === 'ready';
}

export function canRescanDocument(
  doc: Pick<Document, 'processing_status'>,
): boolean {
  return (
    doc.processing_status === 'pending_scan' ||
    doc.processing_status === 'scan_failed'
  );
}

export function formatDocumentFailureReason(
  reason: DocumentFailureReason | null,
): string | null {
  switch (reason) {
    case 'malware_detected':
      return 'Malware or suspicious content detected during scanning.';
    case 'validation_failed':
      return 'File integrity or format structure check failed.';
    case 'scanner_unavailable':
      return 'Malware scanner was temporarily unavailable.';
    case 'scanner_timeout':
      return 'Security scan timed out before completion.';
    case 'scanner_error':
      return 'Security scanner encountered an unexpected error.';
    case 'promotion_failed':
      return 'File passed scan but could not be moved to trusted storage.';
    default:
      return null;
  }
}

export interface DocumentStatusMeta {
  label: string;
  description: string;
  badgeClass: string;
}

export function getDocumentStatusMeta(
  status: DocumentProcessingStatus,
): DocumentStatusMeta {
  switch (status) {
    case 'ready':
      return {
        label: 'Ready',
        description:
          'Passed file validation and scanning; available for private preview and download.',
        badgeClass:
          'border-emerald-500/35 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
      };
    case 'pending_scan':
      return {
        label: 'Pending scan',
        description:
          'Held in quarantine awaiting security validation. Preview and download are disabled.',
        badgeClass:
          'border-amber-500/35 bg-amber-500/10 text-amber-700 dark:text-amber-300',
      };
    case 'scanning':
      return {
        label: 'Scanning',
        description:
          'Security validation is currently in progress. Preview and download are disabled.',
        badgeClass:
          'border-amber-500/35 bg-amber-500/10 text-amber-700 dark:text-amber-300',
      };
    case 'scan_failed':
      return {
        label: 'Scan failed',
        description:
          'Security scanning did not complete. Preview and download remain disabled until a rescan succeeds.',
        badgeClass:
          'border-amber-500/45 bg-amber-500/15 text-amber-800 dark:text-amber-200',
      };
    case 'rejected':
      return {
        label: 'Rejected',
        description:
          'Rejected by file validation or malware scanning. Preview and download are permanently disabled.',
        badgeClass:
          'border-[var(--danger-border)] bg-[var(--danger-bg)] text-[var(--danger-text)]',
      };
  }
}

interface DocumentStatusBadgeProps {
  status: DocumentProcessingStatus;
}

export const DocumentStatusBadge: React.FC<DocumentStatusBadgeProps> = ({
  status,
}) => {
  const meta = getDocumentStatusMeta(status);

  const icon =
    status === 'ready' ? (
      <ShieldCheck className="h-3 w-3 shrink-0" />
    ) : status === 'scanning' ? (
      <Loader2 className="h-3 w-3 shrink-0 animate-spin" />
    ) : status === 'pending_scan' ? (
      <Clock className="h-3 w-3 shrink-0" />
    ) : status === 'scan_failed' ? (
      <AlertTriangle className="h-3 w-3 shrink-0" />
    ) : (
      <ShieldAlert className="h-3 w-3 shrink-0" />
    );

  return (
    <span
      title={meta.description}
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.08em] ${meta.badgeClass}`}
    >
      {icon}
      <span>{meta.label}</span>
    </span>
  );
};
