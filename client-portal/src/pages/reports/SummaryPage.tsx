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
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  GetApp as ExportIcon,
  Summarize as SummarizeIcon,
  TrendingUp as TrendingUpIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon,
  Assignment as AssignmentIcon,
} from '@mui/icons-material';
import { clientPortalAPI, isAuthenticationAvailable } from '../../services/api';

interface SummaryData {
  overview: {
    totalReports: number;
    totalIncidents: number;
    totalServiceRequests: number;
    activeAgents: number;
    activeSites: number;
    reportsTrend: number;
    incidentsTrend: number;
    serviceRequestsTrend: number;
  };
  recentActivity: {
    id: string;
    type: 'REPORT' | 'INCIDENT' | 'SERVICE_REQUEST';
    title: string;
    status: string;
    priority: string;
    timestamp: string;
    agentName?: string;
    siteName: string;
  }[];
  keyMetrics: {
    averageResponseTime: number;
    averageResolutionTime: number;
    completionRate: number;
    customerSatisfaction: number;
    firstTimeResolution: number;
    escalationRate: number;
  };
  alerts: {
    id: string;
    type: 'WARNING' | 'ERROR' | 'INFO';
    title: string;
    description: string;
    timestamp: string;
    resolved: boolean;
  }[];
  topIssues: {
    issue: string;
    count: number;
    trend: 'up' | 'down' | 'stable';
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  }[];
  siteStatus: {
    siteId: string;
    siteName: string;
    status: 'OPERATIONAL' | 'WARNING' | 'CRITICAL' | 'MAINTENANCE';
    lastUpdate: string;
    activeIncidents: number;
    onDutyAgents: number;
  }[];
  periodComparison: {
    current: {
      reports: number;
      incidents: number;
      serviceRequests: number;
      responseTime: number;
    };
    previous: {
      reports: number;
      incidents: number;
      serviceRequests: number;
      responseTime: number;
    };
  };
}

