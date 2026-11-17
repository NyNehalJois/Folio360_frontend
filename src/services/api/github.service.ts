import { httpClient } from '@/services/http';
import type {
  GithubConnection,
  GithubImportResult,
  GithubRepo,
  Paginated,
  PaginationParams,
} from '@/types/api';

export const githubService = {
  connect(redirectUri?: string): Promise<{ authorization_url: string }> {
    return httpClient.post<{ authorization_url: string }>('/github/connect', {
      client_type: 'web',
      redirect_uri: redirectUri,
    });
  },

  getConnection(): Promise<GithubConnection> {
    return httpClient.get<GithubConnection>('/github/connection');
  },

  disconnect(): Promise<void> {
    return httpClient.delete('/github/connection');
  },

  listRepositories(params?: PaginationParams & { q?: string }): Promise<Paginated<GithubRepo>> {
    return httpClient.get<Paginated<GithubRepo>>('/github/repositories', {
      query: params as Record<string, string | number | undefined>,
    });
  },

  getRepository(owner: string, repo: string): Promise<GithubRepo> {
    return httpClient.get<GithubRepo>(`/github/repositories/${owner}/${repo}`);
  },

  importRepositories(repos: { full_name: string }[]): Promise<GithubImportResult> {
    return httpClient.post<GithubImportResult>('/github/repositories/import', { repos });
  },
};
