import React, { useState } from 'react';
import { ArrowRight, ArrowUpRight } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/app/AuthContext';
import { PillButton } from '@/design/components/PillButton';
import { StrandCanvas } from '@/design/strands/StrandCanvas';
import { useApiQuery } from '@/hooks/useApiQuery';
import { PublicLayout } from '@/layouts/PublicLayout';
import { publicService } from '@/services/api';

interface PlatformPillar {
  index: string;
  key: string;
  label: string;
  title: string;
  summary: string;
  highlights: string[];
}

const PLATFORM_PILLARS: PlatformPillar[] = [
  {
    index: '01',
    key: 'education',
    label: 'Education',
    title: 'Academic Journey & VTU Records',
    summary:
      'Maintain qualifications across institutions alongside structured VTU 2022 CSE semester records, subject credits, and verified credit-weighted SGPA and CGPA tracking.',
    highlights: [
      'Scheme, branch, and semester curriculum loading',
      'Credit-weighted SGPA and cumulative CGPA history',
      'Private marksheet attachment from your Document Vault',
    ],
  },
  {
    index: '02',
    key: 'projects',
    label: 'Projects',
    title: 'Curated Engineering Portfolio',
    summary:
      'Document every project with problem statements, technology stacks, screenshots, project reports, and authorized GitHub repository metadata.',
    highlights: [
      'Authorized GitHub repository import via OAuth',
      'Independent record-level public or private visibility',
      'Direct linkage to verified skills and vault reports',
    ],
  },
  {
    index: '03',
    key: 'skills',
    label: 'Skills',
    title: 'Grounded Skills Graph',
    summary:
      'Organize languages, frameworks, tools, and communication strengths—connected directly to the projects, certificates, and roles that demonstrate them.',
    highlights: [
      'Catalog-backed technical and non-technical skills',
      'Contextual skill suggestions from existing profile records',
      'Transparent self-reported proficiency labeling',
    ],
  },
  {
    index: '04',
    key: 'experience',
    label: 'Experience',
    title: 'Internships, Work & Leadership',
    summary:
      'Present internships, employment, volunteering, mentorship, and leadership roles on a clean editorial timeline with measurable context.',
    highlights: [
      'Structured role, organization, and duration timelines',
      'Supporting letter or credential attachments',
      'Selective inclusion in resumes and public profiles',
    ],
  },
  {
    index: '05',
    key: 'certificates',
    label: 'Certificates',
    title: 'Credentials & Document Vault',
    summary:
      'Store sensitive marksheets, certificates, and reports in a private-by-default vault with OCR classification and user-confirmed metadata extraction.',
    highlights: [
      'Private object storage with short-lived signed URLs',
      'OCR extraction requiring explicit user confirmation',
      'Clear distinction between self-reported and link-backed credentials',
    ],
  },
  {
    index: '06',
    key: 'more',
    label: 'More',
    title: 'Resume Studio & Selective Sharing',
    summary:
      'Compose editorial PDF resumes, tailor wording to a job description without fabrication, and share your identity via QR or revocable private links.',
    highlights: [
      'Professional PDF builder from your single source of truth',
      'AI-assisted tailoring grounded strictly in saved records',
      'Public profile QR codes and expiring private document bundles',
    ],
  },
];

