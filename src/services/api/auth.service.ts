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
    if (res.access_token && res.user?.email_verified) {
      tokenStore.setAccessToken(res.access_token);
    } else {
      tokenStore.clear();
    }
    return res;
  },

  async login(payload: { email: string; password: string }): Promise<AuthResponse> {
    const res = await httpClient.post<AuthResponse>(
      '/auth/login',
      { ...payload, client_type: 'web' },
      { skipAuth: true },
    );
    tokenStore.setAccessToken(res.access_token);
    return res;
  },

  async refresh(): Promise<TokenResponse> {
    const res = await httpClient.post<TokenResponse>(
      '/auth/refresh',
      undefined,
      { skipAuth: true, skipRefreshRetry: true },
    );
    tokenStore.setAccessToken(res.access_token);
    return res;
  },

  async logout(): Promise<void> {
    try {
      await httpClient.post('/auth/logout', undefined, { skipRefreshRetry: true });
    } finally {
      tokenStore.clear();
    }
  },

  me(): Promise<CurrentUser> {
    return httpClient.get<CurrentUser>('/auth/me');
  },

  verifyEmail(token: string): Promise<CurrentUser> {
    return httpClient.post<CurrentUser>('/auth/verify-email', { token }, { skipAuth: true });
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
    return res;
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
