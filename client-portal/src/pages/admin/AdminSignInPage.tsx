import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, useUser } from '@clerk/clerk-react';
import {
  Box,
  Container,
  Card,
  CardContent,
  Typography,
  Button,
  Alert,
  CircularProgress,
  Divider
} from '@mui/material';
import { SignIn } from '@clerk/clerk-react';
import { getUserRole, isAdmin, debugUserRole } from '../../utils/roleUtils';
import { autoAssignAdminRole, isDevAdminEmail } from '../../utils/adminSetup';
import AdminSetupPanel from '../../components/dev/AdminSetupPanel';

/**
 * Admin Sign In Page
 * Simple admin sign-in page within the client portal
 */
const AdminSignInPage: React.FC = () => {
  const navigate = useNavigate();
  const { isSignedIn, isLoaded } = useAuth();
  const { user } = useUser();
  const [autoAssignAttempted, setAutoAssignAttempted] = useState(false);

  useEffect(() => {
    const handleAdminAuth = async () => {
      if (isLoaded && isSignedIn && user) {
        console.log('🔍 Admin sign-in - checking user authentication');
        debugUserRole(user);

        // Try auto-assignment for dev admin emails
        if (!autoAssignAttempted && isDevAdminEmail(user.primaryEmailAddress?.emailAddress)) {
          console.log('🔧 Attempting auto-assignment for dev admin email');
          setAutoAssignAttempted(true);
          await autoAssignAdminRole(user);
          // Wait a moment for the role to be updated
          setTimeout(() => {
            window.location.reload();
          }, 1000);
          return;
        }

        const userRole = getUserRole(user);
        console.log('Admin sign-in - checking user role:', userRole);

        if (isAdmin(userRole)) {
          // Admin user - redirect to admin dashboard
          console.log('✅ Admin user authenticated, redirecting to admin dashboard');
          navigate('/admin/dashboard');
        } else {
          // Non-admin user
          console.log('❌ Access denied - user does not have admin role:', userRole);
        }
      }
    };

    handleAdminAuth();
  }, [isLoaded, isSignedIn, user, navigate, autoAssignAttempted]);

  const handleBackToHome = () => {
    navigate('/');
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

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 2,
      }}
    >
      <Container maxWidth="sm">
        <Card
          sx={{
            boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
            borderRadius: 3,
          }}
        >
          <CardContent sx={{ padding: 4 }}>
            <Box textAlign="center" mb={3}>
              <Typography
                variant="h4"
                component="h1"
                gutterBottom
                sx={{
                  fontWeight: 'bold',
                  color: '#667eea',
                  mb: 1,
                }}
              >
                🛡️ Admin Portal
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Sign in with your administrator account
              </Typography>
            </Box>

            {/* Development Admin Setup Panel */}
            {process.env.NODE_ENV === 'development' && isSignedIn && (
              <>
                <AdminSetupPanel />
                <Divider sx={{ my: 3 }} />
              </>
            )}

            {!isSignedIn ? (
              <Box>
                <Alert severity="info" sx={{ mb: 3 }}>
                  <strong>Admin Access Required</strong><br />
                  Please sign in with an account that has administrator privileges.
                </Alert>

                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'center',
                    '& .cl-rootBox': {
                      width: '100%',
                    },
                    '& .cl-card': {
                      boxShadow: 'none',
                      border: 'none',
                    },
                  }}
                >
                  <SignIn
                    appearance={{
                      elements: {
                        formButtonPrimary: {
                          backgroundColor: '#667eea',
                          '&:hover': {
                            backgroundColor: '#5a6fd8',
                          },
                        },
                        card: {
                          boxShadow: 'none',
                          border: 'none',
                        },
                        headerTitle: {
                          display: 'none',
                        },
                        headerSubtitle: {
                          display: 'none',
                        },
                      },
                    }}
                  />
                </Box>
              </Box>
            ) : (
              <Box textAlign="center">
                {user && isAdmin(getUserRole(user)) ? (
                  <Alert severity="success">
                    <strong>Welcome, Administrator!</strong><br />
                    Redirecting to admin dashboard...
                  </Alert>
                ) : (
                  <Alert severity="error">
                    <strong>Access Denied</strong><br />
                    Your account does not have administrator privileges.
                    <Box mt={2}>
                      <Button
                        variant="outlined"
                        onClick={() => {
                          // Sign out and try again
                          window.location.reload();
                        }}
                      >
                        Try Different Account
                      </Button>
                    </Box>
                  </Alert>
                )}
              </Box>
            )}

            <Box textAlign="center" mt={3}>
              <Button
                variant="text"
                onClick={handleBackToHome}
                sx={{ color: '#667eea' }}
              >
                ← Back to Home
              </Button>
            </Box>
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
};

export default AdminSignInPage;
