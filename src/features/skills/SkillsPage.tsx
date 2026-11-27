import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Cpu,
  Download,
  Loader2,
  Pencil,
  Plus,
  Sparkles,
  Trash2,
  TrendingUp,
  Users,
  Wrench,
} from 'lucide-react';
import { ErrorState, LoadingState } from '@/design/components/EditorialStates';
import { PillButton } from '@/design/components/PillButton';
import type { ApiClientError } from '@/services/http';
import {
  skillsService,
  type GapAnalysisResponse,
  type SkillBulkCreateResponse,
  type SkillCategoryKey,
  type SkillRecord,
} from '@/services/api/skills.service';
import { AddSkillModal } from './AddSkillModal';
import { ImportSkillsModal } from './ImportSkillsModal';

interface CategorySectionConfig {
  key: SkillCategoryKey;
  title: string;
  subtitle: string;
  emptyText: string;
  icon: React.ComponentType<{ className?: string }>;
}

const CATEGORY_SECTIONS: CategorySectionConfig[] = [
  {
    key: 'technical',
    title: 'Domain & Technical Expertise',
    subtitle: 'Core subject-matter knowledge, specialized capabilities, and foundational methods.',
    emptyText: "No domain or technical skills added yet. Click '+ Add' in this section to get started.",
    icon: Cpu,
  },
  {
    key: 'tool',
    title: 'Tools, Software & Equipment',
    subtitle: 'Instruments, platforms, and operational tools used in your profession.',
    emptyText: "No tools added yet. Click '+ Add' in this section to get started.",
    icon: Wrench,
  },
  {
    key: 'soft',
    title: 'Workplace & Soft Skills',
    subtitle: 'Collaboration, leadership, communication, and organizational strengths.',
    emptyText: "No workplace or soft skills added yet. Click '+ Add' in this section to get started.",
    icon: Users,
  },
];

function resolveCategoryBucket(rawCategory: string): SkillCategoryKey {
  const normalized = rawCategory.trim().toLowerCase();
  if (normalized === 'tool' || normalized === 'tools') return 'tool';
  if (normalized === 'soft' || normalized === 'communication') return 'soft';
  return 'technical';
}

function formatProficiencyLabel(proficiency: string | null): string | null {
  if (!proficiency) return null;
  const trimmed = proficiency.trim();
  if (!trimmed) return null;
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
}

function getProficiencyLevel(proficiency: string | null): number {
  const normalized = (proficiency ?? '').trim().toLowerCase();
  if (normalized === 'beginner') return 1;
  if (normalized === 'intermediate') return 2;
  if (normalized === 'advanced') return 3;
  if (normalized === 'expert') return 4;
  return 0;
}

