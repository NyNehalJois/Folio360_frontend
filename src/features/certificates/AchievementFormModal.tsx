import React, { useEffect, useState } from 'react';
import { AlertCircle, Check, Globe, Loader2, Lock, Star, X } from 'lucide-react';
import { PillButton } from '@/design/components/PillButton';
import { achievementsService } from '@/services/api';
import type {
  Achievement,
  AchievementCategory,
  AchievementCreate,
  UUID,
  Visibility,
} from '@/types/api';
import { ACHIEVEMENT_CATEGORY_OPTIONS } from './certificateHelpers';
import { EvidenceDocumentPicker } from './EvidenceDocumentPicker';

interface AchievementFormModalProps {
  open: boolean;
  editingAchievement: Achievement | null;
  onClose: () => void;
  onSaved: (achievement: Achievement, mode: 'create' | 'edit') => void | Promise<void>;
}

const INPUT_CLASS =
  'h-10 w-full rounded-lg border border-[var(--border-medium)] bg-[var(--bg-main)] px-3.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]/60 transition-colors focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30 disabled:cursor-not-allowed disabled:opacity-50';

const LABEL_CLASS =
  'mb-1.5 block font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--text-secondary)]';

export const AchievementFormModal: React.FC<AchievementFormModalProps> = ({
  open,
  editingAchievement,
  onClose,
  onSaved,
}) => {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<AchievementCategory>('award');
  const [organization, setOrganization] = useState('');
  const [date, setDate] = useState('');
  const [description, setDescription] = useState('');
  const [selectedDocIds, setSelectedDocIds] = useState<UUID[]>([]);
  const [visibility, setVisibility] = useState<Visibility>('private');
  const [featured, setFeatured] = useState(false);
  const [order, setOrder] = useState(0);

  const [fieldError, setFieldError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const isEditing = Boolean(editingAchievement);

  useEffect(() => {
    if (!open) return;
    if (editingAchievement) {
      setTitle(editingAchievement.title);
      setCategory(editingAchievement.category ?? 'award');
      setOrganization(editingAchievement.organization ?? '');
      setDate(editingAchievement.date ?? '');
      setDescription(editingAchievement.description ?? '');
      setSelectedDocIds((editingAchievement.documents ?? []).map((d) => d.id));
      setVisibility(editingAchievement.visibility ?? 'private');
      setFeatured(Boolean(editingAchievement.featured));
      setOrder(editingAchievement.order ?? 0);
    } else {
      setTitle('');
      setCategory('award');
      setOrganization('');
      setDate('');
      setDescription('');
      setSelectedDocIds([]);
      setVisibility('private');
      setFeatured(false);
      setOrder(0);
    }
    setFieldError(null);
    setSubmitError(null);
    setSaving(false);
  }, [open, editingAchievement]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !saving) onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, saving, onClose]);

  if (!open) return null;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (saving) return;

    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setFieldError('Achievement title is required.');
      return;
    }

    setSaving(true);
    setFieldError(null);
    setSubmitError(null);

    const payload: AchievementCreate = {
      title: trimmedTitle,
      category,
      organization: organization.trim() || null,
      date: date || null,
      description: description.trim() || undefined,
      document_ids: selectedDocIds,
      featured,
      order: Number.isFinite(order) && order >= 0 ? order : 0,
      visibility,
    };

    try {
      const saved = editingAchievement
        ? await achievementsService.update(editingAchievement.id, payload)
        : await achievementsService.create(payload);
      await onSaved(saved, editingAchievement ? 'edit' : 'create');
      onClose();
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : 'Unable to save this achievement right now.',
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 backdrop-blur-[2px]"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget && !saving) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="achievement-modal-title"
        className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-[var(--border-medium)] bg-[var(--surface-elevated)] shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4 border-b border-[var(--border-subtle)] px-6 py-4">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--text-secondary)]">
              {isEditing ? 'Update Achievement' : 'New Achievement Entry'}
            </p>
            <h2
              id="achievement-modal-title"
              className="mt-1 font-serif text-2xl text-[var(--text-primary)]"
            >
              {isEditing ? 'Edit Achievement' : 'Add Achievement'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            aria-label="Close achievement modal"
            className="cursor-pointer rounded-full p-2 text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)] disabled:opacity-50"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate className="flex min-h-0 flex-1 flex-col">
          <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
            {(fieldError || submitError) && (
              <div
                role="alert"
                className="flex items-start gap-2.5 rounded-lg border border-[var(--danger-border)] bg-[var(--danger-bg)] px-4 py-3 text-xs text-[var(--danger-text)]"
              >
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{fieldError || submitError}</span>
              </div>
            )}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label htmlFor="ach-title" className={LABEL_CLASS}>
                  Achievement Title <span className="text-[var(--danger-text)]">*</span>
                </label>
                <input
                  id="ach-title"
                  type="text"
                  maxLength={200}
                  disabled={saving}
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    if (fieldError) setFieldError(null);
                  }}
                  placeholder="e.g., 1st Place National Hackathon, Dean's List Distinction"
                  className={INPUT_CLASS}
                />
              </div>

              <div>
                <label htmlFor="ach-category" className={LABEL_CLASS}>
                  Category
                </label>
                <select
                  id="ach-category"
                  disabled={saving}
                  value={category}
                  onChange={(e) => setCategory(e.target.value as AchievementCategory)}
                  className={`${INPUT_CLASS} cursor-pointer`}
                >
                  {ACHIEVEMENT_CATEGORY_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="ach-date" className={LABEL_CLASS}>
                  Date (Optional)
                </label>
                <input
                  id="ach-date"
                  type="date"
                  disabled={saving}
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className={INPUT_CLASS}
                />
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="ach-org" className={LABEL_CLASS}>
                  Organization / Event (Optional)
                </label>
                <input
                  id="ach-org"
                  type="text"
                  maxLength={200}
                  disabled={saving}
                  value={organization}
                  onChange={(e) => setOrganization(e.target.value)}
                  placeholder="e.g., IEEE, University Senate, National Culinary Guild"
                  className={INPUT_CLASS}
                />
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="ach-desc" className={LABEL_CLASS}>
                  Description (Optional)
                </label>
                <textarea
                  id="ach-desc"
                  rows={3}
                  maxLength={5000}
                  disabled={saving}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Highlight context, impact, ranking, or selection criteria…"
                  className="w-full rounded-lg border border-[var(--border-medium)] bg-[var(--bg-main)] px-3.5 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]/60 focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30 disabled:opacity-50"
                />
              </div>
            </div>

            <EvidenceDocumentPicker
              mode="multiple"
              selectedIds={selectedDocIds}
              onChange={setSelectedDocIds}
              defaultUploadCategory="certificate"
              disabled={saving}
            />

            {/* Visibility, Featured, Order */}
            <div className="grid grid-cols-1 gap-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-main)]/70 p-4 sm:grid-cols-3">
              <div>
                <span className={LABEL_CLASS}>Visibility</span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => setVisibility('private')}
                    className={`inline-flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-lg border px-2.5 py-2 text-xs ${
                      visibility === 'private'
                        ? 'border-[var(--border-accent)] bg-[var(--nav-active-bg)] text-[var(--text-primary)]'
                        : 'border-[var(--border-subtle)] text-[var(--text-secondary)]'
                    }`}
                  >
                    <Lock className="h-3.5 w-3.5" />
                    Private
                  </button>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => setVisibility('public')}
                    className={`inline-flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-lg border px-2.5 py-2 text-xs ${
                      visibility === 'public'
                        ? 'border-[var(--border-accent)] bg-[var(--nav-active-bg)] text-[var(--text-primary)]'
                        : 'border-[var(--border-subtle)] text-[var(--text-secondary)]'
                    }`}
                  >
                    <Globe className="h-3.5 w-3.5" />
                    Public
                  </button>
                </div>
              </div>

              <div>
                <span className={LABEL_CLASS}>Featured</span>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => setFeatured((prev) => !prev)}
                  className={`inline-flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-xs ${
                    featured
                      ? 'border-[var(--border-accent)] bg-[var(--nav-active-bg)] text-[var(--accent)]'
                      : 'border-[var(--border-subtle)] text-[var(--text-secondary)]'
                  }`}
                >
                  <Star className={`h-3.5 w-3.5 ${featured ? 'fill-current' : ''}`} />
                  {featured ? 'Featured' : 'Standard'}
                </button>
              </div>

              <div>
                <label htmlFor="ach-order" className={LABEL_CLASS}>
                  Display Order
                </label>
                <input
                  id="ach-order"
                  type="number"
                  min={0}
                  disabled={saving}
                  value={order}
                  onChange={(e) => setOrder(Math.max(0, Number(e.target.value) || 0))}
                  className={INPUT_CLASS}
                />
              </div>
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
                  ? 'Update Achievement'
                  : 'Save Achievement'}
            </PillButton>
          </div>
        </form>
      </div>
    </div>
  );
};
