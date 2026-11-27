/* ==========================================================================
   FOLIO360 — API CONTRACT REVISION 2 TYPESCRIPT INTERFACES
   Source of truth: API Contract Revision 2 (/api/v1)
   ========================================================================== */

export type UUID = string;
export type Visibility = 'private' | 'public';
export type DateString = string; // YYYY-MM-DD
export type Timestamp = string;  // ISO 8601 UTC

export interface DocumentRef {
  id: UUID;
  title: string;
  category: DocumentCategory;
  mime_type: string;
}

export interface SignedUrl {
  url: string;
  expires_at: Timestamp;
}

/* --- Error & Pagination Conventions (§1.4, §1.5) --- */

export type ApiErrorCode =
  | 'BAD_REQUEST'
  | 'AI_CONSENT_REQUIRED'
  | 'UNAUTHENTICATED'
  | 'TOKEN_EXPIRED'
  | 'INVALID_CREDENTIALS'
  | 'EMAIL_NOT_VERIFIED'
  | 'REAUTH_REQUIRED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'DOCUMENT_NOT_FOUND'
  | 'EMAIL_TAKEN'
  | 'SLUG_TAKEN'
  | 'DOCUMENT_IN_USE'
  | 'ACCOUNT_EXISTS_UNVERIFIED'
  | 'OAUTH_EMAIL_UNVERIFIED'
  | 'OAUTH_DENIED'
  | 'OAUTH_STATE_INVALID'
  | 'PROCESSING_NOT_READY'
  | 'DOCUMENT_NOT_READY'
  | 'DOCUMENT_REJECTED'
  | 'DOCUMENT_SCAN_FAILED'
  | 'DOCUMENT_RESCAN_NOT_ALLOWED'
  | 'DOCUMENT_SCAN_RETRIES_EXHAUSTED'
  | 'INVALID_STATE_TRANSITION'
  | 'CONFLICT'
  | 'SHARE_LINK_EXPIRED'
  | 'SHARE_LINK_REVOKED'
  | 'FILE_TOO_LARGE'
  | 'UNSUPPORTED_FILE_TYPE'
  | 'MALFORMED_FILE'
  | 'VALIDATION_ERROR'
  | 'DOCUMENT_LINKING_NOT_ENABLED'
  | 'EDUCATION_NOT_FOUND'
  | 'INVALID_ACCESS_TOKEN'
  | 'INVALID_REFERENCE'
  | 'ANALYSIS_NOT_FOUND'
  | 'ANALYSIS_IN_PROGRESS'
  | 'ANALYSIS_ALREADY_COMPLETED'
  | 'ANALYSIS_ALREADY_EXISTS'
  | 'ANALYSIS_RETRY_NOT_ALLOWED'
  | 'ANALYSIS_RETRIES_EXHAUSTED'
  | 'ANALYSIS_INPUT_TOO_LARGE'
  | 'AI_ANALYZER_NOT_CONFIGURED'
  | 'RATE_LIMITED'
  | 'INTERNAL_ERROR'
  | 'AI_UNAVAILABLE'
  | 'OCR_UNAVAILABLE'
  | 'NETWORK_ERROR';

export interface ApiErrorDetail {
  field?: string;
  issue?: string;
  entity_type?: string;
  entity_id?: UUID;
  label?: string;
}

export interface ApiErrorPayload {
  error: {
    code: ApiErrorCode | string;
    message: string;
    details?: ApiErrorDetail[];
    request_id?: string;
  };
}

export interface PaginationParams {
  page?: number;
  page_size?: number;
  sort?: string;
}

export interface Paginated<T> {
  items: T[];
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
}

export interface ItemsResponse<T> {
  items: T[];
}

/* --- 5.0 System --- */

export interface HealthStatus {
  status: string;
  db: string;
  storage: string;
}

/* --- 5.1 Authentication (/auth) --- */

export type ClientType = 'web' | 'mobile';
export type OAuthProvider = 'google' | 'github';

export interface RegisterRequest {
  email: string;
  password: string;
  full_name: string;
  client_type: ClientType;
}

export interface LoginRequest {
  email: string;
  password: string;
  client_type: ClientType;
}

export interface TokenResponse {
  access_token: string;
  token_type: 'bearer';
  expires_in: number;
  refresh_token?: string; // mobile only; web uses httpOnly cookie
}

