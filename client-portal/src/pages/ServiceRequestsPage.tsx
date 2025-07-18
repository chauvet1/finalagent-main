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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Add as AddIcon,
  Refresh as RefreshIcon,
  Assignment as RequestIcon,
  CheckCircle as CompletedIcon,
  HourglassEmpty as PendingIcon,
  PlayArrow as InProgressIcon,
  Edit as EditIcon,
  Visibility as ViewIcon,
} from '@mui/icons-material';
import { clientPortalAPI, isAuthenticationAvailable } from '../services/api';

interface ServiceRequest {
  id: string;
  type: 'SECURITY_ENHANCEMENT' | 'MAINTENANCE' | 'PATROL_ADJUSTMENT' | 'INCIDENT_RESPONSE' | 'TRAINING' | 'EQUIPMENT' | 'OTHER';
  title: string;
  description: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  status: 'PENDING' | 'APPROVED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'REJECTED';
  requestedBy: string;
  assignedTo?: string;
  siteId?: string;
  estimatedCost?: number;
  estimatedDuration?: number;
  requestedDate: string;
  approvedDate?: string;
  completedDate?: string;
  notes?: string;
  attachments: any[];
  statusHistory: ServiceRequestStatus[];
  site?: {
    id: string;
    name: string;
    address: any;
  };
  assignee?: {
    id: string;
    firstName: string;
    lastName: string;
    role: string;
  };
}

interface ServiceRequestStatus {
  id: string;
  status: string;
  notes?: string;
  updatedBy: string;
  updatedAt: string;
  user: {
    firstName: string;
    lastName: string;
  };
}

interface ServiceRequestStats {
  totalRequests: number;
  pendingRequests: number;
  inProgressRequests: number;
  completedRequests: number;
  averageResponseTime: number;
  averageCompletionTime: number;
  requestsByType: { type: string; count: number }[];
  requestsByPriority: { priority: string; count: number }[];
}

