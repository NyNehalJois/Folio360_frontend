import { API_CONFIG } from '@/services/config';
import { httpClient, tokenStore } from '@/services/http';
import type {
  AuthResponse,
  CurrentUser,
  ItemsResponse,
  OAuthExchangeRequest,
  OAuthProvider,
  Session,
  TokenResponse,
} from '@/types/api';

function normalizeCurrentUser(user: CurrentUser): CurrentUser {
  const verified = Boolean(user.is_email_verified ?? user.email_verified);
  return {
    ...user,
    email_verified: verified,
    is_email_verified: verified,
    linked_providers: user.linked_providers ?? user.oauth_providers ?? [],
  };
}

export const authService = {
  async register(payload: {
    email: string;
    password: string;
    full_name: string;
  }): Promise<AuthResponse> {
    const res = await httpClient.post<AuthResponse>(
      '/auth/register',
      { ...payload, client_type: 'web' },
      { skipAuth: true },
    );
    const normalizedUser = res.user ? normalizeCurrentUser(res.user) : res.user;
    if (res.access_token && normalizedUser?.email_verified) {
      tokenStore.setAccessToken(res.access_token);
    } else {
      tokenStore.clear();
    }
    return { ...res, user: normalizedUser };
  },

  async login(payload: { email: string; password: string }): Promise<AuthResponse> {
    const res = await httpClient.post<AuthResponse>(
      '/auth/login',
      { ...payload, client_type: 'web' },
      { headers: { 'X-Client-Type': 'web' }, skipAuth: true },
    );
    tokenStore.setAccessToken(res.access_token);
    return { ...res, user: normalizeCurrentUser(res.user) };
  },

  async refresh(): Promise<TokenResponse> {
    const res = await httpClient.post<TokenResponse>(
      '/auth/refresh',
      undefined,
      { headers: { 'X-Client-Type': 'web' }, skipAuth: true, skipRefreshRetry: true },
    );
    tokenStore.setAccessToken(res.access_token);
    return res;
  },

  async logout(): Promise<void> {
    try {
      await httpClient.post('/auth/logout', undefined, {
        headers: { 'X-Client-Type': 'web' },
        skipRefreshRetry: true,
      });
    } finally {
      tokenStore.clear();
    }
  },

  async me(): Promise<CurrentUser> {
    const user = await httpClient.get<CurrentUser>('/auth/me');
    return normalizeCurrentUser(user);
  },

  async verifyEmail(token: string): Promise<CurrentUser> {
    const user = await httpClient.post<CurrentUser>(
      '/auth/verify-email',
      { token },
      { skipAuth: true },
    );
    return user && typeof user === 'object' && 'email' in user ? normalizeCurrentUser(user) : user;
  },

  resendVerification(email?: string): Promise<void> {
    return httpClient.post(
      '/auth/resend-verification',
      email ? { email } : undefined,
      { skipAuth: Boolean(email) },
    );
  },

  forgotPassword(email: string): Promise<void> {
    return httpClient.post('/auth/forgot-password', { email }, { skipAuth: true });
  },

  resetPassword(payload: { token: string; new_password: string }): Promise<void> {
    return httpClient.post('/auth/reset-password', payload, { skipAuth: true });
  },

  getOAuthStartUrl(
    provider: OAuthProvider,
    options?: {
      redirectTo?: string;
      state?: string;
      codeChallenge?: string;
      codeChallengeMethod?: 'S256';
      redirectUri?: string;
    },
  ): string {
    const base = API_CONFIG.apiBaseUrl.replace(/\/$/, '');
    const params = new URLSearchParams({ client_type: 'web' });
    if (options?.redirectTo) params.set('redirect_to', options.redirectTo);
    if (options?.state) params.set('state', options.state);
    if (options?.codeChallenge) {
      params.set('code_challenge', options.codeChallenge);
      params.set('code_challenge_method', options.codeChallengeMethod ?? 'S256');
    }
    if (options?.redirectUri) params.set('redirect_uri', options.redirectUri);
    return `${base}/auth/${provider}?${params.toString()}`;
  },

  async exchangeOAuthCode(payload: OAuthExchangeRequest): Promise<AuthResponse> {
    const res = await httpClient.post<AuthResponse>('/auth/oauth/exchange', payload, {
      skipAuth: true,
    });
    tokenStore.setAccessToken(res.access_token);
    return { ...res, user: normalizeCurrentUser(res.user) };
  },

  listSessions(): Promise<ItemsResponse<Session>> {
    return httpClient.get<ItemsResponse<Session>>('/auth/sessions');
  },

  revokeSession(sessionId: string): Promise<void> {
    return httpClient.delete(`/auth/sessions/${sessionId}`);
  },

  revokeOtherSessions(): Promise<void> {
    return httpClient.post('/auth/sessions/revoke-others');
  },

  async logoutAll(): Promise<void> {
    try {
      await httpClient.post('/auth/sessions/revoke-others');
    } finally {
      await this.logout();
    }
  },
};
