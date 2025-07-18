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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Avatar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  Search as SearchIcon,
  Business as BusinessIcon,
  AttachMoney as BillingIcon,
  Star as RatingIcon,
  Warning as WarningIcon,
  CheckCircle as ActiveIcon,
  Cancel as InactiveIcon,
} from '@mui/icons-material';
import { useAuth } from '../../hooks/useAuth';
import { isAuthenticationAvailable, getCurrentTokenInfo, adminAPI } from '../../services/api';

interface Client {
  id: string;
  companyName: string;
  contactPerson: {
    name: string;
    title: string;
    email: string;
    phone: string;
  };
  billingAddress: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  contractDetails?: {
    startDate: string;
    endDate: string;
    value: number;
    terms: string;
  };
  serviceLevel: string;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'PENDING';
  settings: any;
  createdAt: string;
  updatedAt: string;
  sites?: any[];
  users?: any[];
  requests?: any[];
  incidents?: any[];
}

interface ClientStats {
  totalClients: number;
  activeClients: number;
  inactiveClients: number;
  pendingClients: number;
  totalRevenue: number;
  averageContractValue: number;
  clientSatisfactionScore: number;
  renewalRate: number;
  totalSites: number;
  totalIncidents: number;
  averageResponseTime: number;
  topClients: TopClient[];
}

interface TopClient {
  id: string;
  companyName: string;
  contractValue: number;
  satisfactionScore: number;
  siteCount: number;
  incidentCount: number;
}