const ServiceRequestsPage: React.FC = () => {
  
  // State management
  const [serviceRequests, setServiceRequests] = useState<ServiceRequest[]>([]);
  const [stats, setStats] = useState<ServiceRequestStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Form states
  const [newRequest, setNewRequest] = useState({
    type: 'SECURITY_ENHANCEMENT' as const,
    title: '',
    description: '',
    priority: 'MEDIUM' as const,
    siteId: '',
    estimatedCost: 0,
    estimatedDuration: 0,
  });

  // Data fetching functions
  const fetchServiceRequests = useCallback(async () => {
    try {
      setError(null);
      
      // Check authentication availability
      const authAvailable = await isAuthenticationAvailable();
      if (!authAvailable) {
        setError('Authentication not available. Please log in.');
        setLoading(false);
        return;
      }
      
      const [requestsResult, statsResult] = await Promise.all([
        clientPortalAPI.getServiceRequests(),
        clientPortalAPI.getServiceRequestsStats()
      ]);

      // Handle the API response format
      const requestsData = requestsResult.data?.requests || requestsResult.data || [];
      const statsData = statsResult.data || {
        totalRequests: 0,
        pendingRequests: 0,
        inProgressRequests: 0,
        completedRequests: 0,
        averageResponseTime: 0,
        averageCompletionTime: 0,
        requestsByType: [],
        requestsByPriority: [],
      };

      setServiceRequests(Array.isArray(requestsData) ? requestsData : []);
      setStats(statsData);
      setLastUpdated(new Date());

    } catch (err: any) {
      console.error('Failed to fetch service requests:', err);
      if (err.response?.status === 401) {
        setError('Authentication not available. Please log in.');
      } else {
        setError('Failed to load service requests data. Please check your connection and try again.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // Create service request
  const handleCreateRequest = async () => {
    try {
      setError(null);
      
      await clientPortalAPI.createServiceRequest({
        type: newRequest.type,
        title: newRequest.title,
        description: newRequest.description,
        priority: newRequest.priority,
        siteId: newRequest.siteId || undefined,
      });

      // Reset form and close dialog
      setNewRequest({
        type: 'SECURITY_ENHANCEMENT',
        title: '',
        description: '',
        priority: 'MEDIUM',
        siteId: '',
        estimatedCost: 0,
        estimatedDuration: 0,
      });
      setCreateDialogOpen(false);
      
      // Refresh data
      await fetchServiceRequests();
      
    } catch (err: any) {
      console.error('Failed to create service request:', err);
      setError('Failed to create service request. Please try again.');
    }
  };

  // Utility functions
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <CompletedIcon color="success" />;
      case 'IN_PROGRESS':
        return <InProgressIcon color="info" />;
      case 'CANCELLED':
      case 'REJECTED':
        return <InProgressIcon color="error" />;
      default:
        return <PendingIcon color="warning" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'success';
      case 'IN_PROGRESS':
        return 'info';
      case 'APPROVED':
        return 'primary';
      case 'CANCELLED':
      case 'REJECTED':
        return 'error';
      default:
        return 'warning';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'URGENT':
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

  // const formatCurrency = (amount: number) => {
  //   return new Intl.NumberFormat('en-US', {
  //     style: 'currency',
  //     currency: 'USD',
  //   }).format(amount);
  // };

  // const formatDuration = (hours: number) => {
  //   if (hours < 24) return `${hours} hours`;
  //   const days = Math.floor(hours / 24);
  //   const remainingHours = hours % 24;
  //   return remainingHours > 0 ? `${days} days ${remainingHours} hours` : `${days} days`;
  // };

  // Effects
  useEffect(() => {
    fetchServiceRequests();
  }, [fetchServiceRequests]);

  // Loading state
  if (loading && serviceRequests.length === 0) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={400}>
        <Box textAlign="center">
          <CircularProgress size={60} />
          <Typography variant="h6" sx={{ mt: 2 }}>
            Loading Service Requests...
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
            Service Requests
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Request and track security service enhancements and modifications
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
            onClick={fetchServiceRequests}
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
            New Request
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
                  <RequestIcon color="primary" />
                  <Box>
                    <Typography variant="h6">{stats.totalRequests}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Total Requests
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
                  <PendingIcon color="warning" />
                  <Box>
                    <Typography variant="h6">{stats.pendingRequests}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Pending
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
                  <InProgressIcon color="info" />
                  <Box>
                    <Typography variant="h6">{stats.inProgressRequests}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      In Progress
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
                  <CompletedIcon color="success" />
                  <Box>
                    <Typography variant="h6">{stats.completedRequests}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Completed
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Service Requests Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Title</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Priority</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Requested Date</TableCell>
              <TableCell>Site</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {serviceRequests.length > 0 ? serviceRequests.map((request) => (
              <TableRow key={request.id}>
                <TableCell>
                  <Box>
                    <Typography variant="subtitle2">{request.title}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {request.description.substring(0, 100)}...
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell>{request.type.replace('_', ' ')}</TableCell>
                <TableCell>
                  <Chip
                    label={request.priority}
                    size="small"
                    color={getPriorityColor(request.priority) as any}
                  />
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {getStatusIcon(request.status)}
                    <Chip
                      label={request.status}
                      size="small"
                      color={getStatusColor(request.status) as any}
                    />
                  </Box>
                </TableCell>
                <TableCell>{new Date(request.requestedDate).toLocaleDateString()}</TableCell>
                <TableCell>{request.site?.name || 'All Sites'}</TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', gap: 0.5 }}>
                    <Tooltip title="View Details">
                      <IconButton size="small">
                        <ViewIcon />
                      </IconButton>
                    </Tooltip>
                    {request.status === 'PENDING' && (
                      <Tooltip title="Edit Request">
                        <IconButton size="small">
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                    )}
                  </Box>
                </TableCell>
              </TableRow>
            )) : (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  <Typography variant="body1" color="text.secondary" sx={{ py: 4 }}>
                    No service requests found. Create your first request to get started.
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Create Service Request Dialog */}
      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Create New Service Request</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            <FormControl fullWidth>
              <InputLabel>Request Type</InputLabel>
              <Select
                value={newRequest.type}
                onChange={(e) => setNewRequest(prev => ({ ...prev, type: e.target.value as any }))}
                label="Request Type"
              >
                <MenuItem value="SECURITY_ENHANCEMENT">Security Enhancement</MenuItem>
                <MenuItem value="MAINTENANCE">Maintenance</MenuItem>
                <MenuItem value="PATROL_ADJUSTMENT">Patrol Adjustment</MenuItem>
                <MenuItem value="INCIDENT_RESPONSE">Incident Response</MenuItem>
                <MenuItem value="TRAINING">Training</MenuItem>
                <MenuItem value="EQUIPMENT">Equipment</MenuItem>
                <MenuItem value="OTHER">Other</MenuItem>
              </Select>
            </FormControl>

            <TextField
              fullWidth
              label="Title"
              value={newRequest.title}
              onChange={(e) => setNewRequest(prev => ({ ...prev, title: e.target.value }))}
              required
            />

            <TextField
              fullWidth
              label="Description"
              value={newRequest.description}
              onChange={(e) => setNewRequest(prev => ({ ...prev, description: e.target.value }))}
              multiline
              rows={4}
              required
            />

            <FormControl fullWidth>
              <InputLabel>Priority</InputLabel>
              <Select
                value={newRequest.priority}
                onChange={(e) => setNewRequest(prev => ({ ...prev, priority: e.target.value as any }))}
                label="Priority"
              >
                <MenuItem value="LOW">Low</MenuItem>
                <MenuItem value="MEDIUM">Medium</MenuItem>
                <MenuItem value="HIGH">High</MenuItem>
                <MenuItem value="URGENT">Urgent</MenuItem>
              </Select>
            </FormControl>

            <TextField
              fullWidth
              label="Site ID (Optional)"
              value={newRequest.siteId}
              onChange={(e) => setNewRequest(prev => ({ ...prev, siteId: e.target.value }))}
              helperText="Leave empty to apply to all sites"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleCreateRequest} 
            variant="contained"
            disabled={!newRequest.title || !newRequest.description}
          >
            Create Request
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ServiceRequestsPage;
