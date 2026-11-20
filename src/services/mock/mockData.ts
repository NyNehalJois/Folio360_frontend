import type {
  ActivityEvent,
  Certificate,
  Completeness,
  CurrentUser,
  DashboardSummary,
  Document,
  Education,
  Experience,
  Preferences,
  Profile,
  Project,
  PublicProfile,
  PublicSettings,
  ResumeSummary,
  ShareLink,
  UserSkill,
} from '@/types/api';

export const MOCK_USER: CurrentUser = {
  id: '3c7e5d20-1b1b-4a34-8d6a-0a1b2c3d4e01',
  email: 'demo@example.com',
  email_verified: true,
  full_name: 'Alex Mercer',
  slug: 'alex_mercer',
  avatar_url: null,
  has_password: true,
  linked_providers: ['github'],
  created_at: '2026-09-01T08:30:00Z',
};

export const MOCK_PROFILE: Profile = {
  user_id: MOCK_USER.id,
  slug: 'alex_mercer',
  public_url: 'https://folio360.in/@alex_mercer',
  full_name: 'Alex Mercer',
  headline: 'CSE Student · Developer · Systems & Design',
  bio: 'Computer Science student passionate about building scalable systems, clean editorial interfaces, and meaningful digital products.',
  avatar_url: null,
  location: 'Bengaluru, IN',
  contact_email: 'demo@example.com',
  phone: null,
  website: 'https://folio360.in/@alex_mercer',
  links: {
    linkedin: 'https://linkedin.com/in/alex-mercer-demo',
    github: 'https://github.com/example-user',
    other: [],
  },
  interests: ['Distributed Systems', 'Human-Centered UI', 'Developer Tooling'],
  updated_at: '2026-11-16T18:10:00Z',
};

export const MOCK_PREFERENCES: Preferences = {
  theme: 'light',
};

export const MOCK_VISIBILITY: PublicSettings = {
  public_enabled: true,
  discoverable: true,
  public_sections: {
    education: true,
    projects: true,
    skills: true,
    certificates: true,
    experience: true,
    achievements: true,
    academics_cgpa: false,
  },
  public_contact: {
    show_email: false,
    show_phone: false,
    show_location: true,
  },
};

export const MOCK_COMPLETENESS: Completeness = {
  percent: 78,
  items: [
    {
      key: 'profile_bio',
      label: 'Add headline & biography',
      done: true,
      weight: 20,
      action_route: '/workspace/profile',
    },
    {
      key: 'education_records',
      label: 'Add semester records',
      done: false,
      weight: 12,
      action_route: '/workspace/education',
    },
    {
      key: 'projects_update',
      label: 'Update your projects',
      done: false,
      weight: 5,
      action_route: '/workspace/projects',
    },
    {
      key: 'resume_generated',
      label: 'Generate your resume',
      done: false,
      weight: 5,
      action_route: '/workspace/resumes',
    },
    {
      key: 'skills_added',
      label: 'Add core technical skills',
      done: true,
      weight: 20,
      action_route: '/workspace/skills',
    },
    {
      key: 'documents_vault',
      label: 'Upload supporting documents',
      done: true,
      weight: 20,
      action_route: '/workspace/documents',
    },
    {
      key: 'experience_added',
      label: 'Document internships or leadership',
      done: true,
      weight: 18,
      action_route: '/workspace/experience',
    },
  ],
};

export const MOCK_ACTIVITY: ActivityEvent[] = [
  {
    id: 'a1000000-0000-4000-8000-000000000001',
    verb: 'updated',
    entity_type: 'project',
    entity_id: 'b2000000-0000-4000-8000-000000000001',
    label: 'Folio360 — Digital Identity Platform',
    created_at: '2026-11-17T03:45:00Z',
  },
  {
    id: 'a1000000-0000-4000-8000-000000000002',
    verb: 'uploaded',
    entity_type: 'document',
    entity_id: 'd4000000-0000-4000-8000-000000000001',
    label: 'Semester V Provisional Marksheet.pdf',
    created_at: '2026-11-16T14:20:00Z',
  },
  {
    id: 'a1000000-0000-4000-8000-000000000003',
    verb: 'created',
    entity_type: 'certificate',
    entity_id: 'c3000000-0000-4000-8000-000000000001',
    label: 'AWS Cloud Foundations Certificate',
    created_at: '2026-11-15T11:05:00Z',
  },
  {
    id: 'a1000000-0000-4000-8000-000000000004',
    verb: 'shared',
    entity_type: 'share_link',
    entity_id: 'e5000000-0000-4000-8000-000000000001',
    label: 'Internship Application Bundle',
    created_at: '2026-11-14T09:15:00Z',
  },
];

