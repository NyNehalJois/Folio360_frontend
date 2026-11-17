import { httpClient } from '@/services/http';
import type {
  Paginated,
  PaginationParams,
  SharedBundle,
  ShareLink,
  ShareLinkCreate,
  SignedUrl,
  UUID,
} from '@/types/api';

export const sharingService = {
  createLink(payload: ShareLinkCreate): Promise<ShareLink> {
    return httpClient.post<ShareLink>('/sharing/links', payload);
  },

  listLinks(
    params?: PaginationParams & { status?: 'active' | 'expired' | 'revoked' },
  ): Promise<Paginated<ShareLink>> {
    return httpClient.get<Paginated<ShareLink>>('/sharing/links', {
      query: params as Record<string, string | number | undefined>,
    });
  },

  getLink(linkId: UUID): Promise<ShareLink> {
    return httpClient.get<ShareLink>(`/sharing/links/${linkId}`);
  },

  updateLink(
    linkId: UUID,
    payload: Partial<ShareLinkCreate>,
  ): Promise<ShareLink> {
    return httpClient.patch<ShareLink>(`/sharing/links/${linkId}`, payload);
  },

  revokeLink(linkId: UUID): Promise<void> {
    return httpClient.delete(`/sharing/links/${linkId}`);
  },

  accessSharedBundle(token: string): Promise<SharedBundle> {
    return httpClient.get<SharedBundle>(`/sharing/access/${encodeURIComponent(token)}`, {
      skipAuth: true,
    });
  },

  getSharedDocumentUrl(
    token: string,
    documentId: UUID,
    disposition: 'inline' | 'attachment' = 'inline',
  ): Promise<SignedUrl> {
    return httpClient.get<SignedUrl>(
      `/sharing/access/${encodeURIComponent(token)}/documents/${documentId}`,
      {
        query: { disposition },
        skipAuth: true,
      },
    );
  },
};
