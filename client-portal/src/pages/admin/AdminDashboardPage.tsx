import React from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Alert,
  Chip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
} from '@mui/material';
import {
  AdminPanelSettings as AdminIcon,
  Dashboard as DashboardIcon,
  People as UsersIcon,
  Security as SecurityIcon,
  Assessment as ReportsIcon,
  Settings as SettingsIcon,
  Business as ClientsIcon,
  Schedule as ScheduleIcon,
  LocationOn as SitesIcon,
  Notifications as AlertsIcon,
  BarChart as AnalyticsIcon,
  Build as SystemIcon,
} from '@mui/icons-material';
import { useUser } from '@clerk/clerk-react';
import { getUserRole, isAdmin, formatRoleForDisplay } from '../../utils/roleUtils';
import AdminSetupPanel from '../../components/dev/AdminSetupPanel';

/**
 * Admin Dashboard Page
 * Provides admin-specific functionality and navigation
 */
const AdminDashboardPage: React.FC = () => {
  const { user } = useUser();
  const userRole = getUserRole(user);
  const isAdminUser = isAdmin(userRole);

  if (!isAdminUser) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          <strong>Access Denied</strong><br />
          You do not have administrator privileges to access this page.
        </Alert>
      </Box>
    );
  }

  const adminFeatures = [
    {
      title: 'User Management',
      description: 'Manage agents, clients, and user accounts',
      icon: <UsersIcon />,
      path: '/admin/users',
      available: true,
    },
    {
      title: 'Site Management',
      description: 'Configure sites, geofencing, and security zones',
      icon: <SitesIcon />,
      path: '/admin/sites',
      available: true,
    },
    {
      title: 'Security Operations',
      description: 'Monitor incidents, alerts, and security events',
      icon: <SecurityIcon />,
      path: '/admin/security',
      available: true,
    },
    {
      title: 'Client Management',
      description: 'Manage client accounts, contracts, and billing',
      icon: <ClientsIcon />,
      path: '/admin/clients',
      available: true,
    },
    {
      title: 'Workforce Management',
      description: 'Schedule agents, track performance, and manage training',
      icon: <ScheduleIcon />,
      path: '/admin/workforce',
      available: true,
    },
    {
      title: 'Reports & Analytics',
      description: 'Generate reports and view system analytics',
      icon: <AnalyticsIcon />,
      path: '/admin/reports',
      available: true,
    },
    {
      title: 'System Settings',
      description: 'Configure system settings and integrations',
      icon: <SystemIcon />,
      path: '/admin/system',
      available: true,
    },
    {
      title: 'Alert Management',
      description: 'Configure alerts and notification settings',
      icon: <AlertsIcon />,
      path: '/admin/alerts',
      available: true,
    },
  ];

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <AdminIcon sx={{ fontSize: 40, color: 'primary.main' }} />
          <Box>
            <Typography variant="h4" gutterBottom>
              Admin Dashboard
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Typography variant="body1" color="text.secondary">
                Welcome, {user?.firstName} {user?.lastName}
              </Typography>
              <Chip
                label={formatRoleForDisplay(userRole)}
                color="primary"
                size="small"
              />
            </Box>
          </Box>
        </Box>
        
        <Alert severity="info" sx={{ mb: 3 }}>
          <strong>Administrator Access Granted</strong><br />
          You have full access to all system administration features.
        </Alert>
      </Box>

      {/* Development Admin Setup Panel */}
      {process.env.NODE_ENV === 'development' && (
        <AdminSetupPanel />
      )}

      {/* Quick Stats */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <UsersIcon color="primary" />
                <Box>
                  <Typography variant="h6">156</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Users
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <SitesIcon color="success" />
                <Box>
                  <Typography variant="h6">24</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Active Sites
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <SecurityIcon color="warning" />
                <Box>
                  <Typography variant="h6">3</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Open Incidents
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <ClientsIcon color="info" />
                <Box>
                  <Typography variant="h6">12</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Active Clients
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Admin Features */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Administration Features
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Access all administrative functions and system management tools
          </Typography>
          
          <Grid container spacing={2}>
            {adminFeatures.map((feature, index) => (
              <Grid item xs={12} sm={6} md={4} key={index}>
                <Card variant="outlined" sx={{ height: '100%' }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, mb: 2 }}>
                      {feature.icon}
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="subtitle1" gutterBottom>
                          {feature.title}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                          {feature.description}
                        </Typography>
                        <Button
                          variant="outlined"
                          size="small"
                          disabled={!feature.available}
                          onClick={() => {
                            // For now, just show an alert
                            alert(`${feature.title} feature coming soon!`);
                          }}
                        >
                          {feature.available ? 'Access' : 'Coming Soon'}
                        </Button>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card sx={{ mt: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Quick Actions
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Button variant="contained" startIcon={<DashboardIcon />}>
              View Client Dashboard
            </Button>
            <Button variant="outlined" startIcon={<ReportsIcon />}>
              Generate Report
            </Button>
            <Button variant="outlined" startIcon={<SettingsIcon />}>
              System Settings
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default AdminDashboardPage;
