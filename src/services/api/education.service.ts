import { API_CONFIG } from '@/services/config';
import { httpClient } from '@/services/http';
import type {
  Education,
  EducationCreate,
  Paginated,
  PaginationParams,
  UUID,
} from '@/types/api';

function sanitizeCreatePayload(payload: EducationCreate): EducationCreate {
  if (API_CONFIG.useMocks) return payload;
  return {
    ...payload,
    result_type: payload.result_type === 'none' ? null : payload.result_type ?? null,
    document_ids: payload.document_ids ?? [],
  };
}

function sanitizeUpdatePayload(payload: Partial<EducationCreate>): Partial<EducationCreate> {
  if (API_CONFIG.useMocks) return payload;
  const next: Partial<EducationCreate> = { ...payload };
  if (next.result_type === 'none') {
    next.result_type = null;
  }
  if (Array.isArray(next.document_ids) && next.document_ids.length === 0) {
    delete next.document_ids;
  }
  return next;
}

export const educationService = {
  list(params?: PaginationParams): Promise<Paginated<Education>> {
    return httpClient.get<Paginated<Education>>('/education', {
      query: params as Record<string, string | number | undefined>,
    });
  },

  create(payload: EducationCreate): Promise<Education> {
    return httpClient.post<Education>('/education', sanitizeCreatePayload(payload));
  },

  get(educationId: UUID): Promise<Education> {
    return httpClient.get<Education>(`/education/${educationId}`);
  },

  update(educationId: UUID, payload: Partial<EducationCreate>): Promise<Education> {
    return httpClient.patch<Education>(
      `/education/${educationId}`,
      sanitizeUpdatePayload(payload),
    );
  },

  remove(educationId: UUID): Promise<void> {
    return httpClient.delete(`/education/${educationId}`);
  },
};