export interface CurrentUser {
  id: UUID;
  email: string;
  email_verified: boolean;
  /** Live backend field name (normalized into email_verified by authService) */
  is_email_verified?: boolean;
  full_name: string;
  slug: string;
  avatar_url: string | null;
  has_password: boolean;
  linked_providers: OAuthProvider[];
  oauth_providers?: OAuthProvider[];
  /** Backend contract dependency: indicates whether first-time profile setup is completed */
  profile_completed?: boolean;
  created_at: Timestamp;
}

export interface AuthResponse extends TokenResponse {
  user: CurrentUser;
  message?: string;
  verification_email_sent?: boolean;
}

export interface Session {
  id: UUID;
  client_type: ClientType;
  device_label: string;
  created_at: Timestamp;
  last_used_at: Timestamp;
  current: boolean;
}

export interface OAuthExchangeRequest {
  code: string;
  code_verifier?: string;
  exchange_code_verifier?: string;
}

/* --- 5.2 Account (/account) --- */

export interface Account {
  id: UUID;
  email: string;
  email_verified: boolean;
  pending_email: string | null;
  has_password: boolean;
  created_at: Timestamp;
}

export interface Connection {
  provider: OAuthProvider;
  provider_email: string | null;
  linked_at: Timestamp;
}

export interface AuditEvent {
  id: UUID;
  action: string;
  ip_address: string | null;
  device_label: string | null;
  created_at: Timestamp;
}

export interface DataExport {
  id: UUID;
  status: 'queued' | 'ready' | 'failed' | 'expired';
  download?: SignedUrl;
  created_at: Timestamp;
}

/* --- 5.3 Profile (/profile) --- */

export interface ProfileLinkItem {
  label: string;
  url: string;
}

export type ActivityCategory =
  | 'studying'
  | 'working'
  | 'interning'
  | 'freelancing'
  | 'job_seeking'
  | 'researching'
  | 'building_project'
  | 'learning_skills'
  | 'other';

export interface CurrentActivityItem {
  key: ActivityCategory;
  /** Custom label when key === 'other' */
  label?: string | null;
  description?: string | null;
}

export interface Profile {
  user_id: UUID;
  slug: string;
  public_url: string;
  full_name: string;
  /** Backend contract dependency: YYYY-MM-DD required during first-time profile creation */
  date_of_birth?: DateString | null;
  headline: string | null;
  bio: string | null;
  avatar_url: string | null;
  location: string | null;
  contact_email: string | null;
  phone: string | null;
  website: string | null;
  links: {
    linkedin?: string;
    github?: string;
    other: ProfileLinkItem[];
  };
  interests: string[];
  /** Backend contract dependency: multi-select current activities with optional descriptions */
  current_activities?: CurrentActivityItem[];
  /** Backend contract dependency: server-authoritative onboarding completion flag */
  profile_completed?: boolean;
  updated_at: Timestamp;
}

export type ProfileUpdate = Partial<
  Omit<Profile, 'user_id' | 'slug' | 'public_url' | 'avatar_url' | 'updated_at'>
>;

export interface InitialProfilePayload {
  full_name: string;
  slug: string;
  date_of_birth: DateString;
  bio?: string | null;
  interests?: string[];
  current_activities?: CurrentActivityItem[];
}

export interface PublicSettings {
  public_enabled: boolean;
  discoverable: boolean;
  public_sections: {
    education: boolean;
    projects: boolean;
    skills: boolean;
    certificates: boolean;
    experience: boolean;
    achievements: boolean;
    academics_cgpa: boolean;
  };
  public_contact: {
    show_email: boolean;
    show_phone: boolean;
    show_location: boolean;
  };
}

export type ThemePreference = 'light' | 'dark' | 'system';

export interface Preferences {
  theme: ThemePreference;
}

export interface CompletenessItem {
  key: string;
  label: string;
  done: boolean;
  weight: number;
  action_route: string;
}

export interface Completeness {
  percent: number;
  items: CompletenessItem[];
}

export interface SlugAvailability {
  slug: string;
  available: boolean;
  reason?: string;
}

/* --- 5.4 Education (/education) --- */

export type EducationResultType =
  | 'cgpa'
  | 'gpa'
  | 'percentage'
  | 'grade'
  | 'marks'
  | 'pass_fail'
  | 'other'
  | 'none';

