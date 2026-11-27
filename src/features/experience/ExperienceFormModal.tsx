import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  Check,
  Globe,
  Loader2,
  Lock,
  Plus,
  Star,
  Trash2,
  X,
} from 'lucide-react';
import { PillButton } from '@/design/components/PillButton';
import { EvidenceDocumentPicker } from '@/features/certificates/EvidenceDocumentPicker';
import { experienceService, skillsService } from '@/services/api';
import type { SkillRecord } from '@/services/api/skills.service';
import type { ApiClientError } from '@/services/http';
import type {
  Experience,
  ExperienceCreate,
  ExperienceType,
  UUID,
  Visibility,
} from '@/types/api';
import { EXPERIENCE_TYPE_OPTIONS } from './experienceHelpers';

interface ExperienceFormModalProps {
  open: boolean;
  editingExperience: Experience | null;
  onClose: () => void;
  onSaved: (experience: Experience, mode: 'create' | 'edit') => void | Promise<void>;
}

const INPUT_CLASS =
  'h-10 w-full rounded-lg border border-[var(--border-medium)] bg-[var(--bg-main)] px-3.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]/60 transition-colors focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30 disabled:cursor-not-allowed disabled:opacity-50';

const LABEL_CLASS =
  'mb-1.5 block font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--text-secondary)]';

