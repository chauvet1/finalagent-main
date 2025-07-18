import React from 'react';
import { useUser } from '@clerk/clerk-react';
import { Navigate } from 'react-router-dom';
import { Box, Alert, AlertTitle, Typography, Button } from '@mui/material';
import { AdminPanelSettings as AdminIcon } from '@mui/icons-material';
import { getUserRole, isAdmin, isClient } from '../../utils/roleUtils';

interface RoleGuardProps {
  children: React.ReactNode;
  requiredRole?: 'admin' | 'client' | 'any';
  fallbackPath?: string;
  showError?: boolean;
}

/**
 * Role-based access control component
 * Protects routes based on user roles
 */
const RoleGuard: React.FC<RoleGuardProps> = ({
  children,
  requiredRole = 'any',
  fallbackPath = '/',
  showError = true
}) => {
  const { user, isLoaded } = useUser();

  // Show loading while user data is being fetched
  if (!isLoaded) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '200px'
        }}
      >
        <Typography>Loading...</Typography>
      </Box>
    );
  }

  // No user found
  if (!user) {
    return <Navigate to="/client/login" replace />;
  }

  const userRole = getUserRole(user);
  let hasAccess = false;

  // Check access based on required role
  switch (requiredRole) {
    case 'admin':
      hasAccess = isAdmin(userRole);
      break;
    case 'client':
      hasAccess = isClient(userRole);
      break;
    case 'any':
    default:
      hasAccess = true;
      break;
  }

  // If user has access, render children
  if (hasAccess) {
    return <>{children}</>;
  }

  // If no access and showError is false, redirect silently
  if (!showError) {
    return <Navigate to={fallbackPath} replace />;
  }

  // Show error message
  return (
    <Box sx={{ p: 4, maxWidth: 600, mx: 'auto', mt: 8 }}>
      <Alert severity="error" sx={{ mb: 3 }}>
        <AlertTitle>Access Denied</AlertTitle>
        <Typography variant="body2" sx={{ mb: 2 }}>
          You don't have permission to access this page.
        </Typography>
        <Typography variant="body2" color="text.secondary">
          <strong>Your Role:</strong> {userRole}<br />
          <strong>Required Role:</strong> {requiredRole}
        </Typography>
      </Alert>

      <Box sx={{ textAlign: 'center' }}>
        <AdminIcon sx={{ fontSize: 64, color: 'error.main', mb: 2 }} />
        <Typography variant="h5" gutterBottom>
          Insufficient Permissions
        </Typography>
        <Typography variant="body1" color="text.secondary" paragraph>
          Please contact your administrator if you believe you should have access to this page.
        </Typography>
        <Button
          variant="contained"
          onClick={() => window.location.href = fallbackPath}
          sx={{ mt: 2 }}
        >
          Go Back
        </Button>
      </Box>
    </Box>
  );
};

export default RoleGuard;
