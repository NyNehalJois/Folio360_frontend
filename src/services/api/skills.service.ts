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

export type SkillCategoryKey = 'technical' | 'tool' | 'soft';

export type SkillProficiency = 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert';

export interface SkillRecord {
  id: UUID;
  user_id?: UUID;
  name: string;
  category: string;
  proficiency: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface SkillRecordCreate {
  name: string;
  category: SkillCategoryKey;
  proficiency: SkillProficiency | null;
}

export interface GapAnalysisRequest {
  target_role: string;
}

export interface GapAnalysisResponse {
  match_percentage: number;
  missing_skills: string[];
  recommendations: string[];
}

export type SkillImportSource = 'project' | 'resume';

export interface SkillImportCandidate {
  name: string;
  category: SkillCategoryKey;
  proficiency: string | null;
  source: SkillImportSource;
  source_label: string | null;
}

export interface SkillImportPreviewRequest {
  sources?: SkillImportSource[];
  document_id?: UUID | null;
}

export interface SkillImportPreviewResponse {
  candidates: SkillImportCandidate[];
  skipped_existing: string[];
  notes: string[];
}

export interface SkillBulkCreateRequest {
  skills: SkillRecordCreate[];
}

export interface SkillBulkCreateResponse {
  created: SkillRecord[];
  skipped: string[];
}

/**
 * Normalize either the flat backend SkillResponse or nested mock UserSkill
 * into a unified SkillRecord shape.
 */
export function normalizeSkillRecord(raw: Record<string, unknown>): SkillRecord {
  const nestedSkill =
    raw.skill && typeof raw.skill === 'object'
      ? (raw.skill as Record<string, unknown>)
      : null;

  const rawName = typeof raw.name === 'string'
    ? raw.name
    : typeof nestedSkill?.name === 'string'
      ? nestedSkill.name
      : '';

  const rawCategory = typeof raw.category === 'string'
    ? raw.category
    : typeof nestedSkill?.category === 'string'
      ? nestedSkill.category
      : 'technical';

  const rawProficiency =
    typeof raw.proficiency === 'string' && raw.proficiency.trim()
      ? raw.proficiency.trim()
      : null;

  return {
    id: String(raw.id ?? ''),
    user_id: typeof raw.user_id === 'string' ? raw.user_id : undefined,
    name: rawName,
    category: rawCategory,
    proficiency: rawProficiency,
    created_at: typeof raw.created_at === 'string' ? raw.created_at : undefined,
    updated_at: typeof raw.updated_at === 'string' ? raw.updated_at : undefined,
  };
}

export const skillsService = {
  async listMySkills(
    params?: PaginationParams & { category?: string },
  ): Promise<Paginated<SkillRecord>> {
    const res = await httpClient.get<Paginated<Record<string, unknown>>>('/skills/me', {
      query: params as Record<string, string | number | undefined>,
    });
    return {
      ...res,
      items: res.items.map(normalizeSkillRecord),
    };
  },

  async createSkill(payload: SkillRecordCreate): Promise<SkillRecord> {
    const raw = await httpClient.post<Record<string, unknown>>('/skills/me', payload);
    return normalizeSkillRecord(raw);
  },

  async updateSkillRecord(
    skillId: UUID,
    payload: Partial<SkillRecordCreate>,
  ): Promise<SkillRecord> {
    const raw = await httpClient.patch<Record<string, unknown>>(`/skills/me/${skillId}`, payload);
    return normalizeSkillRecord(raw);
  },

  deleteSkill(skillId: UUID): Promise<void> {
    return httpClient.delete(`/skills/me/${skillId}`);
  },

  analyzeGaps(data: GapAnalysisRequest): Promise<GapAnalysisResponse> {
    return httpClient.post<GapAnalysisResponse>('/skills/analyze-gaps', data);
  },

  previewSkillImports(
    payload: SkillImportPreviewRequest = { sources: ['project', 'resume'] },
  ): Promise<SkillImportPreviewResponse> {
    return httpClient.post<SkillImportPreviewResponse>('/skills/me/import-preview', payload);
  },

  async bulkCreateSkills(
    payload: SkillBulkCreateRequest,
  ): Promise<SkillBulkCreateResponse> {
    const res = await httpClient.post<{
      created: Record<string, unknown>[];
      skipped: string[];
    }>('/skills/me/bulk', payload);
    return {
      created: (res.created ?? []).map(normalizeSkillRecord),
      skipped: res.skipped ?? [],
    };
  },

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
