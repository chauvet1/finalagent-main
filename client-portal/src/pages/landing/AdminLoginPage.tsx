import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, useUser, SignIn, useClerk } from '@clerk/clerk-react';
import { getUserRole, isAdmin } from '../../utils/roleUtils';
import { navigateToAdminPortal } from '../../utils/navigationUtils';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Button,
  AppBar,
  Toolbar,
  CircularProgress,
  Grid,
  Alert,
  AlertTitle,
} from '@mui/material';
import {
  Security as SecurityIcon,
  ArrowBack as ArrowBackIcon,
  AdminPanelSettings as AdminIcon,
  Logout as LogoutIcon,
} from '@mui/icons-material';

const AdminLoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { isSignedIn, isLoaded } = useAuth();
  const { user } = useUser();
  const { signOut } = useClerk();
  const [showRoleError, setShowRoleError] = useState(false);

  useEffect(() => {
    // Debug logging
    console.log('🔍 AdminLoginPage Debug:', {
      isLoaded,
      isSignedIn,
      hasUser: !!user,
      userRole: user ? getUserRole(user) : 'none',
      isAdminUser: user ? isAdmin(getUserRole(user)) : false
    });

    if (isLoaded && isSignedIn && user) {
      const userRole = getUserRole(user);
      const userEmail = user.primaryEmailAddress?.emailAddress || '';
      console.log('Admin login - checking user role:', userRole, 'email:', userEmail);

      if (isAdmin(userRole)) {
        // For now, don't auto-redirect. Show admin access options instead.
        console.log('✅ Admin user detected. Showing admin access options.');
        console.log('User role:', userRole);
        console.log('User email:', userEmail);
      } else {
        // Show error message for non-admin users
        console.log('❌ Access denied - user does not have admin role:', userRole);
        setShowRoleError(true);
      }
    }
  }, [isLoaded, isSignedIn, user]);

  const handleBackToHome = () => {
    navigate('/');
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      setShowRoleError(false);
      // After sign out, user will see the sign-in form
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  // Manual admin portal access function
  const handleManualAdminAccess = () => {
    console.log('🔧 Manual admin portal access triggered');
    window.open('http://localhost:3001', '_blank');
  };

  if (!isLoaded) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  // Show role error if user is signed in but doesn't have admin role
  if (isSignedIn && showRoleError) {
    return (
      <Box sx={{ minHeight: '100vh', backgroundColor: 'grey.50' }}>
        {/* Navigation Bar */}
        <AppBar position="static" elevation={0} sx={{ backgroundColor: 'primary.main' }}>
          <Toolbar>
            <Button
              color="inherit"
              startIcon={<ArrowBackIcon />}
              onClick={handleBackToHome}
              sx={{ mr: 2 }}
            >
              Back to Home
            </Button>
            <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1 }}>
              <SecurityIcon sx={{ mr: 2, fontSize: 32 }} />
              <Typography variant="h5" component="div" sx={{ fontWeight: 'bold' }}>
                BahinLink
              </Typography>
            </Box>
          </Toolbar>
        </AppBar>

        {/* Error Content */}
        <Container maxWidth="md" sx={{ py: 8 }}>
          <Card elevation={3}>
            <CardContent sx={{ p: 4, textAlign: 'center' }}>
              <AdminIcon
                sx={{
                  fontSize: 64,
                  color: 'error.main',
                  mb: 2,
                }}
              />
              <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold' }}>
                Access Denied
              </Typography>

              <Alert severity="error" sx={{ mb: 3, textAlign: 'left' }}>
                <AlertTitle>Insufficient Permissions</AlertTitle>
                You are currently signed in as a client user. The admin portal requires administrator or supervisor privileges.
              </Alert>

              <Typography variant="body1" color="text.secondary" paragraph>
                Current user: {user?.primaryEmailAddress?.emailAddress}
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                Role: {(user?.publicMetadata?.role as string) || 'user'}
              </Typography>

              <Box sx={{ mt: 4 }}>
                <Button
                  variant="contained"
                  startIcon={<LogoutIcon />}
                  onClick={handleSignOut}
                  sx={{ mr: 2 }}
                >
                  Sign Out & Try Again
                </Button>
                <Button
                  variant="outlined"
                  onClick={handleBackToHome}
                >
                  Back to Home
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Container>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: 'grey.50' }}>
      {/* Navigation Bar */}
      <AppBar position="static" elevation={0} sx={{ backgroundColor: 'primary.main' }}>
        <Toolbar>
          <Button
            color="inherit"
            startIcon={<ArrowBackIcon />}
            onClick={handleBackToHome}
            sx={{ mr: 2 }}
          >
            Back to Home
          </Button>
          <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1 }}>
            <SecurityIcon sx={{ mr: 2, fontSize: 32 }} />
            <Typography variant="h5" component="div" sx={{ fontWeight: 'bold' }}>
              BahinLink
            </Typography>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Login Content */}
      <Container maxWidth="md" sx={{ py: 8 }}>
        <Grid container spacing={4}>
          <Grid item xs={12} md={6}>
            <Box sx={{ textAlign: 'center', mb: 4 }}>
              <AdminIcon
                sx={{
                  fontSize: 64,
                  color: 'primary.main',
                  mb: 2,
                }}
              />
              <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold' }}>
                Admin Portal Access
              </Typography>
              <Typography variant="subtitle1" color="text.secondary">
                Sign in with your administrator credentials to access the admin dashboard
              </Typography>
            </Box>

            {/* Show admin access options if user is signed in and is admin */}
            {isSignedIn && user && isAdmin(getUserRole(user)) ? (
              <Card sx={{ p: 3, textAlign: 'center' }}>
                <CardContent>
                  <Typography variant="h5" gutterBottom color="success.main">
                    ✅ Admin Access Granted
                  </Typography>
                  <Typography variant="body1" paragraph>
                    Welcome, {user.firstName || user.primaryEmailAddress?.emailAddress}!
                  </Typography>
                  <Typography variant="body2" color="text.secondary" paragraph>
                    You have administrator privileges. Choose how you'd like to proceed:
                  </Typography>

                  <Box sx={{ mt: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <Button
                      variant="contained"
                      size="large"
                      startIcon={<AdminIcon />}
                      onClick={handleManualAdminAccess}
                      sx={{ py: 1.5 }}
                    >
                      Access Admin Portal
                    </Button>
                    <Button
                      variant="outlined"
                      onClick={() => navigate('/dashboard')}
                    >
                      Access Client Portal (Support Mode)
                    </Button>
                  </Box>

                  <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
                    Admin Portal: Full administrative controls<br />
                    Client Portal: View client experience for support
                  </Typography>
                </CardContent>
              </Card>
            ) : isSignedIn && user ? (
              /* User is signed in but not admin */
              <Card sx={{ p: 3, textAlign: 'center' }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom color="warning.main">
                    ⚠️ Insufficient Privileges
                  </Typography>
                  <Typography variant="body1" paragraph>
                    You are signed in as: {user.primaryEmailAddress?.emailAddress}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" paragraph>
                    This account does not have administrator privileges.
                  </Typography>

                  <Box sx={{ mt: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <Button
                      variant="contained"
                      startIcon={<LogoutIcon />}
                      onClick={handleSignOut}
                      color="warning"
                    >
                      Sign Out & Try Different Account
                    </Button>
                    <Button
                      variant="outlined"
                      onClick={handleBackToHome}
                    >
                      Back to Home
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            ) : (
              /* Clerk SignIn Component for non-signed-in users */
              <SignIn
                routing="hash"
                signUpUrl="#"
                appearance={{
                  elements: {
                    formButtonPrimary: {
                      backgroundColor: '#1976d2',
                      '&:hover': {
                        backgroundColor: '#1565c0',
                      },
                    },
                  },
                }}
              />
            )}

            <Alert severity="info" sx={{ mt: 3 }}>
              <AlertTitle>Admin Access Required</AlertTitle>
              Please sign in with an administrator or supervisor account. If you need admin access, contact your system administrator.
            </Alert>
          </Grid>

          <Grid item xs={12} md={6}>
            <Box sx={{ p: 4 }}>
              <Typography variant="h5" gutterBottom sx={{ fontWeight: 'bold' }}>
                Admin Features
              </Typography>
              <Typography variant="body1" paragraph>
                Access powerful tools to manage your security operations:
              </Typography>
              
              <Box sx={{ mt: 3 }}>
                <Typography variant="h6" gutterBottom>
                  🔧 Workforce Management
                </Typography>
                <Typography variant="body2" color="text.secondary" paragraph>
                  Manage agents, schedules, and performance tracking
                </Typography>

                <Typography variant="h6" gutterBottom>
                  📊 Real-time Analytics
                </Typography>
                <Typography variant="body2" color="text.secondary" paragraph>
                  Monitor operations with live dashboards and reports
                </Typography>

                <Typography variant="h6" gutterBottom>
                  🗺️ Site Management
                </Typography>
                <Typography variant="body2" color="text.secondary" paragraph>
                  Configure sites, geofences, and security protocols
                </Typography>

                <Typography variant="h6" gutterBottom>
                  👥 Client Relations
                </Typography>
                <Typography variant="body2" color="text.secondary" paragraph>
                  Manage client accounts, contracts, and communications
                </Typography>
              </Box>
            </Box>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
};

export default AdminLoginPage;
