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
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  Speed as SpeedIcon,
  Timer as TimerIcon,
  TrendingUp as TrendingUpIcon,
  Assessment as AssessmentIcon,
} from '@mui/icons-material';
import { clientPortalAPI, isAuthenticationAvailable } from '../../services/api';

interface PerformanceMetrics {
  responseTime: {
    average: number;
    median: number;
    p95: number;
    p99: number;
    trend: 'up' | 'down' | 'stable';
  };
  resolutionTime: {
    average: number;
    median: number;
    p95: number;
    p99: number;
    trend: 'up' | 'down' | 'stable';
  };
  throughput: {
    reportsPerHour: number;
    reportsPerDay: number;
    peakHours: string[];
    trend: 'up' | 'down' | 'stable';
  };
  efficiency: {
    completionRate: number;
    firstTimeResolution: number;
    escalationRate: number;
    customerSatisfaction: number;
  };
  agentPerformance: {
    agentId: string;
    agentName: string;
    reportsHandled: number;
    averageResponseTime: number;
    averageResolutionTime: number;
    completionRate: number;
  }[];
  sitePerformance: {
    siteId: string;
    siteName: string;
    totalReports: number;
    averageResponseTime: number;
    averageResolutionTime: number;
    incidentRate: number;
  }[];
  timeSeriesData: {
    timestamp: string;
    responseTime: number;
    resolutionTime: number;
    throughput: number;
  }[];
}

