import { httpClient } from '@/services/http';
import type {
  Account,
  AuditEvent,
  Connection,
  DataExport,
  ItemsResponse,
  OAuthProvider,
  Paginated,
  PaginationParams,
} from '@/types/api';

export const accountService = {
  get(): Promise<Account> {
    return httpClient.get<Account>('/account');
  },

  requestEmailChange(payload: {
    new_email: string;
    current_password?: string;
  }): Promise<{ message: string; pending_email?: string | null }> {
    return httpClient.post<{ message: string; pending_email?: string | null }>(
      '/account/email',
      payload,
    );
  },

  confirmEmailChange(token: string): Promise<Account> {
    return httpClient.post<Account>('/account/email/confirm', { token }, { skipAuth: true });
  },

  changePassword(payload: { current_password?: string; new_password: string }): Promise<void> {
    return httpClient.post('/account/password', payload);
  },

  listConnections(): Promise<ItemsResponse<Connection>> {
    return httpClient.get<ItemsResponse<Connection>>('/account/connections');
  },

  startConnection(provider: OAuthProvider): Promise<{ authorization_url: string }> {
    return httpClient.post<{ authorization_url: string }>(
      `/account/connections/${provider}/start`,
      { client_type: 'web' },
    );
  },

  unlinkConnection(provider: OAuthProvider, currentPassword?: string): Promise<void> {
    return httpClient.delete(`/account/connections/${provider}`, {
      body: currentPassword ? { current_password: currentPassword } : undefined,
    });
  },

  listSecurityLog(params?: PaginationParams): Promise<Paginated<AuditEvent>> {
    return httpClient.get<Paginated<AuditEvent>>('/account/security-log', {
      query: params as Record<string, string | number | undefined>,
    });
  },

  requestExport(currentPassword?: string): Promise<Record<string, unknown>> {
    return httpClient.post<Record<string, unknown>>(
      '/account/export',
      currentPassword ? { current_password: currentPassword } : undefined,
    );
  },

  getExport(exportId: string): Promise<DataExport> {
    return httpClient.get<DataExport>(`/account/export/${exportId}`);
  },

  deleteAccount(payload: { current_password?: string; confirm: 'DELETE' }): Promise<void> {
    return httpClient.delete('/account', { body: payload });
  },
};
