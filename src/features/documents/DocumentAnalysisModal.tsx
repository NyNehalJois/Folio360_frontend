import React, { useCallback, useEffect, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  Clock,
  FileText,
  Loader2,
  RefreshCw,
  ShieldAlert,
  Sparkles,
  X,
} from 'lucide-react';
import { PillButton } from '@/design/components/PillButton';
import { documentsService } from '@/services/api';
import { ApiClientError } from '@/services/http';
import type {
  AnalysisFailureReason,
  AnalysisStatus,
  Document,
  DocumentAnalysisResponse,
  MarksheetSubjectExtraction,
} from '@/types/api';
import { DocumentStatusBadge, isDocumentReady } from './DocumentStatusBadge';

interface DocumentAnalysisModalProps {
  open: boolean;
  doc: Document | null;
  onClose: () => void;
}

const LABEL_CLASS =
  'block font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--text-secondary)] mb-1';

export function formatAnalysisFailureReason(
  reason: AnalysisFailureReason | null,
): string | null {
  switch (reason) {
    case 'provider_not_configured':
      return 'AI analysis provider is not configured on the server.';
    case 'provider_unavailable':
      return 'AI analysis service was temporarily unavailable. You can retry later.';
    case 'provider_timeout':
      return 'AI analysis timed out before finishing. You can retry.';
    case 'provider_rate_limited':
      return 'AI provider rate limit reached. Wait briefly before retrying.';
    case 'invalid_provider_output':
      return 'The AI model returned output that did not match the safety schema and was discarded.';
    case 'unsupported_content':
      return 'This document could not be read or is no longer eligible for analysis.';
    case 'analysis_error':
      return 'Document analysis failed unexpectedly.';
    default:
      return null;
  }
}

export function formatAnalysisApiError(err: unknown): {
  message: string;
  unavailable503: boolean;
  retriesExhausted: boolean;
} {
  if (err instanceof ApiClientError) {
    if (err.status === 503 || err.code === 'AI_ANALYZER_NOT_CONFIGURED') {
      return {
        message:
          'AI document analysis is temporarily unavailable or not configured.',
        unavailable503: true,
        retriesExhausted: false,
      };
    }
    if (err.status === 429 || err.code === 'RATE_LIMITED') {
      return {
        message:
          'Too many analysis requests right now. Please wait a few minutes and try again.',
        unavailable503: false,
        retriesExhausted: false,
      };
    }
    if (err.code === 'ANALYSIS_RETRIES_EXHAUSTED') {
      return {
        message: err.message,
        unavailable503: false,
        retriesExhausted: true,
      };
    }
    return {
      message: err.message || 'Unable to run AI document analysis.',
      unavailable503: false,
      retriesExhausted: false,
    };
  }
  return {
    message: 'Unable to communicate with the AI analysis service right now.',
    unavailable503: false,
    retriesExhausted: false,
  };
}

function getAnalysisStatusBadge(status: AnalysisStatus): {
  label: string;
  className: string;
} {
  switch (status) {
    case 'completed':
      return {
        label: 'Completed',
        className:
          'border-emerald-500/35 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
      };
    case 'processing':
      return {
        label: 'Processing',
        className:
          'border-amber-500/35 bg-amber-500/10 text-amber-700 dark:text-amber-300',
      };
    case 'pending':
      return {
        label: 'Pending',
        className:
          'border-amber-500/35 bg-amber-500/10 text-amber-700 dark:text-amber-300',
      };
    case 'failed':
      return {
        label: 'Failed',
        className:
          'border-[var(--danger-border)] bg-[var(--danger-bg)] text-[var(--danger-text)]',
      };
  }
}

function formatSubjectMarks(subj: MarksheetSubjectExtraction): string {
  if (subj.marks_obtained !== null && subj.max_marks !== null) {
    return `${subj.marks_obtained} / ${subj.max_marks}`;
  }
  if (subj.marks_obtained !== null) {
    return String(subj.marks_obtained);
  }
  if (subj.raw_mark_text) {
    return subj.raw_mark_text;
  }
  return 'Not detected';
}

const NotDetected: React.FC = () => (
  <span className="italic text-[var(--text-secondary)]">Not detected</span>
);

