import React from 'react';
import { ClerkProvider as BaseClerkProvider } from '@clerk/clerk-react';
import { ENV } from '../utils/env';

interface ClerkProviderProps {
  children: React.ReactNode;
}

/**
 * Clerk Authentication Provider
 * Wraps the application with Clerk's authentication context
 */
export const ClerkProvider: React.FC<ClerkProviderProps> = ({ children }) => {
  // Validate environment configuration
  if (!ENV.clerk.publishableKey) {
    throw new Error(
      'Missing Clerk publishable key. Please set REACT_APP_CLERK_PUBLISHABLE_KEY in your environment variables.'
    );
  }

  // Determine if we need admin prefix based on environment
  const needsAdminPrefix = process.env.NODE_ENV === 'production';

  return (
    <BaseClerkProvider
      publishableKey={ENV.clerk.publishableKey}
      routerPush={(to: string) => {
        // Add /admin prefix only in production
        const finalPath = needsAdminPrefix && !to.startsWith('/admin') ? `/admin${to}` : to;
        window.history.pushState({}, '', finalPath);
      }}
      routerReplace={(to: string) => {
        // Add /admin prefix only in production
        const finalPath = needsAdminPrefix && !to.startsWith('/admin') ? `/admin${to}` : to;
        window.history.replaceState({}, '', finalPath);
      }}
    >
      {children}
    </BaseClerkProvider>
  );
};
