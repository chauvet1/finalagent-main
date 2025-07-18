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
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  GetApp as ExportIcon,
  Assignment as ReportIcon,
  Security as SecurityIcon,
  Warning as IncidentIcon,
  Schedule as ScheduleIcon,
} from '@mui/icons-material';
import { useAuth } from '../hooks/useAuth';
import { isAuthenticationAvailable, getCurrentTokenInfo, clientAPI } from '../services/api';

interface Report {
  id: string;
  type: 'INCIDENT' | 'PATROL' | 'MAINTENANCE' | 'SECURITY' | 'GENERAL';
  title: string;
  description: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: 'DRAFT' | 'SUBMITTED' | 'REVIEWED' | 'APPROVED' | 'REJECTED';
  agentId: string;
  siteId: string;
  location?: string;
  timestamp: string;
  submittedAt?: string;
  reviewedAt?: string;
  reviewedBy?: string;
  attachments: ReportAttachment[];
  agent: {
    id: string;
    employeeId: string;
    user: {
      firstName: string;
      lastName: string;
    };
  };
  site: {
    id: string;
    name: string;
    address: any;
  };
}

interface ReportAttachment {
  id: string;
  type: 'PHOTO' | 'VIDEO' | 'DOCUMENT' | 'AUDIO';
  filename: string;
  url: string;
  size: number;
  uploadedAt: string;
}

interface ReportStats {
  totalReports: number;
  todayReports: number;
  pendingReports: number;
  criticalReports: number;
  incidentReports: number;
  patrolReports: number;
  averageResponseTime: number;
  reportsByType: { type: string; count: number }[];
}

const ReportsPage: React.FC = () => {
  
  // State management
  const [reports, setReports] = useState<Report[]>([]);
  const [stats, setStats] = useState<ReportStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [filterSite, setFilterSite] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Data fetching functions
  const fetchReports = useCallback(async () => {
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
      console.debug(`Loading client reports with ${tokenInfo.type} token`);

      // Use the enhanced client API service
      const reportsResponse = await clientAPI.getReports();
      
      // For stats, we'll simulate the data since there's no specific stats endpoint
      const mockStats = {
        totalReports: reportsResponse.data?.length || 0,
        todayReports: 0,
        pendingReports: 0,
        criticalReports: 0,
        incidentReports: 0,
        patrolReports: 0,
        averageResponseTime: 0,
        reportsByType: [],
      };

      setReports(reportsResponse.data || []);
      setStats(mockStats);
      setLastUpdated(new Date());

    } catch (err: any) {
      console.error('Failed to fetch reports:', err);
      setError('Failed to load reports data. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage, filterType, filterStatus, filterPriority, filterSite, searchQuery]);

  const exportReports = async () => {
    // Check authentication availability first
    const authAvailable = await isAuthenticationAvailable();
    if (!authAvailable) {
      setError('Authentication required to export reports');
      return;
    }

    try {
      // Get current token info for debugging
      const tokenInfo = await getCurrentTokenInfo();
      console.debug(`Exporting reports with ${tokenInfo.type} token`);

      // Note: Since there's no specific export endpoint in the enhanced service,
      // we'll simulate the export for now
      // In a real implementation, you'd add specific export endpoints to the API service
      
      // Simulate successful export
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Create a mock PDF blob for demonstration
      const mockPdfContent = 'Mock PDF content for security reports';
      const blob = new Blob([mockPdfContent], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `security-reports-${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

    } catch (err: any) {
      console.error('Failed to export reports:', err);
      setError('Failed to export reports. Please try again.');
    }
  };

  // Utility functions
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'INCIDENT':
        return <IncidentIcon color="error" />;
      case 'PATROL':
        return <SecurityIcon color="primary" />;
      case 'MAINTENANCE':
        return <ScheduleIcon color="warning" />;
      case 'SECURITY':
        return <SecurityIcon color="info" />;
      default:
        return <ReportIcon />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return 'success';
      case 'SUBMITTED':
        return 'info';
      case 'REVIEWED':
        return 'warning';
      case 'REJECTED':
        return 'error';
      case 'DRAFT':
        return 'default';
      default:
        return 'default';
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

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Effects
  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  // Loading state
  if (loading && reports.length === 0) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={400}>
        <Box textAlign="center">
          <CircularProgress size={60} />
          <Typography variant="h6" sx={{ mt: 2 }}>
            Loading Reports...
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
            Security Reports
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Comprehensive incident and patrol reporting system
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
            onClick={exportReports}
            startIcon={<ExportIcon />}
          >
            Export
          </Button>
          <Button
            variant="outlined"
            onClick={fetchReports}
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

      {/* Stats Cards */}
      {stats && (
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" gap={2}>
                  <ReportIcon color="primary" />
                  <Box>
                    <Typography variant="h6">{stats.totalReports}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Total Reports
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
                  <ScheduleIcon color="info" />
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
                    <Typography variant="h6">{stats.pendingReports}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Pending Review
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
                  <SecurityIcon color="error" />
                  <Box>
                    <Typography variant="h6">{stats.criticalReports}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Critical Reports
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}
    </Box>
  );
};

export default ReportsPage;
