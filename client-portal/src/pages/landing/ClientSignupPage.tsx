import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, useUser, SignUp } from '@clerk/clerk-react';
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
} from '@mui/material';
import {
  Security as SecurityIcon,
  ArrowBack as ArrowBackIcon,
  PersonAdd as SignupIcon,
  Business as ClientIcon,
} from '@mui/icons-material';

const ClientSignupPage: React.FC = () => {
  const navigate = useNavigate();
  const { isSignedIn, isLoaded } = useAuth();
  const { user } = useUser();

  useEffect(() => {
    if (isLoaded && isSignedIn && user) {
      // User is signed up and signed in, redirect to client dashboard
      navigate('/dashboard');
    }
  }, [isLoaded, isSignedIn, user, navigate]);

  const handleBackToHome = () => {
    navigate('/');
  };

  const handleExistingClient = () => {
    navigate('/client/login');
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

      {/* Signup Content */}
      <Container maxWidth="md" sx={{ py: 8 }}>
        <Grid container spacing={4}>
          <Grid item xs={12} md={6}>
            <Card elevation={3} sx={{ height: '100%' }}>
              <CardContent sx={{ p: 4 }}>
                <Box sx={{ textAlign: 'center', mb: 4 }}>
                  <SignupIcon
                    sx={{
                      fontSize: 64,
                      color: 'primary.main',
                      mb: 2,
                    }}
                  />
                  <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold' }}>
                    Create Client Account
                  </Typography>
                  <Typography variant="subtitle1" color="text.secondary">
                    Join BahinLink to monitor your security services
                  </Typography>
                </Box>

                {/* Clerk SignUp Component */}
                <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                  <SignUp
                    routing="hash"
                    signInUrl="/client/login"
                    redirectUrl="/client/signup"
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
                    Already have an account?
                  </Typography>
                  <Button
                    variant="text"
                    startIcon={<ClientIcon />}
                    onClick={handleExistingClient}
                    sx={{ mt: 1 }}
                  >
                    Sign In to Client Portal
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Box sx={{ p: 4 }}>
              <Typography variant="h5" gutterBottom sx={{ fontWeight: 'bold' }}>
                Welcome to BahinLink
              </Typography>
              <Typography variant="body1" paragraph>
                Get started with comprehensive security management and monitoring:
              </Typography>
              
              <Box sx={{ mt: 3 }}>
                <Typography variant="h6" gutterBottom>
                  🎯 What You'll Get
                </Typography>
                
                <Typography variant="body2" color="text.secondary" paragraph>
                  ✅ Real-time monitoring of your security operations
                </Typography>
                
                <Typography variant="body2" color="text.secondary" paragraph>
                  ✅ Live tracking of security agents and site coverage
                </Typography>
                
                <Typography variant="body2" color="text.secondary" paragraph>
                  ✅ Comprehensive reports and analytics
                </Typography>
                
                <Typography variant="body2" color="text.secondary" paragraph>
                  ✅ Incident management and response tracking
                </Typography>
                
                <Typography variant="body2" color="text.secondary" paragraph>
                  ✅ Direct communication with your security team
                </Typography>
                
                <Typography variant="body2" color="text.secondary" paragraph>
                  ✅ Billing and invoice management
                </Typography>

                <Box sx={{ mt: 4, p: 3, backgroundColor: 'primary.light', borderRadius: 2 }}>
                  <Typography variant="h6" gutterBottom sx={{ color: 'white' }}>
                    🔒 Enterprise Security
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'white' }}>
                    Your data is protected with enterprise-grade security, 
                    encryption, and compliance with industry standards.
                  </Typography>
                </Box>

                <Box sx={{ mt: 3, p: 3, backgroundColor: 'grey.100', borderRadius: 2 }}>
                  <Typography variant="h6" gutterBottom>
                    📞 Need Help?
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Contact your security service provider or system administrator 
                    for assistance with account setup and access.
                  </Typography>
                </Box>
              </Box>
            </Box>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
};

export default ClientSignupPage;
