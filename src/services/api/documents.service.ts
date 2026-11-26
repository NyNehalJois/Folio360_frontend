import { httpClient } from '@/services/http';
import type {
  Document,
  DocumentAnalysisResponse,
  DocumentCategory,
  DocumentCategoryInfo,
  DocumentPreviewUrl,
  DocumentUploadResponse,
  ItemsResponse,
  Paginated,
  PaginationParams,
  SignedUrl,
  UUID,
} from '@/types/api';

export const documentsService = {
  listCategories(): Promise<ItemsResponse<DocumentCategoryInfo>> {
    return httpClient.get<ItemsResponse<DocumentCategoryInfo>>('/documents/categories');
  },

  upload(
    file: File,
    options?: {
      category?: DocumentCategory;
      title?: string;
      notes?: string;
      show_in_education?: boolean;
    },
  ): Promise<DocumentUploadResponse> {
    const formData = new FormData();
    formData.append('file', file);
    if (options?.category) formData.append('category', options.category);
    if (options?.title) formData.append('title', options.title);
    if (options?.notes !== undefined && options.notes !== '') {
      formData.append('notes', options.notes);
    }
    if (options?.show_in_education !== undefined) {
      formData.append('show_in_education', String(options.show_in_education));
    }
    return httpClient.post<DocumentUploadResponse>('/documents', formData);
  },

  list(
    params?: PaginationParams & {
      q?: string;
      category?: DocumentCategory;
      uploaded_from?: string;
      uploaded_to?: string;
    },
  ): Promise<Paginated<Document>> {
    return httpClient.get<Paginated<Document>>('/documents', {
      query: params as Record<string, string | number | undefined>,
    });
  },

  get(documentId: UUID): Promise<Document> {
    return httpClient.get<Document>(`/documents/${documentId}`);
  },

  update(
    documentId: UUID,
    payload: {
      title?: string;
      category?: DocumentCategory;
      notes?: string | null;
      show_in_education?: boolean;
    },
  ): Promise<Document> {
    return httpClient.patch<Document>(`/documents/${documentId}`, payload);
  },

  rescan(documentId: UUID): Promise<Document> {
    return httpClient.post<Document>(`/documents/${documentId}/rescan`);
  },

  getPreviewUrl(documentId: UUID): Promise<DocumentPreviewUrl> {
    return httpClient.get<DocumentPreviewUrl>(`/documents/${documentId}/preview`);
  },

  getDownloadUrl(documentId: UUID): Promise<SignedUrl> {
    return httpClient.get<SignedUrl>(`/documents/${documentId}/download`);
  },

  remove(documentId: UUID, force = false): Promise<void> {
    return httpClient.delete(`/documents/${documentId}`, {
      query: force ? { force: true } : undefined,
    });
  },

  /* --- Stage 6: AI Document Analysis (/documents/{id}/analysis) --- */

  requestAnalysis(documentId: UUID): Promise<DocumentAnalysisResponse> {
    return httpClient.post<DocumentAnalysisResponse>(`/documents/${documentId}/analysis`);
  },

  getAnalysis(documentId: UUID): Promise<DocumentAnalysisResponse> {
    return httpClient.get<DocumentAnalysisResponse>(`/documents/${documentId}/analysis`);
  },

  retryAnalysis(documentId: UUID): Promise<DocumentAnalysisResponse> {
    return httpClient.post<DocumentAnalysisResponse>(`/documents/${documentId}/analysis/retry`);
  },
};

export function openDocumentSignedUrl(
  url: string,
  kind: 'preview' | 'download',
  filename?: string,
): void {
  if (kind === 'download' && url.startsWith('blob:') && typeof document !== 'undefined') {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename || 'document';
    link.rel = 'noopener noreferrer';
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    link.remove();
    return;
  }
  window.open(url, '_blank', 'noopener,noreferrer');
}