export type EducationLevel =
  | 'school'
  | 'pre_university'
  | 'diploma'
  | 'undergraduate'
  | 'postgraduate'
  | 'doctorate'
  | 'other';

export interface EducationCreate {
  institution: string;
  /** Phase 2 backend dependency: separate university/board field in addition to affiliated institution */
  university_or_board?: string | null;
  /** Phase 2 backend dependency: education level classification */
  education_level?: EducationLevel | null;
  degree: string;
  programme?: string | null;
  branch?: string | null;
  specialization?: string | null;
  /** Phase 2 backend dependency: geographic fields */
  country?: string | null;
  state?: string | null;
  /** Phase 2 backend dependency: month-precision academic dates (1-12) */
  start_month?: number | null;
  start_year: number | null;
  end_month?: number | null;
  end_year?: number | null;
  is_current: boolean;
  /** Phase 2 backend dependency: optional qualification summary */
  description?: string | null;
  scheme_id?: string | null;
  result_type?: EducationResultType | null;
  result_value?: string | null;
  show_result_publicly: boolean;
  achievements: string[];
  document_ids?: UUID[];
  visibility: Visibility;
}

export interface Education extends Omit<EducationCreate, 'document_ids' | 'result_type'> {
  id: UUID;
  user_id?: UUID;
  result_type: EducationResultType | null;
  result_source: 'manual' | 'computed';
  computed_cgpa: number | null;
  document_ids?: UUID[];
  documents: DocumentRef[];
  created_at: Timestamp;
  updated_at: Timestamp;
}

/* --- 5.5 Academics (/academics) --- */

export interface DataStatus {
  verified: boolean;
  source_reference: string | null;
  verified_at: Timestamp | null;
}

export interface University {
  id: UUID;
  code: string;
  name: string;
}

export interface Scheme {
  id: UUID;
  university_id: UUID;
  code: string;
  name: string;
  data_status: DataStatus;
}

export interface Branch {
  id: UUID;
  code: string;
  name: string;
}

export interface SemesterInfo {
  number: number;
  total_credits: number;
}

export interface CurriculumSubject {
  id: UUID;
  code: string;
  name: string;
  credits: number;
  category: string;
  elective_group: string | null;
}

export interface Curriculum {
  scheme_id: UUID;
  branch_id: UUID;
  semester: number;
  data_status: DataStatus;
  subjects: CurriculumSubject[];
}

export interface GradeDefinition {
  grade: string;
  grade_point: number;
  min_marks: number | null;
  max_marks: number | null;
  is_pass: boolean;
}

export interface GradingScale {
  id: UUID;
  scheme_id: UUID;
  name: string;
  data_status: DataStatus;
  grades: GradeDefinition[];
  rules: {
    sgpa_decimals: number;
    rounding: 'round_half_up' | 'truncate';
    failed_credits_in_denominator: boolean;
    percentage_formula: string | null;
  };
}

export interface AcademicRecordCreate {
  education_id: UUID;
  semester: number;
  exam_session?: string;
  status: 'in_progress' | 'completed';
  grading_scale_id: UUID;
  document_ids: UUID[];
  notes?: string;
}

export interface SubjectMarks {
  internal?: number;
  external?: number;
  total?: number;
}

export interface SubjectResultInput {
  curriculum_subject_id?: UUID | null;
  code?: string;
  name?: string;
  credits?: number;
  grade: string;
  marks?: SubjectMarks;
}

export interface SubjectResult {
  id: UUID;
  curriculum_subject_id: UUID | null;
  is_manual: boolean;
  code: string;
  name: string;
  credits: number;
  grade: string;
  grade_point: number;
  marks: SubjectMarks | null;
}

export interface AcademicRecord {
  id: UUID;
  education_id: UUID;
  semester: number;
  exam_session: string | null;
  status: 'in_progress' | 'completed';
  grading_scale_id: UUID;
  subjects: SubjectResult[];
  sgpa: number | null;
  total_credits: number;
  credits_earned: number;
  documents: DocumentRef[];
  created_at: Timestamp;
  updated_at: Timestamp;
}

export type AcademicRecordSummary = Omit<AcademicRecord, 'subjects' | 'documents'>;

export interface AcademicSummary {
  education_id: UUID;
  cgpa: number | null;
  percentage: number | null;
  total_credits: number;
  credits_earned: number;
  semesters: {
    record_id: UUID;
    semester: number;
    sgpa: number | null;
    credits: number;
  }[];
  subject_performance: {
    grade: string;
    count: number;
  }[];
  data_status: DataStatus;
}