export const DocumentAnalysisModal: React.FC<DocumentAnalysisModalProps> = ({
  open,
  doc,
  onClose,
}) => {
  const [loadingInitial, setLoadingInitial] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [analysis, setAnalysis] = useState<DocumentAnalysisResponse | null>(
    null,
  );
  const [notStarted, setNotStarted] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [unavailable503, setUnavailable503] = useState(false);
  const [retriesExhausted, setRetriesExhausted] = useState(false);
  const [excerptOpen, setExcerptOpen] = useState(false);

  const loadExistingAnalysis = useCallback(async (documentId: string) => {
    setLoadingInitial(true);
    setErrorMsg(null);
    setNotStarted(false);
    try {
      const existing = await documentsService.getAnalysis(documentId);
      setAnalysis(existing);
    } catch (err) {
      if (
        err instanceof ApiClientError &&
        err.status === 404 &&
        err.code === 'ANALYSIS_NOT_FOUND'
      ) {
        setAnalysis(null);
        setNotStarted(true);
      } else {
        const mapped = formatAnalysisApiError(err);
        setErrorMsg(mapped.message);
        setUnavailable503(mapped.unavailable503);
      }
    } finally {
      setLoadingInitial(false);
    }
  }, []);

  useEffect(() => {
    if (!open || !doc) return;
    setAnalysis(null);
    setNotStarted(false);
    setErrorMsg(null);
    setUnavailable503(false);
    setRetriesExhausted(false);
    setExcerptOpen(false);
    setSubmitting(false);

    if (isDocumentReady(doc)) {
      void loadExistingAnalysis(doc.id);
    }
  }, [open, doc, loadExistingAnalysis]);

  const busy = loadingInitial || submitting;

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !busy) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, busy, onClose]);

  if (!open || !doc) return null;

  const docReady = isDocumentReady(doc);

  const handleStartAnalysis = async () => {
    if (!docReady || busy) return;
    setSubmitting(true);
    setErrorMsg(null);
    setUnavailable503(false);
    try {
      const created = await documentsService.requestAnalysis(doc.id);
      setAnalysis(created);
      setNotStarted(false);
    } catch (err) {
      if (
        err instanceof ApiClientError &&
        err.status === 409 &&
        (err.code === 'ANALYSIS_IN_PROGRESS' ||
          err.code === 'ANALYSIS_ALREADY_COMPLETED' ||
          err.code === 'ANALYSIS_ALREADY_EXISTS')
      ) {
        await loadExistingAnalysis(doc.id);
      } else {
        const mapped = formatAnalysisApiError(err);
        setErrorMsg(mapped.message);
        setUnavailable503(mapped.unavailable503);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleRetryAnalysis = async () => {
    if (!docReady || !analysis || busy) return;
    setSubmitting(true);
    setErrorMsg(null);
    setUnavailable503(false);
    try {
      const retried = await documentsService.retryAnalysis(doc.id);
      setAnalysis(retried);
    } catch (err) {
      const mapped = formatAnalysisApiError(err);
      setErrorMsg(mapped.message);
      setUnavailable503(mapped.unavailable503);
      if (mapped.retriesExhausted) {
        setRetriesExhausted(true);
      } else if (
        err instanceof ApiClientError &&
        err.status === 409 &&
        err.code === 'ANALYSIS_RETRY_NOT_ALLOWED'
      ) {
        await loadExistingAnalysis(doc.id);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const extracted = analysis?.extracted_data ?? null;
  const marksheet = extracted?.marksheet ?? null;
  const certificate = extracted?.certificate ?? null;
  const analysisBadge = analysis ? getAnalysisStatusBadge(analysis.status) : null;
  const failureText = analysis
    ? formatAnalysisFailureReason(analysis.failure_reason)
    : null;
  const canRetry =
    docReady &&
    analysis !== null &&
    (analysis.status === 'failed' || analysis.status === 'pending') &&
    !retriesExhausted &&
    !unavailable503;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 backdrop-blur-[2px]"
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
        aria-labelledby="document-analysis-title"
        className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-[var(--border-medium)] bg-[var(--bg-main)] shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-[var(--border-subtle)] px-6 py-5">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--text-secondary)]">
                <Sparkles className="h-3 w-3 text-[var(--accent)]" />
                AI Document Analyzer
              </span>
              <DocumentStatusBadge status={doc.processing_status} />
              {analysisBadge && (
                <span
                  className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.08em] ${analysisBadge.className}`}
                >
                  Analysis: {analysisBadge.label}
                </span>
              )}
            </div>
            <h2
              id="document-analysis-title"
              className="mt-1.5 truncate font-serif text-2xl text-[var(--text-primary)]"
            >
              {doc.title}
            </h2>
            <p className="mt-0.5 truncate font-mono text-[11px] text-[var(--text-secondary)]">
              {doc.original_filename}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            aria-label="Close AI analysis dialog"
            className="rounded-full p-2 text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)] disabled:opacity-50 cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
          {!docReady ? (
            <div
              role="alert"
              className="rounded-lg border border-[var(--danger-border)] bg-[var(--danger-bg)] p-4 text-xs text-[var(--danger-text)]"
            >
              <div className="flex items-start gap-2.5">
                <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
                <div>
                  <p className="font-medium">Document is not eligible for AI analysis</p>
                  <p className="mt-1">
                    Only scanned and validated documents with status{' '}
                    <strong>ready</strong> can be analyzed. Current scan status:{' '}
                    <strong>{doc.processing_status}</strong>.
                  </p>
                </div>
              </div>
            </div>
          ) : loadingInitial ? (
            <div
              role="status"
              className="flex items-center justify-center gap-2.5 py-10 text-sm text-[var(--text-secondary)]"
            >
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Checking AI analysis status…</span>
            </div>
          ) : (
            <>
              {errorMsg && (
                <div
                  role="alert"
                  className="flex items-start gap-2.5 rounded-lg border border-[var(--danger-border)] bg-[var(--danger-bg)] px-4 py-3 text-xs text-[var(--danger-text)]"
                >
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Not yet analyzed */}
              {notStarted && !errorMsg && (
                <div className="rounded-xl border border-dashed border-[var(--border-medium)] bg-[var(--bg-secondary)]/35 p-6 text-center">
                  <Sparkles className="mx-auto h-6 w-6 text-[var(--accent)]" />
                  <h3 className="mt-3 font-serif text-xl text-[var(--text-primary)]">
                    Not yet analyzed
                  </h3>
                  <p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-[var(--text-secondary)]">
                    Run optional AI understanding to summarize this document and
                    extract reviewable marksheet or certificate fields. Extracted
                    values remain <strong>unverified</strong> and never modify
                    your Education or Profile automatically.
                  </p>
                  <div className="mt-5 flex justify-center">
                    <PillButton
                      onClick={() => void handleStartAnalysis()}
                      disabled={submitting || unavailable503}
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Analyzing document…
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-4 w-4" />
                          Start AI Analysis
                        </>
                      )}
                    </PillButton>
                  </div>
                </div>
              )}

              {/* Pending / Processing */}
              {analysis &&
                (analysis.status === 'pending' ||
                  analysis.status === 'processing') && (
                  <div
                    role="status"
                    className="rounded-lg border border-amber-500/35 bg-amber-500/10 p-4 text-xs text-amber-800 dark:text-amber-200"
                  >
                    <div className="flex items-start gap-2.5">
                      <Clock className="mt-0.5 h-4 w-4 shrink-0" />
                      <div className="flex-1">
                        <p className="font-medium">
                          {analysis.status === 'pending'
                            ? 'Analysis queued'
                            : 'Analysis in progress'}
                        </p>
                        <p className="mt-1 opacity-90">
                          Attempt {analysis.attempts}. Refresh manually to check
                          whether structured extraction has completed.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

              {/* Failed */}
              {analysis && analysis.status === 'failed' && (
                <div
                  role="alert"
                  className="rounded-lg border border-[var(--danger-border)] bg-[var(--danger-bg)] p-4 text-xs text-[var(--danger-text)]"
                >
                  <div className="flex items-start gap-2.5">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                    <div>
                      <p className="font-medium">
                        AI analysis did not complete (attempt {analysis.attempts})
                      </p>
                      {failureText && <p className="mt-1">{failureText}</p>}
                      <p className="mt-1.5 opacity-90">
                        Your original document in the vault remains intact and{' '}
                        <strong>ready</strong>.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Completed Extraction Output */}
              {analysis && analysis.status === 'completed' && extracted && (
                <div className="space-y-4">
                  {/* Mandatory Unverified Extraction Banner */}
                  <div className="flex items-start gap-2.5 rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-xs text-amber-900 dark:text-amber-200">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                    <div>
                      <p className="font-semibold">
                        AI-Extracted · Unverified ({extracted.is_verified ? 'Verified' : 'Unverified'})
                      </p>
                      <p className="mt-0.5 leading-relaxed opacity-90">
                        Review all extracted text, marks, and dates directly
                        against the document. Nothing here updates your
                        Education or Profile records automatically.
                      </p>
                    </div>
                  </div>

                  {/* Metadata & Confidence Strip */}
                  <div className="grid grid-cols-2 gap-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-secondary)]/45 p-4 text-xs sm:grid-cols-4">
                    <div>
                      <p className={LABEL_CLASS}>Detected Type</p>
                      <p className="font-medium capitalize text-[var(--text-primary)]">
                        {extracted.document_type}
                      </p>
                    </div>
                    <div>
                      <p className={LABEL_CLASS}>Verification</p>
                      <p className="font-medium text-amber-700 dark:text-amber-300">
                        Unverified
                      </p>
                    </div>
                    <div>
                      <p className={LABEL_CLASS}>Confidence</p>
                      <p className="font-medium text-[var(--text-primary)]">
                        {extracted.confidence !== null
                          ? `${Math.round(extracted.confidence * 100)}%`
                          : 'Not provided'}
                      </p>
                    </div>
                    <div>
                      <p className={LABEL_CLASS}>Analyzer</p>
                      <p className="truncate font-mono text-[11px] text-[var(--text-primary)]">
                        {analysis.provider_name} · {analysis.analyzer_version}
                      </p>
                    </div>
                  </div>

                  {/* Summary */}
                  <div>
                    <p className={LABEL_CLASS}>Summary</p>
                    <p className="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-elevated)] p-3.5 text-sm leading-relaxed text-[var(--text-primary)]">
                      {extracted.summary}
                    </p>
                  </div>

                  {/* Uncertain Fields */}
                  {extracted.uncertain_fields.length > 0 && (
                    <div className="rounded-lg border border-amber-500/35 bg-amber-500/10 p-3.5 text-xs">
                      <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-amber-800 dark:text-amber-200">
                        Uncertain or Ambiguous Fields ({extracted.uncertain_fields.length})
                      </p>
                      <ul className="mt-2 flex flex-wrap gap-1.5">
                        {extracted.uncertain_fields.map((field) => (
                          <li
                            key={field}
                            className="rounded-full border border-amber-500/40 bg-[var(--bg-main)] px-2.5 py-0.5 font-mono text-[10px] text-amber-900 dark:text-amber-200"
                          >
                            {field}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Marksheet Structured View */}
                  {marksheet && (
                    <div className="space-y-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-elevated)] p-4">
                      <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-2.5">
                        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--text-secondary)]">
                          Extracted Marksheet Fields (Unverified)
                        </p>
                        <CheckCircle2 className="h-3.5 w-3.5 text-[var(--text-secondary)]" />
                      </div>

                      <div className="grid grid-cols-1 gap-3 text-xs sm:grid-cols-2">
                        <div>
                          <p className={LABEL_CLASS}>Institution</p>
                          <p className="text-[var(--text-primary)]">
                            {marksheet.institution_name ?? <NotDetected />}
                          </p>
                        </div>
                        <div>
                          <p className={LABEL_CLASS}>Student Name</p>
                          <p className="text-[var(--text-primary)]">
                            {marksheet.student_name ?? <NotDetected />}
                          </p>
                        </div>
                        <div>
                          <p className={LABEL_CLASS}>Program / Course</p>
                          <p className="text-[var(--text-primary)]">
                            {marksheet.program_or_course ?? <NotDetected />}
                          </p>
                        </div>
                        <div>
                          <p className={LABEL_CLASS}>Semester / Exam</p>
                          <p className="text-[var(--text-primary)]">
                            {marksheet.semester_or_exam ?? <NotDetected />}
                          </p>
                        </div>
                        <div>
                          <p className={LABEL_CLASS}>Academic Year</p>
                          <p className="text-[var(--text-primary)]">
                            {marksheet.academic_year ?? <NotDetected />}
                          </p>
                        </div>
                        <div>
                          <p className={LABEL_CLASS}>Stated Result / Totals</p>
                          <p className="text-[var(--text-primary)]">
                            {marksheet.result_status ?? 'Status unavailable'}
                            {marksheet.total_marks_obtained !== null &&
                            marksheet.total_max_marks !== null
                              ? ` · ${marksheet.total_marks_obtained} / ${marksheet.total_max_marks}`
                              : marksheet.total_marks_obtained !== null
                                ? ` · ${marksheet.total_marks_obtained}`
                                : ''}
                          </p>
                        </div>
                      </div>

                      {marksheet.subjects.length > 0 ? (
                        <div className="overflow-x-auto rounded-lg border border-[var(--border-subtle)]">
                          <table className="w-full border-collapse text-left text-xs">
                            <thead className="bg-[var(--surface-muted)] font-mono text-[10px] uppercase tracking-[0.1em] text-[var(--text-secondary)]">
                              <tr>
                                <th className="px-3 py-2">Subject</th>
                                <th className="px-3 py-2">Code</th>
                                <th className="px-3 py-2">Marks</th>
                                <th className="px-3 py-2">Grade</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--border-subtle)] bg-[var(--bg-main)]">
                              {marksheet.subjects.map((subj, idx) => (
                                <tr key={`${subj.subject_name}-${idx}`}>
                                  <td className="px-3 py-2 text-[var(--text-primary)]">
                                    <span className="font-medium">
                                      {subj.subject_name}
                                    </span>
                                    {subj.uncertain && (
                                      <span className="ml-2 inline-block rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 font-mono text-[9px] uppercase text-amber-700 dark:text-amber-300">
                                        Uncertain
                                      </span>
                                    )}
                                  </td>
                                  <td className="px-3 py-2 font-mono text-[var(--text-secondary)]">
                                    {subj.subject_code ?? '—'}
                                  </td>
                                  <td className="px-3 py-2 font-mono text-[var(--text-primary)]">
                                    {formatSubjectMarks(subj)}
                                  </td>
                                  <td className="px-3 py-2 font-mono text-[var(--text-primary)]">
                                    {subj.grade ?? '—'}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <p className="text-xs italic text-[var(--text-secondary)]">
                          No individual subject rows detected.
                        </p>
                      )}
                    </div>
                  )}

                  {/* Certificate Structured View */}
                  {certificate && (
                    <div className="space-y-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-elevated)] p-4">
                      <p className="border-b border-[var(--border-subtle)] pb-2 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--text-secondary)]">
                        Extracted Certificate Fields (Unverified)
                      </p>
                      <div className="grid grid-cols-1 gap-3 text-xs sm:grid-cols-2">
                        <div>
                          <p className={LABEL_CLASS}>Certificate Title</p>
                          <p className="text-[var(--text-primary)]">
                            {certificate.certificate_title ?? <NotDetected />}
                          </p>
                        </div>
                        <div>
                          <p className={LABEL_CLASS}>Issuing Institution</p>
                          <p className="text-[var(--text-primary)]">
                            {certificate.issuing_institution ?? <NotDetected />}
                          </p>
                        </div>
                        <div>
                          <p className={LABEL_CLASS}>Recipient Name</p>
                          <p className="text-[var(--text-primary)]">
                            {certificate.recipient_name ?? <NotDetected />}
                          </p>
                        </div>
                        <div>
                          <p className={LABEL_CLASS}>Award / Qualification</p>
                          <p className="text-[var(--text-primary)]">
                            {certificate.award_or_qualification ?? (
                              <NotDetected />
                            )}
                          </p>
                        </div>
                        <div>
                          <p className={LABEL_CLASS}>Issue Date</p>
                          <p className="text-[var(--text-primary)]">
                            {certificate.issue_date ?? <NotDetected />}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Extracted Source Excerpt */}
                  {extracted.extracted_text_excerpt && (
                    <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-secondary)]/30">
                      <button
                        type="button"
                        aria-expanded={excerptOpen}
                        onClick={() => setExcerptOpen((prev) => !prev)}
                        className="flex w-full items-center justify-between px-4 py-2.5 text-left text-xs font-medium text-[var(--text-primary)] cursor-pointer"
                      >
                        <span className="inline-flex items-center gap-2">
                          <FileText className="h-3.5 w-3.5 text-[var(--text-secondary)]" />
                          Extracted source text excerpt (literal)
                        </span>
                        <ChevronDown
                          className={`h-3.5 w-3.5 text-[var(--text-secondary)] transition-transform ${
                            excerptOpen ? 'rotate-180' : ''
                          }`}
                        />
                      </button>
                      {excerptOpen && (
                        <pre className="whitespace-pre-wrap border-t border-[var(--border-subtle)] px-4 py-3 font-mono text-[11px] leading-relaxed text-[var(--text-secondary)]">
                          {extracted.extracted_text_excerpt}
                        </pre>
                      )}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--border-subtle)] bg-[var(--bg-secondary)]/30 px-6 py-4">
          <div className="flex flex-wrap items-center gap-2">
            {docReady &&
              analysis &&
              (analysis.status === 'pending' ||
                analysis.status === 'processing') && (
                <PillButton
                  variant="secondary"
                  size="sm"
                  disabled={busy}
                  onClick={() => void loadExistingAnalysis(doc.id)}
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Refresh status
                </PillButton>
              )}

            {canRetry && (
              <PillButton
                variant="primary"
                size="sm"
                disabled={busy}
                onClick={() => void handleRetryAnalysis()}
              >
                {submitting ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="h-3.5 w-3.5" />
                )}
                {submitting ? 'Retrying…' : 'Retry Analysis'}
              </PillButton>
            )}
          </div>

          <PillButton variant="secondary" size="sm" onClick={onClose} disabled={busy}>
            Close
          </PillButton>
        </div>
      </div>
    </div>
  );
};
