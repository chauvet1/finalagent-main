import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Alert,
  CircularProgress,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Chip,
  Divider,
} from '@mui/material';
import {
  Security as SecurityIcon,
  LocationOn as LocationIcon,
  Person as PersonIcon,
  Assignment as ReportIcon,
  Warning as IncidentIcon,
  Schedule as ScheduleIcon,
  Notifications as NotificationIcon,
  CheckCircle as ActiveIcon,
  Cancel as InactiveIcon,
} from '@mui/icons-material';
import { useAuth } from '../hooks/useAuth';
import { clientPortalAPI } from '../services/api';
import { getUserRole, isAdmin } from '../utils/roleUtils';
import { useUser } from '@clerk/clerk-react';

interface DashboardStats {
  activeSites: number;
  totalAgents: number;
  onDutyAgents: number;
  todayReports: number;
  openIncidents: number;
  completedShifts: number;
  satisfactionScore: number;
  responseTime: number;
}

interface RecentActivity {
  id: string;
  type: 'SHIFT_START' | 'SHIFT_END' | 'INCIDENT' | 'REPORT' | 'PATROL';
  title: string;
  description: string;
  timestamp: string;
  agentName?: string;
  siteName?: string;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

interface SiteStatus {
  id: string;
  name: string;
  status: 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE';
  agentsOnDuty: number;
  lastActivity: string;
  incidentCount: number;
}



const DashboardPage: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const { user } = useUser();

  // Check if current user is admin
  const userRole = getUserRole(user);
  const isAdminUser = isAdmin(userRole);

