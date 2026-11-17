import { httpClient } from '@/services/http';
import type {
  Paginated,
  PaginationParams,
  Project,
  ProjectCreate,
  ProjectImage,
  UUID,
  Visibility,
} from '@/types/api';

export const projectsService = {
  list(
    params?: PaginationParams & { visibility?: Visibility; category?: string; q?: string },
  ): Promise<Paginated<Project>> {
    return httpClient.get<Paginated<Project>>('/projects', {
      query: params as Record<string, string | number | undefined>,
    });
  },

  create(payload: ProjectCreate): Promise<Project> {
    return httpClient.post<Project>('/projects', payload);
  },

  get(projectId: UUID): Promise<Project> {
    return httpClient.get<Project>(`/projects/${projectId}`);
  },

  update(projectId: UUID, payload: Partial<ProjectCreate>): Promise<Project> {
    return httpClient.patch<Project>(`/projects/${projectId}`, payload);
  },

  remove(projectId: UUID): Promise<void> {
    return httpClient.delete(`/projects/${projectId}`);
  },

  uploadImage(projectId: UUID, file: File, alt?: string): Promise<ProjectImage> {
    const formData = new FormData();
    formData.append('file', file);
    if (alt) formData.append('alt', alt);
    return httpClient.post<ProjectImage>(`/projects/${projectId}/images`, formData);
  },

  updateImage(
    projectId: UUID,
    imageId: UUID,
    payload: { alt?: string; order?: number },
  ): Promise<ProjectImage> {
    return httpClient.patch<ProjectImage>(`/projects/${projectId}/images/${imageId}`, payload);
  },

  removeImage(projectId: UUID, imageId: UUID): Promise<void> {
    return httpClient.delete(`/projects/${projectId}/images/${imageId}`);
  },
};
