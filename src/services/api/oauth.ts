import { authService } from '@/services/api/auth.service';
import type { OAuthProvider } from '@/types/api';

const OAUTH_TX_STORAGE_KEY = 'f360_oauth_tx';

interface OAuthTransaction {
  provider: OAuthProvider;
  state: string;
  codeVerifier: string;
  redirectTo: string;
  createdAt: number;
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function randomBase64Url(byteLength = 32): string {
  const buf = new Uint8Array(byteLength);
  crypto.getRandomValues(buf);
  return toBase64Url(buf);
}

async function computeS256Challenge(verifier: string): Promise<string> {
  const encoded = new TextEncoder().encode(verifier);
  const digest = await crypto.subtle.digest('SHA-256', encoded);
  return toBase64Url(new Uint8Array(digest));
}

export async function prepareOAuthStartUrl(
  provider: OAuthProvider,
  redirectTo = '/workspace',
): Promise<string> {
  const state = randomBase64Url(24);
  const codeVerifier = randomBase64Url(32);
  const codeChallenge = await computeS256Challenge(codeVerifier);

  const tx: OAuthTransaction = {
    provider,
    state,
    codeVerifier,
    redirectTo,
    createdAt: Date.now(),
  };

  try {
    sessionStorage.setItem(OAUTH_TX_STORAGE_KEY, JSON.stringify(tx));
  } catch {
    // Ignore storage unavailability
  }

  const callbackUri =
    typeof window !== 'undefined'
      ? `${window.location.origin}/auth/oauth/callback`
      : undefined;

  return authService.getOAuthStartUrl(provider, {
    redirectTo,
    redirectUri: callbackUri,
    state,
    codeChallenge,
    codeChallengeMethod: 'S256',
  });
}

export function consumeOAuthTransaction(returnedState: string | null): {
  valid: boolean;
  transaction: OAuthTransaction | null;
  reason?: string;
} {
  let raw: string | null = null;
  try {
    raw = sessionStorage.getItem(OAUTH_TX_STORAGE_KEY);
    sessionStorage.removeItem(OAUTH_TX_STORAGE_KEY);
  } catch {
    return { valid: true, transaction: null };
  }

  if (!raw) {
    // Backend-initiated state validation may still apply when tx isn't stored client-side
    return { valid: true, transaction: null };
  }

  try {
    const tx = JSON.parse(raw) as OAuthTransaction;
    const isExpired = Date.now() - tx.createdAt > 10 * 60 * 1000;
    if (isExpired) {
      return { valid: false, transaction: null, reason: 'OAUTH_STATE_INVALID' };
    }
    if (returnedState && tx.state !== returnedState) {
      return { valid: false, transaction: null, reason: 'OAUTH_STATE_INVALID' };
    }
    return { valid: true, transaction: tx };
  } catch {
    return { valid: false, transaction: null, reason: 'OAUTH_STATE_INVALID' };
  }
}
