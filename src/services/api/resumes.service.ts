import { httpClient } from '@/services/http';
import type {
  AiDraft,
  AiGenerateRequest,
  ItemsResponse,
  JobAnalysis,
  Paginated,
  PaginationParams,
  ProfileMatch,
  Resume,
  ResumeCreate,
  ResumeSummary,
  ResumeTemplate,
  SignedUrl,
  UUID,
} from '@/types/api';

export const resumesService = {
  listTemplates(): Promise<ItemsResponse<ResumeTemplate>> {
    return httpClient.get<ItemsResponse<ResumeTemplate>>('/resumes/templates');
  },

  list(params?: PaginationParams): Promise<Paginated<ResumeSummary>> {
    return httpClient.get<Paginated<ResumeSummary>>('/resumes', {
      query: params as Record<string, string | number | undefined>,
    });
  },

  create(payload: ResumeCreate): Promise<Resume> {
    return httpClient.post<Resume>('/resumes', payload);
  },

  get(resumeId: UUID): Promise<Resume> {
    return httpClient.get<Resume>(`/resumes/${resumeId}`);
  },

  update(resumeId: UUID, payload: Partial<ResumeCreate>): Promise<Resume> {
    return httpClient.patch<Resume>(`/resumes/${resumeId}`, payload);
  },

  remove(resumeId: UUID): Promise<void> {
    return httpClient.delete(`/resumes/${resumeId}`);
  },

  preview(resumeId: UUID): Promise<{ html: string }> {
    return httpClient.post<{ html: string }>(`/resumes/${resumeId}/preview`);
  },

  generatePdf(
    resumeId: UUID,
    saveToVault = false,
  ): Promise<{ generated_at: string; document_id: UUID | null }> {
    return httpClient.post(`/resumes/${resumeId}/generate-pdf`, {
      save_to_vault: saveToVault,
    });
  },

  getDownloadUrl(resumeId: UUID): Promise<SignedUrl> {
    return httpClient.get<SignedUrl>(`/resumes/${resumeId}/download`);
  },

  /* --- AI-assisted tailoring --- */

  analyzeJob(jobDescription: string): Promise<JobAnalysis> {
    return httpClient.post<JobAnalysis>('/resumes/ai/analyze-job', {
      job_description: jobDescription,
      consent: true,
    });
  },

  matchProfile(analysisId: UUID): Promise<ProfileMatch> {
    return httpClient.post<ProfileMatch>('/resumes/ai/match-profile', {
      analysis_id: analysisId,
    });
  },

  generateTailored(payload: AiGenerateRequest): Promise<AiDraft> {
    return httpClient.post<AiDraft>('/resumes/ai/generate', payload);
  },
};