  // State management
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [siteStatuses, setSiteStatuses] = useState<SiteStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Data fetching functions
  const fetchDashboardData = useCallback(async () => {
    try {
      setError(null);
      
      // Use the clientPortalAPI service for consistent API calls
      const [statsResult, activityResult, sitesResult] = await Promise.all([
        clientPortalAPI.getDashboard().catch(err => {
          console.warn('Dashboard stats failed, using fallback:', err);
          return { data: { overview: { activeSites: 0, activeShifts: 0, incidentsToday: 0, pendingRequests: 0 } } };
        }),
        clientPortalAPI.getAnalytics().catch(err => {
          console.warn('Dashboard activity failed, using fallback:', err);
          return { data: { recentReports: [], recentIncidents: [], recentAttendance: [] } };
        }),
        clientPortalAPI.getSites().catch(err => {
          console.warn('Sites status failed, using fallback:', err);
          return { data: { sites: [] } };
        })
      ]);

      console.log('📊 API Response Debug:');
      console.log('Stats result:', statsResult);
      console.log('Activity result:', activityResult);
      console.log('Sites result:', sitesResult);

      // Handle stats data
      const statsData = statsResult.data?.overview || statsResult.data || {};
      setStats({
        activeSites: statsData.activeSites || 0,
        totalAgents: statsData.totalAgents || 0,
        onDutyAgents: statsData.activeShifts || 0,
        todayReports: statsData.todayReports || 0,
        openIncidents: statsData.incidentsToday || 0,
        completedShifts: statsData.completedShifts || 0,
        satisfactionScore: statsData.satisfactionScore || 0,
        responseTime: statsData.responseTime || 0,
      });

      // Handle activity data - the API returns an object with different activity types
      const activityData = activityResult.data || {};
      console.log('Raw activity data:', activityData);

      // Combine all activity types into a single array
      let combinedActivity: RecentActivity[] = [];

      if (activityData && typeof activityData === 'object') {
        // Add reports as activities
        if (Array.isArray(activityData.recentReports)) {
          combinedActivity = combinedActivity.concat(
            activityData.recentReports.map((report: any) => ({
              id: report.id,
              type: 'REPORT' as const,
              title: report.title,
              description: `Report by ${report.agentName} at ${report.siteName}`,
              timestamp: report.createdAt
            }))
          );
        }

        // Add incidents as activities
        if (Array.isArray(activityData.recentIncidents)) {
          combinedActivity = combinedActivity.concat(
            activityData.recentIncidents.map((incident: any) => ({
              id: incident.id,
              type: 'INCIDENT' as const,
              title: incident.title,
              description: `${incident.severity} incident reported by ${incident.reportedBy} at ${incident.siteName}`,
              timestamp: incident.occurredAt
            }))
          );
        }

        // Add attendance as activities
        if (Array.isArray(activityData.recentAttendance)) {
          combinedActivity = combinedActivity.concat(
            activityData.recentAttendance.map((attendance: any) => ({
              id: attendance.id,
              type: attendance.clockOutTime ? 'SHIFT_END' as const : 'SHIFT_START' as const,
              title: attendance.clockOutTime ? 'Shift Ended' : 'Shift Started',
              description: `${attendance.agentName} at ${attendance.siteName}`,
              timestamp: attendance.clockOutTime || attendance.clockInTime
            }))
          );
        }
      }

      // Sort by timestamp (most recent first)
      combinedActivity.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      console.log('Combined activity array:', combinedActivity);
      setRecentActivity(combinedActivity);

      // Handle sites data - the API returns an object with a sites array
      const sitesData = sitesResult.data || {};
      console.log('Raw sites data:', sitesData);

      // Extract the sites array from the response
      let sitesArray: SiteStatus[] = [];
      if (sitesData && sitesData.sites && Array.isArray(sitesData.sites)) {
        sitesArray = sitesData.sites.map((site: any) => ({
          id: site.id,
          name: site.name,
          status: site.status,
          agentsOnDuty: site.activeShifts || site.activeAgents?.length || 0,
          lastActivity: new Date().toISOString(), // Use current time as fallback
          incidentCount: site.openIncidents || 0
        }));
      }

      console.log('Processed sites array:', sitesArray);
      setSiteStatuses(sitesArray);
      setLastUpdated(new Date());

    } catch (err: any) {
      console.error('Failed to fetch dashboard data:', err);
      setError('Failed to load dashboard data. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Utility functions
  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'SHIFT_START':
      case 'SHIFT_END':
        return <ScheduleIcon color="primary" />;
      case 'INCIDENT':
        return <IncidentIcon color="error" />;
      case 'REPORT':
        return <ReportIcon color="info" />;
      case 'PATROL':
        return <SecurityIcon color="success" />;
      default:
        return <NotificationIcon />;
    }
  };

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case 'CRITICAL':
        return 'error';
      case 'HIGH':
        return 'warning';
      case 'MEDIUM':
        return 'info';
      case 'LOW':
        return 'success';
      default:
        return 'default';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
      case 'ON_DUTY':
        return 'success';
      case 'INACTIVE':
      case 'OFF_DUTY':
        return 'default';
      case 'MAINTENANCE':
      case 'BREAK':
        return 'warning';
      case 'EMERGENCY':
        return 'error';
      default:
        return 'default';
    }
  };

  // Import safe formatting utilities
  const formatTimeAgo = (timestamp: string | undefined | null) => {
    if (!timestamp) return 'N/A';
    try {
      const now = new Date();
      const time = new Date(timestamp);
      if (isNaN(time.getTime())) return 'Invalid Date';

      const diffInMinutes = Math.floor((now.getTime() - time.getTime()) / (1000 * 60));

      if (diffInMinutes < 1) return 'Just now';
      if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
      if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
      return `${Math.floor(diffInMinutes / 1440)}d ago`;
    } catch (error) {
      return 'N/A';
    }
  };

