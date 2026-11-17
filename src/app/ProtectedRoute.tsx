import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/app/AuthContext';
import { LoadingState } from '@/design/components/EditorialStates';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireUsername?: boolean;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requireUsername = true,
}) => {
  const { user, isAuthenticated, isInitializing } = useAuth();
  const location = useLocation();

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-[var(--bg-main)] px-6 py-16">
        <div className="mx-auto max-w-xl">
          <LoadingState label="Restoring session" />
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user?.email_verified) {
    return <Navigate to="/auth/login" state={{ from: location.pathname }} replace />;
  }

  if (requireUsername && !user.slug) {
    return <Navigate to="/onboarding/username" state={{ from: location.pathname }} replace />;
  }

  return <>{children}</>;
};