export const HomePage: React.FC = () => {
  const [activePillarKey, setActivePillarKey] = useState<string>('education');
  const { isAuthenticated } = useAuth();
  const prefersReducedMotion = useReducedMotion();

  const { data: exploreData } = useApiQuery(
    () => publicService.exploreProfiles({ page: 1, page_size: 4 }),
    [],
  );

  const activePillar =
    PLATFORM_PILLARS.find((p) => p.key === activePillarKey) ?? PLATFORM_PILLARS[0];

  const handleStripSelect = (key: string) => {
    setActivePillarKey(key);
    const target = document.getElementById('features');
    target?.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth' });
  };

  return (
    <PublicLayout>
      {/* HERO SECTION — Full-bleed strand canvas across the entire hero viewport */}
      <section className="relative overflow-hidden border-b border-[var(--border-subtle)]">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 h-full w-full opacity-95"
        >
          <StrandCanvas variant="hero" className="h-full w-full" />
        </div>

        <div className="relative z-10 mx-auto flex min-h-[calc(100vh-72px)] max-w-[1320px] flex-col justify-between px-6 pt-16 pb-10 md:px-10 md:pt-24 md:pb-12">
          <motion.div
            initial={prefersReducedMotion ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="max-w-[820px]"
          >
            <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--text-secondary)]">
              A DIGITAL IDENTITY PLATFORM — 001
            </p>

            <h1 className="mt-6 font-serif text-[3.15rem] leading-[1.03] tracking-[-0.015em] text-[var(--text-primary)] sm:text-[4.2rem] lg:text-[4.85rem]">
              Everything you&rsquo;ve built.
              <br />
              <span className="italic font-normal">Everything that makes you.</span>
            </h1>

            <p className="mt-7 max-w-[440px] text-[15px] leading-[1.65] text-[var(--text-secondary)] md:text-base">
              Your education, projects, skills, experiences and achievements&mdash;connected in
              one place.
            </p>

            <div className="mt-9 flex flex-wrap items-center gap-6">
              <PillButton
                to={isAuthenticated ? '/workspace' : '/auth/register'}
                variant="primary"
                size="lg"
              >
                {isAuthenticated ? 'Open your Workspace' : 'Create your Identity'}
                <ArrowUpRight className="h-4 w-4" />
              </PillButton>

              <a
                href="#features"
                className="inline-flex items-center gap-2 text-sm font-medium text-[var(--text-primary)] transition-colors hover:text-[var(--text-secondary)]"
              >
                Explore the Platform
                <ArrowRight className="h-4 w-4" />
              </a>
            </div>
          </motion.div>

          {/* Bottom numbered navigation strip: 01 / Education ... 06 / More */}
          <nav
            aria-label="Platform chapters"
            className="mt-16 grid grid-cols-2 gap-x-6 gap-y-3 border-t border-[var(--border-subtle)] pt-6 sm:grid-cols-3 lg:grid-cols-6"
          >
            {PLATFORM_PILLARS.map((item) => {
              const isSelected = activePillarKey === item.key;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => handleStripSelect(item.key)}
                  className={`group flex items-baseline gap-2 text-left transition-colors cursor-pointer ${
                    isSelected
                      ? 'text-[var(--text-primary)]'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <span className="font-mono text-xs tracking-wider">{item.index}</span>
                  <span className="text-[var(--accent)] font-light select-none">/</span>
                  <span className="text-xs font-medium tracking-wide">{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </section>

      {/* EXPLORE THE PLATFORM — Editorial interactive index (no generic card grid) */}
      <section
        id="features"
        className="border-b border-[var(--border-subtle)] bg-[var(--bg-main)]"
      >
        <div className="mx-auto max-w-[1320px] px-6 py-20 md:px-10 md:py-28">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--text-secondary)]">
                EXPLORE THE PLATFORM
              </p>
              <h2 className="mt-3 font-serif text-4xl leading-tight text-[var(--text-primary)] md:text-5xl">
                One structured record.{' '}
                <span className="italic">Every perspective you need.</span>
              </h2>
            </div>
            <p className="max-w-sm text-sm leading-relaxed text-[var(--text-secondary)]">
              Built for students, graduates, educators, and professionals who want ownership of
              their academic and career history.
            </p>
          </div>

          <div className="mt-14 grid grid-cols-1 gap-12 border-t border-[var(--border-subtle)] pt-12 lg:grid-cols-12">
            {/* Left index list */}
            <div className="lg:col-span-5 flex flex-col divide-y divide-[var(--border-subtle)] border-b border-[var(--border-subtle)] lg:border-b-0">
              {PLATFORM_PILLARS.map((pillar) => {
                const active = pillar.key === activePillarKey;
                return (
                  <button
                    key={pillar.key}
                    type="button"
                    onClick={() => setActivePillarKey(pillar.key)}
                    className={`flex items-center justify-between py-4 px-2 text-left transition-colors cursor-pointer ${
                      active
                        ? 'text-[var(--text-primary)]'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    <span className="flex items-baseline gap-4">
                      <span className="font-mono text-xs text-[var(--accent)]">
                        {pillar.index}
                      </span>
                      <span
                        className={`font-serif text-2xl ${active ? 'italic' : ''}`}
                      >
                        {pillar.label}
                      </span>
                    </span>
                    <ArrowRight
                      className={`h-4 w-4 transition-transform duration-200 ${
                        active ? 'translate-x-0.5 text-[var(--text-primary)]' : 'opacity-40'
                      }`}
                    />
                  </button>
                );
              })}
            </div>

            {/* Right editorial detail panel */}
            <div className="lg:col-span-7 flex flex-col justify-between rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-secondary)]/55 p-8 md:p-10">
              <div>
                <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-4">
                  <span className="font-mono text-xs uppercase tracking-[0.16em] text-[var(--text-secondary)]">
                    CHAPTER {activePillar.index} — {activePillar.label}
                  </span>
                  <span className="font-mono text-xs text-[var(--accent)]">Folio360</span>
                </div>

                <h3 className="mt-7 font-serif text-3xl text-[var(--text-primary)] md:text-4xl">
                  {activePillar.title}
                </h3>

                <p className="mt-4 text-sm leading-[1.7] text-[var(--text-secondary)] md:text-[15px]">
                  {activePillar.summary}
                </p>

                <ul className="mt-8 space-y-3 border-t border-[var(--border-subtle)] pt-6">
                  {activePillar.highlights.map((line) => (
                    <li
                      key={line}
                      className="flex items-start gap-3 text-sm text-[var(--text-primary)]"
                    >
                      <span className="mt-2 h-1 w-4 shrink-0 bg-[var(--accent)]" />
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-10 flex items-center justify-between pt-4">
                <span className="font-mono text-xs text-[var(--text-secondary)]">
                  Private by default · Selective sharing
                </span>
                <PillButton
                  to={isAuthenticated ? '/workspace' : '/auth/register'}
                  variant="secondary"
                  size="sm"
                >
                  Open in Workspace
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </PillButton>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section
        id="how-it-works"
        className="border-b border-[var(--border-subtle)] bg-[var(--bg-secondary)]/40"
      >
        <div className="mx-auto max-w-[1320px] px-6 py-20 md:px-10 md:py-24">
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--text-secondary)]">
            HOW IT WORKS
          </p>
          <h2 className="mt-3 font-serif text-4xl text-[var(--text-primary)]">
            From scattered records to one calm identity.
          </h2>

          <div className="mt-12 grid grid-cols-1 gap-8 border-t border-[var(--border-subtle)] pt-10 md:grid-cols-3">
            {[
              {
                step: '01',
                title: 'Centralize & verify',
                body: 'Add education, VTU semester results, projects, skills, and documents into a private workspace where you review every OCR extraction.',
              },
              {
                step: '02',
                title: 'Compose & tailor',
                body: 'Build clean PDF resumes directly from your saved profile or tailor wording for a specific role without inventing experience.',
              },
              {
                step: '03',
                title: 'Share on your terms',
                body: 'Publish an editorial public profile with a QR code, or issue expiring, revocable links for private marksheets and files.',
              },
            ].map((item) => (
              <div key={item.step} className="flex flex-col gap-3">
                <span className="font-mono text-xs text-[var(--accent)]">{item.step}</span>
                <h3 className="font-serif text-2xl text-[var(--text-primary)]">{item.title}</h3>
                <p className="text-sm leading-relaxed text-[var(--text-secondary)]">
                  {item.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* EXPLORE PUBLIC PROFILES */}
      <section id="explore" className="bg-[var(--bg-main)]">
        <div className="mx-auto max-w-[1320px] px-6 py-20 md:px-10 md:py-24">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--text-secondary)]">
                PUBLIC PORTFOLIOS
              </p>
              <h2 className="mt-3 font-serif text-4xl text-[var(--text-primary)]">
                Editorial profiles, <span className="italic">owned by the individual.</span>
              </h2>
            </div>
            <Link
              to="/workspace/sharing"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--text-primary)] hover:text-[var(--text-secondary)]"
            >
              Configure your public link
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="mt-10 divide-y divide-[var(--border-subtle)] border-y border-[var(--border-subtle)]">
            {(exploreData?.items ?? []).map((person) => (
              <div
                key={person.slug}
                className="flex flex-col gap-4 py-6 md:flex-row md:items-center md:justify-between"
              >
                <div>
                  <div className="flex items-baseline gap-3">
                    <span className="font-serif text-2xl text-[var(--text-primary)]">
                      {person.full_name}
                    </span>
                    <span className="font-mono text-xs text-[var(--text-secondary)]">
                      folio360.in/{person.slug}
                    </span>
                  </div>
                  {person.headline && (
                    <p className="mt-1 text-sm text-[var(--text-secondary)]">{person.headline}</p>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {person.top_skills.slice(0, 4).map((skill) => (
                    <span
                      key={skill}
                      className="rounded-full border border-[var(--border-subtle)] bg-[var(--bg-secondary)] px-3 py-1 font-mono text-[11px] text-[var(--text-secondary)]"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </PublicLayout>
  );
};