export const MOCK_PROJECTS: Project[] = [
  {
    id: 'b2000000-0000-4000-8000-000000000001',
    title: 'Folio360',
    summary: 'A unified digital identity platform for academic and professional records.',
    description:
      'Centralizes semester records, verified credentials, vault documents, and tailored PDF resumes under strict privacy controls.',
    category: 'Web & Mobile Platform',
    technologies: ['React', 'TypeScript', 'FastAPI', 'PostgreSQL'],
    skills: [
      { id: 's1000000-0000-4000-8000-000000000001', name: 'TypeScript' },
      { id: 's1000000-0000-4000-8000-000000000002', name: 'React' },
    ],
    github_url: 'https://github.com/NyNehalJois/Folio360_frontend',
    live_url: null,
    start_date: '2026-09-10',
    end_date: null,
    is_ongoing: true,
    images: [],
    report_document: null,
    github_import: null,
    featured: true,
    order: 1,
    visibility: 'public',
    created_at: '2026-09-10T10:00:00Z',
    updated_at: '2026-11-17T03:45:00Z',
  },
  {
    id: 'b2000000-0000-4000-8000-000000000002',
    title: 'ResumeFlow',
    summary: 'Structured resume composition and role-alignment workspace.',
    description: 'Transforms verified project and experience records into clean editorial PDF exports.',
    category: 'Developer Tooling',
    technologies: ['Python', 'Vite', 'Jinja2'],
    skills: [{ id: 's1000000-0000-4000-8000-000000000003', name: 'Python' }],
    github_url: null,
    live_url: null,
    start_date: '2026-06-01',
    end_date: '2026-08-20',
    is_ongoing: false,
    images: [],
    report_document: null,
    github_import: null,
    featured: false,
    order: 2,
    visibility: 'public',
    created_at: '2026-06-01T10:00:00Z',
    updated_at: '2026-08-20T16:30:00Z',
  },
];

export const MOCK_EDUCATION: Education[] = [
  {
    id: 'ed000000-0000-4000-8000-000000000001',
    institution: 'R.V. College of Engineering',
    university_or_board: 'Visvesvaraya Technological University (VTU)',
    education_level: 'undergraduate',
    degree: 'B.E.',
    programme: 'Bachelor of Engineering',
    branch: 'Computer Science & Engineering',
    specialization: 'Systems & Applied AI',
    country: 'India',
    state: 'Karnataka',
    start_month: 8,
    start_year: 2023,
    end_month: null,
    end_year: null,
    is_current: true,
    description:
      'Undergraduate coursework in distributed systems, compiler design, algorithms, and software architecture.',
    scheme_id: 'sc000000-0000-4000-8000-000000002022',
    result_type: 'cgpa',
    result_value: null,
    result_source: 'computed',
    computed_cgpa: 8.62,
    show_result_publicly: false,
    achievements: ['Department Technical Coordinator'],
    documents: [],
    visibility: 'public',
    created_at: '2026-09-01T09:00:00Z',
    updated_at: '2026-11-16T14:25:00Z',
  },
];

export const MOCK_SKILLS: UserSkill[] = [
  {
    id: 's1000000-0000-4000-8000-000000000001',
    skill: { id: 'cat-ts', name: 'TypeScript', category: 'language' },
    proficiency: 'advanced',
    self_reported: true,
    used_in: [{ type: 'project', id: MOCK_PROJECTS[0].id, label: 'Folio360' }],
    visibility: 'public',
    order: 1,
  },
  {
    id: 's1000000-0000-4000-8000-000000000002',
    skill: { id: 'cat-react', name: 'React', category: 'framework' },
    proficiency: 'advanced',
    self_reported: true,
    used_in: [{ type: 'project', id: MOCK_PROJECTS[0].id, label: 'Folio360' }],
    visibility: 'public',
    order: 2,
  },
  {
    id: 's1000000-0000-4000-8000-000000000003',
    skill: { id: 'cat-python', name: 'Python', category: 'language' },
    proficiency: 'intermediate',
    self_reported: true,
    used_in: [{ type: 'project', id: MOCK_PROJECTS[1].id, label: 'ResumeFlow' }],
    visibility: 'public',
    order: 3,
  },
];

export const MOCK_CERTIFICATES: Certificate[] = [
  {
    id: 'c3000000-0000-4000-8000-000000000001',
    name: 'Cloud Architecture Foundations',
    issuer: 'AWS Academy',
    issue_date: '2026-07-12',
    expiry_date: null,
    credential_id: 'AWS-EDU-48219',
    verification_url: 'https://www.credly.com/',
    verification_status: 'link_provided',
    document: null,
    skills: [],
    visibility: 'public',
    created_at: '2026-11-15T11:05:00Z',
    updated_at: '2026-11-15T11:05:00Z',
  },
];

export const MOCK_EXPERIENCE: Experience[] = [
  {
    id: 'ex000000-0000-4000-8000-000000000001',
    type: 'internship',
    organization: 'Campus Systems Lab',
    role: 'Frontend Engineering Intern',
    location: 'Bengaluru, IN',
    start_date: '2026-05-15',
    end_date: '2026-07-30',
    is_current: false,
    description: 'Built accessible data tables, component primitives, and document preview workflows.',
    highlights: [
      'Standardized design tokens across light and dark themes',
      'Reduced form validation latency with typed schemas',
    ],
    skills: [{ id: MOCK_SKILLS[0].id, name: 'TypeScript' }],
    documents: [],
    visibility: 'public',
    created_at: '2026-09-02T10:00:00Z',
    updated_at: '2026-09-02T10:00:00Z',
  },
];

