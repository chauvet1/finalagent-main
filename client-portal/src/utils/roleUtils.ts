/**
 * Role-based utility functions for authentication and authorization
 */

export type UserRole = 'admin' | 'supervisor' | 'client' | 'agent' | 'user' | 'ADMIN' | 'SUPERVISOR' | 'CLIENT' | 'AGENT' | 'USER';

/**
 * Check if a user has admin privileges
 */
export const isAdmin = (role?: string | null): boolean => {
  if (!role) return false;
  const normalizedRole = role.toLowerCase();
  return normalizedRole === 'admin' || normalizedRole === 'supervisor';
};

/**
 * Check if a user has client privileges
 */
export const isClient = (role?: string | null): boolean => {
  if (!role) return false;
  const normalizedRole = role.toLowerCase();
  return normalizedRole === 'client' || normalizedRole === 'user';
};

/**
 * Check if a user has agent privileges
 */
export const isAgent = (role?: string | null): boolean => {
  if (!role) return false;
  const normalizedRole = role.toLowerCase();
  return normalizedRole === 'agent';
};

/**
 * Get the appropriate portal URL for a user based on their role
 */
export const getPortalUrlForRole = (role?: string | null): string => {
  if (isAdmin(role)) {
    return '/admin';
  }
  return '/dashboard'; // Default to client dashboard
};

/**
 * Check if a user can access the admin portal
 */
export const canAccessAdminPortal = (role?: string | null): boolean => {
  return isAdmin(role);
};

/**
 * Check if a user can access the client portal
 */
export const canAccessClientPortal = (role?: string | null): boolean => {
  // Admin users can access client portal for support purposes
  // Client users can access client portal
  return isAdmin(role) || isClient(role);
};

/**
 * Get user role from Clerk user object with fallback handling
 */
export const getUserRole = (user: any): string => {
  if (!user) return 'user';

  // Check public metadata first (primary source)
  const metadataRole = user.publicMetadata?.role as string;
  if (metadataRole) {
    return metadataRole.toUpperCase();
  }

  // Fallback to private metadata if available
  const privateRole = user.privateMetadata?.role as string;
  if (privateRole) {
    return privateRole.toUpperCase();
  }

  // Default fallback
  return 'CLIENT';
};

/**
 * Format role for display
 */
export const formatRoleForDisplay = (role?: string | null): string => {
  if (!role) return 'User';
  
  const roleMap: Record<string, string> = {
    'admin': 'Administrator',
    'supervisor': 'Supervisor',
    'client': 'Client',
    'agent': 'Security Agent',
    'user': 'User',
    'ADMIN': 'Administrator',
    'SUPERVISOR': 'Supervisor',
    'CLIENT': 'Client',
    'AGENT': 'Security Agent',
    'USER': 'User',
  };
  
  return roleMap[role] || role;
};

/**
 * Get role-specific welcome message
 */
export const getRoleWelcomeMessage = (role?: string | null): string => {
  if (isAdmin(role)) {
    return 'Welcome to the BahinLink Admin Portal';
  }
  if (isClient(role)) {
    return 'Welcome to your BahinLink Client Portal';
  }
  if (isAgent(role)) {
    return 'Welcome to the BahinLink Agent Portal';
  }
  return 'Welcome to BahinLink';
};

/**
 * Get role-specific navigation items
 */
export const getRoleNavigation = (role?: string | null) => {
  if (isAdmin(role)) {
    return {
      primaryAction: { label: 'Admin Dashboard', url: '/admin' },
      secondaryAction: { label: 'Client Portal', url: '/dashboard' },
    };
  }
  
  if (isClient(role)) {
    return {
      primaryAction: { label: 'Client Dashboard', url: '/dashboard' },
      secondaryAction: null,
    };
  }
  
  return {
    primaryAction: { label: 'Sign In', url: '/client/login' },
    secondaryAction: { label: 'Admin Portal', url: '/admin/login' },
  };
};

/**
 * Validate and normalize user role
 */
export const validateAndNormalizeRole = (role?: string | null): string => {
  if (!role) return 'CLIENT';

  const normalizedRole = role.toUpperCase().trim();
  const validRoles = ['ADMIN', 'SUPERVISOR', 'CLIENT', 'AGENT', 'USER'];

  if (validRoles.includes(normalizedRole)) {
    // Convert USER to CLIENT for consistency
    return normalizedRole === 'USER' ? 'CLIENT' : normalizedRole;
  }

  // Default fallback
  return 'CLIENT';
};

/**
 * Debug user role information
 */
export const debugUserRole = (user: any): void => {
  if (!user) {
    console.log('🔍 Role Debug: No user provided');
    return;
  }

  console.log('🔍 Role Debug Information:');
  console.log('- User ID:', user.id);
  console.log('- Email:', user.primaryEmailAddress?.emailAddress);
  console.log('- Public Metadata Role:', user.publicMetadata?.role);
  console.log('- Private Metadata Role:', user.privateMetadata?.role);
  console.log('- Computed Role:', getUserRole(user));
  console.log('- Is Admin:', isAdmin(getUserRole(user)));
  console.log('- Is Client:', isClient(getUserRole(user)));
  console.log('- Can Access Admin Portal:', canAccessAdminPortal(getUserRole(user)));
  console.log('- Can Access Client Portal:', canAccessClientPortal(getUserRole(user)));
};
