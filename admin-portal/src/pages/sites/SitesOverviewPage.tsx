import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  IconButton,
  Tooltip,
  Alert,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Divider,
  Badge,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  Search as SearchIcon,
  LocationOn as LocationIcon,
  Security as SecurityIcon,
  Business as BusinessIcon,
  Map as MapIcon,
  Warning as WarningIcon,
  CheckCircle as ActiveIcon,
  Cancel as InactiveIcon,
  Schedule as ScheduleIcon,
  Person as PersonIcon,
  Assignment as AssignmentIcon,
} from '@mui/icons-material';
import { useAuth } from '../../hooks/useAuth';
import { sitesAPI, analyticsAPI, isAuthenticationAvailable, getCurrentTokenInfo } from '../../services/api';

interface Site {
  id: string;
  clientId: string;
  name: string;
  address: string;
  city: string;
  country: string;
  coordinates?: any;
  type: string;
  status: 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE';
  securityLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  maxAgents: number;
  shiftPattern?: string;
  equipment: string[];
  emergencyContacts?: any;
  contractStart?: string;
  contractEnd?: string;
  monthlyValue?: number;
  description?: string;
  createdAt: string;
  updatedAt: string;
  client?: {
    id: string;
    companyName: string;
    contactPerson: any;
  };
  shifts?: any[];
  reports?: any[];
  incidents?: any[];
}

interface SiteStats {
  totalSites: number;
  activeSites: number;
  inactiveSites: number;
  maintenanceSites: number;
  sitesWithActiveShifts: number;
  sitesWithIncidents: number;
  averageSecurityLevel: number;
  totalEquipment: number;
}

