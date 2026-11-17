import { httpClient } from '@/services/http';
import type {
  CatalogSkill,
  ItemsResponse,
  Paginated,
  PaginationParams,
  SkillCategory,
  SkillSuggestion,
  UserSkill,
  UserSkillCreate,
  UUID,
} from '@/types/api';

export const skillsService = {
  searchCatalog(q: string, category?: SkillCategory): Promise<ItemsResponse<CatalogSkill>> {
    return httpClient.get<ItemsResponse<CatalogSkill>>('/skills/catalog', {
      query: { q, category },
    });
  },

  listMine(
    params?: PaginationParams & { category?: SkillCategory },
  ): Promise<Paginated<UserSkill>> {
    return httpClient.get<Paginated<UserSkill>>('/skills/me', {
      query: params as Record<string, string | number | undefined>,
    });
  },

  addSkill(payload: UserSkillCreate): Promise<UserSkill> {
    return httpClient.post<UserSkill>('/skills/me', payload);
  },

  updateSkill(
    userSkillId: UUID,
    payload: Partial<Omit<UserSkillCreate, 'skill_id' | 'name'>>,
  ): Promise<UserSkill> {
    return httpClient.patch<UserSkill>(`/skills/me/${userSkillId}`, payload);
  },

  removeSkill(userSkillId: UUID): Promise<void> {
    return httpClient.delete(`/skills/me/${userSkillId}`);
  },

  getSuggestions(): Promise<ItemsResponse<SkillSuggestion>> {
    return httpClient.post<ItemsResponse<SkillSuggestion>>('/skills/suggestions', {});
  },
};
