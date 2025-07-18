import { useUser, useSession, useClerk, useAuth as useClerkAuth } from '@clerk/clerk-react';
import { useMemo } from 'react';
import { createTokenProvider } from '../services/tokenProvider';
import { TokenProvider } from '../types/auth';

/**
 * Enhanced useAuth hook with token provider integration
 * Provides a unified authentication interface with proper token handling
 * Handles development mode without valid Clerk keys
 */
export const useAuth = () => {
  const clerkAuth = useClerkAuth();
  const { user: clerkUser, isLoaded: userLoaded } = useUser();
  const { session, isLoaded: sessionLoaded } = useSession();
  const { signOut } = useClerk();

  // Create token provider instance
  const tokenProvider: TokenProvider = useMemo(() => {
    return createTokenProvider(clerkAuth, {
      developmentMode: process.env.NODE_ENV === 'development',
      fallbackEmail: 'admin@bahinlink.com'
    });
  }, [clerkAuth]);

  // Basic authentication state
  const isLoaded = userLoaded && sessionLoaded;
  const isAuthenticated = clerkAuth.isSignedIn || false;
  const user = clerkUser;
  const role = clerkUser?.publicMetadata?.role || 'user';
  const permissions = clerkUser?.publicMetadata?.permissions || [];

  // Authentication methods
  const signIn = async () => {
    // Clerk handles sign-in through components
    return { success: true };
  };

  const signUp = async () => {
    // Clerk handles sign-up through components
    return { success: true };
  };

  const logout = async () => {
    try {
      await signOut();
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  };

  const clearAuthError = () => {
    // No-op for now
  };

  // Permission checking utilities
  const hasPermission = (permission: string): boolean => {
    return Array.isArray(permissions) && permissions.includes(permission);
  };

  const hasRole = (requiredRole: string): boolean => {
    return role === requiredRole;
  };

  const hasAnyRole = (roles: string[]): boolean => {
    return typeof role === 'string' ? roles.includes(role) : false;
  };

  // Simple user display info
  const userDisplayInfo = user ? {
    name: user.firstName && user.lastName
      ? `${user.firstName} ${user.lastName}`
      : user.username || 'User',
    email: user.primaryEmailAddress?.emailAddress || '',
    role: user.publicMetadata?.role as string || 'user'
  } : null;

  // Enhanced token management using TokenProvider
  const getToken = async (): Promise<string | null> => {
    try {
      return await tokenProvider.getAuthToken();
    } catch (error) {
      console.debug('Failed to get token via provider:', error);
      return null;
    }
  };

  // Get token type
  const getTokenType = async () => {
    try {
      return await tokenProvider.getTokenType();
    } catch (error) {
      console.debug('Failed to get token type:', error);
      return null;
    }
  };

  // Check if valid token is available
  const hasValidToken = async (): Promise<boolean> => {
    try {
      return await tokenProvider.hasValidToken();
    } catch (error) {
      console.debug('Failed to check token validity:', error);
      return false;
    }
  };

  return {
    // User data
    user,
    session,

    // Authentication state
    isAuthenticated,
    isLoaded,
    isLoading: !isLoaded,
    error: null,

    // User metadata
    role,
    permissions,
    organizationId: null,

    // Authentication methods
    signIn,
    signUp,
    logout,
    clearAuthError,

    // Permission utilities
    hasPermission,
    hasRole,
    hasAnyRole,

    // Enhanced token management
    getToken,
    getTokenType,
    hasValidToken,
    tokenProvider,

    // User display info
    userDisplayInfo,

    // Legacy compatibility (for gradual migration)
    login: signIn,
  };
};
