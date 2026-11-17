import { httpClient } from '@/services/http';
import type {
  Completeness,
  Preferences,
  Profile,
  ProfileUpdate,
  PublicSettings,
  SlugAvailability,
} from '@/types/api';

export const profileService = {
  getMe(): Promise<Profile> {
    return httpClient.get<Profile>('/profile/me');
  },

  updateMe(payload: ProfileUpdate): Promise<Profile> {
    return httpClient.patch<Profile>('/profile/me', payload);
  },

  uploadAvatar(file: File): Promise<{ avatar_url: string }> {
    const formData = new FormData();
    formData.append('file', file);
    return httpClient.post<{ avatar_url: string }>('/profile/me/avatar', formData);
  },

  removeAvatar(): Promise<void> {
    return httpClient.delete('/profile/me/avatar');
  },

  checkSlugAvailability(slug: string): Promise<SlugAvailability> {
    return httpClient.get<SlugAvailability>('/profile/slug-availability', {
      query: { slug },
    });
  },

  updateSlug(slug: string): Promise<Profile> {
    return httpClient.patch<Profile>('/profile/me/slug', { slug });
  },

  getVisibility(): Promise<PublicSettings> {
    return httpClient.get<PublicSettings>('/profile/me/visibility');
  },

  updateVisibility(payload: Partial<PublicSettings>): Promise<PublicSettings> {
    return httpClient.patch<PublicSettings>('/profile/me/visibility', payload);
  },

  getPreferences(): Promise<Preferences> {
    return httpClient.get<Preferences>('/profile/me/preferences');
  },

  updatePreferences(payload: Partial<Preferences>): Promise<Preferences> {
    return httpClient.patch<Preferences>('/profile/me/preferences', payload);
  },

  getCompleteness(): Promise<Completeness> {
    return httpClient.get<Completeness>('/profile/me/completeness');
  },
};
