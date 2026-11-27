import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Check,
  FileText,
  FolderGit2,
  Info,
  Loader2,
  Sparkles,
  X,
} from 'lucide-react';
import { PillButton } from '@/design/components/PillButton';
import { documentsService } from '@/services/api/documents.service';
import {
  skillsService,
  type SkillBulkCreateResponse,
  type SkillCategoryKey,
  type SkillImportSource,
  type SkillProficiency,
} from '@/services/api/skills.service';
import type { Document } from '@/types/api';
import { SKILL_CATEGORY_OPTIONS, SKILL_PROFICIENCY_OPTIONS } from './AddSkillModal';

interface ImportSkillsModalProps {
  open: boolean;
  onClose: () => void;
  onImported: (result: SkillBulkCreateResponse) => void | Promise<void>;
}

interface CandidateRow {
  id: string;
  selected: boolean;
  name: string;
  category: SkillCategoryKey;
  proficiency: SkillProficiency | '';
  source: SkillImportSource;
  source_label: string | null;
}

const VALID_PROFICIENCIES = new Set<SkillProficiency>(SKILL_PROFICIENCY_OPTIONS);

function toValidProficiency(raw: string | null): SkillProficiency | '' {
  if (!raw) return '';
  const formatted = raw.trim().charAt(0).toUpperCase() + raw.trim().slice(1).toLowerCase();
  return VALID_PROFICIENCIES.has(formatted as SkillProficiency)
    ? (formatted as SkillProficiency)
    : '';
}

