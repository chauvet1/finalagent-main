import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  IconButton,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Card,
  CardContent,
  Tooltip,
  Switch,
  FormControlLabel,
  Alert,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction,
} from '@mui/material';
import {
  Visibility as ViewIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  VpnKey as KeyIcon,
  Security as SecurityIcon,
  Person as PersonIcon,
  Business as BusinessIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  AccessTime as AccessTimeIcon,
  CheckCircle as ActiveIcon,
  Cancel as InactiveIcon,
  Warning as WarningIcon,
  Refresh as RefreshIcon,
  Send as SendIcon,
  Lock as LockIcon,
  LockOpen as UnlockIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { useAuth } from '../../hooks/useAuth';
import { isAuthenticationAvailable, getCurrentTokenInfo, adminAPI } from '../../services/api';

interface ClientPortalUser {
  id: string;
  clientId: string;
  clientName: string;
  userName: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'Admin' | 'Manager' | 'Viewer';
  status: 'Active' | 'Inactive' | 'Suspended' | 'Pending';
  lastLogin?: Date;
  createdDate: Date;
  permissions: string[];
  phone?: string;
  department?: string;
  twoFactorEnabled: boolean;
  loginAttempts: number;
  isLocked: boolean;
}

interface PortalAccess {
  id: string;
  clientId: string;
  clientName: string;
  portalUrl: string;
  isEnabled: boolean;
  customDomain?: string;
  ssoEnabled: boolean;
  allowedIPs?: string[];
  sessionTimeout: number; // in minutes
  maxConcurrentSessions: number;
  users: ClientPortalUser[];
}

// Portal access data will be loaded from API

const ClientPortalPage: React.FC = () => {
  const [portalAccess, setPortalAccess] = useState<PortalAccess[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [selectedPortal, setSelectedPortal] = useState<PortalAccess | null>(null);
  const [selectedUser, setSelectedUser] = useState<ClientPortalUser | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [userDialogOpen, setUserDialogOpen] = useState(false);
  const [addUserDialogOpen, setAddUserDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');

  useEffect(() => {
    const loadPortalAccessData = async () => {
      // Check authentication availability first
      const authAvailable = await isAuthenticationAvailable();
      if (!authAvailable) {
        setError('Authentication not available. Please log in.');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Get current token info for debugging
        const tokenInfo = await getCurrentTokenInfo();
        console.debug(`Loading portal access data with ${tokenInfo.type} token`);
        
        // Use the enhanced API service (token automatically injected)
        const response = await (adminAPI as any).getClientPortalAccess?.() ||
                         await adminAPI.getClients();
        
        setPortalAccess(response.data.data || []);
      } catch (err: any) {
        console.error('Error loading portal access data:', err);
        setError(err.response?.data?.message || 'Failed to load portal access data');
        // Initialize with empty array on error
        setPortalAccess([]);
      } finally {
        setLoading(false);
      }
    };

    loadPortalAccessData();
  }, []);

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleViewPortal = (portal: PortalAccess) => {
    setSelectedPortal(portal);
    setViewDialogOpen(true);
  };

  const handleViewUser = (user: ClientPortalUser) => {
    setSelectedUser(user);
    setUserDialogOpen(true);
  };

  const handleTogglePortalStatus = (portalId: string) => {
    setPortalAccess(prev => prev.map(portal => 
      portal.id === portalId 
        ? { ...portal, isEnabled: !portal.isEnabled }
        : portal
    ));
  };

  const handleToggleUserStatus = (userId: string) => {
    if (selectedPortal) {
      const updatedPortal = {
        ...selectedPortal,
        users: selectedPortal.users.map(user => 
          user.id === userId 
            ? { ...user, status: user.status === 'Active' ? 'Inactive' : 'Active' as any }
            : user
        )
      };
      setSelectedPortal(updatedPortal);
      setPortalAccess(prev => prev.map(portal => 
        portal.id === selectedPortal.id ? updatedPortal : portal
      ));
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active': return 'success';
      case 'Inactive': return 'default';
      case 'Suspended': return 'warning';
      case 'Pending': return 'info';
      default: return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Active': return <ActiveIcon color="success" />;
      case 'Inactive': return <InactiveIcon color="disabled" />;
      case 'Suspended': return <WarningIcon color="warning" />;
      case 'Pending': return <AccessTimeIcon color="info" />;
      default: return <InactiveIcon />;
    }
  };

  const filteredPortals = portalAccess.filter(portal => {
    const matchesSearch = portal.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         portal.portalUrl.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'All' || 
                         (statusFilter === 'Enabled' && portal.isEnabled) ||
                         (statusFilter === 'Disabled' && !portal.isEnabled);
    
    return matchesSearch && matchesStatus;
  });

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Client Portal Access
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
        >
          Setup New Portal
        </Button>
      </Box>

      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Total Portals
              </Typography>
              <Typography variant="h4">
                {portalAccess.length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Active Portals
              </Typography>
              <Typography variant="h4" color="success">
                {portalAccess.filter(p => p.isEnabled).length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Total Users
              </Typography>
              <Typography variant="h4">
                {portalAccess.reduce((sum, portal) => sum + portal.users.length, 0)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                SSO Enabled
              </Typography>
              <Typography variant="h4" color="info">
                {portalAccess.filter(p => p.ssoEnabled).length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Search and Filter */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={8}>
            <TextField
              fullWidth
              variant="outlined"
              placeholder="Search by client name or portal URL..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select
                value={statusFilter}
                label="Status"
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <MenuItem value="All">All Portals</MenuItem>
                <MenuItem value="Enabled">Enabled</MenuItem>
                <MenuItem value="Disabled">Disabled</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Paper>

      {/* Portals Table */}
      <Paper>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Client</TableCell>
                <TableCell>Portal URL</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Users</TableCell>
                <TableCell>SSO</TableCell>
                <TableCell>Custom Domain</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredPortals
                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                .map((portal) => (
                  <TableRow key={portal.id} hover>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <BusinessIcon color="action" />
                        <Typography variant="body2" fontWeight="medium">
                          {portal.clientName}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="primary">
                        {portal.portalUrl}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={portal.isEnabled}
                            onChange={() => handleTogglePortalStatus(portal.id)}
                            color="success"
                          />
                        }
                        label={portal.isEnabled ? 'Enabled' : 'Disabled'}
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={`${portal.users.length} users`}
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={portal.ssoEnabled ? 'Enabled' : 'Disabled'}
                        color={portal.ssoEnabled ? 'success' : 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {portal.customDomain || '-'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Tooltip title="View Details">
                        <IconButton
                          size="small"
                          onClick={() => handleViewPortal(portal)}
                        >
                          <ViewIcon />
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
          count={filteredPortals.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </Paper>

      {/* Portal Details Dialog */}
      <Dialog
        open={viewDialogOpen}
        onClose={() => setViewDialogOpen(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          Portal Access - {selectedPortal?.clientName}
        </DialogTitle>
        <DialogContent>
          {selectedPortal && (
            <Grid container spacing={3} sx={{ mt: 1 }}>
              {/* Portal Configuration */}
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>
                  Portal Configuration
                </Typography>
                <Divider sx={{ mb: 2 }} />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" gutterBottom>
                  Portal URL
                </Typography>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  {selectedPortal.portalUrl}
                </Typography>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" gutterBottom>
                  Custom Domain
                </Typography>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  {selectedPortal.customDomain || 'Not configured'}
                </Typography>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" gutterBottom>
                  Session Timeout
                </Typography>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  {selectedPortal.sessionTimeout} minutes
                </Typography>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" gutterBottom>
                  Max Concurrent Sessions
                </Typography>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  {selectedPortal.maxConcurrentSessions}
                </Typography>
              </Grid>

              {/* Security Settings */}
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                  Security Settings
                </Typography>
                <Divider sx={{ mb: 2 }} />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={selectedPortal.ssoEnabled}
                      color="primary"
                    />
                  }
                  label="Single Sign-On (SSO)"
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={selectedPortal.isEnabled}
                      color="success"
                    />
                  }
                  label="Portal Enabled"
                />
              </Grid>

              {selectedPortal.allowedIPs && (
                <Grid item xs={12}>
                  <Typography variant="subtitle2" gutterBottom>
                    Allowed IP Ranges
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
                    {selectedPortal.allowedIPs.map((ip, index) => (
                      <Chip key={index} label={ip} size="small" variant="outlined" />
                    ))}
                  </Box>
                </Grid>
              )}

              {/* Users Management */}
              <Grid item xs={12}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2, mb: 2 }}>
                  <Typography variant="h6">
                    Portal Users ({selectedPortal.users.length})
                  </Typography>
                  <Button
                    variant="outlined"
                    startIcon={<AddIcon />}
                    onClick={() => setAddUserDialogOpen(true)}
                  >
                    Add User
                  </Button>
                </Box>
                <Divider sx={{ mb: 2 }} />
              </Grid>
              
              <Grid item xs={12}>
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>User</TableCell>
                        <TableCell>Role</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Last Login</TableCell>
                        <TableCell>2FA</TableCell>
                        <TableCell>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {selectedPortal.users.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <PersonIcon fontSize="small" color="action" />
                              <Box>
                                <Typography variant="body2" fontWeight="medium">
                                  {user.firstName} {user.lastName}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {user.email}
                                </Typography>
                              </Box>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Chip label={user.role} size="small" />
                          </TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              {getStatusIcon(user.status)}
                              <Typography variant="body2">
                                {user.status}
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {user.lastLogin ? 
                                format(user.lastLogin, 'MMM dd, HH:mm') : 
                                'Never'
                              }
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={user.twoFactorEnabled ? 'Enabled' : 'Disabled'}
                              color={user.twoFactorEnabled ? 'success' : 'default'}
                              size="small"
                            />
                          </TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', gap: 0.5 }}>
                              <Tooltip title="View User">
                                <IconButton
                                  size="small"
                                  onClick={() => handleViewUser(user)}
                                >
                                  <ViewIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title={user.status === 'Active' ? 'Deactivate' : 'Activate'}>
                                <IconButton
                                  size="small"
                                  onClick={() => handleToggleUserStatus(user.id)}
                                >
                                  {user.status === 'Active' ? 
                                    <LockIcon fontSize="small" /> : 
                                    <UnlockIcon fontSize="small" />
                                  }
                                </IconButton>
                              </Tooltip>
                            </Box>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewDialogOpen(false)}>Close</Button>
          <Button variant="contained" startIcon={<EditIcon />}>
            Edit Configuration
          </Button>
        </DialogActions>
      </Dialog>

      {/* User Details Dialog */}
      <Dialog
        open={userDialogOpen}
        onClose={() => setUserDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          User Details - {selectedUser?.firstName} {selectedUser?.lastName}
        </DialogTitle>
        <DialogContent>
          {selectedUser && (
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" gutterBottom>
                  Username
                </Typography>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  {selectedUser.userName}
                </Typography>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" gutterBottom>
                  Email
                </Typography>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  {selectedUser.email}
                </Typography>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" gutterBottom>
                  Role
                </Typography>
                <Chip label={selectedUser.role} sx={{ mb: 2 }} />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" gutterBottom>
                  Status
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  {getStatusIcon(selectedUser.status)}
                  <Typography variant="body1">
                    {selectedUser.status}
                  </Typography>
                </Box>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" gutterBottom>
                  Department
                </Typography>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  {selectedUser.department || 'Not specified'}
                </Typography>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" gutterBottom>
                  Phone
                </Typography>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  {selectedUser.phone || 'Not provided'}
                </Typography>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" gutterBottom>
                  Created Date
                </Typography>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  {format(selectedUser.createdDate, 'MMM dd, yyyy')}
                </Typography>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" gutterBottom>
                  Last Login
                </Typography>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  {selectedUser.lastLogin ? 
                    format(selectedUser.lastLogin, 'MMM dd, yyyy HH:mm') : 
                    'Never'
                  }
                </Typography>
              </Grid>
              
              <Grid item xs={12}>
                <Typography variant="subtitle2" gutterBottom>
                  Permissions
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
                  {selectedUser.permissions.map((permission, index) => (
                    <Chip key={index} label={permission} size="small" variant="outlined" />
                  ))}
                </Box>
              </Grid>
              
              <Grid item xs={12}>
                <Typography variant="subtitle2" gutterBottom>
                  Security Settings
                </Typography>
                <List dense>
                  <ListItem>
                    <ListItemIcon>
                      <SecurityIcon />
                    </ListItemIcon>
                    <ListItemText
                      primary="Two-Factor Authentication"
                      secondary={selectedUser.twoFactorEnabled ? 'Enabled' : 'Disabled'}
                    />
                    <ListItemSecondaryAction>
                      <Chip
                        label={selectedUser.twoFactorEnabled ? 'Enabled' : 'Disabled'}
                        color={selectedUser.twoFactorEnabled ? 'success' : 'default'}
                        size="small"
                      />
                    </ListItemSecondaryAction>
                  </ListItem>
                  <ListItem>
                    <ListItemIcon>
                      <LockIcon />
                    </ListItemIcon>
                    <ListItemText
                      primary="Account Status"
                      secondary={selectedUser.isLocked ? 'Locked' : 'Unlocked'}
                    />
                    <ListItemSecondaryAction>
                      <Chip
                        label={selectedUser.isLocked ? 'Locked' : 'Unlocked'}
                        color={selectedUser.isLocked ? 'error' : 'success'}
                        size="small"
                      />
                    </ListItemSecondaryAction>
                  </ListItem>
                  <ListItem>
                    <ListItemIcon>
                      <WarningIcon />
                    </ListItemIcon>
                    <ListItemText
                      primary="Failed Login Attempts"
                      secondary={`${selectedUser.loginAttempts} attempts`}
                    />
                  </ListItem>
                </List>
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUserDialogOpen(false)}>Close</Button>
          <Button variant="outlined" startIcon={<RefreshIcon />}>
            Reset Password
          </Button>
          <Button variant="contained" startIcon={<EditIcon />}>
            Edit User
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ClientPortalPage;