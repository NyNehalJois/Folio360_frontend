import type { CurrentUser } from '@/types/api';

export const PROFILE_CREATION_ROUTE = '/onboarding/profile';

/**
 * Determines whether a user has completed first-time profile setup using
 * the backend-authoritative `profile_completed` flag and `slug`.
 */
export function isProfileComplete(user: CurrentUser | null | undefined): boolean {
  if (!user) return false;
  if (typeof user.profile_completed === 'boolean') {
    return user.profile_completed && Boolean(user.slug);
  }
  return Boolean(user.slug);
}
