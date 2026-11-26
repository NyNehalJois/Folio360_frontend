import React, { useEffect, useState } from 'react';
import { AlertCircle, Check, FileText, Globe, Lock, X } from 'lucide-react';
import { PillButton } from '@/design/components/PillButton';
import {
  DocumentUploadWidget,
  formatDocumentCategory,
  formatFileSize,
} from '@/features/documents/DocumentUploadWidget';
import { educationService } from '@/services/api/education.service';
import type { Document, Education, EducationCreate, EducationLevel, Visibility } from '@/types/api';
import {
  EDUCATION_LEVEL_OPTIONS,
  MONTH_OPTIONS,
  toInitialFormValues,
  validateEducationForm,
  type EducationFormErrors,
  type EducationFormValues,
} from './educationHelpers';

interface EducationFormModalProps {
  open: boolean;
  editingRecord: Education | null;
  availableDocuments: Document[];
  onDocumentUploaded: (doc: Document) => void;
  onClose: () => void;
  onSaved: (record: Education, mode: 'create' | 'edit') => void;
}

const INPUT_BASE_CLASS =
  'w-full rounded-md border bg-[var(--bg-main)] px-3.5 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]/60 transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/40 disabled:cursor-not-allowed disabled:opacity-50';

const LABEL_CLASS =
  'block font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--text-secondary)] mb-1.5';

