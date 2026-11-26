import React from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from '@/app/AuthContext';
import { ProtectedRoute } from '@/app/ProtectedRoute';
import { ThemeProvider } from '@/design/theme';
import { LoginPage } from '@/features/auth/LoginPage';
import { OAuthCallbackPage } from '@/features/auth/OAuthCallbackPage';
import { ForgotPasswordPage, ResetPasswordPage } from '@/features/auth/PasswordResetPages';
import { RegisterPage } from '@/features/auth/RegisterPage';
import {
  VerificationFailedPage,
  VerificationSentPage,
  VerificationSuccessPage,
  VerifyEmailPage,
} from '@/features/auth/VerifyEmailPages';
import { DocumentVaultPage } from '@/features/documents/DocumentVaultPage';
import { EducationPage } from '@/features/education/EducationPage';
import { HomePage } from '@/features/home/HomePage';
import { OverviewPage } from '@/features/overview/OverviewPage';
import { ProfileCreationPage } from '@/features/profile/ProfileCreationPage';
import { ProfilePage } from '@/features/profile/ProfilePage';
import { PublicProfilePage } from '@/features/profile/PublicProfilePage';
import { ModuleScaffoldPage } from '@/features/workspace/ModuleScaffoldPage';
import { WorkspaceLayout } from '@/layouts/WorkspaceLayout';
import {
  certificatesService,
  experienceService,
  projectsService,
  resumesService,
  sharingService,
  skillsService,
} from '@/services/api';

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/auth/login" element={<LoginPage />} />
            <Route path="/auth/register" element={<RegisterPage />} />
            <Route path="/auth/verify-email" element={<VerifyEmailPage />} />
            <Route path="/auth/verification-sent" element={<VerificationSentPage />} />
            <Route path="/auth/verification-success" element={<VerificationSuccessPage />} />
            <Route path="/auth/verification-failed" element={<VerificationFailedPage />} />
            <Route path="/auth/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/auth/reset-password" element={<ResetPasswordPage />} />
            <Route path="/auth/callback" element={<OAuthCallbackPage />} />
            <Route
              path="/onboarding/profile"
              element={
                <ProtectedRoute requireProfileComplete={false}>
                  <ProfileCreationPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/onboarding/username"
              element={<Navigate to="/onboarding/profile" replace />}
            />

            <Route
              path="/workspace"
              element={
                <ProtectedRoute>
                  <WorkspaceLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<OverviewPage />} />
              <Route path="profile" element={<ProfilePage />} />
              <Route path="education" element={<EducationPage />} />
              <Route
                path="projects"
                element={
                  <ModuleScaffoldPage
                    sectionCode="MODULE 05 & 06 — PROJECTS & GITHUB"
                    title="Projects Portfolio"
                    description="Curate projects, screenshots, reports, and authorized GitHub repository imports."
                    contractEndpoints={[
                      'GET /api/v1/projects',
                      'POST /api/v1/projects',
                      'GET /api/v1/github/repositories',
                      'POST /api/v1/github/repositories/import',
                    ]}
                    loadCount={async () => (await projectsService.list()).total}
                  />
                }
              />
              <Route
                path="skills"
                element={
                  <ModuleScaffoldPage
                    sectionCode="MODULE 07 — SKILLS"
                    title="Skills Management"
                    description="Organize technical and soft skills linked to your projects, certificates, and roles."
                    contractEndpoints={[
                      'GET /api/v1/skills/catalog',
                      'GET /api/v1/skills/me',
                      'POST /api/v1/skills/me',
                      'POST /api/v1/skills/suggestions',
                    ]}
                    loadCount={async () => (await skillsService.listMine()).total}
                  />
                }
              />
              <Route
                path="certificates"
                element={
                  <ModuleScaffoldPage
                    sectionCode="MODULE 08 — CERTIFICATES"
                    title="Certificates & Achievements"
                    description="Track credentials, verification URLs, and self-reported vs. link-provided statuses."
                    contractEndpoints={[
                      'GET /api/v1/certificates',
                      'POST /api/v1/certificates',
                      'GET /api/v1/achievements',
                    ]}
                    loadCount={async () => (await certificatesService.list()).total}
                  />
                }
              />
              <Route
                path="experience"
                element={
                  <ModuleScaffoldPage
                    sectionCode="MODULE 09 — EXPERIENCE"
                    title="Experience Timeline"
                    description="Document internships, employment, volunteering, mentorship, and leadership."
                    contractEndpoints={[
                      'GET /api/v1/experience',
                      'POST /api/v1/experience',
                      'PATCH /api/v1/experience/{id}',
                    ]}
                    loadCount={async () => (await experienceService.list()).total}
                  />
                }
              />
              <Route path="documents" element={<DocumentVaultPage />} />
              <Route
                path="resumes"
                element={
                  <ModuleScaffoldPage
                    sectionCode="MODULE 11 — RESUME STUDIO"
                    title="Resume Studio"
                    description="Standard editorial PDF resume builder and grounded AI-assisted tailoring."
                    contractEndpoints={[
                      'GET /api/v1/resumes/templates',
                      'POST /api/v1/resumes/{id}/preview',
                      'POST /api/v1/resumes/{id}/generate-pdf',
                      'POST /api/v1/resumes/ai/analyze-job',
                    ]}
                    loadCount={async () => (await resumesService.list()).total}
                  />
                }
              />
              <Route
                path="sharing"
                element={
                  <ModuleScaffoldPage
                    sectionCode="MODULE 12 & 13 — PUBLIC PROFILE & PRIVATE SHARING"
                    title="Sharing & QR"
                    description="Configure public profile visibility, generate QR codes, and manage expiring private links."
                    contractEndpoints={[
                      'GET /api/v1/profile/me/visibility',
                      'GET /api/v1/public/profiles/{slug}',
                      'POST /api/v1/sharing/links',
                      'GET /api/v1/sharing/links',
                    ]}
                    loadCount={async () => (await sharingService.listLinks()).total}
                  />
                }
              />
              <Route
                path="settings"
                element={
                  <ModuleScaffoldPage
                    sectionCode="ACCOUNT & PREFERENCES"
                    title="Settings"
                    description="Manage active sessions, OAuth connections, theme preferences, and security logs."
                    contractEndpoints={[
                      'GET /api/v1/account',
                      'GET /api/v1/auth/sessions',
                      'GET /api/v1/account/security-log',
                      'PATCH /api/v1/profile/me/preferences',
                    ]}
                  />
                }
              />
            </Route>

            <Route path="/u/:slug" element={<PublicProfilePage />} />
            <Route path="/:handle" element={<PublicProfilePage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;
