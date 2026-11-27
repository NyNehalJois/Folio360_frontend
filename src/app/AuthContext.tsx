import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { authService } from '@/services/api';
import { ApiClientError, httpClient, tokenStore } from '@/services/http';
import type { CurrentUser } from '@/types/api';

export interface RegisterOutcome {
  user: CurrentUser;
  requiresVerification: boolean;
  verificationEmailSent: boolean;
  message?: string;
}

interface AuthContextValue {
  user: CurrentUser | null;
  isAuthenticated: boolean;
  isInitializing: boolean;
  login: (email: string, password: string) => Promise<CurrentUser>;
  register: (fullName: string, email: string, password: string) => Promise<RegisterOutcome>;
  exchangeOAuth: (code: string, codeVerifier?: string) => Promise<CurrentUser>;
  logout: () => Promise<void>;
  logoutAll: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    let active = true;
    async function restore() {
      try {
        const token = await httpClient.tryRestoreSession();
        if (token && active) {
          const me = await authService.me();
          if (active && (me.email_verified ?? me.is_email_verified)) {
            setUser(me);
          } else if (active) {
            tokenStore.clear();
            setUser(null);
          }
        }
      } catch {
        tokenStore.clear();
        if (active) setUser(null);
      } finally {
        if (active) setIsInitializing(false);
      }
    }
    restore();
    return () => {
      active = false;
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await authService.login({ email, password });
    if (!(res.user.email_verified ?? res.user.is_email_verified)) {
      tokenStore.clear();
      setUser(null);
      throw new ApiClientError(
        403,
        'EMAIL_NOT_VERIFIED',
        'Please verify your email address before signing in.',
      );
    }
    setUser(res.user);
    return res.user;
  }, []);

  const register = useCallback(
    async (fullName: string, email: string, password: string): Promise<RegisterOutcome> => {
      const res = await authService.register({ full_name: fullName, email, password });
      const requiresVerification =
        !(res.user.email_verified ?? res.user.is_email_verified) || !res.access_token;

      if (requiresVerification) {
        tokenStore.clear();
        setUser(null);
      } else {
        setUser(res.user);
      }

      return {
        user: res.user,
        requiresVerification,
        verificationEmailSent: res.verification_email_sent !== false,
        message: res.message,
      };
    },
    [],
  );

  const exchangeOAuth = useCallback(async (code: string, codeVerifier?: string) => {
    const res = await authService.exchangeOAuthCode({ code, code_verifier: codeVerifier });
    if (!(res.user.email_verified ?? res.user.is_email_verified)) {
      tokenStore.clear();
      setUser(null);
      throw new ApiClientError(
        403,
        'EMAIL_NOT_VERIFIED',
        'Please verify your email address before signing in.',
      );
    }
    setUser(res.user);
    return res.user;
  }, []);

  const logout = useCallback(async () => {
    await authService.logout();
    setUser(null);
  }, []);

  const logoutAll = useCallback(async () => {
    await authService.logoutAll();
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    const me = await authService.me();
    setUser(me);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: Boolean(user),
        isInitializing,
        login,
        register,
        exchangeOAuth,
        logout,
        logoutAll,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
