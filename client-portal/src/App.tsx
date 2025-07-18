import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { CssBaseline, Box } from '@mui/material';
import { Provider } from 'react-redux';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { ClerkProvider, useAuth as useClerkAuth, RedirectToSignIn } from '@clerk/clerk-react';

import { store } from './store';
import ErrorBoundary from './components/common/ErrorBoundary';
import { SocketProvider } from './providers/SocketProvider';
import { NotificationProvider } from './providers/NotificationProvider';

// Components
import Sidebar from './components/layout/Sidebar';

// Pages
import DashboardPage from './pages/DashboardPage';
import ReportsPage from './pages/ReportsPage';
import AnalyticsPage from './pages/reports/AnalyticsPage';
import PerformancePage from './pages/reports/PerformancePage';
import SummaryPage from './pages/reports/SummaryPage';
import ServiceRequestsPage from './pages/ServiceRequestsPage';
import IncidentsPage from './pages/IncidentsPage';
import BillingPage from './pages/BillingPage';
import SettingsPage from './pages/SettingsPage';
import ProfilePage from './pages/ProfilePage';
import LiveMonitoringPage from './pages/monitoring/LiveMonitoringPage';
import MessagesPage from './pages/MessagesPage';
import NotificationsPage from './pages/NotificationsPage';

const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
      light: '#42a5f5',
      dark: '#1565c0',
    },
    secondary: {
      main: '#dc004e',
    },
    background: {
      default: '#f5f5f5',
      paper: '#ffffff',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h4: {
      fontWeight: 600,
    },
    h5: {
      fontWeight: 600,
    },
    h6: {
      fontWeight: 600,
    },
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          borderRadius: 12,
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          textTransform: 'none',
          fontWeight: 600,
        },
      },
    },
  },
});

const AuthenticatedApp: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = React.useState(true);
  const [isMobile, setIsMobile] = React.useState(false);

  React.useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth < 768) {
        setSidebarOpen(false);
      }
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleSidebarToggle = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <SocketProvider>
      <NotificationProvider>
        <Box sx={{ display: 'flex', minHeight: '100vh' }}>
          <Sidebar open={sidebarOpen} onToggle={handleSidebarToggle} />
          <Box
            component="main"
            sx={{
              flexGrow: 1,
              p: { xs: 2, sm: 3, md: 4 },
              marginLeft: {
                xs: 0,
                md: sidebarOpen ? '240px' : 0
              },
              backgroundColor: '#f5f5f5',
              minHeight: '100vh',
              transition: 'margin-left 0.3s ease-in-out',
              width: {
                xs: '100%',
                md: sidebarOpen ? 'calc(100% - 240px)' : '100%'
              }
            }}
          >
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/monitoring" element={<LiveMonitoringPage />} />
              <Route path="/reports" element={<ReportsPage />} />
              <Route path="/reports/analytics" element={<AnalyticsPage />} />
              <Route path="/reports/performance" element={<PerformancePage />} />
              <Route path="/reports/summary" element={<SummaryPage />} />
              <Route path="/service-requests" element={<ServiceRequestsPage />} />
              <Route path="/incidents" element={<IncidentsPage />} />
              <Route path="/messages" element={<MessagesPage />} />
              <Route path="/notifications" element={<NotificationsPage />} />
              <Route path="/billing" element={<BillingPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </Box>
        </Box>
      </NotificationProvider>
    </SocketProvider>
  );
};

const AppContent: React.FC = () => {
  const { isSignedIn } = useClerkAuth();

  if (!isSignedIn) {
    return <RedirectToSignIn />;
  }

  return <AuthenticatedApp />;
};

const App: React.FC = () => {
  if (!process.env.REACT_APP_CLERK_PUBLISHABLE_KEY) {
    throw new Error('Missing Clerk publishable key');
  }

  return (
    <ClerkProvider publishableKey={process.env.REACT_APP_CLERK_PUBLISHABLE_KEY}>
      <Provider store={store}>
        <ThemeProvider theme={theme}>
          <LocalizationProvider dateAdapter={AdapterDateFns}>
            <CssBaseline />
            <Router>
              <ErrorBoundary>
                <AppContent />
              </ErrorBoundary>
            </Router>
          </LocalizationProvider>
        </ThemeProvider>
      </Provider>
    </ClerkProvider>
  );
};

export default App;
