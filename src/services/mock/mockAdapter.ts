import { sortEducationTimeline } from '@/features/education/educationHelpers';
import { ApiClientError, registerMockHandler, tokenStore, type RequestOptions } from '@/services/http';
import type {
  CurrentUser,
  Document,
  DocumentCategory,
  DocumentRef,
  Education,
  EducationCreate,
  Paginated,
  Preferences,
  Profile,
  ProfileUpdate,
  PublicSettings,
} from '@/types/api';
import {
  MOCK_ACTIVITY,
  MOCK_CERTIFICATES,
  MOCK_COMPLETENESS,
  MOCK_DASHBOARD,
  MOCK_DOCUMENTS,
  MOCK_EDUCATION,
  MOCK_EXPERIENCE,
  MOCK_PREFERENCES,
  MOCK_PROFILE,
  MOCK_PROJECTS,
  MOCK_PUBLIC_PROFILE,
  MOCK_RESUMES,
  MOCK_SHARE_LINKS,
  MOCK_SKILLS,
  MOCK_USER,
  MOCK_VISIBILITY,
} from './mockData';

interface MockAccountRecord {
  user: CurrentUser;
  password: string;
}

const MOCK_SESSION_FLAG_KEY = 'f360_mock_session';
const MOCK_ACCOUNTS_KEY = 'f360_mock_accounts';
const MOCK_PROFILES_KEY = 'f360_mock_profiles';
const MOCK_VISIBILITIES_KEY = 'f360_mock_visibilities';
const MOCK_EDUCATIONS_KEY = 'f360_mock_educations';
const MOCK_DOCUMENTS_KEY = 'f360_mock_documents';

function readMockSessionFlag(): string | null {
  try {
    return sessionStorage.getItem(MOCK_SESSION_FLAG_KEY);
  } catch {
    return null;
  }
}

function writeMockSessionFlag(email: string | null): void {
  try {
    if (email) {
      sessionStorage.setItem(MOCK_SESSION_FLAG_KEY, email);
    } else {
      sessionStorage.removeItem(MOCK_SESSION_FLAG_KEY);
    }
  } catch {
    // Ignore storage unavailability
  }
}

function loadMockAccounts(): Map<string, MockAccountRecord> {
  const map = new Map<string, MockAccountRecord>([
    [
      MOCK_USER.email.toLowerCase(),
      {
        user: structuredClone(MOCK_USER),
        password: 'password1234',
      },
    ],
  ]);
  try {
    const raw = sessionStorage.getItem(MOCK_ACCOUNTS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as [string, MockAccountRecord][];
      for (const [k, v] of parsed) {
        map.set(k, v);
      }
    }
  } catch {
    // Ignore storage parse/access errors
  }
  return map;
}

function saveMockAccounts(map: Map<string, MockAccountRecord>): void {
  try {
    sessionStorage.setItem(MOCK_ACCOUNTS_KEY, JSON.stringify(Array.from(map.entries())));
  } catch {
    // Ignore storage write errors
  }
}

const mockAccounts = loadMockAccounts();

function loadMockProfiles(): Map<string, Profile> {
  const map = new Map<string, Profile>([[MOCK_USER.id, structuredClone(MOCK_PROFILE)]]);
  try {
    const raw = sessionStorage.getItem(MOCK_PROFILES_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as [string, Profile][];
      for (const [k, v] of parsed) {
        map.set(k, v);
      }
    }
  } catch {
    // Ignore storage errors
  }
  return map;
}

function saveMockProfiles(map: Map<string, Profile>): void {
  try {
    sessionStorage.setItem(MOCK_PROFILES_KEY, JSON.stringify(Array.from(map.entries())));
  } catch {
    // Ignore storage quota/write errors
  }
}

function loadMockVisibilities(): Map<string, PublicSettings> {
  const map = new Map<string, PublicSettings>([
    [MOCK_USER.id, structuredClone(MOCK_VISIBILITY)],
  ]);
  try {
    const raw = sessionStorage.getItem(MOCK_VISIBILITIES_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as [string, PublicSettings][];
      for (const [k, v] of parsed) {
        map.set(k, v);
      }
    }
  } catch {
    // Ignore storage errors
  }
  return map;
}

function saveMockVisibilities(map: Map<string, PublicSettings>): void {
  try {
    sessionStorage.setItem(MOCK_VISIBILITIES_KEY, JSON.stringify(Array.from(map.entries())));
  } catch {
    // Ignore storage write errors
  }
}

function loadMockEducations(): Map<string, Education[]> {
  const map = new Map<string, Education[]>([[MOCK_USER.id, structuredClone(MOCK_EDUCATION)]]);
  try {
    const raw = sessionStorage.getItem(MOCK_EDUCATIONS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as [string, Education[]][];
      for (const [k, v] of parsed) {
        map.set(k, v);
      }
    }
  } catch {
    // Ignore storage errors
  }
  return map;
}