const ClientOverviewPage: React.FC = () => {
  // State management
  const [clients, setClients] = useState<Client[]>([]);
  const [stats, setStats] = useState<ClientStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterServiceLevel, setFilterServiceLevel] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Form states
  const [newClient, setNewClient] = useState({
    companyName: '',
    contactPerson: {
      name: '',
      title: '',
      email: '',
      phone: '',
    },
    billingAddress: {
      street: '',
      city: '',
      state: '',
      zipCode: '',
      country: '',
    },
    serviceLevel: 'standard',
    contractDetails: {
      startDate: '',
      endDate: '',
      value: 0,
      terms: '',
    },
  });

  // Data fetching functions
  const fetchClients = useCallback(async () => {
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
      console.debug(`Loading client data with ${tokenInfo.type} token`);

      // Use the enhanced API service (token automatically injected)
      const [clientsResponse, statsResponse] = await Promise.all([
        adminAPI.getClients(),
        adminAPI.getClientStats()
      ]);

      setClients(clientsResponse.data || []);
      setStats(statsResponse.data || {
        totalClients: 0,
        activeClients: 0,
        inactiveClients: 0,
        pendingClients: 0,
        totalRevenue: 0,
        averageContractValue: 0,
        clientSatisfactionScore: 0,
        renewalRate: 0,
        totalSites: 0,
        totalIncidents: 0,
        averageResponseTime: 0,
        topClients: [],
      });
      setLastUpdated(new Date());

    } catch (err: any) {
      console.error('Failed to fetch clients:', err);
      const tokenInfo = await getCurrentTokenInfo();
      console.debug('Token info during error:', tokenInfo);
      
      if (err.response?.status === 401) {
        setError('Authentication not available. Please log in.');
      } else if (err.response?.status === 403) {
        setError('You do not have permission to view client data.');
      } else {
        setError('Failed to load client data. Please check your connection and try again.');
      }
      setClients([]);
      setStats(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const createClient = async () => {
    // Check authentication availability first
    const authAvailable = await isAuthenticationAvailable();
    if (!authAvailable) {
      setError('Authentication not available. Please log in.');
      return;
    }

    try {
      setError(null);

      // Get current token info for debugging
      const tokenInfo = await getCurrentTokenInfo();
      console.debug(`Creating client with ${tokenInfo.type} token`);

      // Use the enhanced API service (token automatically injected)
      await adminAPI.createClient(newClient);

      setCreateDialogOpen(false);
      setNewClient({
        companyName: '',
        contactPerson: {
          name: '',
          title: '',
          email: '',
          phone: '',
        },
        billingAddress: {
          street: '',
          city: '',
          state: '',
          zipCode: '',
          country: '',
        },
        serviceLevel: 'standard',
        contractDetails: {
          startDate: '',
          endDate: '',
          value: 0,
          terms: '',
        },
      });
      fetchClients();

    } catch (err: any) {
      console.error('Failed to create client:', err);
      const tokenInfo = await getCurrentTokenInfo();
      console.debug('Token info during error:', tokenInfo);
      
      if (err.response?.status === 401) {
        setError('Authentication not available. Please log in.');
      } else if (err.response?.status === 403) {
        setError('You do not have permission to create clients.');
      } else {
        setError('Failed to create client. Please try again.');
      }
    }
  };

  const deleteClient = async () => {
    if (!selectedClient) return;

    // Check authentication availability first
    const authAvailable = await isAuthenticationAvailable();
    if (!authAvailable) {
      setError('Authentication not available. Please log in.');
      return;
    }

    try {
      setError(null);

      // Get current token info for debugging
      const tokenInfo = await getCurrentTokenInfo();
      console.debug(`Deleting client with ${tokenInfo.type} token`);

      // Use the enhanced API service (token automatically injected)
      await adminAPI.deleteClient(selectedClient.id);

      setDeleteDialogOpen(false);
      setSelectedClient(null);
      fetchClients();

    } catch (err: any) {
      console.error('Failed to delete client:', err);
      const tokenInfo = await getCurrentTokenInfo();
      console.debug('Token info during error:', tokenInfo);
      
      if (err.response?.status === 401) {
        setError('Authentication not available. Please log in.');
      } else if (err.response?.status === 403) {
        setError('You do not have permission to delete clients.');
      } else {
        setError('Failed to delete client. Please try again.');
      }
    }
  };

  // Utility functions
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'success';
      case 'INACTIVE':
        return 'default';
      case 'SUSPENDED':
        return 'error';
      case 'PENDING':
        return 'warning';
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
      case 'SUSPENDED':
        return <WarningIcon color="error" />;
      case 'PENDING':
        return <WarningIcon color="warning" />;
      default:
        return <BusinessIcon />;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const filteredClients = clients.filter(client => {
    if (filterStatus !== 'all' && client.status !== filterStatus) return false;
    if (filterServiceLevel !== 'all' && client.serviceLevel !== filterServiceLevel) return false;
    if (searchQuery && 
        !client.companyName.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !client.contactPerson.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !client.contactPerson.email.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  // Effects
  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  // Loading state
  if (loading && clients.length === 0) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={400}>
        <Box textAlign="center">
          <CircularProgress size={60} />
          <Typography variant="h6" sx={{ mt: 2 }}>
            Loading Client Data...
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
            Client Overview
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Account management, relationship tracking, and client satisfaction monitoring
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
            onClick={fetchClients}
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
            Add Client
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
        <Grid container spacing={3} mb={3}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography color="text.secondary" gutterBottom>
                      Total Clients
                    </Typography>
                    <Typography variant="h4">
                      {stats.totalClients}
                    </Typography>
                  </Box>
                  <BusinessIcon color="primary" sx={{ fontSize: 40 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography color="text.secondary" gutterBottom>
                      Active Clients
                    </Typography>
                    <Typography variant="h4" color="success.main">
                      {stats.activeClients}
                    </Typography>
                  </Box>
                  <ActiveIcon color="success" sx={{ fontSize: 40 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography color="text.secondary" gutterBottom>
                      Total Revenue
                    </Typography>
                    <Typography variant="h4" color="primary">
                      {formatCurrency(stats.totalRevenue)}
                    </Typography>
                  </Box>
                  <BillingIcon color="primary" sx={{ fontSize: 40 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography color="text.secondary" gutterBottom>
                      Satisfaction Score
                    </Typography>
                    <Typography variant="h4" color="warning.main">
                      {stats.clientSatisfactionScore.toFixed(1)}
                    </Typography>
                  </Box>
                  <RatingIcon color="warning" sx={{ fontSize: 40 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Filters and Search */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={6} md={4}>
              <TextField
                fullWidth
                placeholder="Search clients..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                InputProps={{
                  startAdornment: <SearchIcon color="action" sx={{ mr: 1 }} />,
                }}
              />
            </Grid>
            <Grid item xs={12} sm={3} md={2}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  value={filterStatus}
                  label="Status"
                  onChange={(e) => setFilterStatus(e.target.value)}
                >
                  <MenuItem value="all">All Status</MenuItem>
                  <MenuItem value="ACTIVE">Active</MenuItem>
                  <MenuItem value="INACTIVE">Inactive</MenuItem>
                  <MenuItem value="SUSPENDED">Suspended</MenuItem>
                  <MenuItem value="PENDING">Pending</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={3} md={2}>
              <FormControl fullWidth>
                <InputLabel>Service Level</InputLabel>
                <Select
                  value={filterServiceLevel}
                  label="Service Level"
                  onChange={(e) => setFilterServiceLevel(e.target.value)}
                >
                  <MenuItem value="all">All Levels</MenuItem>
                  <MenuItem value="basic">Basic</MenuItem>
                  <MenuItem value="standard">Standard</MenuItem>
                  <MenuItem value="premium">Premium</MenuItem>
                  <MenuItem value="enterprise">Enterprise</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Clients Table */}
      <Card>
        <CardContent>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Company</TableCell>
                  <TableCell>Contact Person</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Service Level</TableCell>
                  <TableCell>Contract Value</TableCell>
                  <TableCell>Sites</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredClients
                  .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                  .map((client) => (
                    <TableRow key={client.id} hover>
                      <TableCell>
                        <Box display="flex" alignItems="center">
                          <Avatar sx={{ mr: 2, bgcolor: 'primary.main' }}>
                            <BusinessIcon />
                          </Avatar>
                          <Box>
                            <Typography variant="subtitle2">
                              {client.companyName}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              ID: {client.id}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box>
                          <Typography variant="body2">
                            {client.contactPerson.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {client.contactPerson.email}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip
                          icon={getStatusIcon(client.status)}
                          label={client.status}
                          color={getStatusColor(client.status) as any}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={client.serviceLevel.toUpperCase()}
                          variant="outlined"
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        {client.contractDetails?.value
                          ? formatCurrency(client.contractDetails.value)
                          : 'N/A'}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={`${client.sites?.length || 0} sites`}
                          size="small"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Tooltip title="Edit Client">
                          <IconButton
                            size="small"
                            onClick={() => {
                              setSelectedClient(client);
                              // TODO: Implement edit functionality
                              console.log('Edit client:', client);
                            }}
                          >
                            <EditIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete Client">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => {
                              setSelectedClient(client);
                              setDeleteDialogOpen(true);
                            }}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination
            rowsPerPageOptions={[5, 10, 25]}
            component="div"
            count={filteredClients.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={(_, newPage) => setPage(newPage)}
            onRowsPerPageChange={(e) => {
              setRowsPerPage(parseInt(e.target.value, 10));
              setPage(0);
            }}
          />
        </CardContent>
      </Card>

      {/* Create Client Dialog */}
      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Add New Client</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Company Name"
                value={newClient.companyName}
                onChange={(e) => setNewClient({ ...newClient, companyName: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Contact Name"
                value={newClient.contactPerson.name}
                onChange={(e) => setNewClient({
                  ...newClient,
                  contactPerson: { ...newClient.contactPerson, name: e.target.value }
                })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Contact Title"
                value={newClient.contactPerson.title}
                onChange={(e) => setNewClient({
                  ...newClient,
                  contactPerson: { ...newClient.contactPerson, title: e.target.value }
                })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Contact Email"
                type="email"
                value={newClient.contactPerson.email}
                onChange={(e) => setNewClient({
                  ...newClient,
                  contactPerson: { ...newClient.contactPerson, email: e.target.value }
                })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Contact Phone"
                value={newClient.contactPerson.phone}
                onChange={(e) => setNewClient({
                  ...newClient,
                  contactPerson: { ...newClient.contactPerson, phone: e.target.value }
                })}
              />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Service Level</InputLabel>
                <Select
                  value={newClient.serviceLevel}
                  label="Service Level"
                  onChange={(e) => setNewClient({ ...newClient, serviceLevel: e.target.value })}
                >
                  <MenuItem value="basic">Basic</MenuItem>
                  <MenuItem value="standard">Standard</MenuItem>
                  <MenuItem value="premium">Premium</MenuItem>
                  <MenuItem value="enterprise">Enterprise</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
          <Button onClick={createClient} variant="contained">Create Client</Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Client</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete client "{selectedClient?.companyName}"? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={deleteClient} color="error" variant="contained">Delete</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ClientOverviewPage;
