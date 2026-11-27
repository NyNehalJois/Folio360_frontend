import { httpClient } from '@/services/http';
import type {
  Certificate,
  CertificateCategory,
  CertificateCreate,
  Paginated,
  PaginationParams,
  UUID,
  Visibility,
} from '@/types/api';

export const certificatesService = {
  list(
    params?: PaginationParams & {
      q?: string;
      category?: CertificateCategory;
      visibility?: Visibility;
      featured?: boolean;
    },
  ): Promise<Paginated<Certificate>> {
    return httpClient.get<Paginated<Certificate>>('/certificates', {
      query: params as Record<string, string | number | undefined>,
    });
  },

  create(payload: CertificateCreate): Promise<Certificate> {
    return httpClient.post<Certificate>('/certificates', payload);
  },

  get(certificateId: UUID): Promise<Certificate> {
    return httpClient.get<Certificate>(`/certificates/${certificateId}`);
  },

  update(certificateId: UUID, payload: Partial<CertificateCreate>): Promise<Certificate> {
    return httpClient.patch<Certificate>(`/certificates/${certificateId}`, payload);
  },

  remove(certificateId: UUID): Promise<void> {
    return httpClient.delete(`/certificates/${certificateId}`);
  },
};
