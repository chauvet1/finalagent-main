import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, useUser } from '@clerk/clerk-react';
import {
  Box,
  Container,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  AppBar,
  Toolbar,
  Stack,
  Paper,
  Alert,
  AlertTitle,
} from '@mui/material';
import {
  Security as SecurityIcon,
  Dashboard as DashboardIcon,
  LocationOn as LocationIcon,
  Notifications as NotificationsIcon,
  AdminPanelSettings as AdminIcon,
  Business as ClientIcon,
  PersonAdd as SignupIcon,
  Person as PersonIcon,
} from '@mui/icons-material';
import {
  getUserRole,
  formatRoleForDisplay,
  getRoleWelcomeMessage,
  getRoleNavigation,
  canAccessAdminPortal,
  canAccessClientPortal,
  debugUserRole
} from '../../utils/roleUtils';
import {
  handleAdminPortalAccess,
  handleClientPortalAccess,
  debugNavigation,
  debugPortalUrls
} from '../../utils/navigationUtils';

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { isSignedIn } = useAuth();
  const { user } = useUser();

  const userRole = getUserRole(user);
  const roleNavigation = getRoleNavigation(userRole);

  // Debug user role and navigation information when signed in
  React.useEffect(() => {
    // Always debug portal URLs on page load
    debugPortalUrls();

    if (isSignedIn && user) {
      debugUserRole(user);
      debugNavigation(user);
    }
  }, [isSignedIn, user]);

  const handleAdminLogin = () => {
    handleAdminPortalAccess(user);
  };

  const handleClientLogin = () => {
    handleClientPortalAccess(user);
  };

  const handleClientSignup = () => {
    navigate('/client/signup');
  };

  return (
    <Box>
      {/* Navigation Bar */}
      <AppBar position="static" elevation={0} sx={{ backgroundColor: 'primary.main' }}>
        <Toolbar>
          <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1 }}>
            <SecurityIcon sx={{ mr: 2, fontSize: 32 }} />
            <Typography variant="h5" component="div" sx={{ fontWeight: 'bold' }}>
              BahinLink
            </Typography>
          </Box>
          <Stack direction="row" spacing={2} alignItems="center">
            {isSignedIn && user && (
              <Box sx={{ display: 'flex', alignItems: 'center', mr: 2 }}>
                <PersonIcon sx={{ mr: 1 }} />
                <Box>
                  <Typography variant="body2" sx={{ color: 'white' }}>
                    {user.firstName} {user.lastName}
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                    Role: {(user.publicMetadata?.role as string) || 'user'}
                  </Typography>
                </Box>
              </Box>
            )}
            <Button
              color="inherit"
              variant="outlined"
              startIcon={<AdminIcon />}
              onClick={handleAdminLogin}
              sx={{ borderColor: 'white', '&:hover': { backgroundColor: 'rgba(255,255,255,0.1)' } }}
            >
              Admin Portal
            </Button>
            <Button
              color="inherit"
              variant="outlined"
              startIcon={<ClientIcon />}
              onClick={handleClientLogin}
              sx={{ borderColor: 'white', '&:hover': { backgroundColor: 'rgba(255,255,255,0.1)' } }}
            >
              Client Login
            </Button>
          </Stack>
        </Toolbar>
      </AppBar>

      {/* Hero Section */}
      <Box
        sx={{
          background: 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)',
          color: 'white',
          py: 12,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <Container maxWidth="lg">
          <Grid container spacing={4} alignItems="center">
            <Grid item xs={12} md={6}>
              <Typography variant="h2" component="h1" gutterBottom sx={{ fontWeight: 'bold' }}>
                Security Workforce Management Made Simple
              </Typography>
              <Typography variant="h6" paragraph sx={{ opacity: 0.9, mb: 4 }}>
                Streamline your security operations with real-time tracking, comprehensive reporting, 
                and intelligent scheduling. Built specifically for security companies like Bahin SARL.
              </Typography>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <Button
                  variant="contained"
                  size="large"
                  startIcon={<AdminIcon />}
                  onClick={handleAdminLogin}
                  sx={{
                    backgroundColor: 'white',
                    color: 'primary.main',
                    '&:hover': { backgroundColor: 'grey.100' },
                    py: 1.5,
                    px: 3,
                  }}
                >
                  Admin Dashboard
                </Button>
                <Button
                  variant="outlined"
                  size="large"
                  startIcon={<ClientIcon />}
                  onClick={handleClientLogin}
                  sx={{
                    borderColor: 'white',
                    color: 'white',
                    '&:hover': { backgroundColor: 'rgba(255,255,255,0.1)' },
                    py: 1.5,
                    px: 3,
                  }}
                >
                  Client Portal
                </Button>
              </Stack>
            </Grid>
            <Grid item xs={12} md={6}>
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  height: 400,
                }}
              >
                <SecurityIcon sx={{ fontSize: 300, opacity: 0.3 }} />
              </Box>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* Features Section */}
      <Container maxWidth="lg" sx={{ py: 8 }}>
        <Typography variant="h3" component="h2" textAlign="center" gutterBottom sx={{ mb: 6 }}>
          Why Choose BahinLink?
        </Typography>
        <Grid container spacing={4}>
          <Grid item xs={12} md={4}>
            <Card elevation={2} sx={{ height: '100%', textAlign: 'center', p: 2 }}>
              <CardContent>
                <SecurityIcon sx={{ fontSize: 64, color: 'primary.main', mb: 2 }} />
                <Typography variant="h5" gutterBottom>
                  Security First
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  Enterprise-grade security with role-based access control, data encryption, 
                  and compliance with GDPR regulations.
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card elevation={2} sx={{ height: '100%', textAlign: 'center', p: 2 }}>
              <CardContent>
                <DashboardIcon sx={{ fontSize: 64, color: 'primary.main', mb: 2 }} />
                <Typography variant="h5" gutterBottom>
                  Real-time Insights
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  Live tracking, instant notifications, and comprehensive analytics 
                  to keep you informed about your security operations 24/7.
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card elevation={2} sx={{ height: '100%', textAlign: 'center', p: 2 }}>
              <CardContent>
                <LocationIcon sx={{ fontSize: 64, color: 'primary.main', mb: 2 }} />
                <Typography variant="h5" gutterBottom>
                  Smart Geofencing
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  Advanced location-based services with intelligent geofencing, 
                  automated check-ins, and precise site monitoring capabilities.
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Container>

      {/* Authentication Status Debug Section */}
      {isSignedIn && user && (
        <Box sx={{ backgroundColor: 'info.light', py: 4 }}>
          <Container maxWidth="md">
            <Alert severity="info">
              <AlertTitle>Current Authentication Status</AlertTitle>
              <Typography variant="body2">
                <strong>User:</strong> {user.firstName} {user.lastName} ({user.primaryEmailAddress?.emailAddress})
              </Typography>
              <Typography variant="body2">
                <strong>Role:</strong> {(user.publicMetadata?.role as string) || 'user'}
              </Typography>
              <Typography variant="body2">
                <strong>User ID:</strong> {user.id}
              </Typography>
              <Typography variant="body2" sx={{ mt: 1 }}>
                You are currently signed in. Use the buttons above to access the appropriate portal.
              </Typography>
            </Alert>
          </Container>
        </Box>
      )}

      {/* Client Access Section */}
      <Box sx={{ backgroundColor: 'grey.50', py: 8 }}>
        <Container maxWidth="md">
          <Typography variant="h4" component="h2" textAlign="center" gutterBottom>
            New Client?
          </Typography>
          <Typography variant="h6" textAlign="center" color="text.secondary" paragraph>
            Join BahinLink to get real-time visibility into your security services
          </Typography>
          <Box sx={{ textAlign: 'center', mt: 4 }}>
            <Button
              variant="contained"
              size="large"
              startIcon={<SignupIcon />}
              onClick={handleClientSignup}
              sx={{ py: 1.5, px: 4, mr: 2 }}
            >
              Create Client Account
            </Button>
            <Button
              variant="outlined"
              size="large"
              startIcon={<ClientIcon />}
              onClick={handleClientLogin}
              sx={{ py: 1.5, px: 4 }}
            >
              Existing Client Login
            </Button>
          </Box>
        </Container>
      </Box>

      {/* Footer */}
      <Box sx={{ backgroundColor: 'grey.900', color: 'white', py: 6 }}>
        <Container maxWidth="lg">
          <Grid container spacing={4}>
            <Grid item xs={12} md={4}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <SecurityIcon sx={{ mr: 2, fontSize: 32 }} />
                <Typography variant="h5" component="div" sx={{ fontWeight: 'bold' }}>
                  BahinLink
                </Typography>
              </Box>
              <Typography variant="body2" color="grey.400">
                Empowering security companies with intelligent workforce management solutions.
              </Typography>
            </Grid>
            <Grid item xs={12} md={4}>
              <Typography variant="h6" gutterBottom>
                Quick Access
              </Typography>
              <Stack spacing={1}>
                <Button
                  color="inherit"
                  onClick={handleAdminLogin}
                  sx={{ justifyContent: 'flex-start', textTransform: 'none' }}
                >
                  Admin Dashboard
                </Button>
                <Button
                  color="inherit"
                  onClick={handleClientLogin}
                  sx={{ justifyContent: 'flex-start', textTransform: 'none' }}
                >
                  Client Portal
                </Button>
              </Stack>
            </Grid>
            <Grid item xs={12} md={4}>
              <Typography variant="h6" gutterBottom>
                Contact
              </Typography>
              <Typography variant="body2" color="grey.400">
                For support and inquiries, please contact your system administrator.
              </Typography>
            </Grid>
          </Grid>
        </Container>
      </Box>
    </Box>
  );
};

export default HomePage;