export interface SgpaCalcRequest {
  grading_scale_id: UUID;
  subjects: { credits: number; grade: string }[];
}

export interface SgpaCalcResult {
  sgpa: number | null;
  total_credits: number;
  credit_points: number;
  credits_earned: number;
}

export interface CgpaCalcRequest {
  grading_scale_id: UUID;
  semesters: { credits: number; grade: string }[][];
}

export interface CgpaCalcResult {
  cgpa: number | null;
  total_credits: number;
  credit_points: number;
}

/* --- 5.6 Projects (/projects) --- */

export interface ProjectCreate {
  title: string;
  summary: string;
  description?: string;
  category: string;
  technologies: string[];
  skill_ids: UUID[];
  github_url?: string | null;
  live_url?: string | null;
  start_date?: DateString | null;
  end_date?: DateString | null;
  is_ongoing: boolean;
  report_document_id?: UUID | null;
  featured: boolean;
  order: number;
  visibility: Visibility;
}

export interface ProjectImage {
  id: UUID;
  url: string;
  alt: string | null;
  order: number;
}

export interface Project extends Omit<ProjectCreate, 'report_document_id' | 'skill_ids'> {
  id: UUID;
  images: ProjectImage[];
  skills: { id: UUID; name: string }[];
  report_document: DocumentRef | null;
  github_import: { repo_full_name: string; imported_at: Timestamp } | null;
  created_at: Timestamp;
  updated_at: Timestamp;
}

/* --- 5.7 GitHub Integration (/github) --- */

export interface GithubConnection {
  connected: boolean;
  username: string | null;
  avatar_url: string | null;
  connected_at: Timestamp | null;
}

export interface GithubRepo {
  full_name: string;
  name: string;
  description: string | null;
  html_url: string;
  homepage: string | null;
  languages: Record<string, number>;
  topics: string[];
  stars: number;
  private?: boolean;
  updated_at: Timestamp;
  already_imported: boolean;
}

export interface GithubImportResult {
  created: Project[];
  skipped: { full_name: string; reason: string }[];
}

/* --- 5.8 Skills (/skills) --- */

export type SkillCategory =
  | 'language'
  | 'framework'
  | 'tool'
  | 'technical'
  | 'soft'
  | 'communication'
  | 'other';

export type ProficiencyLevel = 'beginner' | 'intermediate' | 'advanced' | 'expert';

export interface CatalogSkill {
  id: UUID;
  name: string;
  category: SkillCategory;
}

export interface UserSkillCreate {
  skill_id?: UUID;
  name?: string;
  category?: SkillCategory;
  proficiency?: ProficiencyLevel | null;
  project_ids: UUID[];
  certificate_ids: UUID[];
  experience_ids: UUID[];
  visibility: Visibility;
  order?: number;
}

export interface UserSkill {
  id: UUID;
  skill: CatalogSkill;
  proficiency: ProficiencyLevel | null;
  self_reported: true;
  used_in: {
    type: 'project' | 'certificate' | 'experience';
    id: UUID;
    label: string;
  }[];
  visibility: Visibility;
  order: number;
}

export interface SkillSuggestion {
  name: string;
  skill_id: UUID | null;
  category: SkillCategory;
  reasons: {
    source_type: 'project' | 'certificate' | 'experience';
    source_id: UUID;
    label: string;
    matched_text: string;
  }[];
}

/* --- 5.9 Certificates (/certificates) --- */

export type CertificateCategory =
  | 'course'
  | 'professional'
  | 'training'
  | 'workshop'
  | 'participation'
  | 'academic'
  | 'other';

export interface CertificateCreate {
  name: string;
  issuer: string;
  category?: CertificateCategory;
  issue_date?: DateString | null;
  expiry_date?: DateString | null;
  credential_id?: string | null;
  verification_url?: string | null;
  document_id?: UUID | null;
  skill_ids: UUID[];
  featured?: boolean;
  order?: number;
  visibility: Visibility;
}