function saveMockEducations(map: Map<string, Education[]>): void {
  try {
    sessionStorage.setItem(MOCK_EDUCATIONS_KEY, JSON.stringify(Array.from(map.entries())));
  } catch {
    // Ignore storage write errors
  }
}

function loadMockDocuments(): Map<string, Document[]> {
  const map = new Map<string, Document[]>([[MOCK_USER.id, structuredClone(MOCK_DOCUMENTS)]]);
  try {
    const raw = sessionStorage.getItem(MOCK_DOCUMENTS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as [string, Document[]][];
      for (const [k, v] of parsed) {
        map.set(k, v);
      }
    }
  } catch {
    // Ignore storage errors
  }
  return map;
}

function saveMockDocuments(map: Map<string, Document[]>): void {
  try {
    sessionStorage.setItem(MOCK_DOCUMENTS_KEY, JSON.stringify(Array.from(map.entries())));
  } catch {
    // Ignore storage write errors
  }
}

const mockProfiles = loadMockProfiles();
const mockVisibilities = loadMockVisibilities();
const mockEducations = loadMockEducations();
const mockDocuments = loadMockDocuments();

function getOrCreateEducations(userId: string): Education[] {
  const existing = mockEducations.get(userId);
  if (existing) return existing;
  const fresh: Education[] = [];
  mockEducations.set(userId, fresh);
  saveMockEducations(mockEducations);
  return fresh;
}

function getOrCreateDocuments(userId: string): Document[] {
  const existing = mockDocuments.get(userId);
  if (existing) return existing;
  const fresh: Document[] = [];
  mockDocuments.set(userId, fresh);
  saveMockDocuments(mockDocuments);
  return fresh;
}

function resolveDocumentRefs(userId: string, documentIds?: string[]): DocumentRef[] {
  if (!documentIds || documentIds.length === 0) return [];
  const docs = getOrCreateDocuments(userId);
  const byId = new Map(docs.map((d) => [d.id, d]));
  const refs: DocumentRef[] = [];
  for (const id of documentIds) {
    const doc = byId.get(id);
    if (doc) {
      refs.push({
        id: doc.id,
        title: doc.title,
        category: doc.category,
        mime_type: doc.mime_type,
      });
    }
  }
  return refs;
}

function getOrCreateProfile(user: CurrentUser): Profile {
  const existing = mockProfiles.get(user.id);
  if (existing) {
    return {
      ...existing,
      slug: user.slug,
      public_url: user.slug ? `https://folio360.in/@${user.slug}` : '',
      avatar_url: user.avatar_url,
    };
  }
  const fresh: Profile = {
    user_id: user.id,
    slug: user.slug,
    public_url: user.slug ? `https://folio360.in/@${user.slug}` : '',
    full_name: user.full_name,
    date_of_birth: null,
    headline: null,
    bio: null,
    avatar_url: user.avatar_url,
    location: null,
    contact_email: null,
    phone: null,
    website: null,
    links: { other: [] },
    interests: [],
    current_activities: [],
    profile_completed: Boolean(user.profile_completed),
    updated_at: new Date().toISOString(),
  };
  mockProfiles.set(user.id, fresh);
  saveMockProfiles(mockProfiles);
  return fresh;
}

function getOrCreateVisibility(userId: string): PublicSettings {
  const existing = mockVisibilities.get(userId);
  if (existing) return existing;
  const fresh: PublicSettings = {
    public_enabled: false,
    discoverable: false,
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
      show_location: false,
    },
  };
  mockVisibilities.set(userId, fresh);
  saveMockVisibilities(mockVisibilities);
  return fresh;
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Failed to read image file.'));
    reader.readAsDataURL(file);
  });
}

let activeMockEmail: string | null = readMockSessionFlag();
let mockPreferences: Preferences = structuredClone(MOCK_PREFERENCES);

function delay(ms = 140): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function paginate<T>(items: T[], options: RequestOptions): Paginated<T> {
  const page = Number(options.query?.page ?? 1) || 1;
  const pageSize = Number(options.query?.page_size ?? 20) || 20;
  const start = (page - 1) * pageSize;
  const slice = items.slice(start, start + pageSize);
  return {
    items: slice,
    page,
    page_size: pageSize,
    total: items.length,
    total_pages: Math.max(1, Math.ceil(items.length / pageSize)),
  };
}

function getSignedInAccount(): MockAccountRecord | null {
  if (!activeMockEmail) return null;
  return mockAccounts.get(activeMockEmail.toLowerCase()) ?? null;
}

function requireMockAuth(options: RequestOptions): MockAccountRecord {
  if (options.skipAuth) {
    return mockAccounts.get(MOCK_USER.email.toLowerCase())!;
  }
  const acct = getSignedInAccount();
  if (!tokenStore.getAccessToken() || !acct) {
    throw new ApiClientError(401, 'UNAUTHENTICATED', 'Authentication required.');
  }
  return acct;
}

