import { httpClient } from '@/services/http';
import type {
  ActivityEvent,
  DashboardSummary,
  Paginated,
  PaginationParams,
  ProjectsAnalytics,
  SkillsAnalytics,
} from '@/types/api';

export const analyticsService = {
  getDashboard(): Promise<DashboardSummary> {
    return httpClient.get<DashboardSummary>('/analytics/dashboard');
  },

  getSkillsAnalytics(): Promise<SkillsAnalytics> {
    return httpClient.get<SkillsAnalytics>('/analytics/skills');
  },

  getProjectsAnalytics(): Promise<ProjectsAnalytics> {
    return httpClient.get<ProjectsAnalytics>('/analytics/projects');
  },

  listActivity(params?: PaginationParams): Promise<Paginated<ActivityEvent>> {
    return httpClient.get<Paginated<ActivityEvent>>('/activity', {
      query: params as Record<string, string | number | undefined>,
    });
  },
};
