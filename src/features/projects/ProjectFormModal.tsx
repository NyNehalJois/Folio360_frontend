import React, { useEffect, useRef, useState } from 'react';
import { AlertCircle, Check, Globe, ImagePlus, Lock, Plus, Trash2, X } from 'lucide-react';
import { PillButton } from '@/design/components/PillButton';
import { projectsService } from '@/services/api/projects.service';
import type { Project, ProjectCreate, Visibility } from '@/types/api';
import {
  PROJECT_CATEGORY_OPTIONS,
  parseTechInput,
  resolveProjectImageUrl,
  toInitialProjectFormValues,
  validateProjectForm,
  type ProjectFormErrors,
  type ProjectFormValues,
} from './projectHelpers';

interface ProjectFormModalProps {
  open: boolean;
  editingProject: Project | null;
  onClose: () => void;
  onSaved: (project: Project, mode: 'create' | 'edit') => void | Promise<void>;
}

const INPUT_BASE_CLASS =
  'h-10 w-full rounded-md border bg-[var(--bg-main)] px-3.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]/60 transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/40 disabled:cursor-not-allowed disabled:opacity-50';

const TEXTAREA_BASE_CLASS =
  'w-full rounded-md border bg-[var(--bg-main)] px-3.5 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]/60 transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/40 disabled:cursor-not-allowed disabled:opacity-50';

const LABEL_CLASS =
  'block font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--text-secondary)] mb-1.5';

const SECTION_HEADING_CLASS =
  'font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--text-secondary)]';

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

function fieldBorder(hasError?: string): string {
  return hasError
    ? 'border-[var(--danger-border)]'
    : 'border-[var(--border-medium)] focus:border-[var(--text-primary)]';
}

