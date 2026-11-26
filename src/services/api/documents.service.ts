import { httpClient } from '@/services/http';
import type {
  Document,
  DocumentCategory,
  DocumentCategoryInfo,
  ItemsResponse,
  Paginated,
  PaginationParams,
  ProcessingConfirm,
  ProcessingJob,
  ProcessingResult,
  SignedUrl,
  UUID,
} from '@/types/api';

export const documentsService = {
  listCategories(): Promise<ItemsResponse<DocumentCategoryInfo>> {
    return httpClient.get<ItemsResponse<DocumentCategoryInfo>>('/documents/categories');
  },

  upload(
    file: File,
    options?: { category?: DocumentCategory; title?: string; auto_process?: boolean },
  ): Promise<{ document: Document; processing_job: ProcessingJob | null }> {
    const formData = new FormData();
    formData.append('file', file);
    if (options?.category) formData.append('category', options.category);
    if (options?.title) formData.append('title', options.title);
    if (options?.auto_process !== undefined) {
      formData.append('auto_process', String(options.auto_process));
    }
    return httpClient.post<{ document: Document; processing_job: ProcessingJob | null }>(
      '/documents',
      formData,
    );
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
      notes?: string;
      show_in_education?: boolean;
    },
  ): Promise<Document> {
    return httpClient.patch<Document>(`/documents/${documentId}`, payload);
  },

  getPreviewUrl(documentId: UUID): Promise<SignedUrl & { mime_type: string }> {
    return httpClient.get<SignedUrl & { mime_type: string }>(`/documents/${documentId}/preview`);
  },

  getDownloadUrl(documentId: UUID): Promise<SignedUrl> {
    return httpClient.get<SignedUrl>(`/documents/${documentId}/download`);
  },

  remove(documentId: UUID, force = false): Promise<void> {
    return httpClient.delete(`/documents/${documentId}`, {
      query: force ? { force: true } : undefined,
    });
  },

  /* --- Document Processing / OCR (§5.12) --- */

  startProcessing(documentId: UUID): Promise<ProcessingJob> {
    return httpClient.post<ProcessingJob>(`/document-processing/${documentId}/start`);
  },

  getReviewQueue(params?: PaginationParams): Promise<Paginated<ProcessingJob>> {
    return httpClient.get<Paginated<ProcessingJob>>('/document-processing/review-queue', {
      query: params as Record<string, string | number | undefined>,
    });
  },

  getProcessingJob(jobId: UUID): Promise<ProcessingJob> {
    return httpClient.get<ProcessingJob>(`/document-processing/${jobId}`);
  },

  getProcessingResult(jobId: UUID): Promise<ProcessingResult> {
    return httpClient.get<ProcessingResult>(`/document-processing/${jobId}/result`);
  },

  confirmProcessing(
    jobId: UUID,
    payload: ProcessingConfirm,
  ): Promise<{ document: Document; created_or_updated: { entity_type: string; entity_id: UUID } | null }> {
    return httpClient.post(`/document-processing/${jobId}/confirm`, payload);
  },

  rejectProcessing(jobId: UUID): Promise<ProcessingJob> {
    return httpClient.post<ProcessingJob>(`/document-processing/${jobId}/reject`);
  },
};
