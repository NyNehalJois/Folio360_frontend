import { httpClient } from '@/services/http';
import type {
  AcademicRecord,
  AcademicRecordCreate,
  AcademicRecordSummary,
  AcademicSummary,
  Branch,
  CgpaCalcRequest,
  CgpaCalcResult,
  Curriculum,
  GradingScale,
  ItemsResponse,
  Paginated,
  PaginationParams,
  Scheme,
  SemesterInfo,
  SgpaCalcRequest,
  SgpaCalcResult,
  SubjectResultInput,
  University,
  UUID,
} from '@/types/api';

export const academicsService = {
  listUniversities(): Promise<ItemsResponse<University>> {
    return httpClient.get<ItemsResponse<University>>('/academics/universities');
  },

  listSchemes(universityId: UUID): Promise<ItemsResponse<Scheme>> {
    return httpClient.get<ItemsResponse<Scheme>>('/academics/schemes', {
      query: { university_id: universityId },
    });
  },

  listBranches(schemeId: UUID): Promise<ItemsResponse<Branch>> {
    return httpClient.get<ItemsResponse<Branch>>('/academics/branches', {
      query: { scheme_id: schemeId },
    });
  },

  listSemesters(schemeId: UUID, branchId: UUID): Promise<ItemsResponse<SemesterInfo>> {
    return httpClient.get<ItemsResponse<SemesterInfo>>('/academics/semesters', {
      query: { scheme_id: schemeId, branch_id: branchId },
    });
  },

  getCurriculum(schemeId: UUID, branchId: UUID, semester: number): Promise<Curriculum> {
    return httpClient.get<Curriculum>('/academics/curriculum', {
      query: { scheme_id: schemeId, branch_id: branchId, semester },
    });
  },

  listGradingScales(schemeId: UUID): Promise<ItemsResponse<GradingScale>> {
    return httpClient.get<ItemsResponse<GradingScale>>('/academics/grading-scales', {
      query: { scheme_id: schemeId },
    });
  },

  listRecords(
    params?: PaginationParams & { education_id?: UUID },
  ): Promise<Paginated<AcademicRecordSummary>> {
    return httpClient.get<Paginated<AcademicRecordSummary>>('/academics/records', {
      query: params as Record<string, string | number | undefined>,
    });
  },

  createRecord(payload: AcademicRecordCreate): Promise<AcademicRecord> {
    return httpClient.post<AcademicRecord>('/academics/records', payload);
  },

  getRecord(recordId: UUID): Promise<AcademicRecord> {
    return httpClient.get<AcademicRecord>(`/academics/records/${recordId}`);
  },

  updateRecord(
    recordId: UUID,
    payload: Partial<Omit<AcademicRecordCreate, 'education_id'>>,
  ): Promise<AcademicRecord> {
    return httpClient.patch<AcademicRecord>(`/academics/records/${recordId}`, payload);
  },

  deleteRecord(recordId: UUID): Promise<void> {
    return httpClient.delete(`/academics/records/${recordId}`);
  },

  addSubjects(
    recordId: UUID,
    payload: SubjectResultInput | { items: SubjectResultInput[] },
  ): Promise<AcademicRecord> {
    return httpClient.post<AcademicRecord>(`/academics/records/${recordId}/subjects`, payload);
  },

  updateSubject(
    recordId: UUID,
    resultId: UUID,
    payload: Partial<SubjectResultInput>,
  ): Promise<AcademicRecord> {
    return httpClient.patch<AcademicRecord>(
      `/academics/records/${recordId}/subjects/${resultId}`,
      payload,
    );
  },

  deleteSubject(recordId: UUID, resultId: UUID): Promise<AcademicRecord> {
    return httpClient.delete<AcademicRecord>(
      `/academics/records/${recordId}/subjects/${resultId}`,
    );
  },

  getSummary(educationId: UUID): Promise<AcademicSummary> {
    return httpClient.get<AcademicSummary>('/academics/summary', {
      query: { education_id: educationId },
    });
  },

  calculateSgpa(payload: SgpaCalcRequest): Promise<SgpaCalcResult> {
    return httpClient.post<SgpaCalcResult>('/academics/calculate/sgpa', payload);
  },

  calculateCgpa(payload: CgpaCalcRequest): Promise<CgpaCalcResult> {
    return httpClient.post<CgpaCalcResult>('/academics/calculate/cgpa', payload);
  },
};
