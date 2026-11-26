import React, { useMemo, useState } from 'react';
import {
  ArrowLeft,
  ExternalLink,
  FileText,
  Globe,
  Lock,
  Mail,
  MapPin,
  Phone,
} from 'lucide-react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { useAuth } from '@/app/AuthContext';
import { FolioLogo } from '@/design/components/FolioLogo';
import { LoadingState } from '@/design/components/EditorialStates';
import { PillButton } from '@/design/components/PillButton';
import { ThemeToggle } from '@/design/components/ThemeToggle';
import { UnderlineTabs, type UnderlineTabItem } from '@/design/components/UnderlineTabs';
import { StrandCanvas } from '@/design/strands/StrandCanvas';
import { formatEducationPeriod, getEducationLevelLabel } from '@/features/education/educationHelpers';
import { useApiQuery } from '@/hooks/useApiQuery';
import { publicService } from '@/services/api';
import { ApiClientError } from '@/services/http';

type ProfileTabKey =
  | 'overview'
  | 'education'
  | 'projects'
  | 'skills'
  | 'certificates'
  | 'experience';

export const PublicProfilePage: React.FC = () => {
  const { handle, slug: explicitSlug } = useParams<{ handle?: string; slug?: string }>();
  const { isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState<ProfileTabKey>('overview');

  // Supports both `/@username` (via `/:handle`) and `/u/:slug`
  const resolvedSlug = useMemo(() => {
    if (explicitSlug) return explicitSlug;
    if (handle && handle.startsWith('@')) return handle.slice(1);
    return null;
  }, [explicitSlug, handle]);

  const { data: profile, loading, error } = useApiQuery(
    async () => {
      if (!resolvedSlug) {
        throw new ApiClientError(404, 'NOT_FOUND', 'Profile not found.');
      }
      return publicService.getProfile(resolvedSlug);
    },
    [resolvedSlug],
  );

  // Non-`@` unknown top-level paths fall back cleanly to home
  if (!resolvedSlug) {
    return <Navigate to="/" replace />;
  }

  const tabs: UnderlineTabItem<ProfileTabKey>[] = useMemo(() => {
    if (!profile) return [{ key: 'overview', label: 'Overview' }];
    const items: UnderlineTabItem<ProfileTabKey>[] = [{ key: 'overview', label: 'Overview' }];
    if (profile.sections.education) items.push({ key: 'education', label: 'Education' });
    if (profile.sections.projects) items.push({ key: 'projects', label: 'Projects' });
    if (profile.sections.skills) items.push({ key: 'skills', label: 'Skills' });
    if (profile.sections.certificates) items.push({ key: 'certificates', label: 'Certificates' });
    if (profile.sections.experience) items.push({ key: 'experience', label: 'Experience' });
    return items;
  }, [profile]);

  const effectiveTab = tabs.some((t) => t.key === activeTab) ? activeTab : 'overview';

  return (
    <div className="relative min-h-screen flex flex-col bg-[var(--bg-main)] text-[var(--text-primary)] overflow-hidden">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full opacity-55">
        <StrandCanvas variant="subtle" className="h-full w-full" />
      </div>

      {/* Editorial Header */}
      <header className="relative z-10 border-b border-[var(--border-subtle)] bg-[var(--bg-main)]/90 backdrop-blur-xs">
        <div className="mx-auto flex h-[68px] max-w-[1120px] items-center justify-between px-6 md:px-10">
          <FolioLogo to="/" size="sm" />

          <div className="flex items-center gap-3">
            <span className="hidden sm:inline-block rounded-full border border-[var(--border-subtle)] bg-[var(--bg-secondary)] px-3 py-1 font-mono text-[11px] text-[var(--text-secondary)]">
              folio360.in/@{resolvedSlug}
            </span>
            <ThemeToggle />
            {isAuthenticated && (
              <PillButton to="/workspace/profile" variant="secondary" size="sm">
                <ArrowLeft className="h-3.5 w-3.5" />
                Edit Profile
              </PillButton>
            )}
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto w-full max-w-[1120px] flex-1 px-6 py-10 md:px-10 md:py-14">
        {loading ? (
          <LoadingState label="Loading public profile" />
        ) : error || !profile ? (
          <div className="mx-auto max-w-md rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-main)]/95 p-8 text-center">
            <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full border border-[var(--border-medium)] bg-[var(--bg-secondary)]">
              <Lock className="h-4 w-4 text-[var(--text-secondary)]" />
            </div>
            <h1 className="mt-4 font-serif text-3xl text-[var(--text-primary)]">
              Profile unavailable
            </h1>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              This Folio360 public profile is disabled or does not exist.
            </p>
            <div className="mt-6 flex justify-center gap-3">
              <PillButton to="/" variant="secondary" size="sm">
                Back to Home
              </PillButton>
              {isAuthenticated && (
                <PillButton to="/workspace/profile" variant="primary" size="sm">
                  Profile Settings
                </PillButton>
              )}
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-main)]/95 p-6 sm:p-10 backdrop-blur-xs">
            {/* Profile Hero Header — inspired by Image 2 */}
            <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
                <div className="h-28 w-28 sm:h-32 sm:w-32 shrink-0 overflow-hidden rounded-xl border border-[var(--border-medium)] bg-[var(--bg-secondary)]">
                  {profile.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt={`${profile.full_name} portrait`}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <StrandCanvas variant="dashboard-card" className="h-full w-full" />
                  )}
                </div>

                <div>
                  <p className="font-mono text-[11px] text-[var(--text-secondary)]">
                    /@{profile.slug}
                  </p>
                  <h1 className="mt-1 font-serif text-4xl leading-tight text-[var(--text-primary)]">
                    {profile.full_name}
                  </h1>
                  {profile.headline && (
                    <p className="mt-1.5 text-sm text-[var(--text-secondary)]">
                      {profile.headline}
                    </p>
                  )}

                  <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-[var(--text-secondary)]">
                    {profile.location && (
                      <span className="inline-flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5 text-[var(--accent)]" />
                        {profile.location}
                      </span>
                    )}
                    {profile.phone && (
                      <span className="inline-flex items-center gap-1.5">
                        <Phone className="h-3.5 w-3.5 text-[var(--accent)]" />
                        {profile.phone}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Public Links & Contact */}
              <div className="flex flex-wrap items-center gap-2">
                {profile.links.github && (
                  <a
                    href={profile.links.github}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="GitHub profile"
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--border-medium)] text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]"
                  >
                    <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
                      <path
                        fill="currentColor"
                        d="M12 2C6.48 2 2 6.58 2 12.23c0 4.52 2.87 8.35 6.84 9.7.5.1.68-.22.68-.49 0-.24-.01-1.05-.01-1.91-2.78.62-3.37-1.21-3.37-1.21-.45-1.18-1.11-1.49-1.11-1.49-.91-.64.07-.63.07-.63 1 .07 1.53 1.05 1.53 1.05.9 1.57 2.35 1.12 2.92.85.09-.66.35-1.12.64-1.38-2.22-.26-4.56-1.14-4.56-5.07 0-1.12.39-2.04 1.03-2.76-.1-.26-.45-1.31.1-2.72 0 0 .84-.27 2.75 1.05A9.3 9.3 0 0 1 12 6.84c.85 0 1.71.12 2.51.35 1.91-1.32 2.75-1.05 2.75-1.05.55 1.41.2 2.46.1 2.72.64.72 1.03 1.64 1.03 2.76 0 3.94-2.34 4.81-4.57 5.06.36.32.68.94.68 1.9 0 1.37-.01 2.47-.01 2.81 0 .27.18.59.69.49A10.22 10.22 0 0 0 22 12.23C22 6.58 17.52 2 12 2Z"
                      />
                    </svg>
                  </a>
                )}
                {profile.links.linkedin && (
                  <a
                    href={profile.links.linkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="LinkedIn profile"
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--border-medium)] text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]"
                  >
                    <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
                      <path
                        fill="currentColor"
                        d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77Z"
                      />
                    </svg>
                  </a>
                )}
                {profile.links.website && (
                  <a
                    href={profile.links.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Personal website"
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--border-medium)] text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]"
                  >
                    <Globe className="h-4 w-4" />
                  </a>
                )}
                {profile.contact_email && (
                  <a
                    href={`mailto:${profile.contact_email}`}
                    className="inline-flex h-9 items-center gap-2 rounded-full bg-[var(--btn-primary-bg)] px-4 text-xs font-medium text-[var(--btn-primary-text)] hover:bg-[var(--btn-primary-hover)]"
                  >
                    <Mail className="h-3.5 w-3.5" />
                    Contact
                  </a>
                )}
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="mt-8">
              <UnderlineTabs items={tabs} activeKey={effectiveTab} onChange={setActiveTab} />
            </div>

            {/* Tab Panels */}
            <div className="mt-8">
              {effectiveTab === 'overview' && (
                <div className="space-y-8">
                  <div>
                    <h2 className="font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--text-secondary)]">
                      ABOUT
                    </h2>
                    <p className="mt-3 max-w-2xl text-sm leading-[1.75] text-[var(--text-primary)]">
                      {profile.bio || 'No biography provided yet.'}
                    </p>
                  </div>

                  {profile.links.other.length > 0 && (
                    <div className="border-t border-[var(--border-subtle)] pt-6">
                      <h2 className="font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--text-secondary)]">
                        LINKS
                      </h2>
                      <div className="mt-3 flex flex-wrap gap-2.5">
                        {profile.links.other.map((item, idx) => (
                          <a
                            key={`${item.label}-${idx}`}
                            href={item.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border-medium)] px-3.5 py-1.5 text-xs text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]"
                          >
                            {item.label}
                            <ExternalLink className="h-3 w-3 text-[var(--text-secondary)]" />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {effectiveTab === 'education' && (
                <div className="divide-y divide-[var(--border-subtle)]">
                  {(profile.sections.education ?? []).length === 0 ? (
                    <p className="py-6 text-sm text-[var(--text-secondary)]">
                      No public education records shared yet.
                    </p>
                  ) : (
                    (profile.sections.education ?? []).map((edu, idx) => {
                      const period = formatEducationPeriod(edu);
                      const location = [edu.state, edu.country].filter(Boolean).join(', ');
                      return (
                        <div key={idx} className="py-5">
                          <div className="flex flex-wrap items-baseline justify-between gap-2">
                            <p className="font-serif text-xl text-[var(--text-primary)]">
                              {edu.degree}
                              {edu.branch ? ` · ${edu.branch}` : ''}
                            </p>
                            <span className="font-mono text-xs text-[var(--text-secondary)]">
                              {period}
                            </span>
                          </div>
                          <p className="mt-1 text-sm font-medium text-[var(--text-primary)]">
                            {edu.institution}
                          </p>
                          {(edu.university_or_board || edu.education_level || location) && (
                            <p className="mt-1 text-xs text-[var(--text-secondary)]">
                              {[
                                edu.university_or_board,
                                edu.education_level
                                  ? getEducationLevelLabel(edu.education_level)
                                  : null,
                                location || null,
                              ]
                                .filter(Boolean)
                                .join(' · ')}
                            </p>
                          )}
                          {edu.specialization && (
                            <p className="mt-1.5 text-xs text-[var(--text-secondary)]">
                              Specialization: {edu.specialization}
                            </p>
                          )}
                          {edu.description && (
                            <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-[var(--text-secondary)]">
                              {edu.description}
                            </p>
                          )}
                          {edu.documents && edu.documents.length > 0 && (
                            <div className="mt-3 flex flex-wrap gap-2">
                              {edu.documents.map((doc) => (
                                <span
                                  key={doc.id}
                                  className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border-subtle)] bg-[var(--surface-muted)] px-3 py-1 text-xs text-[var(--text-primary)]"
                                >
                                  <FileText className="h-3 w-3 text-[var(--text-secondary)]" />
                                  <span>{doc.title}</span>
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}

                  {profile.sections.education_documents &&
                    profile.sections.education_documents.length > 0 && (
                      <div className="py-5">
                        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--text-secondary)]">
                          Selected Academic Documents
                        </p>
                        <ul className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                          {profile.sections.education_documents.map((doc) => (
                            <li
                              key={doc.id}
                              className="flex items-center gap-2.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-elevated)] px-3.5 py-2.5 text-xs"
                            >
                              <FileText className="h-3.5 w-3.5 shrink-0 text-[var(--text-secondary)]" />
                              <span className="truncate font-medium text-[var(--text-primary)]">
                                {doc.title}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                </div>
              )}

              {effectiveTab === 'projects' && (
                <div className="divide-y divide-[var(--border-subtle)]">
                  {(profile.sections.projects ?? []).map((proj, idx) => (
                    <div key={idx} className="py-4">
                      <p className="font-serif text-xl text-[var(--text-primary)]">{proj.title}</p>
                      <p className="mt-1 text-sm text-[var(--text-secondary)]">{proj.summary}</p>
                      <div className="mt-2.5 flex flex-wrap gap-1.5">
                        {proj.technologies.map((tech) => (
                          <span
                            key={tech}
                            className="rounded-full border border-[var(--border-subtle)] bg-[var(--bg-secondary)] px-2.5 py-0.5 font-mono text-[11px] text-[var(--text-secondary)]"
                          >
                            {tech}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {effectiveTab === 'skills' && (
                <div className="flex flex-wrap gap-2">
                  {(profile.sections.skills ?? []).map((sk, idx) => (
                    <span
                      key={idx}
                      className="rounded-full border border-[var(--border-subtle)] bg-[var(--bg-secondary)] px-3.5 py-1.5 text-xs text-[var(--text-primary)]"
                    >
                      {sk.name}
                    </span>
                  ))}
                </div>
              )}

              {effectiveTab === 'certificates' && (
                <div className="divide-y divide-[var(--border-subtle)]">
                  {(profile.sections.certificates ?? []).map((cert, idx) => (
                    <div key={idx} className="py-4">
                      <p className="font-serif text-xl text-[var(--text-primary)]">{cert.name}</p>
                      <p className="mt-1 text-xs text-[var(--text-secondary)]">
                        {cert.issuer}
                        {cert.issue_date ? ` · ${cert.issue_date}` : ''}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {effectiveTab === 'experience' && (
                <div className="divide-y divide-[var(--border-subtle)]">
                  {(profile.sections.experience ?? []).map((exp, idx) => (
                    <div key={idx} className="py-4">
                      <p className="font-serif text-xl text-[var(--text-primary)]">
                        {exp.role} — {exp.organization}
                      </p>
                      <p className="mt-1 font-mono text-[11px] text-[var(--text-secondary)]">
                        {exp.start_date} – {exp.is_current ? 'Present' : exp.end_date ?? ''}
                      </p>
                      {exp.description && (
                        <p className="mt-2 text-sm text-[var(--text-secondary)]">
                          {exp.description}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {isAuthenticated && (
              <div className="mt-10 border-t border-[var(--border-subtle)] pt-5 flex items-center justify-between text-xs text-[var(--text-secondary)]">
                <span>Private Vault documents are never shown on public profiles.</span>
                <Link to="/workspace/profile" className="underline text-[var(--text-primary)]">
                  Manage visibility
                </Link>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};
