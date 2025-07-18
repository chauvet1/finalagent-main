import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  Alert,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Paper,
  LinearProgress,
  Avatar,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Divider,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  Star as StarIcon,
  Assignment as AssignmentIcon,
  Schedule as ScheduleIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Person as PersonIcon,
} from '@mui/icons-material';
import { isAuthenticationAvailable, getCurrentTokenInfo, adminAPI } from '../../services/api';



interface PerformanceMetric {
  id: string;
  agentId: string;
  metricType: string;
  value: number;
  target: number;
  period: string;
  createdAt: string;
  agent: {
    id: string;
    employeeId: string;
    user: {
      firstName: string;
      lastName: string;
      email: string;
    };
  };
}

interface PerformanceStats {
  overview: {
    totalAgents: number;
    activeShifts: number;
    completedShifts: number;
    averageRating: number;
    totalIncidents: number;
    period: string;
  };
  metrics: {
    productivity: {
      current: number;
      target: number;
      trend: string;
      change: number;
    };
    quality: {
      current: number;
      target: number;
      trend: string;
      change: number;
    };
    efficiency: {
      current: number;
      target: number;
      trend: string;
      change: number;
    };
    satisfaction: {
      current: number;
      target: number;
      trend: string;
      change: number;
    };
  };
  trends: {
    daily: Array<{
      date: string;
      productivity: number;
      quality: number;
      efficiency: number;
    }>;
  };
}

interface TopPerformer {
  id: string;
  rank: number;
  name: string;
  employeeId: string;
  rating: number;
  performanceScore: number;
  completedShifts: number;
  totalShifts: number;
  metrics: {
    productivity: number;
    quality: number;
    efficiency: number;
    punctuality: number;
  };
  achievements: string[];
}

