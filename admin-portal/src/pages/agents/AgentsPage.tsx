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
  Avatar,
  Badge,
  Alert,
  Tooltip,
  Switch,
  FormControlLabel,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  LocationOn as LocationIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  Security as SecurityIcon,
  Person as PersonIcon,
  Schedule as ScheduleIcon,
  CheckCircle as ActiveIcon,
  Cancel as InactiveIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { useAuth } from '../../hooks/useAuth';
import { isAuthenticationAvailable, getCurrentTokenInfo, adminAPI } from '../../services/api';

interface Agent {
  id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  status: 'Active' | 'Inactive' | 'On Leave' | 'Suspended';
  role: string;
  department: string;
  hireDate: Date;
  lastLogin?: Date;
  currentLocation?: {
    latitude: number;
    longitude: number;
    address: string;
    timestamp: Date;
  };
  isOnline: boolean;
  currentShift?: {
    id: string;
    siteName: string;
    startTime: Date;
    endTime: Date;
  };
  certifications: string[];
  performanceScore: number;
}

const AgentsPage: React.FC = () => {
  const { user } = useAuth();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [departmentFilter, setDepartmentFilter] = useState<string>('All');

  useEffect(() => {
    loadAgents();
  }, []);

  const loadAgents = async () => {
    const authAvailable = await isAuthenticationAvailable();
    if (!authAvailable) {
      setError('Authentication not available. Please log in.');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const tokenInfo = await getCurrentTokenInfo();
      console.debug(`Loading agents with ${tokenInfo.type} token`);

      const response = await adminAPI.getAgents();
      setAgents(response.data.data || []);
    } catch (err: any) {
      console.error('Failed to load agents:', err);
      setError(err.response?.data?.message || 'Failed to load agents');
      setAgents([]);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleAgentStatus = async (agentId: string) => {
    const authAvailable = await isAuthenticationAvailable();
    if (!authAvailable) {
      setError('Authentication not available. Please log in.');
      return;
    }

    try {
      const agent = agents.find(a => a.id === agentId);
      const newStatus = agent?.status === 'Active' ? 'Inactive' : 'Active';
      
      await adminAPI.updateAgent(agentId, { status: newStatus });
      
      setAgents(agents.map(a => 
        a.id === agentId ? { ...a, status: newStatus as any } : a
      ));
    } catch (err: any) {
      console.error('Failed to update agent status:', err);
      setError(err.response?.data?.message || 'Failed to update agent status');
    }
  };

  const handleDeleteAgent = async (agentId: string) => {
    const authAvailable = await isAuthenticationAvailable();
    if (!authAvailable) {
      setError('Authentication not available. Please log in.');
      return;
    }

    try {
      await adminAPI.deleteAgent(agentId);
      setAgents(agents.filter(a => a.id !== agentId));
    } catch (err: any) {
      console.error('Failed to delete agent:', err);
      setError(err.response?.data?.message || 'Failed to delete agent');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active': return 'success';
      case 'Inactive': return 'default';
      case 'On Leave': return 'warning';
      case 'Suspended': return 'error';
      default: return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Active': return <ActiveIcon color="success" />;
      case 'Inactive': return <InactiveIcon color="disabled" />;
      case 'On Leave': return <ScheduleIcon color="warning" />;
      case 'Suspended': return <InactiveIcon color="error" />;
      default: return <InactiveIcon />;
    }
  };

  const filteredAgents = agents.filter(agent => {
    const matchesSearch = 
      agent.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      agent.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      agent.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      agent.employeeId.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'All' || agent.status === statusFilter;
    const matchesDepartment = departmentFilter === 'All' || agent.department === departmentFilter;
    
    return matchesSearch && matchesStatus && matchesDepartment;
  });

  const uniqueDepartments = Array.from(new Set(agents.map(a => a.department)));

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Agent Management
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={loadAgents}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setAddDialogOpen(true)}
          >
            Add Agent
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Total Agents
              </Typography>
              <Typography variant="h4">
                {agents.length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Active Agents
              </Typography>
              <Typography variant="h4" color="success">
                {agents.filter(a => a.status === 'Active').length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Online Now
              </Typography>
              <Typography variant="h4" color="info">
                {agents.filter(a => a.isOnline).length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                On Shift
              </Typography>
              <Typography variant="h4" color="primary">
                {agents.filter(a => a.currentShift).length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Search and Filter */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              variant="outlined"
              placeholder="Search agents by name, email, or employee ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select
                value={statusFilter}
                label="Status"
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <MenuItem value="All">All Statuses</MenuItem>
                <MenuItem value="Active">Active</MenuItem>
                <MenuItem value="Inactive">Inactive</MenuItem>
                <MenuItem value="On Leave">On Leave</MenuItem>
                <MenuItem value="Suspended">Suspended</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={3}>
            <FormControl fullWidth>
              <InputLabel>Department</InputLabel>
              <Select
                value={departmentFilter}
                label="Department"
                onChange={(e) => setDepartmentFilter(e.target.value)}
              >
                <MenuItem value="All">All Departments</MenuItem>
                {uniqueDepartments.map((dept) => (
                  <MenuItem key={dept} value={dept}>{dept}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Paper>

      {/* Agents Table */}
      <Paper>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Agent</TableCell>
                <TableCell>Employee ID</TableCell>
                <TableCell>Contact</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Department</TableCell>
                <TableCell>Current Shift</TableCell>
                <TableCell>Performance</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredAgents
                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                .map((agent) => (
                  <TableRow key={agent.id} hover>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Badge
                          color={agent.isOnline ? 'success' : 'default'}
                          variant="dot"
                          overlap="circular"
                        >
                          <Avatar>
                            <PersonIcon />
                          </Avatar>
                        </Badge>
                        <Box>
                          <Typography variant="body2" fontWeight="medium">
                            {agent.firstName} {agent.lastName}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {agent.role}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {agent.employeeId}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                          <EmailIcon fontSize="small" color="action" />
                          <Typography variant="body2">
                            {agent.email}
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <PhoneIcon fontSize="small" color="action" />
                          <Typography variant="body2">
                            {agent.phone}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {getStatusIcon(agent.status)}
                        <Chip
                          label={agent.status}
                          color={getStatusColor(agent.status) as any}
                          size="small"
                        />
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {agent.department}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {agent.currentShift ? (
                        <Box>
                          <Typography variant="body2" fontWeight="medium">
                            {agent.currentShift.siteName}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {format(agent.currentShift.startTime, 'HH:mm')} - {format(agent.currentShift.endTime, 'HH:mm')}
                          </Typography>
                        </Box>
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          Off Duty
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body2">
                          {agent.performanceScore}%
                        </Typography>
                        <Chip
                          label={agent.performanceScore >= 90 ? 'Excellent' : agent.performanceScore >= 75 ? 'Good' : 'Needs Improvement'}
                          color={agent.performanceScore >= 90 ? 'success' : agent.performanceScore >= 75 ? 'info' : 'warning'}
                          size="small"
                        />
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                        <Tooltip title="View Details">
                          <IconButton
                            size="small"
                            onClick={() => {
                              setSelectedAgent(agent);
                              setViewDialogOpen(true);
                            }}
                          >
                            <ViewIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Edit Agent">
                          <IconButton
                            size="small"
                            onClick={() => {
                              setSelectedAgent(agent);
                              setEditDialogOpen(true);
                            }}
                          >
                            <EditIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title={agent.status === 'Active' ? 'Deactivate' : 'Activate'}>
                          <IconButton
                            size="small"
                            onClick={() => handleToggleAgentStatus(agent.id)}
                          >
                            {agent.status === 'Active' ? <InactiveIcon /> : <ActiveIcon />}
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          rowsPerPageOptions={[5, 10, 25]}
          component="div"
          count={filteredAgents.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={(event, newPage) => setPage(newPage)}
          onRowsPerPageChange={(event) => {
            setRowsPerPage(parseInt(event.target.value, 10));
            setPage(0);
          }}
        />
      </Paper>

      {/* View Agent Dialog */}
      <Dialog
        open={viewDialogOpen}
        onClose={() => setViewDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Agent Details - {selectedAgent?.firstName} {selectedAgent?.lastName}
        </DialogTitle>
        <DialogContent>
          {selectedAgent && (
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" gutterBottom>
                  Employee ID
                </Typography>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  {selectedAgent.employeeId}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" gutterBottom>
                  Department
                </Typography>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  {selectedAgent.department}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" gutterBottom>
                  Role
                </Typography>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  {selectedAgent.role}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" gutterBottom>
                  Hire Date
                </Typography>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  {format(selectedAgent.hireDate, 'MMM dd, yyyy')}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" gutterBottom>
                  Email
                </Typography>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  {selectedAgent.email}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" gutterBottom>
                  Phone
                </Typography>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  {selectedAgent.phone}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" gutterBottom>
                  Status
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  {getStatusIcon(selectedAgent.status)}
                  <Typography variant="body1">
                    {selectedAgent.status}
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" gutterBottom>
                  Performance Score
                </Typography>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  {selectedAgent.performanceScore}%
                </Typography>
              </Grid>
              {selectedAgent.currentLocation && (
                <Grid item xs={12}>
                  <Typography variant="subtitle2" gutterBottom>
                    Current Location
                  </Typography>
                  <Typography variant="body1" sx={{ mb: 2 }}>
                    {selectedAgent.currentLocation.address}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Last updated: {format(selectedAgent.currentLocation.timestamp, 'MMM dd, yyyy HH:mm')}
                  </Typography>
                </Grid>
              )}
              <Grid item xs={12}>
                <Typography variant="subtitle2" gutterBottom>
                  Certifications
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  {selectedAgent.certifications.map((cert, index) => (
                    <Chip key={index} label={cert} size="small" variant="outlined" />
                  ))}
                </Box>
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AgentsPage;