export interface Certificate extends Omit<CertificateCreate, 'document_id' | 'skill_ids'> {
  id: UUID;
  category?: CertificateCategory;
  verification_status: 'self_reported' | 'link_provided' | 'issuer_verified';
  document: DocumentRef | null;
  skills: { id: UUID; name: string }[];
  featured?: boolean;
  order?: number;
  created_at: Timestamp;
  updated_at: Timestamp;
}

/* --- 5.10 Experience & Achievements --- */

export type ExperienceType =
  | 'internship'
  | 'employment'
  | 'freelance'
  | 'research'
  | 'volunteering'
  | 'mentorship'
  | 'leadership'
  | 'other';

export interface ExperienceCreate {
  type: ExperienceType;
  organization: string;
  role: string;
  location?: string | null;
  is_remote?: boolean;
  organization_url?: string | null;
  start_date: DateString;
  end_date?: DateString | null;
  is_current: boolean;
  description?: string | null;
  highlights: string[];
  skill_ids: UUID[];
  document_ids: UUID[];
  featured?: boolean;
  order?: number;
  visibility: Visibility;
}

export interface Experience extends Omit<ExperienceCreate, 'skill_ids' | 'document_ids'> {
  id: UUID;
  skills: { id: UUID; name: string }[];
  documents: DocumentRef[];
  created_at: Timestamp;
  updated_at: Timestamp;
}

export type AchievementCategory =
  | 'award'
  | 'competition'
  | 'publication'
  | 'scholarship'
  | 'academic_distinction'
  | 'hackathon'
  | 'leadership'
  | 'extracurricular'
  | 'other';

export interface AchievementCreate {
  title: string;
  category: AchievementCategory;
  organization?: string | null;
  date?: DateString | null;
  description?: string;
  document_ids: UUID[];
  featured?: boolean;
  order?: number;
  visibility: Visibility;
}

export interface Achievement extends Omit<AchievementCreate, 'document_ids'> {
  id: UUID;
  documents: DocumentRef[];
  featured?: boolean;
  order?: number;
  created_at: Timestamp;
  updated_at: Timestamp;
}

/* --- 5.11 Document Vault (/documents) --- */

export type DocumentCategory =
  | 'marksheet'
  | 'certificate'
  | 'resume'
  | 'identity'
  | 'project_report'
  | 'other';

export type DocumentMimeType = 'application/pdf' | 'image/jpeg' | 'image/png';

export type DocumentProcessingStatus =
  | 'pending_scan'
  | 'scanning'
  | 'ready'
  | 'rejected'
  | 'scan_failed';

export type DocumentFailureReason =
  | 'malware_detected'
  | 'validation_failed'
  | 'scanner_unavailable'
  | 'scanner_timeout'
  | 'scanner_error'
  | 'promotion_failed';

export interface DocumentCategoryInfo {
  key: DocumentCategory;
  label: string;
}

export interface DocumentAttachedToItem {
  entity_type: 'education' | 'certificate' | 'achievement' | 'experience';
  entity_id: UUID;
  label: string;
}

export interface Document {
  id: UUID;
  user_id?: UUID;
  title: string;
  original_filename: string;
  category: DocumentCategory;
  mime_type: DocumentMimeType;
  size_bytes: number;
  page_count: number | null;
  sha256: string;
  notes: string | null;
  processing_status: DocumentProcessingStatus;
  failure_reason: DocumentFailureReason | null;
  /** Controls whether this document is displayed in the Education tab */
  show_in_education: boolean;
  attached_to: DocumentAttachedToItem[];
  uploaded_at: Timestamp;
  updated_at: Timestamp;
}

export interface DocumentUploadResponse {
  document: Document;
  processing_job: null;
}

export interface DocumentPreviewUrl extends SignedUrl {
  mime_type: DocumentMimeType;
}

/* --- 5.12 AI Document Analysis (/documents/{id}/analysis) --- */

export type AnalysisStatus = 'pending' | 'processing' | 'completed' | 'failed';
export type AnalyzedDocumentType = 'marksheet' | 'certificate' | 'other';
export type AnalysisFailureReason =
  | 'provider_not_configured'
  | 'provider_unavailable'
  | 'provider_timeout'
  | 'provider_rate_limited'
  | 'invalid_provider_output'
  | 'unsupported_content'
  | 'analysis_error';

export interface MarksheetSubjectExtraction {
  subject_name: string;
  subject_code: string | null;
  marks_obtained: number | null;
  max_marks: number | null;
  grade: string | null;
  raw_mark_text: string | null;
  uncertain: boolean;
}

