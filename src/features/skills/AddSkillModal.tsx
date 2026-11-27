import React, { useEffect, useState } from 'react';
import { AlertCircle, Check, Loader2, X } from 'lucide-react';
import { PillButton } from '@/design/components/PillButton';
import {
  skillsService,
  type SkillCategoryKey,
  type SkillProficiency,
  type SkillRecord,
} from '@/services/api/skills.service';

export const SKILL_CATEGORY_OPTIONS: {
  value: SkillCategoryKey;
  label: string;
}[] = [
  { value: 'technical', label: 'Domain & Technical Expertise' },
  { value: 'tool', label: 'Tools, Software & Equipment' },
  { value: 'soft', label: 'Workplace & Soft Skills' },
];

export const SKILL_PROFICIENCY_OPTIONS: SkillProficiency[] = [
  'Beginner',
  'Intermediate',
  'Advanced',
  'Expert',
];

interface AddSkillModalProps {
  open: boolean;
  initialCategory?: SkillCategoryKey;
  editingSkill?: SkillRecord | null;
  onClose: () => void;
  onCreated: (skill: SkillRecord) => void | Promise<void>;
  onUpdated?: (skill: SkillRecord) => void | Promise<void>;
}

const INPUT_BASE_CLASS =
  'h-10 w-full rounded-lg border bg-[var(--bg-main)] px-3.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]/60 transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/40 disabled:cursor-not-allowed disabled:opacity-50';

const LABEL_CLASS =
  'block font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--text-secondary)] mb-1.5';

function normalizeCategoryKey(raw?: string): SkillCategoryKey {
  const normalized = (raw ?? '').trim().toLowerCase();
  if (normalized === 'tool' || normalized === 'tools') return 'tool';
  if (normalized === 'soft' || normalized === 'communication') return 'soft';
  return 'technical';
}

function normalizeProficiency(raw?: string | null): SkillProficiency {
  const normalized = (raw ?? '').trim().toLowerCase();
  if (normalized === 'beginner') return 'Beginner';
  if (normalized === 'advanced') return 'Advanced';
  if (normalized === 'expert') return 'Expert';
  return 'Intermediate';
}