const SummaryPage: React.FC = () => {

  // State management
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState('7d');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Data fetching function
  const fetchSummary = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);

      // Check authentication availability
      const authAvailable = await isAuthenticationAvailable();
      if (!authAvailable) {
        setError('Authentication not available. Please log in.');
        setLoading(false);
        return;
      }

      const response = await clientPortalAPI.getSummaryData({ timeRange });
      setSummary(response.data);
      setLastUpdated(new Date());
    } catch (err: any) {
      console.error('Error fetching summary data:', err);
      if (err.response?.status === 401) {
        setError('Authentication not available. Please log in.');
      } else {
        setError(err instanceof Error ? err.message : 'Failed to fetch summary data');
      }
    } finally {
      setLoading(false);
    }
  }, [timeRange]);

  // Initial data load
  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  const handleRefresh = () => {
    fetchSummary();
  };

  const handleExport = async () => {
    try {
      setError(null);

      const response = await clientPortalAPI.exportSummaryReport({ timeRange, format: 'pdf' });

      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `summary-report-${timeRange}-${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      console.error('Error exporting summary:', err);
      if (err.response?.status === 401) {
        setError('Authentication not available. Please log in.');
      } else {
        setError(err instanceof Error ? err.message : 'Failed to export summary');
      }
    }
  };

const getStatusColor = (status: string) => {
  switch (status.toUpperCase()) {
    case 'OPERATIONAL':
      return 'success';
    case 'WARNING':
      return 'warning';
    case 'CRITICAL':
      return 'error';
    case 'MAINTENANCE':
      return 'info';
    default:
      return 'default';
  }
};

const getSeverityColor = (severity: string) => {
  switch (severity.toUpperCase()) {
    case 'LOW':
      return 'success';
    case 'MEDIUM':
      return 'warning';
    case 'HIGH':
      return 'error';
    case 'CRITICAL':
      return 'error';
    default:
      return 'default';
  }
};

const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
  switch (trend) {
    case 'up':
      return <TrendingUpIcon color="error" />;
    case 'down':
      return <TrendingUpIcon color="success" sx={{ transform: 'rotate(180deg)' }} />;
    default:
      return <TrendingUpIcon color="disabled" sx={{ transform: 'rotate(90deg)' }} />;
  }
};

const calculatePercentageChange = (current: number, previous: number) => {
  if (previous === 0) return 0;
  return ((current - previous) / previous) * 100;
};

if (loading) {
  return (
    <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
      <CircularProgress />
    </Box>
  );
}

return (
  <Box sx={{ p: 3 }}>
    {/* Header */}
    <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
      <Typography variant="h4" component="h1">
        Executive Summary
      </Typography>
      <Box display="flex" gap={2} alignItems="center">
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>Time Range</InputLabel>
          <Select
            value={timeRange}
            label="Time Range"
            onChange={(e) => setTimeRange(e.target.value)}
          >
            <MenuItem value="24h">Last 24 Hours</MenuItem>
            <MenuItem value="7d">Last 7 Days</MenuItem>
            <MenuItem value="30d">Last 30 Days</MenuItem>
            <MenuItem value="90d">Last 90 Days</MenuItem>
          </Select>
        </FormControl>
        <Button
          variant="outlined"
          startIcon={<ExportIcon />}
          onClick={handleExport}
          disabled={loading || !summary}
        >
          Export
        </Button>
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={handleRefresh}
          disabled={loading}
        >
          Refresh
        </Button>
      </Box>
    </Box>

    {/* Error Alert */}
    {error && (
      <Alert severity="error" sx={{ mb: 3 }}>
        {error}
      </Alert>
    )}

    {/* Last Updated */}
    {lastUpdated && (
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Last updated: {lastUpdated.toLocaleString()}
      </Typography>
    )}

    {summary ? (
      <Grid container spacing={3}>
        {/* Overview Cards */}
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <AssignmentIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6">Total Reports</Typography>
              </Box>
              <Typography variant="h3" color="primary">
                {summary.overview.totalReports.toLocaleString()}
              </Typography>
              {summary.periodComparison && (
                <Typography variant="body2" color="text.secondary">
                  {calculatePercentageChange(
                    summary.periodComparison.current.reports,
                    summary.periodComparison.previous.reports
                  ).toFixed(1)}% vs previous period
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <WarningIcon color="error" sx={{ mr: 1 }} />
                <Typography variant="h6">Total Incidents</Typography>
              </Box>
              <Typography variant="h3" color="error.main">
                {(summary.overview.totalIncidents || 0).toLocaleString()}
              </Typography>
              {summary.periodComparison && (
                <Typography variant="body2" color="text.secondary">
                  {calculatePercentageChange(
                    summary.periodComparison.current.incidents,
                    summary.periodComparison.previous.incidents
                  ).toFixed(1)}% vs previous period
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <ScheduleIcon color="info" sx={{ mr: 1 }} />
                <Typography variant="h6">Service Requests</Typography>
              </Box>
              <Typography variant="h3" color="info.main">
                {(summary.overview.totalServiceRequests || 0).toLocaleString()}
              </Typography>
              {summary.periodComparison && (
                <Typography variant="body2" color="text.secondary">
                  {calculatePercentageChange(
                    summary.periodComparison.current.serviceRequests,
                    summary.periodComparison.previous.serviceRequests
                  ).toFixed(1)}% vs previous period
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <CheckCircleIcon color="success" sx={{ mr: 1 }} />
                <Typography variant="h6">Active Sites</Typography>
              </Box>
              <Typography variant="h3" color="success.main">
                {summary.overview.activeSites.toLocaleString()}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {summary.overview.activeAgents} agents on duty
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Key Metrics */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Key Performance Metrics
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">Avg Response Time</Typography>
                  <Typography variant="h5" color="primary">
                    {summary.keyMetrics.averageResponseTime.toFixed(1)}m
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">Avg Resolution Time</Typography>
                  <Typography variant="h5" color="success.main">
                    {summary.keyMetrics.averageResolutionTime.toFixed(1)}h
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">Completion Rate</Typography>
                  <Typography variant="h5" color="info.main">
                    {summary.keyMetrics.completionRate.toFixed(1)}%
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">Customer Satisfaction</Typography>
                  <Typography variant="h5" color="warning.main">
                    {summary.keyMetrics.customerSatisfaction.toFixed(1)}/5
                  </Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Alerts */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Active Alerts
              </Typography>
              <List dense>
                {summary.alerts.filter(alert => !alert.resolved).slice(0, 5).map((alert) => (
                  <ListItem key={alert.id}>
                    <ListItemIcon>
                      {alert.type === 'ERROR' ? (
                        <WarningIcon color="error" />
                      ) : alert.type === 'WARNING' ? (
                        <WarningIcon color="warning" />
                      ) : (
                        <WarningIcon color="info" />
                      )}
                    </ListItemIcon>
                    <ListItemText
                      primary={alert.title}
                      secondary={alert.description}
                    />
                  </ListItem>
                ))}
                {summary.alerts.filter(alert => !alert.resolved).length === 0 && (
                  <ListItem>
                    <ListItemIcon>
                      <CheckCircleIcon color="success" />
                    </ListItemIcon>
                    <ListItemText primary="No active alerts" />
                  </ListItem>
                )}
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Top Issues */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Top Issues
              </Typography>
              <Box>
                {summary.topIssues.slice(0, 5).map((issue, index) => (
                  <Box key={index} display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                    <Box flex={1}>
                      <Typography variant="body2" fontWeight="medium">
                        {issue.issue}
                      </Typography>
                      <Box display="flex" alignItems="center" gap={1}>
                        <Chip
                          label={issue.severity}
                          size="small"
                          color={getSeverityColor(issue.severity) as any}
                        />
                        {getTrendIcon(issue.trend)}
                      </Box>
                    </Box>
                    <Typography variant="h6" color="primary">
                      {issue.count}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Site Status */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Site Status Overview
              </Typography>
              <Box>
                {summary.siteStatus.slice(0, 5).map((site, index) => (
                  <Box key={index} display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                    <Box flex={1}>
                      <Typography variant="body2" fontWeight="medium">
                        {site.siteName}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {site.onDutyAgents} agents • {site.activeIncidents} incidents
                      </Typography>
                    </Box>
                    <Chip
                      label={site.status}
                      size="small"
                      color={getStatusColor(site.status) as any}
                    />
                  </Box>
                ))}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Recent Activity */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Recent Activity
              </Typography>
              <List>
                {summary.recentActivity.slice(0, 10).map((activity, index) => (
                  <React.Fragment key={activity.id}>
                    <ListItem>
                      <ListItemIcon>
                        {activity.type === 'INCIDENT' ? (
                          <WarningIcon color="error" />
                        ) : activity.type === 'SERVICE_REQUEST' ? (
                          <ScheduleIcon color="info" />
                        ) : (
                          <AssignmentIcon color="primary" />
                        )}
                      </ListItemIcon>
                      <ListItemText
                        primary={
                          <Box display="flex" alignItems="center" gap={1}>
                            <Typography variant="body2" fontWeight="medium">
                              {activity.title}
                            </Typography>
                            <Chip label={activity.status} size="small" />
                            <Chip label={activity.priority} size="small" color="secondary" />
                          </Box>
                        }
                        secondary={
                          <Typography variant="caption" color="text.secondary">
                            {activity.siteName} • {activity.agentName} • {new Date(activity.timestamp).toLocaleString()}
                          </Typography>
                        }
                      />
                    </ListItem>
                    {index < summary.recentActivity.length - 1 && <Divider />}
                  </React.Fragment>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    ) : (
      <Paper sx={{ p: 4, textAlign: 'center' }}>
        <SummarizeIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
        <Typography variant="h6" color="text.secondary">
          No summary data available
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          Click refresh to load data
        </Typography>
      </Paper>
    )}
  </Box>
);
};

export default SummaryPage;