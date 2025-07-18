import React, { useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Container,
  Card,
  CardContent,
  CircularProgress,
  IconButton,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  Security as SecurityIcon,
  Menu as MenuIcon,
} from '@mui/icons-material';
import { SignIn, SignUp } from '@clerk/clerk-react';
import { useAuth } from './hooks/useAuth';

// Import layout components
import Sidebar from './components/layout/Sidebar';

// Import pages and components
import DashboardPage from './pages/dashboard/DashboardPage';
import SettingsPage from './pages/settings/SettingsPage';
import LiveTrackingPage from './pages/operations/LiveTrackingPage';
import IncidentResponsePage from './pages/operations/IncidentResponsePage';
import CommunicationCenterPage from './pages/operations/CommunicationCenterPage';
import AgentManagementPage from './pages/workforce/AgentManagementPage';
import PerformanceTrackingPage from './pages/workforce/PerformanceTrackingPage';
import TrainingManagementPage from './pages/workforce/TrainingManagementPage';
import WorkforceAnalyticsPage from './pages/workforce/WorkforceAnalyticsPage';
import AttendanceManagementPage from './pages/workforce/AttendanceManagementPage';
import WorkforceSchedulingPage from './pages/workforce/WorkforceSchedulingPage';
import SitesOverviewPage from './pages/sites/SitesOverviewPage';
import GeofencingManagementPage from './pages/sites/GeofencingManagementPage';
import SiteSecurityPage from './pages/sites/SiteSecurityPage';
import ClientOverviewPage from './pages/clients/ClientOverviewPage';
import ClientPortalPage from './pages/clients/ClientPortalPage';
import ContractsPage from './pages/clients/ContractsPage';
import BillingInvoicingPage from './pages/clients/BillingInvoicingPage';
import AnalyticsDashboardPage from './pages/reports/AnalyticsDashboardPage';
import CustomReportsPage from './pages/reports/CustomReportsPage';
import IncidentReportsPage from './pages/reports/IncidentReportsPage';
import PatrolReportsPage from './pages/reports/PatrolReportsPage';
import SystemSettingsPage from './pages/admin/SystemSettingsPage';
import SecuritySettingsPage from './pages/admin/SecuritySettingsPage';
import ComplianceManagementPage from './pages/admin/ComplianceManagementPage';
import IntegrationsPage from './pages/admin/IntegrationsPage';
import AuditLogsPage from './pages/admin/AuditLogsPage';
import NotificationsCenterPage from './pages/core/NotificationsCenterPage';
import ProfileManagementPage from './pages/core/ProfileManagementPage';
import AdminUsersPage from './pages/AdminUsersPage';
import ShiftScheduler from './components/scheduling/ShiftScheduler';
import TestApiPage from './pages/TestApiPage';

// Layout component for authenticated users
const AuthenticatedLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);

  const handleSidebarToggle = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      {/* Sidebar */}
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        variant={isMobile ? 'temporary' : 'persistent'}
      />

      {/* Main content area */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100vh',
          transition: theme.transitions.create(['margin'], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.leavingScreen,
          }),
          marginLeft: isMobile ? 0 : sidebarOpen ? 0 : `-280px`,
        }}
      >
        {/* Mobile Menu Button - Only show on mobile when sidebar is closed */}
        {isMobile && !sidebarOpen && (
          <Box
            sx={{
              position: 'fixed',
              top: 16,
              left: 16,
              zIndex: theme.zIndex.drawer + 1,
            }}
          >
            <IconButton
              color="primary"
              aria-label="toggle sidebar"
              onClick={handleSidebarToggle}
              sx={{
                backgroundColor: 'background.paper',
                boxShadow: 2,
                '&:hover': {
                  backgroundColor: 'background.paper',
                },
              }}
            >
              <MenuIcon />
            </IconButton>
          </Box>
        )}

        {/* Page content */}
        <Box
          sx={{
            flexGrow: 1,
            backgroundColor: 'background.default',
            minHeight: '100vh',
            p: 0,
          }}
        >
          {children}
        </Box>
      </Box>
    </Box>
  );
};

/**
 * Main Application Component
 * Uses useAuth hook for authentication state management
 */