export const ProjectFormModal: React.FC<ProjectFormModalProps> = ({
  open,
  editingProject,
  onClose,
  onSaved,
}) => {
  const [values, setValues] = useState<ProjectFormValues>(() =>
    toInitialProjectFormValues(editingProject),
  );
  const [techInput, setTechInput] = useState('');
  const [errors, setErrors] = useState<ProjectFormErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [removeExistingCover, setRemoveExistingCover] = useState(false);
  const [coverAlt, setCoverAlt] = useState('');
  const [imageError, setImageError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!open) return;
    setValues(toInitialProjectFormValues(editingProject));
    setTechInput('');
    setErrors({});
    setSubmitError(null);
    setSaving(false);
    setSelectedFile(null);
    setRemoveExistingCover(false);
    setImageError(null);
    const existingCover = editingProject?.images?.[0] ?? null;
    setPreviewUrl(existingCover ? resolveProjectImageUrl(existingCover.url) : null);
    setCoverAlt(existingCover?.alt ?? '');
  }, [open, editingProject]);

  useEffect(() => {
    if (!selectedFile) return;
    const objectUrl = URL.createObjectURL(selectedFile);
    setPreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [selectedFile]);

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

  const isEdit = Boolean(editingProject);
  const existingCover = editingProject?.images?.[0] ?? null;

  const updateField = <K extends keyof ProjectFormValues>(
    field: K,
    value: ProjectFormValues[K],
  ) => {
    setValues((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => {
      if (!prev[field] && !prev.date_range) return prev;
      const next = { ...prev };
      delete next[field];
      if (field === 'start_date' || field === 'end_date' || field === 'is_ongoing') {
        delete next.date_range;
      }
      return next;
    });
    if (submitError) setSubmitError(null);
  };

  const handleOngoingToggle = (checked: boolean) => {
    setValues((prev) => ({
      ...prev,
      is_ongoing: checked,
      end_date: checked ? '' : prev.end_date,
    }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next.end_date;
      delete next.date_range;
      return next;
    });
  };

  const handleAddTech = () => {
    if (!techInput.trim()) return;
    updateField('technologies', parseTechInput(techInput, values.technologies));
    setTechInput('');
  };

  const handleRemoveTech = (tech: string) => {
    updateField(
      'technologies',
      values.technologies.filter((item) => item !== tech),
    );
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
      setImageError('Only JPEG, PNG, or WebP cover images are supported.');
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setImageError('Cover image must be 5 MB or smaller.');
      return;
    }
    setImageError(null);
    setSelectedFile(file);
    setRemoveExistingCover(false);
    if (!coverAlt.trim()) {
      setCoverAlt(`${values.title.trim() || 'Project'} cover image`);
    }
  };

  const handleRemoveCover = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setImageError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (existingCover) {
      setRemoveExistingCover(true);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (saving) return;

    const pendingTechs = techInput.trim()
      ? parseTechInput(techInput, values.technologies)
      : values.technologies;
    const normalizedValues: ProjectFormValues = {
      ...values,
      technologies: pendingTechs,
    };

    const validationErrors = validateProjectForm(normalizedValues);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setSaving(true);
    setSubmitError(null);

    try {
      const payload: ProjectCreate = {
        title: normalizedValues.title.trim(),
        summary: normalizedValues.summary.trim(),
        description: normalizedValues.description.trim() || undefined,
        category: normalizedValues.category.trim() || 'General',
        technologies: normalizedValues.technologies,
        skill_ids: [],
        github_url: normalizedValues.github_url.trim() || null,
        live_url: normalizedValues.live_url.trim() || null,
        start_date: normalizedValues.start_date || null,
        end_date: normalizedValues.is_ongoing ? null : normalizedValues.end_date || null,
        is_ongoing: normalizedValues.is_ongoing,
        featured: normalizedValues.featured,
        order: editingProject?.order ?? 0,
        visibility: normalizedValues.visibility,
      };

      let saved: Project;
      if (isEdit && editingProject) {
        saved = await projectsService.update(editingProject.id, {
          ...payload,
          description: normalizedValues.description.trim() || '',
        });

        if (removeExistingCover && existingCover) {
          await projectsService.removeImage(saved.id, existingCover.id);
        }
        if (selectedFile) {
          if (existingCover && !removeExistingCover) {
            await projectsService.removeImage(saved.id, existingCover.id);
          }
          await projectsService.uploadImage(
            saved.id,
            selectedFile,
            coverAlt.trim() || normalizedValues.title.trim(),
          );
        }
        saved = await projectsService.get(saved.id);
      } else {
        saved = await projectsService.create(payload);
        if (selectedFile) {
          await projectsService.uploadImage(
            saved.id,
            selectedFile,
            coverAlt.trim() || normalizedValues.title.trim(),
          );
          saved = await projectsService.get(saved.id);
        }
      }

      await onSaved(saved, isEdit ? 'edit' : 'create');
    } catch (err) {
      setSubmitError(
        err instanceof Error
          ? err.message
          : 'Unable to save this project. Please try again.',
      );
    } finally {
      setSaving(false);
    }
  };

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
        aria-labelledby="project-modal-title"
        className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-[var(--border-medium)] bg-[var(--surface-elevated)] shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4 border-b border-[var(--border-subtle)] px-6 py-4">
          <div>
            <p className={SECTION_HEADING_CLASS}>
              {isEdit ? 'Edit Portfolio Project' : 'New Portfolio Project'}
            </p>
            <h2
              id="project-modal-title"
              className="mt-1 font-serif text-2xl text-[var(--text-primary)]"
            >
              {isEdit ? 'Edit project' : 'Add project'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            aria-label="Close project form"
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

            {/* Project Details */}
            <section aria-labelledby="proj-section-details">
              <h3 id="proj-section-details" className={`${SECTION_HEADING_CLASS} mb-3`}>
                Project Details
              </h3>
              <div className="grid grid-cols-1 gap-x-4 gap-y-3.5 sm:grid-cols-2">
                <div>
                  <label htmlFor="proj-title" className={LABEL_CLASS}>
                    Project Title <span className="text-[var(--danger-text)]">*</span>
                  </label>
                  <input
                    id="proj-title"
                    type="text"
                    value={values.title}
                    onChange={(e) => updateField('title', e.target.value)}
                    placeholder="e.g., Folio360 Portfolio Engine"
                    aria-invalid={Boolean(errors.title)}
                    className={`${INPUT_BASE_CLASS} ${fieldBorder(errors.title)}`}
                  />
                  {errors.title && (
                    <p className="mt-1 text-xs text-[var(--danger-text)]">{errors.title}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="proj-category" className={LABEL_CLASS}>
                    Category
                  </label>
                  <select
                    id="proj-category"
                    value={
                      PROJECT_CATEGORY_OPTIONS.includes(values.category)
                        ? values.category
                        : 'General'
                    }
                    onChange={(e) => updateField('category', e.target.value)}
                    className={`${INPUT_BASE_CLASS} ${fieldBorder()}`}
                  >
                    {PROJECT_CATEGORY_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mt-3.5">
                <div className="flex items-center justify-between">
                  <label htmlFor="proj-summary" className={LABEL_CLASS}>
                    Summary <span className="text-[var(--danger-text)]">*</span>
                  </label>
                  <span className="font-mono text-[10px] text-[var(--text-secondary)]">
                    {values.summary.length}/500
                  </span>
                </div>
                <input
                  id="proj-summary"
                  type="text"
                  value={values.summary}
                  onChange={(e) => updateField('summary', e.target.value)}
                  placeholder="One-line elevator pitch describing what this project solves."
                  aria-invalid={Boolean(errors.summary)}
                  className={`${INPUT_BASE_CLASS} ${fieldBorder(errors.summary)}`}
                />
                {errors.summary && (
                  <p className="mt-1 text-xs text-[var(--danger-text)]">{errors.summary}</p>
                )}
              </div>

              <div className="mt-3.5">
                <label htmlFor="proj-description" className={LABEL_CLASS}>
                  Details <span className="opacity-70">(Optional)</span>
                </label>
                <textarea
                  id="proj-description"
                  rows={3}
                  value={values.description}
                  onChange={(e) => updateField('description', e.target.value)}
                  placeholder="Architecture highlights, key outcomes, or technical decisions."
                  aria-invalid={Boolean(errors.description)}
                  className={`${TEXTAREA_BASE_CLASS} resize-y ${fieldBorder(errors.description)}`}
                />
                {errors.description && (
                  <p className="mt-1 text-xs text-[var(--danger-text)]">{errors.description}</p>
                )}
              </div>
            </section>

            {/* Tech Stack */}
            <section
              aria-labelledby="proj-section-tech"
              className="border-t border-[var(--border-subtle)] pt-5"
            >
              <h3 id="proj-section-tech" className={`${SECTION_HEADING_CLASS} mb-3`}>
                Tech Stack
              </h3>
              <div className="flex gap-2">
                <input
                  id="proj-tech-input"
                  type="text"
                  value={techInput}
                  onChange={(e) => setTechInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ',') {
                      e.preventDefault();
                      handleAddTech();
                    }
                  }}
                  placeholder="Type a technology (e.g., React, FastAPI, PostgreSQL) and press Enter"
                  className={`${INPUT_BASE_CLASS} ${fieldBorder()}`}
                />
                <PillButton variant="secondary" onClick={handleAddTech} className="shrink-0">
                  <Plus className="h-3.5 w-3.5" />
                  Add
                </PillButton>
              </div>
              {values.technologies.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {values.technologies.map((tech) => (
                    <span
                      key={tech}
                      className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border-medium)] bg-[var(--surface-muted)] px-3 py-1 font-mono text-xs text-[var(--text-primary)]"
                    >
                      {tech}
                      <button
                        type="button"
                        onClick={() => handleRemoveTech(tech)}
                        aria-label={`Remove ${tech}`}
                        className="rounded-full p-0.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </section>

            {/* Links & Timeline */}
            <section
              aria-labelledby="proj-section-links"
              className="border-t border-[var(--border-subtle)] pt-5"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <h3 id="proj-section-links" className={SECTION_HEADING_CLASS}>
                  Links &amp; Timeline
                </h3>
                <div className="flex flex-wrap items-center gap-4">
                  <label
                    htmlFor="proj-is-ongoing"
                    className="inline-flex cursor-pointer items-center gap-2 text-xs text-[var(--text-primary)]"
                  >
                    <input
                      id="proj-is-ongoing"
                      type="checkbox"
                      checked={values.is_ongoing}
                      onChange={(e) => handleOngoingToggle(e.target.checked)}
                      className="h-4 w-4 rounded border-[var(--border-medium)] accent-[var(--accent)]"
                    />
                    <span>Ongoing</span>
                  </label>
                  <label
                    htmlFor="proj-featured"
                    className="inline-flex cursor-pointer items-center gap-2 text-xs text-[var(--text-primary)]"
                  >
                    <input
                      id="proj-featured"
                      type="checkbox"
                      checked={values.featured}
                      onChange={(e) => updateField('featured', e.target.checked)}
                      className="h-4 w-4 rounded border-[var(--border-medium)] accent-[var(--accent)]"
                    />
                    <span>Featured</span>
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-x-4 gap-y-3.5 sm:grid-cols-2">
                <div>
                  <label htmlFor="proj-github-url" className={LABEL_CLASS}>
                    Repository URL <span className="opacity-70">(Optional)</span>
                  </label>
                  <input
                    id="proj-github-url"
                    type="url"
                    value={values.github_url}
                    onChange={(e) => updateField('github_url', e.target.value)}
                    placeholder="https://github.com/username/repo"
                    aria-invalid={Boolean(errors.github_url)}
                    className={`${INPUT_BASE_CLASS} ${fieldBorder(errors.github_url)}`}
                  />
                  {errors.github_url && (
                    <p className="mt-1 text-xs text-[var(--danger-text)]">{errors.github_url}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="proj-live-url" className={LABEL_CLASS}>
                    Live / Demo URL <span className="opacity-70">(Optional)</span>
                  </label>
                  <input
                    id="proj-live-url"
                    type="url"
                    value={values.live_url}
                    onChange={(e) => updateField('live_url', e.target.value)}
                    placeholder="https://myproject.dev"
                    aria-invalid={Boolean(errors.live_url)}
                    className={`${INPUT_BASE_CLASS} ${fieldBorder(errors.live_url)}`}
                  />
                  {errors.live_url && (
                    <p className="mt-1 text-xs text-[var(--danger-text)]">{errors.live_url}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="proj-start-date" className={LABEL_CLASS}>
                    Start Date <span className="opacity-70">(Optional)</span>
                  </label>
                  <input
                    id="proj-start-date"
                    type="date"
                    value={values.start_date}
                    onChange={(e) => updateField('start_date', e.target.value)}
                    aria-invalid={Boolean(errors.date_range)}
                    className={`${INPUT_BASE_CLASS} ${fieldBorder(errors.date_range)}`}
                  />
                </div>

                <div>
                  <label htmlFor="proj-end-date" className={LABEL_CLASS}>
                    End Date{' '}
                    <span className="opacity-70">
                      {values.is_ongoing ? '(Ongoing)' : '(Optional)'}
                    </span>
                  </label>
                  <input
                    id="proj-end-date"
                    type="date"
                    disabled={values.is_ongoing}
                    value={values.end_date}
                    onChange={(e) => updateField('end_date', e.target.value)}
                    aria-invalid={Boolean(errors.date_range)}
                    className={`${INPUT_BASE_CLASS} ${fieldBorder(errors.date_range)}`}
                  />
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
            </section>

            {/* Cover Image */}
            <section
              aria-labelledby="proj-section-cover"
              className="border-t border-[var(--border-subtle)] pt-5"
            >
              <div className="flex items-center justify-between gap-2 mb-3">
                <h3 id="proj-section-cover" className={SECTION_HEADING_CLASS}>
                  Cover Image <span className="opacity-70">(Optional · Max 5 MB)</span>
                </h3>
                {previewUrl && (
                  <button
                    type="button"
                    onClick={handleRemoveCover}
                    className="inline-flex cursor-pointer items-center gap-1 font-mono text-[10px] uppercase tracking-[0.1em] text-[var(--danger-text)] hover:underline"
                  >
                    <Trash2 className="h-3 w-3" />
                    Remove image
                  </button>
                )}
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleFileChange}
                className="hidden"
                aria-label="Upload project cover image"
              />

              {previewUrl ? (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-[180px_1fr] sm:items-center">
                  <div className="aspect-[16/10] overflow-hidden rounded-lg border border-[var(--border-medium)] bg-[var(--bg-main)]">
                    <img
                      src={previewUrl}
                      alt={coverAlt || values.title || 'Project cover preview'}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="space-y-2.5">
                    <div>
                      <label htmlFor="proj-cover-alt" className={LABEL_CLASS}>
                        Image Alt Text
                      </label>
                      <input
                        id="proj-cover-alt"
                        type="text"
                        value={coverAlt}
                        onChange={(e) => setCoverAlt(e.target.value)}
                        placeholder="Describe the project screenshot"
                        className={`${INPUT_BASE_CLASS} ${fieldBorder()}`}
                      />
                    </div>
                    <PillButton
                      variant="secondary"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <ImagePlus className="h-3.5 w-3.5" />
                      Replace cover image
                    </PillButton>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex w-full cursor-pointer items-center justify-center gap-2.5 rounded-lg border border-dashed border-[var(--border-medium)] bg-[var(--bg-main)]/70 px-4 py-5 text-xs text-[var(--text-secondary)] transition-colors hover:border-[var(--text-primary)] hover:text-[var(--text-primary)]"
                >
                  <ImagePlus className="h-4 w-4" />
                  <span>Upload a JPEG, PNG, or WebP cover image</span>
                </button>
              )}

              {imageError && (
                <p className="mt-2 text-xs text-[var(--danger-text)]">{imageError}</p>
              )}
            </section>

            {/* Visibility */}
            <section
              aria-labelledby="proj-section-visibility"
              className="flex flex-col gap-3 border-t border-[var(--border-subtle)] pt-5 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <h3 id="proj-section-visibility" className={SECTION_HEADING_CLASS}>
                  Visibility
                </h3>
                <p className="mt-1 text-xs text-[var(--text-secondary)]">
                  {values.visibility === 'public'
                    ? 'Visible on your public Folio360 portfolio.'
                    : 'Private to your workspace and excluded from public profiles.'}
                </p>
              </div>
              <div className="inline-flex self-start rounded-full border border-[var(--border-medium)] bg-[var(--bg-main)] p-1 sm:self-auto">
                {(['private', 'public'] as Visibility[]).map((option) => {
                  const active = values.visibility === option;
                  return (
                    <button
                      key={option}
                      type="button"
                      aria-pressed={active}
                      onClick={() => updateField('visibility', option)}
                      className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full px-3.5 py-1.5 font-mono text-[11px] uppercase tracking-[0.08em] transition-colors ${
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
            </section>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-3 border-t border-[var(--border-subtle)] bg-[var(--bg-secondary)]/30 px-6 py-3.5">
            <PillButton variant="secondary" onClick={onClose} disabled={saving}>
              Cancel
            </PillButton>
            <PillButton type="submit" disabled={saving}>
              <Check className="h-4 w-4" />
              {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Save project'}
            </PillButton>
          </div>
        </form>
      </div>
    </div>
  );
};
