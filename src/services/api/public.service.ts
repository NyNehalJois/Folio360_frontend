import { httpClient } from '@/services/http';
import type {
  Paginated,
  PaginationParams,
  PublicProfile,
  PublicProfileCard,
} from '@/types/api';

export const publicService = {
  exploreProfiles(
    params?: PaginationParams & { q?: string; skill?: string },
  ): Promise<Paginated<PublicProfileCard>> {
    return httpClient.get<Paginated<PublicProfileCard>>('/public/profiles/explore', {
      query: params as Record<string, string | number | undefined>,
      skipAuth: true,
    });
  },

  getProfile(slug: string): Promise<PublicProfile> {
    return httpClient.get<PublicProfile>(`/public/profiles/${encodeURIComponent(slug)}`, {
      skipAuth: true,
    });
  },
};