async function handleMockRequest(
  method: string,
  path: string,
  options: RequestOptions,
): Promise<unknown> {
  await delay();

  // --- Health ---
  if (method === 'GET' && path === '/health') {
    return { status: 'ok', db: 'mock', storage: 'mock' };
  }

  // --- Auth ---
  if (method === 'POST' && path === '/auth/register') {
    const body = (options.body ?? {}) as {
      email?: string;
      password?: string;
      full_name?: string;
    };
    const email = (body.email ?? '').trim().toLowerCase();
    const fullName = (body.full_name ?? '').trim();
    const password = body.password ?? '';

    if (!fullName || !email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new ApiClientError(422, 'VALIDATION_ERROR', 'Please provide a valid name and email.', [
        { field: 'email', issue: 'Invalid email format.' },
      ]);
    }
    if (password.length < 12 || password.length > 128) {
      throw new ApiClientError(422, 'VALIDATION_ERROR', 'Password must be 12–128 characters.', [
        { field: 'password', issue: 'Password must be between 12 and 128 characters.' },
      ]);
    }
    if (mockAccounts.has(email)) {
      throw new ApiClientError(409, 'EMAIL_TAKEN', 'An account with this email already exists.', [
        { field: 'email', issue: 'Email address is already registered.' },
      ]);
    }

    const newUser: CurrentUser = {
      id: crypto.randomUUID(),
      email,
      email_verified: false,
      full_name: fullName,
      slug: '',
      avatar_url: null,
      has_password: true,
      linked_providers: [],
      profile_completed: false,
      created_at: new Date().toISOString(),
    };

    mockAccounts.set(email, { user: newUser, password });
    saveMockAccounts(mockAccounts);

    // Unverified accounts do not receive an active workspace session
    return {
      access_token: '',
      token_type: 'bearer',
      expires_in: 0,
      user: newUser,
    };
  }

  if (method === 'POST' && path === '/auth/login') {
    const body = (options.body ?? {}) as { email?: string; password?: string };
    const email = (body.email ?? '').trim().toLowerCase();
    const password = body.password ?? '';

    if (!email || !password) {
      throw new ApiClientError(422, 'VALIDATION_ERROR', 'Email and password are required.');
    }

    const acct = mockAccounts.get(email);
    if (!acct || acct.password !== password) {
      throw new ApiClientError(401, 'INVALID_CREDENTIALS', 'Invalid email or password.');
    }

    if (!acct.user.email_verified) {
      throw new ApiClientError(
        403,
        'EMAIL_NOT_VERIFIED',
        'Please verify your email address before signing in.',
      );
    }

    activeMockEmail = email;
    writeMockSessionFlag(email);

    return {
      access_token: 'mock-access-token-web',
      token_type: 'bearer',
      expires_in: 900,
      user: acct.user,
    };
  }

  if (method === 'POST' && path === '/auth/verify-email') {
    const body = (options.body ?? {}) as { token?: string };
    const token = (body.token ?? '').trim();

    if (!token) {
      throw new ApiClientError(400, 'BAD_REQUEST', 'Verification token is missing.');
    }
    if (token === 'expired' || token === 'mock-verify-expired') {
      throw new ApiClientError(
        400,
        'TOKEN_EXPIRED',
        'This verification link has expired. Request a new verification email below.',
      );
    }
    if (token === 'invalid' || token === 'mock-verify-invalid') {
      throw new ApiClientError(
        400,
        'BAD_REQUEST',
        'This verification link is invalid.',
      );
    }
    if (token === 'used' || token === 'mock-verify-used') {
      throw new ApiClientError(
        409,
        'TOKEN_ALREADY_USED',
        'This verification link has already been used.',
      );
    }

    if (token === 'valid' || token === 'mock-verify-valid') {
      // Verify the most recently created unverified user, or fallback to MOCK_USER
      let target: MockAccountRecord | undefined;
      for (const acct of mockAccounts.values()) {
        if (!acct.user.email_verified) {
          target = acct;
        }
      }
      if (!target) {
        target = mockAccounts.get(MOCK_USER.email.toLowerCase());
      }
      if (target) {
        target.user = { ...target.user, email_verified: true };
        saveMockAccounts(mockAccounts);
        return target.user;
      }
    }

    throw new ApiClientError(
      400,
      'BAD_REQUEST',
      'Verification token could not be recognized.',
    );
  }

  if (method === 'POST' && path === '/auth/resend-verification') {
    return undefined;
  }

  if (method === 'POST' && path === '/auth/forgot-password') {
    // Always succeed neutrally regardless of whether email exists
    return undefined;
  }

  if (method === 'POST' && path === '/auth/reset-password') {
    const body = (options.body ?? {}) as { token?: string; new_password?: string };
    const token = (body.token ?? '').trim();
    const newPassword = body.new_password ?? '';

    if (!token) {
      throw new ApiClientError(400, 'BAD_REQUEST', 'Reset token is missing.');
    }
    if (token === 'expired' || token === 'mock-reset-expired') {
      throw new ApiClientError(
        400,
        'TOKEN_EXPIRED',
        'This password reset link has expired. Request a new reset link.',
      );
    }
    if (token === 'invalid' || token === 'mock-reset-invalid') {
      throw new ApiClientError(
        400,
        'BAD_REQUEST',
        'This password reset link is invalid or has already been used.',
      );
    }
    if (newPassword.length < 12 || newPassword.length > 128) {
      throw new ApiClientError(422, 'VALIDATION_ERROR', 'Password must be 12–128 characters.', [
        { field: 'new_password', issue: 'Password must be between 12 and 128 characters.' },
      ]);
    }
    if (token === 'valid' || token === 'mock-reset-valid') {
      const demo = mockAccounts.get(MOCK_USER.email.toLowerCase());
      if (demo) {
        demo.password = newPassword;
        saveMockAccounts(mockAccounts);
      }
      return undefined;
    }

    throw new ApiClientError(400, 'BAD_REQUEST', 'Reset token could not be recognized.');
  }

  if (method === 'POST' && path === '/auth/oauth/exchange') {
    // Never fake OAuth success without backend OAuth endpoints
    throw new ApiClientError(
      503,
      'OAUTH_UNAVAILABLE',
      'OAuth authentication requires the Folio360 backend OAuth endpoints, which are unavailable in mock mode.',
    );
  }

  if (method === 'POST' && path === '/auth/refresh') {
    const acct = getSignedInAccount();
    if (!acct) {
      throw new ApiClientError(401, 'UNAUTHENTICATED', 'No active session.');
    }
    return {
      access_token: 'mock-access-token-refreshed',
      token_type: 'bearer',
      expires_in: 900,
    };
  }

  if (method === 'POST' && path === '/auth/logout') {
    activeMockEmail = null;
    writeMockSessionFlag(null);
    return undefined;
  }

  if (method === 'POST' && path === '/auth/sessions/revoke-others') {
    requireMockAuth(options);
    return undefined;
  }

  if (method === 'GET' && path === '/auth/me') {
    const acct = requireMockAuth(options);
    return acct.user;
  }

  // All remaining routes except /public/* and /sharing/access/* require auth
  if (!path.startsWith('/public/') && !path.startsWith('/sharing/access/')) {
    requireMockAuth(options);
  }

  // --- Analytics & Activity ---
  if (method === 'GET' && path === '/analytics/dashboard') {
    const acct = getSignedInAccount();
    const firstName = acct?.user.full_name.split(' ')[0] || MOCK_DASHBOARD.first_name;
    const docsCount = acct ? getOrCreateDocuments(acct.user.id).length : MOCK_DOCUMENTS.length;
    const eduCount = acct ? getOrCreateEducations(acct.user.id).length : MOCK_EDUCATION.length;
    return {
      ...MOCK_DASHBOARD,
      first_name: firstName,
      counts: {
        ...MOCK_DASHBOARD.counts,
        documents: docsCount,
        education: eduCount,
      },
    };
  }

  if (method === 'GET' && path === '/activity') {
    return paginate(MOCK_ACTIVITY, options);
  }

  // --- Profile & Preferences ---
  if (method === 'GET' && path === '/profile/me') {
    const acct = requireMockAuth(options);
    return getOrCreateProfile(acct.user);
  }

  if (method === 'PATCH' && path === '/profile/me') {
    const acct = requireMockAuth(options);
    const current = getOrCreateProfile(acct.user);
    const patch = options.body as ProfileUpdate;
    const updated: Profile = {
      ...current,
      ...patch,
      links: patch.links
        ? {
            linkedin: patch.links.linkedin,
            github: patch.links.github,
            other: patch.links.other ?? current.links.other,
          }
        : current.links,
      updated_at: new Date().toISOString(),
    };
    mockProfiles.set(acct.user.id, updated);
    saveMockProfiles(mockProfiles);
    if (
      (patch.full_name && patch.full_name !== acct.user.full_name) ||
      (typeof patch.profile_completed === 'boolean' &&
        patch.profile_completed !== acct.user.profile_completed)
    ) {
      acct.user = {
        ...acct.user,
        full_name: patch.full_name ?? acct.user.full_name,
        profile_completed:
          typeof patch.profile_completed === 'boolean'
            ? patch.profile_completed
            : acct.user.profile_completed,
      };
      saveMockAccounts(mockAccounts);
    }
    return updated;
  }

  if (method === 'POST' && path === '/profile/me/avatar') {
    const acct = requireMockAuth(options);
    const formData = options.body;
    if (!(formData instanceof FormData)) {
      throw new ApiClientError(400, 'BAD_REQUEST', 'Expected multipart/form-data upload.');
    }
    const file = formData.get('file');
    if (!(file instanceof File)) {
      throw new ApiClientError(422, 'VALIDATION_ERROR', 'Avatar image file is required.');
    }
    const allowedTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);
    if (!allowedTypes.has(file.type)) {
      throw new ApiClientError(
        415,
        'UNSUPPORTED_FILE_TYPE',
        'Unsupported image format. Use JPEG, PNG, or WebP.',
      );
    }
    if (file.size > 5 * 1024 * 1024) {
      throw new ApiClientError(413, 'FILE_TOO_LARGE', 'Image exceeds the 5 MB maximum limit.');
    }

    const avatarUrl = await fileToDataUrl(file);
    acct.user = { ...acct.user, avatar_url: avatarUrl };
    saveMockAccounts(mockAccounts);
    const current = getOrCreateProfile(acct.user);
    const updated: Profile = {
      ...current,
      avatar_url: avatarUrl,
      updated_at: new Date().toISOString(),
    };
    mockProfiles.set(acct.user.id, updated);
    saveMockProfiles(mockProfiles);
    return { avatar_url: avatarUrl };
  }

  if (method === 'DELETE' && path === '/profile/me/avatar') {
    const acct = requireMockAuth(options);
    acct.user = { ...acct.user, avatar_url: null };
    saveMockAccounts(mockAccounts);
    const current = getOrCreateProfile(acct.user);
    const updated: Profile = {
      ...current,
      avatar_url: null,
      updated_at: new Date().toISOString(),
    };
    mockProfiles.set(acct.user.id, updated);
    saveMockProfiles(mockProfiles);
    return undefined;
  }

  if (method === 'GET' && path === '/profile/me/completeness') {
    return MOCK_COMPLETENESS;
  }

  if (method === 'GET' && path === '/profile/me/preferences') {
    return mockPreferences;
  }

  if (method === 'PATCH' && path === '/profile/me/preferences') {
    mockPreferences = { ...mockPreferences, ...(options.body as Partial<Preferences>) };
    return mockPreferences;
  }

  if (method === 'GET' && path === '/profile/me/visibility') {
    const acct = requireMockAuth(options);
    return getOrCreateVisibility(acct.user.id);
  }

  if (method === 'PATCH' && path === '/profile/me/visibility') {
    const acct = requireMockAuth(options);
    const current = getOrCreateVisibility(acct.user.id);
    const patch = options.body as Partial<PublicSettings>;
    const updated: PublicSettings = {
      ...current,
      ...patch,
      public_sections: patch.public_sections
        ? { ...current.public_sections, ...patch.public_sections }
        : current.public_sections,
      public_contact: patch.public_contact
        ? { ...current.public_contact, ...patch.public_contact }
        : current.public_contact,
    };
    mockVisibilities.set(acct.user.id, updated);
    saveMockVisibilities(mockVisibilities);
    return updated;
  }

  if (method === 'GET' && path === '/profile/slug-availability') {
    const slug = String(options.query?.slug ?? '');
    const reserved = new Set([
      'api',
      'login',
      'register',
      'auth',
      'explore',
      'settings',
      'admin',
      'workspace',
      'onboarding',
      'share',
    ]);
    if (!slug || slug.length < 3 || slug.length > 30) {
      return { slug, available: false, reason: 'Username must be 3–30 characters.' };
    }
    if (!/^[a-z0-9_]{3,30}$/.test(slug)) {
      return {
        slug,
        available: false,
        reason: 'Use only lowercase letters, numbers, and underscores.',
      };
    }
    if (reserved.has(slug)) {
      return { slug, available: false, reason: 'This username is reserved.' };
    }
    const current = getSignedInAccount();
    for (const acct of mockAccounts.values()) {
      if (acct.user.slug === slug && acct.user.id !== current?.user.id) {
        return { slug, available: false, reason: 'This username is already taken.' };
      }
    }
    return { slug, available: true };
  }

  if (method === 'PATCH' && path === '/profile/me/slug') {
    const acct = requireMockAuth(options);
    const body = (options.body ?? {}) as { slug?: string };
    const slug = (body.slug ?? '').trim();
    if (!/^[a-z0-9_]{3,30}$/.test(slug)) {
      throw new ApiClientError(
        422,
        'VALIDATION_ERROR',
        'Use 3–30 lowercase letters, numbers, and underscores only.',
        [{ field: 'slug', issue: 'Invalid username format.' }],
      );
    }
    for (const other of mockAccounts.values()) {
      if (other.user.slug === slug && other.user.id !== acct.user.id) {
        throw new ApiClientError(409, 'SLUG_TAKEN', 'This username is already taken.');
      }
    }
    acct.user = { ...acct.user, slug };
    saveMockAccounts(mockAccounts);
    const current = getOrCreateProfile(acct.user);
    const updated: Profile = {
      ...current,
      slug,
      public_url: `https://folio360.in/@${slug}`,
      updated_at: new Date().toISOString(),
    };
    mockProfiles.set(acct.user.id, updated);
    saveMockProfiles(mockProfiles);
    return updated;
  }

  // --- Education ---
  if (path === '/education') {
    const acct = requireMockAuth(options);
    const items = getOrCreateEducations(acct.user.id);
    if (method === 'GET') {
      return paginate(sortEducationTimeline(items), options);
    }
    if (method === 'POST') {
      const body = (options.body ?? {}) as Partial<EducationCreate>;
      const startYear = Number(body.start_year);
      const startMonth = body.start_month ?? null;
      const isCurrent = Boolean(body.is_current);
      const endYear = isCurrent ? null : body.end_year ?? null;
      const endMonth = isCurrent ? null : body.end_month ?? null;

      if (!body.institution?.trim() || !body.degree?.trim() || !Number.isInteger(startYear)) {
        throw new ApiClientError(
          422,
          'VALIDATION_ERROR',
          'Institution, degree, and valid start year are required.',
        );
      }
      if (!isCurrent && endYear != null) {
        if (
          endYear < startYear ||
          (endYear === startYear && (endMonth ?? 12) < (startMonth ?? 1))
        ) {
          throw new ApiClientError(422, 'VALIDATION_ERROR', 'End date cannot precede start date.');
        }
      }

      const now = new Date().toISOString();
      const created: Education = {
        id:
          typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
            ? crypto.randomUUID()
            : `ed-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`,
        institution: body.institution.trim(),
        university_or_board: body.university_or_board?.trim() || null,
        education_level: body.education_level ?? 'undergraduate',
        degree: body.degree.trim(),
        programme: body.programme ?? undefined,
        branch: body.branch?.trim() || undefined,
        specialization: body.specialization?.trim() || undefined,
        country: body.country?.trim() || null,
        state: body.state?.trim() || null,
        start_month: startMonth,
        start_year: startYear,
        end_month: endMonth,
        end_year: endYear,
        is_current: isCurrent,
        description: body.description?.trim() || null,
        scheme_id: body.scheme_id ?? null,
        result_type: body.result_type ?? 'none',
        result_value: body.result_value ?? null,
        result_source: 'manual',
        computed_cgpa: null,
        show_result_publicly: Boolean(body.show_result_publicly),
        achievements: body.achievements ?? [],
        documents: resolveDocumentRefs(acct.user.id, body.document_ids),
        visibility: body.visibility ?? 'public',
        created_at: now,
        updated_at: now,
      };
      const updatedList = [created, ...items];
      mockEducations.set(acct.user.id, updatedList);
      saveMockEducations(mockEducations);
      return created;
    }
  }

  if (path.startsWith('/education/')) {
    const acct = requireMockAuth(options);
    const eduId = decodeURIComponent(path.replace('/education/', ''));
    const items = getOrCreateEducations(acct.user.id);
    const index = items.findIndex((item) => item.id === eduId);
    if (index === -1) {
      throw new ApiClientError(404, 'NOT_FOUND', 'Education record not found.');
    }
    if (method === 'GET') {
      return items[index];
    }
    if (method === 'PATCH') {
      const body = (options.body ?? {}) as Partial<EducationCreate>;
      const existing = items[index];
      const nextCurrent = body.is_current ?? existing.is_current;
      const nextStartYear = body.start_year ?? existing.start_year;
      const nextStartMonth = body.start_month !== undefined ? body.start_month : existing.start_month;
      const nextEndYear = nextCurrent
        ? null
        : body.end_year !== undefined
          ? body.end_year
          : existing.end_year;
      const nextEndMonth = nextCurrent
        ? null
        : body.end_month !== undefined
          ? body.end_month
          : existing.end_month;

      if (!nextCurrent && nextEndYear != null) {
        if (
          nextEndYear < nextStartYear ||
          (nextEndYear === nextStartYear && (nextEndMonth ?? 12) < (nextStartMonth ?? 1))
        ) {
          throw new ApiClientError(422, 'VALIDATION_ERROR', 'End date cannot precede start date.');
        }
      }

      const updated: Education = {
        ...existing,
        ...body,
        institution: body.institution !== undefined ? body.institution.trim() : existing.institution,
        university_or_board:
          body.university_or_board !== undefined
            ? body.university_or_board?.trim() || null
            : existing.university_or_board,
        degree: body.degree !== undefined ? body.degree.trim() : existing.degree,
        branch: body.branch !== undefined ? body.branch?.trim() || undefined : existing.branch,
        specialization:
          body.specialization !== undefined
            ? body.specialization?.trim() || undefined
            : existing.specialization,
        country: body.country !== undefined ? body.country?.trim() || null : existing.country,
        state: body.state !== undefined ? body.state?.trim() || null : existing.state,
        description:
          body.description !== undefined
            ? body.description?.trim() || null
            : existing.description,
        is_current: nextCurrent,
        start_month: nextStartMonth,
        start_year: nextStartYear,
        end_month: nextEndMonth,
        end_year: nextEndYear,
        documents:
          body.document_ids !== undefined
            ? resolveDocumentRefs(acct.user.id, body.document_ids)
            : existing.documents,
        updated_at: new Date().toISOString(),
      };
      const nextList = items.map((item) => (item.id === eduId ? updated : item));
      mockEducations.set(acct.user.id, nextList);
      saveMockEducations(mockEducations);
      return updated;
    }
    if (method === 'DELETE') {
      const nextList = items.filter((item) => item.id !== eduId);
      mockEducations.set(acct.user.id, nextList);
      saveMockEducations(mockEducations);
      return undefined;
    }
  }

  // --- Documents ---
  if (path === '/documents') {
    const acct = requireMockAuth(options);
    const docs = getOrCreateDocuments(acct.user.id);
    if (method === 'GET') {
      const q = String(options.query?.q ?? '').trim().toLowerCase();
      const cat = options.query?.category ? String(options.query.category) : '';
      const filtered = docs.filter((d) => {
        if (cat && d.category !== cat) return false;
        if (
          q &&
          !d.title.toLowerCase().includes(q) &&
          !d.original_filename.toLowerCase().includes(q)
        ) {
          return false;
        }
        return true;
      });
      return paginate(filtered, options);
    }
    if (method === 'POST') {
      const formData = options.body;
      if (!(formData instanceof FormData)) {
        throw new ApiClientError(400, 'BAD_REQUEST', 'Expected multipart/form-data upload.');
      }
      const file = formData.get('file');
      if (!(file instanceof File)) {
        throw new ApiClientError(422, 'VALIDATION_ERROR', 'Document file is required.');
      }
      const allowed = new Set(['application/pdf', 'image/jpeg', 'image/png']);
      if (!allowed.has(file.type)) {
        throw new ApiClientError(
          415,
          'UNSUPPORTED_FILE_TYPE',
          'Unsupported document format. Upload PDF, JPEG, or PNG.',
        );
      }
      if (file.size > 10 * 1024 * 1024) {
        throw new ApiClientError(413, 'FILE_TOO_LARGE', 'File exceeds the 10 MB maximum limit.');
      }

      const rawCategory = String(formData.get('category') ?? 'other') as DocumentCategory;
      const rawTitle = String(formData.get('title') ?? '').trim();
      const fallbackTitle = file.name.replace(/\.[^.]+$/, '') || file.name;
      const now = new Date().toISOString();
      const created: Document = {
        id:
          typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
            ? crypto.randomUUID()
            : `doc-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`,
        title: rawTitle || fallbackTitle,
        original_filename: file.name,
        category: rawCategory || 'other',
        mime_type: file.type as Document['mime_type'],
        size_bytes: file.size,
        page_count: file.type === 'application/pdf' ? 1 : null,
        sha256: 'mock-sha256-' + Date.now().toString(16),
        notes: null,
        processing_status: 'none',
        show_in_education: rawCategory === 'marksheet' || rawCategory === 'certificate',
        attached_to: [],
        uploaded_at: now,
        updated_at: now,
      };
      const nextDocs = [created, ...docs];
      mockDocuments.set(acct.user.id, nextDocs);
      saveMockDocuments(mockDocuments);
      return { document: created, processing_job: null };
    }
  }

  if (path.startsWith('/documents/') && path !== '/documents/categories') {
    const acct = requireMockAuth(options);
    const docId = decodeURIComponent(path.replace('/documents/', '').split('/')[0]);
    const docs = getOrCreateDocuments(acct.user.id);
    const idx = docs.findIndex((d) => d.id === docId);
    if (idx === -1) {
      throw new ApiClientError(404, 'NOT_FOUND', 'Document not found.');
    }
    if (method === 'GET') return docs[idx];
    if (method === 'PATCH') {
      const body = (options.body ?? {}) as {
        title?: string;
        category?: DocumentCategory;
        notes?: string;
        show_in_education?: boolean;
      };
      const updated: Document = {
        ...docs[idx],
        title: body.title !== undefined ? body.title.trim() || docs[idx].title : docs[idx].title,
        category: body.category ?? docs[idx].category,
        notes: body.notes !== undefined ? body.notes : docs[idx].notes,
        show_in_education:
          body.show_in_education !== undefined
            ? body.show_in_education
            : docs[idx].show_in_education,
        updated_at: new Date().toISOString(),
      };
      const nextDocs = docs.map((d) => (d.id === docId ? updated : d));
      mockDocuments.set(acct.user.id, nextDocs);
      saveMockDocuments(mockDocuments);
      return updated;
    }
    if (method === 'DELETE') {
      const nextDocs = docs.filter((d) => d.id !== docId);
      mockDocuments.set(acct.user.id, nextDocs);
      saveMockDocuments(mockDocuments);
      return undefined;
    }
  }

  // --- Portfolio Collections ---
  if (method === 'GET' && path === '/projects') return paginate(MOCK_PROJECTS, options);
  if (method === 'GET' && path === '/skills/me') return paginate(MOCK_SKILLS, options);
  if (method === 'GET' && path === '/certificates') return paginate(MOCK_CERTIFICATES, options);
  if (method === 'GET' && path === '/experience') return paginate(MOCK_EXPERIENCE, options);
  if (method === 'GET' && path === '/resumes') return paginate(MOCK_RESUMES, options);
  if (method === 'GET' && path === '/sharing/links') return paginate(MOCK_SHARE_LINKS, options);

  // --- Public Profiles ---
  if (method === 'GET' && path === '/public/profiles/explore') {
    const discoverableCards = [];
    for (const acct of mockAccounts.values()) {
      if (!acct.user.slug) continue;
      const vis = getOrCreateVisibility(acct.user.id);
      if (!vis.public_enabled || !vis.discoverable) continue;
      const prof = getOrCreateProfile(acct.user);
      discoverableCards.push({
        slug: prof.slug,
        full_name: prof.full_name,
        headline: prof.headline,
        avatar_url: prof.avatar_url,
        top_skills: MOCK_SKILLS.map((s) => s.skill.name),
      });
    }
    return paginate(discoverableCards, options);
  }

  if (method === 'GET' && path.startsWith('/public/profiles/')) {
    const rawSlug = decodeURIComponent(path.replace('/public/profiles/', ''));
    const slug = rawSlug.startsWith('@') ? rawSlug.slice(1) : rawSlug;
    let targetAccount: MockAccountRecord | undefined;
    for (const acct of mockAccounts.values()) {
      if (acct.user.slug === slug) {
        targetAccount = acct;
        break;
      }
    }
    if (!targetAccount) {
      throw new ApiClientError(404, 'NOT_FOUND', 'Public profile not found.');
    }
    const vis = getOrCreateVisibility(targetAccount.user.id);
    if (!vis.public_enabled) {
      throw new ApiClientError(404, 'NOT_FOUND', 'Public profile is disabled.');
    }
    const prof = getOrCreateProfile(targetAccount.user);
    const userEducations = getOrCreateEducations(targetAccount.user.id);
    const userDocs = getOrCreateDocuments(targetAccount.user.id);
    const visibleEduDocsById = new Map(
      userDocs.filter((d) => d.show_in_education !== false).map((d) => [d.id, d]),
    );
    const publicEducations = sortEducationTimeline(
      userEducations.filter((item) => item.visibility === 'public'),
    ).map((e) => ({
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
      result: e.show_result_publicly ? (e.result_value ?? e.computed_cgpa) : undefined,
      achievements: e.achievements,
      documents: (e.documents ?? []).filter((ref) => visibleEduDocsById.has(ref.id)),
    }));
    const selectedEducationDocuments: DocumentRef[] = userDocs
      .filter((d) => d.show_in_education === true)
      .map((d) => ({
        id: d.id,
        title: d.title,
        category: d.category,
        mime_type: d.mime_type,
      }));
    return {
      slug: prof.slug,
      full_name: prof.full_name,
      headline: prof.headline,
      bio: prof.bio,
      avatar_url: prof.avatar_url,
      location: vis.public_contact.show_location ? prof.location ?? undefined : undefined,
      contact_email: vis.public_contact.show_email ? prof.contact_email ?? undefined : undefined,
      phone: vis.public_contact.show_phone ? prof.phone ?? undefined : undefined,
      links: {
        linkedin: prof.links.linkedin,
        github: prof.links.github,
        website: prof.website ?? undefined,
        other: prof.links.other,
      },
      interests: prof.interests,
      sections: {
        education: vis.public_sections.education ? publicEducations : undefined,
        education_documents: vis.public_sections.education
          ? selectedEducationDocuments
          : undefined,
        projects: vis.public_sections.projects ? MOCK_PUBLIC_PROFILE.sections.projects : undefined,
        skills: vis.public_sections.skills ? MOCK_PUBLIC_PROFILE.sections.skills : undefined,
        certificates: vis.public_sections.certificates
          ? MOCK_PUBLIC_PROFILE.sections.certificates
          : undefined,
        experience: vis.public_sections.experience
          ? MOCK_PUBLIC_PROFILE.sections.experience
          : undefined,
      },
    };
  }

  throw new ApiClientError(
    404,
    'NOT_FOUND',
    `Mock endpoint not implemented for ${method} ${path}`,
  );
}

export function initMockAdapter(): void {
  registerMockHandler(handleMockRequest);
}