export const ExperienceFormModal: React.FC<ExperienceFormModalProps> = ({
  open,
  editingExperience,
  onClose,
  onSaved,
}) => {
  const [type, setType] = useState<ExperienceType>('internship');
  const [role, setRole] = useState('');
  const [organization, setOrganization] = useState('');
  const [location, setLocation] = useState('');
  const [isRemote, setIsRemote] = useState(false);
  const [organizationUrl, setOrganizationUrl] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isCurrent, setIsCurrent] = useState(false);
  const [description, setDescription] = useState('');
  const [highlights, setHighlights] = useState<string[]>([]);
  const [highlightDraft, setHighlightDraft] = useState('');
  const [selectedSkillIds, setSelectedSkillIds] = useState<UUID[]>([]);
  const [selectedDocIds, setSelectedDocIds] = useState<UUID[]>([]);
  const [visibility, setVisibility] = useState<Visibility>('private');
  const [featured, setFeatured] = useState(false);

  const [availableSkills, setAvailableSkills] = useState<SkillRecord[]>([]);
  const [loadingSkills, setLoadingSkills] = useState(false);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const isEditing = Boolean(editingExperience);

  useEffect(() => {
    if (!open) return;
    if (editingExperience) {
      setType(editingExperience.type ?? 'internship');
      setRole(editingExperience.role);
      setOrganization(editingExperience.organization);
      setLocation(editingExperience.location ?? '');
      setIsRemote(Boolean(editingExperience.is_remote));
      setOrganizationUrl(editingExperience.organization_url ?? '');
      setStartDate(editingExperience.start_date ?? '');
      setEndDate(editingExperience.is_current ? '' : editingExperience.end_date ?? '');
      setIsCurrent(Boolean(editingExperience.is_current));
      setDescription(editingExperience.description ?? '');
      setHighlights(editingExperience.highlights ?? []);
      setSelectedSkillIds((editingExperience.skills ?? []).map((s) => s.id));
      setSelectedDocIds((editingExperience.documents ?? []).map((d) => d.id));
      setVisibility(editingExperience.visibility ?? 'private');
      setFeatured(Boolean(editingExperience.featured));
    } else {
      setType('internship');
      setRole('');
      setOrganization('');
      setLocation('');
      setIsRemote(false);
      setOrganizationUrl('');
      setStartDate('');
      setEndDate('');
      setIsCurrent(false);
      setDescription('');
      setHighlights([]);
      setSelectedSkillIds([]);
      setSelectedDocIds([]);
      setVisibility('private');
      setFeatured(false);
    }
    setHighlightDraft('');
    setFieldError(null);
    setSubmitError(null);
  }, [open, editingExperience]);

  useEffect(() => {
    if (!open) return;
    let active = true;
    setLoadingSkills(true);
    skillsService
      .listMySkills({ page: 1, page_size: 100 })
      .then((res) => {
        if (active) setAvailableSkills(res.items ?? []);
      })
      .catch(() => {
        if (active) setAvailableSkills([]);
      })
      .finally(() => {
        if (active) setLoadingSkills(false);
      });
    return () => {
      active = false;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !saving) onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, saving, onClose]);

  if (!open) return null;

  const toggleSkill = (skillId: UUID) => {
    setSelectedSkillIds((prev) =>
      prev.includes(skillId) ? prev.filter((id) => id !== skillId) : [...prev, skillId],
    );
  };

  const addHighlight = () => {
    const cleaned = highlightDraft.trim();
    if (!cleaned) return;
    if (highlights.length >= 15) {
      setFieldError('You can add at most 15 highlights.');
      return;
    }
    setHighlights((prev) => [...prev, cleaned]);
    setHighlightDraft('');
    setFieldError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFieldError(null);
    setSubmitError(null);

    const trimmedRole = role.trim();
    const trimmedOrg = organization.trim();
    const trimmedUrl = organizationUrl.trim();

    if (!trimmedRole) {
      setFieldError('Role / position title is required.');
      return;
    }
    if (!trimmedOrg) {
      setFieldError('Organization name is required.');
      return;
    }
    if (!startDate) {
      setFieldError('Start date is required.');
      return;
    }
    if (!isCurrent && endDate && endDate < startDate) {
      setFieldError('End date cannot be earlier than start date.');
      return;
    }
    if (trimmedUrl && !/^https?:\/\/\S+$/i.test(trimmedUrl)) {
      setFieldError('Organization website must be a valid http:// or https:// URL.');
      return;
    }

    const pendingHighlight = highlightDraft.trim();
    const finalHighlights = pendingHighlight
      ? [...highlights, pendingHighlight]
      : highlights;
    if (finalHighlights.length > 15) {
      setFieldError('You can add at most 15 highlights.');
      return;
    }

    const payload: ExperienceCreate = {
      type,
      organization: trimmedOrg,
      role: trimmedRole,
      location: location.trim() || null,
      is_remote: isRemote,
      organization_url: trimmedUrl || null,
      start_date: startDate,
      end_date: isCurrent ? null : endDate || null,
      is_current: isCurrent,
      description: description.trim() || null,
      highlights: finalHighlights.map((item) => item.trim()).filter(Boolean),
      skill_ids: selectedSkillIds,
      document_ids: selectedDocIds,
      featured,
      visibility,
    };

    setSaving(true);
    try {
      const saved = editingExperience
        ? await experienceService.update(editingExperience.id, payload)
        : await experienceService.create(payload);
      await onSaved(saved, editingExperience ? 'edit' : 'create');
      onClose();
    } catch (err) {
      const apiErr = err as ApiClientError;
      setSubmitError(apiErr?.message || 'Unable to save this experience entry.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="experience-modal-title"
      onClick={() => {
        if (!saving) onClose();
      }}
    >
      <div
        className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-[var(--border-medium)] bg-[var(--surface-elevated)] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-[var(--border-subtle)] px-6 py-5">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--text-secondary)]">
              {isEditing ? 'EDIT EXPERIENCE' : 'NEW EXPERIENCE'}
            </p>
            <h2
              id="experience-modal-title"
              className="mt-1 font-serif text-2xl font-normal text-[var(--text-primary)]"
            >
              {isEditing ? 'Update experience' : 'Add experience'}
            </h2>
          </div>
          <button
            type="button"
            disabled={saving}
            onClick={onClose}
            aria-label="Close experience modal"
            className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-[var(--border-subtle)] text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)] disabled:opacity-50"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 p-6">
          {(fieldError || submitError) && (
            <div
              role="alert"
              className="flex items-start gap-2.5 rounded-lg border border-[var(--danger-border)] bg-[var(--danger-bg)] px-3.5 py-2.5 text-xs text-[var(--danger-text)]"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{fieldError || submitError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="exp-role" className={LABEL_CLASS}>
                Role / Position *
              </label>
              <input
                id="exp-role"
                type="text"
                required
                maxLength={200}
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="e.g., Backend Engineering Intern"
                className={INPUT_CLASS}
              />
            </div>

            <div>
              <label htmlFor="exp-org" className={LABEL_CLASS}>
                Organization *
              </label>
              <input
                id="exp-org"
                type="text"
                required
                maxLength={200}
                value={organization}
                onChange={(e) => setOrganization(e.target.value)}
                placeholder="e.g., Acme Systems"
                className={INPUT_CLASS}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label htmlFor="exp-type" className={LABEL_CLASS}>
                Experience Type *
              </label>
              <select
                id="exp-type"
                value={type}
                onChange={(e) => setType(e.target.value as ExperienceType)}
                className={INPUT_CLASS}
              >
                {EXPERIENCE_TYPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="exp-location" className={LABEL_CLASS}>
                Location
              </label>
              <input
                id="exp-location"
                type="text"
                maxLength={200}
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g., Bengaluru, India"
                className={INPUT_CLASS}
              />
            </div>

            <div>
              <label htmlFor="exp-url" className={LABEL_CLASS}>
                Organization URL
              </label>
              <input
                id="exp-url"
                type="url"
                maxLength={512}
                value={organizationUrl}
                onChange={(e) => setOrganizationUrl(e.target.value)}
                placeholder="https://company.com"
                className={INPUT_CLASS}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="exp-start-date" className={LABEL_CLASS}>
                Start Date *
              </label>
              <input
                id="exp-start-date"
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className={INPUT_CLASS}
              />
            </div>

            <div>
              <label htmlFor="exp-end-date" className={LABEL_CLASS}>
                End Date
              </label>
              <input
                id="exp-end-date"
                type="date"
                disabled={isCurrent}
                value={isCurrent ? '' : endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className={INPUT_CLASS}
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <label className="inline-flex cursor-pointer items-center gap-2 text-xs text-[var(--text-primary)]">
              <input
                type="checkbox"
                checked={isCurrent}
                onChange={(e) => {
                  const next = e.target.checked;
                  setIsCurrent(next);
                  if (next) setEndDate('');
                }}
                className="h-4 w-4 rounded border-[var(--border-medium)] accent-[var(--accent)]"
              />
              <span>I currently work or serve in this role</span>
            </label>

            <label className="inline-flex cursor-pointer items-center gap-2 text-xs text-[var(--text-primary)]">
              <input
                type="checkbox"
                checked={isRemote}
                onChange={(e) => setIsRemote(e.target.checked)}
                className="h-4 w-4 rounded border-[var(--border-medium)] accent-[var(--accent)]"
              />
              <span>Remote role</span>
            </label>
          </div>

          <div>
            <label htmlFor="exp-description" className={LABEL_CLASS}>
              Description
            </label>
            <textarea
              id="exp-description"
              rows={3}
              maxLength={5000}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Summarize your responsibilities, scope, and impact..."
              className="w-full rounded-lg border border-[var(--border-medium)] bg-[var(--bg-main)] px-3.5 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]/60 focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30"
            />
          </div>

          <div>
            <label htmlFor="exp-highlight-draft" className={LABEL_CLASS}>
              Key Highlights ({highlights.length}/15)
            </label>
            <div className="flex gap-2">
              <input
                id="exp-highlight-draft"
                type="text"
                maxLength={300}
                value={highlightDraft}
                onChange={(e) => setHighlightDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addHighlight();
                  }
                }}
                placeholder="e.g., Reduced API p95 latency by 35%"
                className={INPUT_CLASS}
              />
              <PillButton
                type="button"
                variant="secondary"
                size="sm"
                onClick={addHighlight}
                disabled={!highlightDraft.trim() || highlights.length >= 15}
              >
                <Plus className="h-3.5 w-3.5" /> Add
              </PillButton>
            </div>
            {highlights.length > 0 && (
              <ul className="mt-2.5 space-y-1.5">
                {highlights.map((item, idx) => (
                  <li
                    key={`${idx}-${item}`}
                    className="flex items-center justify-between gap-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-main)] px-3 py-1.5 text-xs text-[var(--text-primary)]"
                  >
                    <span className="min-w-0 flex-1 break-words">{item}</span>
                    <button
                      type="button"
                      onClick={() =>
                        setHighlights((prev) => prev.filter((_, i) => i !== idx))
                      }
                      aria-label={`Remove highlight ${idx + 1}`}
                      className="inline-flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded-full text-[var(--text-secondary)] hover:bg-[var(--surface-muted)] hover:text-[var(--danger-text)]"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <p className={LABEL_CLASS}>Linked Skills</p>
            {loadingSkills ? (
              <p className="inline-flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading skills…
              </p>
            ) : availableSkills.length === 0 ? (
              <p className="text-xs text-[var(--text-secondary)]">
                No workspace skills added yet. You can create skills in the Skills page anytime.
              </p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {availableSkills.map((skill) => {
                  const selected = selectedSkillIds.includes(skill.id);
                  return (
                    <button
                      key={skill.id}
                      type="button"
                      onClick={() => toggleSkill(skill.id)}
                      className={`inline-flex cursor-pointer items-center gap-1 rounded-full border px-3 py-1 text-xs transition-colors ${
                        selected
                          ? 'border-[var(--accent)] bg-[var(--accent)]/12 font-medium text-[var(--accent)]'
                          : 'border-[var(--border-subtle)] bg-[var(--bg-main)] text-[var(--text-secondary)] hover:border-[var(--border-medium)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      {selected && <Check className="h-3 w-3" />}
                      {skill.name}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <EvidenceDocumentPicker
            mode="multiple"
            selectedIds={selectedDocIds}
            onChange={setSelectedDocIds}
            defaultUploadCategory="other"
            disabled={saving}
          />

          <div className="grid grid-cols-1 gap-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-main)] p-4 sm:grid-cols-2">
            <div>
              <p className={LABEL_CLASS}>Visibility</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setVisibility('private')}
                  className={`inline-flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition-colors ${
                    visibility === 'private'
                      ? 'border-[var(--accent)] bg-[var(--accent)]/12 font-medium text-[var(--accent)]'
                      : 'border-[var(--border-subtle)] bg-[var(--surface-elevated)] text-[var(--text-secondary)]'
                  }`}
                >
                  <Lock className="h-3.5 w-3.5" /> Private
                </button>
                <button
                  type="button"
                  onClick={() => setVisibility('public')}
                  className={`inline-flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition-colors ${
                    visibility === 'public'
                      ? 'border-[var(--accent)] bg-[var(--accent)]/12 font-medium text-[var(--accent)]'
                      : 'border-[var(--border-subtle)] bg-[var(--surface-elevated)] text-[var(--text-secondary)]'
                  }`}
                >
                  <Globe className="h-3.5 w-3.5" /> Public
                </button>
              </div>
            </div>

            <div className="flex items-end">
              <button
                type="button"
                onClick={() => setFeatured((prev) => !prev)}
                className={`inline-flex h-9 w-full cursor-pointer items-center justify-center gap-1.5 rounded-full border px-3 text-xs transition-colors ${
                  featured
                    ? 'border-amber-500/40 bg-amber-500/12 font-medium text-amber-600 dark:text-amber-300'
                    : 'border-[var(--border-subtle)] bg-[var(--surface-elevated)] text-[var(--text-secondary)]'
                }`}
              >
                <Star className={`h-3.5 w-3.5 ${featured ? 'fill-current' : ''}`} />
                {featured ? 'Featured on top' : 'Mark as featured'}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-[var(--border-subtle)] pt-4">
            <PillButton
              type="button"
              variant="secondary"
              disabled={saving}
              onClick={onClose}
            >
              Cancel
            </PillButton>
            <PillButton type="submit" variant="primary" disabled={saving}>
              {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {saving ? 'Saving…' : isEditing ? 'Save changes' : 'Create experience'}
            </PillButton>
          </div>
        </form>
      </div>
    </div>
  );
};