const PerformancePage: React.FC = () => {
  
  // State management
  const [performance, setPerformance] = useState<PerformanceMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState('7d');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Data fetching function
  const fetchPerformance = useCallback(async () => {
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

      const response = await clientPortalAPI.getPerformanceMetrics({ timeRange });
      setPerformance(response.data);
      setLastUpdated(new Date());
    } catch (err: any) {
      console.error('Error fetching performance data:', err);
      if (err.response?.status === 401) {
        setError('Authentication not available. Please log in.');
      } else {
        setError(err instanceof Error ? err.message : 'Failed to fetch performance data');
      }
    } finally {
      setLoading(false);
    }
  }, [timeRange]);

  // Initial data load
  useEffect(() => {
    fetchPerformance();
  }, [fetchPerformance]);

  const handleRefresh = () => {
    fetchPerformance();
  };

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up':
        return <TrendingUpIcon color="success" />;
      case 'down':
        return <TrendingUpIcon color="error" sx={{ transform: 'rotate(180deg)' }} />;
      default:
        return <TrendingUpIcon color="disabled" sx={{ transform: 'rotate(90deg)' }} />;
    }
  };

  const getTrendColor = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up':
        return 'success.main';
      case 'down':
        return 'error.main';
      default:
        return 'text.secondary';
    }
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
          Performance Metrics
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

      {performance ? (
        <Grid container spacing={3}>
          {/* Response Time Metrics */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                  <Box display="flex" alignItems="center">
                    <TimerIcon color="primary" sx={{ mr: 1 }} />
                    <Typography variant="h6">Response Time</Typography>
                  </Box>
                  {getTrendIcon(performance.responseTime.trend)}
                </Box>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">Average</Typography>
                    <Typography variant="h5" color={getTrendColor(performance.responseTime.trend)}>
                      {performance.responseTime.average.toFixed(1)}m
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">Median</Typography>
                    <Typography variant="h5">
                      {performance.responseTime.median.toFixed(1)}m
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">95th Percentile</Typography>
                    <Typography variant="body1">
                      {performance.responseTime.p95.toFixed(1)}m
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">99th Percentile</Typography>
                    <Typography variant="body1">
                      {performance.responseTime.p99.toFixed(1)}m
                    </Typography>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* Resolution Time Metrics */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                  <Box display="flex" alignItems="center">
                    <SpeedIcon color="success" sx={{ mr: 1 }} />
                    <Typography variant="h6">Resolution Time</Typography>
                  </Box>
                  {getTrendIcon(performance.resolutionTime.trend)}
                </Box>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">Average</Typography>
                    <Typography variant="h5" color={getTrendColor(performance.resolutionTime.trend)}>
                      {performance.resolutionTime.average.toFixed(1)}h
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">Median</Typography>
                    <Typography variant="h5">
                      {performance.resolutionTime.median.toFixed(1)}h
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">95th Percentile</Typography>
                    <Typography variant="body1">
                      {performance.resolutionTime.p95.toFixed(1)}h
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">99th Percentile</Typography>
                    <Typography variant="body1">
                      {performance.resolutionTime.p99.toFixed(1)}h
                    </Typography>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* Throughput Metrics */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                  <Box display="flex" alignItems="center">
                    <AssessmentIcon color="info" sx={{ mr: 1 }} />
                    <Typography variant="h6">Throughput</Typography>
                  </Box>
                  {getTrendIcon(performance.throughput.trend)}
                </Box>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">Reports/Hour</Typography>
                    <Typography variant="h5" color={getTrendColor(performance.throughput.trend)}>
                      {performance.throughput.reportsPerHour}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">Reports/Day</Typography>
                    <Typography variant="h5">
                      {performance.throughput.reportsPerDay}
                    </Typography>
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Peak Hours
                    </Typography>
                    <Box display="flex" gap={1} flexWrap="wrap">
                      {performance.throughput.peakHours.map((hour, index) => (
                        <Chip key={index} label={hour} size="small" />
                      ))}
                    </Box>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* Efficiency Metrics */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Efficiency Metrics
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">Completion Rate</Typography>
                    <Typography variant="h5" color="primary">
                      {performance.efficiency.completionRate.toFixed(1)}%
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">First Time Resolution</Typography>
                    <Typography variant="h5" color="success.main">
                      {performance.efficiency.firstTimeResolution.toFixed(1)}%
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">Escalation Rate</Typography>
                    <Typography variant="h5" color="warning.main">
                      {performance.efficiency.escalationRate.toFixed(1)}%
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">Customer Satisfaction</Typography>
                    <Typography variant="h5" color="info.main">
                      {performance.efficiency.customerSatisfaction.toFixed(1)}/5
                    </Typography>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* Top Performing Agents */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Top Performing Agents
                </Typography>
                <Box>
                  {performance.agentPerformance.slice(0, 5).map((agent, index) => (
                    <Box key={index} mb={2}>
                      <Box display="flex" justifyContent="space-between" alignItems="center">
                        <Typography variant="body2" fontWeight="medium">
                          {agent.agentName}
                        </Typography>
                        <Chip 
                          label={`${agent.completionRate.toFixed(1)}%`} 
                          size="small" 
                          color="primary" 
                        />
                      </Box>
                      <Typography variant="caption" color="text.secondary">
                        {agent.reportsHandled} reports • {agent.averageResponseTime.toFixed(1)}m avg response
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Site Performance */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Site Performance
                </Typography>
                <Box>
                  {performance.sitePerformance.slice(0, 5).map((site, index) => (
                    <Box key={index} mb={2}>
                      <Box display="flex" justifyContent="space-between" alignItems="center">
                        <Typography variant="body2" fontWeight="medium">
                          {site.siteName}
                        </Typography>
                        <Chip 
                          label={`${site.incidentRate.toFixed(2)}%`} 
                          size="small" 
                          color={site.incidentRate < 5 ? 'success' : site.incidentRate < 10 ? 'warning' : 'error'}
                        />
                      </Box>
                      <Typography variant="caption" color="text.secondary">
                        {site.totalReports} reports • {site.averageResponseTime.toFixed(1)}m avg response
                      </Typography>
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
            No performance data available
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Click refresh to load data
          </Typography>
        </Paper>
      )}
    </Box>
  );
};

export default PerformancePage;