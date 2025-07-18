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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Divider,
  Paper,
  Tab,
  Tabs,
  Badge,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  Person as PersonIcon,
  Badge as BadgeIcon,
  School as CertificationIcon,
  Star as PerformanceIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  LocationOn as LocationIcon,
  Work as WorkIcon,
  Schedule as ScheduleIcon,
  Assignment as AssignmentIcon,
} from '@mui/icons-material';
import { useAuth } from '../../hooks/useAuth';
import { isAuthenticationAvailable, getCurrentTokenInfo, adminAPI } from '../../services/api';

interface Agent {
  id: string;
  name: string;
  email: string;
  employeeId: string;
  role: string;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'TERMINATED';
  hireDate: string;
  skills: string[];
  certifications: any[];
  performanceMetrics?: {
    score?: number;
    attendanceRate?: number;
    punctualityScore?: number;
    incidentReports?: number;
    commendations?: number;
    completedShifts?: number;
  };
  phone?: string;
  createdAt: string;
  updatedAt: string;
  shifts?: any[];
  attendance?: any[];
  reports?: any[];
}

interface AgentStats {
  totalAgents: number;
  activeAgents: number;
  onDutyAgents: number;
  availableAgents: number;
  averagePerformance: number;
  newHiresThisMonth: number;
}