export const AddSkillModal: React.FC<AddSkillModalProps> = ({
  open,
  initialCategory = 'technical',
  editingSkill = null,
  onClose,
  onCreated,
  onUpdated,
}) => {
  const [name, setName] = useState('');
  const [category, setCategory] = useState<SkillCategoryKey>(initialCategory);
  const [proficiency, setProficiency] = useState<SkillProficiency>('Intermediate');
  const [nameError, setNameError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const isEditing = Boolean(editingSkill);

  useEffect(() => {
    if (!open) return;
    if (editingSkill) {
      setName(editingSkill.name);
      setCategory(normalizeCategoryKey(editingSkill.category));
      setProficiency(normalizeProficiency(editingSkill.proficiency));
    } else {
      setName('');
      setCategory(initialCategory);
      setProficiency('Intermediate');
    }
    setNameError(null);
    setSubmitError(null);
    setSaving(false);
  }, [open, initialCategory, editingSkill]);

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

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (saving) return;

    const trimmedName = name.trim();
    if (!trimmedName) {
      setNameError('Skill name is required.');
      return;
    }
    if (trimmedName.length > 100) {
      setNameError('Skill name must be 100 characters or fewer.');
      return;
    }

    setSaving(true);
    setNameError(null);
    setSubmitError(null);

    try {
      if (editingSkill) {
        const updated = await skillsService.updateSkillRecord(editingSkill.id, {
          name: trimmedName,
          category,
          proficiency,
        });
        if (onUpdated) {
          await onUpdated(updated);
        } else {
          await onCreated(updated);
        }
      } else {
        const created = await skillsService.createSkill({
          name: trimmedName,
          category,
          proficiency,
        });
        await onCreated(created);
      }
      onClose();
    } catch (err) {
      setSubmitError(
        err instanceof Error
          ? err.message
          : 'Unable to save this skill right now. Please try again.',
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 backdrop-blur-[2px] transition-opacity duration-200"
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
        aria-labelledby="add-skill-modal-title"
        className="flex w-full max-w-lg flex-col overflow-hidden rounded-xl border border-[var(--border-medium)] bg-[var(--surface-elevated)] shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4 border-b border-[var(--border-subtle)] px-6 py-4">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--text-secondary)]">
              {isEditing ? 'Edit Skill Entry' : 'New Skill Entry'}
            </p>
            <h2
              id="add-skill-modal-title"
              className="mt-1 font-serif text-2xl text-[var(--text-primary)]"
            >
              {isEditing ? 'Edit Skill' : 'Add Skill'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            aria-label="Close skill dialog"
            className="cursor-pointer rounded-full p-2 text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)] disabled:opacity-50"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate className="flex flex-col">
          <div className="space-y-4 px-6 py-5">
            {submitError && (
              <div
                role="alert"
                className="flex items-start gap-2.5 rounded-lg border border-[var(--danger-border)] bg-[var(--danger-bg)] px-4 py-3 text-xs text-[var(--danger-text)]"
              >
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{submitError}</span>
              </div>
            )}

            <div>
              <label htmlFor="skill-name-input" className={LABEL_CLASS}>
                Skill Name <span className="text-[var(--danger-text)]">*</span>
              </label>
              <input
                id="skill-name-input"
                type="text"
                maxLength={100}
                autoFocus
                disabled={saving}
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (nameError) setNameError(null);
                  if (submitError) setSubmitError(null);
                }}
                placeholder="e.g., Menu Planning, Python, AutoCAD"
                aria-invalid={Boolean(nameError)}
                className={`${INPUT_BASE_CLASS} ${
                  nameError
                    ? 'border-[var(--danger-border)]'
                    : 'border-[var(--border-medium)] focus:border-[var(--text-primary)]'
                }`}
              />
              {nameError && (
                <p className="mt-1 text-xs text-[var(--danger-text)]">{nameError}</p>
              )}
            </div>

            <div>
              <label htmlFor="skill-category-select" className={LABEL_CLASS}>
                Category <span className="text-[var(--danger-text)]">*</span>
              </label>
              <select
                id="skill-category-select"
                disabled={saving}
                value={category}
                onChange={(e) => {
                  setCategory(e.target.value as SkillCategoryKey);
                  if (submitError) setSubmitError(null);
                }}
                className={`${INPUT_BASE_CLASS} cursor-pointer border-[var(--border-medium)] focus:border-[var(--text-primary)]`}
              >
                {SKILL_CATEGORY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="skill-proficiency-select" className={LABEL_CLASS}>
                Proficiency
              </label>
              <select
                id="skill-proficiency-select"
                disabled={saving}
                value={proficiency}
                onChange={(e) => {
                  setProficiency(e.target.value as SkillProficiency);
                  if (submitError) setSubmitError(null);
                }}
                className={`${INPUT_BASE_CLASS} cursor-pointer border-[var(--border-medium)] focus:border-[var(--text-primary)]`}
              >
                {SKILL_PROFICIENCY_OPTIONS.map((level) => (
                  <option key={level} value={level}>
                    {level}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-3 border-t border-[var(--border-subtle)] bg-[var(--bg-secondary)]/30 px-6 py-3.5">
            <PillButton variant="secondary" onClick={onClose} disabled={saving}>
              Cancel
            </PillButton>
            <PillButton type="submit" disabled={saving}>
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Check className="h-4 w-4" />
              )}
              {saving
                ? isEditing
                  ? 'Updating…'
                  : 'Saving…'
                : isEditing
                  ? 'Update Skill'
                  : 'Save Skill'}
            </PillButton>
          </div>
        </form>
      </div>
    </div>
  );
};
