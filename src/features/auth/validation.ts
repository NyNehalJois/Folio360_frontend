import { ApiClientError } from '@/services/http';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME_REGEX = /^[a-z0-9_]{3,30}$/;

export function validateEmail(email: string): string | undefined {
  const trimmed = email.trim();
  if (!trimmed) return 'Email address is required.';
  if (!EMAIL_REGEX.test(trimmed)) return 'Enter a valid email address.';
  return undefined;
}

export function validateFullName(name: string): string | undefined {
  const trimmed = name.trim();
  if (!trimmed) return 'Full name is required.';
  if (trimmed.length < 2) return 'Full name must be at least 2 characters.';
  if (trimmed.length > 150) return 'Full name must be under 150 characters.';
  return undefined;
}

export function validatePassword(password: string): string | undefined {
  if (!password) return 'Password is required.';
  if (password.length < 12) return 'Password must be at least 12 characters.';
  if (password.length > 128) return 'Password must be 128 characters or fewer.';
  return undefined;
}

export function validateConfirmPassword(
  password: string,
  confirmPassword: string,
): string | undefined {
  if (!confirmPassword) return 'Please confirm your password.';
  if (password !== confirmPassword) return 'Passwords do not match.';
  return undefined;
}

export function validateUsername(username: string): string | undefined {
  if (!username) return 'Username is required.';
  if (/\s/.test(username)) return 'Username cannot contain spaces.';
  if (/[A-Z]/.test(username)) return 'Use lowercase letters only.';
  if (username.length < 3) return 'Username must be at least 3 characters.';
  if (username.length > 30) return 'Username must be 30 characters or fewer.';
  if (!USERNAME_REGEX.test(username)) {
    return 'Use only lowercase letters, numbers, and underscores.';
  }
  return undefined;
}

export function mapApiFieldErrors(err: ApiClientError): Record<string, string> {
  const mapped: Record<string, string> = {};
  for (const detail of err.details) {
    if (detail.field && detail.issue) {
      mapped[detail.field] = detail.issue;
    }
  }
  return mapped;
}
