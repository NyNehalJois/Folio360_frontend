import { httpClient } from '@/services/http';
import type {
  Education,
  EducationCreate,
  Paginated,
  PaginationParams,
  UUID,
} from '@/types/api';

export const educationService = {
  list(params?: PaginationParams): Promise<Paginated<Education>> {
    return httpClient.get<Paginated<Education>>('/education', {
      query: params as Record<string, string | number | undefined>,
    });
  },

  create(payload: EducationCreate): Promise<Education> {
    return httpClient.post<Education>('/education', payload);
  },

  get(educationId: UUID): Promise<Education> {
    return httpClient.get<Education>(`/education/${educationId}`);
  },

  update(educationId: UUID, payload: Partial<EducationCreate>): Promise<Education> {
    return httpClient.patch<Education>(`/education/${educationId}`, payload);
  },

  remove(educationId: UUID): Promise<void> {
    return httpClient.delete(`/education/${educationId}`);
  },
};