  // Effects
  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  useEffect(() => {
    const interval = setInterval(fetchDashboardData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [fetchDashboardData]);

  if (!isAuthenticated) {
    return null; // Or redirect to login
  }

  // Loading state
  if (loading && !stats) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={400}>
        <Box textAlign="center">
          <CircularProgress size={60} />
          <Typography variant="h6" sx={{ mt: 2 }}>
            Loading Dashboard...
          </Typography>
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Box display="flex" alignItems="center" gap={2}>
            <Typography variant="h4" gutterBottom>
              Security Dashboard
            </Typography>
            {isAdminUser && (
              <Chip
                label="Admin View"
                color="primary"
                size="small"
                sx={{ fontWeight: 'bold' }}
              />
            )}
          </Box>
          <Typography variant="body1" color="text.secondary">
            {isAdminUser ? 'Administrator dashboard with full system access' : 'Real-time monitoring and security oversight'}
          </Typography>
        </Box>
        <Box display="flex" gap={2} alignItems="center">
          {lastUpdated && (
            <Typography variant="caption" color="text.secondary">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </Typography>
          )}
          <Button
            variant="outlined"
            onClick={fetchDashboardData}
            disabled={loading}
          >
            Refresh
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Stats Cards */}
      {stats && (
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" gap={2}>
                  <LocationIcon color="primary" />
                  <Box>
                    <Typography variant="h6">{stats.activeSites}</Typography>
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
                <Box display="flex" alignItems="center" gap={2}>
                  <PersonIcon color="success" />
                  <Box>
                    <Typography variant="h6">{stats.onDutyAgents}/{stats.totalAgents}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Agents On Duty
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" gap={2}>
                  <ReportIcon color="info" />
                  <Box>
                    <Typography variant="h6">{stats.todayReports}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Today's Reports
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" gap={2}>
                  <IncidentIcon color="warning" />
                  <Box>
                    <Typography variant="h6">{stats.openIncidents}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Open Incidents
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Main Content Grid */}
      <Grid container spacing={3}>
        {/* Recent Activity */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, height: 400 }}>
            <Typography variant="h6" gutterBottom>
              Recent Activity
            </Typography>
            <List sx={{ maxHeight: 320, overflow: 'auto' }}>
              {Array.isArray(recentActivity) && recentActivity.length > 0 ? recentActivity.map((activity, index) => (
                <React.Fragment key={activity.id}>
                  <ListItem>
                    <ListItemAvatar>
                      <Avatar>
                        {getActivityIcon(activity.type)}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={activity.title}
                      secondary={
                        <Box>
                          <Typography variant="body2" paragraph>
                            {activity.description}
                          </Typography>
                          <Box display="flex" gap={1} alignItems="center">
                            {activity.priority && (
                              <Chip
                                label={activity.priority}
                                color={getPriorityColor(activity.priority) as any}
                                size="small"
                              />
                            )}
                            <Typography variant="caption" color="text.secondary">
                              {formatTimeAgo(activity.timestamp)}
                            </Typography>
                          </Box>
                        </Box>
                      }
                    />
                  </ListItem>
                  {index < recentActivity.length - 1 && <Divider />}
                </React.Fragment>
              )) : (
                <ListItem>
                  <ListItemText
                    primary="No recent activity"
                    secondary="Activity will appear here when available"
                  />
                </ListItem>
              )}
            </List>
          </Paper>
        </Grid>

        {/* Site Status */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, height: 400 }}>
            <Typography variant="h6" gutterBottom>
              Site Status
            </Typography>
            <List sx={{ maxHeight: 320, overflow: 'auto' }}>
              {Array.isArray(siteStatuses) && siteStatuses.length > 0 ? siteStatuses.map((site, index) => (
                <React.Fragment key={site.id}>
                  <ListItem>
                    <ListItemAvatar>
                      <Avatar sx={{ bgcolor: getStatusColor(site.status) + '.main' }}>
                        {site.status === 'ACTIVE' ? <ActiveIcon /> : <InactiveIcon />}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={site.name}
                      secondary={
                        <Box>
                          <Typography variant="body2">
                            {site.agentsOnDuty} agents on duty
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Last activity: {formatTimeAgo(site.lastActivity)}
                          </Typography>
                          {site.incidentCount > 0 && (
                            <Chip
                              label={`${site.incidentCount} incidents`}
                              color="warning"
                              size="small"
                              sx={{ ml: 1 }}
                            />
                          )}
                        </Box>
                      }
                    />
                    <Chip
                      label={site.status}
                      color={getStatusColor(site.status) as any}
                      size="small"
                    />
                  </ListItem>
                  {index < siteStatuses.length - 1 && <Divider />}
                </React.Fragment>
              )) : (
                <ListItem>
                  <ListItemText
                    primary="No sites available"
                    secondary="Site status will appear here when available"
                  />
                </ListItem>
              )}
            </List>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default DashboardPage;
