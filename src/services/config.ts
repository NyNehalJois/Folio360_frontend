export const API_CONFIG = {
  useMocks: import.meta.env.VITE_USE_MOCKS !== 'false',
  apiBaseUrl: (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? '/api/v1',
  publicBaseUrl: (import.meta.env.VITE_PUBLIC_BASE_URL as string | undefined) ?? 'https://folio360.in',
} as const;
