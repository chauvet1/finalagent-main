import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, useUser, SignIn } from '@clerk/clerk-react';
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
  Business as ClientIcon,
  PersonAdd as SignupIcon,
} from '@mui/icons-material';

const ClientLoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { isSignedIn, isLoaded } = useAuth();
  const { user } = useUser();

  useEffect(() => {
    if (isLoaded && isSignedIn && user) {
      const userRole = user.publicMetadata?.role as string || 'user';

      // If user is admin/supervisor, suggest they use admin portal
      if (userRole === 'admin' || userRole === 'supervisor' || userRole === 'ADMIN' || userRole === 'SUPERVISOR') {
        // Allow admin users to access client portal for testing/support purposes
        // but show a notice
        navigate('/dashboard');
      } else {
        // Regular client user, redirect to dashboard
        navigate('/dashboard');
      }
    }
  }, [isLoaded, isSignedIn, user, navigate]);

  const handleBackToHome = () => {
    navigate('/');
  };

  const handleSignup = () => {
    navigate('/client/signup');
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
            <Card elevation={3} sx={{ height: '100%' }}>
              <CardContent sx={{ p: 4 }}>
                <Box sx={{ textAlign: 'center', mb: 4 }}>
                  <ClientIcon
                    sx={{
                      fontSize: 64,
                      color: 'primary.main',
                      mb: 2,
                    }}
                  />
                  <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold' }}>
                    
                  </Typography>
                  <Typography variant="subtitle1" color="text.secondary">
                    
                  </Typography>
                </Box>

                {/* Clerk SignIn Component */}
                <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                  <SignIn
                    routing="hash"
                    signUpUrl="/client/signup"
                    redirectUrl="/client/login"
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
                </Box>

                <Box sx={{ textAlign: 'center', mt: 3 }}>
                  <Typography variant="body2" color="text.secondary">
                    Don't have an account?
                  </Typography>
                  <Button
                    variant="text"
                    startIcon={<SignupIcon />}
                    onClick={handleSignup}
                    sx={{ mt: 1 }}
                  >
                    Create Client Account
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Box sx={{ p: 4 }}>
              <Typography variant="h5" gutterBottom sx={{ fontWeight: 'bold' }}>
                Client Portal Features
              </Typography>
              <Typography variant="body1" paragraph>
                Monitor and manage your security services with real-time insights:
              </Typography>
              
              <Box sx={{ mt: 3 }}>
                <Typography variant="h6" gutterBottom>
                  📊 Live Dashboard
                </Typography>
                <Typography variant="body2" color="text.secondary" paragraph>
                  Real-time monitoring of your security operations and agent activities
                </Typography>

                <Typography variant="h6" gutterBottom>
                  🗺️ Live Tracking
                </Typography>
                <Typography variant="body2" color="text.secondary" paragraph>
                  Track agent locations and site coverage in real-time
                </Typography>

                <Typography variant="h6" gutterBottom>
                  📈 Reports & Analytics
                </Typography>
                <Typography variant="body2" color="text.secondary" paragraph>
                  Comprehensive reports on performance, incidents, and service quality
                </Typography>

                <Typography variant="h6" gutterBottom>
                  🚨 Incident Management
                </Typography>
                <Typography variant="body2" color="text.secondary" paragraph>
                  View and track security incidents and response times
                </Typography>

                <Typography variant="h6" gutterBottom>
                  💬 Communication
                </Typography>
                <Typography variant="body2" color="text.secondary" paragraph>
                  Direct messaging with your security team and notifications
                </Typography>

                <Typography variant="h6" gutterBottom>
                  💰 Billing & Invoices
                </Typography>
                <Typography variant="body2" color="text.secondary" paragraph>
                  Access billing information, invoices, and service agreements
                </Typography>
              </Box>
            </Box>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
};

export default ClientLoginPage;
