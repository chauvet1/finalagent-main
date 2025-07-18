import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Tabs,
  Tab,
  CircularProgress,
} from '@mui/material';
import {
  Analytics as AnalyticsIcon,
  TrendingUp as TrendingUpIcon,
  People as PeopleIcon,
  Security as SecurityIcon,
  Assessment as AssessmentIcon,
  Download as DownloadIcon,
  Refresh as RefreshIcon,
  DateRange as DateRangeIcon,
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';

import { useAuth } from '../../hooks/useAuth';
import { analyticsAPI, getCurrentTokenInfo, isAuthenticationAvailable } from '../../services/api';
import LoadingSpinner from '../../components/LoadingSpinner';

// Temporary fallback for Chart.js
let Chart: any, Line: any, Bar: any, Doughnut: any;
try {
  const chartjs = require('react-chartjs-2');
  Chart = chartjs.Chart;
  Line = chartjs.Line;
  Bar = chartjs.Bar;
  Doughnut = chartjs.Doughnut;
} catch (e) {
  // Fallback components if Chart.js is not available
  Line = ({ data, options, ...props }: any) => (
    <div style={{ height: '300px', background: '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      Chart.js not available - Line Chart
    </div>
  );
  Bar = ({ data, options, ...props }: any) => (
    <div style={{ height: '300px', background: '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      Chart.js not available - Bar Chart
    </div>
  );
  Doughnut = ({ data, options, ...props }: any) => (
    <div style={{ height: '300px', background: '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      Chart.js not available - Doughnut Chart
    </div>
  );
}

interface AnalyticsData {
  overview: {
    totalAgents: number;
    activeShifts: number;
    incidentsToday: number;
    sitesMonitored: number;
  };
  trends: {
    agentUtilization: number[];
    incidentTrends: number[];
    responseTime: number[];
    labels: string[];
  };
  performance: {
    topPerformers: Array<{
      name: string;
      score: number;
      shifts: number;
    }>;
    sitePerformance: Array<{
      siteName: string;
      incidents: number;
      coverage: number;
    }>;
  };
}

const AnalyticsPage: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
    endDate: new Date(),
  });
  const [selectedMetric, setSelectedMetric] = useState('overview');
  const [retryCount, setRetryCount] = useState(0);
  const [circuitBreakerOpen, setCircuitBreakerOpen] = useState(false);

  useEffect(() => {
    // Add a delay to prevent immediate API calls on mount
    const timer = setTimeout(() => {
      loadAnalyticsData();
    }, 1000);
    
    return () => clearTimeout(timer);
  }, [dateRange]);

  const loadAnalyticsData = async () => {
    // Check authentication availability first
    const authAvailable = await isAuthenticationAvailable();
    if (!authAvailable) {
      setError('Authentication not available. Please log in.');
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Use the enhanced analytics API service
      const response = await analyticsAPI.getDashboard({
        startDate: dateRange.startDate.toISOString(),
        endDate: dateRange.endDate.toISOString(),
        metrics: ['overview', 'trends', 'performance']
      });

      if (response.data.success && response.data.data) {
        setAnalyticsData(response.data.data);
        setRetryCount(0);
        setCircuitBreakerOpen(false);
      } else {
        throw new Error('Invalid response format from analytics API');
      }
    } catch (error: any) {
      console.error('Failed to load analytics data:', error);
      
      // Handle authentication errors
      if (error.response?.status === 401) {
        setRetryCount(prev => prev + 1);
        
        // Open circuit breaker after 3 consecutive auth failures
        if (retryCount >= 2) {
          setCircuitBreakerOpen(true);
          console.log('Analytics circuit breaker opened due to repeated auth failures');
          
          // Reset circuit breaker after 5 minutes
          setTimeout(() => {
            setCircuitBreakerOpen(false);
            setRetryCount(0);
            console.log('Analytics circuit breaker reset');
          }, 5 * 60 * 1000);
        }
        
        setError('Authentication failed. Please check your credentials.');
      } else {
        setError(`Failed to load analytics data: ${error.message}`);
      }

      // Initialize empty data structure instead of mock data
      setAnalyticsData({
        overview: {
          totalAgents: 0,
          activeShifts: 0,
          incidentsToday: 0,
          sitesMonitored: 0
        },
        trends: {
          agentUtilization: [],
          incidentTrends: [],
          responseTime: [],
          labels: []
        },
        performance: {
          topPerformers: [],
          sitePerformance: []
        }
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportData = async (format: 'csv' | 'pdf' | 'excel') => {
    try {
      // Check authentication availability first
      const authAvailable = await isAuthenticationAvailable();
      if (!authAvailable) {
        setError('Authentication required for export');
        return;
      }

      // Use the enhanced analytics API service
      const response = await analyticsAPI.exportAnalytics({
        startDate: dateRange.startDate.toISOString(),
        endDate: dateRange.endDate.toISOString(),
        format,
        metrics: ['overview', 'trends', 'performance']
      });

      // Handle blob response for file download
      const blob = new Blob([response.data], { type: response.headers['content-type'] });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `analytics-report.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error: any) {
      console.error('Failed to export analytics:', error);
      setError(`Export failed: ${error.message}`);
    }
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
      },
    },
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box sx={{ p: 3 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box>
            <Typography variant="h4" component="h1" gutterBottom>
              Analytics Dashboard
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Comprehensive analytics and performance metrics
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={loadAnalyticsData}
            >
              Refresh
            </Button>
            <Button
              variant="outlined"
              startIcon={<DownloadIcon />}
              onClick={() => handleExportData('pdf')}
            >
              Export PDF
            </Button>
          </Box>
        </Box>

        {/* Error Alert */}
        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* Date Range Filters */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} sm={4}>
                <DatePicker
                  label="Start Date"
                  value={dateRange.startDate}
                  onChange={(newValue) => setDateRange(prev => ({ ...prev, startDate: newValue || new Date() }))}
                  slotProps={{
                    textField: {
                      fullWidth: true,
                    },
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <DatePicker
                  label="End Date"
                  value={dateRange.endDate}
                  onChange={(newValue) => setDateRange(prev => ({ ...prev, endDate: newValue || new Date() }))}
                  slotProps={{
                    textField: {
                      fullWidth: true,
                    },
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <FormControl fullWidth>
                  <InputLabel>Metric Focus</InputLabel>
                  <Select
                    value={selectedMetric}
                    onChange={(e) => setSelectedMetric(e.target.value)}
                    label="Metric Focus"
                  >
                    <MenuItem value="overview">Overview</MenuItem>
                    <MenuItem value="performance">Performance</MenuItem>
                    <MenuItem value="incidents">Incidents</MenuItem>
                    <MenuItem value="utilization">Utilization</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Overview Cards */}
        {analyticsData && (
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent sx={{ textAlign: 'center' }}>
                  <PeopleIcon sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
                  <Typography variant="h4" color="primary">
                    {analyticsData.overview.totalAgents}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Agents
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent sx={{ textAlign: 'center' }}>
                  <SecurityIcon sx={{ fontSize: 40, color: 'success.main', mb: 1 }} />
                  <Typography variant="h4" color="success.main">
                    {analyticsData.overview.activeShifts}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Active Shifts
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent sx={{ textAlign: 'center' }}>
                  <AssessmentIcon sx={{ fontSize: 40, color: 'warning.main', mb: 1 }} />
                  <Typography variant="h4" color="warning.main">
                    {analyticsData.overview.incidentsToday}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Incidents Today
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent sx={{ textAlign: 'center' }}>
                  <TrendingUpIcon sx={{ fontSize: 40, color: 'info.main', mb: 1 }} />
                  <Typography variant="h4" color="info.main">
                    {analyticsData.overview.sitesMonitored}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Sites Monitored
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}

        {/* Charts Section */}
        <Tabs value={activeTab} onChange={(_, newValue) => setActiveTab(newValue)} sx={{ mb: 3 }}>
          <Tab label="Trends" />
          <Tab label="Performance" />
          <Tab label="Detailed Reports" />
        </Tabs>

        {/* Trends Tab */}
        {activeTab === 0 && analyticsData && (
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Agent Utilization Trend
                  </Typography>
                  <Box sx={{ height: 300 }}>
                    <Line
                      data={{
                        labels: analyticsData.trends.labels,
                        datasets: [
                          {
                            label: 'Utilization %',
                            data: analyticsData.trends.agentUtilization,
                            borderColor: 'rgb(75, 192, 192)',
                            backgroundColor: 'rgba(75, 192, 192, 0.2)',
                          },
                        ],
                      }}
                      options={chartOptions}
                    />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Incident Trends
                  </Typography>
                  <Box sx={{ height: 300 }}>
                    <Bar
                      data={{
                        labels: analyticsData.trends.labels,
                        datasets: [
                          {
                            label: 'Incidents',
                            data: analyticsData.trends.incidentTrends,
                            backgroundColor: 'rgba(255, 99, 132, 0.5)',
                            borderColor: 'rgba(255, 99, 132, 1)',
                            borderWidth: 1,
                          },
                        ],
                      }}
                      options={chartOptions}
                    />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}

        {/* Performance Tab */}
        {activeTab === 1 && analyticsData && (
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Top Performers
                  </Typography>
                  {analyticsData.performance.topPerformers.map((performer, index) => (
                    <Box key={index} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                      <Box>
                        <Typography variant="subtitle1">{performer.name}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          {performer.shifts} shifts completed
                        </Typography>
                      </Box>
                      <Typography variant="h6" color="primary">
                        {performer.score}%
                      </Typography>
                    </Box>
                  ))}
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Site Performance
                  </Typography>
                  {analyticsData.performance.sitePerformance.map((site, index) => (
                    <Box key={index} sx={{ mb: 2 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="subtitle1">{site.siteName}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          {site.coverage}% coverage
                        </Typography>
                      </Box>
                      <Typography variant="body2" color="text.secondary">
                        {site.incidents} incidents this period
                      </Typography>
                    </Box>
                  ))}
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}

        {/* Detailed Reports Tab */}
        {activeTab === 2 && (
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Detailed Reports
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                Generate and download detailed analytics reports
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={4}>
                  <Button
                    fullWidth
                    variant="outlined"
                    startIcon={<DownloadIcon />}
                    onClick={() => handleExportData('csv')}
                  >
                    Export CSV
                  </Button>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Button
                    fullWidth
                    variant="outlined"
                    startIcon={<DownloadIcon />}
                    onClick={() => handleExportData('excel')}
                  >
                    Export Excel
                  </Button>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Button
                    fullWidth
                    variant="outlined"
                    startIcon={<DownloadIcon />}
                    onClick={() => handleExportData('pdf')}
                  >
                    Export PDF
                  </Button>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        )}
      </Box>
    </LocalizationProvider>
  );
};

export default AnalyticsPage;