const AgentManagementPage: React.FC = () => {
  const { user } = useAuth();
  
  // State management
  const [agents, setAgents] = useState<Agent[]>([]);
  const [stats, setStats] = useState<AgentStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Form states
  const [newAgent, setNewAgent] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    employeeId: '',
    hireDate: '',
    skills: [] as string[],
    emergencyContact: {
      name: '',
      relationship: '',
      phone: '',
      email: '',
    },
  });

  // Data fetching functions
  const fetchAgents = useCallback(async () => {
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
      console.debug(`Loading agent data with ${tokenInfo.type} token`);

      // Use the enhanced API service (token automatically injected)
      const [agentsResponse, statsResponse] = await Promise.all([
        adminAPI.getAgents(),
        adminAPI.getWorkforceAnalytics({ type: 'agent-stats' })
      ]);

      setAgents((agentsResponse.data as any)?.agents || []);
      setStats((statsResponse.data as any)?.overview || {
        totalAgents: 0,
        activeAgents: 0,
        onDutyAgents: 0,
        availableAgents: 0,
        averagePerformance: 0,
        newHiresThisMonth: 0,
      });
      setLastUpdated(new Date());

    } catch (err: any) {
      console.error('Failed to fetch agents:', err);
      if (err.response?.status === 401) {
        setError('Authentication not available. Please log in.');
      } else if (err.response?.status === 403) {
        setError('You do not have permission to view agent data.');
      } else if (err.code === 'NETWORK_ERROR') {
        setError('Network error occurred. Please try again.');
      } else {
        setError('Failed to load agent data. Please check your connection and try again.');
      }
      setAgents([]);
      setStats(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const createAgent = async () => {
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
      console.debug(`Creating agent with ${tokenInfo.type} token`);

      // Use the enhanced API service (token automatically injected)
      await adminAPI.createAgent(newAgent);

      setCreateDialogOpen(false);
      setNewAgent({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        employeeId: '',
        hireDate: '',
        skills: [],
        emergencyContact: {
          name: '',
          relationship: '',
          phone: '',
          email: '',
        },
      });
      fetchAgents();

    } catch (err: any) {
      console.error('Failed to create agent:', err);
      if (err.response?.status === 401) {
        setError('Authentication not available. Please log in.');
      } else if (err.response?.status === 403) {
        setError('You do not have permission to create agents.');
      } else if (err.code === 'NETWORK_ERROR') {
        setError('Network error occurred. Please try again.');
      } else {
        setError('Failed to create agent. Please try again.');
      }
    }
  };

  const deleteAgent = async () => {
    if (!selectedAgent) return;

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
      console.debug(`Deleting agent with ${tokenInfo.type} token`);

      // Use the enhanced API service (token automatically injected)
      await adminAPI.deleteAgent(selectedAgent.id);

      setDeleteDialogOpen(false);
      setSelectedAgent(null);
      fetchAgents();

    } catch (err: any) {
      console.error('Failed to delete agent:', err);
      if (err.response?.status === 401) {
        setError('Authentication not available. Please log in.');
      } else if (err.response?.status === 403) {
        setError('You do not have permission to delete agents.');
      } else if (err.code === 'NETWORK_ERROR') {
        setError('Network error occurred. Please try again.');
      } else {
        setError('Failed to delete agent. Please try again.');
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
        return 'warning';
      case 'TERMINATED':
        return 'error';
      default:
        return 'default';
    }
  };

  const filteredAgents = agents.filter(agent => {
    if (filterStatus !== 'all' && agent.status !== filterStatus) return false;
    if (searchQuery &&
        !agent.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !agent.email.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !agent.employeeId.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  // Effects
  useEffect(() => {
    fetchAgents();
  }, [fetchAgents]);

  // Loading state
  if (loading && agents.length === 0) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={400}>
        <Box textAlign="center">
          <CircularProgress size={60} />
          <Typography variant="h6" sx={{ mt: 2 }}>
            Loading Agent Data...
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
            Agent Management
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Comprehensive agent profiles, certifications, and performance tracking
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
            onClick={fetchAgents}
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
            Add Agent
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
          <Grid item xs={12} sm={6} md={2}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" gap={2}>
                  <PersonIcon color="primary" />
                  <Box>
                    <Typography variant="h6">{stats.totalAgents}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Total Agents
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" gap={2}>
                  <Badge badgeContent={stats.activeAgents} color="success">
                    <PersonIcon color="success" />
                  </Badge>
                  <Box>
                    <Typography variant="h6">{stats.activeAgents}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Active
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" gap={2}>
                  <WorkIcon color="info" />
                  <Box>
                    <Typography variant="h6">{stats.onDutyAgents}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      On Duty
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" gap={2}>
                  <ScheduleIcon color="warning" />
                  <Box>
                    <Typography variant="h6">{stats.availableAgents}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Available
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" gap={2}>
                  <PerformanceIcon color="warning" />
                  <Box>
                    <Typography variant="h6">{stats.averagePerformance}%</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Avg Performance
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" gap={2}>
                  <AddIcon color="info" />
                  <Box>
                    <Typography variant="h6">{stats.newHiresThisMonth}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      New Hires
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
            <MenuItem value="SUSPENDED">Suspended</MenuItem>
            <MenuItem value="TERMINATED">Terminated</MenuItem>
          </Select>
        </FormControl>

        <TextField
          size="small"
          placeholder="Search agents..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: <SearchIcon color="action" sx={{ mr: 1 }} />,
          }}
          sx={{ minWidth: 200 }}
        />
      </Box>

      {/* Agent Table */}
      <Paper>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Agent</TableCell>
                <TableCell>Employee ID</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Skills</TableCell>
                <TableCell>Hire Date</TableCell>
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
                      <Box display="flex" alignItems="center" gap={2}>
                        <Avatar>
                          {agent.name.split(' ').map(n => n[0]).join('').substring(0, 2)}
                        </Avatar>
                        <Box>
                          <Typography variant="subtitle2">
                            {agent.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {agent.email}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>{agent.employeeId}</TableCell>
                    <TableCell>
                      <Chip
                        label={agent.status}
                        color={getStatusColor(agent.status) as any}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Box display="flex" gap={0.5} flexWrap="wrap">
                        {agent.skills.slice(0, 2).map((skill, index) => (
                          <Chip key={index} label={skill} size="small" variant="outlined" />
                        ))}
                        {agent.skills.length > 2 && (
                          <Chip label={`+${agent.skills.length - 2}`} size="small" variant="outlined" />
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>
                      {new Date(agent.hireDate).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Box display="flex" alignItems="center" gap={1}>
                        <PerformanceIcon fontSize="small" />
                        <Typography variant="body2">
                          {agent.performanceMetrics?.score || 'N/A'}%
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box display="flex" gap={1}>
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
                        <Tooltip title="Delete Agent">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => {
                              setSelectedAgent(agent);
                              setDeleteDialogOpen(true);
                            }}
                          >
                            <DeleteIcon />
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
          onPageChange={(_, newPage) => setPage(newPage)}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
        />
      </Paper>
    </Box>
  );
};

export default AgentManagementPage;
