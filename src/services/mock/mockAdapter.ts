import { ApiClientError, registerMockHandler, tokenStore, type RequestOptions } from '@/services/http';
import type {
  CurrentUser,
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

let activeMockEmail: string | null = readMockSessionFlag();
let mockProfile: Profile = structuredClone(MOCK_PROFILE);
let mockPreferences: Preferences = structuredClone(MOCK_PREFERENCES);
let mockVisibility: PublicSettings = structuredClone(MOCK_VISIBILITY);

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
    return { ...MOCK_DASHBOARD, first_name: firstName };
  }

  if (method === 'GET' && path === '/activity') {
    return paginate(MOCK_ACTIVITY, options);
  }

  // --- Profile & Preferences ---
  if (method === 'GET' && path === '/profile/me') {
    return mockProfile;
  }

  if (method === 'PATCH' && path === '/profile/me') {
    mockProfile = {
      ...mockProfile,
      ...(options.body as ProfileUpdate),
      updated_at: new Date().toISOString(),
    };
    return mockProfile;
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
    return mockVisibility;
  }

  if (method === 'PATCH' && path === '/profile/me/visibility') {
    mockVisibility = { ...mockVisibility, ...(options.body as Partial<PublicSettings>) };
    return mockVisibility;
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
    mockProfile = {
      ...mockProfile,
      slug,
      public_url: `https://folio360.in/@${slug}`,
      updated_at: new Date().toISOString(),
    };
    return mockProfile;
  }

  // --- Portfolio Collections ---
  if (method === 'GET' && path === '/education') return paginate(MOCK_EDUCATION, options);
  if (method === 'GET' && path === '/projects') return paginate(MOCK_PROJECTS, options);
  if (method === 'GET' && path === '/skills/me') return paginate(MOCK_SKILLS, options);
  if (method === 'GET' && path === '/certificates') return paginate(MOCK_CERTIFICATES, options);
  if (method === 'GET' && path === '/experience') return paginate(MOCK_EXPERIENCE, options);
  if (method === 'GET' && path === '/documents') return paginate(MOCK_DOCUMENTS, options);
  if (method === 'GET' && path === '/resumes') return paginate(MOCK_RESUMES, options);
  if (method === 'GET' && path === '/sharing/links') return paginate(MOCK_SHARE_LINKS, options);

  // --- Public Profiles ---
  if (method === 'GET' && path === '/public/profiles/explore') {
    return paginate(
      [
        {
          slug: MOCK_PUBLIC_PROFILE.slug,
          full_name: MOCK_PUBLIC_PROFILE.full_name,
          headline: MOCK_PUBLIC_PROFILE.headline,
          avatar_url: MOCK_PUBLIC_PROFILE.avatar_url,
          top_skills: MOCK_SKILLS.map((s) => s.skill.name),
        },
      ],
      options,
    );
  }

  if (method === 'GET' && path.startsWith('/public/profiles/')) {
    const slug = decodeURIComponent(path.replace('/public/profiles/', ''));
    if (slug !== MOCK_PUBLIC_PROFILE.slug) {
      throw new ApiClientError(404, 'NOT_FOUND', 'Public profile not found.');
    }
    return MOCK_PUBLIC_PROFILE;
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