const SitesOverviewPage: React.FC = () => {
  const { user } = useAuth();
  
  // State management
  const [sites, setSites] = useState<Site[]>([]);
  const [stats, setStats] = useState<SiteStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSite, setSelectedSite] = useState<Site | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'map'>('grid');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [circuitBreakerOpen, setCircuitBreakerOpen] = useState(false);

  // Form states
  const [newSite, setNewSite] = useState({
    name: '',
    clientId: '',
    address: '',
    city: '',
    country: '',
    coordinates: null,
    type: 'OFFICE',
    securityLevel: 'MEDIUM',
    maxAgents: 1,
    shiftPattern: '',
    equipment: [],
    emergencyContacts: null,
    description: '',
  });

  // Data fetching functions
  const fetchSites = useCallback(async () => {
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

      // Use the enhanced API services
      const [sitesResponse, statsResponse] = await Promise.all([
        sitesAPI.getAll(),
        analyticsAPI.getKPIMetrics({ type: 'site-stats' })
      ]);

      // Reset retry count on successful request
      setRetryCount(0);
      setCircuitBreakerOpen(false);

      // Extract sites data
      const sitesData = sitesResponse.data.data || [];
      setSites(Array.isArray(sitesData) ? sitesData : []);

      // Extract stats data
      const statsData = statsResponse.data.data || {
        totalSites: 0,
        activeSites: 0,
        inactiveSites: 0,
        maintenanceSites: 0,
        sitesWithActiveShifts: 0,
        sitesWithIncidents: 0,
        averageSecurityLevel: 0,
        totalEquipment: 0,
      };
      setStats(statsData);
      setLastUpdated(new Date());

    } catch (err: any) {
      console.error('Failed to fetch sites:', err);
      
      // Handle authentication errors
      if (err.response?.status === 401) {
        setRetryCount(prev => prev + 1);
        
        // Open circuit breaker after 3 consecutive auth failures
        if (retryCount >= 2) {
          setCircuitBreakerOpen(true);
          console.log('Sites circuit breaker opened due to repeated auth failures');
          
          // Reset circuit breaker after 5 minutes
          setTimeout(() => {
            setCircuitBreakerOpen(false);
            setRetryCount(0);
            console.log('Sites circuit breaker reset');
          }, 5 * 60 * 1000);
        }
        
        setError('Authentication failed. Please check your credentials.');
      } else {
        setError(`Failed to load site data: ${err.message}`);
      }

      // Initialize empty data instead of null
      setSites([]);
      setStats({
        totalSites: 0,
        activeSites: 0,
        inactiveSites: 0,
        maintenanceSites: 0,
        sitesWithActiveShifts: 0,
        sitesWithIncidents: 0,
        averageSecurityLevel: 0,
        totalEquipment: 0,
      });
    } finally {
      setLoading(false);
    }
  }, [retryCount, circuitBreakerOpen]);

  const createSite = async () => {
    try {
      // Check authentication availability first
      const authAvailable = await isAuthenticationAvailable();
      if (!authAvailable) {
        setError('Authentication required to create site');
        return;
      }

      // Use the enhanced sites API service
      await sitesAPI.create(newSite);

      setCreateDialogOpen(false);
      setNewSite({
        name: '',
        clientId: '',
        address: '',
        city: '',
        country: '',
        coordinates: null,
        type: 'OFFICE',
        securityLevel: 'MEDIUM',
        maxAgents: 1,
        shiftPattern: '',
        equipment: [],
        emergencyContacts: null,
        description: '',
      });
      fetchSites();

    } catch (err: any) {
      console.error('Failed to create site:', err);
      setError(`Failed to create site: ${err.message}`);
    }
  };

  const deleteSite = async () => {
    if (!selectedSite) return;

    try {
      // Check authentication availability first
      const authAvailable = await isAuthenticationAvailable();
      if (!authAvailable) {
        setError('Authentication required to delete site');
        return;
      }

      // Use the enhanced sites API service
      await sitesAPI.delete(selectedSite.id);

      setDeleteDialogOpen(false);
      setSelectedSite(null);
      fetchSites();

    } catch (err: any) {
      console.error('Failed to delete site:', err);
      setError(`Failed to delete site: ${err.message}`);
    }
  };

  // Utility functions
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'success';
      case 'INACTIVE':
        return 'default';
      case 'MAINTENANCE':
        return 'warning';
      case 'SUSPENDED':
        return 'error';
      default:
        return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <ActiveIcon color="success" />;
      case 'INACTIVE':
        return <InactiveIcon color="disabled" />;
      case 'MAINTENANCE':
        return <WarningIcon color="warning" />;
      case 'SUSPENDED':
        return <WarningIcon color="error" />;
      default:
        return <BusinessIcon />;
    }
  };

  const filteredSites = (Array.isArray(sites) ? sites : []).filter(site => {
    // Safety check to ensure site object exists
    if (!site || typeof site !== 'object') return false;

    if (filterStatus !== 'all' && site.status !== filterStatus) return false;
    if (filterType !== 'all' && site.type !== filterType) return false;
    if (searchQuery &&
        !(site.name || '').toLowerCase().includes(searchQuery.toLowerCase()) &&
        !(site.client?.companyName || '').toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  // Effects
  useEffect(() => {
    // Add a delay to prevent immediate API calls on mount
    const timer = setTimeout(() => {
      fetchSites();
    }, 2000); // 2 second delay for sites page
    
    return () => clearTimeout(timer);
  }, [fetchSites]);

  // Loading state
  if (loading && (!Array.isArray(sites) || sites.length === 0)) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={400}>
        <Box textAlign="center">
          <CircularProgress size={60} />
          <Typography variant="h6" sx={{ mt: 2 }}>
            Loading Site Data...
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
            Sites Overview
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Interactive site monitoring, security management, and operational oversight
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
            onClick={fetchSites}
            startIcon={<RefreshIcon />}
            disabled={loading}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            onClick={() => setCreateDialogOpen(true)}
            startIcon={<AddIcon />}
          >
            Add Site
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
                  <BusinessIcon color="primary" />
                  <Box>
                    <Typography variant="h6">{stats.totalSites}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Total Sites
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
                  <ActiveIcon color="success" />
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
                  <ScheduleIcon color="info" />
                  <Box>
                    <Typography variant="h6">{stats.sitesWithActiveShifts}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      With Active Shifts
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
                  <Box>
                    <Typography variant="h6">{stats.sitesWithIncidents}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      With Incidents
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Filters */}
      <Box display="flex" gap={2} mb={3} flexWrap="wrap">
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>Status</InputLabel>
          <Select
            value={filterStatus}
            label="Status"
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <MenuItem value="all">All Status</MenuItem>
            <MenuItem value="ACTIVE">Active</MenuItem>
            <MenuItem value="INACTIVE">Inactive</MenuItem>
            <MenuItem value="MAINTENANCE">Maintenance</MenuItem>
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>Type</InputLabel>
          <Select
            value={filterType}
            label="Type"
            onChange={(e) => setFilterType(e.target.value)}
          >
            <MenuItem value="all">All Types</MenuItem>
            <MenuItem value="BANK">Bank</MenuItem>
            <MenuItem value="RETAIL">Retail</MenuItem>
            <MenuItem value="OFFICE">Office</MenuItem>
            <MenuItem value="RESIDENTIAL">Residential</MenuItem>
            <MenuItem value="INDUSTRIAL">Industrial</MenuItem>
            <MenuItem value="OTHER">Other</MenuItem>
          </Select>
        </FormControl>

        <TextField
          size="small"
          placeholder="Search sites..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: <SearchIcon color="action" sx={{ mr: 1 }} />,
          }}
          sx={{ minWidth: 200 }}
        />
      </Box>

      {/* Sites Grid */}
      <Typography variant="h6" gutterBottom>
        Sites ({filteredSites.length})
      </Typography>

      <Grid container spacing={3}>
        {filteredSites.map((site) => (
          <Grid item xs={12} md={6} lg={4} key={site?.id || Math.random()}>
            <Card>
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                  <Typography variant="h6" gutterBottom>
                    {site?.name || 'Unnamed Site'}
                  </Typography>
                  <Box display="flex" alignItems="center" gap={1}>
                    {getStatusIcon(site?.status || 'ACTIVE')}
                    <Chip
                      label={site?.status || 'ACTIVE'}
                      color={getStatusColor(site?.status || 'ACTIVE') as any}
                      size="small"
                    />
                  </Box>
                </Box>

                <Box display="flex" alignItems="center" gap={1} mb={1}>
                  <LocationIcon fontSize="small" color="action" />
                  <Typography variant="body2" color="text.secondary">
                    {site?.address || 'No address specified'}
                  </Typography>
                </Box>

                <Box display="flex" alignItems="center" gap={1} mb={2}>
                  <BusinessIcon fontSize="small" color="action" />
                  <Typography variant="body2" color="text.secondary">
                    {site?.client?.companyName || 'No client assigned'}
                  </Typography>
                </Box>

                <Box display="flex" gap={1} mb={2}>
                  <Chip label={site?.type || 'Unknown'} size="small" variant="outlined" />
                  <Chip label={site?.securityLevel || 'MEDIUM'} size="small" variant="outlined" color="primary" />
                </Box>

                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Typography variant="caption" color="text.secondary">
                    Active site • {site?.city || 'Location not specified'}
                  </Typography>
                  <Box>
                    <Tooltip title="View Details">
                      <IconButton
                        size="small"
                        onClick={() => setSelectedSite(site)}
                      >
                        <MapIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Edit Site">
                      <IconButton
                        size="small"
                        onClick={() => {
                          setSelectedSite(site);
                          setEditDialogOpen(true);
                        }}
                      >
                        <EditIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete Site">
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => {
                          setSelectedSite(site);
                          setDeleteDialogOpen(true);
                        }}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default SitesOverviewPage;