const App: React.FC = () => {
  const { isLoaded, isAuthenticated, user } = useAuth();

  // Debug logging for admin portal routing
  React.useEffect(() => {
    console.group('🔧 Admin Portal Debug Info');
    console.log('Current URL:', window.location.href);
    console.log('Pathname:', window.location.pathname);
    console.log('Is Loaded:', isLoaded);
    console.log('Is Authenticated:', isAuthenticated);
    console.log('User:', user);
    console.log('Environment:', process.env.NODE_ENV);
    console.log('Clerk Key:', process.env.REACT_APP_CLERK_PUBLISHABLE_KEY ? 'Set' : 'Missing');
    console.groupEnd();
  }, [isLoaded, isAuthenticated, user]);

  // Show loading spinner while Clerk is initializing
  if (!isLoaded) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="100vh"
      >
        <CircularProgress size={60} />
      </Box>
    );
  }

  return (
    <Routes>
      {/* Protected routes - only accessible when signed in */}
      <Route
        path="/dashboard"
        element={
          isAuthenticated ? (
            <AuthenticatedLayout>
              <DashboardPage />
            </AuthenticatedLayout>
          ) : (
            <Navigate to="/sign-in" replace />
          )
        }
      />

      {/* Test API Route */}
      <Route
        path="/test-api"
        element={
          <AuthenticatedLayout>
            <TestApiPage />
          </AuthenticatedLayout>
        }
      />

      {/* Operations Routes */}
      <Route
        path="/operations/tracking"
        element={
          isAuthenticated ? (
            <AuthenticatedLayout>
              <LiveTrackingPage />
            </AuthenticatedLayout>
          ) : (
            <Navigate to="/sign-in" replace />
          )
        }
      />

      <Route
        path="/operations/shifts"
        element={
          isAuthenticated ? (
            <AuthenticatedLayout>
              <ShiftScheduler />
            </AuthenticatedLayout>
          ) : (
            <Navigate to="/sign-in" replace />
          )
        }
      />

      <Route
        path="/operations/incidents"
        element={
          isAuthenticated ? (
            <AuthenticatedLayout>
              <IncidentResponsePage />
            </AuthenticatedLayout>
          ) : (
            <Navigate to="/sign-in" replace />
          )
        }
      />

      <Route
        path="/operations/communication"
        element={
          isAuthenticated ? (
            <AuthenticatedLayout>
              <CommunicationCenterPage />
            </AuthenticatedLayout>
          ) : (
            <Navigate to="/sign-in" replace />
          )
        }
      />

      <Route
        path="/workforce/agents"
        element={
          isAuthenticated ? (
            <AuthenticatedLayout>
              <AgentManagementPage />
            </AuthenticatedLayout>
          ) : (
            <Navigate to="/sign-in" replace />
          )
        }
      />

      <Route
        path="/workforce/performance"
        element={
          isAuthenticated ? (
            <AuthenticatedLayout>
              <PerformanceTrackingPage />
            </AuthenticatedLayout>
          ) : (
            <Navigate to="/sign-in" replace />
          )
        }
      />

      <Route
        path="/workforce/training"
        element={
          isAuthenticated ? (
            <AuthenticatedLayout>
              <TrainingManagementPage />
            </AuthenticatedLayout>
          ) : (
            <Navigate to="/sign-in" replace />
          )
        }
      />

      <Route
        path="/workforce/analytics"
        element={
          isAuthenticated ? (
            <AuthenticatedLayout>
              <WorkforceAnalyticsPage />
            </AuthenticatedLayout>
          ) : (
            <Navigate to="/sign-in" replace />
          )
        }
      />

      <Route
        path="/workforce/attendance"
        element={
          isAuthenticated ? (
            <AuthenticatedLayout>
              <AttendanceManagementPage />
            </AuthenticatedLayout>
          ) : (
            <Navigate to="/sign-in" replace />
          )
        }
      />

      <Route
        path="/workforce/scheduling"
        element={
          isAuthenticated ? (
            <AuthenticatedLayout>
              <WorkforceSchedulingPage />
            </AuthenticatedLayout>
          ) : (
            <Navigate to="/sign-in" replace />
          )
        }
      />

      <Route
        path="/sites/overview"
        element={
          isAuthenticated ? (
            <AuthenticatedLayout>
              <SitesOverviewPage />
            </AuthenticatedLayout>
          ) : (
            <Navigate to="/sign-in" replace />
          )
        }
      />

      <Route
        path="/sites/geofencing"
        element={
          isAuthenticated ? (
            <AuthenticatedLayout>
              <GeofencingManagementPage />
            </AuthenticatedLayout>
          ) : (
            <Navigate to="/sign-in" replace />
          )
        }
      />

      <Route
        path="/sites/security"
        element={
          isAuthenticated ? (
            <AuthenticatedLayout>
              <SiteSecurityPage />
            </AuthenticatedLayout>
          ) : (
            <Navigate to="/sign-in" replace />
          )
        }
      />

      <Route
        path="/clients/overview"
        element={
          isAuthenticated ? (
            <AuthenticatedLayout>
              <ClientOverviewPage />
            </AuthenticatedLayout>
          ) : (
            <Navigate to="/sign-in" replace />
          )
        }
      />

      <Route
        path="/clients/contracts"
        element={
          isAuthenticated ? (
            <AuthenticatedLayout>
              <ContractsPage />
            </AuthenticatedLayout>
          ) : (
            <Navigate to="/sign-in" replace />
          )
        }
      />

      <Route
        path="/clients/portal"
        element={
          isAuthenticated ? (
            <AuthenticatedLayout>
              <ClientPortalPage />
            </AuthenticatedLayout>
          ) : (
            <Navigate to="/sign-in" replace />
          )
        }
      />

      <Route
        path="/clients/billing"
        element={
          isAuthenticated ? (
            <AuthenticatedLayout>
              <BillingInvoicingPage />
            </AuthenticatedLayout>
          ) : (
            <Navigate to="/sign-in" replace />
          )
        }
      />

      <Route
        path="/reports/incidents"
        element={
          isAuthenticated ? (
            <AuthenticatedLayout>
              <IncidentReportsPage />
            </AuthenticatedLayout>
          ) : (
            <Navigate to="/sign-in" replace />
          )
        }
      />

      <Route
        path="/reports/patrols"
        element={
          isAuthenticated ? (
            <AuthenticatedLayout>
              <PatrolReportsPage />
            </AuthenticatedLayout>
          ) : (
            <Navigate to="/sign-in" replace />
          )
        }
      />

      <Route
        path="/reports/analytics"
        element={
          isAuthenticated ? (
            <AuthenticatedLayout>
              <AnalyticsDashboardPage />
            </AuthenticatedLayout>
          ) : (
            <Navigate to="/sign-in" replace />
          )
        }
      />

      <Route
        path="/reports/custom"
        element={
          isAuthenticated ? (
            <AuthenticatedLayout>
              <CustomReportsPage />
            </AuthenticatedLayout>
          ) : (
            <Navigate to="/sign-in" replace />
          )
        }
      />

      <Route
        path="/admin/settings"
        element={
          isAuthenticated ? (
            <AuthenticatedLayout>
              <SystemSettingsPage />
            </AuthenticatedLayout>
          ) : (
            <Navigate to="/sign-in" replace />
          )
        }
      />

      <Route
        path="/admin/security"
        element={
          isAuthenticated ? (
            <AuthenticatedLayout>
              <SecuritySettingsPage />
            </AuthenticatedLayout>
          ) : (
            <Navigate to="/sign-in" replace />
          )
        }
      />

      <Route
        path="/admin/compliance"
        element={
          isAuthenticated ? (
            <AuthenticatedLayout>
              <ComplianceManagementPage />
            </AuthenticatedLayout>
          ) : (
            <Navigate to="/sign-in" replace />
          )
        }
      />

      <Route
        path="/admin/integrations"
        element={
          isAuthenticated ? (
            <AuthenticatedLayout>
              <IntegrationsPage />
            </AuthenticatedLayout>
          ) : (
            <Navigate to="/sign-in" replace />
          )
        }
      />

      <Route
        path="/admin/audit"
        element={
          isAuthenticated ? (
            <AuthenticatedLayout>
              <AuditLogsPage />
            </AuthenticatedLayout>
          ) : (
            <Navigate to="/sign-in" replace />
          )
        }
      />

      <Route
        path="/notifications"
        element={
          isAuthenticated ? (
            <AuthenticatedLayout>
              <NotificationsCenterPage />
            </AuthenticatedLayout>
          ) : (
            <Navigate to="/sign-in" replace />
          )
        }
      />

      <Route
        path="/profile"
        element={
          isAuthenticated ? (
            <AuthenticatedLayout>
              <ProfileManagementPage />
            </AuthenticatedLayout>
          ) : (
            <Navigate to="/sign-in" replace />
          )
        }
      />

      {/* Admin Routes */}
      <Route
        path="/admin/users"
        element={
          isAuthenticated ? (
            <AuthenticatedLayout>
              <AdminUsersPage />
            </AuthenticatedLayout>
          ) : (
            <Navigate to="/sign-in" replace />
          )
        }
      />

      {/* Settings Route */}
      <Route
        path="/settings"
        element={
          isAuthenticated ? (
            <AuthenticatedLayout>
              <SettingsPage />
            </AuthenticatedLayout>
          ) : (
            <Navigate to="/sign-in" replace />
          )
        }
      />

      {/* Sign-in page */}
      <Route
        path="/sign-in/*"
        element={
          !isAuthenticated ? (
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                minHeight: '100vh',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                padding: { xs: 2, sm: 3, md: 4 },
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              <Container maxWidth="sm" sx={{ position: 'relative', zIndex: 1 }}>
                <Card
                  elevation={24}
                  sx={{
                    borderRadius: 3,
                    overflow: 'hidden',
                    backdropFilter: 'blur(10px)',
                    backgroundColor: 'rgba(255, 255, 255, 0.98)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    position: 'relative',
                  }}
                >
                  <CardContent sx={{
                    p: { xs: 3, sm: 4, md: 5 },
                    position: 'relative',
                    '&::before': {
                      content: '""',
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      zIndex: -1,
                      background: 'transparent',
                    }
                  }}>
                    <Box sx={{ textAlign: 'center', mb: 4, position: 'relative', zIndex: 2 }}>
                      <SecurityIcon
                        sx={{
                          fontSize: { xs: 48, sm: 60, md: 72 },
                          color: 'primary.main',
                          mb: 2,
                          filter: 'drop-shadow(0 4px 8px rgba(25, 118, 210, 0.3))',
                        }}
                      />
                      <Typography
                        variant="h4"
                        gutterBottom
                        sx={{
                          fontWeight: 700,
                          fontSize: { xs: '1.75rem', sm: '2rem', md: '2.25rem' },
                          background: 'linear-gradient(45deg, #1976d2, #42a5f5)',
                          backgroundClip: 'text',
                          WebkitBackgroundClip: 'text',
                          WebkitTextFillColor: 'transparent',
                        }}
                      >
                        BahinLink Admin
                      </Typography>
                      <Typography
                        variant="subtitle1"
                        color="text.secondary"
                        sx={{
                          fontSize: { xs: '0.9rem', sm: '1rem' },
                          fontWeight: 500,
                        }}
                      >
                        Security Workforce Management Portal
                      </Typography>
                    </Box>

                    <Box sx={{
                      display: 'flex',
                      justifyContent: 'center',
                      position: 'relative',
                      zIndex: 10,
                      '& .cl-rootBox': {
                        width: '100%',
                        position: 'relative',
                        zIndex: 10,
                      },
                      '& .cl-card': {
                        boxShadow: 'none !important',
                        border: 'none !important',
                        backgroundColor: 'transparent !important',
                        position: 'relative',
                        zIndex: 10,
                      },
                      // Hide any potential overlays or debugging elements
                      '& *[data-debug], & *[class*="debug"], & *[id*="debug"]': {
                        display: 'none !important',
                      },
                      '& *[data-extension], & *[class*="extension"]': {
                        display: 'none !important',
                      }
                    }}>
                      <SignIn
                        routing="hash"
                        signUpUrl="#"
                        afterSignInUrl="/dashboard"
                        appearance={{
                          elements: {
                            rootBox: {
                              width: '100%',
                            },
                            card: {
                              boxShadow: 'none',
                              border: 'none',
                              backgroundColor: 'transparent',
                            },
                            formButtonPrimary: {
                              backgroundColor: '#1976d2',
                              borderRadius: '8px',
                              fontSize: '16px',
                              fontWeight: '600',
                              padding: '12px 24px',
                              '&:hover': {
                                backgroundColor: '#1565c0',
                                transform: 'translateY(-1px)',
                                boxShadow: '0 4px 12px rgba(25, 118, 210, 0.4)',
                              },
                              transition: 'all 0.2s ease-in-out',
                            },
                            formFieldInput: {
                              borderRadius: '8px',
                              border: '2px solid #e0e0e0',
                              fontSize: '16px',
                              padding: '12px 16px',
                              '&:focus': {
                                borderColor: '#1976d2',
                                boxShadow: '0 0 0 3px rgba(25, 118, 210, 0.1)',
                              },
                            },
                            formFieldLabel: {
                              fontSize: '14px',
                              fontWeight: '600',
                              color: '#424242',
                            },
                            dividerLine: {
                              backgroundColor: '#e0e0e0',
                            },
                            socialButtonsBlockButton: {
                              borderRadius: '8px',
                              border: '2px solid #e0e0e0',
                              '&:hover': {
                                borderColor: '#1976d2',
                                backgroundColor: 'rgba(25, 118, 210, 0.04)',
                              },
                            },
                          },
                        }}
                      />
                    </Box>
                  </CardContent>
                </Card>
              </Container>
            </Box>
          ) : (
            <Navigate to="/dashboard" replace />
          )
        }
      />

      {/* Sign-up page */}
      <Route
        path="/sign-up/*"
        element={
          !isAuthenticated ? (
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                minHeight: '100vh',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                padding: { xs: 2, sm: 3, md: 4 },
              }}
            >
              <Container maxWidth="sm">
                <Card
                  elevation={24}
                  sx={{
                    borderRadius: 3,
                    overflow: 'hidden',
                    backdropFilter: 'blur(10px)',
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  }}
                >
                  <CardContent sx={{ p: { xs: 3, sm: 4, md: 5 } }}>
                    <Box sx={{ textAlign: 'center', mb: 4 }}>
                      <SecurityIcon
                        sx={{
                          fontSize: { xs: 48, sm: 60, md: 72 },
                          color: 'primary.main',
                          mb: 2,
                          filter: 'drop-shadow(0 4px 8px rgba(25, 118, 210, 0.3))',
                        }}
                      />
                      <Typography
                        variant="h4"
                        gutterBottom
                        sx={{
                          fontWeight: 700,
                          fontSize: { xs: '1.75rem', sm: '2rem', md: '2.25rem' },
                          background: 'linear-gradient(45deg, #1976d2, #42a5f5)',
                          backgroundClip: 'text',
                          WebkitBackgroundClip: 'text',
                          WebkitTextFillColor: 'transparent',
                        }}
                      >
                        Join BahinLink
                      </Typography>
                      <Typography
                        variant="subtitle1"
                        color="text.secondary"
                        sx={{
                          fontSize: { xs: '0.9rem', sm: '1rem' },
                          fontWeight: 500,
                        }}
                      >
                        Create your admin account
                      </Typography>
                    </Box>

                    <Box sx={{
                      display: 'flex',
                      justifyContent: 'center',
                      '& .cl-rootBox': {
                        width: '100%',
                      },
                      '& .cl-card': {
                        boxShadow: 'none !important',
                        border: 'none !important',
                      }
                    }}>
                      <SignUp
                        routing="path"
                        path="/sign-up"
                        signInUrl="/sign-in"
                        appearance={{
                          elements: {
                            rootBox: {
                              width: '100%',
                            },
                            card: {
                              boxShadow: 'none',
                              border: 'none',
                              backgroundColor: 'transparent',
                            },
                            formButtonPrimary: {
                              backgroundColor: '#1976d2',
                              borderRadius: '8px',
                              fontSize: '16px',
                              fontWeight: '600',
                              padding: '12px 24px',
                              '&:hover': {
                                backgroundColor: '#1565c0',
                                transform: 'translateY(-1px)',
                                boxShadow: '0 4px 12px rgba(25, 118, 210, 0.4)',
                              },
                              transition: 'all 0.2s ease-in-out',
                            },
                            formFieldInput: {
                              borderRadius: '8px',
                              border: '2px solid #e0e0e0',
                              fontSize: '16px',
                              padding: '12px 16px',
                              '&:focus': {
                                borderColor: '#1976d2',
                                boxShadow: '0 0 0 3px rgba(25, 118, 210, 0.1)',
                              },
                            },
                            formFieldLabel: {
                              fontSize: '14px',
                              fontWeight: '600',
                              color: '#424242',
                            },
                            dividerLine: {
                              backgroundColor: '#e0e0e0',
                            },
                            socialButtonsBlockButton: {
                              borderRadius: '8px',
                              border: '2px solid #e0e0e0',
                              '&:hover': {
                                borderColor: '#1976d2',
                                backgroundColor: 'rgba(25, 118, 210, 0.04)',
                              },
                            },
                          },
                        }}
                      />
                    </Box>
                  </CardContent>
                </Card>
              </Container>
            </Box>
          ) : (
            <Navigate to="/dashboard" replace />
          )
        }
      />

      {/* Default redirects */}
      <Route
        path="/"
        element={
          isAuthenticated ? (
            <Navigate to="/dashboard" replace />
          ) : (
            <Navigate to="/sign-in" replace />
          )
        }
      />

      {/* Catch-all redirect */}
      <Route
        path="*"
        element={
          isAuthenticated ? (
            <Navigate to="/dashboard" replace />
          ) : (
            <Navigate to="/sign-in" replace />
          )
        }
      />
    </Routes>
  );
};

export default App;



