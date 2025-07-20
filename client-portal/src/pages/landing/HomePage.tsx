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
  TrendingUp as TrendingUpIcon,
  Groups as GroupsIcon,
  Schedule as ScheduleIcon,
  CheckCircle as CheckCircleIcon,
  Star as StarIcon,
  CloudDone as CloudIcon,
  Speed as SpeedIcon,
  Shield as ShieldIcon,
  PhoneAndroid as MobileIcon,
  Analytics as AnalyticsIcon,
  Assignment as AssignmentIcon,
  Timeline as TimelineIcon,
  PlayArrow as PlayIcon,
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

      {/* Statistics Section */}
      <Box sx={{ backgroundColor: 'primary.main', color: 'white', py: 8 }}>
        <Container maxWidth="lg">
          <Typography variant="h3" component="h2" textAlign="center" gutterBottom sx={{ mb: 6 }}>
            Trusted by Security Leaders
          </Typography>
          <Grid container spacing={4}>
            <Grid item xs={12} sm={6} md={3}>
              <Box textAlign="center">
                <Typography variant="h2" component="div" sx={{ fontWeight: 'bold', mb: 1 }}>
                  500+
                </Typography>
                <Typography variant="h6" sx={{ opacity: 0.9 }}>
                  Security Guards
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.7, mt: 1 }}>
                  Actively managed
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Box textAlign="center">
                <Typography variant="h2" component="div" sx={{ fontWeight: 'bold', mb: 1 }}>
                  150+
                </Typography>
                <Typography variant="h6" sx={{ opacity: 0.9 }}>
                  Client Sites
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.7, mt: 1 }}>
                  Under protection
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Box textAlign="center">
                <Typography variant="h2" component="div" sx={{ fontWeight: 'bold', mb: 1 }}>
                  99.9%
                </Typography>
                <Typography variant="h6" sx={{ opacity: 0.9 }}>
                  Uptime
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.7, mt: 1 }}>
                  System reliability
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Box textAlign="center">
                <Typography variant="h2" component="div" sx={{ fontWeight: 'bold', mb: 1 }}>
                  24/7
                </Typography>
                <Typography variant="h6" sx={{ opacity: 0.9 }}>
                  Monitoring
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.7, mt: 1 }}>
                  Round-the-clock
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* How It Works Section */}
      <Container maxWidth="lg" sx={{ py: 8 }}>
        <Typography variant="h3" component="h2" textAlign="center" gutterBottom sx={{ mb: 6 }}>
          How BahinLink Works
        </Typography>
        <Grid container spacing={4} alignItems="center">
          <Grid item xs={12} md={4}>
            <Box textAlign="center" sx={{ p: 3 }}>
              <Box
                sx={{
                  width: 80,
                  height: 80,
                  borderRadius: '50%',
                  backgroundColor: 'primary.main',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mx: 'auto',
                  mb: 3,
                }}
              >
                <AssignmentIcon sx={{ fontSize: 40, color: 'white' }} />
              </Box>
              <Typography variant="h5" gutterBottom sx={{ fontWeight: 'bold' }}>
                1. Setup & Configure
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Quick onboarding process to configure your sites, security zones, and team structure.
                Our experts help you get started in minutes.
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={12} md={4}>
            <Box textAlign="center" sx={{ p: 3 }}>
              <Box
                sx={{
                  width: 80,
                  height: 80,
                  borderRadius: '50%',
                  backgroundColor: 'primary.main',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mx: 'auto',
                  mb: 3,
                }}
              >
                <PlayIcon sx={{ fontSize: 40, color: 'white' }} />
              </Box>
              <Typography variant="h5" gutterBottom sx={{ fontWeight: 'bold' }}>
                2. Deploy & Monitor
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Deploy security personnel with real-time tracking, automated check-ins,
                and instant incident reporting capabilities.
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={12} md={4}>
            <Box textAlign="center" sx={{ p: 3 }}>
              <Box
                sx={{
                  width: 80,
                  height: 80,
                  borderRadius: '50%',
                  backgroundColor: 'primary.main',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mx: 'auto',
                  mb: 3,
                }}
              >
                <AnalyticsIcon sx={{ fontSize: 40, color: 'white' }} />
              </Box>
              <Typography variant="h5" gutterBottom sx={{ fontWeight: 'bold' }}>
                3. Analyze & Optimize
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Generate comprehensive reports, analyze performance metrics,
                and continuously optimize your security operations.
              </Typography>
            </Box>
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

      {/* Technology Stack Section */}
      <Box sx={{ backgroundColor: 'grey.50', py: 8 }}>
        <Container maxWidth="lg">
          <Typography variant="h3" component="h2" textAlign="center" gutterBottom sx={{ mb: 6 }}>
            Built with Modern Technology
          </Typography>
          <Grid container spacing={4}>
            <Grid item xs={12} sm={6} md={3}>
              <Card elevation={2} sx={{ height: '100%', textAlign: 'center', p: 3 }}>
                <CloudIcon sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
                <Typography variant="h6" gutterBottom>
                  Cloud-Native
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Scalable cloud infrastructure ensuring 99.9% uptime and global accessibility
                </Typography>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card elevation={2} sx={{ height: '100%', textAlign: 'center', p: 3 }}>
                <MobileIcon sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
                <Typography variant="h6" gutterBottom>
                  Mobile-First
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Responsive design optimized for mobile devices and field operations
                </Typography>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card elevation={2} sx={{ height: '100%', textAlign: 'center', p: 3 }}>
                <SpeedIcon sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
                <Typography variant="h6" gutterBottom>
                  Real-Time
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Instant updates and live tracking with WebSocket technology
                </Typography>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card elevation={2} sx={{ height: '100%', textAlign: 'center', p: 3 }}>
                <ShieldIcon sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
                <Typography variant="h6" gutterBottom>
                  Enterprise Security
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Bank-grade encryption and compliance with international standards
                </Typography>
              </Card>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* Testimonials Section */}
      <Container maxWidth="lg" sx={{ py: 8 }}>
        <Typography variant="h3" component="h2" textAlign="center" gutterBottom sx={{ mb: 6 }}>
          What Our Clients Say
        </Typography>
        <Grid container spacing={4}>
          <Grid item xs={12} md={4}>
            <Card elevation={2} sx={{ height: '100%', p: 3 }}>
              <Box sx={{ display: 'flex', mb: 2 }}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <StarIcon key={star} sx={{ color: '#ffc107', fontSize: 20 }} />
                ))}
              </Box>
              <Typography variant="body1" paragraph sx={{ fontStyle: 'italic' }}>
                "BahinLink has revolutionized how we manage our security operations.
                The real-time tracking and automated reporting have saved us countless hours."
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', mt: 2 }}>
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    borderRadius: '50%',
                    backgroundColor: 'primary.main',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mr: 2,
                  }}
                >
                  <PersonIcon sx={{ color: 'white' }} />
                </Box>
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                    Sarah Johnson
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Operations Manager, SecureGuard Ltd
                  </Typography>
                </Box>
              </Box>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card elevation={2} sx={{ height: '100%', p: 3 }}>
              <Box sx={{ display: 'flex', mb: 2 }}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <StarIcon key={star} sx={{ color: '#ffc107', fontSize: 20 }} />
                ))}
              </Box>
              <Typography variant="body1" paragraph sx={{ fontStyle: 'italic' }}>
                "The client portal gives us complete transparency into our security services.
                We can see exactly what's happening at our facilities in real-time."
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', mt: 2 }}>
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    borderRadius: '50%',
                    backgroundColor: 'primary.main',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mr: 2,
                  }}
                >
                  <PersonIcon sx={{ color: 'white' }} />
                </Box>
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                    Michael Chen
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Facility Director, TechCorp Industries
                  </Typography>
                </Box>
              </Box>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card elevation={2} sx={{ height: '100%', p: 3 }}>
              <Box sx={{ display: 'flex', mb: 2 }}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <StarIcon key={star} sx={{ color: '#ffc107', fontSize: 20 }} />
                ))}
              </Box>
              <Typography variant="body1" paragraph sx={{ fontStyle: 'italic' }}>
                "Implementation was seamless and the support team is exceptional.
                BahinLink has become an essential part of our security infrastructure."
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', mt: 2 }}>
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    borderRadius: '50%',
                    backgroundColor: 'primary.main',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mr: 2,
                  }}
                >
                  <PersonIcon sx={{ color: 'white' }} />
                </Box>
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                    Emma Rodriguez
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Security Director, Metro Shopping Center
                  </Typography>
                </Box>
              </Box>
            </Card>
          </Grid>
        </Grid>
      </Container>

      {/* Enhanced Call-to-Action Section */}
      <Box sx={{ backgroundColor: 'primary.main', color: 'white', py: 10 }}>
        <Container maxWidth="lg">
          <Grid container spacing={6} alignItems="center">
            <Grid item xs={12} md={6}>
              <Typography variant="h3" component="h2" gutterBottom sx={{ fontWeight: 'bold' }}>
                Ready to Transform Your Security Operations?
              </Typography>
              <Typography variant="h6" paragraph sx={{ opacity: 0.9, mb: 4 }}>
                Join hundreds of security companies already using BahinLink to streamline
                their operations, improve efficiency, and deliver better service to their clients.
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <CheckCircleIcon sx={{ mr: 2, color: 'white' }} />
                <Typography variant="body1">Free 30-day trial</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <CheckCircleIcon sx={{ mr: 2, color: 'white' }} />
                <Typography variant="body1">No setup fees</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 4 }}>
                <CheckCircleIcon sx={{ mr: 2, color: 'white' }} />
                <Typography variant="body1">24/7 support included</Typography>
              </Box>
            </Grid>
            <Grid item xs={12} md={6}>
              <Paper elevation={8} sx={{ p: 4, textAlign: 'center' }}>
                <Typography variant="h4" component="h3" gutterBottom color="primary.main" sx={{ fontWeight: 'bold' }}>
                  Get Started Today
                </Typography>
                <Typography variant="body1" color="text.secondary" paragraph>
                  Choose your access level and start experiencing the power of BahinLink
                </Typography>
                <Stack spacing={3} sx={{ mt: 4 }}>
                  <Button
                    variant="contained"
                    size="large"
                    fullWidth
                    startIcon={<SignupIcon />}
                    onClick={handleClientSignup}
                    sx={{ py: 2, fontSize: '1.1rem' }}
                  >
                    Create Client Account
                  </Button>
                  <Button
                    variant="outlined"
                    size="large"
                    fullWidth
                    startIcon={<ClientIcon />}
                    onClick={handleClientLogin}
                    sx={{ py: 2, fontSize: '1.1rem' }}
                  >
                    Existing Client Login
                  </Button>
                  <Box sx={{ textAlign: 'center', pt: 2 }}>
                    <Typography variant="caption" color="text.secondary">
                      System administrators can access the{' '}
                      <Button
                        variant="text"
                        size="small"
                        onClick={handleAdminLogin}
                        sx={{ textTransform: 'none', p: 0, minWidth: 'auto' }}
                      >
                        Admin Portal
                      </Button>
                    </Typography>
                  </Box>
                </Stack>
              </Paper>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* Key Features Highlight Section */}
      <Container maxWidth="lg" sx={{ py: 8 }}>
        <Typography variant="h3" component="h2" textAlign="center" gutterBottom sx={{ mb: 6 }}>
          Everything You Need in One Platform
        </Typography>
        <Grid container spacing={3}>
          <Grid item xs={12} sm={6} md={4}>
            <Box sx={{ display: 'flex', alignItems: 'flex-start', p: 2 }}>
              <TimelineIcon sx={{ color: 'primary.main', mr: 2, mt: 0.5 }} />
              <Box>
                <Typography variant="h6" gutterBottom>
                  Live Tracking
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Real-time GPS tracking of all security personnel with geofencing capabilities
                </Typography>
              </Box>
            </Box>
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <Box sx={{ display: 'flex', alignItems: 'flex-start', p: 2 }}>
              <ScheduleIcon sx={{ color: 'primary.main', mr: 2, mt: 0.5 }} />
              <Box>
                <Typography variant="h6" gutterBottom>
                  Smart Scheduling
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Automated shift scheduling with conflict detection and optimization
                </Typography>
              </Box>
            </Box>
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <Box sx={{ display: 'flex', alignItems: 'flex-start', p: 2 }}>
              <NotificationsIcon sx={{ color: 'primary.main', mr: 2, mt: 0.5 }} />
              <Box>
                <Typography variant="h6" gutterBottom>
                  Instant Alerts
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Immediate notifications for incidents, emergencies, and system events
                </Typography>
              </Box>
            </Box>
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <Box sx={{ display: 'flex', alignItems: 'flex-start', p: 2 }}>
              <AnalyticsIcon sx={{ color: 'primary.main', mr: 2, mt: 0.5 }} />
              <Box>
                <Typography variant="h6" gutterBottom>
                  Advanced Analytics
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Comprehensive reporting and performance analytics with custom dashboards
                </Typography>
              </Box>
            </Box>
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <Box sx={{ display: 'flex', alignItems: 'flex-start', p: 2 }}>
              <GroupsIcon sx={{ color: 'primary.main', mr: 2, mt: 0.5 }} />
              <Box>
                <Typography variant="h6" gutterBottom>
                  Team Management
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Complete workforce management with attendance tracking and performance metrics
                </Typography>
              </Box>
            </Box>
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <Box sx={{ display: 'flex', alignItems: 'flex-start', p: 2 }}>
              <MobileIcon sx={{ color: 'primary.main', mr: 2, mt: 0.5 }} />
              <Box>
                <Typography variant="h6" gutterBottom>
                  Mobile Ready
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Native mobile apps for iOS and Android with offline capabilities
                </Typography>
              </Box>
            </Box>
          </Grid>
        </Grid>
      </Container>

      {/* Footer */}
      <Box sx={{ backgroundColor: 'grey.900', color: 'white', py: 8 }}>
        <Container maxWidth="lg">
          <Grid container spacing={4}>
            <Grid item xs={12} md={4}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <SecurityIcon sx={{ mr: 2, fontSize: 32 }} />
                <Typography variant="h5" component="div" sx={{ fontWeight: 'bold' }}>
                  BahinLink
                </Typography>
              </Box>
              <Typography variant="body2" color="grey.400" paragraph>
                Empowering security companies with intelligent workforce management solutions.
                Built by security professionals, for security professionals.
              </Typography>
              <Typography variant="body2" color="grey.400">
                © 2024 Bahin SARL. All rights reserved.
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <Typography variant="h6" gutterBottom>
                Platform
              </Typography>
              <Stack spacing={1}>
                <Button
                  color="inherit"
                  onClick={handleAdminLogin}
                  sx={{ justifyContent: 'flex-start', textTransform: 'none', color: 'grey.400' }}
                >
                  Admin Dashboard
                </Button>
                <Button
                  color="inherit"
                  onClick={handleClientLogin}
                  sx={{ justifyContent: 'flex-start', textTransform: 'none', color: 'grey.400' }}
                >
                  Client Portal
                </Button>
                <Button
                  color="inherit"
                  onClick={handleClientSignup}
                  sx={{ justifyContent: 'flex-start', textTransform: 'none', color: 'grey.400' }}
                >
                  Sign Up
                </Button>
              </Stack>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Typography variant="h6" gutterBottom>
                Features
              </Typography>
              <Stack spacing={1}>
                <Typography variant="body2" color="grey.400">
                  Live Tracking
                </Typography>
                <Typography variant="body2" color="grey.400">
                  Smart Scheduling
                </Typography>
                <Typography variant="body2" color="grey.400">
                  Incident Management
                </Typography>
                <Typography variant="body2" color="grey.400">
                  Analytics & Reports
                </Typography>
                <Typography variant="body2" color="grey.400">
                  Mobile Apps
                </Typography>
              </Stack>
            </Grid>
            <Grid item xs={12} md={3}>
              <Typography variant="h6" gutterBottom>
                Support
              </Typography>
              <Typography variant="body2" color="grey.400" paragraph>
                Need help? Our support team is available 24/7 to assist you.
              </Typography>
              <Typography variant="body2" color="grey.400" paragraph>
                For technical support and inquiries, please contact your system administrator.
              </Typography>
              <Box sx={{ mt: 3 }}>
                <Typography variant="caption" color="grey.500">
                  System Status: ✅ All systems operational
                </Typography>
              </Box>
            </Grid>
          </Grid>
          <Box sx={{ borderTop: '1px solid', borderColor: 'grey.700', mt: 6, pt: 4, textAlign: 'center' }}>
            <Typography variant="body2" color="grey.400">
              BahinLink - Professional Security Workforce Management Platform
            </Typography>
          </Box>
        </Container>
      </Box>
    </Box>
  );
};

export default HomePage;