export const EducationFormModal: React.FC<EducationFormModalProps> = ({
  open,
  editingRecord,
  availableDocuments,
  onDocumentUploaded,
  onClose,
  onSaved,
}) => {
  const [values, setValues] = useState<EducationFormValues>(() =>
    toInitialFormValues(editingRecord),
  );
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>(
    () => editingRecord?.documents?.map((doc) => doc.id) ?? [],
  );
  const [errors, setErrors] = useState<EducationFormErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setValues(toInitialFormValues(editingRecord));
    setSelectedDocIds(editingRecord?.documents?.map((doc) => doc.id) ?? []);
    setErrors({});
    setSubmitError(null);
    setSaving(false);
  }, [open, editingRecord]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !saving) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, saving, onClose]);

  if (!open) return null;

  const isEdit = Boolean(editingRecord);

  const updateField = <K extends keyof EducationFormValues>(
    field: K,
    value: EducationFormValues[K],
  ) => {
    setValues((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => {
      if (!prev[field] && !prev.date_range) return prev;
      const next = { ...prev };
      delete next[field];
      if (
        field === 'start_month' ||
        field === 'start_year' ||
        field === 'end_month' ||
        field === 'end_year' ||
        field === 'is_current'
      ) {
        delete next.date_range;
      }
      return next;
    });
    if (submitError) setSubmitError(null);
  };

  const handleCurrentToggle = (checked: boolean) => {
    setValues((prev) => ({
      ...prev,
      is_current: checked,
      end_month: checked ? '' : prev.end_month,
      end_year: checked ? '' : prev.end_year,
    }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next.is_current;
      delete next.end_month;
      delete next.end_year;
      delete next.date_range;
      return next;
    });
    if (submitError) setSubmitError(null);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (saving) return;

    const validationErrors = validateEducationForm(values);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    const payload: EducationCreate = {
      institution: values.institution.trim(),
      university_or_board: values.university_or_board.trim() || null,
      education_level: values.education_level,
      degree: values.degree.trim(),
      branch: values.branch.trim(),
      specialization: values.specialization.trim() || undefined,
      country: values.country.trim(),
      state: values.state.trim(),
      start_month: Number(values.start_month),
      start_year: Number(values.start_year),
      end_month: values.is_current ? null : Number(values.end_month),
      end_year: values.is_current ? null : Number(values.end_year),
      is_current: values.is_current,
      description: values.description.trim() || null,
      visibility: values.visibility,
      result_type: editingRecord?.result_type ?? 'none',
      result_value: editingRecord?.result_value ?? null,
      show_result_publicly: editingRecord?.show_result_publicly ?? false,
      achievements: editingRecord?.achievements ?? [],
      document_ids: selectedDocIds,
    };

    setSaving(true);
    setSubmitError(null);

    try {
      const saved = isEdit && editingRecord
        ? await educationService.update(editingRecord.id, payload)
        : await educationService.create(payload);
      onSaved(saved, isEdit ? 'edit' : 'create');
    } catch (err) {
      setSubmitError(
        err instanceof Error
          ? err.message
          : 'Unable to save this education record. Please try again.',
      );
    } finally {
      setSaving(false);
    }
  };

  const fieldBorder = (hasError?: string) =>
    hasError
      ? 'border-[var(--danger-border)]'
      : 'border-[var(--border-medium)] focus:border-[var(--text-primary)]';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 backdrop-blur-[2px]"
      role="presentation"
      onClick={(event) => {
        if (event.target === event.currentTarget && !saving) {
          onClose();
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="education-modal-title"
        className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-[var(--border-medium)] bg-[var(--bg-main)] shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4 border-b border-[var(--border-subtle)] px-6 py-5">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--text-secondary)]">
              {isEdit ? 'Edit Academic Entry' : 'New Academic Entry'}
            </p>
            <h2
              id="education-modal-title"
              className="mt-1 font-serif text-2xl text-[var(--text-primary)]"
            >
              {isEdit ? 'Update education record' : 'Add education record'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            aria-label="Close education form"
            className="rounded-full p-2 text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)] disabled:opacity-50"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
            {submitError && (
              <div
                role="alert"
                className="flex items-start gap-2.5 rounded-lg border border-[var(--danger-border)] bg-[var(--danger-bg)] px-4 py-3 text-xs text-[var(--danger-text)]"
              >
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{submitError}</span>
              </div>
            )}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="edu-level" className={LABEL_CLASS}>
                  Education Level <span className="text-[var(--danger-text)]">*</span>
                </label>
                <select
                  id="edu-level"
                  value={values.education_level}
                  onChange={(e) =>
                    updateField('education_level', e.target.value as EducationLevel)
                  }
                  aria-invalid={Boolean(errors.education_level)}
                  className={`${INPUT_BASE_CLASS} ${fieldBorder(errors.education_level)}`}
                >
                  {EDUCATION_LEVEL_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                {errors.education_level && (
                  <p className="mt-1 text-xs text-[var(--danger-text)]">{errors.education_level}</p>
                )}
              </div>

              <div>
                <label htmlFor="edu-degree" className={LABEL_CLASS}>
                  Degree / Qualification <span className="text-[var(--danger-text)]">*</span>
                </label>
                <input
                  id="edu-degree"
                  type="text"
                  value={values.degree}
                  onChange={(e) => updateField('degree', e.target.value)}
                  placeholder="e.g., B.E., Class XII, Diploma"
                  aria-invalid={Boolean(errors.degree)}
                  className={`${INPUT_BASE_CLASS} ${fieldBorder(errors.degree)}`}
                />
                {errors.degree && (
                  <p className="mt-1 text-xs text-[var(--danger-text)]">{errors.degree}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="edu-institution" className={LABEL_CLASS}>
                  Institution / College Name <span className="text-[var(--danger-text)]">*</span>
                </label>
                <input
                  id="edu-institution"
                  type="text"
                  value={values.institution}
                  onChange={(e) => updateField('institution', e.target.value)}
                  placeholder="e.g., R.V. College of Engineering"
                  aria-invalid={Boolean(errors.institution)}
                  className={`${INPUT_BASE_CLASS} ${fieldBorder(errors.institution)}`}
                />
                {errors.institution && (
                  <p className="mt-1 text-xs text-[var(--danger-text)]">{errors.institution}</p>
                )}
              </div>

              <div>
                <label htmlFor="edu-university" className={LABEL_CLASS}>
                  University / Education Board
                </label>
                <input
                  id="edu-university"
                  type="text"
                  value={values.university_or_board}
                  onChange={(e) => updateField('university_or_board', e.target.value)}
                  placeholder="e.g., Visvesvaraya Technological University"
                  aria-invalid={Boolean(errors.university_or_board)}
                  className={`${INPUT_BASE_CLASS} ${fieldBorder(errors.university_or_board)}`}
                />
                <p className="mt-1 text-[11px] text-[var(--text-secondary)]">
                  Keep affiliating university or board separate from the college or school name.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="edu-branch" className={LABEL_CLASS}>
                  Field of Study <span className="text-[var(--danger-text)]">*</span>
                </label>
                <input
                  id="edu-branch"
                  type="text"
                  value={values.branch}
                  onChange={(e) => updateField('branch', e.target.value)}
                  placeholder="e.g., Computer Science & Engineering"
                  aria-invalid={Boolean(errors.branch)}
                  className={`${INPUT_BASE_CLASS} ${fieldBorder(errors.branch)}`}
                />
                {errors.branch && (
                  <p className="mt-1 text-xs text-[var(--danger-text)]">{errors.branch}</p>
                )}
              </div>

              <div>
                <label htmlFor="edu-specialization" className={LABEL_CLASS}>
                  Specialization <span className="opacity-70">(Optional)</span>
                </label>
                <input
                  id="edu-specialization"
                  type="text"
                  value={values.specialization}
                  onChange={(e) => updateField('specialization', e.target.value)}
                  placeholder="e.g., Artificial Intelligence & Systems"
                  className={`${INPUT_BASE_CLASS} ${fieldBorder()}`}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="edu-country" className={LABEL_CLASS}>
                  Country <span className="text-[var(--danger-text)]">*</span>
                </label>
                <input
                  id="edu-country"
                  type="text"
                  value={values.country}
                  onChange={(e) => updateField('country', e.target.value)}
                  placeholder="e.g., India"
                  aria-invalid={Boolean(errors.country)}
                  className={`${INPUT_BASE_CLASS} ${fieldBorder(errors.country)}`}
                />
                {errors.country && (
                  <p className="mt-1 text-xs text-[var(--danger-text)]">{errors.country}</p>
                )}
              </div>

              <div>
                <label htmlFor="edu-state" className={LABEL_CLASS}>
                  State / Region <span className="text-[var(--danger-text)]">*</span>
                </label>
                <input
                  id="edu-state"
                  type="text"
                  value={values.state}
                  onChange={(e) => updateField('state', e.target.value)}
                  placeholder="e.g., Karnataka"
                  aria-invalid={Boolean(errors.state)}
                  className={`${INPUT_BASE_CLASS} ${fieldBorder(errors.state)}`}
                />
                {errors.state && (
                  <p className="mt-1 text-xs text-[var(--danger-text)]">{errors.state}</p>
                )}
              </div>
            </div>

            <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-secondary)]/45 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-[var(--text-primary)]">
                    Currently studying here
                  </p>
                  <p className="text-xs text-[var(--text-secondary)]">
                    Marks this qualification as in progress and clears the end date.
                  </p>
                </div>
                <label className="inline-flex cursor-pointer items-center gap-2.5">
                  <input
                    id="edu-is-current"
                    type="checkbox"
                    checked={values.is_current}
                    onChange={(e) => handleCurrentToggle(e.target.checked)}
                    className="h-4 w-4 rounded border-[var(--border-medium)] accent-[var(--accent)]"
                  />
                  <span className="font-mono text-xs text-[var(--text-primary)]">
                    {values.is_current ? 'Ongoing' : 'Completed'}
                  </span>
                </label>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <span className={LABEL_CLASS}>
                    Start Date <span className="text-[var(--danger-text)]">*</span>
                  </span>
                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <select
                        id="edu-start-month"
                        aria-label="Start month"
                        value={values.start_month}
                        onChange={(e) => updateField('start_month', e.target.value)}
                        aria-invalid={Boolean(errors.start_month || errors.date_range)}
                        className={`${INPUT_BASE_CLASS} ${fieldBorder(errors.start_month || errors.date_range)}`}
                      >
                        <option value="">Month</option>
                        {MONTH_OPTIONS.map((m) => (
                          <option key={m.value} value={String(m.value)}>
                            {m.label}
                          </option>
                        ))}
                      </select>
                      {errors.start_month && (
                        <p className="mt-1 text-xs text-[var(--danger-text)]">
                          {errors.start_month}
                        </p>
                      )}
                    </div>
                    <div>
                      <input
                        id="edu-start-year"
                        type="number"
                        inputMode="numeric"
                        min={1950}
                        max={2040}
                        aria-label="Start year"
                        placeholder="Year"
                        value={values.start_year}
                        onChange={(e) => updateField('start_year', e.target.value)}
                        aria-invalid={Boolean(errors.start_year || errors.date_range)}
                        className={`${INPUT_BASE_CLASS} ${fieldBorder(errors.start_year || errors.date_range)}`}
                      />
                      {errors.start_year && (
                        <p className="mt-1 text-xs text-[var(--danger-text)]">
                          {errors.start_year}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <div>
                  <span className={LABEL_CLASS}>
                    End Date{' '}
                    {!values.is_current ? (
                      <span className="text-[var(--danger-text)]">*</span>
                    ) : (
                      <span className="opacity-70">(Cleared while ongoing)</span>
                    )}
                  </span>
                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <select
                        id="edu-end-month"
                        aria-label="End month"
                        disabled={values.is_current}
                        value={values.end_month}
                        onChange={(e) => updateField('end_month', e.target.value)}
                        aria-invalid={Boolean(errors.end_month || errors.date_range)}
                        className={`${INPUT_BASE_CLASS} ${fieldBorder(errors.end_month || errors.date_range)}`}
                      >
                        <option value="">Month</option>
                        {MONTH_OPTIONS.map((m) => (
                          <option key={m.value} value={String(m.value)}>
                            {m.label}
                          </option>
                        ))}
                      </select>
                      {errors.end_month && (
                        <p className="mt-1 text-xs text-[var(--danger-text)]">{errors.end_month}</p>
                      )}
                    </div>
                    <div>
                      <input
                        id="edu-end-year"
                        type="number"
                        inputMode="numeric"
                        min={1950}
                        max={2045}
                        disabled={values.is_current}
                        aria-label="End year"
                        placeholder={values.is_current ? 'Present' : 'Year'}
                        value={values.end_year}
                        onChange={(e) => updateField('end_year', e.target.value)}
                        aria-invalid={Boolean(errors.end_year || errors.date_range)}
                        className={`${INPUT_BASE_CLASS} ${fieldBorder(errors.end_year || errors.date_range)}`}
                      />
                      {errors.end_year && (
                        <p className="mt-1 text-xs text-[var(--danger-text)]">{errors.end_year}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {errors.date_range && (
                <p
                  role="alert"
                  className="mt-2.5 flex items-center gap-1.5 text-xs text-[var(--danger-text)]"
                >
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  <span>{errors.date_range}</span>
                </p>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label htmlFor="edu-description" className={LABEL_CLASS}>
                  Description / Academic Highlights <span className="opacity-70">(Optional)</span>
                </label>
                <span className="font-mono text-[10px] text-[var(--text-secondary)]">
                  {values.description.length}/1500
                </span>
              </div>
              <textarea
                id="edu-description"
                rows={3}
                value={values.description}
                onChange={(e) => updateField('description', e.target.value)}
                placeholder="Relevant coursework, honors, thesis focus, or academic societies."
                aria-invalid={Boolean(errors.description)}
                className={`${INPUT_BASE_CLASS} resize-y ${fieldBorder(errors.description)}`}
              />
              {errors.description && (
                <p className="mt-1 text-xs text-[var(--danger-text)]">{errors.description}</p>
              )}
            </div>

            {/* Attach or Upload Academic Documents */}
            <div className="space-y-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-secondary)]/35 p-4">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-medium text-[var(--text-primary)]">
                    Academic Documents
                  </p>
                  <p className="text-xs text-[var(--text-secondary)]">
                    Attach existing documents or upload new marksheets and certificates.
                  </p>
                </div>
                <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-[var(--text-secondary)]">
                  {selectedDocIds.length} attached
                </span>
              </div>

              {availableDocuments.length > 0 && (
                <div className="max-h-40 space-y-1.5 overflow-y-auto pr-1">
                  {availableDocuments.map((doc) => {
                    const checked = selectedDocIds.includes(doc.id);
                    return (
                      <label
                        key={doc.id}
                        className={`flex cursor-pointer items-center justify-between gap-3 rounded-md border px-3 py-2 text-xs transition-colors ${
                          checked
                            ? 'border-[var(--border-accent)] bg-[var(--surface-elevated)]'
                            : 'border-[var(--border-subtle)] bg-[var(--bg-main)] hover:border-[var(--border-medium)]'
                        }`}
                      >
                        <span className="flex min-w-0 items-center gap-2.5">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() =>
                              setSelectedDocIds((prev) =>
                                prev.includes(doc.id)
                                  ? prev.filter((id) => id !== doc.id)
                                  : [...prev, doc.id],
                              )
                            }
                            className="h-3.5 w-3.5 rounded border-[var(--border-medium)] accent-[var(--accent)]"
                          />
                          <FileText className="h-3.5 w-3.5 shrink-0 text-[var(--text-secondary)]" />
                          <span className="truncate font-medium text-[var(--text-primary)]">
                            {doc.title}
                          </span>
                        </span>
                        <span className="shrink-0 font-mono text-[10px] text-[var(--text-secondary)]">
                          {formatDocumentCategory(doc.category)} · {formatFileSize(doc.size_bytes)}
                        </span>
                      </label>
                    );
                  })}
                </div>
              )}

              <div className="border-t border-[var(--border-subtle)] pt-3">
                <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--text-secondary)] mb-2">
                  Upload &amp; Attach New Document
                </p>
                <DocumentUploadWidget
                  compact
                  submitLabel="Upload & attach"
                  onUploaded={(doc) => {
                    onDocumentUploaded(doc);
                    setSelectedDocIds((prev) => (prev.includes(doc.id) ? prev : [...prev, doc.id]));
                  }}
                />
              </div>
            </div>

            <div className="flex flex-col gap-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-secondary)]/35 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium text-[var(--text-primary)]">Record visibility</p>
                <p className="text-xs text-[var(--text-secondary)]">
                  {values.visibility === 'public'
                    ? 'Shown on your public folio when public education is enabled.'
                    : 'Stored privately in your workspace and omitted from public views.'}
                </p>
              </div>
              <div className="inline-flex rounded-full border border-[var(--border-medium)] bg-[var(--bg-main)] p-1">
                {(['public', 'private'] as Visibility[]).map((option) => {
                  const active = values.visibility === option;
                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() => updateField('visibility', option)}
                      className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 font-mono text-[11px] uppercase tracking-[0.08em] transition-colors ${
                        active
                          ? 'bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)]'
                          : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      {option === 'public' ? (
                        <Globe className="h-3 w-3" />
                      ) : (
                        <Lock className="h-3 w-3" />
                      )}
                      {option}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-3 border-t border-[var(--border-subtle)] bg-[var(--bg-secondary)]/30 px-6 py-4">
            <PillButton variant="secondary" onClick={onClose} disabled={saving}>
              Cancel
            </PillButton>
            <PillButton type="submit" disabled={saving}>
              <Check className="h-4 w-4" />
              {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Save education'}
            </PillButton>
          </div>
        </form>
      </div>
    </div>
  );
};