const PerformanceTrackingPage: React.FC = () => {
  // State management
  const [metrics, setMetrics] = useState<PerformanceMetric[]>([]);
  const [stats, setStats] = useState<PerformanceStats | null>(null);
  const [topPerformers, setTopPerformers] = useState<TopPerformer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  const [selectedMetric, setSelectedMetric] = useState('overall');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Data fetching functions
  const fetchPerformanceData = useCallback(async () => {
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
      console.debug(`Loading performance data with ${tokenInfo.type} token`);

      // Use the enhanced API service (token automatically injected)
      const [metricsResponse, statsResponse, topPerformersResponse] = await Promise.all([
        adminAPI.getPerformanceMetrics({ period: selectedPeriod, metric: selectedMetric }),
        adminAPI.getPerformanceKPIs({ period: selectedPeriod }),
        adminAPI.getPerformanceReports({ period: selectedPeriod, limit: 10, type: 'top-performers' })
      ]);

      setMetrics(metricsResponse.data.data || []);
      setStats(statsResponse.data.data || {
        overview: {
          totalAgents: 0,
          activeShifts: 0,
          completedShifts: 0,
          averageRating: 0,
          totalIncidents: 0,
          period: 'month'
        },
        metrics: {
          productivity: { current: 0, target: 0, trend: 'stable', change: 0 },
          quality: { current: 0, target: 0, trend: 'stable', change: 0 },
          efficiency: { current: 0, target: 0, trend: 'stable', change: 0 },
          satisfaction: { current: 0, target: 0, trend: 'stable', change: 0 }
        },
        trends: { daily: [] }
      });
      setTopPerformers(topPerformersResponse.data.data || []);
      setLastUpdated(new Date());

    } catch (err: any) {
      console.error('Failed to fetch performance data:', err);
      if (err.response?.status === 401) {
        setError('Authentication not available. Please log in.');
      } else if (err.response?.status === 403) {
        setError('You do not have permission to view performance data.');
      } else if (err.code === 'NETWORK_ERROR') {
        setError('Network error occurred. Please try again.');
      } else {
        setError('Failed to load performance data. Please check your connection and try again.');
      }
      setMetrics([]);
      setStats(null);
      setTopPerformers([]);
    } finally {
      setLoading(false);
    }
  }, [selectedPeriod, selectedMetric]);

  // Utility functions
  const getScoreColor = (score: number) => {
    if (score >= 90) return 'success';
    if (score >= 75) return 'info';
    if (score >= 60) return 'warning';
    return 'error';
  };



  // Effects
  useEffect(() => {
    fetchPerformanceData();
  }, [fetchPerformanceData]);

  // Loading state
  if (loading && metrics.length === 0) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={400}>
        <Box textAlign="center">
          <CircularProgress size={60} />
          <Typography variant="h6" sx={{ mt: 2 }}>
            Loading Performance Data...
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
          <Typography variant="h4" gutterBottom>
            Performance Tracking
          </Typography>
          <Typography variant="body1" color="text.secondary">
            KPI visualization, metrics analysis, and performance optimization
          </Typography>
        </Box>
        <Box display="flex" gap={2} alignItems="center">
          {lastUpdated && (
            <Typography variant="caption" color="text.secondary">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </Typography>
          )}
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Period</InputLabel>
            <Select
              value={selectedPeriod}
              label="Period"
              onChange={(e) => setSelectedPeriod(e.target.value)}
            >
              <MenuItem value="week">This Week</MenuItem>
              <MenuItem value="month">This Month</MenuItem>
              <MenuItem value="quarter">This Quarter</MenuItem>
              <MenuItem value="year">This Year</MenuItem>
            </Select>
          </FormControl>
          <Button
            variant="outlined"
            onClick={fetchPerformanceData}
            startIcon={<RefreshIcon />}
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

      {/* Performance Stats Cards */}
      {stats && (
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" gap={2}>
                  <PersonIcon color="primary" />
                  <Box flex={1}>
                    <Typography variant="h6">{stats.overview.totalAgents}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Total Agents
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
                  <StarIcon color="warning" />
                  <Box flex={1}>
                    <Typography variant="h6">{Math.round(stats.overview.averageRating * 20)}%</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Average Score
                    </Typography>
                    <LinearProgress
                      variant="determinate"
                      value={stats.overview.averageRating * 20}
                      color={getScoreColor(stats.overview.averageRating * 20) as any}
                      sx={{ mt: 1 }}
                    />
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" gap={2}>
                  <CheckCircleIcon color="success" />
                  <Box flex={1}>
                    <Typography variant="h6">{stats.overview.activeShifts}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Active Shifts
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
                  <WarningIcon color="warning" />
                  <Box flex={1}>
                    <Typography variant="h6">{stats.overview.totalIncidents}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Total Incidents
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Key Metrics */}
      {stats && (
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Productivity
                </Typography>
                <Box display="flex" alignItems="center" gap={2}>
                  <Box flex={1}>
                    <Typography variant="h4" color="primary">
                      {stats.metrics.productivity.current}%
                    </Typography>
                    <LinearProgress
                      variant="determinate"
                      value={stats.metrics.productivity.current}
                      color="primary"
                      sx={{ mt: 1 }}
                    />
                  </Box>
                  <ScheduleIcon color="primary" />
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Quality Score
                </Typography>
                <Box display="flex" alignItems="center" gap={2}>
                  <Box flex={1}>
                    <Typography variant="h4" color="success.main">
                      {stats.metrics.quality.current}%
                    </Typography>
                    <LinearProgress
                      variant="determinate"
                      value={stats.metrics.quality.current}
                      color="success"
                      sx={{ mt: 1 }}
                    />
                  </Box>
                  <AssignmentIcon color="success" />
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Efficiency Score
                </Typography>
                <Box display="flex" alignItems="center" gap={2}>
                  <Box flex={1}>
                    <Typography variant="h4" color="info.main">
                      {stats.metrics.efficiency.current}%
                    </Typography>
                    <LinearProgress
                      variant="determinate"
                      value={stats.metrics.efficiency.current}
                      color="info"
                      sx={{ mt: 1 }}
                    />
                  </Box>
                  <StarIcon color="info" />
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Satisfaction Score
                </Typography>
                <Box display="flex" alignItems="center" gap={2}>
                  <Box flex={1}>
                    <Typography variant="h4" color="warning.main">
                      {stats.metrics.satisfaction.current}%
                    </Typography>
                    <LinearProgress
                      variant="determinate"
                      value={stats.metrics.satisfaction.current}
                      color="warning"
                      sx={{ mt: 1 }}
                    />
                  </Box>
                  <WarningIcon color="warning" />
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Top Performers */}
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Top Performers ({selectedPeriod})
        </Typography>
        <List>
          {topPerformers.map((performer, index) => (
            <React.Fragment key={performer.id}>
              <ListItem>
                <ListItemAvatar>
                  <Avatar sx={{ bgcolor: getScoreColor(performer.performanceScore) + '.main' }}>
                    {performer.rank}
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={
                    <Box display="flex" justifyContent="space-between" alignItems="center">
                      <Typography variant="subtitle1">
                        {performer.name}
                      </Typography>
                      <Box display="flex" alignItems="center" gap={1}>
                        <StarIcon fontSize="small" color="primary" />
                        <Chip
                          label={`${performer.performanceScore}%`}
                          color={getScoreColor(performer.performanceScore) as any}
                          size="small"
                        />
                      </Box>
                    </Box>
                  }
                  secondary={
                    <Box display="flex" justifyContent="space-between" alignItems="center">
                      <Typography variant="caption">
                        Employee ID: {performer.employeeId}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {performer.completedShifts}/{performer.totalShifts} shifts • Rating: {performer.rating}/5
                      </Typography>
                    </Box>
                  }
                  primaryTypographyProps={{ component: 'div' }}
                  secondaryTypographyProps={{ component: 'div' }}
                />
              </ListItem>
              {index < topPerformers.length - 1 && <Divider />}
            </React.Fragment>
          ))}
        </List>
      </Paper>
    </Box>
  );
};

export default PerformanceTrackingPage;
