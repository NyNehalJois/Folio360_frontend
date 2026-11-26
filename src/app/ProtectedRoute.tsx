import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/app/AuthContext';
import { isProfileComplete, PROFILE_CREATION_ROUTE } from '@/app/profileCompletion';
import { LoadingState } from '@/design/components/EditorialStates';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireProfileComplete?: boolean;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requireProfileComplete = true,
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

  if (!isAuthenticated || !(user?.email_verified ?? user?.is_email_verified)) {
    return <Navigate to="/auth/login" state={{ from: location.pathname }} replace />;
  }

  if (requireProfileComplete && !isProfileComplete(user)) {
    return <Navigate to={PROFILE_CREATION_ROUTE} state={{ from: location.pathname }} replace />;
  }

  return <>{children}</>;
};
