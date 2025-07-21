import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
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
import { DashboardStats, RecentActivity, SiteStatus } from '../types/dashboard';
import { useUser } from '@clerk/clerk-react';

// Dashboard component with complete real data types



const DashboardPage: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const { user } = useUser();

  // Check if current user is admin
  const userRole = getUserRole(user);
  const isAdminUser = isAdmin(userRole);

  // State management
  const [stats, setStats] = useState<DashboardStats>({
    activeSites: 0,
    totalAgents: 0,
    onDutyAgents: 0,
    todayReports: 0,
    openIncidents: 0,
    completedShifts: 0,
    satisfactionScore: 0,
    responseTime: 0
  });
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [siteStatuses, setSiteStatuses] = useState<SiteStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  // Data fetching functions
  const fetchDashboardData = useCallback(async () => {
    try {
      // Use the clientPortalAPI service for consistent API calls
      const [statsResult, activityResult, sitesResult] = await Promise.all([
        clientPortalAPI.getDashboard(),
        clientPortalAPI.getAnalytics(),
        clientPortalAPI.getSites()
      ]);

      // Handle stats data with null checks and fallbacks
      const statsData = statsResult?.data?.overview || {};
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

    // Handle activity data with proper null checks
    const activityData = activityResult?.data || {};
    let combinedActivity: RecentActivity[] = [];

    // Add reports as activities (with null check)
    if (activityData.recentReports && Array.isArray(activityData.recentReports)) {
      combinedActivity = combinedActivity.concat(
        activityData.recentReports.map((report: any) => ({
          id: report.id || `report-${Date.now()}`,
          type: 'REPORT' as const,
          title: report.title || 'Untitled Report',
          description: `Report by ${report.agentName || 'Unknown Agent'} at ${report.siteName || 'Unknown Site'}`,
          timestamp: report.timestamp || report.createdAt || new Date().toISOString(),
          agentName: report.agentName || 'Unknown Agent',
          siteName: report.siteName || 'Unknown Site',
          priority: report.priority || 'NORMAL'
        }))
      );
    }

    // Add incidents as activities (with null check)
    if (activityData.recentIncidents && Array.isArray(activityData.recentIncidents)) {
      combinedActivity = combinedActivity.concat(
        activityData.recentIncidents.map((incident: any) => ({
          id: incident.id || `incident-${Date.now()}`,
          type: 'INCIDENT' as const,
          title: incident.title || 'Untitled Incident',
          description: `${incident.severity || 'Unknown'} incident reported by ${incident.reportedBy || 'Unknown Agent'} at ${incident.siteName || 'Unknown Site'}`,
          timestamp: incident.timestamp || incident.occurredAt || new Date().toISOString(),
          agentName: incident.reportedBy || 'Unknown Agent',
          siteName: incident.siteName || 'Unknown Site',
          priority: incident.severity || 'MEDIUM'
        }))
      );
    }

    // Add attendance as activities (with null check)
    if (activityData.recentAttendance && Array.isArray(activityData.recentAttendance)) {
      combinedActivity = combinedActivity.concat(
        activityData.recentAttendance.map((attendance: any) => ({
          id: attendance.id || `attendance-${Date.now()}`,
          type: attendance.clockOutTime ? 'SHIFT_END' as const : 'SHIFT_START' as const,
          title: attendance.clockOutTime ? 'Shift Ended' : 'Shift Started',
          description: `${attendance.agentName || 'Unknown Agent'} at ${attendance.siteName || 'Unknown Site'}`,
          timestamp: attendance.timestamp || attendance.clockInTime || new Date().toISOString(),
          agentName: attendance.agentName || 'Unknown Agent',
          siteName: attendance.siteName || 'Unknown Site',
          priority: 'LOW' as const
        }))
      );
    }

    // Sort by timestamp (most recent first) with proper date handling
    combinedActivity.sort((a, b) => {
      const dateA = new Date(a.timestamp || 0);
      const dateB = new Date(b.timestamp || 0);
      return dateB.getTime() - dateA.getTime();
    });

    setRecentActivity(combinedActivity);

    // Handle sites data with proper null checks
    const sitesData = sitesResult?.data || {};
    const sitesArray: SiteStatus[] = (sitesData.sites || []).map((site: any) => ({
      id: site.id || `site-${Date.now()}`,
      name: site.name || 'Unknown Site',
      status: site.status || 'UNKNOWN',
      agentsOnDuty: site.agentsOnSite || 0,
      lastActivity: site.lastUpdate,
      incidentCount: site.openIncidents
    }));

    setSiteStatuses(sitesArray);
    setLastUpdated(new Date());
    setLoading(false);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
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

  const getPriorityColor = (priority: string) => {
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

  // Format time ago utility
  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffInMinutes = Math.floor((now.getTime() - time.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
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
    return null;
  }

  // Loading state
  if (loading) {
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
          <Typography variant="caption" color="text.secondary">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </Typography>
          <Button
            variant="outlined"
            onClick={fetchDashboardData}
            disabled={loading}
          >
            Refresh
          </Button>
        </Box>
      </Box>

      {/* Stats Cards */}

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

      {/* Main Content Grid */}
      <Grid container spacing={3}>
        {/* Recent Activity */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, height: 400 }}>
            <Typography variant="h6" gutterBottom>
              Recent Activity
            </Typography>
            <List sx={{ maxHeight: 320, overflow: 'auto' }}>
              {recentActivity.map((activity, index) => (
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
                            <Chip
                              label={activity.priority}
                              color={getPriorityColor(activity.priority) as any}
                              size="small"
                            />
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
              ))}
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
