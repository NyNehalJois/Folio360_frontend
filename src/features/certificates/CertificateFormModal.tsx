import React, { useEffect, useState } from 'react';
import { AlertCircle, Check, Globe, Loader2, Lock, Star, X } from 'lucide-react';
import { PillButton } from '@/design/components/PillButton';
import { certificatesService, skillsService } from '@/services/api';
import type { SkillRecord } from '@/services/api/skills.service';
import type {
  Certificate,
  CertificateCategory,
  CertificateCreate,
  UUID,
  Visibility,
} from '@/types/api';
import { CERTIFICATE_CATEGORY_OPTIONS } from './certificateHelpers';
import { EvidenceDocumentPicker } from './EvidenceDocumentPicker';

interface CertificateFormModalProps {
  open: boolean;
  editingCertificate: Certificate | null;
  onClose: () => void;
  onSaved: (certificate: Certificate, mode: 'create' | 'edit') => void | Promise<void>;
}

const INPUT_CLASS =
  'h-10 w-full rounded-lg border border-[var(--border-medium)] bg-[var(--bg-main)] px-3.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]/60 transition-colors focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30 disabled:cursor-not-allowed disabled:opacity-50';

const LABEL_CLASS =
  'mb-1.5 block font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--text-secondary)]';

export const CertificateFormModal: React.FC<CertificateFormModalProps> = ({
  open,
  editingCertificate,
  onClose,
  onSaved,
}) => {
  const [name, setName] = useState('');
  const [issuer, setIssuer] = useState('');
  const [category, setCategory] = useState<CertificateCategory>('course');
  const [issueDate, setIssueDate] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [credentialId, setCredentialId] = useState('');
  const [verificationUrl, setVerificationUrl] = useState('');
  const [selectedDocIds, setSelectedDocIds] = useState<UUID[]>([]);
  const [selectedSkillIds, setSelectedSkillIds] = useState<UUID[]>([]);
  const [visibility, setVisibility] = useState<Visibility>('private');
  const [featured, setFeatured] = useState(false);
  const [order, setOrder] = useState(0);

  const [availableSkills, setAvailableSkills] = useState<SkillRecord[]>([]);
  const [loadingSkills, setLoadingSkills] = useState(false);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const isEditing = Boolean(editingCertificate);

  useEffect(() => {
    if (!open) return;
    if (editingCertificate) {
      setName(editingCertificate.name);
      setIssuer(editingCertificate.issuer);
      setCategory(editingCertificate.category ?? 'course');
      setIssueDate(editingCertificate.issue_date ?? '');
      setExpiryDate(editingCertificate.expiry_date ?? '');
      setCredentialId(editingCertificate.credential_id ?? '');
      setVerificationUrl(editingCertificate.verification_url ?? '');
      setSelectedDocIds(editingCertificate.document ? [editingCertificate.document.id] : []);
      setSelectedSkillIds((editingCertificate.skills ?? []).map((s) => s.id));
      setVisibility(editingCertificate.visibility ?? 'private');
      setFeatured(Boolean(editingCertificate.featured));
      setOrder(editingCertificate.order ?? 0);
    } else {
      setName('');
      setIssuer('');
      setCategory('course');
      setIssueDate('');
      setExpiryDate('');
      setCredentialId('');
      setVerificationUrl('');
      setSelectedDocIds([]);
      setSelectedSkillIds([]);
      setVisibility('private');
      setFeatured(false);
      setOrder(0);
    }
    setFieldError(null);
    setSubmitError(null);
    setSaving(false);
  }, [open, editingCertificate]);

  useEffect(() => {
    if (!open) return;
    let active = true;
    setLoadingSkills(true);
    skillsService
      .listMySkills({ page: 1, page_size: 200 })
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
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !saving) onClose();
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

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (saving) return;

    const trimmedName = name.trim();
    const trimmedIssuer = issuer.trim();
    const trimmedUrl = verificationUrl.trim();

    if (!trimmedName) {
      setFieldError('Certificate name is required.');
      return;
    }
    if (!trimmedIssuer) {
      setFieldError('Issuing organization is required.');
      return;
    }
    if (issueDate && expiryDate && expiryDate < issueDate) {
      setFieldError('Expiry date cannot be earlier than issue date.');
      return;
    }
    if (trimmedUrl && !/^https?:\/\//i.test(trimmedUrl)) {
      setFieldError('Verification URL must start with http:// or https://.');
      return;
    }

    setSaving(true);
    setFieldError(null);
    setSubmitError(null);

    const payload: CertificateCreate = {
      name: trimmedName,
      issuer: trimmedIssuer,
      category,
      issue_date: issueDate || null,
      expiry_date: expiryDate || null,
      credential_id: credentialId.trim() || null,
      verification_url: trimmedUrl || null,
      document_id: selectedDocIds[0] ?? null,
      skill_ids: selectedSkillIds,
      featured,
      order: Number.isFinite(order) && order >= 0 ? order : 0,
      visibility,
    };

    try {
      const saved = editingCertificate
        ? await certificatesService.update(editingCertificate.id, payload)
        : await certificatesService.create(payload);
      await onSaved(saved, editingCertificate ? 'edit' : 'create');
      onClose();
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : 'Unable to save this certificate right now.',
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
        aria-labelledby="certificate-modal-title"
        className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-[var(--border-medium)] bg-[var(--surface-elevated)] shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4 border-b border-[var(--border-subtle)] px-6 py-4">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--text-secondary)]">
              {isEditing ? 'Update Certificate' : 'New Certificate Entry'}
            </p>
            <h2
              id="certificate-modal-title"
              className="mt-1 font-serif text-2xl text-[var(--text-primary)]"
            >
              {isEditing ? 'Edit Certificate' : 'Add Certificate'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            aria-label="Close certificate modal"
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
                <label htmlFor="cert-name" className={LABEL_CLASS}>
                  Certificate Name <span className="text-[var(--danger-text)]">*</span>
                </label>
                <input
                  id="cert-name"
                  type="text"
                  maxLength={200}
                  disabled={saving}
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (fieldError) setFieldError(null);
                  }}
                  placeholder="e.g., AWS Certified Solutions Architect, ServSafe Manager"
                  className={INPUT_CLASS}
                />
              </div>

              <div>
                <label htmlFor="cert-issuer" className={LABEL_CLASS}>
                  Issuing Organization <span className="text-[var(--danger-text)]">*</span>
                </label>
                <input
                  id="cert-issuer"
                  type="text"
                  maxLength={200}
                  disabled={saving}
                  value={issuer}
                  onChange={(e) => {
                    setIssuer(e.target.value);
                    if (fieldError) setFieldError(null);
                  }}
                  placeholder="e.g., Coursera, AWS, University Board"
                  className={INPUT_CLASS}
                />
              </div>

              <div>
                <label htmlFor="cert-category" className={LABEL_CLASS}>
                  Category
                </label>
                <select
                  id="cert-category"
                  disabled={saving}
                  value={category}
                  onChange={(e) => setCategory(e.target.value as CertificateCategory)}
                  className={`${INPUT_CLASS} cursor-pointer`}
                >
                  {CERTIFICATE_CATEGORY_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="cert-issue-date" className={LABEL_CLASS}>
                  Issue Date
                </label>
                <input
                  id="cert-issue-date"
                  type="date"
                  disabled={saving}
                  value={issueDate}
                  onChange={(e) => setIssueDate(e.target.value)}
                  className={INPUT_CLASS}
                />
              </div>

              <div>
                <label htmlFor="cert-expiry-date" className={LABEL_CLASS}>
                  Expiry Date (Optional)
                </label>
                <input
                  id="cert-expiry-date"
                  type="date"
                  disabled={saving}
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                  className={INPUT_CLASS}
                />
              </div>

              <div>
                <label htmlFor="cert-credential-id" className={LABEL_CLASS}>
                  Credential ID (Optional)
                </label>
                <input
                  id="cert-credential-id"
                  type="text"
                  maxLength={120}
                  disabled={saving}
                  value={credentialId}
                  onChange={(e) => setCredentialId(e.target.value)}
                  placeholder="e.g., CERT-2026-9842"
                  className={INPUT_CLASS}
                />
              </div>

              <div>
                <label htmlFor="cert-verification-url" className={LABEL_CLASS}>
                  Verification URL (Optional)
                </label>
                <input
                  id="cert-verification-url"
                  type="url"
                  maxLength={512}
                  disabled={saving}
                  value={verificationUrl}
                  onChange={(e) => setVerificationUrl(e.target.value)}
                  placeholder="https://..."
                  className={INPUT_CLASS}
                />
              </div>
            </div>

            <EvidenceDocumentPicker
              mode="single"
              selectedIds={selectedDocIds}
              onChange={setSelectedDocIds}
              defaultUploadCategory="certificate"
              disabled={saving}
            />

            {/* Linked Skills */}
            <div className="space-y-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-main)]/70 p-4">
              <p className={LABEL_CLASS}>Linked Skills (Optional)</p>
              {loadingSkills ? (
                <p className="text-xs text-[var(--text-secondary)]">Loading skills…</p>
              ) : availableSkills.length === 0 ? (
                <p className="text-xs text-[var(--text-secondary)]">
                  No skills added yet. Add skills on the Skills page to tag them here.
                </p>
              ) : (
                <div className="flex max-h-28 flex-wrap gap-1.5 overflow-y-auto">
                  {availableSkills.map((skill) => {
                    const active = selectedSkillIds.includes(skill.id);
                    return (
                      <button
                        key={skill.id}
                        type="button"
                        disabled={saving}
                        onClick={() => toggleSkill(skill.id)}
                        className={`cursor-pointer rounded-full border px-3 py-1 text-xs transition-colors ${
                          active
                            ? 'border-[var(--border-accent)] bg-[var(--nav-active-bg)] text-[var(--accent)]'
                            : 'border-[var(--border-subtle)] bg-[var(--surface-elevated)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                        }`}
                      >
                        {skill.name}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

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
                <label htmlFor="cert-order" className={LABEL_CLASS}>
                  Display Order
                </label>
                <input
                  id="cert-order"
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
                  ? 'Update Certificate'
                  : 'Save Certificate'}
            </PillButton>
          </div>
        </form>
      </div>
    </div>
  );
};