export interface MarksheetExtraction {
  institution_name: string | null;
  student_name: string | null;
  program_or_course: string | null;
  semester_or_exam: string | null;
  academic_year: string | null;
  subjects: MarksheetSubjectExtraction[];
  total_marks_obtained: number | null;
  total_max_marks: number | null;
  result_status: string | null;
}

export interface CertificateExtraction {
  certificate_title: string | null;
  issuing_institution: string | null;
  recipient_name: string | null;
  award_or_qualification: string | null;
  issue_date: string | null;
}

export interface DocumentExtractionPayload {
  document_type: AnalyzedDocumentType;
  is_verified: false;
  summary: string;
  confidence: number | null;
  uncertain_fields: string[];
  extracted_text_excerpt: string | null;
  marksheet: MarksheetExtraction | null;
  certificate: CertificateExtraction | null;
}

export interface DocumentAnalysisResponse {
  id: UUID;
  document_id: UUID;
  status: AnalysisStatus;
  document_type: AnalyzedDocumentType | null;
  is_verified: false;
  provider_name: string;
  model_name: string;
  analyzer_version: string;
  attempts: number;
  summary: string | null;
  extracted_data: DocumentExtractionPayload | null;
  confidence: number | null;
  uncertain_fields: string[];
  failure_reason: AnalysisFailureReason | null;
  started_at: Timestamp | null;
  completed_at: Timestamp | null;
  created_at: Timestamp;
  updated_at: Timestamp;
}

/* --- 5.13 Resume Studio (/resumes) --- */

export interface ResumeTemplate {
  id: UUID;
  key: string;
  name: string;
  description: string;
  preview_image_url: string;
}

export type ResumeSectionType =
  | 'summary'
  | 'education'
  | 'academics'
  | 'skills'
  | 'projects'
  | 'experience'
  | 'certificates'
  | 'achievements';

export interface ResumeSection {
  type: ResumeSectionType;
  enabled: boolean;
  order: number;
  title_override?: string | null;
  item_ids: UUID[];
}

export interface ResumeCreate {
  title: string;
  template_id: UUID;
  mode: 'standard' | 'tailored';
  personal: {
    show_email: boolean;
    show_phone: boolean;
    show_location: boolean;
    show_links: ('linkedin' | 'github' | 'website')[];
  };
  summary?: string | null;
  sections: ResumeSection[];
  overrides: Record<UUID, { bullets?: string[]; description?: string }>;
  analysis_id?: UUID | null;
}

