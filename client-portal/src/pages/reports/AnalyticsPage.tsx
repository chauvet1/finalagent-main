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
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  TrendingUp as TrendingUpIcon,
  Assessment as AssessmentIcon,
  Timeline as TimelineIcon,
  PieChart as PieChartIcon,
} from '@mui/icons-material';
import { useAuth } from '../../hooks/useAuth';
import { isAuthenticationAvailable, getCurrentTokenInfo, clientAPI } from '../../services/api';

interface AnalyticsData {
  totalReports: number;
  reportsByType: { type: string; count: number; percentage: number }[];
  reportsByStatus: { status: string; count: number; percentage: number }[];
  reportsByPriority: { priority: string; count: number; percentage: number }[];
  trendsData: {
    period: string;
    reports: number;
    incidents: number;
    resolved: number;
  }[];
  averageResponseTime: number;
  averageResolutionTime: number;
  topSites: { siteId: string; siteName: string; reportCount: number }[];
  topAgents: { agentId: string; agentName: string; reportCount: number }[];
}

const AnalyticsPage: React.FC = () => {
  const { user } = useAuth();
  
  // State management
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Data fetching function
  const fetchAnalytics = useCallback(async () => {
    // Check authentication availability first
    const authAvailable = await isAuthenticationAvailable();
    if (!authAvailable) {
      setError('Authentication not available. Please log in.');
      setLoading(false);
      return;
    }

    try {
      setError(null);
      setLoading(true);

      // Get current token info for debugging
      const tokenInfo = await getCurrentTokenInfo();
      console.debug(`Loading analytics with ${tokenInfo?.type || 'unknown'} token`);

      // Use the enhanced API service (token automatically injected)
      const response = await clientAPI.getAnalytics();
      setAnalytics(response.data);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Error fetching analytics:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch analytics data');
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial data load
  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const handleRefresh = () => {
    fetchAnalytics();
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
          Analytics Dashboard
        </Typography>
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={handleRefresh}
          disabled={loading}
        >
          Refresh
        </Button>
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

      {analytics ? (
        <Grid container spacing={3}>
          {/* Overview Cards */}
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" mb={2}>
                  <AssessmentIcon color="primary" sx={{ mr: 1 }} />
                  <Typography variant="h6">Total Reports</Typography>
                </Box>
                <Typography variant="h3" color="primary">
                  {analytics.totalReports.toLocaleString()}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" mb={2}>
                  <TimelineIcon color="success" sx={{ mr: 1 }} />
                  <Typography variant="h6">Avg Response Time</Typography>
                </Box>
                <Typography variant="h3" color="success.main">
                  {analytics.averageResponseTime}m
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" mb={2}>
                  <TrendingUpIcon color="warning" sx={{ mr: 1 }} />
                  <Typography variant="h6">Avg Resolution Time</Typography>
                </Box>
                <Typography variant="h3" color="warning.main">
                  {analytics.averageResolutionTime}h
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" mb={2}>
                  <PieChartIcon color="info" sx={{ mr: 1 }} />
                  <Typography variant="h6">Report Types</Typography>
                </Box>
                <Typography variant="h3" color="info.main">
                  {analytics.reportsByType.length}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          {/* Reports by Type */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Reports by Type
                </Typography>
                <Box>
                  {analytics.reportsByType.map((item, index) => (
                    <Box key={index} display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                      <Typography variant="body2">{item.type}</Typography>
                      <Box display="flex" alignItems="center" gap={1}>
                        <Chip label={`${item.count}`} size="small" />
                        <Typography variant="body2" color="text.secondary">
                          {item.percentage.toFixed(1)}%
                        </Typography>
                      </Box>
                    </Box>
                  ))}
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Reports by Status */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Reports by Status
                </Typography>
                <Box>
                  {analytics.reportsByStatus.map((item, index) => (
                    <Box key={index} display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                      <Typography variant="body2">{item.status}</Typography>
                      <Box display="flex" alignItems="center" gap={1}>
                        <Chip label={`${item.count}`} size="small" />
                        <Typography variant="body2" color="text.secondary">
                          {item.percentage.toFixed(1)}%
                        </Typography>
                      </Box>
                    </Box>
                  ))}
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Top Sites */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Top Sites by Reports
                </Typography>
                <Box>
                  {analytics.topSites.map((site, index) => (
                    <Box key={index} display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                      <Typography variant="body2">{site.siteName}</Typography>
                      <Chip label={`${site.reportCount}`} size="small" color="primary" />
                    </Box>
                  ))}
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Top Agents */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Top Agents by Reports
                </Typography>
                <Box>
                  {analytics.topAgents.map((agent, index) => (
                    <Box key={index} display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                      <Typography variant="body2">{agent.agentName}</Typography>
                      <Chip label={`${agent.reportCount}`} size="small" color="secondary" />
                    </Box>
                  ))}
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      ) : (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h6" color="text.secondary">
            No analytics data available
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Click refresh to load data
          </Typography>
        </Paper>
      )}
    </Box>
  );
};

export default AnalyticsPage;