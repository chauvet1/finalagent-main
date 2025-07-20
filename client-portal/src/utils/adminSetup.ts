/**
 * Admin Setup Utility for Development
 * This utility helps set up admin users during development
 */

import { useUser } from '@clerk/clerk-react';

export interface AdminSetupConfig {
  email: string;
  role: 'ADMIN' | 'SUPERVISOR';
  permissions?: string[];
}

/**
 * Default admin configuration for development
 */
export const DEFAULT_ADMIN_CONFIG: AdminSetupConfig = {
  email: 'admin@bahinlink.com',
  role: 'ADMIN',
  permissions: ['all']
};

/**
 * Development admin emails that should automatically get admin roles
 */
export const DEV_ADMIN_EMAILS = [
  'admin@bahinlink.com',
  'supervisor@bahinlink.com',
  'test@bahinlink.com',
  'demo@bahinlink.com'
];

/**
 * Check if an email should have admin privileges in development
 */
export const isDevAdminEmail = (email?: string): boolean => {
  if (!email) return false;
  return DEV_ADMIN_EMAILS.includes(email.toLowerCase());
};

/**
 * Auto-assign admin role for development users
 */
export const autoAssignAdminRole = async (user: any): Promise<boolean> => {
  if (!user) return false;

  const email = user.primaryEmailAddress?.emailAddress;
  if (!email) return false;

  // Check if user should be admin
  if (isDevAdminEmail(email)) {
    try {
      // Update user metadata with admin role
      await user.update({
        publicMetadata: {
          ...user.publicMetadata,
          role: 'ADMIN',
          permissions: ['all'],
          autoAssigned: true,
          assignedAt: new Date().toISOString()
        }
      });

      console.log('✅ Auto-assigned admin role to:', email);
      return true;
    } catch (error) {
      console.error('❌ Failed to auto-assign admin role:', error);
      return false;
    }
  }

  return false;
};

/**
 * Manually assign admin role to current user (for development)
 */
export const assignAdminRoleToCurrentUser = async (user: any, role: 'ADMIN' | 'SUPERVISOR' = 'ADMIN'): Promise<boolean> => {
  if (!user) return false;

  try {
    await user.update({
      publicMetadata: {
        ...user.publicMetadata,
        role: role,
        permissions: ['all'],
        manuallyAssigned: true,
        assignedAt: new Date().toISOString()
      }
    });

    console.log(`✅ Manually assigned ${role} role to:`, user.primaryEmailAddress?.emailAddress);
    return true;
  } catch (error) {
    console.error('❌ Failed to manually assign admin role:', error);
    return false;
  }
};

/**
 * Remove admin role from current user
 */
export const removeAdminRole = async (user: any): Promise<boolean> => {
  if (!user) return false;

  try {
    await user.update({
      publicMetadata: {
        ...user.publicMetadata,
        role: 'CLIENT',
        permissions: [],
        roleRemovedAt: new Date().toISOString()
      }
    });

    console.log('✅ Removed admin role from:', user.primaryEmailAddress?.emailAddress);
    return true;
  } catch (error) {
    console.error('❌ Failed to remove admin role:', error);
    return false;
  }
};

/**
 * Get current user role status
 */
export const getUserRoleStatus = (user: any) => {
  if (!user) return null;

  const role = user.publicMetadata?.role || 'CLIENT';
  const permissions = user.publicMetadata?.permissions || [];
  const email = user.primaryEmailAddress?.emailAddress;

  return {
    email,
    role,
    permissions,
    isAdmin: role === 'ADMIN' || role === 'SUPERVISOR',
    autoAssigned: user.publicMetadata?.autoAssigned || false,
    manuallyAssigned: user.publicMetadata?.manuallyAssigned || false,
    assignedAt: user.publicMetadata?.assignedAt,
  };
};

/**
 * Development helper to log user role information
 */
export const logUserRoleInfo = (user: any) => {
  const status = getUserRoleStatus(user);
  if (!status) {
    console.log('🔍 No user provided for role info');
    return;
  }

  console.log('🔍 User Role Information:');
  console.log('- Email:', status.email);
  console.log('- Role:', status.role);
  console.log('- Is Admin:', status.isAdmin);
  console.log('- Permissions:', status.permissions);
  console.log('- Auto Assigned:', status.autoAssigned);
  console.log('- Manually Assigned:', status.manuallyAssigned);
  console.log('- Assigned At:', status.assignedAt);
};

/**
 * React hook for admin setup functionality
 */
export const useAdminSetup = () => {
  const { user } = useUser();

  const assignAdmin = async (role: 'ADMIN' | 'SUPERVISOR' = 'ADMIN') => {
    return await assignAdminRoleToCurrentUser(user, role);
  };

  const removeAdmin = async () => {
    return await removeAdminRole(user);
  };

  const autoAssign = async () => {
    return await autoAssignAdminRole(user);
  };

  const getRoleStatus = () => {
    return getUserRoleStatus(user);
  };

  const logRoleInfo = () => {
    logUserRoleInfo(user);
  };

  return {
    user,
    assignAdmin,
    removeAdmin,
    autoAssign,
    getRoleStatus,
    logRoleInfo,
    isDevAdminEmail: isDevAdminEmail(user?.primaryEmailAddress?.emailAddress)
  };
};
