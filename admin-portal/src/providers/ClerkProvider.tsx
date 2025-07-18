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

  return (
    <BaseClerkProvider
      publishableKey={ENV.clerk.publishableKey}
      routerPush={(to: string) => {
        // Ensure all Clerk navigation respects the /admin basename
        const adminPath = to.startsWith('/admin') ? to : `/admin${to}`;
        window.history.pushState({}, '', adminPath);
      }}
      routerReplace={(to: string) => {
        // Ensure all Clerk navigation respects the /admin basename
        const adminPath = to.startsWith('/admin') ? to : `/admin${to}`;
        window.history.replaceState({}, '', adminPath);
      }}
    >
      {children}
    </BaseClerkProvider>
  );
};