export const SkillsPage: React.FC = () => {
  const [skills, setSkills] = useState<SkillRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<ApiClientError | Error | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [modalCategory, setModalCategory] = useState<SkillCategoryKey>('technical');
  const [editingSkill, setEditingSkill] = useState<SkillRecord | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [targetRole, setTargetRole] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResults, setAnalysisResults] = useState<GapAnalysisResponse | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [actionBanner, setActionBanner] = useState<{
    tone: 'success' | 'error';
    message: string;
  } | null>(null);

  const loadSkills = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await skillsService.listMySkills({ page: 1, page_size: 200 });
      setSkills(res.items);
    } catch (err) {
      setLoadError(err as ApiClientError | Error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSkills();
  }, [loadSkills]);

  const groupedSkills = useMemo(() => {
    const groups: Record<SkillCategoryKey, SkillRecord[]> = {
      technical: [],
      tool: [],
      soft: [],
    };
    for (const skill of skills) {
      groups[resolveCategoryBucket(skill.category)].push(skill);
    }
    return groups;
  }, [skills]);

  const openAddModal = (category: SkillCategoryKey) => {
    setEditingSkill(null);
    setModalCategory(category);
    setModalOpen(true);
    setActionBanner(null);
  };

  const openEditModal = (skill: SkillRecord) => {
    setEditingSkill(skill);
    setModalCategory(resolveCategoryBucket(skill.category));
    setModalOpen(true);
    setActionBanner(null);
  };

  const handleCreated = async (created: SkillRecord) => {
    await loadSkills();
    setActionBanner({
      tone: 'success',
      message: `Added "${created.name}" to your skills.`,
    });
  };

  const handleUpdated = async (updated: SkillRecord) => {
    await loadSkills();
    setActionBanner({
      tone: 'success',
      message: `Updated "${updated.name}".`,
    });
  };

  const handleImported = async (result: SkillBulkCreateResponse) => {
    await loadSkills();
    const createdCount = result.created.length;
    const skippedCount = result.skipped.length;
    const skippedNote =
      skippedCount > 0 ? ` (${skippedCount} duplicate${skippedCount === 1 ? '' : 's'} skipped)` : '';
    setActionBanner({
      tone: 'success',
      message: `Imported ${createdCount} ${createdCount === 1 ? 'skill' : 'skills'}${skippedNote}.`,
    });
  };

  const handleAnalyze = async () => {
    const trimmedRole = targetRole.trim();
    if (!trimmedRole || isAnalyzing) return;
    setIsAnalyzing(true);
    setAnalysisError(null);
    try {
      const result = await skillsService.analyzeGaps({ target_role: trimmedRole });
      setAnalysisResults(result);
    } catch (err) {
      setAnalysisError(
        err instanceof Error
          ? err.message
          : 'Unable to analyze skill gaps right now. Please try again.',
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleDeleteSkill = async (skill: SkillRecord) => {
    if (deletingId) return;
    setDeletingId(skill.id);
    setActionBanner(null);
    try {
      await skillsService.deleteSkill(skill.id);
      setSkills((prev) => prev.filter((item) => item.id !== skill.id));
      setActionBanner({
        tone: 'success',
        message: `Removed "${skill.name}" from your skills.`,
      });
    } catch (err) {
      setActionBanner({
        tone: 'error',
        message:
          err instanceof Error
            ? err.message
            : 'Unable to remove this skill right now. Please try again.',
      });
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-8 pb-12 sm:px-6">
        <LoadingState label="Loading your skills…" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-8 pb-12 sm:px-6">
        <ErrorState error={loadError} onRetry={() => void loadSkills()} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-8 pb-16 sm:px-6">
      {/* Editorial Header */}
      <header className="flex flex-col gap-5 border-b border-[var(--border-subtle)] pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--text-secondary)]">
            MODULE 07 — SKILLS
          </p>
          <h1 className="mt-2 font-serif text-3xl text-[var(--text-primary)] sm:text-4xl">
            Skills &amp; Expertise
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--text-secondary)]">
            Organize your domain knowledge, tools, and workplace strengths across any field or
            discipline.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <span className="font-mono text-xs text-[var(--text-secondary)]">
            {skills.length} {skills.length === 1 ? 'skill' : 'skills'} total
          </span>
          <PillButton
            variant="secondary"
            size="sm"
            onClick={() => {
              setImportModalOpen(true);
              setActionBanner(null);
            }}
          >
            <Download className="h-3.5 w-3.5" />
            Import Skills
          </PillButton>
        </div>
      </header>

      {/* Action Feedback Banner */}
      {actionBanner && (
        <div
          role={actionBanner.tone === 'error' ? 'alert' : 'status'}
          className={`flex items-center justify-between gap-3 rounded-lg border px-4 py-3 text-sm ${
            actionBanner.tone === 'success'
              ? 'border-[var(--border-accent)] bg-[var(--surface-elevated)] text-[var(--text-primary)]'
              : 'border-[var(--danger-border)] bg-[var(--danger-bg)] text-[var(--danger-text)]'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-[var(--accent)]" />
            <span>{actionBanner.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionBanner(null)}
            className="cursor-pointer font-mono text-[11px] uppercase tracking-[0.1em] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Responsive Workspace Grid: Current Skills Inventory + AI Career Gap Analysis */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_330px] lg:items-start">
        {/* Left Column: Current Skills Inventory */}
        <div className="space-y-5">
          <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
            <h2 className="font-serif text-xl text-[var(--text-primary)]">
              Current Skills Inventory
            </h2>
            <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-[var(--text-secondary)]">
              3 Categories
            </span>
          </div>

          <div className="space-y-6">
            {CATEGORY_SECTIONS.map((section) => {
              const Icon = section.icon;
              const items = groupedSkills[section.key];

              return (
                <section
                  key={section.key}
                  aria-labelledby={`skills-cat-${section.key}`}
                  className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-elevated)] p-5 sm:p-6"
                >
                  <div className="flex flex-col gap-3 border-b border-[var(--border-subtle)] pb-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-muted)] text-[var(--accent)]">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3
                            id={`skills-cat-${section.key}`}
                            className="font-serif text-xl text-[var(--text-primary)]"
                          >
                            {section.title}
                          </h3>
                          <span className="rounded-full border border-[var(--border-subtle)] bg-[var(--surface-muted)] px-2.5 py-0.5 font-mono text-[10px] text-[var(--text-secondary)]">
                            {items.length}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-[var(--text-secondary)]">
                          {section.subtitle}
                        </p>
                      </div>
                    </div>

                    <PillButton
                      variant="secondary"
                      size="sm"
                      onClick={() => openAddModal(section.key)}
                      className="self-start shrink-0"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Add
                    </PillButton>
                  </div>

                  {items.length === 0 ? (
                    <div className="mt-4 rounded-lg border border-dashed border-[var(--border-medium)] bg-[var(--bg-main)]/40 px-4 py-6 text-center">
                      <p className="text-xs text-[var(--text-secondary)]">{section.emptyText}</p>
                    </div>
                  ) : (
                    <ul className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                      {items.map((skill) => {
                        const proficiencyLabel = formatProficiencyLabel(skill.proficiency);
                        const proficiencyLevel = getProficiencyLevel(skill.proficiency);
                        const isDeleting = deletingId === skill.id;

                        return (
                          <li
                            key={skill.id}
                            className="group flex items-center justify-between gap-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-main)] px-4 py-3.5 transition-colors hover:border-[var(--border-medium)]"
                          >
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-semibold text-[var(--text-primary)]">
                                {skill.name}
                              </p>
                              {proficiencyLabel && (
                                <div className="mt-1.5 flex items-center gap-2">
                                  <span
                                    aria-hidden="true"
                                    className="inline-flex items-center gap-1"
                                  >
                                    {[0, 1, 2, 3].map((dotIndex) => (
                                      <span
                                        key={dotIndex}
                                        className={`h-1.5 w-1.5 rounded-full ${
                                          dotIndex < proficiencyLevel
                                            ? 'bg-[var(--accent)]'
                                            : 'bg-[var(--border-medium)]/60'
                                        }`}
                                      />
                                    ))}
                                  </span>
                                  <span className="font-mono text-[11px] font-medium text-[var(--accent)]">
                                    {proficiencyLabel}
                                  </span>
                                </div>
                              )}
                            </div>

                            <div className="flex shrink-0 items-center gap-1">
                              <button
                                type="button"
                                disabled={Boolean(deletingId)}
                                onClick={() => openEditModal(skill)}
                                aria-label={`Edit ${skill.name}`}
                                title={`Edit ${skill.name}`}
                                className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-md text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)] disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                disabled={Boolean(deletingId)}
                                onClick={() => void handleDeleteSkill(skill)}
                                aria-label={`Delete ${skill.name}`}
                                title={`Remove ${skill.name}`}
                                className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-md text-[var(--text-secondary)] transition-colors hover:bg-[var(--danger-bg)] hover:text-[var(--danger-text)] disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                {isDeleting ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <Trash2 className="h-3.5 w-3.5" />
                                )}
                              </button>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </section>
              );
            })}
          </div>
        </div>

        {/* AI Career Gap Analysis Card */}
        <aside
          aria-labelledby="ai-gap-analysis-heading"
          className="relative overflow-hidden rounded-xl border border-[var(--border-accent)] bg-[var(--surface-elevated)] p-6 shadow-[0_0_40px_-18px_rgba(185,154,128,0.45)] lg:sticky lg:top-6"
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-12 -top-12 h-36 w-36 rounded-full bg-[var(--accent)]/15 blur-2xl"
          />

          <div className="relative space-y-4">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[var(--border-accent)] bg-[var(--nav-active-bg)] text-[var(--accent)]">
                <Sparkles className="h-4 w-4" />
              </span>
              <h2
                id="ai-gap-analysis-heading"
                className="font-serif text-2xl text-[var(--text-primary)]"
              >
                AI Career Gap Analysis
              </h2>
            </div>

            {!analysisResults && (
              <p className="text-xs leading-relaxed text-[var(--text-secondary)]">
                Benchmark your current skill profile against a target career role to spot missing
                competencies and next-step recommendations.
              </p>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                void handleAnalyze();
              }}
              className="space-y-3 pt-1"
            >
              <div>
                <label
                  htmlFor="target-role-input"
                  className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--text-secondary)]"
                >
                  Target Role
                </label>
                <input
                  id="target-role-input"
                  type="text"
                  disabled={isAnalyzing}
                  value={targetRole}
                  onChange={(e) => {
                    setTargetRole(e.target.value);
                    if (analysisError) setAnalysisError(null);
                  }}
                  placeholder="e.g., Senior Backend Engineer"
                  className="h-10 w-full rounded-md border border-[var(--border-medium)] bg-[var(--bg-main)] px-3.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]/60 focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30 disabled:cursor-not-allowed disabled:opacity-60"
                />
              </div>

              <button
                type="submit"
                disabled={isAnalyzing || !targetRole.trim()}
                className="inline-flex h-10 w-full cursor-pointer items-center justify-center gap-2 rounded-full border border-[var(--border-accent)] bg-gradient-to-r from-[var(--accent)] via-[#C9AC93] to-[var(--accent)] px-5 text-xs font-semibold tracking-wide text-[#171513] shadow-[0_0_24px_-6px_rgba(185,154,128,0.55)] transition-opacity hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-55"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Analyzing…
                  </>
                ) : (
                  <>
                    <Sparkles className="h-3.5 w-3.5" />
                    Analyze Gaps
                  </>
                )}
              </button>
            </form>

            {analysisError && (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-lg border border-[var(--danger-border)] bg-[var(--danger-bg)] px-3.5 py-2.5 text-xs text-[var(--danger-text)]"
              >
                <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>{analysisError}</span>
              </div>
            )}

            {analysisResults && (
              <div className="space-y-4 border-t border-[var(--border-subtle)] pt-4">
                {/* Match Percentage */}
                <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-main)] p-3.5">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--text-secondary)]">
                      Role Match
                    </span>
                    <span className="font-serif text-2xl font-semibold text-[var(--accent)]">
                      {Math.min(100, Math.max(0, analysisResults.match_percentage))}%
                    </span>
                  </div>
                  <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-[var(--surface-muted)]">
                    <div
                      className="h-full rounded-full bg-[var(--accent)] transition-all duration-500"
                      style={{
                        width: `${Math.min(100, Math.max(0, analysisResults.match_percentage))}%`,
                      }}
                    />
                  </div>
                </div>

                {/* High Priority Missing Skills */}
                <div>
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--text-primary)]">
                      <AlertTriangle className="h-3.5 w-3.5 text-[var(--accent)]" />
                      High Priority
                    </span>
                    <span className="font-mono text-[10px] text-[var(--text-secondary)]">
                      {analysisResults.missing_skills.length}
                    </span>
                  </div>
                  {analysisResults.missing_skills.length === 0 ? (
                    <p className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-main)]/60 px-3 py-2 text-xs text-[var(--text-secondary)]">
                      No high-priority skill gaps identified.
                    </p>
                  ) : (
                    <ul className="space-y-1.5">
                      {analysisResults.missing_skills.map((skill) => (
                        <li
                          key={skill}
                          className="flex items-start gap-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-main)] px-3 py-2 text-xs text-[var(--text-primary)]"
                        >
                          <span
                            aria-hidden="true"
                            className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--accent)]"
                          />
                          <span>{skill}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* Boost Employability Recommendations */}
                <div>
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--text-primary)]">
                      <TrendingUp className="h-3.5 w-3.5 text-[var(--accent)]" />
                      Boost Employability
                    </span>
                    <span className="font-mono text-[10px] text-[var(--text-secondary)]">
                      {analysisResults.recommendations.length}
                    </span>
                  </div>
                  {analysisResults.recommendations.length === 0 ? (
                    <p className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-main)]/60 px-3 py-2 text-xs text-[var(--text-secondary)]">
                      No additional recommendations at this time.
                    </p>
                  ) : (
                    <ul className="space-y-1.5">
                      {analysisResults.recommendations.map((rec) => (
                        <li
                          key={rec}
                          className="flex items-start gap-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-main)] px-3 py-2 text-xs text-[var(--text-secondary)]"
                        >
                          <span
                            aria-hidden="true"
                            className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--border-accent)]"
                          />
                          <span className="text-[var(--text-primary)]">{rec}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            )}
          </div>
        </aside>
      </div>

      <AddSkillModal
        open={modalOpen}
        initialCategory={modalCategory}
        editingSkill={editingSkill}
        onClose={() => {
          setModalOpen(false);
          setEditingSkill(null);
        }}
        onCreated={handleCreated}
        onUpdated={handleUpdated}
      />

      <ImportSkillsModal
        open={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        onImported={handleImported}
      />
    </div>
  );
};
