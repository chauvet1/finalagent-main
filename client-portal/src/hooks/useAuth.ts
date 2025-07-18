import { useAuth as useClerkAuth, useUser } from '@clerk/clerk-react';
import { useMemo } from 'react';
import { createTokenProvider } from '../services/tokenProvider';
import { TokenProvider } from '../types/auth';

export function useAuth() {
  const clerkAuth = useClerkAuth();
  const { isSignedIn, isLoaded } = clerkAuth;
  const { user } = useUser();

  // Create token provider instance
  const tokenProvider: TokenProvider = useMemo(() => {
    return createTokenProvider(clerkAuth, {
      developmentMode: process.env.NODE_ENV === 'development',
      fallbackEmail: 'client@bahinlink.com'
    });
  }, [clerkAuth]);

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
    isAuthenticated: isSignedIn,
    isLoading: !isLoaded,
    user,
    
    // Enhanced token management
    getToken,
    getTokenType,
    hasValidToken,
    tokenProvider,
    
    // Legacy compatibility for existing components
    name: user?.firstName && user?.lastName
      ? `${user.firstName} ${user.lastName}`
      : user?.username || 'User',
    email: user?.primaryEmailAddress?.emailAddress || 'user@example.com'
  };
}