export const MOCK_DOCUMENTS: Document[] = [
  {
    id: 'd4000000-0000-4000-8000-000000000001',
    title: 'Semester V Provisional Marksheet',
    original_filename: 'sem5_marksheet.pdf',
    category: 'marksheet',
    mime_type: 'application/pdf',
    size_bytes: 418920,
    page_count: 1,
    sha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    notes: 'Sample placeholder document metadata',
    processing_status: 'needs_review',
    attached_to: [],
    uploaded_at: '2026-11-16T14:20:00Z',
    updated_at: '2026-11-16T14:21:00Z',
  },
];

export const MOCK_RESUMES: ResumeSummary[] = [
  {
    id: 'r6000000-0000-4000-8000-000000000001',
    title: 'Software Engineering — Internship 2026',
    mode: 'standard',
    template_id: 't1000000-0000-4000-8000-000000000001',
    updated_at: '2026-11-15T16:40:00Z',
    last_pdf_at: null,
  },
];

export const MOCK_SHARE_LINKS: ShareLink[] = [
  {
    id: 'e5000000-0000-4000-8000-000000000001',
    label: 'Internship Application Bundle',
    url: 'https://folio360.in/s/demo-token-preview',
    items: [
      {
        type: 'document',
        id: MOCK_DOCUMENTS[0].id,
        label: MOCK_DOCUMENTS[0].title,
      },
    ],
    expires_at: '2026-12-14T09:15:00Z',
    allow_download: false,
    status: 'active',
    access_count: 2,
    last_accessed_at: '2026-11-15T12:00:00Z',
    created_at: '2026-11-14T09:15:00Z',
    revoked_at: null,
  },
];

export const MOCK_DASHBOARD: DashboardSummary = {
  first_name: 'Alex',
  completeness: { percent: MOCK_COMPLETENESS.percent },
  continue_items: [
    {
      key: 'education_records',
      label: 'Add semester records',
      action_route: '/workspace/education',
    },
    {
      key: 'projects_update',
      label: 'Update your projects',
      action_route: '/workspace/projects',
    },
    {
      key: 'resume_generated',
      label: 'Generate your resume',
      action_route: '/workspace/resumes',
    },
  ],
  counts: {
    projects: MOCK_PROJECTS.length,
    skills: MOCK_SKILLS.length,
    certificates: MOCK_CERTIFICATES.length,
    experience: MOCK_EXPERIENCE.length,
    documents: MOCK_DOCUMENTS.length,
    pending_reviews: 1,
  },
  recent_activity: MOCK_ACTIVITY,
};

export const MOCK_PUBLIC_PROFILE: PublicProfile = {
  slug: MOCK_PROFILE.slug,
  full_name: MOCK_PROFILE.full_name,
  headline: MOCK_PROFILE.headline,
  bio: MOCK_PROFILE.bio,
  avatar_url: MOCK_PROFILE.avatar_url,
  location: MOCK_PROFILE.location ?? undefined,
  links: MOCK_PROFILE.links,
  interests: MOCK_PROFILE.interests,
  sections: {
    education: MOCK_EDUCATION.map((e) => ({
      institution: e.institution,
      university_or_board: e.university_or_board,
      education_level: e.education_level,
      degree: e.degree,
      programme: e.programme,
      branch: e.branch,
      specialization: e.specialization,
      country: e.country,
      state: e.state,
      start_month: e.start_month,
      start_year: e.start_year,
      end_month: e.end_month ?? null,
      end_year: e.end_year ?? null,
      is_current: e.is_current,
      description: e.description,
      achievements: e.achievements,
    })),
    projects: MOCK_PROJECTS.map((p) => ({
      title: p.title,
      summary: p.summary,
      description: p.description,
      category: p.category,
      technologies: p.technologies,
      images: [],
      github_url: p.github_url ?? undefined,
      live_url: p.live_url ?? undefined,
      start_date: p.start_date ?? undefined,
      end_date: p.end_date ?? undefined,
      featured: p.featured,
    })),
    skills: MOCK_SKILLS.map((s) => ({
      name: s.skill.name,
      category: s.skill.category,
      proficiency: s.proficiency,
    })),
    certificates: MOCK_CERTIFICATES.map((c) => ({
      name: c.name,
      issuer: c.issuer,
      issue_date: c.issue_date ?? undefined,
      credential_id: c.credential_id ?? undefined,
      verification_url: c.verification_url ?? undefined,
      verification_status: c.verification_status,
    })),
    experience: MOCK_EXPERIENCE.map((ex) => ({
      type: ex.type,
      organization: ex.organization,
      role: ex.role,
      start_date: ex.start_date,
      end_date: ex.end_date ?? null,
      is_current: ex.is_current,
      description: ex.description,
      highlights: ex.highlights,
    })),
  },
};
