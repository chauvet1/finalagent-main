/**
 * Navigation utilities for handling cross-portal navigation
 * Manages routing between client portal and admin portal with environment-aware URLs
 */

import { getUserRole, isAdmin, isClient } from './roleUtils';
import { getEnvironmentConfig, debugEnvironmentConfig } from '../config/environment';

// Portal URLs - Use centralized environment configuration
export const getPortalUrls = () => {
  const config = getEnvironmentConfig();
  return {
    CLIENT: config.portals.client,
    ADMIN: config.portals.admin,
    API: config.portals.api
  };
};

// Export PORTAL_URLS for backward compatibility
export const PORTAL_URLS = new Proxy({} as any, {
  get(target, prop) {
    const urls = getPortalUrls();
    return urls[prop as keyof typeof urls];
  }
});

// Debug function to log current portal URLs (uses centralized config)
export const debugPortalUrls = (): void => {
  debugEnvironmentConfig();
};

// Portal routes
export const PORTAL_ROUTES = {
  CLIENT: {
    DASHBOARD: '/dashboard',
    REPORTS: '/reports',
    MONITORING: '/monitoring',
    INCIDENTS: '/incidents',
    MESSAGES: '/messages',
    SETTINGS: '/settings',
    PROFILE: '/profile'
  },
  ADMIN: {
    DASHBOARD: '/dashboard',
    USERS: '/admin/users',
    OPERATIONS: '/operations',
    SITES: '/sites',
    REPORTS: '/reports',
    SETTINGS: '/settings'
  },
  LANDING: {
    HOME: '/',
    ADMIN_LOGIN: '/admin/login',
    CLIENT_LOGIN: '/client/login',
    CLIENT_SIGNUP: '/client/signup'
  }
};

/**
 * Navigate to admin portal with proper role checking
 */
export const navigateToAdminPortal = (user: any, route: string = ''): void => {
  const userRole = getUserRole(user);

  if (!isAdmin(userRole)) {
    console.warn('User does not have admin privileges:', userRole);
    // Redirect to admin portal login instead
    window.location.href = `${PORTAL_URLS.ADMIN}/sign-in`;
    return;
  }

  const adminUrl = `${PORTAL_URLS.ADMIN}${route}`;
  console.log('🧭 Navigation Debug:');
  console.log('- User role:', userRole);
  console.log('- Target URL:', adminUrl);
  console.log('- Current URL:', window.location.href);
  console.log('- Portal URLs:', PORTAL_URLS);

  console.log('🚀 Attempting redirect to admin portal...');

  // Try to open in the same window
  window.location.href = adminUrl;
};

/**
 * Navigate to client portal
 */
export const navigateToClientPortal = (route: string = '/dashboard'): void => {
  const clientUrl = `${PORTAL_URLS.CLIENT}${route}`;
  console.log('Navigating to client portal:', clientUrl);
  window.location.href = clientUrl;
};

/**
 * Get the appropriate portal URL for a user
 */
export const getPortalUrlForUser = (user: any): string => {
  const userRole = getUserRole(user);
  
  if (isAdmin(userRole)) {
    return `${PORTAL_URLS.ADMIN}/dashboard`;
  }
  
  return `${PORTAL_URLS.CLIENT}/dashboard`;
};

/**
 * Check if current URL is in the correct portal for user role
 */
export const isInCorrectPortal = (user: any): boolean => {
  const userRole = getUserRole(user);
  const currentUrl = window.location.href;
  
  if (isAdmin(userRole)) {
    return currentUrl.includes(PORTAL_URLS.ADMIN);
  }
  
  if (isClient(userRole)) {
    return currentUrl.includes(PORTAL_URLS.CLIENT);
  }
  
  return true; // Default to true for unknown roles
};

/**
 * Redirect user to correct portal if they're in the wrong one
 */
export const redirectToCorrectPortal = (user: any): void => {
  if (!user) return;
  
  if (!isInCorrectPortal(user)) {
    const correctUrl = getPortalUrlForUser(user);
    console.log('Redirecting to correct portal:', correctUrl);
    window.location.href = correctUrl;
  }
};

/**
 * Handle admin portal access attempt
 */
export const handleAdminPortalAccess = (_user?: any): void => {
  // Simple solution: redirect to admin sign-in page within the same app
  window.location.href = '/admin/sign-in';
};

/**
 * Handle client portal access attempt
 */
export const handleClientPortalAccess = (user: any): void => {
  if (!user) {
    // Not signed in, redirect to client login
    window.location.href = `${PORTAL_URLS.CLIENT}/client/login`;
    return;
  }
  
  // Any signed-in user can access client portal
  navigateToClientPortal();
};

/**
 * Get navigation items based on user role and current portal
 */
export const getNavigationItems = (user: any) => {
  const userRole = getUserRole(user);
  const currentUrl = window.location.href;
  const isInAdminPortal = currentUrl.includes(PORTAL_URLS.ADMIN);
  
  const items = [];
  
  if (isAdmin(userRole)) {
    items.push({
      label: 'Admin Dashboard',
      url: `${PORTAL_URLS.ADMIN}/dashboard`,
      active: isInAdminPortal,
      primary: true
    });
    
    items.push({
      label: 'Client Portal',
      url: `${PORTAL_URLS.CLIENT}/dashboard`,
      active: !isInAdminPortal,
      primary: false
    });
  } else {
    items.push({
      label: 'Client Dashboard',
      url: `${PORTAL_URLS.CLIENT}/dashboard`,
      active: true,
      primary: true
    });
  }
  
  return items;
};

/**
 * Debug navigation state
 */
export const debugNavigation = (user: any): void => {
  console.log('🧭 Navigation Debug:');
  console.log('- Current URL:', window.location.href);
  console.log('- User Role:', getUserRole(user));
  console.log('- Is Admin:', isAdmin(getUserRole(user)));
  console.log('- Is in Correct Portal:', isInCorrectPortal(user));
  console.log('- Correct Portal URL:', getPortalUrlForUser(user));
  console.log('- Navigation Items:', getNavigationItems(user));
};