export interface Resume extends ResumeCreate {
  id: UUID;
  last_pdf_at: Timestamp | null;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export type ResumeSummary = Pick<
  Resume,
  'id' | 'title' | 'mode' | 'template_id' | 'updated_at' | 'last_pdf_at'
>;

export interface JobAnalysis {
  analysis_id: UUID;
  title: string | null;
  requirements: {
    id: string;
    text: string;
    kind: 'skill' | 'experience' | 'education' | 'certification' | 'soft_skill';
    importance: 'required' | 'preferred';
    keywords: string[];
  }[];
  expires_at: Timestamp;
}

export interface ProfileMatch {
  analysis_id: UUID;
  matches: {
    requirement_id: string;
    status: 'matched' | 'partial' | 'missing';
    evidence: { entity_type: string; entity_id: UUID; label: string }[];
  }[];
  recommended: {
    project_ids: UUID[];
    experience_ids: UUID[];
    certificate_ids: UUID[];
    skill_ids: UUID[];
  };
  gaps: string[];
}

export interface AiGenerateRequest {
  analysis_id: UUID;
  consent: true;
  template_id: UUID;
  resume_id?: UUID;
  selected: {
    project_ids: UUID[];
    experience_ids: UUID[];
    certificate_ids: UUID[];
    skill_ids: UUID[];
    education_ids: UUID[];
  };
  tone?: 'concise' | 'detailed';
}

export interface AiDraft {
  resume: Resume;
  changes: {
    entity_type: string;
    entity_id: UUID;
    field: string;
    before: string;
    after: string;
  }[];
  warnings: string[];
}

/* --- 5.14 Public Profiles (/public) --- */

export interface PublicProfileCard {
  slug: string;
  full_name: string;
  headline: string | null;
  avatar_url: string | null;
  top_skills: string[];
}

export interface PublicProfile {
  slug: string;
  full_name: string;
  headline: string | null;
  bio: string | null;
  avatar_url: string | null;
  location?: string;
  contact_email?: string;
  phone?: string;
  links: {
    linkedin?: string;
    github?: string;
    website?: string;
    other: ProfileLinkItem[];
  };
  interests: string[];
  sections: {
    education?: {
      institution: string;
      university_or_board?: string | null;
      education_level?: EducationLevel | null;
      degree: string;
      programme?: string | null;
      branch?: string | null;
      specialization?: string | null;
      country?: string | null;
      state?: string | null;
      start_month?: number | null;
      start_year: number | null;
      end_month?: number | null;
      end_year: number | null;
      is_current?: boolean;
      description?: string | null;
      result?: string;
      achievements: string[];
      documents?: DocumentRef[];
    }[];
    education_documents?: DocumentRef[];
    academics?: { cgpa: number };
    projects?: {
      title: string;
      summary: string;
      description?: string;
      category: string;
      technologies: string[];
      images: { url: string; alt: string | null }[];
      github_url?: string;
      live_url?: string;
      start_date?: string;
      end_date?: string;
      featured: boolean;
    }[];
    skills?: {
      name: string;
      category: string;
      proficiency: string | null;
    }[];
    certificates?: {
      name: string;
      issuer: string;
      category?: string;
      issue_date?: string | null;
      expiry_date?: string | null;
      credential_id?: string | null;
      verification_url?: string | null;
      verification_status: string;
      featured?: boolean;
    }[];
    experience?: {
      type: string;
      organization: string;
      role: string;
      location?: string | null;
      is_remote?: boolean;
      organization_url?: string | null;
      start_date: string;
      end_date: string | null;
      is_current: boolean;
      description?: string | null;
      highlights: string[];
      skills?: string[];
      featured?: boolean;
    }[];
    achievements?: {
      title: string;
      category: string;
      organization?: string | null;
      date?: string | null;
      description?: string | null;
      featured?: boolean;
    }[];
  };
}

/* --- 5.15 Private Sharing (/sharing) --- */

export type ShareItemType =
  | 'document'
  | 'education'
  | 'academic_record'
  | 'certificate'
  | 'project'
  | 'experience'
  | 'achievement';

export interface ShareLinkCreate {
  label: string;
  items: { type: ShareItemType; id: UUID }[];
  expires_at: Timestamp;
  allow_download: boolean;
}

export interface ShareLink {
  id: UUID;
  label: string;
  url: string;
  items: { type: ShareItemType; id: UUID; label: string }[];
  expires_at: Timestamp;
  allow_download: boolean;
  status: 'active' | 'expired' | 'revoked';
  access_count: number;
  last_accessed_at: Timestamp | null;
  created_at: Timestamp;
  revoked_at: Timestamp | null;
}

export interface SharedBundle {
  owner: {
    full_name: string;
    headline: string | null;
    avatar_url: string | null;
  };
  label: string;
  expires_at: Timestamp;
  allow_download: boolean;
  items: (
    | {
        type: 'document';
        id: UUID;
        title: string;
        mime_type: string;
        category: string;
      }
    | {
        type: Exclude<ShareItemType, 'document'>;
        data: Record<string, unknown>;
      }
  )[];
}

/* --- 5.16 Analytics & Activity (/analytics, /activity) --- */

export type ActivityVerb =
  | 'created'
  | 'updated'
  | 'deleted'
  | 'uploaded'
  | 'confirmed'
  | 'generated'
  | 'shared';

export interface ActivityEvent {
  id: UUID;
  verb: ActivityVerb;
  entity_type: string;
  entity_id: UUID | null;
  label: string;
  created_at: Timestamp;
}

export interface DashboardSummary {
  first_name: string;
  completeness: { percent: number };
  continue_items: {
    key: string;
    label: string;
    action_route: string;
  }[];
  counts: {
    projects: number;
    skills: number;
    certificates: number;
    experience: number;
    documents: number;
    pending_reviews: number;
  };
  recent_activity: ActivityEvent[];
}

export interface SkillsAnalytics {
  by_category: { category: string; count: number }[];
  most_used: { name: string; usage_count: number }[];
}

export interface ProjectsAnalytics {
  total: number;
  public: number;
  by_category: { category: string; count: number }[];
  technologies: { name: string; count: number }[];
}
