import { httpClient } from '@/services/http';
import type {
  Achievement,
  AchievementCreate,
  Experience,
  ExperienceCreate,
  ExperienceType,
  Paginated,
  PaginationParams,
  UUID,
} from '@/types/api';

export const experienceService = {
  list(params?: PaginationParams & { type?: ExperienceType }): Promise<Paginated<Experience>> {
    return httpClient.get<Paginated<Experience>>('/experience', {
      query: params as Record<string, string | number | undefined>,
    });
  },

  create(payload: ExperienceCreate): Promise<Experience> {
    return httpClient.post<Experience>('/experience', payload);
  },

  get(experienceId: UUID): Promise<Experience> {
    return httpClient.get<Experience>(`/experience/${experienceId}`);
  },

  update(experienceId: UUID, payload: Partial<ExperienceCreate>): Promise<Experience> {
    return httpClient.patch<Experience>(`/experience/${experienceId}`, payload);
  },

  remove(experienceId: UUID): Promise<void> {
    return httpClient.delete(`/experience/${experienceId}`);
  },
};

export const achievementsService = {
  list(params?: PaginationParams): Promise<Paginated<Achievement>> {
    return httpClient.get<Paginated<Achievement>>('/achievements', {
      query: params as Record<string, string | number | undefined>,
    });
  },

  create(payload: AchievementCreate): Promise<Achievement> {
    return httpClient.post<Achievement>('/achievements', payload);
  },

  get(achievementId: UUID): Promise<Achievement> {
    return httpClient.get<Achievement>(`/achievements/${achievementId}`);
  },

  update(achievementId: UUID, payload: Partial<AchievementCreate>): Promise<Achievement> {
    return httpClient.patch<Achievement>(`/achievements/${achievementId}`, payload);
  },

  remove(achievementId: UUID): Promise<void> {
    return httpClient.delete(`/achievements/${achievementId}`);
  },
};