export const ImportSkillsModal: React.FC<ImportSkillsModalProps> = ({
  open,
  onClose,
  onImported,
}) => {
  const [useProjects, setUseProjects] = useState(true);
  const [useResume, setUseResume] = useState(true);
  const [resumeDocs, setResumeDocs] = useState<Document[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [selectedDocumentId, setSelectedDocumentId] = useState('');

  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [hasScanned, setHasScanned] = useState(false);

  const [rows, setRows] = useState<CandidateRow[]>([]);
  const [skippedExisting, setSkippedExisting] = useState<string[]>([]);
  const [notes, setNotes] = useState<string[]>([]);

  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setUseProjects(true);
    setUseResume(true);
    setSelectedDocumentId('');
    setScanning(false);
    setScanError(null);
    setHasScanned(false);
    setRows([]);
    setSkippedExisting([]);
    setNotes([]);
    setImporting(false);
    setImportError(null);
  }, [open]);

  useEffect(() => {
    if (!open || !useResume) return;
    let active = true;
    setLoadingDocs(true);
    documentsService
      .list({ category: 'resume', page: 1, page_size: 50 })
      .then((res) => {
        if (!active) return;
        setResumeDocs(res.items ?? []);
      })
      .catch(() => {
        if (!active) return;
        setResumeDocs([]);
      })
      .finally(() => {
        if (active) setLoadingDocs(false);
      });
    return () => {
      active = false;
    };
  }, [open, useResume]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !scanning && !importing) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, scanning, importing, onClose]);

  const selectedCount = useMemo(
    () => rows.filter((row) => row.selected).length,
    [rows],
  );

  if (!open) return null;

  const busy = scanning || importing;

  const handleScan = async () => {
    if (busy) return;
    const sources: SkillImportSource[] = [];
    if (useProjects) sources.push('project');
    if (useResume) sources.push('resume');
    if (sources.length === 0) return;

    setScanning(true);
    setScanError(null);
    setImportError(null);

    try {
      const result = await skillsService.previewSkillImports({
        sources,
        document_id: useResume && selectedDocumentId ? selectedDocumentId : null,
      });
      setRows(
        (result.candidates ?? []).map((candidate, index) => ({
          id: `${candidate.source}-${candidate.name}-${index}`,
          selected: true,
          name: candidate.name,
          category: candidate.category,
          proficiency: toValidProficiency(candidate.proficiency),
          source: candidate.source,
          source_label: candidate.source_label,
        })),
      );
      setSkippedExisting(result.skipped_existing ?? []);
      setNotes(result.notes ?? []);
      setHasScanned(true);
    } catch (err) {
      setScanError(
        err instanceof Error
          ? err.message
          : 'Unable to extract skill candidates right now. Please try again.',
      );
    } finally {
      setScanning(false);
    }
  };

  const toggleAll = () => {
    const allSelected = rows.length > 0 && selectedCount === rows.length;
    setRows((prev) => prev.map((row) => ({ ...row, selected: !allSelected })));
  };

  const handleImport = async () => {
    if (busy || selectedCount === 0) return;
    setImporting(true);
    setImportError(null);
    try {
      const selectedSkills = rows
        .filter((row) => row.selected)
        .map((row) => ({
          name: row.name,
          category: row.category,
          proficiency: row.proficiency || null,
        }));
      const result = await skillsService.bulkCreateSkills({ skills: selectedSkills });
      await onImported(result);
      onClose();
    } catch (err) {
      setImportError(
        err instanceof Error
          ? err.message
          : 'Unable to import selected skills right now. Please try again.',
      );
    } finally {
      setImporting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 backdrop-blur-[2px] transition-opacity duration-200"
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
        aria-labelledby="import-skills-modal-title"
        className="flex max-h-[88vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-[var(--border-medium)] bg-[var(--surface-elevated)] shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-[var(--border-subtle)] px-6 py-4">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--text-secondary)]">
              Skill Extraction &amp; Review
            </p>
            <h2
              id="import-skills-modal-title"
              className="mt-1 font-serif text-2xl text-[var(--text-primary)]"
            >
              Import Skills
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            aria-label="Close import skills dialog"
            className="cursor-pointer rounded-full p-2 text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)] disabled:opacity-50"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
          {/* Source Selection */}
          <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-main)]/70 p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--text-secondary)]">
                  Sources to Scan
                </p>
                <p className="mt-0.5 text-xs text-[var(--text-secondary)]">
                  Extract skills from your portfolio projects and uploaded Document Vault resumes.
                </p>
              </div>
              <PillButton
                size="sm"
                onClick={() => void handleScan()}
                disabled={busy || (!useProjects && !useResume)}
              >
                {scanning ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Sparkles className="h-3.5 w-3.5" />
                )}
                {scanning ? 'Scanning…' : hasScanned ? 'Rescan Sources' : 'Scan Sources'}
              </PillButton>
            </div>

            <div className="flex flex-wrap gap-3 pt-1">
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-elevated)] px-3 py-2 text-xs font-medium text-[var(--text-primary)]">
                <input
                  type="checkbox"
                  disabled={busy}
                  checked={useProjects}
                  onChange={(e) => setUseProjects(e.target.checked)}
                  className="h-3.5 w-3.5 accent-[var(--accent)]"
                />
                <FolderGit2 className="h-3.5 w-3.5 text-[var(--accent)]" />
                <span>Projects</span>
              </label>

              <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-elevated)] px-3 py-2 text-xs font-medium text-[var(--text-primary)]">
                <input
                  type="checkbox"
                  disabled={busy}
                  checked={useResume}
                  onChange={(e) => setUseResume(e.target.checked)}
                  className="h-3.5 w-3.5 accent-[var(--accent)]"
                />
                <FileText className="h-3.5 w-3.5 text-[var(--accent)]" />
                <span>Uploaded Resume</span>
              </label>
            </div>

            {useResume && (
              <div className="pt-1">
                <label
                  htmlFor="import-resume-select"
                  className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--text-secondary)]"
                >
                  Resume File
                </label>
                <select
                  id="import-resume-select"
                  disabled={busy || loadingDocs}
                  value={selectedDocumentId}
                  onChange={(e) => setSelectedDocumentId(e.target.value)}
                  className="h-9 w-full cursor-pointer rounded-lg border border-[var(--border-medium)] bg-[var(--surface-elevated)] px-3 text-xs text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30 disabled:opacity-60"
                >
                  <option value="">
                    {loadingDocs
                      ? 'Loading uploaded resumes…'
                      : resumeDocs.length === 0
                        ? 'No resumes found in Document Vault'
                        : 'Latest ready resume (automatic)'}
                  </option>
                  {resumeDocs.map((doc) => (
                    <option key={doc.id} value={doc.id}>
                      {doc.title} ({doc.processing_status})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {(scanError || importError) && (
            <div
              role="alert"
              className="flex items-start gap-2.5 rounded-lg border border-[var(--danger-border)] bg-[var(--danger-bg)] px-4 py-3 text-xs text-[var(--danger-text)]"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{importError || scanError}</span>
            </div>
          )}

          {notes.length > 0 && (
            <div className="space-y-1.5 rounded-lg border border-[var(--border-accent)]/50 bg-[var(--bg-main)] px-4 py-3 text-xs text-[var(--text-secondary)]">
              <div className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--accent)]">
                <Info className="h-3.5 w-3.5" />
                <span>Extraction Notes</span>
              </div>
              <ul className="list-disc space-y-1 pl-4">
                {notes.map((note, idx) => (
                  <li key={`${idx}-${note}`}>{note}</li>
                ))}
              </ul>
            </div>
          )}

          {skippedExisting.length > 0 && (
            <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-main)]/60 px-4 py-2.5 text-xs text-[var(--text-secondary)]">
              <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--text-primary)]">
                {skippedExisting.length} Already Saved:
              </span>{' '}
              <span>{skippedExisting.join(', ')}</span>
            </div>
          )}

          {/* Candidates Checklist */}
          {!hasScanned && !scanning && (
            <div className="rounded-lg border border-dashed border-[var(--border-medium)] bg-[var(--bg-main)]/35 px-4 py-8 text-center text-xs text-[var(--text-secondary)]">
              Select your sources above and click <strong className="text-[var(--text-primary)]">Scan Sources</strong> to preview extracted skills.
            </div>
          )}

          {hasScanned && rows.length === 0 && !scanning && (
            <div className="rounded-lg border border-dashed border-[var(--border-medium)] bg-[var(--bg-main)]/35 px-4 py-8 text-center text-xs text-[var(--text-secondary)]">
              No new skill candidates were found to import.
            </div>
          )}

          {rows.length > 0 && (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-[var(--text-secondary)]">
                  {selectedCount} of {rows.length} selected
                </span>
                <button
                  type="button"
                  disabled={busy}
                  onClick={toggleAll}
                  className="cursor-pointer font-mono text-[11px] uppercase tracking-[0.1em] text-[var(--accent)] hover:underline disabled:opacity-50"
                >
                  {selectedCount === rows.length ? 'Deselect All' : 'Select All'}
                </button>
              </div>

              <ul className="max-h-[320px] space-y-2 overflow-y-auto pr-1">
                {rows.map((row) => (
                  <li
                    key={row.id}
                    className={`flex flex-col gap-2.5 rounded-xl border px-3.5 py-3 transition-colors sm:flex-row sm:items-center sm:justify-between ${
                      row.selected
                        ? 'border-[var(--border-medium)] bg-[var(--bg-main)]'
                        : 'border-[var(--border-subtle)] bg-[var(--bg-main)]/40 opacity-65'
                    }`}
                  >
                    <label className="flex min-w-0 flex-1 cursor-pointer items-start gap-3">
                      <input
                        type="checkbox"
                        disabled={busy}
                        checked={row.selected}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setRows((prev) =>
                            prev.map((item) =>
                              item.id === row.id ? { ...item, selected: checked } : item,
                            ),
                          );
                        }}
                        className="mt-1 h-4 w-4 shrink-0 accent-[var(--accent)]"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="truncate text-sm font-semibold text-[var(--text-primary)]">
                            {row.name}
                          </span>
                          <span className="rounded-full border border-[var(--border-accent)]/60 bg-[var(--surface-muted)] px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.08em] text-[var(--accent)]">
                            {row.source === 'project' ? 'Project' : 'Resume'}
                          </span>
                        </div>
                        {row.source_label && (
                          <p className="mt-0.5 truncate text-[11px] text-[var(--text-secondary)]">
                            From: {row.source_label}
                          </p>
                        )}
                      </div>
                    </label>

                    <div className="flex shrink-0 flex-wrap items-center gap-2 pl-7 sm:pl-0">
                      <select
                        aria-label={`Category for ${row.name}`}
                        disabled={busy}
                        value={row.category}
                        onChange={(e) => {
                          const nextCategory = e.target.value as SkillCategoryKey;
                          setRows((prev) =>
                            prev.map((item) =>
                              item.id === row.id ? { ...item, category: nextCategory } : item,
                            ),
                          );
                        }}
                        className="h-8 cursor-pointer rounded-md border border-[var(--border-medium)] bg-[var(--surface-elevated)] px-2.5 text-xs text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none"
                      >
                        {SKILL_CATEGORY_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>

                      <select
                        aria-label={`Proficiency for ${row.name}`}
                        disabled={busy}
                        value={row.proficiency}
                        onChange={(e) => {
                          const nextProficiency = e.target.value as SkillProficiency | '';
                          setRows((prev) =>
                            prev.map((item) =>
                              item.id === row.id
                                ? { ...item, proficiency: nextProficiency }
                                : item,
                            ),
                          );
                        }}
                        className="h-8 cursor-pointer rounded-md border border-[var(--border-medium)] bg-[var(--surface-elevated)] px-2.5 text-xs text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none"
                      >
                        <option value="">Proficiency: Unspecified</option>
                        {SKILL_PROFICIENCY_OPTIONS.map((level) => (
                          <option key={level} value={level}>
                            {level}
                          </option>
                        ))}
                      </select>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex flex-wrap items-center justify-end gap-3 border-t border-[var(--border-subtle)] bg-[var(--bg-secondary)]/30 px-6 py-3.5">
          <PillButton variant="secondary" onClick={onClose} disabled={busy}>
            Cancel
          </PillButton>
          <PillButton
            onClick={() => void handleImport()}
            disabled={busy || selectedCount === 0}
          >
            {importing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Check className="h-4 w-4" />
            )}
            {importing
              ? 'Importing…'
              : `Import Selected (${selectedCount})`}
          </PillButton>
        </div>
      </div>
    </div>
  );
};
